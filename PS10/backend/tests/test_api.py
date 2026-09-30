"""API, authentication, RBAC, onboarding and operational tests."""
from app.core.config import settings
from app.core.observability import limiter
from app.models import AuditLog, Offer, Student, User


def test_health_ready_metrics(client):
    assert client.get("/api/health").json()["status"] == "ok"
    r = client.get("/api/ready").json()
    assert r["checks"]["database"] == "ok" and r["checks"]["placement_model"] == "trained"
    m = client.get("/metrics")
    assert m.status_code == 200 and "campuslink_http_requests_total" in m.text


def test_security_headers_and_request_id(client):
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"
    assert len(r.headers["x-request-id"]) >= 8


def test_login_and_me(client, tokens):
    assert client.get("/api/auth/me").status_code == 401
    me = client.get("/api/auth/me", headers=tokens["officer"]).json()
    assert me["role"] == "officer"


def test_bad_login_rejected_and_audited(client, db):
    r = client.post("/api/auth/login", json={"email": "officer@campuslink.edu", "password": "wrong"})
    assert r.status_code == 401
    db.expire_all()
    assert db.query(AuditLog).filter(AuditLog.action == "login_failed").count() >= 1


def test_invalid_token(client):
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_login_rate_limit(client, monkeypatch):
    monkeypatch.setattr(settings, "LOGIN_ATTEMPTS_PER_MINUTE", 3)
    limiter._hits.clear()
    codes = [client.post("/api/auth/login", json={"email": "x@y.z", "password": "no"}).status_code for _ in range(5)]
    assert codes[:3] == [401, 401, 401] and codes[-1] == 429
    limiter._hits.clear()


def test_rbac_matrix(client, tokens):
    expect = {  # path: roles allowed
        "/api/dashboard": {"admin", "officer"},
        "/api/students?limit=1": {"admin", "officer", "mentor"},
        "/api/schedule": {"admin", "officer"},
        "/api/admin/users": {"admin"},
        "/api/admin/audit": {"admin"},
        "/api/models": {"admin", "officer"},
        "/api/me/profile": {"admin", "officer", "student", "recruiter", "mentor"},
    }
    for path, allowed in expect.items():
        for role, h in tokens.items():
            code = client.get(path, headers=h).status_code
            assert (code == 200) == (role in allowed), f"{role} {path} -> {code}"


def test_student_sees_only_self(client, tokens, db):
    me = client.get("/api/me/profile", headers=tokens["student"]).json()
    sid = me["profile"]["id"]
    assert client.get(f"/api/students/{sid}", headers=tokens["student"]).status_code == 200
    other = db.query(Student).filter(Student.id != sid).first().id
    assert client.get(f"/api/students/{other}", headers=tokens["student"]).status_code == 403
    offers = client.get("/api/offers", headers=tokens["student"]).json()
    assert all(o["student_id"] == sid for o in offers)


def test_mentor_scoped_to_mentees(client, tokens, db):
    lst = client.get("/api/students?limit=200", headers=tokens["mentor"]).json()["items"]
    assert lst and all(s["mentor"] == "Dr. S. Mohapatra" for s in lst)
    outsider = db.query(Student).filter(Student.mentor != "Dr. S. Mohapatra").first()
    assert client.get(f"/api/students/{outsider.id}", headers=tokens["mentor"]).status_code == 403


def test_recruiter_scoped_to_company(client, tokens):
    drives = client.get("/api/drives", headers=tokens["recruiter"]).json()
    assert drives and {d["company_id"] for d in drives} == {1}
    other = [d for d in client.get("/api/drives", headers=tokens["officer"]).json() if d["company_id"] != 1][0]
    assert client.get(f"/api/drives/{other['id']}", headers=tokens["recruiter"]).status_code == 403
    detail = client.get(f"/api/drives/{drives[0]['id']}", headers=tokens["recruiter"]).json()
    assert {a["status"] for a in detail["applications"]} <= {"Shortlisted", "Waitlisted", "Selected", "Rejected"}
    assert detail["ineligible_reasons"] == {}


