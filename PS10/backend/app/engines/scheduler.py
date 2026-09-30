"""Conflict-aware placement-drive scheduling.

Detects: venue double-booking, overlapping drives with shared candidates,
interview-panel over-allocation, venue capacity / lab mismatch, holidays and
recruiter-window violations.

Resolves with a DSatur-style greedy constraint solver: drives are ordered by
(conflict degree, recruiter tier, window tightness); each drive is placed in the
lowest-cost feasible (date, slot, venue) inside its window. Hard constraints:
no venue clash, no shared-student clash in the same slot, panel pool limit,
capacity/lab fit. Soft cost: days moved from the original date + same-day
student overlap.
"""
from __future__ import annotations

import time
from collections import defaultdict
from datetime import date, timedelta
from itertools import combinations

from ..core.config import settings
from ..models import Application, Drive, Venue

SLOTS = ["AM", "PM"]
PANEL_POOL = {1: 6, 2: 4}  # interview panels available per campus per slot
HOLIDAYS = {date(2026, 10, 2): "Gandhi Jayanti", date(2026, 10, 20): "Dussehra",
            date(2026, 11, 9): "Diwali (observed)", date(2026, 11, 24): "Guru Nanak Jayanti"}
# institution calendar from configuration, e.g. HOLIDAYS="2026-12-25:Christmas,2027-01-26:Republic Day"
for _item in filter(None, (x.strip() for x in settings.HOLIDAYS.split(","))):
    _d, _, _name = _item.partition(":")
    HOLIDAYS[date.fromisoformat(_d)] = _name or "Holiday"
TIER_PRIORITY = {"Dream": 0, "Super": 1, "Regular": 2}


def candidate_sets(db, drives: list[Drive]) -> dict[int, set[int]]:
    """Students each drive needs: shortlisted (or eligible if matching not yet run)."""
    out = {}
    for d in drives:
        rows = db.query(Application.student_id, Application.status).filter(Application.drive_id == d.id).all()
        short = {sid for sid, st in rows if st in ("Shortlisted", "Selected")}
        out[d.id] = short or {sid for sid, st in rows if st != "Not Eligible"}
    return out


def headcount(cands: set[int]) -> int:
    return max(30, len(cands))


def detect_conflicts(db, drives: list[Drive] | None = None) -> list[dict]:
    drives = drives or db.query(Drive).filter(Drive.status == "Upcoming").all()
    venues = {v.id: v for v in db.query(Venue).all()}
    cands = candidate_sets(db, drives)
    conflicts: list[dict] = []
    by_slot: dict[tuple, list[Drive]] = defaultdict(list)
    for d in drives:
        if d.date is None:
            conflicts.append({"type": "Unscheduled", "severity": "info", "drives": [d.id],
                              "detail": f"'{d.name}' has no date/slot/venue yet."})
            continue
        by_slot[(d.campus_id, d.date, d.slot)].append(d)
        if d.date in HOLIDAYS or d.date.weekday() == 6:
            conflicts.append({"type": "Holiday", "severity": "high", "drives": [d.id],
                              "detail": f"'{d.name}' falls on {HOLIDAYS.get(d.date, 'Sunday')} ({d.date})."})
        if not (d.window_start <= d.date <= d.window_end):
            conflicts.append({"type": "Recruiter window", "severity": "medium", "drives": [d.id],
                              "detail": f"'{d.name}' on {d.date} is outside the recruiter's window "
                                        f"{d.window_start}–{d.window_end}."})
        v = venues.get(d.venue_id)
        if v:
            need = headcount(cands[d.id])
            if v.capacity < need:
                conflicts.append({"type": "Venue capacity", "severity": "high", "drives": [d.id],
                                  "detail": f"{v.name} seats {v.capacity} but '{d.name}' needs ~{need}."})
            if d.needs_lab and v.kind != "Computer Lab":
                conflicts.append({"type": "Resource mismatch", "severity": "medium", "drives": [d.id],
                                  "detail": f"'{d.name}' needs a computer lab for its online test; {v.name} is a {v.kind}."})
    for (camp, dt, slot), ds in by_slot.items():
        for a, b in combinations(ds, 2):
            if a.venue_id and a.venue_id == b.venue_id:
                conflicts.append({"type": "Venue double-booking", "severity": "critical", "drives": [a.id, b.id],
                                  "detail": f"{venues[a.venue_id].name} booked for both '{a.name}' and '{b.name}' "
                                            f"on {dt} {slot}."})
            shared = cands[a.id] & cands[b.id]
            if shared:
                conflicts.append({"type": "Student clash", "severity": "critical", "drives": [a.id, b.id],
                                  "students": len(shared),
                                  "detail": f"{len(shared)} candidate(s) are shortlisted for both '{a.name}' and "
                                            f"'{b.name}' on {dt} {slot}."})
        panels = sum(d.panels_required for d in ds)
        if panels > PANEL_POOL.get(camp, 4):
            conflicts.append({"type": "Panel availability", "severity": "high", "drives": [d.id for d in ds],
                              "detail": f"{panels} interview panels needed on {dt} {slot} but only "
                                        f"{PANEL_POOL.get(camp, 4)} available on campus {camp}."})
    order = {"critical": 0, "high": 1, "medium": 2, "info": 3}
    return sorted(conflicts, key=lambda c: order[c["severity"]])


