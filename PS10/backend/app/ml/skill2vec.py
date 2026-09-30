"""Skill2Vec – skip-gram with negative sampling (SGNS) trained in PyTorch on
co-occurrence of skills in student profiles, projects, job descriptions and role
profiles. Produces dense skill embeddings so that related technologies
(aws ≈ azure ≈ docker, verilog ≈ vlsi) are close – the 'vector search' used by
the matching engine."""
from __future__ import annotations

import time

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

from .core import DEVICE, seed_all


class SGNS(nn.Module):
    def __init__(self, vocab: int, dim: int = 32):
        super().__init__()
        self.inp = nn.Embedding(vocab, dim)
        self.out = nn.Embedding(vocab, dim)
        nn.init.uniform_(self.inp.weight, -.5 / dim, .5 / dim)
        nn.init.zeros_(self.out.weight)

    def forward(self, center, context, negatives):
        c = self.inp(center)                       # [B, D]
        pos = (c * self.out(context)).sum(-1)      # [B]
        neg = torch.bmm(self.out(negatives), c.unsqueeze(-1)).squeeze(-1)  # [B, K]
        return -(F.logsigmoid(pos) + F.logsigmoid(-neg).sum(-1)).mean()


class Skill2Vec:
    def __init__(self, vocab: list[str], dim: int = 32):
        self.vocab = vocab
        self.index = {t: i for i, t in enumerate(vocab)}
        self.model = SGNS(len(vocab), dim).to(DEVICE)
        self.vectors: np.ndarray | None = None

    def fit(self, contexts: list[list[str]], epochs: int = 25, k_neg: int = 5, batch: int = 2048, seed: int = 0) -> dict:
        seed_all(seed)
        pairs = []
        counts = np.ones(len(self.vocab))
        for ctx in contexts:
            ids = [self.index[t] for t in ctx if t in self.index]
            for i in ids:
                counts[i] += 1
            for a in range(len(ids)):
                for b in range(len(ids)):
                    if a != b and ids[a] != ids[b]:
                        pairs.append((ids[a], ids[b]))
        pairs = torch.tensor(pairs, dtype=torch.long, device=DEVICE)
        noise = torch.tensor(counts ** .75 / (counts ** .75).sum(), dtype=torch.float32, device=DEVICE)
        opt = torch.optim.Adam(self.model.parameters(), lr=.01)
        hist, t0 = [], time.perf_counter()
        for _ in range(epochs):
            perm = torch.randperm(len(pairs), device=DEVICE)
            tot = 0.0
            for i in range(0, len(perm), batch):
                b = pairs[perm[i:i + batch]]
                neg = torch.multinomial(noise, len(b) * k_neg, replacement=True).view(len(b), k_neg)
                opt.zero_grad()
                loss = self.model(b[:, 0], b[:, 1], neg)
                loss.backward()
                opt.step()
                tot += loss.item() * len(b)
            hist.append(round(tot / len(pairs), 4))
        self._finalise()
        return {"history": {"train": hist}, "pairs": int(len(pairs)), "epochs_run": epochs,
                "train_seconds": round(time.perf_counter() - t0, 2)}

    def _finalise(self):
        with torch.no_grad():
            w = self.model.inp.weight + self.model.out.weight  # combined in/out vectors
            self.vectors = F.normalize(w, dim=-1).cpu().numpy()

    def load_state(self, state: dict):
        self.model.load_state_dict(state)
        self._finalise()

    def vec(self, token: str) -> np.ndarray | None:
        i = self.index.get(token)
        return None if i is None else self.vectors[i]

    def embed(self, weighted: dict[str, float]) -> np.ndarray:
        v = np.zeros(self.vectors.shape[1])
        for t, w in weighted.items():
            e = self.vec(t)
            if e is not None:
                v += w * e
        n = np.linalg.norm(v)
        return v / n if n else v

    def similarity(self, a: str, b: str) -> float:
        va, vb = self.vec(a), self.vec(b)
        return float(va @ vb) if va is not None and vb is not None else 0.0

    def nearest(self, token: str, k: int = 5, prefix_filter: str | None = None) -> list[tuple[str, float]]:
        v = self.vec(token)
        if v is None:
            return []
        sims = self.vectors @ v
        out = []
        for i in np.argsort(-sims):
            t = self.vocab[i]
            if t == token or (prefix_filter is not None and ":" in t):
                continue
            out.append((t, round(float(sims[i]), 3)))
            if len(out) == k:
                break
        return out