def test_recruiter_selects_and_student_accepts(client, tokens, db):
    d = client.get("/api/drives", headers=tokens["recruiter"]).json()[0]
    app_ = client.get(f"/api/drives/{d['id']}?status=Shortlisted", headers=tokens["recruiter"]).json()["applications"][0]
    r = client.post(f"/api/applications/{app_['application_id']}/status", json={"status": "Selected"},
                    headers=tokens["recruiter"])
    assert r.status_code == 200 and r.json()["offer_id"]
    oid = r.json()["offer_id"]
    # the selected student logs in with a fresh account created by the admin
    admin = tokens["admin"]
    r = client.post("/api/admin/users", headers=admin, json={"email": f"s{app_['student_id']}@test.edu", "name": "Test",
                                                               "role": "student", "student_id": app_["student_id"]})
    assert r.status_code == 201, r.text
    u = r.json()
    t = client.post("/api/auth/login", json={"email": u["email"], "password": u["temporary_password"]}).json()
    h = {"Authorization": f"Bearer {t['access_token']}"}
    assert t["user"]["must_change_password"] is True
    assert client.post(f"/api/offers/{oid}/transition", json={"status": "Joined"}, headers=h).status_code == 403
    assert client.post(f"/api/offers/{oid}/transition", json={"status": "Accepted"}, headers=h).json()["status"] == "Accepted"
    doc = list(db.get(Offer, oid).documents)[0]
    assert client.post(f"/api/offers/{oid}/documents", json={"document": doc, "status": "Verified"}, headers=h).status_code == 403
    assert client.post(f"/api/offers/{oid}/documents", json={"document": doc, "status": "Submitted"}, headers=h).status_code == 200
    assert client.get(f"/api/offers/{oid}/verify", headers=h).json()["valid"] is True
    # another student cannot touch it
    assert client.post(f"/api/offers/{oid}/transition", json={"status": "Declined"}, headers=tokens["student"]).status_code == 403


def test_onboarding_new_student_cold_start(client, tokens, db):
    body = {"name": "Test Newcomer", "branch": "ECE", "cgpa": 7.9, "email": "newcomer@test.edu", "tenth_pct": 88, "twelfth_pct": 84,
            "skills": {"embedded c": 3, "microcontrollers": 3, "c": 3}}
    r = client.post("/api/students", json=body, headers=tokens["officer"])
    assert r.status_code == 201, r.text
    out = r.json()
    assert out["readiness"]["provisional"] is True and out["readiness"]["cold_start"]["score_range"]
    assert out["login"]["temporary_password"]
    assert client.post("/api/students", json=body, headers=tokens["officer"]).status_code == 400  # duplicate e-mail
    assert client.post("/api/students", json=body, headers=tokens["student"]).status_code == 403
    sid = out["id"]
    r = client.put(f"/api/students/{sid}/assessment", headers=tokens["officer"],
                   json={"aptitude": 70, "coding": 65, "mock_interview": 72, "communication": 68, "softskill": 70})
    assert r.json()["provisional"] is False


def test_resume_parse_and_csv_import(client, tokens):
    p = client.post("/api/students/parse-resume", headers=tokens["officer"],
                    json={"text": "Riya Das\nB.Tech Computer Science, CGPA: 8.2\nSkills: Python, SQL, React"}).json()
    assert p["branch"] == "CSE" and p["cgpa"] == 8.2 and "python" in p["skills"]
    csv = ("name,email,branch,cgpa,skills\nCsv One,csv1@test.edu,IT,7.4,python:3;sql:2\n"
           "Bad Branch,bad@test.edu,XYZ,7,\n")
    r = client.post("/api/students/import", headers=tokens["officer"], json={"csv": csv}).json()
    assert len(r["created"]) == 1 and len(r["errors"]) == 1


def test_validation_errors_are_422(client, tokens):
    r = client.post("/api/students", headers=tokens["officer"], json={"name": "X", "branch": "CSE", "cgpa": 14})
    assert r.status_code == 422 and "cgpa" in r.json()["detail"]


def test_admin_user_management(client, tokens, db):
    r = client.post("/api/admin/users", headers=tokens["admin"], json={"email": "off2@test.edu", "name": "Officer Two",
                                                                         "role": "officer", "password": "Str0ngPass"})
    uid = r.json()["id"]
    assert client.post("/api/auth/login", json={"email": "off2@test.edu", "password": "Str0ngPass"}).status_code == 200
    client.patch(f"/api/admin/users/{uid}", headers=tokens["admin"], json={"is_active": False})
    assert client.post("/api/auth/login", json={"email": "off2@test.edu", "password": "Str0ngPass"}).status_code == 401
    db.expire_all()
    assert db.get(User, uid).is_active is False
    audit = client.get("/api/admin/audit?action=user_created", headers=tokens["admin"]).json()
    assert any(a["entity_id"] == str(uid) for a in audit)


def test_assistant_bound_to_self(client, tokens):
    r = client.post("/api/assistant", headers=tokens["student"], json={"question": "what is my readiness score?", "student_id": 5})
    assert r.status_code == 200 and "readiness" in r.json()["answer"].lower()


def test_scheduler_and_evaluation(client, tokens):
    plan = client.post("/api/schedule/auto", headers=tokens["officer"]).json()
    assert plan["conflicts_after"] == 0
    assert client.post("/api/schedule/auto", headers=tokens["recruiter"]).status_code == 403


def test_production_config_guard():
    import pytest

    from app.core.config import Settings
    with pytest.raises(RuntimeError):
        Settings(ENV="production", SECRET_KEY="change-me-to-64-random-characters", DEMO_MODE=False,
                 ADMIN_PASSWORD="Str0ng-Pass-1").validate_for_production()
    Settings(ENV="production", SECRET_KEY="x" * 48, DEMO_MODE=False, ADMIN_PASSWORD="Str0ng-Pass-1").validate_for_production()
