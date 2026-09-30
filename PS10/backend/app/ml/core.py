"""PyTorch runtime helpers, a generic trainer, model registry/persistence and
numpy implementations of the evaluation metrics (no scikit-learn)."""
from __future__ import annotations

import contextlib
import json
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
import torch
from torch import nn

from ..core.config import settings

MODEL_DIR = Path(settings.MODEL_DIR)
# All training and inference run on the CPU (no GPU required or used).
DEVICE = torch.device("cpu")
CPU_THREADS = settings.TORCH_THREADS or max(1, min(8, os.cpu_count() or 1))
torch.set_num_threads(CPU_THREADS)
with contextlib.suppress(RuntimeError):  # already initialised (e.g. in tests)
    torch.set_num_interop_threads(max(1, min(2, CPU_THREADS)))

REGISTRY: dict[str, dict] = {}  # name -> model card (architecture, params, metrics, loss curves ...)


def seed_all(seed: int) -> None:
    torch.manual_seed(seed)
    np.random.seed(seed)


def n_params(model: nn.Module) -> int:
    return int(sum(p.numel() for p in model.parameters() if p.requires_grad))


def register(name: str, model: nn.Module | None, **card) -> None:
    REGISTRY[name] = {"name": name, "framework": f"PyTorch {torch.__version__}", "device": str(DEVICE),
                      "parameters": n_params(model) if model is not None else card.pop("parameters", 0),
                      "architecture": str(model) if model is not None else card.pop("architecture", ""), **card}


def save(name: str, state: dict, meta: dict) -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save(state, MODEL_DIR / f"{name}.pt")
    (MODEL_DIR / f"{name}.json").write_text(json.dumps(meta, default=float))


def load(name: str, fingerprint: str) -> tuple[dict, dict] | None:
    f, m = MODEL_DIR / f"{name}.pt", MODEL_DIR / f"{name}.json"
    if not (f.exists() and m.exists()):
        return None
    meta = json.loads(m.read_text())
    if meta.get("fingerprint") != fingerprint:
        return None
    return torch.load(f, map_location=DEVICE, weights_only=False), meta


def train_binary(model: nn.Module, X: np.ndarray, y: np.ndarray, seed: int = 0, epochs: int = 300, lr: float = 3e-3,
                 weight_decay: float = 1e-3, batch: int = 256, val_frac: float = .15, patience: int = 30) -> dict:
    """Mini-batch AdamW + BCE-with-logits, early stopping on a validation split.
    Returns loss history; the model keeps its best-validation weights."""
    seed_all(seed)
    model.to(DEVICE)
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(X))
    n_val = max(1, int(len(X) * val_frac))
    va, tr = idx[:n_val], idx[n_val:]
    Xt = torch.tensor(X, dtype=torch.float32, device=DEVICE)
    yt = torch.tensor(y, dtype=torch.float32, device=DEVICE)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=weight_decay)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    loss_fn = nn.BCEWithLogitsLoss()
    best, best_state, bad, hist = float("inf"), None, 0, {"train": [], "val": []}
    t0 = time.perf_counter()
    for _ep in range(epochs):
        model.train()
        perm = torch.tensor(rng.permutation(tr), device=DEVICE)
        tot = 0.0
        for i in range(0, len(perm), batch):
            b = perm[i:i + batch]
            opt.zero_grad()
            loss = loss_fn(model(Xt[b]), yt[b])
            loss.backward()
            opt.step()
            tot += loss.item() * len(b)
        sched.step()
        model.eval()
        with torch.no_grad():
            vl = float(loss_fn(model(Xt[va]), yt[va]))
        hist["train"].append(round(tot / len(tr), 4))
        hist["val"].append(round(vl, 4))
        if vl < best - 1e-4:
            best, bad = vl, 0
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
        else:
            bad += 1
            if bad >= patience:
                break
    if best_state:
        model.load_state_dict(best_state)
    model.eval()
    return {"history": hist, "epochs_run": len(hist["train"]), "best_val_loss": round(best, 4),
            "train_seconds": round(time.perf_counter() - t0, 2)}


# ---------------------------------------------------------------- metrics (numpy)
def roc_auc(y: np.ndarray, p: np.ndarray) -> float:
    y = np.asarray(y).astype(int)
    r = pd.Series(np.asarray(p)).rank(method="average").to_numpy()
    n1, n0 = y.sum(), len(y) - y.sum()
    if n1 == 0 or n0 == 0:
        return float("nan")
    return float((r[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def classification(y: np.ndarray, yhat: np.ndarray) -> dict:
    y, yhat = np.asarray(y).astype(bool), np.asarray(yhat).astype(bool)
    tp, fp, fn = (y & yhat).sum(), (~y & yhat).sum(), (y & ~yhat).sum()
    prec = tp / max(1, tp + fp)
    rec = tp / max(1, tp + fn)
    return {"accuracy": float((y == yhat).mean()), "precision": float(prec), "recall": float(rec),
            "f1": float(2 * prec * rec / max(1e-9, prec + rec))}


def brier(y, p) -> float:
    return float(np.mean((np.asarray(p) - np.asarray(y)) ** 2))


def spearman(a, b) -> float:
    ra, rb = pd.Series(a).rank().to_numpy(), pd.Series(b).rank().to_numpy()
    return float(np.corrcoef(ra, rb)[0, 1])


def stratified_folds(y: np.ndarray, k: int = 5, seed: int = 0) -> list[np.ndarray]:
    rng = np.random.default_rng(seed)
    folds = [[] for _ in range(k)]
    for cls in np.unique(y):
        idx = rng.permutation(np.where(y == cls)[0])
        for i, j in enumerate(idx):
            folds[i % k].append(j)
    return [np.array(f) for f in folds]
