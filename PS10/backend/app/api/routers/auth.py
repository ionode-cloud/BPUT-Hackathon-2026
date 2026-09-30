import secrets
from datetime import datetime
from typing import Literal

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    HAS_GOOGLE_AUTH = True
except ImportError:
    HAS_GOOGLE_AUTH = False

from ...core.config import settings
from ...core.observability import AUTH_FAILURES, client_ip, limiter
from ...core.security import create_access_token, hash_password, password_problems, verify_password
from ...db import get_db, get_mongo_db
from ...models import Company, Student, User
from ...schemas import ChangePasswordIn, LoginIn, ProfileUpdateIn
from ..deps import audit, current_user
from ..serializers import user_out

router = APIRouter(prefix="/api/auth", tags=["auth"])

DEMO_ACCOUNTS = [
    {"role": "student", "email": "student@campuslink.edu", "password": "Student@123", "label": "Student"},
    {"role": "officer", "email": "officer@campuslink.edu", "password": "Officer@123", "label": "Placement Officer (TPO)"},
    {"role": "recruiter", "email": "recruiter@campuslink.edu", "password": "Recruiter@123", "label": "Recruiter"},
]

# Supported public registration roles
RegisterRole = Literal["student", "officer", "recruiter"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: RegisterRole


class GoogleRegisterIn(BaseModel):
    credential: str = Field(description="Google ID Token (JWT) or OAuth Access Token")
    role: RegisterRole


class GoogleLoginIn(BaseModel):
    credential: str = Field(description="Google ID Token (JWT) or OAuth Access Token")


class GoogleAuthIn(BaseModel):
    """Backwards compatibility for legacy auth endpoint"""
    email: EmailStr
    name: str = Field(default="Google User", max_length=120)
    role: RegisterRole = "student"
    google_id: str | None = None
    avatar: str | None = None
    credential: str | None = None


def sync_user_to_mongo(user: User):
    """Synchronize user account state to MongoDB Atlas users collection."""
    mongo = get_mongo_db()
    if mongo is not None:
        try:
            now = datetime.utcnow()
            mongo.users.update_one(
                {"email": user.email},
                {"$set": {
                    "name": user.name,
                    "email": user.email,
                    "role": user.role,
                    "phone": getattr(user, "phone", "") or "",
                    "authProvider": getattr(user, "auth_provider", "google") or "google",
                    "googleId": getattr(user, "google_id", None),
                    "avatar": getattr(user, "avatar", None),
                    "isActive": user.is_active,
                    "updatedAt": now,
                }, "$setOnInsert": {
                    "createdAt": user.created_at or now,
                }},
                upsert=True
            )
        except Exception:
            pass


def verify_google_credential(credential: str) -> dict:
    """
    Verifies a Google OAuth response (Google ID Token or OAuth Access Token)
    against official Google Identity Services / tokeninfo APIs.
    Returns: {email, name, google_id, avatar, email_verified}
    Raises HTTPException(401) on invalid tokens.
    """
    token = credential.strip()
    if not token:
        raise HTTPException(401, "Google authentication credential is required")

    # Optional development mock only when DEMO_MODE is specifically enabled
    if settings.ENV == "development" and getattr(settings, "DEMO_MODE", False) and token.startswith("dev_mock:"):
        parts = token.split(":")
        email = parts[1].strip().lower() if len(parts) > 1 and parts[1] else "user@gmail.com"
        name = parts[2].strip() if len(parts) > 2 and parts[2] else email.split("@")[0].capitalize()
        return {
            "email": email,
            "name": name,
            "google_id": f"mock_g_{abs(hash(email))}",
            "avatar": "https://lh3.googleusercontent.com/a/default-user",
            "email_verified": True
        }

    # 1. Check if token is an ID Token (JWT with 2 dots: header.payload.signature)
    if token.count(".") == 2:
        # A. Try official google.oauth2.id_token library
        if HAS_GOOGLE_AUTH:
            try:
                client_id = (settings.GOOGLE_CLIENT_ID or "").strip() or None
                req = google_requests.Request()
                try:
                    payload = id_token.verify_oauth2_token(token, req, audience=client_id)
                except Exception:
                    payload = id_token.verify_oauth2_token(token, req)
                if payload.get("email"):
                    return {
                        "email": payload["email"].strip().lower(),
                        "name": payload.get("name", "Google User"),
                        "google_id": payload.get("sub"),
                        "avatar": payload.get("picture"),
                        "email_verified": bool(payload.get("email_verified", True))
                    }
            except Exception:
                pass

        # B. Fallback to Google's official tokeninfo endpoint
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
                if resp.status_code == 200:
                    payload = resp.json()
                    if payload.get("email"):
                        return {
                            "email": payload["email"].strip().lower(),
                            "name": payload.get("name", "Google User"),
                            "google_id": payload.get("sub"),
                            "avatar": payload.get("picture"),
                            "email_verified": payload.get("email_verified") in (True, "true", "True")
                        }
        except Exception:
            pass

    # 2. Try as OAuth2 Access Token with Google Userinfo / Tokeninfo API
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token}"}
            )
            if resp.status_code == 200:
                payload = resp.json()
                if payload.get("email"):
                    return {
                        "email": payload["email"].strip().lower(),
                        "name": payload.get("name", "Google User"),
                        "google_id": payload.get("sub"),
                        "avatar": payload.get("picture"),
                        "email_verified": bool(payload.get("email_verified", True))
                    }

            # Fallback to Google tokeninfo for access tokens
            resp_ti = client.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={token}")
            if resp_ti.status_code == 200:
                payload = resp_ti.json()
                if payload.get("email"):
                    return {
                        "email": payload["email"].strip().lower(),
                        "name": payload.get("email", "").split("@")[0].capitalize(),
                        "google_id": payload.get("sub") or payload.get("user_id"),
                        "avatar": None,
                        "email_verified": payload.get("email_verified") in (True, "true", "True")
                    }
    except Exception:
        pass

    raise HTTPException(401, "Google authentication could not be verified. Please try again.")


