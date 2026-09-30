"""Pydantic request schemas (validated input for every write endpoint)."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

Role = Literal["admin", "officer", "student", "recruiter", "mentor"]


class LoginIn(BaseModel):
    email: str = Field(max_length=160)
    password: str = Field(max_length=128)


class ChangePasswordIn(BaseModel):
    current_password: str = ""
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdateIn(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=30)
    avatar: str | None = None



class UserIn(BaseModel):
    email: EmailStr
    name: str = Field(min_length=2, max_length=120)
    role: Role
    password: str | None = Field(default=None, min_length=8, max_length=128)
    student_id: int | None = None
    company_id: int | None = None
    mentor_name: str | None = None
    campus_id: int | None = None


class UserPatch(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    reset_password: bool = False


class StudentIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    branch: str
    cgpa: float = Field(ge=0, le=10)
    campus_id: int = 1
    batch: int = Field(2027, ge=2000, le=2100)
    email: str | None = None
    phone: str | None = None
    gender: str | None = None
    tenth_pct: float | None = Field(None, ge=0, le=100)
    twelfth_pct: float | None = Field(None, ge=0, le=100)
    active_backlogs: int = Field(0, ge=0, le=30)
    backlog_history: int | None = Field(None, ge=0, le=60)
    skills: dict[str, int] | None = None
    projects: list[dict] | None = None
    certifications: list[str] | None = None
    internships: int = Field(0, ge=0, le=10)
    aptitude: float | None = Field(None, ge=0, le=100)
    coding: float | None = Field(None, ge=0, le=100)
    mock_interview: float | None = Field(None, ge=0, le=100)
    communication: float | None = Field(None, ge=0, le=100)
    softskill: float | None = Field(None, ge=0, le=100)
    preferred_role: str | None = None
    resume_text: str | None = Field(None, max_length=20000)
    resume_upload_id: str | None = Field(None, max_length=32)
    create_login: bool = True


class TextIn(BaseModel):
    text: str = Field(max_length=20000)


class CsvIn(BaseModel):
    csv: str = Field(max_length=5_000_000)


class AssessmentIn(BaseModel):
    aptitude: float | None = Field(None, ge=0, le=100)
    coding: float | None = Field(None, ge=0, le=100)
    mock_interview: float | None = Field(None, ge=0, le=100)
    communication: float | None = Field(None, ge=0, le=100)
    softskill: float | None = Field(None, ge=0, le=100)
    skills: dict[str, int] | None = None


class JobIn(BaseModel):
    company_id: int | None = None
    title: str = Field(min_length=2, max_length=120)
    jd_text: str = Field(min_length=20, max_length=20000)
    openings: int = Field(10, ge=1, le=1000)
    mock_benchmark: float = Field(60, ge=0, le=100)
    campus_id: int = 1
    window_start: date
    window_end: date
    panels_required: int = Field(2, ge=1, le=20)
    needs_lab: bool = True

    @field_validator("window_end")
    @classmethod
    def _order(cls, v, info):
        if "window_start" in info.data and v < info.data["window_start"]:
            raise ValueError("window_end must be on or after window_start")
        return v


class AppStatusIn(BaseModel):
    status: Literal["Applied", "Eligible", "Shortlisted", "Waitlisted", "Interview", "Offer", "Selected", "Accepted", "Joined", "Rejected"]


class EscalateIn(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    urgency: Literal["low", "medium", "high", "critical"] = "high"
    category: str = "TPO Assistance"


class BroadcastIn(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    message: str = Field(min_length=3, max_length=2000)
    branch: str = ""
    batch: int | None = None
    min_cgpa: float = 0.0
    channel: Literal["In-app", "Email", "SMS", "WhatsApp"] = "In-app"


class UploadLetterIn(BaseModel):
    filename: str = Field("offer_letter.pdf", max_length=200)
    letter_url: str = Field("", max_length=500)
    notes: str = Field("", max_length=500)


class SlotIn(BaseModel):
    date: date
    slot: Literal["AM", "PM"]
    venue_id: int


class TransitionIn(BaseModel):
    status: str
    note: str = Field("", max_length=500)


class DocIn(BaseModel):
    document: str
    status: Literal["Pending", "Submitted", "Verified", "Rejected"]


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    student_id: int | None = None


class CompanyIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    sector: str = "IT Services"
    tier: Literal["Dream", "Super", "Regular"] = "Regular"
    hr_contact: str = ""
    first_visit_year: int = 2026


class VenueIn(BaseModel):
    campus_id: int
    name: str = Field(min_length=2, max_length=80)
    capacity: int = Field(ge=1, le=10000)
    kind: Literal["Seminar Hall", "Computer Lab", "Interview Rooms"]


class CampusIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=80)
