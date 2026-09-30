"""Offer, documentation & joining-status tracking with a tamper-evident ledger.

Every offer's immutable terms (student, company, role, type, CTC, issue date)
are hashed with SHA-256 and chained to the previous offer's hash – a
lightweight, blockchain-style ledger. Anyone holding an offer ID can verify
that its terms were not altered after issue.
"""
from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, timedelta

from ..models import Company, Drive, Offer, Student

TRANSITIONS = {
    "Issued": ["Accepted", "Declined", "Deferred", "Withdrawn"],
    "Deferred": ["Accepted", "Declined", "Withdrawn"],
    "Accepted": ["Joined", "Withdrawn"],
    "Declined": [], "Withdrawn": [], "Joined": [],
}
BASE_DOCS = ["Signed Offer Letter", "Academic Transcripts", "ID Proof", "Medical Certificate",
             "Background Verification Form"]


def _terms(o: Offer) -> dict:
    return {"student_id": o.student_id, "company_id": o.company_id, "role": o.role, "offer_type": o.offer_type,
            "ctc_lpa": o.ctc_lpa, "bond_months": o.bond_months, "issued_on": o.issued_on.isoformat()}


def compute_hash(o: Offer) -> str:
    payload = o.prev_hash + json.dumps(_terms(o), sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def create_offer(db, stu: Student, drive: Drive | None, offer_type: str, ctc: float, issued: date,
                 company_id: int | None = None, role: str | None = None, bond_months: int | None = None) -> Offer:
    job = drive.job if drive else None
    cid = company_id or job.company_id
    bond = bond_months if bond_months is not None else (12 if ctc < 5 else 0)
    docs = dict.fromkeys(BASE_DOCS, "Pending")
    if bond:
        docs["Service Bond Agreement"] = "Pending"
    last = db.query(Offer).order_by(Offer.id.desc()).first()
    o = Offer(student_id=stu.id, drive_id=drive.id if drive else None, company_id=cid,
              role=role or (job.title if job else "Graduate Engineer"), offer_type=offer_type, ctc_lpa=ctc,
              bond_months=bond, status="Issued", issued_on=issued, respond_by=issued + timedelta(days=10),
              joining_date=date(2027, 7, 1) if offer_type != "Internship" else date(2027, 1, 5),
              documents=docs, verification_status="Pending", prev_hash=last.ledger_hash if last else "0" * 64,
              history=[{"at": issued.isoformat(), "status": "Issued", "note": "Offer letter issued"}])
    o.ledger_hash = compute_hash(o)
    db.add(o)
    db.flush()
    return o


def transition(db, o: Offer, new_status: str, note: str = "", notify: bool = True) -> Offer:
    if new_status not in TRANSITIONS[o.status]:
        raise ValueError(f"Cannot move offer from {o.status} to {new_status}. Allowed: {TRANSITIONS[o.status]}")
    o.status = new_status
    o.history = o.history + [{"at": datetime.utcnow().date().isoformat(), "status": new_status, "note": note}]
    if notify:
        from . import notifications
        notifications.notify_offer(db, o)
    return o


def update_document(o: Offer, doc: str, status: str) -> Offer:
    if doc not in o.documents:
        raise ValueError(f"Unknown document '{doc}'")
    docs = dict(o.documents)
    docs[doc] = status
    o.documents = docs
    vals = set(docs.values())
    o.verification_status = "Verified" if vals == {"Verified"} else "Issue" if "Rejected" in vals else "Pending"
    return o


def verify(db, offer_id: int) -> dict:
    o = db.get(Offer, offer_id)
    if not o:
        return {"valid": False, "reason": "Offer not found"}
    recomputed = compute_hash(o)
    prev = db.query(Offer).filter(Offer.id < o.id).order_by(Offer.id.desc()).first()
    chain_ok = (prev.ledger_hash if prev else "0" * 64) == o.prev_hash
    return {"offer_id": o.id, "valid": recomputed == o.ledger_hash and chain_ok, "hash": o.ledger_hash,
            "recomputed": recomputed, "chain_link_ok": chain_ok, "terms": _terms(o)}


def verify_chain(db) -> dict:
    prev = "0" * 64
    bad = []
    offers = db.query(Offer).order_by(Offer.id).all()
    for o in offers:
        if o.prev_hash != prev or compute_hash(o) != o.ledger_hash:
            bad.append(o.id)
        prev = o.ledger_hash
    return {"offers": len(offers), "valid": not bad, "tampered": bad}


def serialize(db, o: Offer) -> dict:
    s = db.get(Student, o.student_id)
    c = db.get(Company, o.company_id)
    pending_docs = [k for k, v in o.documents.items() if v in ("Pending", "Rejected")]
    return {"id": o.id, "student_id": s.id, "student": s.name, "roll_no": s.roll_no, "branch": s.branch,
            "company": c.name, "tier": c.tier, "role": o.role, "offer_type": o.offer_type, "ctc_lpa": o.ctc_lpa,
            "bond_months": o.bond_months, "status": o.status, "issued_on": o.issued_on.isoformat(),
            "respond_by": o.respond_by.isoformat(),
            "joining_date": o.joining_date.isoformat() if o.joining_date else None, "documents": o.documents,
            "pending_docs": pending_docs, "verification_status": o.verification_status,
            "ledger_hash": o.ledger_hash, "history": o.history, "allowed": TRANSITIONS[o.status]}
