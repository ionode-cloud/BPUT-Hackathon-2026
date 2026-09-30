"""Recruiter requirement parsing + recruiter-student matching & ranking.

Hybrid rule + neural model (PyTorch):
  1. Hard eligibility rules (branch, CGPA, active backlogs, one-offer policy)
  2. Six interpretable fit components in [0, 1]:
        required-skill match · preferred-skill match · semantic similarity
        (Skill2Vec embeddings, cosine) · project/certification relevance ·
        mock-interview vs recruiter benchmark · overall readiness
  3. FitNet (PyTorch) combines them: learned factor weights (initialised at the
     expert prior 40/10/10/10/15/15) + a small residual MLP, trained with a
     pairwise RankNet loss on recruiter decisions from completed drives
  4. Explainable decision text + per-factor contribution breakdown
"""
from __future__ import annotations

import re

import numpy as np

from ..ml.fitnet import COMPONENTS
from ..models import Application, Drive, Job, Offer, Student
from . import ai_models, readiness
from .skills import category_of, extract_skills

W = ai_models.EXPERT_PRIOR  # expert prior; FitNet learns the deployed weights
SHORTLIST_THRESHOLD = 55
DREAM_MULTIPLIER = 1.5  # placed students may only sit for offers >= 1.5x current CTC
BRANCH_WORDS = {"CSE": ["cse", "computer science"], "IT": ["it", "information technology"],
                "ECE": ["ece", "electronics", "e&tc"], "EEE": ["eee", "electrical"],
                "MECH": ["mech", "mechanical"], "CIVIL": ["civil"]}



# interchangeable technologies – partial credit (60%) when a sibling is known
SUBSTITUTES = [{"aws", "azure", "gcp"}, {"java", "python", "c++", "go"}, {"pytorch", "tensorflow"},
               {"power bi", "excel"}, {"solidworks", "cad/cam"}, {"selenium", "manual testing"},
               {"c", "embedded c"}, {"docker", "kubernetes"}, {"react", "javascript"}]
SUB_CREDIT = .6


def skill_credit(skills: dict, k: str) -> tuple[float, str | None]:
    """Proficiency credit 0..1 for required skill k (level 4 = full credit)."""
    v = skills.get(k, 0)
    best, via = min(v, 4) / 4, None
    for grp in SUBSTITUTES:
        if k in grp:
            for alt in grp - {k}:
                c = SUB_CREDIT * min(skills.get(alt, 0), 4) / 4
                if c > best:
                    best, via = c, alt
    return best, via


# --------------------------------------------------------------------- JD parsing (NLP)
def parse_jd(text: str) -> dict:
    lower = text.lower()
    split = re.split(r"good to have|preferred|nice to have|bonus|plus points?", lower, maxsplit=1)
    required = extract_skills(text[: len(split[0])])
    preferred = [s for s in extract_skills(text[len(split[0]):]) if s not in required] if len(split) > 1 else []
    min_cgpa = None
    for pat in (r"(\d{1,2}(?:\.\d{1,2})?)\s*\+?\s*(?:cgpa|cpi|gpa)\b",
                r"(?:cgpa|cpi|gpa)\s*(?:of|>=|≥|:|above|min(?:imum)?|at ?least|cut-?off)?\s*(?:of\s*)?(\d{1,2}(?:\.\d{1,2})?)"):
        m = re.search(pat, lower)
        if m and 4 <= float(m.group(1)) <= 10:
            min_cgpa = float(m.group(1))
            break
    bl = re.search(r"(?:not more than|max(?:imum)?|upto|up to|<=)\s*(\d+)\s*(?:active\s*)?backlog", lower)
    no_bl = re.search(r"no (?:active )?backlogs?", lower)
    max_backlogs = int(bl.group(1)) if bl else (0 if no_bl else None)
    branches = [b for b, words in BRANCH_WORDS.items()
                if any(re.search(rf"(?<![a-z]){re.escape(w)}(?![a-z])", lower) for w in words)]
    if re.search(r"all (?:branches|disciplines|streams)|any branch", lower):
        branches = list(BRANCH_WORDS)
    ctc = re.search(r"(\d{1,2}(?:\.\d{1,2})?)\s*(?:lpa|lakhs?|l\.p\.a)", lower)
    jtype = "Intern+PPO" if "ppo" in lower else "Internship" if "intern" in lower else "FTE"
    fam, conf, top3 = ai_models.classify_role(required + preferred) if required + preferred else (None, 0.0, [])
    return {"role_confidence": round(conf, 3), "role_candidates": top3,
            "required_skills": required, "preferred_skills": preferred, "min_cgpa": min_cgpa,
            "max_active_backlogs": max_backlogs, "allowed_branches": branches,
            "ctc_lpa": float(ctc.group(1)) if ctc else None, "job_type": jtype, "role_family": fam,
            "skill_categories": sorted({category_of(s) for s in required + preferred})}


