"""Placement-outcome engine backed by PlacementNet (PyTorch deep ensemble).

Used for: the ML half of the readiness score, the 'at-risk of remaining
unplaced' flag, per-student Integrated-Gradients explanations and global
feature importance.
"""
from __future__ import annotations

import hashlib
import threading

import numpy as np
import pandas as pd

from ..ml import core
from ..ml.placement import DeepEnsemble, PlacementNet, fit_ensemble, integrated_gradients
from ..models import HistoricalPlacement, Student

BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]
NUM_FEATURES = ["cgpa", "active_backlogs", "backlog_history", "n_skills", "skill_depth", "n_certs",
                "n_projects", "internships", "aptitude_score", "coding_score", "mock_interview_score",
                "communication_score", "softskill_score"]
FEATURE_LABELS = {
    "cgpa": "CGPA", "active_backlogs": "active backlogs", "backlog_history": "backlog history",
    "n_skills": "number of skills", "skill_depth": "skill proficiency", "n_certs": "certifications",
    "n_projects": "projects", "internships": "internships", "aptitude_score": "aptitude score",
    "coding_score": "coding score", "mock_interview_score": "mock-interview score",
    "communication_score": "communication score", "softskill_score": "soft-skill score",
}
ALL_LABELS = [FEATURE_LABELS[f] for f in NUM_FEATURES] + [f"branch={b}" for b in BRANCHES]
AT_RISK_THRESHOLD = 0.45
MIN_HISTORY = 100  # below this PlacementNet is not trained; readiness falls back to the rubric
N_MEMBERS, HIDDEN, EPOCHS = 5, (64, 32), 300

_lock = threading.Lock()
_state: dict = {}


def history_frame(db) -> pd.DataFrame:
    rows = db.query(HistoricalPlacement).all()
    return pd.DataFrame([{**{f: getattr(r, f) for f in NUM_FEATURES}, "branch": r.branch,
                          "batch": r.batch, "placed": int(r.placed), "ctc": r.ctc_lpa,
                          "company": r.company, "top_skills": r.top_skills} for r in rows])


def featurise(df: pd.DataFrame) -> np.ndarray:
    X = df[NUM_FEATURES].astype(float).to_numpy()
    onehot = np.stack([(df["branch"] == b).astype(float).to_numpy() for b in BRANCHES], axis=1)
    return np.hstack([X, onehot]).astype(np.float32)


def student_row(s: Student) -> dict:
    vals = list(s.skills.values()) or [0]
    return {"cgpa": s.cgpa, "active_backlogs": s.active_backlogs, "backlog_history": s.backlog_history,
            "n_skills": len(s.skills), "skill_depth": float(np.mean(vals)), "n_certs": len(s.certifications),
            "n_projects": len(s.projects), "internships": s.internships, "aptitude_score": s.aptitude_score,
            "coding_score": s.coding_score, "mock_interview_score": s.mock_interview_score,
            "communication_score": s.communication_score, "softskill_score": s.softskill_score,
            "branch": s.branch}


def _fingerprint(df: pd.DataFrame) -> str:
    raw = f"{len(df)}|{df['placed'].sum()}|{df['cgpa'].sum():.4f}|{N_MEMBERS}|{HIDDEN}|{EPOCHS}"
    return hashlib.md5(raw.encode(), usedforsecurity=False).hexdigest()


def train(db, force: bool = False) -> dict:
    with _lock:
        if _state and not force:
            return _state
        df = history_frame(db)
        if len(df) < MIN_HISTORY or df["placed"].nunique() < 2:
            _state.clear()
            _state.update(model=None, n_train=len(df))
            core.register("PlacementNet (deep ensemble)", None, parameters=0, architecture="not trained",
                          task="P(placed) / at-risk prediction", status=f"untrained – needs ≥{MIN_HISTORY} historical "
                          f"records with both outcomes (has {len(df)}); import history via /api/admin/history/import")
            return _state
        X, y = featurise(df), df["placed"].to_numpy().astype(np.float32)
        fp = _fingerprint(df)
        cached = None if force else core.load("placement_net", fp)
        mean, std = X.mean(0), X.std(0)
        if cached:
            state, meta = cached
            ens = DeepEnsemble([PlacementNet(X.shape[1], mean, std, hidden=HIDDEN) for _ in range(N_MEMBERS)]).to(core.DEVICE)
            ens.load_state_dict(state)
            ens.eval()
            logs = meta["logs"]
        else:
            ens, logs = fit_ensemble(X, y, n_members=N_MEMBERS, hidden=HIDDEN, epochs=EPOCHS)
            core.save("placement_net", ens.state_dict(), {"fingerprint": fp, "logs": logs})
        base = np.median(X, axis=0)
        _state.update(model=ens, baseline=base, medians=df[NUM_FEATURES].median().to_dict(), n_train=len(df),
                      importance=None, X_sample=X[np.random.default_rng(0).choice(len(X), min(400, len(X)), replace=False)])
        p, _ = ens.predict(X)
        core.register("PlacementNet (deep ensemble)", ens, task="P(placed) / at-risk prediction",
                      inputs=f"{X.shape[1]} features (13 numeric + 6 branch one-hot), standardised in-graph",
                      members=N_MEMBERS, hidden_layers=list(HIDDEN), loss="BCEWithLogits, AdamW, cosine LR, early stopping",
                      trained_on=f"{len(df)} historical placement records", train_auc=round(core.roc_auc(y, p), 3),
                      epochs_run=[item["epochs_run"] for item in logs], best_val_loss=[item["best_val_loss"] for item in logs],
                      train_seconds=round(sum(item["train_seconds"] for item in logs), 2), history=logs[0]["history"],
                      loaded_from_cache=bool(cached))
        return _state


