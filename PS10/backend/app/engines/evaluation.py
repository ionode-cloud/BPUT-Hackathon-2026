"""Accuracy & performance evaluation of the PyTorch models, matching, parsing and scheduling.
All metrics are implemented in numpy (app/ml/core.py) – no scikit-learn."""
from __future__ import annotations

import time

import numpy as np

from ..ml import core
from ..ml.fitnet import COMPONENTS, FitNet
from ..ml.placement import PlacementNet, fit_ensemble
from ..models import Drive, Student
from ..seed import load_latents, true_fit
from . import ai_models, matching, predictor, readiness, scheduler
from .skills import SKILL_CATEGORY

LABELLED_JDS = [  # hand-labelled, deliberately messy JDs for parser evaluation
    ("We are looking for SDE-1. Must know DSA, Java/Python, OOPs & DBMS. Nice to have: AWS, Docker. "
     "CGPA 7.5+ (CSE/IT only), no active backlogs. CTC 12 LPA.",
     {"required": {"data structures", "java", "python", "oops", "dbms"}, "preferred": {"aws", "docker"},
      "cgpa": 7.5, "branches": {"CSE", "IT"}, "backlogs": 0}),
    ("Hiring Embedded Firmware interns (PPO possible). Skills: Embedded C, ARM/STM32 microcontrollers, FreeRTOS, "
     "PCB design with KiCad. Preferred: Python scripting. Open to ECE, EEE. Min 7 CGPA; max 1 backlog.",
     {"required": {"embedded c", "microcontrollers", "rtos", "pcb design"}, "preferred": {"python"},
      "cgpa": 7.0, "branches": {"ECE", "EEE"}, "backlogs": 1}),
    ("Data Analyst role - SQL, Excel, Power BI/Tableau and statistics required. Good to have Python (pandas). "
     "All branches eligible with CGPA >= 6.5. Package 6 LPA.",
     {"required": {"sql", "excel", "power bi", "statistics"}, "preferred": {"python", "pandas"},
      "cgpa": 6.5, "branches": {"CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"}, "backlogs": None}),
    ("Graduate Engineer Trainee (Mechanical). Proficiency in SolidWorks/CATIA, AutoCAD and ANSYS FEA; knowledge "
     "of manufacturing processes. 60% aggregate i.e. 6.5 CGPA. Mechanical only. 4.2 LPA with 1-year bond.",
     {"required": {"solidworks", "autocad", "ansys", "manufacturing"}, "preferred": set(), "cgpa": 6.5,
      "branches": {"MECH"}, "backlogs": None}),
    ("DevOps Engineer: Linux, Docker, Kubernetes (K8s), Jenkins CI/CD, one of AWS/Azure/GCP. Plus points: Go, "
     "Python. B.Tech CSE/IT/ECE, CGPA 7.0, not more than 0 active backlogs. 10 LPA",
     {"required": {"linux", "docker", "kubernetes", "ci/cd", "aws", "azure", "gcp"}, "preferred": {"go", "python"},
      "cgpa": 7.0, "branches": {"CSE", "IT", "ECE"}, "backlogs": 0}),
    ("Full-stack developer (React.js, Node.js/Express, REST APIs, MongoDB/MySQL, HTML CSS). Preferred: TypeScript, "
     "Git. CSE and IT branches, cgpa 7 and above.",
     {"required": {"react", "node.js", "rest api", "sql", "html/css"}, "preferred": {"typescript", "git"},
      "cgpa": 7.0, "branches": {"CSE", "IT"}, "backlogs": None}),
]


def _ndcg(rel_in_pred_order: list[float], k: int) -> float:
    rel = np.asarray(rel_in_pred_order[:k])
    ideal = np.sort(np.asarray(rel_in_pred_order))[::-1][:k]
    disc = 1 / np.log2(np.arange(2, len(rel) + 2))
    dcg = float((rel * disc[: len(rel)]).sum())
    idcg = float((ideal * disc[: len(ideal)]).sum())
    return dcg / idcg if idcg else 0.0


def _metrics(name: str, y: np.ndarray, p: np.ndarray, yhat: np.ndarray | None = None) -> dict:
    yhat = p >= .5 if yhat is None else yhat
    m = core.classification(y, yhat)
    return {"model": name, **{k: round(v, 3) for k, v in m.items()}, "roc_auc": round(core.roc_auc(y, p), 3),
            "brier": round(core.brier(y, np.clip(p, 0, 1)), 3)}