# --------------------------------------------------------------------- embeddings (Skill2Vec, PyTorch)
def build_embeddings(db, force: bool = False):
    if force:
        ai_models.invalidate_vectors()
    return ai_models.skill2vec(db, force=False)


def semantic_similarity(db, s: Student, j: Job) -> float:
    return ai_models.semantic(db, s, j)


# --------------------------------------------------------------------- eligibility
def eligibility(s: Student, j: Job, current_offer_ctc: float | None = None) -> tuple[bool, list[str], list[str]]:
    ok, passed, failed = True, [], []
    if s.branch in j.allowed_branches:
        passed.append(f"Branch {s.branch} is eligible")
    else:
        ok = False
        failed.append(f"Branch {s.branch} is not in the eligible list ({', '.join(j.allowed_branches)})")
    if s.cgpa >= j.min_cgpa:
        passed.append(f"CGPA {s.cgpa} meets the {j.min_cgpa} cut-off")
    else:
        ok = False
        failed.append(f"CGPA {s.cgpa} is below the {j.min_cgpa} cut-off")
    if s.active_backlogs <= j.max_active_backlogs:
        passed.append(f"{s.active_backlogs} active backlog(s) within the limit of {j.max_active_backlogs}")
    else:
        ok = False
        failed.append(f"{s.active_backlogs} active backlog(s) exceed the limit of {j.max_active_backlogs}")
    if current_offer_ctc is not None:
        if j.ctc_lpa >= DREAM_MULTIPLIER * current_offer_ctc:
            passed.append(f"Dream-offer rule: {j.ctc_lpa} LPA ≥ {DREAM_MULTIPLIER}× current offer ({current_offer_ctc} LPA)")
        else:
            ok = False
            failed.append(f"Already holds a {current_offer_ctc} LPA offer; one-offer policy allows only ≥ "
                          f"{DREAM_MULTIPLIER * current_offer_ctc:.1f} LPA")
    return ok, passed, failed


def accepted_offer_ctc(db) -> dict[int, float]:
    rows = db.query(Offer).filter(Offer.status.in_(["Accepted", "Joined"])).all()
    out: dict[int, float] = {}
    for o in rows:
        out[o.student_id] = max(out.get(o.student_id, 0), o.ctc_lpa)
    return out


# --------------------------------------------------------------------- fit score
def fit_components(db, s: Student, j: Job, readiness_score: float) -> dict:
    req = j.required_skills or []
    matched = {k: s.skills.get(k, 0) for k in req}
    credits = {k: skill_credit(s.skills, k) for k in req}
    skill_match = np.mean([c for c, _ in credits.values()]) if req else 0.5
    pref = j.preferred_skills or []
    pref_match = np.mean([skill_credit(s.skills, k)[0] for k in pref]) if pref else 0.5
    sem = semantic_similarity(db, s, j)  # cosine of Skill2Vec profile / JD embeddings
    wanted = set(req) | set(pref)
    proj_hits = sum(1 for p in s.projects if wanted & set(p["tech"]))
    cert_hits = sum(1 for c in s.certifications if c["skill"] in wanted)
    relevance = min(1.0, .3 * proj_hits + .35 * cert_hits + .15 * s.internships)
    interview = float(np.clip(.5 + (s.mock_interview_score - j.mock_benchmark) / 40, 0, 1))
    return {"skills": float(skill_match), "preferred": float(pref_match), "semantic": float(np.clip((sem - SEM_LO) / (SEM_HI - SEM_LO), 0, 1)),
            "relevance": relevance, "interview": interview, "readiness": readiness_score / 100,
            "_matched": matched, "_subs": {k: v for k, (_, v) in credits.items() if v}, "_proj_hits": proj_hits, "_cert_hits": cert_hits,
            "_extra": extra_features(s, j)}


