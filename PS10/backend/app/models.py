"""ORM models – one table per placement-lifecycle entity."""
import datetime as dt

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class Campus(Base):
    __tablename__ = "campuses"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(80))


class Student(Base):
    __tablename__ = "students"
    id: Mapped[int] = mapped_column(primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campuses.id"))
    roll_no: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    branch: Mapped[str] = mapped_column(String(10), index=True)
    batch: Mapped[int] = mapped_column(Integer)
    gender: Mapped[str] = mapped_column(String(10))
    cgpa: Mapped[float] = mapped_column(Float)
    tenth_pct: Mapped[float] = mapped_column(Float)
    twelfth_pct: Mapped[float] = mapped_column(Float)
    active_backlogs: Mapped[int] = mapped_column(Integer, default=0)
    backlog_history: Mapped[int] = mapped_column(Integer, default=0)
    skills: Mapped[dict] = mapped_column(JSON)            # {skill: proficiency 1..5}
    certifications: Mapped[list] = mapped_column(JSON)    # [{name, skill}]
    projects: Mapped[list] = mapped_column(JSON)          # [{title, tech:[..], description}]
    internships: Mapped[int] = mapped_column(Integer, default=0)
    aptitude_score: Mapped[float] = mapped_column(Float)
    coding_score: Mapped[float] = mapped_column(Float)
    mock_interview_score: Mapped[float] = mapped_column(Float)
    communication_score: Mapped[float] = mapped_column(Float)
    softskill_score: Mapped[float] = mapped_column(Float)
    assessment_history: Mapped[list] = mapped_column(JSON)  # [{month, aptitude, mock, coding}]
    preferred_roles: Mapped[list] = mapped_column(JSON)
    resume_text: Mapped[str] = mapped_column(Text)
    mentor: Mapped[str] = mapped_column(String(80))
    imputed_fields: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)  # cold-start estimates
    registered_on: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # cached AI outputs (recomputed by /api/recompute)
    readiness_score: Mapped[float] = mapped_column(Float, default=0)
    readiness_level: Mapped[str] = mapped_column(String(30), default="")
    placement_probability: Mapped[float] = mapped_column(Float, default=0)
    at_risk: Mapped[bool] = mapped_column(Boolean, default=False)


class Company(Base):
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    sector: Mapped[str] = mapped_column(String(60))
    tier: Mapped[str] = mapped_column(String(20))  # Dream / Super / Regular
    hr_contact: Mapped[str] = mapped_column(String(120))
    first_visit_year: Mapped[int] = mapped_column(Integer)
    jobs: Mapped[list["Job"]] = relationship(back_populates="company")


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    title: Mapped[str] = mapped_column(String(120))
    role_family: Mapped[str] = mapped_column(String(60))
    job_type: Mapped[str] = mapped_column(String(20))  # FTE / Internship / Intern+PPO
    jd_text: Mapped[str] = mapped_column(Text)
    required_skills: Mapped[list] = mapped_column(JSON)
    preferred_skills: Mapped[list] = mapped_column(JSON)
    min_cgpa: Mapped[float] = mapped_column(Float)
    allowed_branches: Mapped[list] = mapped_column(JSON)
    max_active_backlogs: Mapped[int] = mapped_column(Integer, default=0)
    ctc_lpa: Mapped[float] = mapped_column(Float)
    mock_benchmark: Mapped[float] = mapped_column(Float, default=60)
    openings: Mapped[int] = mapped_column(Integer, default=10)
    company: Mapped[Company] = relationship(back_populates="jobs")


class Venue(Base):
    __tablename__ = "venues"
    id: Mapped[int] = mapped_column(primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campuses.id"))
    name: Mapped[str] = mapped_column(String(80))
    capacity: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(30))  # Seminar Hall / Computer Lab / Interview Rooms


class Drive(Base):
    __tablename__ = "drives"
    id: Mapped[int] = mapped_column(primary_key=True)
    campus_id: Mapped[int] = mapped_column(ForeignKey("campuses.id"))
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.id"))
    name: Mapped[str] = mapped_column(String(160))
    date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    slot: Mapped[str | None] = mapped_column(String(10), nullable=True)  # AM / PM
    venue_id: Mapped[int | None] = mapped_column(ForeignKey("venues.id"), nullable=True)
    window_start: Mapped[dt.date] = mapped_column(Date)
    window_end: Mapped[dt.date] = mapped_column(Date)
    panels_required: Mapped[int] = mapped_column(Integer, default=2)
    needs_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="Upcoming")  # Upcoming/Ongoing/Completed
    job: Mapped[Job] = relationship()