def _single(X, y, hidden, seed=0) -> PlacementNet:
    net = PlacementNet(X.shape[1], X.mean(0), X.std(0), hidden=hidden)
    core.train_binary(net, X, y, seed=seed)
    return net


def _proba(net, X) -> np.ndarray:
    import torch
    with torch.inference_mode():
        return torch.sigmoid(net(torch.tensor(X, dtype=torch.float32, device=core.DEVICE))).cpu().numpy()


def outcome_model(db) -> dict:
    df = predictor.history_frame(db)
    train, test = df[df.batch < 2026], df[df.batch == 2026]
    Xtr, ytr = predictor.featurise(train), train.placed.to_numpy().astype(np.float32)
    Xte, yte = predictor.featurise(test), test.placed.to_numpy()
    out = {"train_rows": len(train), "test_rows": len(test), "split": "temporal: batches 2023-25 → 2026", "models": []}
    ens, _ = fit_ensemble(Xtr, ytr, n_members=predictor.N_MEMBERS, hidden=predictor.HIDDEN)
    p_ens, sd = ens.predict(Xte)
    p_mlp = _proba(_single(Xtr, ytr, predictor.HIDDEN, seed=11), Xte)
    p_lr = _proba(_single(Xtr, ytr, (), seed=0), Xte)
    cg = test.cgpa.to_numpy()
    out["models"] = [_metrics("PlacementNet deep ensemble (5×MLP) – deployed", yte, p_ens),
                     _metrics("Single MLP (64-32)", yte, p_mlp),
                     _metrics("Logistic regression (PyTorch linear)", yte, p_lr),
                     _metrics("Baseline: CGPA only", yte, (cg - 5) / 5, cg >= 7.0)]
    out["mean_ensemble_std"] = round(float(sd.mean()), 3)
    risk = p_ens < predictor.AT_RISK_THRESHOLD
    m = core.classification(yte == 0, risk)
    out["at_risk"] = {"threshold": predictor.AT_RISK_THRESHOLD, **{k: round(m[k], 3) for k in ("precision", "recall", "f1")}}
    X, y = predictor.featurise(df), df.placed.to_numpy().astype(np.float32)
    aucs = []
    folds = core.stratified_folds(y.astype(int), 5)
    for i, te in enumerate(folds):
        tr = np.setdiff1d(np.arange(len(X)), te)
        aucs.append(core.roc_auc(y[te], _proba(_single(X[tr], y[tr], predictor.HIDDEN, seed=100 + i), X[te])))
    out["cv_auc_mean"], out["cv_auc_std"] = round(float(np.mean(aucs)), 3), round(float(np.std(aucs)), 3)
    out["feature_importance"] = predictor.feature_importance(db)[:10]
    return out


def readiness_validity(db) -> dict:
    """Does the readiness score separate placed vs. unplaced? Latest historical batch,
    PlacementNet trained on earlier batches only (no leakage)."""
    df = predictor.history_frame(db)
    train, test = df[df.batch < 2026], df[df.batch == 2026]
    ens, _ = fit_ensemble(predictor.featurise(train), train.placed.to_numpy().astype(np.float32),
                          n_members=predictor.N_MEMBERS, hidden=predictor.HIDDEN, base_seed=50)
    p, _ = ens.predict(predictor.featurise(test))
    acad = np.clip((test.cgpa - 5) / 4.5 * 100, 0, 100) - 15 * test.active_backlogs - 3 * test.backlog_history
    tech = .55 * (test.skill_depth / 5 * np.minimum(test.n_skills, 6) / 6 * 100) + .45 * test.coding_score
    exp = np.minimum(100, 18 * test.n_projects + 12 * test.n_certs + 25 * test.internships)
    comm = .6 * test.communication_score + .4 * test.softskill_score
    rub = (.2 * np.clip(acad, 0, 100) + .25 * tech + .15 * test.aptitude_score + .15 * test.mock_interview_score
           + .15 * comm + .1 * exp).to_numpy()
    score = readiness.RULE_WEIGHT * rub + readiness.ML_WEIGHT * 100 * p
    levels = [readiness.level_for(x) for x in score]
    y = test.placed.to_numpy()
    table = []
    for lv in ["Not Ready", "Developing", "Ready", "Highly Employable"]:
        mask = np.array([item == lv for item in levels])
        table.append({"level": lv, "students": int(mask.sum()),
                      "actual_placement_rate": round(100 * float(y[mask].mean()), 1) if mask.any() else None})
    rates = [t["actual_placement_rate"] for t in table if t["actual_placement_rate"] is not None]
    return {"auc_readiness_vs_placed": round(core.roc_auc(y, score), 3), "auc_rubric_only": round(core.roc_auc(y, rub), 3),
            "by_level": table, "monotonic": all(a <= b for a, b in zip(rates, rates[1:]))}


