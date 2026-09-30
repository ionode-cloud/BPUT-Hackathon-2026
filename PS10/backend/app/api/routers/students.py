from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy import or_

from ...core.config import settings
from ...db import get_db
from ...engines import ai_models, llm, matching, notifications, onboarding, readiness, resumes
from ...engines.skills import ROLE_PROFILES
from ...models import Application, Drive, Job, ResumeUpload, Student, User
from ...schemas import AssessmentIn, CsvIn, StudentIn, TextIn
from ...services import create_student_login, recompute_readiness
from ..deps import audit, current_user, get_student_for, require, staff_only
from ..serializers import student_brief, student_full

router = APIRouter(prefix="/api/students", tags=["students"])


@router.get("")
def list_students(q: str = "", branch: str = "", level: str = "", campus_id: int | None = None,
                  at_risk: bool | None = None, limit: int = 50, offset: int = 0, sort: str = "readiness_desc",
                  user: User = Depends(require("admin", "officer", "mentor")), db=Depends(get_db)):
    qs = db.query(Student)
    if user.role == "mentor":
        qs = qs.filter(Student.mentor == user.mentor_name)
    if q:
        qs = qs.filter(or_(Student.name.ilike(f"%{q}%"), Student.roll_no.ilike(f"%{q}%")))
    if branch:
        qs = qs.filter(Student.branch == branch)
    if level:
        qs = qs.filter(Student.readiness_level == level)
    if campus_id:
        qs = qs.filter(Student.campus_id == campus_id)
    if at_risk is not None:
        qs = qs.filter(Student.at_risk.is_(at_risk))
    order = {"readiness_desc": Student.readiness_score.desc(), "readiness_asc": Student.readiness_score.asc(),
             "cgpa_desc": Student.cgpa.desc(), "name": Student.name.asc(),
             "newest": Student.id.desc()}.get(sort, Student.readiness_score.desc())
    limit = max(1, min(limit, 200))
    total = qs.count()
    return {"total": total, "items": [student_brief(s) for s in qs.order_by(order, Student.id).offset(offset).limit(limit)]}


