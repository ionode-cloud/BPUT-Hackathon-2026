"""New-student onboarding: registration, resume parsing, CSV bulk import and
cold-start handling.

A newly registered student is scored immediately by the already-trained
PyTorch models – no retraining is needed, because PlacementNet, Skill2Vec,
FitNet and the role classifier all generalise to unseen students (inference only).

Cold start: when a new student has not yet taken the aptitude / coding /
mock-interview / communication assessments, those inputs are estimated from
the median of the same branch and the profile is marked *provisional*. The
estimated fields are listed on the profile, and the PlacementNet ensemble's
disagreement (σ) is shown as an uncertainty band. As soon as real scores are
recorded the estimates are replaced and everything is re-scored.
"""
from __future__ import annotations

import csv
import io
import re
from datetime import date
from pathlib import Path

import numpy as np

from ..core.config import settings
from ..models import Application, Drive, Notification, Offer, ResumeUpload, Student, User
from . import ai_models, matching, notifications
from .skills import ROLE_PROFILES, extract_skills

BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]
SCORE_FIELDS = {"aptitude_score": "aptitude", "coding_score": "coding", "mock_interview_score": "mock interview",
                "communication_score": "communication", "softskill_score": "soft skills",
                "tenth_pct": "10th %", "twelfth_pct": "12th %"}
RESUME_BRANCH = {"CSE": ["computer science", "cse"], "IT": ["information technology"],
                 "ECE": ["electronics and communication", "electronics & communication", "ece", "e&tc"],
                 "EEE": ["electrical and electronics", "electrical & electronics", "electrical engineering", "eee"],
                 "MECH": ["mechanical"], "CIVIL": ["civil"]}


class OnboardingError(ValueError):
    pass


# ------------------------------------------------------------------ resume parsing
def _section(text: str, names: str) -> str:
    m = re.search(rf"(?:{names})\s*[:\-]\s*(.+?)(?=\n\s*[A-Z][A-Za-z ]{{2,25}}\s*[:\-]|\Z)", text, re.I | re.S)
    return m.group(1).strip() if m else ""


