"""Communication & workflow automation.

Replaces manual e-mail / WhatsApp coordination with targeted, de-duplicated
notifications, and runs rule-based workflow automations:
  • drive announcements to eligible students only
  • shortlist + interview-schedule alerts
  • document-submission reminders for accepted offers
  • offer-response deadline reminders
  • escalation of at-risk / unplaced students to mentors
  • recruiter follow-up prompts for offers pending beyond the deadline
Channels are simulated (In-app / Email / WhatsApp / SMS) – plug a real
gateway (SMTP, WhatsApp Business API, SMS) into `dispatch()` for production.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

from ..models import Application, Company, Drive, Notification, Offer, Student, Venue


def dispatch(n: Notification) -> None:
    """Hook for real delivery gateways. Prototype: stored in the outbox table."""
    return None


def notify(db, audience, recipient_id, name, channel, category, title, message, dedupe=True) -> Notification | None:
    if dedupe and db.query(Notification).filter_by(audience=audience, recipient_id=recipient_id, title=title).first():
        return None
    n = Notification(audience=audience, recipient_id=recipient_id, recipient_name=name, channel=channel,
                     category=category, title=title, message=message, created_at=datetime.utcnow())
    db.add(n)
    dispatch(n)
    return n


def announce_drive(db, drive: Drive) -> int:
    apps = db.query(Application).filter_by(drive_id=drive.id, eligible=True).all()
    j = drive.job
    sent = 0
    for a in apps:
        s = db.get(Student, a.student_id)
        sent += notify(db, "student", s.id, s.name, "In-app", "Drive announcement", f"New drive: {drive.name}",
               f"You are eligible for {j.title} at {j.company.name} ({j.ctc_lpa} LPA). Criteria: CGPA ≥ {j.min_cgpa}, "
               f"branches {', '.join(j.allowed_branches)}. Your fit score: {a.fit_score}.") is not None
    return sent


def notify_shortlist(db, drive: Drive) -> int:
    apps = db.query(Application).filter_by(drive_id=drive.id, status="Shortlisted").all()
    when = f"{drive.date} ({drive.slot})" if drive.date else "date to be announced"
    for a in apps:
        s = db.get(Student, a.student_id)
        notify(db, "student", s.id, s.name, "WhatsApp", "Shortlist", f"Shortlisted: {drive.name}",
               f"Congratulations {s.name.split()[0]}! You are shortlisted (rank #{a.rank}) for {drive.name} on {when}. "
               f"Carry your ID card and resume.")
    return len(apps)


def notify_schedule(db, drive: Drive) -> int:
    v = db.get(Venue, drive.venue_id) if drive.venue_id else None
    apps = db.query(Application).filter(Application.drive_id == drive.id,
                                        Application.status.in_(["Shortlisted", "Waitlisted"])).all()
    msg = f"{drive.name} is scheduled on {drive.date} ({drive.slot}) at {v.name if v else 'TBA'}."
    for a in apps:
        s = db.get(Student, a.student_id)
        notify(db, "student", s.id, s.name, "SMS", "Schedule", f"Schedule update: {drive.name} → {drive.date} {drive.slot}", msg)
    c = drive.job.company
    notify(db, "recruiter", c.id, c.name, "Email", "Schedule", f"Drive confirmed: {drive.name} → {drive.date} {drive.slot}",
           msg + f" {len(apps)} shortlisted candidates.")
    return len(apps) + 1


def notify_offer(db, o: Offer) -> None:
    s = db.get(Student, o.student_id)
    c = db.get(Company, o.company_id)
    notify(db, "student", s.id, s.name, "Email", "Offer update", f"Offer {o.status}: {c.name} – {o.role}",
           f"Your offer from {c.name} ({o.ctc_lpa} LPA) is now '{o.status}'.", dedupe=False)
    notify(db, "admin", None, "Placement Cell", "In-app", "Offer update", f"{s.name}: {c.name} offer {o.status}",
           f"{s.roll_no} – {o.role} – {o.ctc_lpa} LPA.", dedupe=False)


def run_automation(db, today: date | None = None) -> dict:
    today = today or date.today()
    counts = {"document_reminders": 0, "response_reminders": 0, "mentor_escalations": 0,
              "recruiter_followups": 0, "drive_announcements": 0}
    for o in db.query(Offer).filter(Offer.status == "Accepted").all():
        pending = [k for k, v in o.documents.items() if v in ("Pending", "Rejected")]
        if pending:
            s = db.get(Student, o.student_id)
            if notify(db, "student", s.id, s.name, "WhatsApp", "Documents",
                      f"Pending documents for offer #{o.id}",
                      f"Please submit: {', '.join(pending)} by {today + timedelta(days=7)} to avoid joining delays."):
                counts["document_reminders"] += 1
    for o in db.query(Offer).filter(Offer.status.in_(["Issued", "Deferred"])).all():
        s = db.get(Student, o.student_id)
        c = db.get(Company, o.company_id)
        if o.respond_by >= today:
            if notify(db, "student", s.id, s.name, "SMS", "Offer deadline", f"Respond to {c.name} offer",
                      f"Your {c.name} offer needs a response by {o.respond_by}."):
                counts["response_reminders"] += 1
        else:
            if notify(db, "recruiter", c.id, c.name, "Email", "Recruiter follow-up",
                      f"Follow-up: offer #{o.id} pending since {o.issued_on}",
                      f"{s.name} ({s.roll_no}) has not confirmed the {o.role} offer past its {o.respond_by} deadline. "
                      f"Placement cell will follow up; please confirm whether the offer remains open."):
                counts["recruiter_followups"] += 1
    placed = {o.student_id for o in db.query(Offer).filter(Offer.status.in_(["Accepted", "Joined"]))}
    for s in db.query(Student).filter(Student.at_risk.is_(True)).all():
        if s.id in placed:
            continue
        if notify(db, "mentor", None, s.mentor, "Email", "At-risk escalation", f"At-risk student: {s.name} ({s.roll_no})",
                  f"{s.name} ({s.branch}, CGPA {s.cgpa}) has a {s.placement_probability * 100:.0f}% predicted placement "
                  f"probability and readiness '{s.readiness_level}'. Please schedule a mentoring session."):
            counts["mentor_escalations"] += 1
    for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
        if db.query(Application).filter_by(drive_id=d.id).count():
            counts["drive_announcements"] += announce_drive(db, d)
    db.commit()
    counts["total_notifications"] = db.query(Notification).count()
    return counts


def seed_announcements(db) -> None:
    notify(db, "admin", None, "Placement Cell", "In-app", "System", "Placement season 2026-27 opened",
           "CampusLink initialised with 2 campuses, recruiters and drives.")
    db.commit()
