"""Password hashing (PBKDF2-HMAC-SHA256, OWASP-recommended iterations) and JWT access tokens."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt

from .config import settings

ALGO = "HS256"
ITERATIONS = 600_000
ROLES = ("admin", "officer", "student", "recruiter", "mentor")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt, digest = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), base64.b64decode(salt), int(iters))
        return hmac.compare_digest(dk, base64.b64decode(digest))
    except Exception:
        return False


def password_problems(password: str) -> list[str]:
    p = []
    if len(password) < 8:
        p.append("at least 8 characters")
    if not any(c.isupper() for c in password):
        p.append("an upper-case letter")
    if not any(c.isdigit() for c in password):
        p.append("a digit")
    return p


def generate_password() -> str:
    return secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ") + secrets.token_urlsafe(7) + str(secrets.randbelow(10))


def create_access_token(user_id: int, role: str) -> tuple[str, datetime]:
    exp = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": exp, "iat": datetime.now(timezone.utc), "jti": uuid.uuid4().hex}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGO), exp


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO])
