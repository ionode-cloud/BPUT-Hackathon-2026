"""Unit + integration tests for the CampusLink engines and PyTorch models (run: pytest -q)."""
from app.engines import matching, offers, readiness, scheduler
from app.engines.skills import extract_skills, normalise
from app.models import Drive, Offer, Student

import pytest


def test_skill_normalisation():
    assert normalise("ReactJS") == "react"
    assert normalise("k8s") == "kubernetes"
    assert set(extract_skills("Need DSA, OOPs and AWS. C and OS basics.")) >= {"data structures", "oops", "aws", "c", "operating systems"}
    assert "c" not in extract_skills("a cool candidate")  # lowercase 'c' is not the C language


def test_jd_parser():
    p = matching.parse_jd("SDE role. Skills: Java, DSA, SQL. Good to have: Docker. CSE/IT only, CGPA 7.5+, no backlogs. 12 LPA")
    assert p["min_cgpa"] == 7.5 and p["max_active_backlogs"] == 0 and p["ctc_lpa"] == 12
    assert set(p["allowed_branches"]) == {"CSE", "IT"}
    assert "docker" in p["preferred_skills"] and "java" in p["required_skills"]


def test_readiness_levels_and_bounds(db):
    students = db.query(Student).limit(50).all()
    for r in readiness.score_students(db, students):
        assert 0 <= r["score"] <= 100
        assert r["level"] in ("Not Ready", "Developing", "Ready", "Highly Employable")
    ex = readiness.explain(db, students[0])
    assert ex["summary"] and ex["contributions"]


def test_skill_gap_prioritised(db):
    s = db.query(Student).first()
    g = readiness.skill_gap(s)
    pr = [x["priority"] for x in g["gaps"]]
    assert pr == sorted(pr, reverse=True)


def test_eligibility_rules(db):
    d = db.get(Drive, 5)  # Nimbus Cloud – CGPA 7.5, CSE/IT/ECE
    for r in matching.score_drive(db, d):
        s = r["student"]
        if s.cgpa < d.job.min_cgpa or s.branch not in d.job.allowed_branches or s.active_backlogs > 0:
            assert not r["eligible"]


def test_explanations_present(db):
    matching.run_matching(db, 5)
    from app.models import Application
    for a in db.query(Application).filter_by(drive_id=5).limit(40):
        assert a.explanation["summary"]
        if not a.eligible:
            assert a.explanation["summary"].startswith("Not Eligible")


def test_scheduler_resolves_conflicts(db):
    before = scheduler.detect_conflicts(db)
    assert any(c["type"] == "Venue double-booking" for c in before)
    plan = scheduler.auto_schedule(db, apply=False)
    assert plan["conflicts_after"] == 0 and plan["conflicts_before"] > 0


def test_offer_state_machine_and_ledger(db):
    o = db.query(Offer).filter_by(status="Issued").first()
    with pytest.raises(ValueError):
        offers.transition(db, o, "Joined", notify=False)
    offers.transition(db, o, "Accepted", notify=False)
    assert offers.verify(db, o.id)["valid"]
    o.ctc_lpa = o.ctc_lpa * 10  # tamper with terms
    assert not offers.verify(db, o.id)["valid"]
    db.rollback()


# ------------------------------------------------------------------ PyTorch model tests
def test_no_sklearn_dependency():
    import pathlib
    src = "".join(p.read_text() for p in pathlib.Path(__file__).resolve().parents[1].joinpath("app").rglob("*.py"))
    assert "sklearn" not in src.replace("no sklearn", "").replace("no scikit-learn", "")


def test_placementnet_probabilities_and_ig_completeness(db):
    import torch
    from app.engines import predictor
    from app.ml.placement import integrated_gradients
    st = predictor.train(db)
    s = db.query(Student).first()
    p = predictor.predict(db, [s])[0]
    assert 0 <= p <= 1
    x = predictor._X([s])[0]
    base = st["baseline"].copy()
    attr = integrated_gradients(st["model"], x[None, :], base, steps=64)[0]
    with torch.no_grad():
        pb = float(st["model"](torch.tensor(base[None, :], dtype=torch.float32)))
    assert abs(attr.sum() - (p - pb)) < 0.03  # IG completeness axiom


def test_fitnet_starts_at_expert_prior():
    from app.engines.ai_models import EXPERT_PRIOR
    from app.ml.fitnet import FitNet
    w = FitNet(EXPERT_PRIOR).learned_weights()
    assert all(abs(w[k] - v) < 1e-4 for k, v in EXPERT_PRIOR.items())


def test_skill2vec_related_skills(db):
    from app.engines import ai_models
    m = ai_models.skill2vec(db)
    assert m.similarity("verilog", "vlsi") > m.similarity("verilog", "staad pro")
    assert m.similarity("react", "javascript") > m.similarity("react", "thermodynamics")


def test_role_classifier(db):
    from app.engines import ai_models
    role, conf, _ = ai_models.classify_role(["verilog", "vlsi", "c"])
    assert role == "VLSI Design Engineer" and conf > .5


def test_all_models_run_on_cpu(db):
    import torch

    from app.engines import ai_models, predictor
    from app.ml import core
    assert core.DEVICE.type == "cpu"
    mods = [predictor.train(db)["model"], ai_models.fitnet(), ai_models.role_classifier(), ai_models.skill2vec(db).model]
    for m in mods:
        assert all(p.device.type == "cpu" for p in m.parameters())
    assert torch.get_num_threads() >= 1
