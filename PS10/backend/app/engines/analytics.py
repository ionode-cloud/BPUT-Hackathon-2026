"""Placement analytics & predictive insights for the command dashboard."""
from __future__ import annotations

from collections import Counter, defaultdict

import numpy as np

from ..models import Application, Campus, Company, Drive, HistoricalPlacement, Job, Notification, Offer, Student

PLACED = ("Accepted", "Joined")


def _placed_ids(db) -> dict[int, Offer]:
    out = {}
    for o in db.query(Offer).filter(Offer.status.in_(PLACED)).all():
        if o.student_id not in out or o.ctc_lpa > out[o.student_id].ctc_lpa:
            out[o.student_id] = o
    return out


def _students(db, campus_id: int | None):
    q = db.query(Student)
    return q.filter(Student.campus_id == campus_id).all() if campus_id else q.all()


def dashboard(db, campus_id: int | None = None) -> dict:
    students = _students(db, campus_id)
    ids = {s.id for s in students}
    placed = {k: v for k, v in _placed_ids(db).items() if k in ids}
    offers = [o for o in db.query(Offer).all() if o.student_id in ids]
    drives = db.query(Drive).all()
    if campus_id:
        drives = [d for d in drives if d.campus_id == campus_id]
    levels = Counter(s.readiness_level for s in students)
    ctcs = [o.ctc_lpa for o in offers if o.status in PLACED]
    apps = [a for a in db.query(Application).all() if a.student_id in ids]
    doc_counter = Counter()
    for o in offers:
        if o.status in PLACED:
            for v in o.documents.values():
                doc_counter[v] += 1
    return {
        "kpis": {
            "students": len(students),
            "pending_students": len(students) - len(placed),
            "placement_ready": levels.get("Ready", 0) + levels.get("Highly Employable", 0),
            "placed": len(placed), "placement_rate": round(100 * len(placed) / max(1, len(students)), 1),
            "at_risk": sum(1 for s in students if s.at_risk and s.id not in placed),
            "active_drives": sum(1 for d in drives if d.status == "Upcoming" and d.date),
            "unscheduled_drives": sum(1 for d in drives if d.status == "Upcoming" and not d.date),
            "completed_drives": sum(1 for d in drives if d.status == "Completed"),
            "offers_made": len(offers), "offers_accepted": sum(o.status in PLACED for o in offers),
            "offers_pending": sum(o.status in ("Issued", "Deferred") for o in offers),
            "offers_declined": sum(o.status in ("Declined", "Withdrawn") for o in offers),
            "avg_ctc": round(float(np.mean(ctcs)), 2) if ctcs else 0,
            "median_ctc": round(float(np.median(ctcs)), 2) if ctcs else 0,
            "highest_ctc": max(ctcs) if ctcs else 0,
            "recruiters": db.query(Company).count(),
        },
        "readiness_distribution": [{"level": item, "count": levels.get(item, 0)} for item in
                                   ["Not Ready", "Developing", "Ready", "Highly Employable"]],
        "funnel": [
            {"stage": "Registered", "count": len(students)},
            {"stage": "Eligible (≥1 drive)", "count": len({a.student_id for a in apps if a.eligible})},
            {"stage": "Shortlisted", "count": len({a.student_id for a in apps if a.status in ("Shortlisted", "Selected", "Rejected")})},
            {"stage": "Selected", "count": len({a.student_id for a in apps if a.status == "Selected"} | {o.student_id for o in offers})},
            {"stage": "Offer accepted", "count": len(placed)},
            {"stage": "Joined", "count": sum(1 for o in offers if o.status == "Joined")},
        ],
        "documents": [{"status": k, "count": v} for k, v in doc_counter.items()],
        "branch_conversion": branch_conversion(db, students, placed),
        "package_trend": package_trend(db),
        "upcoming_drives": [{"id": d.id, "name": d.name, "date": d.date.isoformat() if d.date else None,
                             "slot": d.slot, "tier": d.job.company.tier, "ctc": d.job.ctc_lpa}
                            for d in sorted([d for d in drives if d.status == "Upcoming"],
                                            key=lambda d: (d.date is None, d.date))][:8],
        "at_risk_preview": at_risk(db, campus_id)[:8],
        "recruiter_pipeline": recruiter_pipeline(db),
        "campuses": [{"id": c.id, "name": c.name} for c in db.query(Campus).all()],
    }


def branch_conversion(db, students, placed) -> list[dict]:
    hist = defaultdict(lambda: [0, 0])
    for h in db.query(HistoricalPlacement).all():
        hist[h.branch][0] += h.placed
        hist[h.branch][1] += 1
    cur = defaultdict(lambda: [0, 0])
    for s in students:
        cur[s.branch][0] += s.id in placed
        cur[s.branch][1] += 1
    return [{"branch": b, "current_rate": round(100 * cur[b][0] / max(1, cur[b][1]), 1),
             "current_placed": cur[b][0], "students": cur[b][1],
             "historical_rate": round(100 * hist[b][0] / max(1, hist[b][1]), 1),
             "avg_readiness": round(float(np.mean([s.readiness_score for s in students if s.branch == b] or [0])), 1)}
            for b in ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]]


