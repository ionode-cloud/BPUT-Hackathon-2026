"""Synthetic, reproducible placement dataset generator.

Generates: 2 campuses, ~650 current-batch students, 4 past batches of
historical placement outcomes (~2,000 records), 16 recruiters / 20 JDs,
venues, 14 drives (4 completed with offers, 10 upcoming - some with
deliberately injected scheduling conflicts).

All people and company names are fictional. A hidden latent "true
ability" is generated for each student and saved to data/ground_truth.json
so the matching engine can be evaluated against a recruiter-selection
ground truth it never sees.
"""
from __future__ import annotations

import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

import numpy as np

from .db import Base, SessionLocal, engine
from .engines.skills import ROLE_PROFILES, SKILL_CATEGORY
from .models import Application, Campus, Company, Drive, HistoricalPlacement, Job, Offer, Student, Venue

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
TODAY = date(2026, 9, 26)
CURRENT_BATCH = 2027

FIRST = ["Aarav", "Ananya", "Rohan", "Sneha", "Aditya", "Priya", "Sai", "Ishita", "Arjun", "Pooja",
         "Rahul", "Divya", "Vikram", "Neha", "Karthik", "Meera", "Siddharth", "Riya", "Abhishek",
         "Swati", "Manas", "Subhashree", "Debasish", "Lipsa", "Soumya", "Anwesha", "Satyajit",
         "Pragyan", "Tushar", "Sonali", "Nikhil", "Kavya", "Harsh", "Tanvi", "Amit", "Shreya",
         "Bibhuti", "Smruti", "Chinmay", "Jyoti", "Ashutosh", "Sasmita", "Prateek", "Barsha",
         "Omkar", "Nandini", "Yash", "Trisha", "Gaurav", "Madhusmita"]
LAST = ["Mohanty", "Das", "Sahoo", "Patnaik", "Mishra", "Nayak", "Panda", "Behera", "Rath",
        "Swain", "Sharma", "Verma", "Reddy", "Iyer", "Nair", "Gupta", "Singh", "Kumar", "Pradhan",
        "Jena", "Tripathy", "Rout", "Dash", "Biswal", "Mahapatra", "Parida", "Samal", "Khan"]
MENTORS = ["Dr. S. Mohapatra", "Prof. R. Nayak", "Dr. A. Pattanaik", "Prof. M. Rao",
           "Dr. K. Sahu", "Prof. P. Dash"]

BRANCH_MIX = {"CSE": .28, "IT": .14, "ECE": .2, "EEE": .13, "MECH": .15, "CIVIL": .1}
BRANCH_EFFECT = {"CSE": .6, "IT": .5, "ECE": .2, "EEE": -.2, "MECH": -.5, "CIVIL": -.7}
BRANCH_TRACKS = {
    "CSE": ["Software Engineer", "Full Stack Developer", "Data Scientist", "Cloud / DevOps Engineer", "QA / Test Engineer"],
    "IT": ["Software Engineer", "Full Stack Developer", "Business / Data Analyst", "Cloud / DevOps Engineer", "QA / Test Engineer"],
    "ECE": ["Embedded Systems Engineer", "VLSI Design Engineer", "Software Engineer", "Data Scientist"],
    "EEE": ["Electrical Engineer", "Embedded Systems Engineer", "Business / Data Analyst"],
    "MECH": ["Mechanical Design Engineer", "Business / Data Analyst"],
    "CIVIL": ["Civil / Site Engineer", "Business / Data Analyst"],
}

