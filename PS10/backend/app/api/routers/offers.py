from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Request

from ...db import get_db
from ...engines import notifications, offers
from ...models import Company, Offer, Student, User
from ...schemas import DocIn, TransitionIn, UploadLetterIn
from ...services import recompute_readiness
from ..deps import STAFF, audit, can_view_offer, current_user, staff_only

router = APIRouter(prefix="/api", tags=["offers"])
STUDENT_TRANSITIONS = {"Accepted", "Declined", "Deferred"}
RECRUITER_TRANSITIONS = {"Withdrawn", "Joined"}


def _offer_for(user: User, oid: int, db) -> Offer:
    o = db.get(Offer, oid)
    if not o:
        raise HTTPException(404, "Offer not found")
    if not can_view_offer(user, o):
        raise HTTPException(403, "You do not have access to this offer")
    return o


@router.get("/offers")
def list_offers(status: str = "", user: User = Depends(current_user), db=Depends(get_db)):
    q = db.query(Offer)
    if user.role == "student":
        q = q.filter(Offer.student_id == user.student_id)
    elif user.role == "recruiter":
        q = q.filter(Offer.company_id == user.company_id)
    elif user.role not in STAFF:
        raise HTTPException(403, "Not allowed")
    if status:
        q = q.filter(Offer.status == status)
    return [offers.serialize(db, o) for o in q.order_by(Offer.issued_on.desc(), Offer.id.desc()).all()]


@router.post("/offers/{oid}/transition")
def offer_transition(oid: int, body: TransitionIn, request: Request, user: User = Depends(current_user), db=Depends(get_db)):
    o = _offer_for(user, oid, db)
    if user.role == "student" and body.status not in STUDENT_TRANSITIONS:
        raise HTTPException(403, "Students may only accept, decline or defer their offers")
    if user.role == "recruiter" and body.status not in RECRUITER_TRANSITIONS:
        raise HTTPException(403, "Recruiters may only withdraw an offer or confirm joining")
    try:
        offers.transition(db, o, body.status, body.note or f"Updated by {user.role}")
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.commit()
    recompute_readiness(db, [db.get(Student, o.student_id)])
    audit(db, request, user, "offer_transition", "offer", oid, status=body.status)
    return offers.serialize(db, o)


@router.post("/offers/{oid}/documents")
def offer_document(oid: int, body: DocIn, request: Request, user: User = Depends(current_user), db=Depends(get_db)):
    o = _offer_for(user, oid, db)
    if user.role == "student" and body.status != "Submitted":
        raise HTTPException(403, "Students can only mark documents as submitted; verification is done by the placement cell")
    if user.role == "recruiter":
        raise HTTPException(403, "Documents are verified by the placement cell")
    try:
        offers.update_document(o, body.document, body.status)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    db.commit()
    audit(db, request, user, "document_status", "offer", oid, document=body.document, status=body.status)
    return offers.serialize(db, o)


@router.get("/offers/{oid}/verify")
def verify_offer(oid: int, user: User = Depends(current_user), db=Depends(get_db)):
    _offer_for(user, oid, db)
    return offers.verify(db, oid)


@router.get("/ledger/verify")
def verify_ledger(user: User = Depends(staff_only), db=Depends(get_db)):
    return offers.verify_chain(db)


@router.post("/offers/{oid}/upload-letter")
def upload_offer_letter(oid: int, body: UploadLetterIn, request: Request,
                        user: User = Depends(current_user), db=Depends(get_db)):
    o = _offer_for(user, oid, db)
    if user.role not in (*STAFF, "recruiter"):
        raise HTTPException(403, "Only recruiters and placement staff can upload offer letters")
    s = db.get(Student, o.student_id)
    c = db.get(Company, o.company_id)

    doc_status = "Verified" if user.role in STAFF else "Submitted"
    docs = dict(o.documents or {})
    docs["Offer Letter"] = doc_status
    o.documents = docs

    hist = list(o.history or [])
    note = f"Offer letter '{body.filename}' uploaded by {user.role} ({user.name})"
    if body.notes:
        note += f": {body.notes}"
    hist.append({"at": date.today().isoformat(), "status": o.status, "note": note})
    o.history = hist

    if s:
        notifications.notify(db, "student", s.id, s.name, "Email", "Offer Letter",
                             f"Offer Letter Uploaded: {c.name}",
                             f"Hello {s.name}, your official offer letter for {o.role} at {c.name} has been uploaded. "
                             f"Please review the document in your student portal.")

    if user.role == "recruiter":
        notifications.notify(db, "officer", None, "Placement Officer (TPO)", "In-app", "Offer Letter",
                             f"Offer Letter Uploaded: {s.name} ({c.name})",
                             f"Recruiter from {c.name} uploaded the official offer letter for {s.name} ({s.roll_no}).")

    db.commit()
    audit(db, request, user, "upload_offer_letter", "offer", oid, filename=body.filename)
    return offers.serialize(db, o)