@router.post("", status_code=201)
def create_student(body: StudentIn, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    """Register a new student; scored immediately by the trained PyTorch models (no retraining)."""
    try:
        s = onboarding.create_student(db, body.model_dump())
    except onboarding.OnboardingError as e:
        raise HTTPException(400, str(e)) from e
    if body.resume_upload_id:
        up = db.get(ResumeUpload, body.resume_upload_id)
        if up and up.student_id is None and up.status == "pending":
            resumes.apply(db, s, up)
            recompute_readiness(db, [s])
    login = create_student_login(db, s) if body.create_login else None
    audit(db, request, user, "student_created", "student", s.id, provisional=bool(s.imputed_fields))
    recs = matching.recommend_drives(db, s, db.query(Drive).filter(Drive.status == "Upcoming").all())
    return {"id": s.id, "roll_no": s.roll_no, "readiness": readiness.explain(db, s), "login": login,
            "eligible_drives": sum(r["eligible"] for r in recs), "top_matches": recs[:3]}


@router.post("/parse-resume")
def parse_resume(body: TextIn, user: User = Depends(staff_only)):
    return onboarding.parse_resume(body.text)


@router.post("/import")
def import_students(body: CsvIn, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    res = onboarding.import_csv(db, body.csv)
    for c in res["created"]:
        c["login"] = create_student_login(db, db.get(Student, c["id"]))
    audit(db, request, user, "students_imported", "student", None, created=len(res["created"]), errors=len(res["errors"]))
    return res


@router.get("/template.csv")
def students_template(user: User = Depends(staff_only)):
    sample = ('"Ritika Senapati",ritika.s@example.com,9876543210,CSE,1,2027,8.1,91,88,0,0,'
              '"python:3;sql:2;react:2;data structures:3",1,72,64,,,,,"B.Tech CSE. Projects: Expense tracker in React with REST API"\n'
              '"Pradeep Hota",pradeep.h@example.com,,MECH,1,2027,7.2,80,76,0,1,"autocad:3;solidworks:2",0,,,,,,Mechanical Design Engineer,')
    return PlainTextResponse(",".join(onboarding.TEMPLATE_HEADER) + "\n" + sample, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=campuslink_students_template.csv"})


@router.get("/{sid}")
def get_student(sid: int, user: User = Depends(current_user), db=Depends(get_db)):
    return student_full(db, get_student_for(user, sid, db))


@router.get("/{sid}/delete-check")
def delete_check(sid: int, user: User = Depends(staff_only), db=Depends(get_db)):
    """What deleting this student would remove, and whether it is allowed."""
    s = get_student_for(user, sid, db)
    return {"roll_no": s.roll_no, "name": s.name, "blockers": onboarding.deletion_blockers(db, s),
            "applications": db.query(Application).filter(Application.student_id == sid).count(),
            "resumes": db.query(ResumeUpload).filter(ResumeUpload.student_id == sid).count(),
            "logins": db.query(User).filter(User.student_id == sid).count()}


@router.delete("/{sid}")
def delete_student(sid: int, confirm: str, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    """Permanently delete a student. `confirm` must equal the student's roll number.
    Refused (409) when the student has offers, which are part of the verified offer ledger."""
    s = get_student_for(user, sid, db)
    if confirm.strip().upper() != s.roll_no.upper():
        raise HTTPException(400, f"Type the roll number {s.roll_no} to confirm deletion")
    try:
        out = onboarding.delete_student(db, s)
    except onboarding.OnboardingError as e:
        raise HTTPException(409, str(e)) from e
    audit(db, request, user, "student_deleted", "student", sid, roll_no=out["roll_no"], name=out["name"],
          **out["removed"])
    return out


@router.get("/{sid}/skill-gap")
def student_gap(sid: int, role: str | None = None, user: User = Depends(current_user), db=Depends(get_db)):
    s = get_student_for(user, sid, db)
    if role and role not in ROLE_PROFILES:
        raise HTTPException(400, "Unknown role")
    return readiness.skill_gap(s, role)


@router.get("/{sid}/resume-tips")
def resume_tips(sid: int, user: User = Depends(current_user), db=Depends(get_db)):
    return llm.resume_tips(db, get_student_for(user, sid, db))


@router.put("/{sid}/assessment")
def update_assessment(sid: int, body: AssessmentIn, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    s = get_student_for(user, sid, db)
    mapping = {"aptitude_score": body.aptitude, "coding_score": body.coding, "mock_interview_score": body.mock_interview,
               "communication_score": body.communication, "softskill_score": body.softskill}
    for field, val in mapping.items():
        if val is not None:
            setattr(s, field, val)
    s.imputed_fields = [f for f in (s.imputed_fields or []) if mapping.get(f) is None]
    if body.skills:
        s.skills = {**s.skills, **{k: max(0, min(5, v)) for k, v in body.skills.items()}}
        ai_models.invalidate_vectors(s.id)
    s.assessment_history = s.assessment_history + [{"month": date.today().strftime("%Y-%m"),
                                                    "aptitude": s.aptitude_score, "mock": s.mock_interview_score,
                                                    "coding": s.coding_score}]
    db.commit()
    recompute_readiness(db, [s])
    audit(db, request, user, "assessment_recorded", "student", s.id,
          fields=[k for k, v in mapping.items() if v is not None])
    return readiness.explain(db, s)


# ------------------------------------------------------------------ resume PDFs
async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read(settings.RESUME_MAX_MB * 1024 * 1024 + 1)
    await file.close()
    return data


@router.post("/parse-resume-file")
async def parse_resume_file(request: Request, file: UploadFile = File(...), user: User = Depends(staff_only), db=Depends(get_db)):
    """Officer registering a new student: upload the PDF, get extracted text + fields to pre-fill the form.
    Pass the returned upload_id as resume_upload_id when creating the student to attach the file."""
    data = await _read_upload(file)
    try:
        up = resumes.store_upload(db, file.filename or "resume.pdf", data, None, user.id)
    except resumes.ResumeError as e:
        raise HTTPException(400, str(e)) from e
    audit(db, request, user, "resume_parsed", "resume", up.id, pages=up.pages)
    return {"upload_id": up.id, "text": up.text, "parsed": up.parsed, "pages": up.pages}


def _resume_access(user: User, sid: int, db, write: bool) -> Student:
    if user.role == "recruiter" and not write:
        s = db.get(Student, sid)
        visible = db.query(Application).join(Drive).join(Job).filter(
            Application.student_id == sid, Job.company_id == user.company_id,
            Application.status.in_(["Shortlisted", "Waitlisted", "Selected", "Rejected"])).first()
        if not s or not visible:
            raise HTTPException(403, "Resumes are available only for candidates in your drives' pools")
        return s
    s = get_student_for(user, sid, db)
    if write and user.role not in ("admin", "officer", "student"):
        raise HTTPException(403, "Not allowed to upload a resume for this student")
    return s


@router.post("/{sid}/resume")
async def upload_resume(sid: int, request: Request, file: UploadFile = File(...), user: User = Depends(current_user),
                        db=Depends(get_db)):
    """Student (own profile) or placement staff uploads a resume PDF → returns a preview of the profile changes."""
    s = _resume_access(user, sid, db, write=True)
    data = await _read_upload(file)
    try:
        up = resumes.store_upload(db, file.filename or "resume.pdf", data, s.id, user.id)
    except resumes.ResumeError as e:
        raise HTTPException(400, str(e)) from e
    audit(db, request, user, "resume_uploaded", "student", s.id, upload=up.id, pages=up.pages)
    return {"upload_id": up.id, "pages": up.pages, "filename": up.filename, "preview": resumes.preview(s, up.parsed)}


@router.post("/{sid}/resume/{uid}/apply")
def apply_resume(sid: int, uid: str, request: Request, user: User = Depends(current_user), db=Depends(get_db)):
    s = _resume_access(user, sid, db, write=True)
    up = db.get(ResumeUpload, uid)
    if not up or up.student_id != s.id or up.status != "pending":
        raise HTTPException(404, "Pending upload not found")
    changes = resumes.apply(db, s, up)
    recompute_readiness(db, [s])
    for d in db.query(Drive).filter(Drive.status == "Upcoming", Drive.campus_id == s.campus_id).all():
        matching.run_matching(db, d.id)
    notifications.notify(db, "admin", None, "Placement Cell", "In-app", "Resume",
                         f"Resume updated: {s.name} ({s.roll_no})",
                         f"{len(changes['new_skills'])} new skill(s), {len(changes['new_projects'])} project(s), "
                         f"{len(changes['new_certifications'])} certification(s)."
                         + (" Warnings: " + " ".join(changes["warnings"]) if changes["warnings"] else ""), dedupe=False)
    db.commit()
    audit(db, request, user, "resume_applied", "student", s.id, upload=uid, new_skills=list(changes["new_skills"]))
    return {"applied": changes, "readiness": readiness.explain(db, s), "resume": resumes.meta(up)}


@router.get("/{sid}/resume")
def download_resume(sid: int, request: Request, user: User = Depends(current_user), db=Depends(get_db)):
    s = _resume_access(user, sid, db, write=False)
    up = resumes.latest(db, s.id)
    if not up:
        raise HTTPException(404, "No resume uploaded yet")
    if user.role == "recruiter":
        audit(db, request, user, "resume_downloaded", "student", s.id, upload=up.id)
    safe = f"{s.roll_no}_resume.pdf"
    return FileResponse(up.stored_path, media_type="application/pdf", filename=safe)


@router.get("/{sid}/resume/history")
def resume_history(sid: int, user: User = Depends(current_user), db=Depends(get_db)):
    s = get_student_for(user, sid, db)
    rows = db.query(ResumeUpload).filter(ResumeUpload.student_id == s.id).order_by(ResumeUpload.created_at.desc()).all()
    return [resumes.meta(u) for u in rows]
