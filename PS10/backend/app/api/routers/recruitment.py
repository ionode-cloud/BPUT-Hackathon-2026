"""Recruiters, job descriptions, drives, ranked applications and scheduling."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request

from ...db import get_db
from ...engines import analytics, matching, notifications, offers, scheduler
from ...models import Application, Company, Drive, Job, ResumeUpload, Student, User
from ...schemas import AppStatusIn, JobIn, SlotIn, TextIn
from ..deps import STAFF, audit, current_user, get_drive_for, require, staff_only
from ..serializers import drive_brief

router = APIRouter(prefix="/api", tags=["recruitment"])
RECRUITER_VISIBLE = ("Shortlisted", "Waitlisted", "Selected", "Rejected")


@router.get("/companies")
def companies(user: User = Depends(require("admin", "officer", "recruiter")), db=Depends(get_db)):
    pipe = {r["company"]: r for r in analytics.recruiter_pipeline(db)}
    q = db.query(Company)
    if user.role == "recruiter":
        q = q.filter(Company.id == user.company_id)
    return [{"id": c.id, "name": c.name, "sector": c.sector, "tier": c.tier, "hr_contact": c.hr_contact,
             **{k: pipe[c.name][k] for k in ("stage", "years_visited", "engagement_score", "offers_2027")}}
            for c in q.all()]


@router.post("/jobs/parse")
def parse_jd(body: TextIn, user: User = Depends(require("admin", "officer", "recruiter"))):
    return matching.parse_jd(body.text)


@router.post("/jobs", status_code=201)
def create_job(body: JobIn, request: Request, user: User = Depends(require("admin", "officer", "recruiter")),
               db=Depends(get_db)):
    company_id = user.company_id if user.role == "recruiter" else body.company_id
    company = db.get(Company, company_id) if company_id else None
    if not company:
        raise HTTPException(400, "Valid company_id required")
    p = matching.parse_jd(body.jd_text)
    if not p["required_skills"]:
        raise HTTPException(400, "No skills could be extracted from the JD")
    j = Job(company_id=company.id, title=body.title, role_family=p["role_family"], job_type=p["job_type"],
            jd_text=body.jd_text, required_skills=p["required_skills"], preferred_skills=p["preferred_skills"],
            min_cgpa=p["min_cgpa"] or 6.0, allowed_branches=p["allowed_branches"] or ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"],
            max_active_backlogs=p["max_active_backlogs"] if p["max_active_backlogs"] is not None else 0,
            ctc_lpa=p["ctc_lpa"] or 5.0, mock_benchmark=body.mock_benchmark, openings=body.openings)
    db.add(j)
    db.flush()
    d = Drive(campus_id=body.campus_id, job_id=j.id, name=f"{company.name} – {body.title}", window_start=body.window_start,
              window_end=body.window_end, panels_required=body.panels_required, needs_lab=body.needs_lab)
    db.add(d)
    db.commit()
    matching.build_embeddings(db, force=True)
    result = matching.run_matching(db, d.id)
    notifications.announce_drive(db, d)
    db.commit()
    audit(db, request, user, "drive_created", "drive", d.id, company=company.name, title=body.title)
    return {"job_id": j.id, "drive_id": d.id, "parsed": p, "matching": result}


@router.get("/drives")
def drives(user: User = Depends(current_user), db=Depends(get_db)):
    q = db.query(Drive)
    if user.role == "recruiter":
        q = q.join(Job).filter(Job.company_id == user.company_id)
    elif user.role not in STAFF:
        q = q.filter(Drive.status == "Upcoming")
    return [drive_brief(db, d) for d in q.order_by(Drive.status.desc(), Drive.date).all()]


@router.get("/drives/{did}")
def drive_detail(did: int, status: str = "", limit: int = 100, user: User = Depends(current_user), db=Depends(get_db)):
    d = get_drive_for(user, did, db)
    q = db.query(Application).filter_by(drive_id=did)
    if user.role == "recruiter":  # recruiters only see their candidate pool, never the ineligible list
        q = q.filter(Application.status.in_(RECRUITER_VISIBLE))
    if status:
        q = q.filter(Application.status == status)
    apps = q.order_by(Application.eligible.desc(), Application.fit_score.desc()).all()
    j = d.job
    elig = [a for a in apps if a.eligible]
    items = []
    shown = apps[:max(1, min(limit, 500))]
    with_resume = {r[0] for r in db.query(ResumeUpload.student_id).filter(
        ResumeUpload.status == "applied", ResumeUpload.student_id.in_([a.student_id for a in shown])).all()}
    for a in shown:
        s = db.get(Student, a.student_id)
        items.append({"application_id": a.id, "student_id": s.id, "name": s.name, "roll_no": s.roll_no,
                      "branch": s.branch, "cgpa": s.cgpa, "mock": s.mock_interview_score, "rank": a.rank,
                      "fit_score": a.fit_score, "fit_level": a.fit_level, "status": a.status,
                      "explanation": a.explanation, "has_resume": s.id in with_resume})
    ineligible_reasons: dict[str, int] = {}
    if user.role in STAFF:
        for a in db.query(Application).filter_by(drive_id=did, eligible=False).all():
            for f in a.explanation.get("failed", []):
                key = "Branch" if f.startswith("Branch") else ("CGPA" if "CGPA" in f else "Backlogs" if "backlog" in f else "Offer policy")
                ineligible_reasons[key] = ineligible_reasons.get(key, 0) + 1
    return {"drive": drive_brief(db, d),
            "job": {"title": j.title, "jd_text": j.jd_text, "required_skills": j.required_skills,
                    "preferred_skills": j.preferred_skills, "role_family": j.role_family, "mock_benchmark": j.mock_benchmark,
                    "max_active_backlogs": j.max_active_backlogs, "pool_size": matching.pool_size(j)},
            "applications": items, "total": len(apps), "rationale": matching.ranking_rationale(elig),
            "ineligible_reasons": ineligible_reasons,
            "level_distribution": {lv: sum(1 for a in elig if a.fit_level == lv)
                                   for lv in ["Not Ready", "Developing", "Ready", "Highly Employable"]}}


@router.post("/drives/{did}/match")
def rematch(did: int, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    r = matching.run_matching(db, did, auto_shortlist=True)
    audit(db, request, user, "matching_run", "drive", did, shortlisted=r["shortlisted"])
    return r


@router.post("/drives/{did}/notify-shortlist")
def notify_shortlist(did: int, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    n = notifications.notify_shortlist(db, db.get(Drive, did))
    db.commit()
    audit(db, request, user, "shortlist_notified", "drive", did, recipients=n)
    return {"notified": n}


@router.post("/applications/{aid}/status")
def set_app_status(aid: int, body: AppStatusIn, request: Request,
                   user: User = Depends(require("admin", "officer", "recruiter")), db=Depends(get_db)):
    a = db.get(Application, aid)
    if not a:
        raise HTTPException(404, "Application not found")
    d = get_drive_for(user, a.drive_id, db)
    s = db.get(Student, a.student_id)
    if not a.eligible and body.status not in ("Not Eligible", "Rejected", "Applied"):
        raise HTTPException(400, "Candidate is not eligible for this drive")

    prev_status = a.status
    a.status = body.status
    offer = None

    if body.status in ("Selected", "Offer"):
        # Check if an offer already exists
        existing_offer = db.query(Offer).filter_by(student_id=a.student_id, drive_id=d.id).first()
        if not existing_offer:
            otype = {"FTE": "FTE", "Intern+PPO": "Intern Conversion", "Internship": "Internship"}.get(d.job.job_type, "FTE")
            offer = offers.create_offer(db, s, d, otype, d.job.ctc_lpa, issued=date.today())
            notifications.notify_offer(db, offer)
        else:
            offer = existing_offer

    elif body.status == "Interview" and s:
        notifications.notify(db, "student", s.id, s.name, "WhatsApp", "Interview round",
                             f"Interview round: {d.name}",
                             f"Congratulations {s.name}! You have been advanced to the Interview round for {d.job.title} at {d.job.company.name}.")

    elif body.status == "Shortlisted" and s:
        notifications.notify(db, "student", s.id, s.name, "In-app", "Shortlist update",
                             f"Shortlisted: {d.name}",
                             f"You have been shortlisted for {d.job.company.name} ({d.job.title}).")

    elif body.status in ("Accepted", "Joined"):
        existing_offer = db.query(Offer).filter_by(student_id=a.student_id, drive_id=d.id).first()
        if existing_offer and existing_offer.status != body.status:
            try:
                offers.transition(db, existing_offer, body.status, f"Marked {body.status} via recruitment pipeline")
            except Exception:
                pass

    db.commit()
    audit(db, request, user, "application_status", "application", aid, status=body.status,
          prev_status=prev_status, offer_id=offer.id if offer else None)
    return {"ok": True, "status": body.status, "offer_id": offer.id if offer else None}


# ------------------------------------------------------------------ scheduling
@router.get("/schedule")
def schedule(user: User = Depends(staff_only), db=Depends(get_db)):
    return {"calendar": scheduler.calendar(db), "conflicts": scheduler.detect_conflicts(db),
            "holidays": {k.isoformat(): v for k, v in scheduler.HOLIDAYS.items()}, "panel_pool": scheduler.PANEL_POOL}


@router.post("/schedule/auto")
def auto_schedule(request: Request, apply: bool = False, user: User = Depends(staff_only), db=Depends(get_db)):
    r = scheduler.auto_schedule(db, apply=apply)
    if apply:
        audit(db, request, user, "schedule_applied", "schedule", None, moved=len(r["changes"]))
    return r


@router.put("/drives/{did}/schedule")
def set_slot(did: int, body: SlotIn, request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    d = db.get(Drive, did)
    if not d:
        raise HTTPException(404, "Drive not found")
    d.date, d.slot, d.venue_id = body.date, body.slot, body.venue_id
    db.commit()
    notifications.notify_schedule(db, d)
    db.commit()
    audit(db, request, user, "drive_scheduled", "drive", did, date=str(body.date), slot=body.slot, venue=body.venue_id)
    return {"ok": True, "conflicts": [c for c in scheduler.detect_conflicts(db) if did in c["drives"]]}
