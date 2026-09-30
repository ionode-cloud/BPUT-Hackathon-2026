"""Self-service endpoints for the logged-in user (student / recruiter / mentor portals)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ...db import get_db
from ...engines import offers
from ...models import Company, Drive, Job, Offer, Student, User
from ..deps import current_user
from ..serializers import drive_brief, student_brief, student_full

router = APIRouter(prefix="/api/me", tags=["portal"])


@router.get("/profile")
def my_profile(user: User = Depends(current_user), db=Depends(get_db)):
    if user.role == "student":
        s = db.get(Student, user.student_id) if user.student_id else None
        if not s:
            raise HTTPException(404, "No student record is linked to this account")
        return {"role": "student", **student_full(db, s)}
    if user.role == "mentor":
        mentees = db.query(Student).filter(Student.mentor == user.mentor_name).order_by(Student.readiness_score).all()
        return {"role": "mentor", "mentor": user.mentor_name, "mentees": [student_brief(s) for s in mentees],
                "at_risk": sum(s.at_risk for s in mentees), "total": len(mentees)}
    if user.role == "recruiter":
        c = db.get(Company, user.company_id) if user.company_id else None
        if not c:
            raise HTTPException(404, "No company is linked to this account")
        drives = db.query(Drive).join(Job).filter(Job.company_id == c.id).order_by(Drive.status.desc(), Drive.date).all()
        return {"role": "recruiter", "company": {"id": c.id, "name": c.name, "tier": c.tier, "sector": c.sector},
                "drives": [drive_brief(db, d) for d in drives],
                "offers": [offers.serialize(db, o) for o in db.query(Offer).filter_by(company_id=c.id).all()]}
    return {"role": user.role}
