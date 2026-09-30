"""Offline generative AI (PyTorch) + retrieval-grounded placement assistant.

Default backend: Hugging Face `transformers` running a small instruction-tuned
LLM **on PyTorch**, fully on-premise and on the **CPU** (int8 dynamic quantisation by default):

    LLM_BACKEND=transformers   (default)
    LLM_MODEL=Qwen/Qwen2.5-0.5B-Instruct   (~1 GB, downloaded once, then cached;
                                            may also be a local folder path)

Optional backends: LLM_BACKEND=ollama (OLLAMA_URL / OLLAMA_MODEL) or
LLM_BACKEND=none. When no LLM is available the assistant transparently falls
back to a deterministic intent + retrieval engine, so the demo never breaks.
"""
from __future__ import annotations

import math
import re
import threading
import time
from collections import Counter

import httpx
import numpy as np

from ..core.config import settings  # noqa: E402
from ..models import Drive, Offer, Student
from . import matching, readiness

LLM_BACKEND = settings.LLM_BACKEND.lower()
LLM_MODEL = settings.LLM_MODEL
LLM_AUTOLOAD = settings.LLM_AUTOLOAD
OLLAMA_URL = settings.OLLAMA_URL
OLLAMA_MODEL = settings.OLLAMA_MODEL

_hf = {"state": "not loaded", "error": None, "model": None, "tok": None, "device": None, "load_seconds": None}
_hf_lock = threading.Lock()
_gen_lock = threading.Lock()
_ollama = {"t": 0.0, "ok": False, "models": []}

FAQ = [
    ("What is the one-offer / dream-offer policy?",
     "Once you accept an offer you may only appear for drives offering at least 1.5x your current CTC (dream-offer rule). "
     "Declining an accepted offer requires placement-cell approval."),
    ("What documents are required after an offer?",
     "Signed offer letter, academic transcripts, ID proof, medical certificate and background-verification form. "
     "A service-bond agreement is also needed when the offer carries a bond."),
    ("How is my readiness score calculated?",
     "65% comes from a transparent rubric – academics 20%, technical skills 25%, aptitude 15%, mock interview 15%, "
     "communication 15%, experience 10% – and 35% from a machine-learning model trained on past batches' placement outcomes."),
    ("How are students shortlisted for a drive?",
     "First hard eligibility rules (branch, CGPA, backlogs, offer policy) are applied. Eligible students get a fit score from "
     "required-skill match, preferred skills, profile-JD similarity, project/certification relevance, mock-interview score "
     "versus the recruiter benchmark and readiness. Students scoring 55+ are shortlisted up to the recruiter's pool size."),
    ("What is the dress code for placement drives?",
     "Formal business attire. Carry your college ID, two printed resumes and a pen."),
    ("Can I apply if I have a backlog?",
     "Each recruiter sets a maximum number of active backlogs; many require zero. Clear backlogs early to widen eligibility."),
    ("How do I improve my chances?",
     "Follow your personalised preparation plan: close the top skill gaps, take weekly mock interviews and aptitude tests, "
     "and add a relevant certification or project."),
    ("Who is my placement mentor?", "Your mentor is shown on your profile; at-risk students are escalated to mentors automatically."),
]

# ------------------------------------------------------------------ FAQ retrieval (numpy TF-IDF, no sklearn)
_STOP = set(("a an the is are am i my me to of for in on at and or be do does can how what which who when with "
               "if it its this that your you from by as was were will").split())


def _tokens(t: str) -> list[str]:
    return [w for w in re.findall(r"[a-z]+", t.lower()) if w not in _STOP and len(w) > 1]


_docs = [Counter(_tokens(q + " " + a)) for q, a in FAQ]
_df = Counter(w for d in _docs for w in d)
_idf = {w: math.log((1 + len(_docs)) / (1 + c)) + 1 for w, c in _df.items()}


def _tfidf(c: Counter) -> dict[str, float]:
    v = {w: (1 + math.log(n)) * _idf.get(w, 0) for w, n in c.items()}
    norm = math.sqrt(sum(x * x for x in v.values())) or 1
    return {w: x / norm for w, x in v.items()}


_doc_vecs = [_tfidf(d) for d in _docs]