COMPANIES = [  # fictional recruiters: name, sector, tier, first visit
    ("Nimbus Cloud Systems", "Cloud & SaaS", "Dream", 2021),
    ("Kalinga Infotech", "IT Services", "Regular", 2018),
    ("Quantaleap Analytics", "Data & AI", "Super", 2022),
    ("Orbitron Semiconductors", "Semiconductors", "Dream", 2023),
    ("Brightpath Consulting", "Consulting", "Super", 2020),
    ("Voltedge Power", "Power & Energy", "Regular", 2019),
    ("Mechanica Engineering", "Manufacturing", "Regular", 2017),
    ("Stackforge Labs", "Product / SaaS", "Super", 2022),
    ("Terrabuild Infra", "Construction", "Regular", 2018),
    ("Sentinel CyberWorks", "Cybersecurity", "Super", 2024),
    ("Pixelweave Digital", "IT Services", "Regular", 2019),
    ("Embedix Systems", "Embedded / IoT", "Super", 2021),
    ("FinArc Technologies", "FinTech", "Dream", 2024),
    ("Greenwatt Mobility", "EV & Mobility", "Super", 2023),
    ("QualiTest Global", "Software Testing", "Regular", 2020),
    ("Deltabyte Solutions", "IT Services", "Regular", 2016),
]

