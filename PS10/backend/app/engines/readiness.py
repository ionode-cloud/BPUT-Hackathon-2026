"""Student readiness / employability scoring and skill-gap analysis.

Readiness = 0.65 x transparent weighted rubric (6 components)
          + 0.35 x ML placement probability (GBM + LR ensemble)
Levels: Not Ready (<40) -> Developing (40-55) -> Ready (55-70) -> Highly Employable (>=70)
"""
from __future__ import annotations

import numpy as np

from ..models import Student
from . import predictor
from .skills import RESOURCES, ROLE_PROFILES, category_of

WEIGHTS = {"Academics": .20, "Technical Skills": .25, "Aptitude": .15, "Interview": .15,
           "Communication": .15, "Experience": .10}
RULE_WEIGHT, ML_WEIGHT = .65, .35
LEVELS = [(70, "Highly Employable"), (55, "Ready"), (40, "Developing"), (0, "Not Ready")]
TARGET_PROFICIENCY = 3  # "working knowledge" on a 1-5 scale


def level_for(score: float) -> str:
    for cut, name in LEVELS:
        if score >= cut:
            return name
    return "Not Ready"


def role_coverage(skills: dict, role: str) -> float:
    prof = ROLE_PROFILES[role]["skills"]
    return sum(w * min(skills.get(s, 0), 5) / 5 for s, w in prof.items()) / sum(prof.values())


def best_roles(s: Student, n: int = 3) -> list[dict]:
    roles = [r for r, p in ROLE_PROFILES.items() if s.branch in p["branches"]]
    scored = sorted(((r, role_coverage(s.skills, r)) for r in roles), key=lambda x: -x[1])
    return [{"role": r, "coverage": round(c * 100, 1)} for r, c in scored[:n]]


def components(s: Student) -> dict[str, float]:
    academics = np.clip((s.cgpa - 5) / 4.5 * 100, 0, 100) - 15 * s.active_backlogs - 3 * s.backlog_history
    target = (s.preferred_roles or [None])[0]
    if target not in ROLE_PROFILES:
        target = best_roles(s, 1)[0]["role"]
    tech = .55 * role_coverage(s.skills, target) * 100 + .45 * s.coding_score
    experience = min(100, 18 * len(s.projects) + 12 * len(s.certifications) + 25 * s.internships)
    comm = .6 * s.communication_score + .4 * s.softskill_score
    return {"Academics": float(np.clip(academics, 0, 100)), "Technical Skills": float(tech),
            "Aptitude": float(s.aptitude_score), "Interview": float(s.mock_interview_score),
            "Communication": float(comm), "Experience": float(experience)}


def rubric_score(comp: dict[str, float]) -> float:
    return sum(WEIGHTS[k] * v for k, v in comp.items())


def score_students(db, students: list[Student]) -> list[dict]:
    probs = predictor.predict(db, students)
    out = []
    for i, s in enumerate(students):
        comp = components(s)
        rule = rubric_score(comp)
        if probs is None:  # PlacementNet not trained yet (no history) → transparent rubric only
            p = float(1 / (1 + np.exp(-(rule - 50) / 8)))
            total = rule
        else:
            p = float(probs[i])
            total = RULE_WEIGHT * rule + ML_WEIGHT * 100 * p
        out.append({"student_id": s.id, "components": comp, "rubric": rule, "probability": float(p),
                    "score": round(total, 1), "level": level_for(total)})
    return out


def trend(s: Student) -> dict:
    h = s.assessment_history or []
    if len(h) < 2:
        return {"direction": "flat", "delta": 0}
    first = np.mean([h[0]["aptitude"], h[0]["mock"], h[0]["coding"]])
    last = np.mean([h[-1]["aptitude"], h[-1]["mock"], h[-1]["coding"]])
    d = round(float(last - first), 1)
    return {"direction": "improving" if d > 2 else "declining" if d < -2 else "flat", "delta": d}