def parse_resume(text: str) -> dict:
    """Rule + dictionary NLP over free-text resumes; the target role is predicted
    by the PyTorch role classifier from the extracted skills."""
    low = text.lower()
    skills = extract_skills(text)
    proj_txt = _section(text, "projects?|academic projects?")
    cert_txt = _section(text, "certifications?|courses?")
    exp_txt = _section(text, "experience|internships?")
    prof = {}
    for s in skills:
        level = 2
        if s in extract_skills(proj_txt) or s in extract_skills(exp_txt):
            level += 1
        if s in extract_skills(cert_txt):
            level += 1
        prof[s] = min(level, 4)
    projects = []
    for part in re.split(r"[\n;•]+", proj_txt):
        part = part.strip(" -*\t")
        if len(part) > 3:
            title = re.split(r"[(\-–:|]", part)[0].strip()[:80] or part[:80]
            projects.append({"title": title, "tech": extract_skills(part)[:5], "description": part[:200]})
    certs = []
    for part in re.split(r"[\n;,•]+", cert_txt):
        part = part.strip(" -*\t")
        if len(part) > 3:
            sk = extract_skills(part)
            certs.append({"name": part[:80], "skill": sk[0] if sk else ""})
    cg = (re.search(r"\b(?:c?gpa|cpi|[sd]gpa|grade point average)\b[^\d\n]{0,25}(\d{1,2}(?:\.\d{1,2})?)(?![\d.]*\s*%|[a-z\d])", low)
          or re.search(r"(\d(?:\.\d{1,2})?)\s*/\s*10(?:\.0+)?\b", low)
          or re.search(r"(\d\.\d{1,2})\s*(?:c?gpa|cpi|[sd]gpa)\b", low))
    tenth = re.search(r"(?:10th|class x\b|ssc|hsc board x|matric)[^\d]{0,20}(\d{2}(?:\.\d+)?)\s*%", low)
    twelfth = re.search(r"(?:12th|class xii|intermediate|hsc|\+2)[^\d]{0,20}(\d{2}(?:\.\d+)?)\s*%", low)
    email = re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text)
    phone = re.search(r"(?:\+91[\s-]?)?[6-9]\d{9}", text)
    branch = next((b for b, ws in RESUME_BRANCH.items() if any(re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", low) for w in ws)), None)
    first = next((item.strip() for item in text.splitlines() if item.strip()), "")
    name = first if 1 <= len(first.split()) <= 4 and re.fullmatch(r"[A-Za-z .]+", first) else None
    internships = len(re.findall(r"\bintern(?:ship)?\b", exp_txt.lower())) if exp_txt else len(re.findall(r"\binternship\b", low))
    role, conf, top = ai_models.classify_role(list(prof)) if prof else (None, 0.0, [])
    return {"name": name, "email": email.group(0) if email else None, "phone": phone.group(0) if phone else None,
            "branch": branch, "cgpa": float(cg.group(1)) if cg and float(cg.group(1)) <= 10 else None,
            "tenth_pct": float(tenth.group(1)) if tenth else None, "twelfth_pct": float(twelfth.group(1)) if twelfth else None,
            "skills": prof, "projects": projects[:5], "certifications": certs[:6], "internships": min(internships, 4),
            "preferred_role": role, "role_confidence": round(conf, 3), "role_candidates": top}


# ------------------------------------------------------------------ creation
def _branch_medians(db, branch: str) -> dict:
    rows = db.query(Student).filter(Student.branch == branch).all() or db.query(Student).all()
    return {f: float(np.median([getattr(s, f) for s in rows])) for f in SCORE_FIELDS}


def _mentor(db, campus_id: int) -> str:
    load: dict[str, int] = {}
    for (m,) in db.query(Student.mentor).filter(Student.campus_id == campus_id).all():
        load[m] = load.get(m, 0) + 1
    return min(load, key=load.get) if load else "Placement Cell"


def _summary_resume(name, branch, cgpa, skills, projects, certs, internships, role) -> str:
    sk = ", ".join(f"{s} ({'★' * v})" for s, v in sorted(skills.items(), key=lambda kv: -kv[1]))
    return (f"{name} – B.Tech {branch}, CGPA {cgpa}. Career objective: {role}. Skills: {sk}. "
            f"Projects: {'; '.join(p['title'] for p in projects) or 'None'}. "
            f"Certifications: {', '.join(c['name'] for c in certs) or 'None'}. Internships: {internships}.")


def _num(v, lo, hi, field):
    if v in (None, ""):
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        raise OnboardingError(f"{field} must be a number") from None
    if not lo <= x <= hi:
        raise OnboardingError(f"{field} must be between {lo} and {hi}")
    return x


def create_student(db, data: dict, rematch: bool = True, notify: bool = True) -> Student:
    from ..services import recompute_readiness
    name = (data.get("name") or "").strip()
    if not name:
        raise OnboardingError("name is required")
    branch = (data.get("branch") or "").upper()
    if branch not in BRANCHES:
        raise OnboardingError(f"branch must be one of {', '.join(BRANCHES)}")
    cgpa = _num(data.get("cgpa"), 0, 10, "cgpa")
    if cgpa is None:
        raise OnboardingError("cgpa is required")
    email = (data.get("email") or "").strip() or f"{name.lower().replace(' ', '.')}@student.kie.edu.in"
    if db.query(Student).filter(Student.email == email).first():
        raise OnboardingError(f"a student with e-mail {email} already exists")
    campus_id = int(data.get("campus_id") or 1)
    resume = data.get("resume_text") or ""
    parsed = parse_resume(resume) if resume.strip() else {}
    skills = {k: int(v) for k, v in (data.get("skills") or parsed.get("skills") or {}).items() if 0 < int(v) <= 5}
    projects = data.get("projects") or parsed.get("projects") or []
    projects = [{"title": p.get("title", "Project"), "tech": p.get("tech") or extract_skills(p.get("title", "") + " " + p.get("description", "")),
                 "description": p.get("description", p.get("title", ""))} for p in projects]
    certs = data.get("certifications") or parsed.get("certifications") or []
    certs = [c if isinstance(c, dict) else {"name": str(c), "skill": (extract_skills(str(c)) or [""])[0]} for c in certs]
    med = _branch_medians(db, branch)
    vals, imputed = {}, []
    aliases = {"aptitude_score": "aptitude", "coding_score": "coding", "mock_interview_score": "mock_interview",
               "communication_score": "communication", "softskill_score": "softskill", "tenth_pct": "tenth_pct",
               "twelfth_pct": "twelfth_pct"}
    for f, key in aliases.items():
        v = _num(data.get(key, data.get(f)), 0, 100, key)
        if v is None and f in ("tenth_pct", "twelfth_pct"):
            v = parsed.get(f)
        if v is None:
            v = round(med[f], 1)
            imputed.append(f)
        vals[f] = v
    role = data.get("preferred_role") or parsed.get("preferred_role")
    if role not in ROLE_PROFILES:
        role = ai_models.classify_role(list(skills))[0] if skills else next(r for r, p in ROLE_PROFILES.items() if branch in p["branches"])
    internships = int(_num(data.get("internships", parsed.get("internships", 0)) or 0, 0, 10, "internships"))
    active = int(_num(data.get("active_backlogs") or 0, 0, 20, "active_backlogs"))
    hist_bl = int(_num(data.get("backlog_history") or active, 0, 30, "backlog_history"))
    sid = (max((i for (i,) in db.query(Student.id).all()), default=0)) + 1
    batch = int(data.get("batch") or 2027)
    s = Student(
        id=sid, campus_id=campus_id, roll_no=f"{'KIE' if campus_id == 1 else 'KIN'}{batch % 100}{branch[:3]}{sid:04d}",
        name=name, email=email, phone=data.get("phone") or parsed.get("phone") or "", branch=branch, batch=batch,
        gender=data.get("gender") or "-", cgpa=cgpa, tenth_pct=vals["tenth_pct"], twelfth_pct=vals["twelfth_pct"],
        active_backlogs=active, backlog_history=max(hist_bl, active), skills=skills, certifications=certs,
        projects=projects, internships=internships, aptitude_score=vals["aptitude_score"],
        coding_score=vals["coding_score"], mock_interview_score=vals["mock_interview_score"],
        communication_score=vals["communication_score"], softskill_score=vals["softskill_score"],
        assessment_history=[{"month": date.today().strftime("%Y-%m"), "aptitude": vals["aptitude_score"],
                             "mock": vals["mock_interview_score"], "coding": vals["coding_score"]}],
        preferred_roles=[role], mentor=_mentor(db, campus_id),
        resume_text=resume or _summary_resume(name, branch, cgpa, skills, projects, certs, internships, role),
        imputed_fields=imputed, registered_on=date.today().isoformat())
    db.add(s)
    db.commit()
    recompute_readiness(db, [s])  # PlacementNet inference – no retraining
    if rematch:
        for d in db.query(Drive).filter(Drive.status == "Upcoming", Drive.campus_id == campus_id).all():
            matching.run_matching(db, d.id)
    if notify:
        notifications.notify(db, "student", s.id, s.name, "Email", "Welcome", "Welcome to CampusLink",
                             f"Your readiness score is {s.readiness_score} ({s.readiness_level})."
                             + (" Some scores are provisional until you complete the pending assessments." if imputed else ""))
        if imputed:
            notifications.notify(db, "student", s.id, s.name, "In-app", "Assessments", "Complete your placement assessments",
                                 "Pending: " + ", ".join(SCORE_FIELDS[f] for f in imputed if f in SCORE_FIELDS) + ".")
        db.commit()
    return s


# ------------------------------------------------------------------ CSV bulk import
TEMPLATE_HEADER = ["name", "email", "phone", "branch", "campus_id", "batch", "cgpa", "tenth_pct", "twelfth_pct",
                   "active_backlogs", "backlog_history", "skills", "internships", "aptitude", "coding", "mock_interview",
                   "communication", "softskill", "preferred_role", "resume_text"]


def _parse_skills(cell: str) -> dict:
    out = {}
    for part in re.split(r"[;|]", cell or ""):
        part = part.strip()
        if not part:
            continue
        name, _, lvl = part.partition(":")
        canon = (extract_skills(name) or [name.strip().lower()])[0]
        out[canon] = int(lvl) if lvl.strip().isdigit() else 2
    return out


def import_csv(db, text: str) -> dict:
    reader = csv.DictReader(io.StringIO(text.lstrip("﻿")))
    created, errors = [], []
    for i, row in enumerate(reader, start=2):
        row = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
        if not any(row.values()):
            continue
        try:
            if row.get("skills"):
                row["skills"] = _parse_skills(row["skills"])
            else:
                row.pop("skills", None)
            s = create_student(db, row, rematch=False, notify=True)
            created.append({"id": s.id, "name": s.name, "readiness": s.readiness_score, "level": s.readiness_level,
                            "provisional": bool(s.imputed_fields)})
        except OnboardingError as e:
            db.rollback()
            errors.append({"row": i, "name": row.get("name"), "error": str(e)})
    if created:
        for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
            matching.run_matching(db, d.id)
    return {"created": created, "errors": errors}


# --------------------------------------------------------------------- removal
def deletion_blockers(db, s: Student) -> list[str]:
    """Reasons a student record must not be hard-deleted."""
    n = db.query(Offer).filter(Offer.student_id == s.id).count()
    return [f"{n} offer(s) are recorded in the hash-chained offer ledger – deleting them would break "
            f"verification. Keep the record (offers can be withdrawn instead)."] if n else []


def delete_student(db, s: Student) -> dict:
    """Hard-delete a student and everything that belongs only to them: drive applications,
    notifications, resume PDFs and the portal login. Drive pools the student was shortlisted in
    are re-ranked so the next candidate moves up. Refuses when offers exist (ledger integrity)."""
    blockers = deletion_blockers(db, s)
    if blockers:
        raise OnboardingError(blockers[0])
    info = {"id": s.id, "roll_no": s.roll_no, "name": s.name, "branch": s.branch}
    rerank = {a.drive_id for a in db.query(Application).filter(Application.student_id == s.id,
                                                               Application.status.in_(["Shortlisted", "Waitlisted"]))}
    counts = {"applications": db.query(Application).filter(Application.student_id == s.id).delete(),
              "notifications": db.query(Notification).filter(Notification.audience == "student",
                                                             Notification.recipient_id == s.id).delete(),
              "resumes": 0, "logins": 0}
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    for up in db.query(ResumeUpload).filter(ResumeUpload.student_id == s.id).all():
        f = Path(up.stored_path).resolve()
        if upload_dir in f.parents:
            f.unlink(missing_ok=True)
        db.delete(up)
        counts["resumes"] += 1
    for u in db.query(User).filter(User.student_id == s.id).all():
        db.delete(u)
        counts["logins"] += 1
    db.flush()  # children first – there are no ORM relationships to order the deletes
    db.delete(s)
    db.commit()
    for did in rerank:
        d = db.get(Drive, did)
        if d and d.status == "Upcoming":
            matching.run_matching(db, did)
    ai_models.invalidate_vectors(info["id"])
    return {**info, "removed": counts, "drives_reranked": len(rerank)}