def _faq_hits(q: str, k: int = 2) -> list[tuple[str, str, float]]:
    qv = _tfidf(Counter(_tokens(q)))
    sims = np.array([sum(qv.get(w, 0) * x for w, x in dv.items()) for dv in _doc_vecs])
    idx = np.argsort(-sims)[:k]
    return [(FAQ[i][0], FAQ[i][1], float(sims[i])) for i in idx]


# ------------------------------------------------------------------ PyTorch LLM backend (transformers)
def _load_hf() -> None:
    with _hf_lock:
        if _hf["state"] in ("ready", "loading"):
            return
        _hf["state"] = "loading"
    t0 = time.perf_counter()
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
        device = "cpu"  # all inference on the CPU
        tok = AutoTokenizer.from_pretrained(LLM_MODEL)
        model = AutoModelForCausalLM.from_pretrained(LLM_MODEL, low_cpu_mem_usage=True)
        model = model.float().to(device).eval()
        params = int(sum(p.numel() for p in model.parameters()))
        quantized = False
        if settings.LLM_QUANTIZE:
            try:  # int8 weights for every nn.Linear: ~2-3x faster generation and ~4x less memory on CPU
                model = torch.ao.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
                quantized = True
            except Exception:  # pragma: no cover - quantisation engine unavailable on this CPU
                quantized = False
        _hf.update(model=model, tok=tok, device=device, state="ready", error=None,
                   load_seconds=round(time.perf_counter() - t0, 1), params=params,
                   precision="int8 dynamic (Linear) + fp32" if quantized else "fp32")
    except Exception as e:  # missing package, no internet for first download, OOM ...
        _hf.update(state="failed", error=f"{type(e).__name__}: {e}"[:300])


def start_background_load() -> None:
    if LLM_BACKEND == "transformers" and LLM_AUTOLOAD and _hf["state"] == "not loaded":
        threading.Thread(target=_load_hf, daemon=True).start()


def _hf_generate(system: str, user: str, max_tokens: int) -> str | None:
    if _hf["state"] != "ready":
        return None
    import torch
    tok, model = _hf["tok"], _hf["model"]
    msgs = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    try:
        prompt = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    except Exception:
        prompt = f"{system}\n\n{user}\n\nAnswer:"
    inputs = tok(prompt, return_tensors="pt").to(_hf["device"])
    with _gen_lock, torch.inference_mode():
        out = model.generate(**inputs, max_new_tokens=max_tokens, do_sample=False, repetition_penalty=1.1,
                             pad_token_id=tok.pad_token_id if tok.pad_token_id is not None else tok.eos_token_id)
    text = tok.decode(out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True).strip()
    return text or None


# ------------------------------------------------------------------ Ollama backend (optional)
def _ollama_ok(force: bool = False) -> bool:
    if force or time.time() - _ollama["t"] > 30:
        try:
            r = httpx.get(f"{OLLAMA_URL}/api/tags", timeout=1.5)
            _ollama.update(ok=r.status_code == 200, models=[m["name"] for m in r.json().get("models", [])])
        except Exception:
            _ollama.update(ok=False, models=[])
        _ollama["t"] = time.time()
    return _ollama["ok"]


