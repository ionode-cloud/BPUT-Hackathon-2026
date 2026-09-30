"""JD role-family classifier – PyTorch MLP over a multi-hot bag of extracted
skills, trained on synthetic job descriptions sampled from the role profiles."""
from __future__ import annotations

import time

import numpy as np
import torch
from torch import nn

from .core import DEVICE, seed_all


class RoleClassifier(nn.Module):
    def __init__(self, n_skills: int, n_roles: int, hidden: int = 48):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(n_skills, hidden), nn.ReLU(), nn.Dropout(.2), nn.Linear(hidden, n_roles))

    def forward(self, x):
        return self.net(x)


def synth_jds(role_profiles: dict, skills: list[str], n_per_role: int = 1500, seed: int = 0):
    rng = np.random.default_rng(seed)
    sidx = {s: i for i, s in enumerate(skills)}
    X, y = [], []
    for r, (_role, prof) in enumerate(role_profiles.items()):
        names = list(prof["skills"])
        w = np.array([prof["skills"][s] for s in names])
        w = w / w.sum()
        for _ in range(n_per_role):
            k = rng.integers(2, min(7, len(names)) + 1)
            pick = rng.choice(names, size=k, replace=False, p=w)
            v = np.zeros(len(skills), dtype=np.float32)
            for s in pick:
                v[sidx[s]] = 1
            for s in rng.choice(skills, size=rng.integers(0, 3), replace=False):  # noise skills
                v[sidx[s]] = 1
            X.append(v)
            y.append(r)
    return np.stack(X), np.array(y)


def train_roleclf(model: RoleClassifier, X: np.ndarray, y: np.ndarray, epochs: int = 15, seed: int = 0) -> dict:
    seed_all(seed)
    model.to(DEVICE)
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(X))
    n_te = int(.2 * len(X))
    te, tr = idx[:n_te], idx[n_te:]
    Xt, yt = torch.tensor(X, device=DEVICE), torch.tensor(y, device=DEVICE)
    opt = torch.optim.Adam(model.parameters(), lr=3e-3)
    loss_fn = nn.CrossEntropyLoss()
    hist, t0 = {"train": [], "val_acc": []}, time.perf_counter()
    for _ in range(epochs):
        model.train()
        perm = rng.permutation(tr)
        tot = 0.0
        for i in range(0, len(perm), 256):
            b = torch.tensor(perm[i:i + 256], device=DEVICE)
            opt.zero_grad()
            loss = loss_fn(model(Xt[b]), yt[b])
            loss.backward()
            opt.step()
            tot += loss.item() * len(b)
        model.eval()
        with torch.no_grad():
            acc = float((model(Xt[te]).argmax(-1) == yt[te]).float().mean())
        hist["train"].append(round(tot / len(tr), 4))
        hist["val_acc"].append(round(acc, 4))
    return {"history": hist, "holdout_accuracy": hist["val_acc"][-1], "epochs_run": epochs,
            "train_seconds": round(time.perf_counter() - t0, 2), "train_samples": int(len(tr))}
