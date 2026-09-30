"""Resume PDF upload: students upload their own PDF, preview, apply; access rules; validation."""
import io

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.models import Application, Drive, Job, Student

RESUME_LINES = [
    "Chinmay Samal", "chinmay.samal@example.com | +91 9437012345",
    "B.Tech Computer Science and Engineering, CGPA: 9.9",
    "Skills: Python, Java, DSA, SQL, Docker, Kubernetes, AWS, TypeScript",
    "Projects:",
    "- Kubernetes autoscaling lab (Docker, Kubernetes, AWS)",
    "- Typed REST gateway in TypeScript and Node.js",
    "Experience:",
    "- Cloud intern at a Bhubaneswar startup (AWS, Docker)",
    "Certifications: AWS Solutions Architect Associate; CKAD",
]


def make_pdf(lines=RESUME_LINES) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 800
    for line in lines:
        c.drawString(50, y, line)
        y -= 18
    c.save()
    return buf.getvalue()


def _sid(client, tokens):
    return client.get("/api/me/profile", headers=tokens["student"]).json()["profile"]["id"]


def test_student_uploads_previews_and_applies_pdf(client, tokens, db):
    sid = _sid(client, tokens)
    before = db.get(Student, sid)
    cgpa_before = before.cgpa
    r = client.post(f"/api/students/{sid}/resume", headers=tokens["student"],
                    files={"file": ("my_resume.pdf", make_pdf(), "application/pdf")})
    assert r.status_code == 200, r.text
    body = r.json()
    pv = body["preview"]
    assert "kubernetes" in pv["new_skills"] or "kubernetes" in pv["upgraded_skills"] or pv["new_projects"]
    assert any("CGPA" in w for w in pv["warnings"])  # resume says 9.9, record says otherwise
    r = client.post(f"/api/students/{sid}/resume/{body['upload_id']}/apply", headers=tokens["student"])
    assert r.status_code == 200, r.text
    db.expire_all()
    after = db.get(Student, sid)
    assert after.cgpa == cgpa_before                   # academic record never overwritten
    assert after.skills.get("kubernetes", 0) >= 2 and after.skills.get("aws", 0) >= 2
    assert "Kubernetes autoscaling lab" in after.resume_text
    # download it back as the student and as staff
    d = client.get(f"/api/students/{sid}/resume", headers=tokens["student"])
    assert d.status_code == 200 and d.content.startswith(b"%PDF")
    assert client.get(f"/api/students/{sid}/resume", headers=tokens["officer"]).status_code == 200
    assert client.get("/api/me/profile", headers=tokens["student"]).json()["resume"]["filename"] == "my_resume.pdf"
    # applying the same upload twice is rejected
    assert client.post(f"/api/students/{sid}/resume/{body['upload_id']}/apply", headers=tokens["student"]).status_code == 404


def test_student_cannot_upload_for_someone_else(client, tokens, db):
    sid = _sid(client, tokens)
    other = db.query(Student).filter(Student.id != sid).first().id
    r = client.post(f"/api/students/{other}/resume", headers=tokens["student"],
                    files={"file": ("x.pdf", make_pdf(), "application/pdf")})
    assert r.status_code == 403


def test_rejects_non_pdf_scanned_and_oversized(client, tokens, monkeypatch):
    sid = _sid(client, tokens)
    h = tokens["student"]
    r = client.post(f"/api/students/{sid}/resume", headers=h, files={"file": ("cv.docx", b"PK\x03\x04 not a pdf", "application/octet-stream")})
    assert r.status_code == 400 and "PDF" in r.json()["detail"]
    r = client.post(f"/api/students/{sid}/resume", headers=h, files={"file": ("blank.pdf", make_pdf([""]), "application/pdf")})
    assert r.status_code == 400 and "scanned" in r.json()["detail"]
    from app.core.config import settings
    monkeypatch.setattr(settings, "RESUME_MAX_MB", 0)
    r = client.post(f"/api/students/{sid}/resume", headers=h, files={"file": ("big.pdf", make_pdf(), "application/pdf")})
    assert r.status_code == 400 and "larger" in r.json()["detail"]


def test_recruiter_resume_access_limited_to_own_pool(client, tokens, db):
    own = (db.query(Application).join(Drive).join(Job)
           .filter(Job.company_id == 1, Application.status == "Shortlisted").first())
    # officer uploads a resume for this candidate
    up = client.post(f"/api/students/{own.student_id}/resume", headers=tokens["officer"],
                     files={"file": ("cv.pdf", make_pdf(), "application/pdf")}).json()
    client.post(f"/api/students/{own.student_id}/resume/{up['upload_id']}/apply", headers=tokens["officer"])
    assert client.get(f"/api/students/{own.student_id}/resume", headers=tokens["recruiter"]).status_code == 200
    outsider = (db.query(Student).filter(~Student.id.in_(
        db.query(Application.student_id).join(Drive).join(Job).filter(Job.company_id == 1)))).first()
    assert client.get(f"/api/students/{outsider.id}/resume", headers=tokens["recruiter"]).status_code == 403
    # recruiters and mentors can never upload
    assert client.post(f"/api/students/{own.student_id}/resume", headers=tokens["recruiter"],
                       files={"file": ("cv.pdf", make_pdf(), "application/pdf")}).status_code == 403


def test_officer_registers_new_student_from_pdf(client, tokens, db):
    pdf = make_pdf(["Sneha Rout", "sneha.rout@example.com", "B.Tech Electronics and Communication, CGPA: 8.1",
                    "Class XII: 88% | 10th: 91%", "Skills: Embedded C, STM32, FreeRTOS, KiCad, Python",
                    "Projects:", "- IoT air-quality node (ESP32, Embedded C)"])
    r = client.post("/api/students/parse-resume-file", headers=tokens["officer"], files={"file": ("sneha.pdf", pdf, "application/pdf")})
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["parsed"]["branch"] == "ECE" and p["parsed"]["cgpa"] == 8.1 and "rtos" in p["parsed"]["skills"]
    body = {"name": "Sneha Rout", "branch": "ECE", "cgpa": 8.1, "email": "sneha.rout@example.com", "tenth_pct": 91,
            "twelfth_pct": 88, "skills": p["parsed"]["skills"], "resume_text": p["text"], "resume_upload_id": p["upload_id"]}
    s = client.post("/api/students", headers=tokens["officer"], json=body).json()
    assert client.get(f"/api/students/{s['id']}/resume", headers=tokens["officer"]).status_code == 200


def test_student_can_reupload_new_version(client, tokens, db):
    sid = _sid(client, tokens)
    h = tokens["student"]
    v2 = make_pdf(["Chinmay Samal", "Skills: Python, Java, Go, Terraform, Kubernetes",
                   "Projects:", "- Service mesh demo (Go, Kubernetes)"])
    up = client.post(f"/api/students/{sid}/resume", headers=h, files={"file": ("v2.pdf", v2, "application/pdf")}).json()
    assert "go" in up["preview"]["new_skills"]
    assert client.post(f"/api/students/{sid}/resume/{up['upload_id']}/apply", headers=h).status_code == 200
    hist = client.get(f"/api/students/{sid}/resume/history", headers=h).json()
    assert hist[0]["filename"] == "v2.pdf" and hist[0]["status"] == "applied"
    assert sum(x["status"] == "applied" for x in hist) == 1 and any(x["status"] == "superseded" for x in hist)
    db.expire_all()
    assert db.get(Student, sid).skills.get("go") and db.get(Student, sid).skills.get("python")  # merged, nothing lost