SEM_LO, SEM_HI = .2, .9  # cosine range mapped to 0..1


def extra_features(s: Student, j: Job) -> list[float]:
    return [float(np.clip((s.cgpa - j.min_cgpa) / 2, -1, 2)),
            float(np.clip((s.mock_interview_score - j.mock_benchmark) / 20, -2, 2))]


def fit_scores(comps: list[dict]) -> list[float]:
    """Batch FitNet inference; stores the neural residual adjustment in comp['_adj']."""
    if not comps:
        return []
    C = np.array([[c[k] for k in COMPONENTS] for c in comps], np.float32)
    E = np.array([c["_extra"] for c in comps], np.float32)
    sc, adj = ai_models.fitnet().score(C, E)
    for c, a in zip(comps, adj):
        c["_adj"] = float(a)
    return [round(float(np.clip(100 * v, 0, 100)), 1) for v in sc]


def fit_score(comp: dict) -> float:
    return fit_scores([comp])[0]


LABELS = {"skills": "required-skill match", "preferred": "good-to-have skills", "semantic": "profile–JD similarity",
          "relevance": "project/certification relevance", "interview": "mock-interview vs benchmark",
          "readiness": "overall readiness"}


def explain_pair(s: Student, j: Job, eligible: bool, passed: list[str], failed: list[str], comp: dict | None,
                 score: float, decision: str) -> dict:
    if not eligible:
        text = f"Not Eligible: {'; '.join(failed)}."
        return {"decision": decision, "summary": text, "passed": passed, "failed": failed, "factors": [],
                "missing_skills": [], "gap_categories": {}}
    matched = comp["_matched"]
    subs = comp.get("_subs", {})
    missing = [k for k, v in matched.items() if v < 2 and k not in subs]
    weak = [k for k, v in matched.items() if v == 2]
    cats: dict[str, list[str]] = {}
    for k in missing:
        cats.setdefault(category_of(k), []).append(k)
    parts = []
    if subs:
        parts.append("transferable skills credited: " + ", ".join(f"{v} for {k}" for k, v in subs.items()))
    parts.insert(0, f"The student's CGPA ({s.cgpa}) meets the eligibility criteria ({j.min_cgpa})")
    if missing:
        parts.append("the required skill set shows a gap in " +
                     ", ".join(f"{c} ({', '.join(v)})" for c, v in cats.items()))
    else:
        parts.append("there are no critical gaps in the required skill set"
                     + (f" (basic level in {', '.join(weak)})" if weak else ""))
    gap = s.mock_interview_score - j.mock_benchmark
    parts.append(f"the mock-interview score ({s.mock_interview_score:.0f}) is "
                 f"{'above' if gap > 0 else 'at' if gap == 0 else 'below'} the recruiter's benchmark ({j.mock_benchmark:.0f})")
    lead = {"Shortlisted": "Shortlisted", "Waitlisted": "Waitlisted (above threshold, beyond pool size)",
            "Below Threshold": "Below Threshold", "Selected": "Selected", "Rejected": "Not selected after interview"}[decision]
    text = f"{lead} (fit {score}/100): " + ", ".join(parts[:-1]) + (", and " if len(parts) > 1 else "") + parts[-1] + "."
    lw = ai_models.fitnet().learned_weights()
    factors = sorted([{"factor": LABELS[k], "score": round(comp[k] * 100, 1), "weight": lw[k],
                       "contribution": round(100 * lw[k] * comp[k], 1)} for k in COMPONENTS], key=lambda f: -f["contribution"])
    adj = round(100 * comp.get("_adj", 0.0), 1)
    if abs(adj) >= .1:
        factors.append({"factor": "learned interaction (CGPA & interview margins, FitNet MLP)", "score": None, "weight": None, "contribution": adj})
    return {"decision": decision, "summary": text, "passed": passed, "failed": failed, "factors": factors,
            "missing_skills": missing, "gap_categories": cats,
            "projects_relevant": comp["_proj_hits"], "certs_relevant": comp["_cert_hits"]}


def pool_size(j: Job) -> int:
    return max(10, j.openings * 4)