def _ollama_generate(system: str, user: str, max_tokens: int) -> str | None:
    if not _ollama_ok():
        return None
    try:
        r = httpx.post(f"{OLLAMA_URL}/api/chat", timeout=90, json={
            "model": OLLAMA_MODEL, "stream": False, "options": {"temperature": .3, "num_predict": max_tokens},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        r.raise_for_status()
        return r.json()["message"]["content"].strip()
    except Exception:
        return None


def status(force: bool = False) -> dict:
    if LLM_BACKEND == "transformers":
        ok = _hf["state"] == "ready"
        return {"backend": "transformers (PyTorch)", "available": ok, "state": _hf["state"], "model": LLM_MODEL,
                "device": "cpu", "precision": _hf.get("precision"), "parameters": _hf.get("params"),
                "load_seconds": _hf["load_seconds"],
                "error": _hf["error"],
                "mode": f"Offline LLM on PyTorch ({LLM_MODEL})" if ok else
                        ("Loading LLM… (rule + retrieval meanwhile)" if _hf["state"] == "loading" else "Rule + retrieval fallback")}
    if LLM_BACKEND == "ollama":
        ok = _ollama_ok(force)
        return {"backend": "ollama", "available": ok, "state": "ready" if ok else "unreachable", "model": OLLAMA_MODEL,
                "url": OLLAMA_URL, "installed_models": _ollama["models"],
                "mode": "Offline LLM (Ollama)" if ok else "Rule + retrieval fallback"}
    return {"backend": "none", "available": False, "state": "disabled", "model": None, "mode": "Rule + retrieval fallback"}


def generate(system: str, user: str, max_tokens: int = settings.LLM_MAX_NEW_TOKENS) -> str | None:
    try:
        if LLM_BACKEND == "transformers":
            return _hf_generate(system, user, max_tokens)
        if LLM_BACKEND == "ollama":
            return _ollama_generate(system, user, max_tokens)
    except Exception:
        return None
    return None


def _find_drive(db, q: str) -> Drive | None:
    ql = q.lower()
    best, score = None, 0
    for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
        words = set(re.findall(r"[a-z]{3,}", (d.name + " " + d.job.company.name).lower()))
        s = sum(1 for w in words if w in ql)
        if s > score:
            best, score = d, s
    return best


def build_context(db, student: Student | None, q: str) -> tuple[str, dict]:
    facts: dict = {}
    lines = []
    if student:
        lines.append(f"Student: {student.name}, {student.branch}, CGPA {student.cgpa}, active backlogs "
                     f"{student.active_backlogs}, readiness {student.readiness_score} ({student.readiness_level}), "
                     f"placement probability {student.placement_probability * 100:.0f}%.")
        gap = readiness.skill_gap(student)
        facts["gap"] = gap
        lines.append(f"Target role {gap['role']} coverage {gap['coverage']}%. Top gaps: " +
                     ", ".join(f"{g['skill']} (resource: {g['resource']})" for g in gap["gaps"][:4]))
        offers = db.query(Offer).filter_by(student_id=student.id).all()
        facts["offers"] = offers
        for o in offers:
            pend = [k for k, v in o.documents.items() if v in ("Pending", "Rejected")]
            lines.append(f"Offer #{o.id}: {o.role}, {o.ctc_lpa} LPA, status {o.status}, pending documents: "
                         f"{', '.join(pend) or 'none'}, respond by {o.respond_by}.")
        drive = _find_drive(db, q)
        drives = [drive] if drive else db.query(Drive).filter(Drive.status == "Upcoming").all()
        recs = matching.recommend_drives(db, student, drives)
        facts["recs"] = recs
        for r in recs[:6]:
            lines.append(f"Drive '{r['drive']}' ({r['ctc_lpa']} LPA, date {r['date'] or 'TBA'}): "
                         f"{'eligible' if r['eligible'] else 'NOT eligible'}, fit {r['fit_score']} – "
                         f"{r['explanation']['summary']}")
    else:
        for d in db.query(Drive).filter(Drive.status == "Upcoming").all():
            j = d.job
            lines.append(f"Drive '{d.name}': {j.ctc_lpa} LPA, min CGPA {j.min_cgpa}, branches "
                         f"{', '.join(j.allowed_branches)}, max backlogs {j.max_active_backlogs}, date {d.date or 'TBA'}.")
    for fq, fa, sim in _faq_hits(q):
        if sim > .1:
            lines.append(f"Policy FAQ – {fq} {fa}")
    facts["faq"] = _faq_hits(q)
    return "\n".join(lines), facts


def _fallback(q: str, student: Student | None, facts: dict) -> str:
    ql = q.lower()
    if student and re.search(r"eligib|can i (apply|sit)|shortlist", ql) and facts.get("recs"):
        r = facts["recs"][0] if len(facts["recs"]) == 1 else None
        if r:
            return f"**{r['drive']}** – {r['explanation']['summary']}"
        ok = [r for r in facts["recs"] if r["eligible"]]
        return (f"You are eligible for {len(ok)} of {len(facts['recs'])} upcoming drives. Best fits: " +
                "; ".join(f"{r['drive']} (fit {r['fit_score']}, {r['fit_level']})" for r in ok[:4]) + ".")
    if student and re.search(r"gap|improve|prepare|skill|learn|weak", ql):
        g = facts["gap"]
        items = "; ".join(f"{x['skill']} → {x['resource']}" for x in g["gaps"][:4]) or "no major gaps"
        return (f"For **{g['role']}** your skill coverage is {g['coverage']}%. Focus next on: {items}. "
                f"Your readiness is {student.readiness_score} ({student.readiness_level}).")
    if student and re.search(r"offer|document|joining|bond", ql) and facts.get("offers"):
        return " ".join(f"Offer #{o.id} ({o.role}, {o.ctc_lpa} LPA) is **{o.status}**; pending documents: "
                        f"{', '.join(k for k, v in o.documents.items() if v in ('Pending', 'Rejected')) or 'none'}."
                        for o in facts["offers"])
    if student and re.search(r"readiness|score|ready|chance", ql):
        return (f"Your readiness score is {student.readiness_score} (**{student.readiness_level}**) and the model "
                f"estimates a {student.placement_probability * 100:.0f}% placement probability.")
    if re.search(r"upcoming|drive|compan|recruit", ql) and facts.get("recs"):
        return "Upcoming drives: " + "; ".join(f"{r['drive']} on {r['date'] or 'TBA'} ({r['ctc_lpa']} LPA)"
                                               for r in facts["recs"][:6]) + "."
    fq, fa, sim = facts["faq"][0]
    if sim > .05:
        return fa
    return ("I can help with eligibility for a drive, your readiness score, skill gaps, upcoming drives, "
            "offers and documents, and placement policies. Try: “Am I eligible for Nimbus Cloud?”")


SYSTEM = ("You are CampusLink Assistant, a placement-cell helper for engineering students in India. Answer ONLY from "
          "the CONTEXT. Be concise (max 120 words), friendly and specific; cite numbers from the context. If the answer "
          "is not in the context say you don't know and suggest contacting the placement cell.")


def ask(db, question: str, student_id: int | None = None) -> dict:
    student = db.get(Student, student_id) if student_id else None
    ctx, facts = build_context(db, student, question)
    answer = generate(SYSTEM, f"CONTEXT:\n{ctx}\n\nQUESTION: {question}")
    engine = (f"{status()['backend']}:{status()['model']}") if answer else "rule-retrieval"
    if not answer:
        answer = _fallback(question, student, facts)
    return {"answer": answer, "engine": engine, "context_lines": ctx.count("\n") + 1}


def resume_tips(db, s: Student) -> dict:
    gap = readiness.skill_gap(s)
    tips = []
    if len(s.projects) < 3:
        tips.append("Add at least one more project aligned to your target role, with measurable results (e.g. 'reduced latency by 30%').")
    for p in s.projects:
        if len(p["description"]) < 80:
            tips.append(f"Expand '{p['title']}' with problem → approach → tech stack → quantified outcome.")
            break
    if not s.certifications:
        tips.append(f"Add a certification such as {gap['gaps'][0]['certification'] if gap['gaps'] else 'an industry certification'}.")
    if gap["gaps"]:
        tips.append("List skills in the order recruiters for " + gap["role"] + " search for them; learn and add: " +
                    ", ".join(g["skill"] for g in gap["gaps"][:3]) + ".")
    tips.append("Keep the resume to one page, use action verbs and put CGPA and branch in the header.")
    summary = generate("You are a resume coach for Indian engineering graduates. Write a 3-sentence professional "
                       "summary in first person, no fabrication, using only the facts given.",
                       f"Facts: {s.resume_text}\nTarget role: {gap['role']}", 160)
    if not summary:
        top = sorted(s.skills, key=lambda k: -s.skills[k])[:4]
        summary = (f"B.Tech {s.branch} student (CGPA {s.cgpa}) aspiring to work as a {gap['role']}. "
                   f"Hands-on with {', '.join(top)} through {len(s.projects)} project(s)"
                   f"{' and ' + str(s.internships) + ' internship(s)' if s.internships else ''}. "
                   f"Eager to apply strong fundamentals and learn fast in a product-focused team.")
    return {"summary": summary, "tips": tips, "engine": status()["mode"]}
