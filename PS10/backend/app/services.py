"""Orchestration: bootstrapping and recomputation of cached AI outputs."""
from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import inspect, text

from .core.config import settings
from .core.security import generate_password, hash_password
from .db import DB_URL, Base, SessionLocal, engine
from .engines import ai_models, matching, notifications, predictor, readiness
from .models import Company, Drive, Offer, Student, User
from .seed import migrate, seed, simulate_completed_drives

BACKEND_DIR = Path(__file__).resolve().parents[1]

log = logging.getLogger("campuslink")


def recompute_readiness(db, students: list[Student] | None = None) -> int:
    students = students or db.query(Student).all()
    if not students:
        return 0
    placed = {o.student_id for o in db.query(Offer).filter(Offer.status.in_(["Accepted", "Joined"]))}
    for s, r in zip(students, readiness.score_students(db, students)):
        s.readiness_score = r["score"]
        s.readiness_level = r["level"]
        s.placement_probability = round(r["probability"], 4)
        s.at_risk = r["probability"] < predictor.AT_RISK_THRESHOLD and s.id not in placed
    db.commit()
    return len(students)


# ------------------------------------------------------------------ database schema (Alembic)
def _alembic_cfg():
    from alembic.config import Config
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    cfg.set_main_option("sqlalchemy.url", DB_URL.replace("%", "%%"))
    return cfg


def init_db() -> None:
    """Bring the schema to the latest Alembic revision. Databases created before
    migrations existed are patched in place and stamped."""
    from alembic import command
    tables = inspect(engine).get_table_names()
    if tables and "alembic_version" not in tables:
        migrate()
        Base.metadata.create_all(engine)
        command.stamp(_alembic_cfg(), "head")
    else:
        command.upgrade(_alembic_cfg(), "head")


def fix_sequences() -> None:
    """PostgreSQL: move id sequences past explicitly-seeded ids."""
    if engine.dialect.name != "postgresql":
        return
    with engine.begin() as con:
        for t in Base.metadata.sorted_tables:
            if "id" in t.c and t.c.id.type.python_type is int:
                con.execute(text(f"SELECT setval(pg_get_serial_sequence('{t.name}', 'id'), "
                                 f"COALESCE((SELECT MAX(id) FROM {t.name}), 0) + 1, false)"))


# ------------------------------------------------------------------ accounts
DEMO_USERS = [
    ("admin@campuslink.edu", "Admin@123", "System Administrator", "admin", {}),
    ("officer@campuslink.edu", "Officer@123", "Training & Placement Officer", "officer", {}),
    ("student@campuslink.edu", "Student@123", None, "student", {"student_id": 189}),
    ("recruiter@nimbus.example.com", "Recruiter@123", "Nimbus Campus Hiring", "recruiter", {"company_id": 1}),
    ("mentor@campuslink.edu", "Mentor@123", "Dr. S. Mohapatra", "mentor", {"mentor_name": "Dr. S. Mohapatra"}),
]


def seed_users(db) -> None:
    if db.query(User).count():
        return
    if settings.SEED_DEMO_DATA:
        for email, pw, name, role, extra in DEMO_USERS:
            if role == "student":
                st = db.get(Student, extra["student_id"])
                if not st:
                    continue
                name = st.name
            if role == "recruiter" and not db.get(Company, extra["company_id"]):
                continue
            db.add(User(email=email, password_hash=hash_password(pw), name=name, role=role, **extra))
    else:
        db.add(User(email=settings.ADMIN_EMAIL.lower(), password_hash=hash_password(settings.ADMIN_PASSWORD),
                    name="Administrator", role="admin", must_change_password=True))
    db.commit()


def create_student_login(db, s: Student) -> dict | None:
    """Create a student portal account with a one-time temporary password."""
    email = (s.email or "").lower()
    if not email or db.query(User).filter(User.email == email).first():
        return None
    pw = generate_password()
    db.add(User(email=email, name=s.name, role="student", student_id=s.id, campus_id=s.campus_id,
                password_hash=hash_password(pw), must_change_password=True))
    db.commit()
    return {"email": email, "temporary_password": pw}


def bootstrap(force: bool = False) -> None:
    init_db()
    if settings.SEED_DEMO_DATA:
        seed(force=force)
        fix_sequences()
    if force:
        ai_models.invalidate_vectors()
    db = SessionLocal()
    try:
        predictor.train(db, force=force)          # PlacementNet (PyTorch) – cached on disk
        ai_models.bootstrap_models(db)            # Skill2Vec + JD role classifier (PyTorch)
        needs_init = settings.SEED_DEMO_DATA and db.query(Offer).count() == 0
        if needs_init:
            log.info("Initial scoring of students ...")
            recompute_readiness(db)
    finally:
        db.close()
    if needs_init:
        simulate_completed_drives()               # scored with the expert-prior FitNet
    db = SessionLocal()
    try:
        ai_models.train_fit(db)                   # FitNet learns from recruiter decisions
        if needs_init:
            for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
                matching.run_matching(db, d.id, auto_shortlist=True)
            recompute_readiness(db)
            notifications.run_automation(db)
        seed_users(db)
    finally:
        db.close()


def retrain_all() -> dict:
    """Retrain every PyTorch model from the current database and re-score."""
    db = SessionLocal()
    try:
        predictor.train(db, force=True)
        ai_models.skill2vec(db, force=True)
        fit_log = ai_models.train_fit(db)
        n = recompute_readiness(db)
        for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
            matching.run_matching(db, d.id)
        return {"students_rescored": n, "fitnet_pairs": fit_log["pairs"]}
    finally:
        db.close()