# (company idx, title, role family, type, min_cgpa, branches, backlogs, ctc, benchmark, openings, preferred)
JOBS = [
    (0, "Cloud Engineer", "Cloud / DevOps Engineer", "FTE", 7.5, ["CSE", "IT", "ECE"], 0, 18.0, 70, 6, ["gcp", "python"]),
    (1, "Graduate Engineer Trainee", "Software Engineer", "FTE", 6.0, ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"], 1, 4.5, 50, 60, ["python"]),
    (2, "Data Scientist - I", "Data Scientist", "FTE", 7.0, ["CSE", "IT", "ECE", "EEE"], 0, 12.0, 65, 8, ["generative ai", "power bi"]),
    (3, "Design Verification Engineer", "VLSI Design Engineer", "FTE", 7.5, ["ECE", "EEE"], 0, 16.0, 68, 5, ["python"]),
    (4, "Business Analyst", "Business / Data Analyst", "FTE", 6.5, ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"], 0, 9.0, 65, 12, ["python"]),
    (5, "Graduate Engineer - Electrical", "Electrical Engineer", "FTE", 6.5, ["EEE"], 0, 6.0, 55, 10, ["autocad"]),
    (6, "Design Engineer", "Mechanical Design Engineer", "FTE", 6.5, ["MECH"], 0, 5.5, 55, 10, ["manufacturing"]),
    (7, "Full Stack Developer", "Full Stack Developer", "Intern+PPO", 7.0, ["CSE", "IT"], 0, 14.0, 65, 8, ["typescript", "docker"]),
    (8, "Site Engineer", "Civil / Site Engineer", "FTE", 6.0, ["CIVIL"], 1, 5.0, 50, 10, ["project management"]),
    (9, "Security Analyst", "Software Engineer", "FTE", 7.0, ["CSE", "IT"], 0, 10.0, 62, 5, ["cyber security", "linux"]),
    (10, "Associate Software Engineer", "Software Engineer", "FTE", 6.0, ["CSE", "IT", "ECE", "EEE"], 1, 4.0, 50, 40, ["html/css"]),
    (11, "Firmware Engineer", "Embedded Systems Engineer", "FTE", 7.0, ["ECE", "EEE", "CSE"], 0, 9.5, 62, 6, ["iot", "python"]),
    (12, "Software Development Engineer", "Software Engineer", "FTE", 8.0, ["CSE", "IT"], 0, 24.0, 75, 4, ["aws", "go"]),
    (13, "Battery Systems Engineer", "Embedded Systems Engineer", "Intern+PPO", 7.0, ["EEE", "ECE", "MECH"], 0, 8.0, 60, 6, ["matlab"]),
    (14, "QA Engineer", "QA / Test Engineer", "FTE", 6.0, ["CSE", "IT", "ECE"], 1, 4.8, 50, 20, ["sql"]),
    (15, "Systems Engineer", "Software Engineer", "FTE", 6.0, ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"], 1, 3.6, 45, 80, ["sql"]),
    (2, "ML Engineer Intern", "Data Scientist", "Internship", 7.5, ["CSE", "IT"], 0, 6.0, 65, 6, ["pytorch", "nlp"]),
    (0, "Site Reliability Engineer", "Cloud / DevOps Engineer", "FTE", 7.0, ["CSE", "IT"], 0, 16.0, 68, 4, ["python"]),
]

CURRICULUM = {
    "CSE": ["data structures", "algorithms", "oops", "dbms", "operating systems", "computer networks", "c", "java", "sql", "git"],
    "IT": ["data structures", "algorithms", "oops", "dbms", "computer networks", "java", "sql", "html/css", "git"],
    "ECE": ["c", "microcontrollers", "matlab", "verilog", "embedded c", "data structures"],
    "EEE": ["matlab", "power systems", "c", "plc", "microcontrollers"],
    "MECH": ["autocad", "thermodynamics", "manufacturing", "solidworks", "excel"],
    "CIVIL": ["autocad", "staad pro", "excel", "project management"],
}

CERTS = {"aws": "AWS Cloud Practitioner", "azure": "Azure Fundamentals AZ-900", "python": "PCEP Python",
         "machine learning": "Google ML Crash Course", "java": "Oracle Java SE Associate",
         "sql": "HackerRank SQL (Advanced)", "data structures": "NPTEL DSA", "power bi": "PL-300 Power BI",
         "embedded c": "NPTEL Embedded Systems", "verilog": "NPTEL Digital VLSI", "solidworks": "CSWA",
         "autocad": "Autodesk AutoCAD Certified User", "react": "Meta Front-End Developer",
         "docker": "Docker Foundations", "linux": "LFCA", "deep learning": "DeepLearning.AI DL Spec.",
         "plc": "Siemens PLC Basics", "staad pro": "STAAD Pro Certified", "selenium": "Selenium WebDriver"}

PROJECT_TEMPLATES = {
    "Software Engineer": ["Library management system", "Online judge clone", "Distributed key-value store"],
    "Full Stack Developer": ["E-commerce web app", "Campus event portal", "Real-time chat application"],
    "Data Scientist": ["Crop yield prediction", "Sentiment analysis of tweets", "Customer churn model"],
    "Cloud / DevOps Engineer": ["CI/CD pipeline for microservices", "Auto-scaling web cluster", "Infra as code on AWS"],
    "Embedded Systems Engineer": ["Smart energy meter", "IoT air-quality node", "BLDC motor controller"],
    "VLSI Design Engineer": ["32-bit RISC processor in Verilog", "UART IP verification", "Low-power SRAM cell"],
    "Business / Data Analyst": ["Sales dashboard in Power BI", "Hospital KPI analysis", "Retail basket analysis"],
    "Mechanical Design Engineer": ["Go-kart chassis design", "Heat exchanger CFD study", "Gearbox FEA analysis"],
    "Electrical Engineer": ["Solar MPPT charge controller", "Substation load-flow study", "PLC bottling line"],
    "Civil / Site Engineer": ["G+4 residential structural design", "Rainwater harvesting plan", "Road pavement design"],
    "QA / Test Engineer": ["Selenium test suite for web store", "API test automation", "Bug-tracking dashboard"],
}


def _clip(x, lo, hi):
    return float(max(lo, min(hi, x)))


def _gen_profile(rng: random.Random, nrng: np.random.Generator, branch: str) -> dict:
    ability, effort, comm = nrng.normal(size=3)
    track = rng.choice(BRANCH_TRACKS[branch])
    cs_bonus = 8 if branch in ("CSE", "IT") else 0
    cgpa = round(_clip(7.2 + .75 * ability + .3 * effort + nrng.normal(0, .4), 5.0, 9.9), 2)
    p_backlog = 1 / (1 + math.exp(2.2 + 1.4 * ability + .5 * effort))
    backlog_history = int(nrng.binomial(4, p_backlog))
    active = int(nrng.binomial(backlog_history, .35)) if backlog_history else 0
    prof = ROLE_PROFILES[track]["skills"]
    n_core = int(_clip(round(3 + 1.5 * effort + .8 * ability + nrng.normal(0, 1)), 2, len(prof)))
    ranked = sorted(prof, key=lambda s: -prof[s] + nrng.normal(0, .08))
    skills = {}
    for s in ranked[:n_core]:
        skills[s] = int(_clip(round(2.8 + .8 * ability + .6 * effort + nrng.normal(0, .8)), 1, 5))
    for s in CURRICULUM[branch]:  # skills taught in the branch curriculum
        if rng.random() < .75:
            skills.setdefault(s, int(_clip(round(1.8 + .6 * ability + .3 * effort + nrng.normal(0, .7)), 1, 4)))
    if rng.random() < .35:  # a secondary interest track
        other = rng.choice([t for t in BRANCH_TRACKS[branch] if t != track] or [track])
        for s2 in rng.sample(list(ROLE_PROFILES[other]["skills"]), k=2):
            skills.setdefault(s2, int(_clip(round(2 + .5 * effort + nrng.normal(0, .8)), 1, 4)))
    for s in rng.sample(list(SKILL_CATEGORY), k=rng.randint(0, 2)):
        skills.setdefault(s, rng.randint(1, 3))
    if branch in ("CSE", "IT", "ECE"):
        skills.setdefault("python", rng.randint(1, 4))
    certs = []
    for s in sorted(skills, key=lambda k: -skills[k])[: int(_clip(round(1 + effort + nrng.normal(0, .8)), 0, 4))]:
        if s in CERTS:
            certs.append({"name": CERTS[s], "skill": s})
    n_proj = int(_clip(round(2 + .7 * effort + nrng.normal(0, .7)), 1, 4))
    proj_titles = rng.sample(PROJECT_TEMPLATES[track], k=min(n_proj, 3))
    projects = [{"title": t, "tech": rng.sample(list(skills), k=min(3, len(skills))),
                 "description": f"{t} built using {', '.join(list(skills)[:3])}."} for t in proj_titles]
    internships = int(_clip(round(.4 + .6 * effort + .3 * ability + nrng.normal(0, .5)), 0, 3))
    return {
        "track": track, "ability": float(ability), "effort": float(effort), "comm": float(comm), "cgpa": cgpa,
        "tenth": round(_clip(82 + 7 * ability + nrng.normal(0, 5), 55, 99), 1),
        "twelfth": round(_clip(78 + 8 * ability + nrng.normal(0, 6), 50, 98), 1),
        "backlog_history": backlog_history, "active_backlogs": active, "skills": skills, "certifications": certs,
        "projects": projects, "internships": internships,
        "aptitude": round(_clip(60 + 12 * ability + 5 * effort + nrng.normal(0, 8), 15, 100), 1),
        "coding": round(_clip(45 + cs_bonus + 12 * ability + 10 * effort + nrng.normal(0, 9), 5, 100), 1),
        "mock": round(_clip(56 + 8 * ability + 7 * effort + 6 * comm + nrng.normal(0, 8), 10, 100), 1),
        "communication": round(_clip(62 + 12 * comm + 3 * effort + nrng.normal(0, 7), 20, 100), 1),
        "softskill": round(_clip(64 + 9 * comm + 4 * effort + nrng.normal(0, 7), 20, 100), 1),
    }


def outcome_logit(p: dict, branch: str) -> float:
    z = lambda v, m, s: (v - m) / s  # noqa: E731
    depth = np.mean(list(p["skills"].values())) if p["skills"] else 0
    return (-0.2 + 1.1 * z(p["cgpa"], 7.2, .9) + .7 * z(p["aptitude"], 60, 14) + .8 * z(p["mock"], 56, 12)
            + .5 * z(p["coding"], 50, 16) + .35 * z(p["communication"], 62, 13) + .25 * len(p["certifications"])
            + .35 * p["internships"] - .9 * p["active_backlogs"] + .3 * (depth - 3) + BRANCH_EFFECT[branch])


def _resume(name, branch, p):
    skills = ", ".join(f"{s} ({'★' * v})" for s, v in sorted(p["skills"].items(), key=lambda kv: -kv[1]))
    projects = "; ".join(pr["title"] for pr in p["projects"])
    certs = ", ".join(c["name"] for c in p["certifications"]) or "None"
    return (f"{name} – B.Tech {branch}, CGPA {p['cgpa']}. Career objective: {p['track']}. "
            f"Skills: {skills}. Projects: {projects}. Certifications: {certs}. "
            f"Internships: {p['internships']}.")


def migrate() -> None:
    """Add columns introduced after v1 to an existing SQLite database."""
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    if "students" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("students")}
    with engine.begin() as con:
        if "imputed_fields" not in cols:
            con.execute(text("ALTER TABLE students ADD COLUMN imputed_fields JSON"))
        if "registered_on" not in cols:
            con.execute(text("ALTER TABLE students ADD COLUMN registered_on VARCHAR(20)"))


def seed(force: bool = False) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    Base.metadata.create_all(engine)
    migrate()
    db = SessionLocal()
    if db.query(Student).count() and not force:
        db.close()
        return
    if force:
        from .models import AuditLog
        keep = {AuditLog.__table__}  # demo reset: users are re-created by seed_users()
        tables = [t for t in Base.metadata.sorted_tables if t not in keep]
        db.close()
        Base.metadata.drop_all(engine, tables=tables)
        Base.metadata.create_all(engine)
        db = SessionLocal()
    rng = random.Random(42)
    nrng = np.random.default_rng(42)

    campuses = [Campus(id=1, name="Kalinga Institute of Engineering (Main)", city="Bhubaneswar"),
                Campus(id=2, name="Kalinga Institute of Engineering (North)", city="Cuttack")]
    db.add_all(campuses)
    venues = [Venue(id=1, campus_id=1, name="Main Seminar Hall", capacity=300, kind="Seminar Hall"),
              Venue(id=2, campus_id=1, name="CS Lab-1", capacity=120, kind="Computer Lab"),
              Venue(id=3, campus_id=1, name="CS Lab-2", capacity=90, kind="Computer Lab"),
              Venue(id=4, campus_id=1, name="Auditorium", capacity=500, kind="Seminar Hall"),
              Venue(id=5, campus_id=1, name="Interview Block A", capacity=60, kind="Interview Rooms"),
              Venue(id=6, campus_id=2, name="North Seminar Hall", capacity=200, kind="Seminar Hall"),
              Venue(id=7, campus_id=2, name="North Computer Lab", capacity=80, kind="Computer Lab")]
    db.add_all(venues)

    # ---------------- historical batches ----------------
    hist_companies = {"Dream": [c for c in COMPANIES if c[2] == "Dream"],
                      "Super": [c for c in COMPANIES if c[2] == "Super"],
                      "Regular": [c for c in COMPANIES if c[2] == "Regular"]}
    for batch in range(2023, 2027):
        for _ in range(520):
            branch = rng.choices(list(BRANCH_MIX), weights=list(BRANCH_MIX.values()))[0]
            p = _gen_profile(rng, nrng, branch)
            logit = .55 * outcome_logit(p, branch) + nrng.normal(0, 1.0) + .12 * (batch - 2023)
            placed = bool(logit > 0)
            company = ctc = None
            if placed:
                tier = "Dream" if logit > 1.8 else "Super" if logit > .9 else "Regular"
                eligible = [c for c in hist_companies[tier] if c[3] <= batch] or hist_companies["Regular"]
                c = rng.choice(eligible)
                company = c[0]
                base = {"Dream": 16, "Super": 9, "Regular": 4.2}[tier]
                ctc = round(base * (1 + .05 * (batch - 2023)) * (1 + nrng.normal(0, .12)), 1)
            db.add(HistoricalPlacement(
                campus_id=1 if rng.random() < .65 else 2, batch=batch, branch=branch, cgpa=p["cgpa"],
                active_backlogs=p["active_backlogs"], backlog_history=p["backlog_history"],
                n_skills=len(p["skills"]), skill_depth=float(np.mean(list(p["skills"].values()))),
                n_certs=len(p["certifications"]), n_projects=len(p["projects"]), internships=p["internships"],
                aptitude_score=p["aptitude"], coding_score=p["coding"], mock_interview_score=p["mock"],
                communication_score=p["communication"], softskill_score=p["softskill"],
                top_skills=sorted(p["skills"], key=lambda k: -p["skills"][k])[:5], placed=placed,
                company=company, ctc_lpa=ctc))

    # ---------------- current batch ----------------
    latents = {}
    used = set()
    sid = 0
    for campus_id, n in ((1, 440), (2, 220)):
        for _ in range(n):
            sid += 1
            branch = rng.choices(list(BRANCH_MIX), weights=list(BRANCH_MIX.values()))[0]
            p = _gen_profile(rng, nrng, branch)
            while True:
                name = f"{rng.choice(FIRST)} {rng.choice(LAST)}"
                if name not in used or len(used) > 1300:
                    used.add(name)
                    break
            hist = []
            for m, month in enumerate(["2026-06", "2026-07", "2026-08", "2026-09"]):
                g = (m - 3) * (1.5 + 2 * max(p["effort"], 0))
                hist.append({"month": month, "aptitude": round(_clip(p["aptitude"] + g + nrng.normal(0, 3), 0, 100), 1),
                             "mock": round(_clip(p["mock"] + g + nrng.normal(0, 3), 0, 100), 1),
                             "coding": round(_clip(p["coding"] + g + nrng.normal(0, 3), 0, 100), 1)})
            roll = f"{'KIE' if campus_id == 1 else 'KIN'}{CURRENT_BATCH % 100}{branch[:3]}{sid:04d}"
            s = Student(
                id=sid, campus_id=campus_id, roll_no=roll, name=name,
                email=f"{name.lower().replace(' ', '.')}{sid}@student.kie.edu.in",
                phone=f"+91 9{rng.randint(100000000, 999999999)}", branch=branch, batch=CURRENT_BATCH,
                gender=rng.choice(["M", "F"]), cgpa=p["cgpa"], tenth_pct=p["tenth"], twelfth_pct=p["twelfth"],
                active_backlogs=p["active_backlogs"], backlog_history=p["backlog_history"], skills=p["skills"],
                certifications=p["certifications"], projects=p["projects"], internships=p["internships"],
                aptitude_score=p["aptitude"], coding_score=p["coding"], mock_interview_score=p["mock"],
                communication_score=p["communication"], softskill_score=p["softskill"],
                assessment_history=hist, preferred_roles=[p["track"]], resume_text=_resume(name, branch, p),
                mentor=rng.choice(MENTORS))
            db.add(s)
            latents[sid] = {"ability": p["ability"], "effort": p["effort"], "comm": p["comm"]}

    # ---------------- recruiters & jobs ----------------
    for i, (name, sector, tier, fy) in enumerate(COMPANIES, start=1):
        db.add(Company(id=i, name=name, sector=sector, tier=tier, first_visit_year=fy,
                       hr_contact=f"campus.hiring@{name.split()[0].lower()}.example.com"))
    for j, (ci, title, fam, jtype, mincg, branches, bl, ctc, bench, openings, pref) in enumerate(JOBS, start=1):
        req = sorted(ROLE_PROFILES[fam]["skills"], key=lambda s: -ROLE_PROFILES[fam]["skills"][s])[:5]
        jd = (f"{COMPANIES[ci][0]} is hiring a {title} ({jtype}) for the {CURRENT_BATCH} batch. "
              f"Eligibility: B.Tech in {', '.join(branches)} with a minimum CGPA of {mincg} and not more than "
              f"{bl} active backlog(s). Required skills: {', '.join(req)}. Good to have: {', '.join(pref)}. "
              f"Package: {ctc} LPA. Selection: online assessment, technical interview, HR interview.")
        db.add(Job(id=j, company_id=ci + 1, title=title, role_family=fam, job_type=jtype, jd_text=jd,
                   required_skills=req, preferred_skills=pref, min_cgpa=mincg, allowed_branches=branches,
                   max_active_backlogs=bl, ctc_lpa=ctc, mock_benchmark=bench, openings=openings))
    db.flush()

    # ---------------- drives ----------------
    d = lambda s: date.fromisoformat(s)  # noqa: E731
    drives = [
        # completed
        (1, 2, "Kalinga Infotech – Mass Recruitment", "2026-08-20", "AM", 4, "Completed", 3, False),
        (1, 11, "Pixelweave Digital – Associate SE", "2026-08-27", "AM", 1, "Completed", 2, True),
        (1, 3, "Quantaleap Analytics – Data Scientist", "2026-09-10", "PM", 2, "Completed", 2, True),
        (2, 16, "Deltabyte Solutions – Systems Engineer", "2026-09-17", "AM", 6, "Completed", 3, False),
        # upcoming (some pre-booked with conflicts)
        (1, 1, "Nimbus Cloud Systems – Cloud Engineer", "2026-10-06", "AM", 2, "Upcoming", 3, True),
        (1, 18, "Nimbus Cloud Systems – SRE", "2026-10-06", "AM", 2, "Upcoming", 2, True),        # venue clash
        (1, 13, "FinArc Technologies – SDE", "2026-10-06", "AM", 3, "Upcoming", 3, True),          # student clash with 5
        (1, 8, "Stackforge Labs – Full Stack (Intern+PPO)", "2026-10-08", "PM", 3, "Upcoming", 2, True),
        (1, 4, "Orbitron Semiconductors – DV Engineer", "2026-10-09", "AM", 1, "Upcoming", 2, False),
        (1, 12, "Embedix Systems – Firmware Engineer", "2026-10-09", "AM", 5, "Upcoming", 3, False),  # ECE overlap with 9 + panel
        (1, 5, "Brightpath Consulting – Business Analyst", None, None, None, "Upcoming", 2, False),
        (1, 15, "QualiTest Global – QA Engineer", None, None, None, "Upcoming", 2, True),
        (2, 10, "Sentinel CyberWorks – Security Analyst", "2026-10-13", "PM", 7, "Upcoming", 2, True),
        (1, 14, "Greenwatt Mobility – Battery Systems (Intern+PPO)", None, None, None, "Upcoming", 2, False),
        (1, 6, "Voltedge Power – GET Electrical", "2026-10-15", "AM", 1, "Upcoming", 2, False),
        (1, 7, "Mechanica Engineering – Design Engineer", "2026-10-15", "AM", 1, "Upcoming", 2, False),  # venue clash
        (1, 17, "Quantaleap Analytics – ML Engineer Intern", None, None, None, "Upcoming", 2, True),
    ]
    for i, (camp, job, name, dt, slot, venue, status, panels, lab) in enumerate(drives, start=1):
        start = d(dt) - timedelta(days=4) if dt else TODAY + timedelta(days=10 + i)
        db.add(Drive(id=i, campus_id=camp, job_id=job, name=name, date=d(dt) if dt else None, slot=slot,
                     venue_id=venue, status=status, panels_required=panels, needs_lab=lab,
                     window_start=start, window_end=start + timedelta(days=14)))
    db.commit()

    (DATA_DIR / "ground_truth.json").write_text(json.dumps({"latents": latents}, indent=0))
    db.close()


def true_fit(student: Student, job: Job, lat: dict) -> float:
    """Hidden recruiter preference (ground truth) – used ONLY by evaluation & by
    the simulator that decides who gets selected in completed drives."""
    prof = ROLE_PROFILES[job.role_family]["skills"]
    cov = sum(w * student.skills.get(s, 0) / 5 for s, w in prof.items()) / sum(prof.values())
    mock_gap = (student.mock_interview_score - job.mock_benchmark) / 20
    return .40 * cov + .30 * (lat["ability"] / 3 + .5) + .15 * math.tanh(mock_gap) + .15 * (lat["comm"] / 3 + .5)


def load_latents() -> dict[int, dict]:
    f = DATA_DIR / "ground_truth.json"
    if not f.exists():
        return {}
    return {int(k): v for k, v in json.loads(f.read_text())["latents"].items()}


def simulate_completed_drives() -> None:
    """For completed drives, run matching then let the 'recruiter' pick
    candidates using the hidden ground truth; generate offers + history."""
    from .engines import matching, notifications
    from .engines import offers as offer_engine

    db = SessionLocal()
    if db.query(Offer).count():
        db.close()
        return
    rng = random.Random(7)
    lat = load_latents()
    for drive in db.query(Drive).filter(Drive.status == "Completed").order_by(Drive.date).all():
        matching.run_matching(db, drive.id, auto_shortlist=True)
        apps = db.query(Application).filter_by(drive_id=drive.id, status="Shortlisted").all()
        job = drive.job
        scored = sorted(apps, key=lambda a: -(true_fit(db.get(Student, a.student_id), job, lat[a.student_id])
                                              + rng.gauss(0, .03)))
        n_sel = min(job.openings, max(1, int(len(scored) * .35)))
        for rank, a in enumerate(scored):
            if rank < n_sel:
                a.status = "Selected"
                stu = db.get(Student, a.student_id)
                otype = {"FTE": "FTE", "Intern+PPO": "Intern Conversion", "Internship": "Internship"}[job.job_type]
                o = offer_engine.create_offer(db, stu, drive, otype, job.ctc_lpa, issued=drive.date + timedelta(days=3))
                r = rng.random()
                if (drive.date - date(2026, 1, 1)).days < 240:  # older drives progressed further
                    status = "Accepted" if r < .78 else "Declined" if r < .86 else "Deferred"
                else:
                    status = "Issued" if r < .5 else "Accepted"
                if status != "Issued":
                    offer_engine.transition(db, o, status, note="Simulated student response", notify=False)
                if o.status == "Accepted":
                    keys = list(o.documents)
                    for k in keys[: rng.randint(1, len(keys))]:
                        o.documents[k] = "Verified" if rng.random() < .7 else "Submitted"
                    o.documents = dict(o.documents)
            else:
                a.status = "Rejected"
        db.commit()
    # A few PPO offers from summer internships
    for stu in db.query(Student).filter(Student.internships >= 2, Student.cgpa >= 8.3).limit(6).all():
        o = offer_engine.create_offer(db, stu, None, "PPO", 12.0, issued=date(2026, 8, 5),
                                      company_id=rng.choice([3, 8, 12]), role="Software Engineer (PPO)")
        offer_engine.transition(db, o, "Accepted", note="PPO accepted", notify=False)
    db.commit()
    # Internship → full-time conversions from last summer's Intern+PPO programmes
    intern_jobs = db.query(Job).filter(Job.job_type == "Intern+PPO").all()
    with_offer = {sid for (sid,) in db.query(Offer.student_id)}
    pool = [s for s in db.query(Student).filter(Student.internships >= 1, Student.cgpa >= 7.5,
                                                Student.active_backlogs == 0).order_by(Student.id).all()
            if s.id not in with_offer]
    for i, stu in enumerate(pool[:5]):
        job = intern_jobs[i % len(intern_jobs)] if intern_jobs else None
        o = offer_engine.create_offer(db, stu, None, "Intern Conversion", job.ctc_lpa if job else 7.0,
                                      issued=date(2026, 8, 20), company_id=job.company_id if job else 1,
                                      role=f"{job.title if job else 'Engineer'} (converted intern)")
        if i % 3 != 2:
            offer_engine.transition(db, o, "Accepted", note="Internship converted to full-time", notify=False)
    db.commit()
    notifications.seed_announcements(db)
    db.close()


if __name__ == "__main__":
    seed(force=True)
    print("seeded")
