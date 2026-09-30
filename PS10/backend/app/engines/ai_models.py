"""Lifecycle of the PyTorch models used by matching & JD parsing:
Skill2Vec embeddings, FitNet learned ranker and the JD role classifier.
(PlacementNet lives in predictor.py.)"""
from __future__ import annotations

import hashlib
import threading

import numpy as np
import torch

from ..ml import core
from ..ml.fitnet import COMPONENTS, FitNet, train_fitnet
from ..ml.roleclf import RoleClassifier, synth_jds, train_roleclf
from ..ml.skill2vec import Skill2Vec
from ..models import Application, Drive, Job, Student
from .skills import ROLE_PROFILES, SKILL_CATEGORY

EXPERT_PRIOR = {"skills": .40, "preferred": .10, "semantic": .10, "relevance": .10, "interview": .15, "readiness": .15}
SKILLS = sorted(SKILL_CATEGORY)
ROLES = list(ROLE_PROFILES)
VOCAB = SKILLS + [f"role:{r}" for r in ROLES] + [f"cat:{c}" for c in sorted(set(SKILL_CATEGORY.values()))]

_lock = threading.RLock()
_s: dict = {}


# ------------------------------------------------------------------ Skill2Vec
def _contexts(db) -> list[list[str]]:
    ctx: list[list[str]] = []
    for s in db.query(Student).all():
        toks = [k for k, v in s.skills.items() if v >= 2] + [f"role:{r}" for r in (s.preferred_roles or [])]
        ctx.append(toks)
        for p in s.projects:
            ctx.append(list(p["tech"]))
    for j in db.query(Job).all():
        ctx.append(list(j.required_skills) + list(j.preferred_skills) + [f"role:{j.role_family}"])
    for r, prof in ROLE_PROFILES.items():
        for _ in range(15):
            ctx.append(list(prof["skills"]) + [f"role:{r}"])
    for sk, cat in SKILL_CATEGORY.items():
        for _ in range(8):
            ctx.append([sk, f"cat:{cat}"])
    return ctx


def skill2vec(db, force: bool = False) -> Skill2Vec:
    with _lock:
        if "s2v" in _s and not force:
            return _s["s2v"]
        n_s, n_j = db.query(Student).count(), db.query(Job).count()
        fp = hashlib.md5(f"{n_s}|{n_j}|{len(VOCAB)}|v1".encode(), usedforsecurity=False).hexdigest()
        m = Skill2Vec(VOCAB, dim=32)
        cached = None if force else core.load("skill2vec", fp)
        if cached:
            m.load_state(cached[0])
            log = cached[1]["log"]
        else:
            log = m.fit(_contexts(db))
            core.save("skill2vec", m.model.state_dict(), {"fingerprint": fp, "log": log})
        _s["s2v"] = m
        _s["svec"], _s["jvec"] = {}, {}
        core.register("Skill2Vec (SGNS embeddings)", m.model, task="Dense skill / role embeddings for semantic matching",
                      inputs=f"vocabulary of {len(VOCAB)} tokens (skills, roles, categories)", dim=32,
                      loss="Skip-gram negative sampling (k=5), Adam", trained_on=f"{log['pairs']} co-occurrence pairs",
                      epochs_run=log["epochs_run"], train_seconds=log["train_seconds"], history=log["history"],
                      examples={t: m.nearest(t, 3, prefix_filter="skill") for t in ("aws", "react", "verilog", "solidworks")},
                      loaded_from_cache=bool(cached))
        return m


def student_vec(db, s: Student) -> np.ndarray:
    m = skill2vec(db)
    v = _s["svec"].get(s.id)
    if v is None:
        w = {k: float(p) for k, p in s.skills.items()}
        for p in s.projects:
            for t in p["tech"]:
                w[t] = w.get(t, 0) + .5
        for r in s.preferred_roles or []:
            w[f"role:{r}"] = 2.0
        v = _s["svec"][s.id] = m.embed(w)
    return v


def job_vec(db, j: Job) -> np.ndarray:
    m = skill2vec(db)
    v = _s["jvec"].get(j.id)
    if v is None:
        w = dict.fromkeys(j.required_skills, 3.0)
        w.update(dict.fromkeys(j.preferred_skills, 1.5))
        w[f"role:{j.role_family}"] = 3.0
        v = _s["jvec"][j.id] = m.embed(w)
    return v