def is_trained(db) -> bool:
    return train(db).get("model") is not None


def _X(students: list[Student]) -> np.ndarray:
    return featurise(pd.DataFrame([student_row(s) for s in students]))


def predict(db, students: list[Student]) -> np.ndarray | None:
    """P(placed) per student, or None when the model is not trained yet."""
    st = train(db)
    if st.get("model") is None:
        return None
    p, _ = st["model"].predict(_X(students))
    return p


def predict_with_uncertainty(db, students: list[Student]) -> tuple[np.ndarray | None, np.ndarray | None]:
    st = train(db)
    if st.get("model") is None:
        return None, None
    return st["model"].predict(_X(students))


def predict_rows(db, rows: list[dict]) -> np.ndarray:
    p, _ = train(db)["model"].predict(featurise(pd.DataFrame(rows)))  # caller checks is_trained
    return p


def cold_start_range(db, s: Student, fields: list[str], draws: int = 60, seed: int = 0) -> dict:
    """Monte-Carlo over the not-yet-assessed fields: resample them from real students of the
    same branch and report the spread of P(placed) – uncertainty due to missing information."""
    if not is_trained(db):
        return {}
    pool = db.query(Student).filter(Student.branch == s.branch, Student.id != s.id).all()
    fields = [f for f in fields if f in NUM_FEATURES]
    if not pool or not fields:
        return {}
    rng = np.random.default_rng(seed)
    base = student_row(s)
    rows = []
    for _ in range(draws):
        r = dict(base)
        donor = pool[rng.integers(len(pool))]
        for f in fields:
            r[f] = getattr(donor, f)
        rows.append(r)
    p = predict_rows(db, rows)
    return {"p10": round(float(np.percentile(p, 10)), 4), "p90": round(float(np.percentile(p, 90)), 4),
            "rows": rows, "probs": p}


def explain(db, s: Student, top: int = 5) -> list[dict]:
    """Integrated Gradients vs. the historical cohort median (branch held at the
    student's own branch). Impact = contribution to P(placed) in probability units."""
    st = train(db)
    if st.get("model") is None:
        return []
    x = _X([s])[0]
    base = st["baseline"].copy()
    base[len(NUM_FEATURES):] = x[len(NUM_FEATURES):]
    attr = integrated_gradients(st["model"], x[None, :], base)[0]
    row = student_row(s)
    out = []
    for i, f in enumerate(NUM_FEATURES):
        if abs(attr[i]) < .005:
            continue
        out.append({"feature": FEATURE_LABELS[f], "value": round(float(row[f]), 2),
                    "cohort_median": round(float(st["medians"][f]), 2), "impact": round(float(attr[i]), 3)})
    out.sort(key=lambda d: -abs(d["impact"]))
    return out[:top]


def feature_importance(db) -> list[dict]:
    """Global importance = mean |Integrated Gradients| over a sample of historical students."""
    st = train(db)
    if st.get("model") is None:
        return []
    if st.get("importance") is None:
        attr = integrated_gradients(st["model"], st["X_sample"], st["baseline"], steps=24)
        imp = np.abs(attr).mean(0)
        imp = imp / imp.sum()
        st["importance"] = sorted([{"feature": n, "importance": round(float(v), 4)} for n, v in zip(ALL_LABELS, imp)],
                                  key=lambda d: -d["importance"])
    return st["importance"]