def ensure_student_profile(db, user: User, name: str, email: str) -> int:
    """Ensures a Student model row exists and links it to user.student_id."""
    if user.student_id:
        existing_s = db.query(Student).filter(Student.id == user.student_id).first()
        if existing_s:
            return user.student_id

    # Check if a student record exists with this email
    existing = db.query(Student).filter(Student.email == email).first()
    if existing:
        user.student_id = existing.id
        db.commit()
        return existing.id

    # Create new student profile
    sid = (max((i for (i,) in db.query(Student.id).all()), default=0)) + 1
    batch = datetime.utcnow().year + 1
    clean_name = name.strip() or "Student"
    s = Student(
        id=sid,
        campus_id=user.campus_id or 1,
        roll_no=f"KIE{batch % 100}CSE{sid:04d}",
        name=clean_name,
        email=email,
        phone="",
        branch="CSE",
        batch=batch,
        gender="-",
        cgpa=7.8,
        tenth_pct=82.0,
        twelfth_pct=80.0,
        active_backlogs=0,
        backlog_history=0,
        skills={"python": 3, "data structures": 3, "sql": 2, "problem solving": 3},
        certifications=[],
        projects=[{"title": "CampusLink Project", "tech": ["Python", "React"], "description": "Academic project"}],
        internships=0,
        aptitude_score=72.0,
        coding_score=70.0,
        mock_interview_score=68.0,
        communication_score=75.0,
        softskill_score=74.0,
        assessment_history=[{"month": datetime.utcnow().strftime("%Y-%m"), "aptitude": 72.0, "mock": 68.0, "coding": 70.0}],
        preferred_roles=["Software Engineer"],
        mentor="Dr. P. Sharma",
        resume_text=f"{clean_name}\nB.Tech Computer Science and Engineering\nSkills: Python, SQL, React",
        imputed_fields=["aptitude_score", "coding_score"],
        registered_on=datetime.utcnow().date().isoformat(),
        readiness_score=71.5,
        readiness_level="Ready",
        placement_probability=0.74,
        at_risk=False,
    )
    db.add(s)
    db.commit()
    user.student_id = s.id
    db.commit()
    return s.id


def ensure_recruiter_company(db, user: User, name: str) -> int:
    """Ensures a recruiter user has a linked company_id."""
    if user.company_id:
        existing = db.get(Company, user.company_id)
        if existing:
            return existing.id

    cid = (max((i for (i,) in db.query(Company.id).all()), default=0)) + 1
    clean_name = name.strip() if name and name.strip() else "Corporate"
    comp_name = f"{clean_name} Partner"
    c = Company(
        id=cid,
        name=comp_name,
        sector="Technology",
        tier="Regular",
        hr_contact=user.email or f"{clean_name} HR",
        first_visit_year=datetime.utcnow().year,
    )
    db.add(c)
    db.commit()
    user.company_id = c.id
    db.commit()
    return c.id


@router.get("/google/config")
def google_config():
    """Returns Google OAuth Client configuration for frontend GIS."""
    client_id = settings.GOOGLE_CLIENT_ID.strip()
    is_valid = bool(client_id and client_id != "your_google_client_id")
    return {
        "configured": is_valid,
        "client_id": client_id if is_valid else "",
    }


