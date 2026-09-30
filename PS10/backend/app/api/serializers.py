"""Response shaping shared by routers."""
from __future__ import annotations

from ..engines import matching, offers, readiness, resumes
from ..models import Application, Drive, Offer, Student, User, Venue


def student_brief(s: Student) -> dict:
    return {"id": s.id, "roll_no": s.roll_no, "name": s.name, "branch": s.branch, "campus_id": s.campus_id,
            "cgpa": s.cgpa, "active_backlogs": s.active_backlogs, "readiness_score": s.readiness_score,
            "readiness_level": s.readiness_level, "placement_probability": round(s.placement_probability * 100, 1),
            "at_risk": s.at_risk, "top_skills": sorted(s.skills, key=lambda k: -s.skills[k])[:4],
            "preferred_role": (s.preferred_roles or [""])[0], "provisional": bool(s.imputed_fields),
            "registered_on": s.registered_on, "mentor": s.mentor}


def student_full(db, s: Student) -> dict:
    upcoming = db.query(Drive).filter(Drive.status == "Upcoming").all()
    apps = db.query(Application).filter_by(student_id=s.id).all()
    return {
        "profile": {**student_brief(s), "email": s.email, "phone": s.phone, "batch": s.batch, "gender": s.gender,
                    "tenth_pct": s.tenth_pct, "twelfth_pct": s.twelfth_pct, "backlog_history": s.backlog_history,
                    "skills": s.skills, "certifications": s.certifications, "projects": s.projects,
                    "internships": s.internships, "scores": {"aptitude": s.aptitude_score, "coding": s.coding_score,
                                                             "mock_interview": s.mock_interview_score,
                                                             "communication": s.communication_score,
                                                             "soft_skills": s.softskill_score},
                    "assessment_history": s.assessment_history, "resume_text": s.resume_text},
        "readiness": readiness.explain(db, s),
        "skill_gap": readiness.skill_gap(s),
        "plan": readiness.preparation_plan(db, s),
        "recommendations": matching.recommend_drives(db, s, upcoming),
        "applications": [{"drive_id": a.drive_id, "drive": db.get(Drive, a.drive_id).name, "status": a.status,
                          "fit_score": a.fit_score, "rank": a.rank, "summary": a.explanation.get("summary")}
                         for a in apps if a.eligible],
        "offers": [offers.serialize(db, o) for o in db.query(Offer).filter_by(student_id=s.id).all()],
        "resume": resumes.meta(resumes.latest(db, s.id)),
    }


def drive_brief(db, d: Drive) -> dict:
    j = d.job
    v = db.get(Venue, d.venue_id) if d.venue_id else None
    counts = {st: db.query(Application).filter_by(drive_id=d.id, status=st).count()
              for st in ("Shortlisted", "Waitlisted", "Selected", "Rejected")}
    return {"id": d.id, "name": d.name, "campus_id": d.campus_id, "status": d.status,
            "date": d.date.isoformat() if d.date else None, "slot": d.slot, "venue": v.name if v else None,
            "venue_id": d.venue_id, "company": j.company.name, "company_id": j.company_id, "tier": j.company.tier,
            "role": j.title, "job_id": j.id, "job_type": j.job_type, "ctc_lpa": j.ctc_lpa, "min_cgpa": j.min_cgpa,
            "branches": j.allowed_branches, "openings": j.openings,
            "eligible": db.query(Application).filter_by(drive_id=d.id, eligible=True).count(),
            **{k.lower(): v for k, v in counts.items()}}


def user_out(u: User) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role, "student_id": u.student_id,
            "company_id": u.company_id, "mentor_name": u.mentor_name, "campus_id": u.campus_id,
            "is_active": u.is_active, "must_change_password": u.must_change_password,
            "phone": getattr(u, "phone", "") or "",
            "auth_provider": getattr(u, "auth_provider", "local") or "local",
            "avatar": getattr(u, "avatar", None),
            "created_at": u.created_at.isoformat(timespec="minutes") if u.created_at else None,
            "last_login": u.last_login.isoformat(timespec="minutes") if u.last_login else None}