def explain(db, s: Student) -> dict:
    res = score_students(db, [s])[0]
    comp = res["components"]
    strengths = [f"{k} ({v:.0f}/100)" for k, v in sorted(comp.items(), key=lambda kv: -kv[1]) if v >= 70]
    weaknesses = [f"{k} ({v:.0f}/100)" for k, v in sorted(comp.items(), key=lambda kv: kv[1]) if v < 50]
    flags = []
    if s.active_backlogs:
        flags.append(f"{s.active_backlogs} active backlog(s) – most recruiters require zero")
    if s.mock_interview_score < 50:
        flags.append("Mock-interview score below 50 – schedule practice interviews")
    if s.communication_score < 55:
        flags.append("Communication score below 55 – join the communication lab")
    if not s.certifications:
        flags.append("No industry certifications on record")
    if s.internships == 0:
        flags.append("No internship experience")
    t = trend(s)
    _, sd = predictor.predict_with_uncertainty(db, [s])
    sd = float(sd[0]) if sd is not None else 0.0
    model_ready = sd is not None and predictor.is_trained(db)
    imputed = list(s.imputed_fields or [])
    top = sorted(comp.items(), key=lambda kv: -WEIGHTS[kv[0]] * kv[1])
    summary = (f"{s.name} is {res['level']} (score {res['score']}). Strongest factor: {top[0][0].lower()}; "
               f"weakest: {min(comp, key=comp.get).lower()}. "
               + (f"PlacementNet estimates a {res['probability'] * 100:.0f}% placement probability "
                  f"(ensemble uncertainty ±{sd * 100:.0f} pts). " if model_ready else
                  "PlacementNet is not trained yet (no placement history imported) – score uses the rubric only. "))
    if len(s.assessment_history or []) >= 2:
        summary += f"Assessment trend over the last months is {t['direction']} ({t['delta']:+.1f} pts)."
    else:
        summary += "New profile – the trend will appear after the next assessment."
    cold = {}
    if imputed:
        cr = predictor.cold_start_range(db, s, imputed)
        if cr:
            scores = []
            for row, pr in zip(cr["rows"], cr["probs"]):
                tmp = Student(**{c: getattr(s, c) for c in ("cgpa", "active_backlogs", "backlog_history", "skills",
                                                              "certifications", "projects", "internships", "preferred_roles",
                                                              "branch")},
                              aptitude_score=row["aptitude_score"], coding_score=row["coding_score"],
                              mock_interview_score=row["mock_interview_score"],
                              communication_score=row["communication_score"], softskill_score=row["softskill_score"])
                scores.append(RULE_WEIGHT * rubric_score(components(tmp)) + ML_WEIGHT * 100 * float(pr))
            cold = {"probability_range": [cr["p10"], cr["p90"]],
                    "score_range": [round(float(np.percentile(scores, 10)), 1), round(float(np.percentile(scores, 90)), 1)],
                    "level_range": [level_for(float(np.percentile(scores, 10))), level_for(float(np.percentile(scores, 90)))]}
            summary += (f" Until the pending assessments are taken the score could realistically lie between "
                        f"{cold['score_range'][0]} and {cold['score_range'][1]} "
                        f"(placement probability {cr['p10'] * 100:.0f}–{cr['p90'] * 100:.0f}%).")
    if imputed:
        summary += (" PROVISIONAL: " + ", ".join(_LABEL.get(f, f) for f in imputed) +
                    " not yet assessed and estimated from the branch median; complete them for a final score.")
    return {**res, "contributions": {k: round(WEIGHTS[k] * v * RULE_WEIGHT, 1) for k, v in comp.items()},
            "strengths": strengths, "weaknesses": weaknesses, "flags": flags, "trend": t,
            "ml_factors": predictor.explain(db, s), "summary": summary, "probability_std": round(sd, 4),
            "provisional": bool(imputed), "imputed_fields": [_LABEL.get(f, f) for f in imputed], "cold_start": cold}


_LABEL = {"aptitude_score": "aptitude", "coding_score": "coding", "mock_interview_score": "mock interview",
          "communication_score": "communication", "softskill_score": "soft skills", "tenth_pct": "10th %",
          "twelfth_pct": "12th %"}


def skill_gap(s: Student, role: str | None = None) -> dict:
    role = role or ((s.preferred_roles or [None])[0] if (s.preferred_roles or [None])[0] in ROLE_PROFILES
                    else best_roles(s, 1)[0]["role"])
    prof = ROLE_PROFILES[role]["skills"]
    items = []
    for skill, w in sorted(prof.items(), key=lambda kv: -kv[1]):
        have = s.skills.get(skill, 0)
        gap = max(0, TARGET_PROFICIENCY - have)
        res = RESOURCES.get(skill, (f"Curated {skill} practice track", "—"))
        items.append({"skill": skill, "category": category_of(skill), "weight": w, "have": have,
                      "target": TARGET_PROFICIENCY, "gap": gap, "priority": round(w * gap, 3),
                      "resource": res[0], "certification": res[1]})
    missing = [i for i in items if i["gap"] > 0]
    missing.sort(key=lambda i: -i["priority"])
    cats: dict[str, list[str]] = {}
    for i in missing:
        cats.setdefault(i["category"], []).append(i["skill"])
    return {"role": role, "coverage": round(role_coverage(s.skills, role) * 100, 1), "items": items,
            "gaps": missing, "gap_categories": cats, "recommended_roles": best_roles(s)}


def preparation_plan(db, s: Student) -> list[dict]:
    """Personalised, gamified 6-week preparation plan (XP points per task)."""
    gap = skill_gap(s)
    comp = components(s)
    tasks = []
    for g in gap["gaps"][:3]:
        tasks.append({"week": len(tasks) + 1, "focus": f"Learn {g['skill']}", "action":
                      f"Complete '{g['resource']}' and build a mini-project using {g['skill']}",
                      "certification": g["certification"], "xp": 150})
    if comp["Aptitude"] < 65:
        tasks.append({"week": len(tasks) + 1, "focus": "Aptitude", "action":
                      "Solve 30 quantitative + 20 logical-reasoning questions daily; take 2 timed mocks/week",
                      "certification": "—", "xp": 100})
    if comp["Interview"] < 65:
        tasks.append({"week": len(tasks) + 1, "focus": "Mock interviews", "action":
                      "Book 3 AI mock interviews + 1 panel mock with alumni; review feedback",
                      "certification": "—", "xp": 120})
    if comp["Communication"] < 65:
        tasks.append({"week": len(tasks) + 1, "focus": "Communication", "action":
                      "Attend communication lab twice a week; record a 2-min self-introduction",
                      "certification": "—", "xp": 80})
    if s.coding_score < 60 and s.branch in ("CSE", "IT", "ECE"):
        tasks.append({"week": len(tasks) + 1, "focus": "Coding", "action":
                      "LeetCode 75 plan – 1 easy + 1 medium problem per day", "certification": "—", "xp": 120})
    if not tasks:
        tasks.append({"week": 1, "focus": "Stretch goals", "action":
                      "Target Dream-tier drives: system design basics and an advanced certification",
                      "certification": "—", "xp": 200})
    return tasks[:6]
