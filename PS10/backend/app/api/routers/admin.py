"""Administration: users, audit trail, master data, historical data import, reset."""
from __future__ import annotations

import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

from ...core.config import settings
from ...core.security import generate_password, hash_password, password_problems
from ...db import get_db
from ...models import AuditLog, Campus, Company, HistoricalPlacement, User, Venue
from ...schemas import CampusIn, CompanyIn, CsvIn, UserIn, UserPatch, VenueIn
from ...services import bootstrap
from ..deps import admin_only, audit, staff_only
from ..serializers import user_out

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def list_users(role: str = "", q: str = "", user: User = Depends(admin_only), db=Depends(get_db)):
    qs = db.query(User)
    if role:
        qs = qs.filter(User.role == role)
    if q:
        qs = qs.filter(User.email.ilike(f"%{q}%") | User.name.ilike(f"%{q}%"))
    return [user_out(u) for u in qs.order_by(User.role, User.email).limit(500).all()]


@router.post("/users", status_code=201)
def create_user(body: UserIn, request: Request, user: User = Depends(admin_only), db=Depends(get_db)):
    email = body.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "E-mail already registered")
    if body.role == "student" and not body.student_id:
        raise HTTPException(400, "student_id is required for student accounts")
    if body.role == "recruiter" and not body.company_id:
        raise HTTPException(400, "company_id is required for recruiter accounts")
    if body.role == "mentor" and not body.mentor_name:
        raise HTTPException(400, "mentor_name is required for mentor accounts")
    pw = body.password or generate_password()
    if body.password and password_problems(pw):
        raise HTTPException(400, "Password needs " + ", ".join(password_problems(pw)))
    u = User(email=email, name=body.name, role=body.role, password_hash=hash_password(pw), student_id=body.student_id,
             company_id=body.company_id, mentor_name=body.mentor_name, campus_id=body.campus_id,
             must_change_password=body.password is None)
    db.add(u)
    db.commit()
    audit(db, request, user, "user_created", "user", u.id, role=u.role, email=u.email)
    return {**user_out(u), "temporary_password": None if body.password else pw}


@router.patch("/users/{uid}")
def update_user(uid: int, body: UserPatch, request: Request, user: User = Depends(admin_only), db=Depends(get_db)):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == user.id and body.is_active is False:
        raise HTTPException(400, "You cannot deactivate your own account")
    temp = None
    if body.name:
        u.name = body.name
    if body.is_active is not None:
        u.is_active = body.is_active
    if body.reset_password:
        temp = generate_password()
        u.password_hash = hash_password(temp)
        u.must_change_password = True
    db.commit()
    audit(db, request, user, "user_updated", "user", uid, is_active=u.is_active, reset_password=body.reset_password)
    return {**user_out(u), "temporary_password": temp}


@router.get("/audit")
def audit_log(action: str = "", limit: int = 200, user: User = Depends(admin_only), db=Depends(get_db)):
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    rows = q.order_by(AuditLog.id.desc()).limit(max(1, min(limit, 1000))).all()
    return [{"id": r.id, "at": r.at.isoformat(timespec="seconds"), "user": r.user_email, "role": r.role, "action": r.action,
             "entity": r.entity, "entity_id": r.entity_id, "detail": r.detail, "ip": r.ip, "request_id": r.request_id}
            for r in rows]


# ------------------------------------------------------------------ master data
@router.post("/campuses", status_code=201)
def add_campus(body: CampusIn, request: Request, user: User = Depends(admin_only), db=Depends(get_db)):
    c = Campus(name=body.name, city=body.city)
    db.add(c)
    db.commit()
    audit(db, request, user, "campus_created", "campus", c.id, name=c.name)
    return {"id": c.id, "name": c.name, "city": c.city}


@router.post("/venues", status_code=201)
def add_venue(body: VenueIn, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    v = Venue(**body.model_dump())
    db.add(v)
    db.commit()
    audit(db, request, user, "venue_created", "venue", v.id, name=v.name)
    return {"id": v.id, **body.model_dump()}


@router.post("/companies", status_code=201)
def add_company(body: CompanyIn, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    c = Company(**body.model_dump())
    db.add(c)
    db.commit()
    audit(db, request, user, "company_created", "company", c.id, name=c.name)
    return {"id": c.id, **body.model_dump()}


HISTORY_COLUMNS = ["batch", "branch", "cgpa", "active_backlogs", "backlog_history", "n_skills", "skill_depth", "n_certs",
                   "n_projects", "internships", "aptitude_score", "coding_score", "mock_interview_score",
                   "communication_score", "softskill_score", "top_skills", "placed", "company", "ctc_lpa"]


@router.post("/history/import")
def import_history(body: CsvIn, request: Request, user: User = Depends(admin_only), db=Depends(get_db)):
    """Import past placement outcomes (one row per graduated student) to train PlacementNet on real data."""
    reader = csv.DictReader(io.StringIO(body.csv.lstrip("﻿")))
    missing = [c for c in HISTORY_COLUMNS[:16] if c not in (reader.fieldnames or [])]
    if missing:
        raise HTTPException(400, f"Missing columns: {', '.join(missing)}")
    n, errors = 0, []
    for i, r in enumerate(reader, start=2):
        try:
            db.add(HistoricalPlacement(
                campus_id=int(r.get("campus_id") or 1), batch=int(r["batch"]), branch=r["branch"].upper(),
                cgpa=float(r["cgpa"]), active_backlogs=int(r["active_backlogs"]), backlog_history=int(r["backlog_history"]),
                n_skills=int(r["n_skills"]), skill_depth=float(r["skill_depth"]), n_certs=int(r["n_certs"]),
                n_projects=int(r["n_projects"]), internships=int(r["internships"]),
                aptitude_score=float(r["aptitude_score"]), coding_score=float(r["coding_score"]),
                mock_interview_score=float(r["mock_interview_score"]), communication_score=float(r["communication_score"]),
                softskill_score=float(r["softskill_score"]),
                top_skills=[s.strip() for s in (r.get("top_skills") or "").split(";") if s.strip()],
                placed=str(r["placed"]).strip().lower() in ("1", "true", "yes", "y"),
                company=r.get("company") or None, ctc_lpa=float(r["ctc_lpa"]) if r.get("ctc_lpa") else None))
            n += 1
        except (KeyError, ValueError) as e:
            errors.append({"row": i, "error": str(e)})
    db.commit()
    audit(db, request, user, "history_imported", "history", None, rows=n, errors=len(errors))
    return {"imported": n, "errors": errors[:50], "next_step": "POST /api/admin/retrain to train the models on this data"}


@router.get("/history/template.csv")
def history_template(user: User = Depends(admin_only)):
    from fastapi.responses import PlainTextResponse
    row = "2025,CSE,8.1,0,0,7,3.2,2,3,1,72,68,70,74,76,python;sql;react,1,Example Tech,6.5"
    return PlainTextResponse(",".join(HISTORY_COLUMNS) + "\n" + row, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=campuslink_history_template.csv"})


@router.post("/reset")
async def admin_reset(request: Request, user: User = Depends(admin_only), db=Depends(get_db)):
    if not settings.SEED_DEMO_DATA:
        raise HTTPException(403, "Reset is only available for demo installations")
    audit(db, request, user, "demo_reset", "system", None)
    await run_in_threadpool(bootstrap, True)
    from .insights import _eval_cache
    _eval_cache.clear()
    return {"ok": True}