class Application(Base):
    """A student-drive pairing: eligibility, fit score, explanation and pipeline status."""
    __tablename__ = "applications"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    drive_id: Mapped[int] = mapped_column(ForeignKey("drives.id"), index=True)
    eligible: Mapped[bool] = mapped_column(Boolean)
    fit_score: Mapped[float] = mapped_column(Float)
    fit_level: Mapped[str] = mapped_column(String(30))
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(20))  # Eligible/Not Eligible/Shortlisted/Selected/Rejected
    explanation: Mapped[dict] = mapped_column(JSON)


class Offer(Base):
    __tablename__ = "offers"
    id: Mapped[int] = mapped_column(primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), index=True)
    drive_id: Mapped[int | None] = mapped_column(ForeignKey("drives.id"), nullable=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role: Mapped[str] = mapped_column(String(120))
    offer_type: Mapped[str] = mapped_column(String(30))  # FTE / PPO / Internship / Intern Conversion
    ctc_lpa: Mapped[float] = mapped_column(Float)
    bond_months: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20))  # Issued/Accepted/Deferred/Declined/Withdrawn/Joined
    issued_on: Mapped[dt.date] = mapped_column(Date)
    respond_by: Mapped[dt.date] = mapped_column(Date)
    joining_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    documents: Mapped[dict] = mapped_column(JSON)  # {doc: Pending/Submitted/Verified/Rejected}
    verification_status: Mapped[str] = mapped_column(String(20), default="Pending")
    ledger_hash: Mapped[str] = mapped_column(String(64), default="")
    prev_hash: Mapped[str] = mapped_column(String(64), default="")
    history: Mapped[list] = mapped_column(JSON)  # [{at, status, note}]


class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    audience: Mapped[str] = mapped_column(String(20))  # student / recruiter / mentor / admin
    recipient_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recipient_name: Mapped[str] = mapped_column(String(120))
    channel: Mapped[str] = mapped_column(String(20))  # In-app / Email / WhatsApp / SMS
    category: Mapped[str] = mapped_column(String(30))
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class HistoricalPlacement(Base):
    """Past-batch records used to train the placement-outcome / at-risk model."""
    __tablename__ = "history"
    id: Mapped[int] = mapped_column(primary_key=True)
    campus_id: Mapped[int] = mapped_column(Integer)
    batch: Mapped[int] = mapped_column(Integer, index=True)
    branch: Mapped[str] = mapped_column(String(10))
    cgpa: Mapped[float] = mapped_column(Float)
    active_backlogs: Mapped[int] = mapped_column(Integer)
    backlog_history: Mapped[int] = mapped_column(Integer)
    n_skills: Mapped[int] = mapped_column(Integer)
    skill_depth: Mapped[float] = mapped_column(Float)
    n_certs: Mapped[int] = mapped_column(Integer)
    n_projects: Mapped[int] = mapped_column(Integer)
    internships: Mapped[int] = mapped_column(Integer)
    aptitude_score: Mapped[float] = mapped_column(Float)
    coding_score: Mapped[float] = mapped_column(Float)
    mock_interview_score: Mapped[float] = mapped_column(Float)
    communication_score: Mapped[float] = mapped_column(Float)
    softskill_score: Mapped[float] = mapped_column(Float)
    top_skills: Mapped[list] = mapped_column(JSON)
    placed: Mapped[bool] = mapped_column(Boolean)
    company: Mapped[str | None] = mapped_column(String(120), nullable=True)
    ctc_lpa: Mapped[float | None] = mapped_column(Float, nullable=True)


class User(Base):
    """Login account. role ∈ admin | officer | student | recruiter | mentor.
    student_id / company_id / mentor_name scope what the account may see."""
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(20), index=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), nullable=True)
    mentor_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    campus_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    last_login: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    auth_provider: Mapped[str | None] = mapped_column(String(30), default="local", nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True, default="")


class AuditLog(Base):
    """Append-only audit trail of security-relevant and data-changing actions."""
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow, index=True)
    user_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    user_email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    role: Mapped[str | None] = mapped_column(String(20), nullable=True)
    action: Mapped[str] = mapped_column(String(60), index=True)
    entity: Mapped[str | None] = mapped_column(String(40), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(32), nullable=True)


class ResumeUpload(Base):
    """Every uploaded resume PDF (versioned). status: pending → applied | discarded."""
    __tablename__ = "resume_uploads"
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id"), nullable=True, index=True)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    filename: Mapped[str] = mapped_column(String(200))
    stored_path: Mapped[str] = mapped_column(String(400))
    size_bytes: Mapped[int] = mapped_column(Integer)
    pages: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    text: Mapped[str] = mapped_column(Text)
    parsed: Mapped[dict] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=dt.datetime.utcnow)
    applied_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