def score_drive(db, drive: Drive, students: list[Student] | None = None) -> list[dict]:
    j = drive.job
    students = students or db.query(Student).filter(Student.campus_id == drive.campus_id).all()
    ready = {s.id: s.readiness_score for s in students}
    offers = accepted_offer_ctc(db)
    rows = []
    for s in students:
        ok, passed, failed = eligibility(s, j, offers.get(s.id))
        comp = fit_components(db, s, j, ready[s.id]) if ok else None
        rows.append({"student": s, "eligible": ok, "passed": passed, "failed": failed, "comp": comp, "score": 0.0})
    elig = [r for r in rows if r["eligible"]]
    for r, sc in zip(elig, fit_scores([r["comp"] for r in elig])):
        r["score"] = sc
    rows.sort(key=lambda r: (-r["eligible"], -r["score"]))
    return rows


def run_matching(db, drive_id: int, auto_shortlist: bool = True) -> dict:
    drive = db.get(Drive, drive_id)
    j = drive.job
    rows = score_drive(db, drive)
    keep = {a.student_id: a.status for a in db.query(Application).filter_by(drive_id=drive_id)
            if a.status in ("Selected", "Rejected")}
    db.query(Application).filter_by(drive_id=drive_id).delete()
    cap = pool_size(j)
    n_short = 0
    for rank, r in enumerate(rows, start=1):
        s = r["student"]
        if not r["eligible"]:
            decision = "Not Eligible"
        elif r["score"] >= SHORTLIST_THRESHOLD and n_short < cap and auto_shortlist:
            decision = "Shortlisted"
            n_short += 1
        elif r["score"] >= SHORTLIST_THRESHOLD:
            decision = "Waitlisted"
        else:
            decision = "Below Threshold"
        status = keep.get(s.id, decision)
        expl = explain_pair(s, j, r["eligible"], r["passed"], r["failed"], r["comp"], r["score"],
                            status if status in ("Selected", "Rejected") else decision)
        db.add(Application(student_id=s.id, drive_id=drive_id, eligible=r["eligible"], fit_score=r["score"],
                           fit_level=readiness.level_for(r["score"]) if r["eligible"] else "Not Eligible",
                           rank=rank if r["eligible"] else None, status=status, explanation=expl))
    db.commit()
    return {"drive_id": drive_id, "evaluated": len(rows), "eligible": sum(r["eligible"] for r in rows),
            "shortlisted": n_short, "pool_size": cap}


def ranking_rationale(apps: list[Application], top: int = 10) -> list[str]:
    """Explain why candidate i is ranked above candidate i+1 (recruiter view)."""
    out = []
    apps = [a for a in apps if a.eligible][: top + 1]
    for a, b in zip(apps, apps[1:]):
        fa = {f["factor"]: f["contribution"] for f in a.explanation["factors"]}
        fb = {f["factor"]: f["contribution"] for f in b.explanation["factors"]}
        diff = max(fa, key=lambda k: fa[k] - fb.get(k, 0))
        out.append(f"#{a.rank} ranks above #{b.rank} (+{a.fit_score - b.fit_score:.1f}) mainly due to stronger "
                   f"{diff} (+{fa[diff] - fb.get(diff, 0):.1f} pts).")
    return out


def recommend_drives(db, s: Student, drives: list[Drive]) -> list[dict]:
    offers = accepted_offer_ctc(db)
    out = []
    for d in drives:
        j = d.job
        ok, passed, failed = eligibility(s, j, offers.get(s.id))
        comp = fit_components(db, s, j, s.readiness_score) if ok else None
        score = fit_score(comp) if ok else 0
        decision = "Below Threshold" if ok and score < SHORTLIST_THRESHOLD else ("Shortlisted" if ok else "Not Eligible")
        expl = explain_pair(s, j, ok, passed, failed, comp, score, decision)
        out.append({"drive_id": d.id, "drive": d.name, "company": j.company.name, "role": j.title,
                    "ctc_lpa": j.ctc_lpa, "date": d.date.isoformat() if d.date else None, "eligible": ok,
                    "fit_score": score, "fit_level": readiness.level_for(score) if ok else "Not Eligible",
                    "explanation": expl})
    out.sort(key=lambda r: (-r["eligible"], -r["fit_score"]))
    return out