def invalidate_vectors(student_id: int | None = None) -> None:
    if "svec" in _s:
        if student_id is None:
            _s["svec"].clear()
            _s["jvec"].clear()
        else:
            _s["svec"].pop(student_id, None)


def semantic(db, s: Student, j: Job) -> float:
    return float(student_vec(db, s) @ job_vec(db, j))


# ------------------------------------------------------------------ FitNet
def fitnet() -> FitNet:
    with _lock:
        if "fit" not in _s:
            _s["fit"] = FitNet(EXPERT_PRIOR).to(core.DEVICE).eval()
            _s["fit_trained"] = False
        return _s["fit"]


def training_groups(db, drive_ids: list[int] | None = None) -> list[tuple[np.ndarray, np.ndarray, np.ndarray]]:
    from .matching import extra_features, fit_components  # local import (circular)
    groups = []
    q = db.query(Drive).filter(Drive.status == "Completed")
    for d in q.all():
        if drive_ids is not None and d.id not in drive_ids:
            continue
        apps = db.query(Application).filter(Application.drive_id == d.id,
                                            Application.status.in_(["Selected", "Rejected"])).all()
        comps, extras, labels = [], [], []
        for a in apps:
            s = db.get(Student, a.student_id)
            c = fit_components(db, s, d.job, s.readiness_score)
            comps.append([c[k] for k in COMPONENTS])
            extras.append(extra_features(s, d.job))
            labels.append(1 if a.status == "Selected" else 0)
        if comps:
            groups.append((np.array(comps, np.float32), np.array(extras, np.float32), np.array(labels)))
    return groups


def train_fit(db) -> dict:
    with _lock:
        model = FitNet(EXPERT_PRIOR)
        groups = training_groups(db)
        log = train_fitnet(model, groups)
        _s["fit"], _s["fit_trained"] = model.to(core.DEVICE).eval(), log["pairs"] > 0
        n_lab = int(sum(len(g[2]) for g in groups))
        core.register("FitNet (learned ranker)", model, task="Recruiter–student fit score & ranking",
                      inputs="6 interpretable fit components + CGPA margin + mock-interview gap",
                      loss="Pairwise RankNet (Selected ≻ Rejected per drive) + L2 pull to expert prior, Adam",
                      trained_on=f"{n_lab} recruiter decisions from {len(groups)} completed drives ({log['pairs']} pairs)",
                      expert_prior=EXPERT_PRIOR, learned_weights=model.learned_weights(),
                      epochs_run=log["epochs_run"], train_seconds=log["train_seconds"], history=log["history"])
        return log


# ------------------------------------------------------------------ JD role classifier
def role_classifier() -> RoleClassifier:
    with _lock:
        if "role" in _s:
            return _s["role"]
        fp = hashlib.md5(f"{len(SKILLS)}|{len(ROLES)}|v1".encode(), usedforsecurity=False).hexdigest()
        m = RoleClassifier(len(SKILLS), len(ROLES)).to(core.DEVICE)
        cached = core.load("role_classifier", fp)
        if cached:
            m.load_state_dict(cached[0])
            log = cached[1]["log"]
        else:
            X, y = synth_jds(ROLE_PROFILES, SKILLS)
            log = train_roleclf(m, X, y)
            core.save("role_classifier", m.state_dict(), {"fingerprint": fp, "log": log})
        m.eval()
        _s["role"] = m
        core.register("JD Role Classifier", m, task="Infer role family from skills extracted from a JD",
                      inputs=f"multi-hot over {len(SKILLS)} canonical skills", classes=len(ROLES),
                      loss="Cross-entropy, Adam", trained_on=f"{log['train_samples']} synthetic JDs sampled from role profiles",
                      holdout_accuracy=log["holdout_accuracy"], epochs_run=log["epochs_run"],
                      train_seconds=log["train_seconds"], history=log["history"], loaded_from_cache=bool(cached))
        return m


@torch.inference_mode()
def classify_role(skills: list[str]) -> tuple[str, float, list[dict]]:
    m = role_classifier()
    v = torch.zeros(1, len(SKILLS), device=core.DEVICE)
    for s in skills:
        if s in SKILLS:
            v[0, SKILLS.index(s)] = 1
    p = torch.softmax(m(v), -1)[0].cpu().numpy()
    order = np.argsort(-p)
    return ROLES[order[0]], float(p[order[0]]), [{"role": ROLES[i], "p": round(float(p[i]), 3)} for i in order[:3]]


def bootstrap_models(db) -> None:
    skill2vec(db)
    role_classifier()
    fitnet()