def _days(start: date, end: date):
    d = start
    while d <= end:
        if d.weekday() < 6 and d not in HOLIDAYS:
            yield d
        d += timedelta(days=1)


def auto_schedule(db, apply: bool = False) -> dict:
    t0 = time.perf_counter()
    drives = db.query(Drive).filter(Drive.status == "Upcoming").all()
    venues = db.query(Venue).all()
    cands = candidate_sets(db, drives)
    before = detect_conflicts(db, drives)
    degree = defaultdict(int)
    for a, b in combinations(drives, 2):
        if a.campus_id == b.campus_id and cands[a.id] & cands[b.id]:
            degree[a.id] += 1
            degree[b.id] += 1
    order = sorted(drives, key=lambda d: (-degree[d.id], TIER_PRIORITY[d.job.company.tier],
                                          (d.window_end - d.window_start).days))
    placed: dict[int, tuple] = {}
    venue_busy: set[tuple] = set()
    panels_used: dict[tuple, int] = defaultdict(int)
    slot_students: dict[tuple, set[int]] = defaultdict(set)
    day_students: dict[tuple, set[int]] = defaultdict(set)
    changes, unplaced = [], []
    vname = {v.id: v.name for v in venues}
    for d in order:
        need = headcount(cands[d.id])
        best = None
        anchor = d.date or d.window_start
        for day in _days(d.window_start, d.window_end):
            for slot in SLOTS:
                key = (d.campus_id, day, slot)
                if panels_used[key] + d.panels_required > PANEL_POOL.get(d.campus_id, 4):
                    continue
                if slot_students[key] & cands[d.id]:
                    continue
                fits = [v for v in venues if v.campus_id == d.campus_id and v.capacity >= need
                        and (v.kind == "Computer Lab") == d.needs_lab and (v.id, day, slot) not in venue_busy]
                if not fits:
                    fits = [v for v in venues if v.campus_id == d.campus_id and v.capacity >= need
                            and (v.id, day, slot) not in venue_busy and not d.needs_lab]
                if not fits:
                    continue
                v = min(fits, key=lambda v: (v.id != d.venue_id, v.capacity))  # keep venue / best fit
                cost = abs((day - anchor).days) + (0 if (day == d.date and slot == d.slot) else .5) \
                    + .02 * len(day_students[(d.campus_id, day)] & cands[d.id]) + (0 if v.id == d.venue_id else .3)
                if best is None or cost < best[0]:
                    best = (cost, day, slot, v)
        if best is None:
            unplaced.append({"drive_id": d.id, "drive": d.name, "reason": "No feasible slot in recruiter window"})
            continue
        _, day, slot, v = best
        key = (d.campus_id, day, slot)
        panels_used[key] += d.panels_required
        slot_students[key] |= cands[d.id]
        day_students[(d.campus_id, day)] |= cands[d.id]
        venue_busy.add((v.id, day, slot))
        placed[d.id] = (day, slot, v.id)
        if (d.date, d.slot, d.venue_id) != (day, slot, v.id):
            changes.append({"drive_id": d.id, "drive": d.name,
                            "from": f"{d.date} {d.slot} @ {vname.get(d.venue_id, '—')}" if d.date else "Unscheduled",
                            "to": {"date": day.isoformat(), "slot": slot, "venue_id": v.id, "venue": v.name}})
    # evaluate the proposed plan without committing
    snapshot = {d.id: (d.date, d.slot, d.venue_id) for d in drives}
    for d in drives:
        if d.id in placed:
            d.date, d.slot, d.venue_id = placed[d.id]
    after = detect_conflicts(db, drives)
    if apply:
        db.commit()
        from . import notifications
        for c in changes:
            notifications.notify_schedule(db, db.get(Drive, c["drive_id"]))
        db.commit()
    else:
        for d in drives:
            d.date, d.slot, d.venue_id = snapshot[d.id]
        db.expire_all()
    return {"applied": apply, "changes": changes, "unplaced": unplaced,
            "conflicts_before": len([c for c in before if c["severity"] != "info"]),
            "conflicts_after": len([c for c in after if c["severity"] != "info"]),
            "before": before, "after": after, "runtime_ms": round((time.perf_counter() - t0) * 1000, 1)}


def calendar(db) -> list[dict]:
    venues = {v.id: v.name for v in db.query(Venue).all()}
    out = []
    for d in db.query(Drive).order_by(Drive.date).all():
        out.append({"id": d.id, "name": d.name, "company": d.job.company.name, "campus_id": d.campus_id,
                    "date": d.date.isoformat() if d.date else None, "slot": d.slot, "venue_id": d.venue_id,
                    "venue": venues.get(d.venue_id), "status": d.status, "panels": d.panels_required,
                    "needs_lab": d.needs_lab, "window": [d.window_start.isoformat(), d.window_end.isoformat()],
                    "tier": d.job.company.tier})
    return out
