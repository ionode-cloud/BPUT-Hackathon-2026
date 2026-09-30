"""Deleting students: confirmation, RBAC, cascade, ledger protection, pool re-ranking, audit."""
from pathlib import Path

from app.models import Application, AuditLog, Drive, Offer, ResumeUpload, Student, User
from tests.test_resumes import make_pdf


def _new_student(client, tokens, name="Delete Me", email="delete.me@example.com"):
    pdf = make_pdf([name, email, "B.Tech Computer Science, CGPA: 9.4", "Skills: Python, Java, DSA, SQL, Docker, AWS"])
    up = client.post("/api/students/parse-resume-file", headers=tokens["officer"],
                     files={"file": ("r.pdf", pdf, "application/pdf")}).json()
    body = {"name": name, "branch": "CSE", "cgpa": 9.4, "email": email, "skills": up["parsed"]["skills"],
            "aptitude": 90, "coding": 90, "mock_interview": 90, "communication": 85, "softskill": 85,
            "resume_text": up["text"], "resume_upload_id": up["upload_id"], "create_login": True}
    r = client.post("/api/students", headers=tokens["officer"], json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_delete_student_cascades_and_is_audited(client, tokens, db):
    s = _new_student(client, tokens)
    sid, roll = s["id"], s["roll_no"]
    upcoming = [d.id for d in db.query(Drive).filter(Drive.status == "Upcoming")]
    for did in upcoming:
        client.post(f"/api/drives/{did}/match", headers=tokens["officer"])
    db.expire_all()
    assert db.query(Application).filter_by(student_id=sid).count() > 0
    stored = [u.stored_path for u in db.query(ResumeUpload).filter_by(student_id=sid)]
    assert stored and Path(stored[0]).exists()
    chk = client.get(f"/api/students/{sid}/delete-check", headers=tokens["officer"]).json()
    assert chk["blockers"] == [] and chk["logins"] == 1 and chk["resumes"] == 1

    # wrong confirmation / wrong roles are refused
    assert client.delete(f"/api/students/{sid}?confirm=WRONG", headers=tokens["officer"]).status_code == 400
    for role in ("student", "recruiter", "mentor"):
        assert client.delete(f"/api/students/{sid}?confirm={roll}", headers=tokens[role]).status_code == 403

    r = client.delete(f"/api/students/{sid}?confirm={roll.lower()}", headers=tokens["officer"])
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["removed"]["logins"] == 1 and out["removed"]["resumes"] == 1 and out["removed"]["applications"] > 0
    db.expire_all()
    assert db.get(Student, sid) is None
    assert db.query(Application).filter_by(student_id=sid).count() == 0
    assert db.query(User).filter_by(student_id=sid).count() == 0
    assert not Path(stored[0]).exists()
    assert client.get(f"/api/students/{sid}", headers=tokens["officer"]).status_code == 404
    log = db.query(AuditLog).filter_by(action="student_deleted", entity_id=str(sid)).one()
    assert log.detail["roll_no"] == roll
    # every pool stays filled after re-ranking
    for did in upcoming:
        d = client.get(f"/api/drives/{did}", headers=tokens["officer"]).json()
        assert all(a["student_id"] != sid for a in d["applications"])


def test_student_with_offers_cannot_be_deleted(client, tokens, db):
    o = db.query(Offer).first()
    s = db.get(Student, o.student_id)
    chk = client.get(f"/api/students/{s.id}/delete-check", headers=tokens["admin"]).json()
    assert chk["blockers"]
    r = client.delete(f"/api/students/{s.id}?confirm={s.roll_no}", headers=tokens["admin"])
    assert r.status_code == 409 and "ledger" in r.json()["detail"]
    assert client.get("/api/ledger/verify", headers=tokens["officer"]).json()["valid"] is True