@router.post("/google/register", status_code=201)
def register_with_google(body: GoogleRegisterIn, request: Request, db=Depends(get_db)):
    """
    Step 3: Automatic Registration with Google.
    - User selects role in Step 1 (student, officer, or recruiter).
    - Verified identity retrieved directly from Google.
    - Checks whether account already exists in MongoDB/SQL database.
    - Automatically creates account with role, google_id, name, email, avatar, auth_provider="google".
    - Automatically provisions student or company profile when applicable.
    - Syncs to MongoDB Atlas users collection.
    - Returns JWT session and user profile for immediate role-based dashboard redirection.
    """
    if body.role not in ("student", "officer", "recruiter"):
        raise HTTPException(400, "Registration role must be student, officer, or recruiter.")

    g_user = verify_google_credential(body.credential)
    email = g_user["email"].lower()

    # Check if user already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(400, "An account with this Google email already exists. Please sign in instead.")

    random_pw = secrets.token_urlsafe(24) + "Aa1!"
    user = User(
        email=email,
        name=g_user["name"],
        password_hash=hash_password(random_pw),
        role=body.role,
        auth_provider="google",
        google_id=g_user.get("google_id"),
        avatar=g_user.get("avatar"),
        is_active=True,
        must_change_password=False,
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if user.role == "student":
        ensure_student_profile(db, user, user.name, user.email)
    elif user.role == "recruiter":
        ensure_recruiter_company(db, user, user.name)

    sync_user_to_mongo(user)

    token, exp = create_access_token(user.id, user.role)
    audit(db, request, user, "registered_google", "user", user.id)
    return {"access_token": token, "token_type": "bearer", "expires_at": exp.isoformat(), "user": user_out(user)}


@router.post("/google/login")
def login_with_google(body: GoogleLoginIn, request: Request, db=Depends(get_db)):
    """
    Section 2: Login with Google.
    - Verifies Google authentication token with Google's official library.
    - Finds existing user in database/MongoDB using verified Google identity.
    - IF ACCOUNT DOES NOT EXIST:
      Responds with 404: "Your account is not registered. Please register first."
    - User ALWAYS retains their existing saved role (no role change during login).
    - Generates secure JWT and establishes authenticated session.
    """
    g_user = verify_google_credential(body.credential)
    email = g_user["email"].lower()

    user = db.query(User).filter(User.email == email).first()
    if not user and g_user.get("google_id"):
        user = db.query(User).filter(User.google_id == g_user["google_id"]).first()

    if not user:
        raise HTTPException(404, "Your account is not registered. Please register first.")

    if not user.is_active:
        raise HTTPException(403, "Your account is deactivated. Please contact your administrator.")

    # Link/update Google identity metadata
    if not user.google_id and g_user.get("google_id"):
        user.google_id = g_user["google_id"]
    if g_user.get("avatar"):
        user.avatar = g_user["avatar"]
    user.auth_provider = getattr(user, "auth_provider", None) or "google"
    user.last_login = datetime.utcnow()

    if user.role == "student" and not user.student_id:
        ensure_student_profile(db, user, user.name, user.email)
    elif user.role == "recruiter" and not user.company_id:
        ensure_recruiter_company(db, user, user.name)

    db.commit()
    sync_user_to_mongo(user)

    token, exp = create_access_token(user.id, user.role)
    audit(db, request, user, "login_google", "user", user.id)
    return {"access_token": token, "token_type": "bearer", "expires_at": exp.isoformat(), "user": user_out(user)}


@router.post("/google")
def auth_google_compat(body: GoogleAuthIn, request: Request, db=Depends(get_db)):
    """Backwards-compatible Google endpoint."""
    if body.credential:
        g_user = verify_google_credential(body.credential)
        email = g_user["email"]
        name = g_user["name"]
        google_id = g_user.get("google_id")
        avatar = g_user.get("avatar")
    else:
        email = body.email.strip().lower()
        name = body.name.strip() or "Google User"
        google_id = body.google_id
        avatar = body.avatar

    user = db.query(User).filter(User.email == email).first()
    is_new = False
    if not user:
        random_pw = secrets.token_urlsafe(24) + "Aa1!"
        user = User(
            email=email,
            name=name,
            password_hash=hash_password(random_pw),
            role=body.role,
            auth_provider="google",
            google_id=google_id,
            avatar=avatar,
            is_active=True,
            must_change_password=False,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new = True

    if user.role == "student" and not user.student_id:
        ensure_student_profile(db, user, user.name, user.email)
    elif user.role == "recruiter" and not user.company_id:
        ensure_recruiter_company(db, user, user.name)

    user.last_login = datetime.utcnow()
    db.commit()
    sync_user_to_mongo(user)

    token, exp = create_access_token(user.id, user.role)
    audit(db, request, user, "registered_google" if is_new else "login_google", "user", user.id)
    return {"access_token": token, "token_type": "bearer", "expires_at": exp.isoformat(), "user": user_out(user)}


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, db=Depends(get_db)):
    """Public self-registration — student, officer, or recruiter."""
    email = body.email.strip().lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(400, "An account with this e-mail already exists")
    problems = password_problems(body.password)
    if problems:
        raise HTTPException(400, "Password needs " + ", ".join(problems))
    user = User(
        email=email,
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        role=body.role,
        auth_provider="local",
        is_active=True,
        must_change_password=False,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if user.role == "student":
        ensure_student_profile(db, user, user.name, user.email)
    elif user.role == "recruiter":
        ensure_recruiter_company(db, user, user.name)

    sync_user_to_mongo(user)

    token, exp = create_access_token(user.id, user.role)
    audit(db, request, user, "registered", "user", user.id)
    return {"access_token": token, "token_type": "bearer", "expires_at": exp.isoformat(), "user": user_out(user)}



@router.post("/login")
def login(body: LoginIn, request: Request, db=Depends(get_db)):
    ip = client_ip(request)
    if not limiter.allow(f"login:{ip}", settings.LOGIN_ATTEMPTS_PER_MINUTE):
        raise HTTPException(429, "Too many login attempts – try again in a minute")
    user = db.query(User).filter(User.email == body.email.strip().lower()).first()
    if not user or not user.is_active or not verify_password(body.password, user.password_hash):
        AUTH_FAILURES.inc()
        audit(db, request, None, "login_failed", "user", email=body.email.strip().lower())
        raise HTTPException(401, "Invalid e-mail or password")
    
    if user.role == "student" and not user.student_id:
        ensure_student_profile(db, user, user.name, user.email)
    elif user.role == "recruiter" and not user.company_id:
        ensure_recruiter_company(db, user, user.name)

    user.last_login = datetime.utcnow()
    db.commit()
    token, exp = create_access_token(user.id, user.role)
    audit(db, request, user, "login", "user", user.id)
    return {"access_token": token, "token_type": "bearer", "expires_at": exp.isoformat(), "user": user_out(user)}


@router.get("/me")
def me(user: User = Depends(current_user), db=Depends(get_db)):
    if user.role == "student" and not user.student_id:
        ensure_student_profile(db, user, user.name, user.email)
    elif user.role == "recruiter" and not user.company_id:
        ensure_recruiter_company(db, user, user.name)
    return user_out(user)


@router.put("/profile")
@router.patch("/profile")
def update_profile(body: ProfileUpdateIn, request: Request, user: User = Depends(current_user), db=Depends(get_db)):
    """
    Updates the logged-in user's profile:
    - Change Name
    - Change / Edit Email (Gmail)
    - Add / Update Mobile number (phone)
    - Set / Upload Profile image (avatar)
    Synchronizes to linked Student model and MongoDB Atlas.
    """
    if body.name is not None and body.name.strip():
        user.name = body.name.strip()

    if body.phone is not None:
        user.phone = body.phone.strip()

    if body.avatar is not None:
        user.avatar = body.avatar.strip()

    if body.email is not None and body.email.strip():
        new_email = body.email.strip().lower()
        if new_email != user.email:
            existing = db.query(User).filter(User.email == new_email).first()
            if existing and existing.id != user.id:
                raise HTTPException(400, "An account with this email address already exists")
            user.email = new_email

    # If user has a linked student profile, sync matching student fields
    if user.role == "student" and user.student_id:
        student = db.query(Student).filter(Student.id == user.student_id).first()
        if student:
            if body.name is not None and body.name.strip():
                student.name = user.name
            if body.email is not None and body.email.strip():
                student.email = user.email
            if body.phone is not None:
                student.phone = user.phone

    db.commit()
    db.refresh(user)
    sync_user_to_mongo(user)
    audit(db, request, user, "profile_updated", "user", user.id)
    return user_out(user)


@router.post("/change-password")
def change_password(body: ChangePasswordIn, request: Request, user: User = Depends(current_user), db=Depends(get_db)):
    # Standard accounts or existing passwords require current password verification
    if user.auth_provider != "google" or body.current_password:
        if not verify_password(body.current_password, user.password_hash):
            raise HTTPException(400, "Current password is incorrect")

    problems = password_problems(body.new_password)
    if problems:
        raise HTTPException(400, "Password needs " + ", ".join(problems))
    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    db.commit()
    audit(db, request, user, "password_changed", "user", user.id)
    return {"ok": True}


@router.get("/demo-accounts")
def demo_accounts():
    return DEMO_ACCOUNTS if settings.DEMO_MODE else []