def matching_quality(db) -> dict:
    """Evaluated only on UPCOMING drives – completed drives are FitNet's training data."""
    lat = load_latents()
    prior = FitNet(ai_models.EXPERT_PRIOR).to(core.DEVICE).eval()
    learned = ai_models.fitnet()
    res = []
    rng = np.random.default_rng(0)
    methods = ["FitNet (learned, PyTorch)", "Expert prior weights", "Baseline: CGPA rank", "Baseline: random"]
    for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
        rows = [r for r in matching.score_drive(db, d) if r["eligible"]]
        if len(rows) < 15:
            continue
        j = d.job
        truth = np.array([true_fit(r["student"], j, lat[r["student"].id]) for r in rows])
        C = np.array([[r["comp"][k] for k in COMPONENTS] for r in rows], np.float32)
        E = np.array([r["comp"]["_extra"] for r in rows], np.float32)
        s_learned, _ = learned.score(C, E)
        s_prior, _ = prior.score(C, E)
        k = min(len(rows), matching.pool_size(j))
        true_top = set(np.argsort(-truth)[:k])
        orders = {methods[0]: np.argsort(-s_learned), methods[1]: np.argsort(-s_prior),
                  methods[2]: np.argsort(-np.array([r["student"].cgpa for r in rows])),
                  methods[3]: rng.permutation(len(rows))}
        rel = (truth - truth.min()) / (truth.max() - truth.min() + 1e-9)
        entry = {"drive": d.name, "eligible": len(rows), "k": k}
        for name, o in orders.items():
            entry[name] = {"precision_at_k": round(len(true_top & set(o[:k])) / k, 3),
                           "ndcg_at_10": round(_ndcg(list(rel[o]), 10), 3)}
        entry["spearman"] = round(core.spearman(s_learned, truth), 3)
        res.append(entry)
    summary = {n: {"precision_at_k": round(float(np.mean([e[n]["precision_at_k"] for e in res])), 3),
                   "ndcg_at_10": round(float(np.mean([e[n]["ndcg_at_10"] for e in res])), 3)} for n in methods}
    return {"drives_evaluated": len(res), "summary": summary, "methods": methods,
            "mean_spearman": round(float(np.mean([e["spearman"] for e in res])), 3), "per_drive": res,
            "learned_weights": learned.learned_weights(), "expert_prior": ai_models.EXPERT_PRIOR,
            "note": "Evaluated on upcoming drives only (FitNet is trained on completed drives). Ground truth = hidden "
                    "recruiter preference from the simulator (latent ability, true skill coverage, interview, "
                    "communication) – never visible to the models."}


def jd_parser_quality(db=None) -> dict:
    tp = fp = fn = 0
    cg_ok = br_ok = bl_ok = 0
    for text, lab in LABELLED_JDS:
        p = matching.parse_jd(text)
        pred = set(p["required_skills"]) | set(p["preferred_skills"])
        gold = lab["required"] | lab["preferred"]
        tp += len(pred & gold)
        fp += len(pred - gold)
        fn += len(gold - pred)
        cg_ok += p["min_cgpa"] == lab["cgpa"]
        br_ok += set(p["allowed_branches"]) == lab["branches"]
        bl_ok += p["max_active_backlogs"] == lab["backlogs"]
    prec, rec = tp / max(1, tp + fp), tp / max(1, tp + fn)
    n = len(LABELLED_JDS)
    out = {"note": "Hand-labelled free-text JDs written in varied recruiter styles (small set – indicative only).",
           "jds": n, "skill_precision": round(prec, 3), "skill_recall": round(rec, 3),
           "skill_f1": round(2 * prec * rec / max(1e-9, prec + rec), 3), "cgpa_accuracy": round(cg_ok / n, 3),
           "branch_accuracy": round(br_ok / n, 3), "backlog_accuracy": round(bl_ok / n, 3)}
    if db is not None:
        from ..models import Job
        jobs = db.query(Job).all()
        hits = sum(ai_models.classify_role(j.required_skills + j.preferred_skills)[0] == j.role_family for j in jobs)
        out["role_classifier_accuracy_on_jobs"] = round(hits / max(1, len(jobs)), 3)
        out["role_classifier_holdout_accuracy"] = core.REGISTRY.get("JD Role Classifier", {}).get("holdout_accuracy")
    return out


