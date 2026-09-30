"""Resume PDF upload: validation, safe storage, text extraction and profile update.

Flow for students:  upload PDF → preview (what would change) → apply to profile.
Academic records (CGPA, 10th/12th marks, backlogs) are never overwritten from a resume – they
come from the institution; a mismatch is only reported to the placement cell.
"""
from __future__ import annotations

import hashlib
import io
import uuid
from datetime import datetime
from pathlib import Path

from ..core.config import settings
from ..models import ResumeUpload, Student
from . import ai_models, onboarding

PDF_MAGIC = b"%PDF-"


class ResumeError(ValueError):
    pass


def extract_text(data: bytes) -> tuple[str, int]:
    """Extract text from a PDF (pdfminer.six). Returns (text, pages)."""
    from pdfminer.high_level import extract_text as pm_extract
    from pdfminer.pdfpage import PDFPage

    try:
        pages = sum(1 for _ in PDFPage.get_pages(io.BytesIO(data)))
    except Exception as e:
        raise ResumeError("The file is not a readable PDF") from e
    if pages > settings.RESUME_MAX_PAGES:
        raise ResumeError(f"Resume has {pages} pages; the limit is {settings.RESUME_MAX_PAGES}")
    try:
        text = pm_extract(io.BytesIO(data), maxpages=settings.RESUME_MAX_PAGES) or ""
    except Exception as e:
        raise ResumeError("Could not read text from the PDF") from e
    text = "\n".join(line.rstrip() for line in text.replace("\x0c", "\n").splitlines())
    if len(text.strip()) < 30:
        raise ResumeError("No text found – the PDF looks scanned (image only). Please upload a text-based PDF "
                          "(e.g. exported from Word / Google Docs).")
    return text.strip(), pages


def validate(filename: str, data: bytes) -> None:
    if not data:
        raise ResumeError("Empty file")
    if len(data) > settings.RESUME_MAX_MB * 1024 * 1024:
        raise ResumeError(f"File is larger than {settings.RESUME_MAX_MB} MB")
    if not data.startswith(PDF_MAGIC) or not filename.lower().endswith(".pdf"):
        raise ResumeError("Only PDF files are accepted")


def store_upload(db, filename: str, data: bytes, student_id: int | None, user_id: int | None) -> ResumeUpload:
    validate(filename, data)
    text, pages = extract_text(data)
    parsed = onboarding.parse_resume(text)
    uid = uuid.uuid4().hex
    folder = Path(settings.UPLOAD_DIR) / "resumes"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uid}.pdf"  # never trust the client file name for storage
    path.write_bytes(data)
    up = ResumeUpload(id=uid, student_id=student_id, uploaded_by=user_id, filename=Path(filename).name[:200],
                      stored_path=str(path), size_bytes=len(data), pages=pages,
                      sha256=hashlib.sha256(data).hexdigest(), text=text, parsed=parsed, status="pending")
    db.add(up)
    db.commit()
    return up


def preview(s: Student, parsed: dict) -> dict:
    """What applying this resume would change on the student's profile."""
    new_skills = {k: v for k, v in parsed["skills"].items() if k not in s.skills}
    upgraded = {k: {"from": s.skills[k], "to": v} for k, v in parsed["skills"].items() if k in s.skills and v > s.skills[k]}
    have_proj = {p["title"].lower() for p in s.projects}
    have_cert = {c["name"].lower() for c in s.certifications}
    new_projects = [p for p in parsed["projects"] if p["title"].lower() not in have_proj]
    new_certs = [c for c in parsed["certifications"] if c["name"].lower() not in have_cert]
    warnings = []
    if parsed.get("cgpa") and abs(parsed["cgpa"] - s.cgpa) >= 0.05:
        warnings.append(f"Resume states CGPA {parsed['cgpa']} but the official record is {s.cgpa} – the record is kept.")
    if parsed.get("branch") and parsed["branch"] != s.branch:
        warnings.append(f"Resume mentions {parsed['branch']} but you are registered in {s.branch}.")
    if parsed.get("email") and s.email and parsed["email"].lower() != s.email.lower():
        warnings.append(f"Resume e-mail {parsed['email']} differs from the registered e-mail {s.email}.")
    return {"new_skills": new_skills, "upgraded_skills": upgraded, "new_projects": new_projects,
            "new_certifications": new_certs, "internships": parsed.get("internships", 0),
            "predicted_role": parsed.get("preferred_role"), "role_candidates": parsed.get("role_candidates", []),
            "warnings": warnings}


def apply(db, s: Student, up: ResumeUpload) -> dict:
    """Merge resume content into the profile (skills, projects, certifications, internships, resume text)."""
    parsed, pv = up.parsed, preview(s, up.parsed)
    skills = dict(s.skills)
    for k, v in parsed["skills"].items():
        skills[k] = max(skills.get(k, 0), int(v))
    s.skills = skills
    s.projects = s.projects + pv["new_projects"]
    s.certifications = s.certifications + pv["new_certifications"]
    s.internships = max(s.internships, int(parsed.get("internships") or 0))
    s.resume_text = up.text[:20000]
    for other in db.query(ResumeUpload).filter(ResumeUpload.student_id == s.id, ResumeUpload.status == "applied").all():
        other.status = "superseded"
    up.student_id, up.status, up.applied_at = s.id, "applied", datetime.utcnow()
    db.commit()
    ai_models.invalidate_vectors(s.id)
    return pv


def latest(db, student_id: int) -> ResumeUpload | None:
    return (db.query(ResumeUpload).filter(ResumeUpload.student_id == student_id, ResumeUpload.status == "applied")
            .order_by(ResumeUpload.created_at.desc()).first())


def meta(up: ResumeUpload | None) -> dict | None:
    if not up:
        return None
    return {"id": up.id, "filename": up.filename, "pages": up.pages, "size_kb": round(up.size_bytes / 1024, 1),
            "uploaded_at": up.created_at.isoformat(timespec="minutes"), "status": up.status}
