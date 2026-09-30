"""Dashboard, analytics, notifications, AI assistant, model cards and evaluation."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

from ...db import get_db
from ...engines import analytics, evaluation, llm, notifications, predictor
from ...ml import core as ml_core
from ...models import Notification, Student, User
from ...schemas import AskIn, BroadcastIn, EscalateIn
from ...services import retrain_all
from ..deps import STAFF, audit, current_user, get_student_for, require, staff_only

router = APIRouter(prefix="/api", tags=["insights"])
_eval_cache: dict = {}


@router.get("/dashboard")
def dashboard(campus_id: int | None = None, user: User = Depends(staff_only), db=Depends(get_db)):
    return analytics.dashboard(db, campus_id)


@router.get("/analytics")
def analytics_all(campus_id: int | None = None, user: User = Depends(staff_only), db=Depends(get_db)):
    return {"skill_conversion": analytics.skill_conversion(db), "package_trend": analytics.package_trend(db),
            "company_packages": analytics.company_packages(db), "at_risk": analytics.at_risk(db, campus_id),
            "recruiters": analytics.recruiter_pipeline(db), "campuses": analytics.campus_comparison(db),
            "branch_conversion": analytics.dashboard(db, campus_id)["branch_conversion"],
            "feature_importance": predictor.feature_importance(db), "notifications": analytics.notification_stats(db)}


# ------------------------------------------------------------------ notifications
@router.get("/notifications")
def list_notifications(audience: str = "", category: str = "", limit: int = 100, user: User = Depends(current_user),
                       db=Depends(get_db)):
    q = db.query(Notification)
    if user.role == "student":
        q = q.filter(Notification.audience == "student", Notification.recipient_id == user.student_id)
    elif user.role == "recruiter":
        q = q.filter(Notification.audience == "recruiter", Notification.recipient_id == user.company_id)
    elif user.role == "mentor":
        q = q.filter(Notification.audience == "mentor", Notification.recipient_name == user.mentor_name)
    elif audience:
        q = q.filter(Notification.audience == audience)
    if category:
        q = q.filter(Notification.category == category)
    total = q.count()
    items = q.order_by(Notification.id.desc()).limit(max(1, min(limit, 500))).all()
    stats = analytics.notification_stats(db) if user.role in STAFF else []
    return {"total": total, "stats": stats,
            "items": [{"id": n.id, "created_at": n.created_at.isoformat(timespec="minutes"), "audience": n.audience,
                       "recipient": n.recipient_name, "channel": n.channel, "category": n.category, "title": n.title,
                       "message": n.message, "read": n.read} for n in items]}


@router.post("/notifications/broadcast")
def broadcast_notifications(body: BroadcastIn, request: Request,
                            user: User = Depends(staff_only), db=Depends(get_db)):
    q = db.query(Student)
    if body.branch:
        q = q.filter(Student.branch == body.branch)
    if body.batch:
        q = q.filter(Student.batch == body.batch)
    if body.min_cgpa > 0:
        q = q.filter(Student.cgpa >= body.min_cgpa)
    target_students = q.all()

    sent_count = 0
    for s in target_students:
        n = notifications.notify(
            db,
            audience="student",
            recipient_id=s.id,
            name=s.name,
            channel=body.channel,
            category="TPO Announcement",
            title=body.title,
            message=body.message,
            dedupe=False
        )
        if n:
            sent_count += 1

    tpo_record = Notification(
        audience="officer",
        recipient_id=user.id,
        recipient_name="Placement Officer (TPO)",
        channel=body.channel,
        category="Broadcast History",
        title=f"📢 Broadcast: {body.title} ({sent_count} students)",
        message=f"Sent to {sent_count} student(s) [{body.branch or 'All branches'}, Batch {body.batch or 'All'}, CGPA ≥ {body.min_cgpa}].\n\nContent:\n{body.message}",
        read=True
    )
    db.add(tpo_record)
    db.commit()

    audit(db, request, user, "broadcast_notifications", "notification", None,
          recipients=sent_count, title=body.title, channel=body.channel)
    return {"ok": True, "recipients_count": sent_count, "title": body.title, "channel": body.channel}


@router.post("/assistant/escalate")
def escalate_to_tpo(body: EscalateIn, request: Request,
                    user: User = Depends(current_user), db=Depends(get_db)):
    student = None
    if user.role == "student" and user.student_id:
        student = db.get(Student, user.student_id)

    student_name = student.name if student else (user.name or "Student")
    roll_info = f" ({student.roll_no}, {student.branch})" if student else ""
    contact_info = f"\nEmail: {user.email}" + (f" | Phone: {student.phone}" if student and student.phone else "")

    urgent_n = Notification(
        audience="officer",
        recipient_id=None,
        recipient_name="Placement Officer (TPO)",
        channel="In-app",
        category="urgent_ai_request",
        title=f"🚨 Urgent Case: {student_name}{roll_info} [{body.urgency.upper()}]",
        message=f"Urgent student request flagged by AI.\nStudent: {student_name}{roll_info}{contact_info}\nUrgency: {body.urgency}\n\nStudent Query:\n{body.question}",
        read=False
    )
    db.add(urgent_n)

    if student:
        conf_n = Notification(
            audience="student",
            recipient_id=student.id,
            recipient_name=student.name,
            channel="In-app",
            category="urgent_ai_request",
            title="Support Request Escalated to TPO",
            message=f"Your issue ('{body.question[:60]}...') has been sent to the Placement Officer (TPO). The placement cell will assist you promptly.",
            read=False
        )
        db.add(conf_n)

    db.commit()
    audit(db, request, user, "ai_escalation", "notification", urgent_n.id, urgency=body.urgency)
    return {
        "ok": True,
        "escalated": True,
        "notification_id": urgent_n.id,
        "message": "Your urgent issue has been escalated to the Placement Officer (TPO). They will assist you shortly."
    }


@router.get("/escalations")
def list_escalations(user: User = Depends(staff_only), db=Depends(get_db)):
    items = db.query(Notification).filter(
        Notification.category == "urgent_ai_request",
        Notification.audience == "officer"
    ).order_by(Notification.id.desc()).limit(50).all()
    return [{
        "id": n.id,
        "created_at": n.created_at.isoformat(timespec="minutes"),
        "title": n.title,
        "message": n.message,
        "read": n.read
    } for n in items]


@router.post("/escalations/{nid}/resolve")
def resolve_escalation(nid: int, request: Request,
                       user: User = Depends(staff_only), db=Depends(get_db)):
    n = db.get(Notification, nid)
    if not n or n.category != "urgent_ai_request":
        raise HTTPException(404, "Escalation case not found")
    n.read = True
    db.commit()
    audit(db, request, user, "resolve_escalation", "notification", nid)
    return {"ok": True, "id": nid, "status": "Resolved"}


@router.post("/automation/run")
def run_automation(request: Request, user: User = Depends(staff_only), db=Depends(get_db)):
    r = notifications.run_automation(db)
    audit(db, request, user, "automation_run", "automation", None, **{k: v for k, v in r.items() if k != "total_notifications"})
    return r


# ------------------------------------------------------------------ AI
@router.post("/assistant")
def assistant(body: AskIn, user: User = Depends(current_user), db=Depends(get_db)):
    sid = body.student_id
    if user.role == "student":
        sid = user.student_id  # students can only ask about themselves
    elif sid is not None:
        get_student_for(user, sid, db)
    return llm.ask(db, body.question, sid)


@router.get("/llm/status")
def llm_status(user: User = Depends(current_user)):
    return llm.status(force=True)


@router.post("/llm/load")
def llm_load(user: User = Depends(staff_only)):
    llm.start_background_load()
    return llm.status()


@router.get("/models")
def model_cards(user: User = Depends(staff_only)):
    import torch
    return {"framework": f"PyTorch {torch.__version__}", "device": str(ml_core.DEVICE),
            "compute": "CPU only", "cpu_threads": torch.get_num_threads(), "cpu_count": __import__("os").cpu_count(),
            "models": evaluation.model_cards(), "llm": llm.status()}


@router.get("/evaluation")
async def evaluation_report(refresh: bool = False, user: User = Depends(staff_only), db=Depends(get_db)):
    if not predictor.is_trained(db):
        raise HTTPException(409, "Not enough historical placement data to evaluate models yet")
    if refresh or "report" not in _eval_cache:
        _eval_cache["report"] = await run_in_threadpool(evaluation.full_report, db)
    return _eval_cache["report"]


@router.post("/admin/retrain")
async def admin_retrain(request: Request, user: User = Depends(require("admin", "officer")), db=Depends(get_db)):
    _eval_cache.clear()
    r = await run_in_threadpool(retrain_all)
    audit(db, request, user, "models_retrained", "models", None, **r)
    return r