def skill_conversion(db, min_support: int = 40) -> list[dict]:
    stats = defaultdict(lambda: [0, 0])
    base = [0, 0]
    for h in db.query(HistoricalPlacement).all():
        base[0] += h.placed
        base[1] += 1
        for sk in h.top_skills:
            stats[sk][0] += h.placed
            stats[sk][1] += 1
    overall = base[0] / max(1, base[1])
    out = [{"skill": k, "students": n, "placement_rate": round(100 * p / n, 1),
            "lift": round((p / n) / overall, 2)} for k, (p, n) in stats.items() if n >= min_support]
    return sorted(out, key=lambda d: -d["placement_rate"])


def package_trend(db) -> list[dict]:
    by = defaultdict(list)
    placed_n = Counter()
    total_n = Counter()
    for h in db.query(HistoricalPlacement).all():
        total_n[h.batch] += 1
        if h.placed and h.ctc_lpa:
            by[h.batch].append(h.ctc_lpa)
            placed_n[h.batch] += 1
    cur = [o.ctc_lpa for o in db.query(Offer).filter(Offer.status.in_(PLACED)).all()]
    rows = [{"batch": str(b), "avg": round(float(np.mean(v)), 2), "median": round(float(np.median(v)), 2),
             "max": round(max(v), 1), "placement_rate": round(100 * placed_n[b] / total_n[b], 1)}
            for b, v in sorted(by.items())]
    if cur:
        rows.append({"batch": "2027 (YTD)", "avg": round(float(np.mean(cur)), 2),
                     "median": round(float(np.median(cur)), 2), "max": max(cur),
                     "placement_rate": round(100 * len(_placed_ids(db)) / max(1, db.query(Student).count()), 1)})
    return rows


def company_packages(db) -> list[dict]:
    by = defaultdict(list)
    for h in db.query(HistoricalPlacement).filter(HistoricalPlacement.placed.is_(True)).all():
        by[h.company].append(h.ctc_lpa)
    for o in db.query(Offer).all():
        by[db.get(Company, o.company_id).name].append(o.ctc_lpa)
    return sorted([{"company": k, "avg_ctc": round(float(np.mean(v)), 2), "hires": len(v)} for k, v in by.items()],
                  key=lambda d: -d["avg_ctc"])


def at_risk(db, campus_id: int | None = None) -> list[dict]:
    placed = _placed_ids(db)
    out = []
    for s in _students(db, campus_id):
        if s.at_risk and s.id not in placed:
            reasons = []
            if s.active_backlogs:
                reasons.append(f"{s.active_backlogs} active backlog(s)")
            if s.cgpa < 6.5:
                reasons.append(f"low CGPA ({s.cgpa})")
            if s.mock_interview_score < 50:
                reasons.append(f"weak mock interview ({s.mock_interview_score:.0f})")
            if s.aptitude_score < 50:
                reasons.append(f"low aptitude ({s.aptitude_score:.0f})")
            if s.communication_score < 55:
                reasons.append(f"communication ({s.communication_score:.0f})")
            out.append({"id": s.id, "name": s.name, "roll_no": s.roll_no, "branch": s.branch, "cgpa": s.cgpa,
                        "readiness": s.readiness_score, "level": s.readiness_level,
                        "probability": round(s.placement_probability * 100, 1), "mentor": s.mentor,
                        "reasons": reasons or ["low overall readiness"]})
    return sorted(out, key=lambda d: d["probability"])


def recruiter_pipeline(db) -> list[dict]:
    hist = defaultdict(lambda: defaultdict(int))
    for h in db.query(HistoricalPlacement).filter(HistoricalPlacement.placed.is_(True)).all():
        hist[h.company][h.batch] += 1
    out = []
    for c in db.query(Company).all():
        jobs = db.query(Job).filter_by(company_id=c.id).all()
        drives = [d for j in jobs for d in db.query(Drive).filter_by(job_id=j.id).all()]
        offers = db.query(Offer).filter_by(company_id=c.id).all()
        years = sorted(hist[c.name])
        if any(d.status == "Completed" for d in drives):
            stage = "Offers released" if offers else "Interviews done"
        elif any(d.date for d in drives):
            stage = "Drive scheduled"
        elif drives:
            stage = "JD received"
        else:
            stage = "Engaged"
        pending = sum(o.status in ("Issued", "Deferred") for o in offers)
        out.append({"company": c.name, "tier": c.tier, "sector": c.sector, "stage": stage,
                    "years_visited": len(years), "repeat_recruiter": len(years) >= 2,
                    "hires_by_year": {str(k): v for k, v in sorted(hist[c.name].items())},
                    "total_hist_hires": sum(hist[c.name].values()), "drives": len(drives),
                    "offers_2027": len(offers), "pending_offers": pending,
                    "engagement_score": round(min(100, 15 * len(years) + 2 * sum(hist[c.name].values()) ** .7
                                                  + 20 * len(drives)), 1)})
    return sorted(out, key=lambda d: -d["engagement_score"])


def campus_comparison(db) -> list[dict]:
    placed = _placed_ids(db)
    out = []
    for c in db.query(Campus).all():
        st = db.query(Student).filter_by(campus_id=c.id).all()
        out.append({"campus": c.name, "students": len(st), "placed": sum(s.id in placed for s in st),
                    "avg_readiness": round(float(np.mean([s.readiness_score for s in st])), 1),
                    "at_risk": sum(s.at_risk and s.id not in placed for s in st)})
    return out


def notification_stats(db) -> list[dict]:
    c = Counter(n.category for n in db.query(Notification).all())
    return [{"category": k, "count": v} for k, v in c.most_common()]
