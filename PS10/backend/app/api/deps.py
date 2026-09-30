"""Authentication, role-based authorisation, data scoping and audit helpers."""
from __future__ import annotations

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from ..core.observability import client_ip
from ..core.security import decode_token
from ..db import get_db
from ..models import AuditLog, Drive, Offer, Student, User

bearer = HTTPBearer(auto_error=False)
STAFF = ("admin", "officer")


def current_user(request: Request, creds: HTTPAuthorizationCredentials | None = Depends(bearer),
                 db=Depends(get_db)) -> User:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_token(creds.credentials)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token", headers={"WWW-Authenticate": "Bearer"}) from None
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account disabled or not found")
    request.state.user_email = user.email
    return user


def require(*roles: str):
    """Dependency factory: allow only the given roles."""
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role: {', '.join(roles)}")
        return user
    return dep


staff_only = require(*STAFF)
admin_only = require("admin")
any_user = current_user


# ------------------------------------------------------------------ data scoping
def can_view_student(user: User, s: Student) -> bool:
    if user.role in STAFF or user.role == "recruiter":
        return True
    if user.role == "student":
        return user.student_id == s.id
    if user.role == "mentor":
        return bool(user.mentor_name) and s.mentor == user.mentor_name
    return False


def get_student_for(user: User, sid: int, db) -> Student:
    s = db.get(Student, sid)
    if not s:
        raise HTTPException(404, "Student not found")
    if not can_view_student(user, s):
        raise HTTPException(403, "You do not have access to this student")
    return s


def can_view_drive(user: User, d: Drive) -> bool:
    if user.role in STAFF:
        return True
    if user.role == "recruiter":
        return d.job.company_id == user.company_id
    return False


def get_drive_for(user: User, did: int, db) -> Drive:
    d = db.get(Drive, did)
    if not d:
        raise HTTPException(404, "Drive not found")
    if not can_view_drive(user, d):
        raise HTTPException(403, "You do not have access to this drive")
    return d


def can_view_offer(user: User, o: Offer) -> bool:
    return (user.role in STAFF or (user.role == "student" and o.student_id == user.student_id)
            or (user.role == "recruiter" and o.company_id == user.company_id))


# ------------------------------------------------------------------ audit
def audit(db, request: Request | None, user: User | None, action: str, entity: str | None = None,
          entity_id=None, **detail) -> None:
    db.add(AuditLog(user_id=user.id if user else None, user_email=user.email if user else detail.pop("email", None),
                    role=user.role if user else None, action=action, entity=entity,
                    entity_id=str(entity_id) if entity_id is not None else None, detail=detail or None,
                    ip=client_ip(request) if request else None,
                    request_id=getattr(request.state, "request_id", None) if request else None))
    db.commit()