def embedding_quality(db) -> dict:
    """Skill2Vec sanity: does each skill's nearest neighbour share its category?"""
    m = ai_models.skill2vec(db)
    hits, total = 0, 0
    for sk, cat in SKILL_CATEGORY.items():
        nn_ = m.nearest(sk, 1, prefix_filter="skill")
        if nn_:
            total += 1
            hits += SKILL_CATEGORY.get(nn_[0][0]) == cat
    return {"category_precision_at_1": round(hits / max(1, total), 3), "skills": total,
            "examples": {t: m.nearest(t, 4, prefix_filter="skill") for t in ("aws", "react", "verilog", "machine learning", "autocad")}}


def _ms(fn, repeat: int = 20) -> float:
    fn()  # warm-up
    t0 = time.perf_counter()
    for _ in range(repeat):
        fn()
    return round((time.perf_counter() - t0) / repeat * 1000, 3)


def cpu_benchmarks(db) -> list[dict]:
    """Per-model CPU inference latency (all models run on the CPU)."""
    students = db.query(Student).all()
    one = students[:1]
    rows = [
        {"model": "PlacementNet – 1 student (5-member ensemble)", "ms": _ms(lambda: predictor.predict(db, one))},
        {"model": f"PlacementNet – whole batch ({len(students)} students)", "ms": _ms(lambda: predictor.predict(db, students), 5)},
        {"model": "PlacementNet – Integrated Gradients explanation (1 student)", "ms": _ms(lambda: predictor.explain(db, one[0]), 5)},
        {"model": "FitNet – 1,000 candidate–drive pairs", "ms": _ms(lambda: ai_models.fitnet().score(
            np.random.rand(1000, len(COMPONENTS)).astype(np.float32), np.zeros((1000, 2), np.float32)))},
        {"model": "Skill2Vec – embed a profile + cosine vs JD", "ms": _ms(lambda: ai_models.skill2vec(db).embed({"python": 3, "sql": 2}))},
        {"model": "JD role classifier – 1 JD", "ms": _ms(lambda: ai_models.classify_role(["python", "sql", "power bi"]))},
    ]
    return rows


def performance(db) -> dict:
    import torch
    d = db.query(Drive).filter(Drive.status == "Upcoming").first()
    students = db.query(Student).all()
    matching.score_drive(db, d, students)  # warm caches
    t0 = time.perf_counter()
    matching.score_drive(db, d, students)
    per_drive = time.perf_counter() - t0
    t0 = time.perf_counter()
    readiness.score_students(db, students)
    rscore = time.perf_counter() - t0
    plan = scheduler.auto_schedule(db, apply=False)
    return {"students": len(students), "device": "cpu", "cpu_threads": torch.get_num_threads(),
            "match_one_drive_ms": round(per_drive * 1000, 1),
            "match_per_1000_pairs_ms": round(per_drive * 1000 / len(students) * 1000, 1),
            "readiness_all_students_ms": round(rscore * 1000, 1), "scheduler_ms": plan["runtime_ms"],
            "projected_10k_students_x_50_drives_s": round(per_drive / len(students) * 10000 * 50, 1),
            "scheduler_conflicts_before": plan["conflicts_before"],
            "scheduler_conflicts_after": plan["conflicts_after"], "cpu_benchmarks": cpu_benchmarks(db)}


def full_report(db) -> dict:
    return {"outcome_model": outcome_model(db), "readiness_validity": readiness_validity(db),
            "matching": matching_quality(db), "jd_parser": jd_parser_quality(db), "embeddings": embedding_quality(db),
            "performance": performance(db), "models": model_cards()}


def model_cards() -> list[dict]:
    return [dict(c.items()) for c in core.REGISTRY.values()]
