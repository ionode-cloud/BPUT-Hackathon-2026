"""FitNet – learned, explainable recruiter–student ranking model (PyTorch).

score = Σ_k softmax(θ)_k · c_k  +  0.1 · tanh(MLP([c, extra]))

  c      – the six interpretable fit components (skills, preferred, semantic,
           relevance, interview, readiness), each in [0, 1]
  θ      – learnable factor weights, initialised from the expert prior and
           L2-regularised towards it (so few labels cannot destabilise it)
  MLP    – small residual network for interactions (e.g. CGPA margin × skills)

Trained with a pairwise RankNet loss on recruiter decisions from completed drives
(every Selected candidate should outrank every Rejected one in the same drive).
It is retrained whenever new selections are recorded."""
from __future__ import annotations

import time

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

from .core import DEVICE, seed_all

COMPONENTS = ["skills", "preferred", "semantic", "relevance", "interview", "readiness"]
N_EXTRA = 2  # cgpa margin, mock gap


class FitNet(nn.Module):
    def __init__(self, prior: dict[str, float]):
        super().__init__()
        p = torch.tensor([prior[k] for k in COMPONENTS], dtype=torch.float32)
        self.register_buffer("prior_logits", torch.log(p / p.sum()))
        self.theta = nn.Parameter(self.prior_logits.clone())
        self.residual = nn.Sequential(nn.Linear(len(COMPONENTS) + N_EXTRA, 16), nn.Tanh(), nn.Linear(16, 1))
        nn.init.zeros_(self.residual[-1].weight)
        nn.init.zeros_(self.residual[-1].bias)

    def weights(self) -> torch.Tensor:
        return torch.softmax(self.theta, dim=0)

    def forward(self, comp: torch.Tensor, extra: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        base = comp @ self.weights()
        adj = .1 * torch.tanh(self.residual(torch.cat([comp, extra], -1))).squeeze(-1)
        return base + adj, adj

    @torch.inference_mode()
    def score(self, comp: np.ndarray, extra: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        self.eval()
        s, adj = self(torch.tensor(np.atleast_2d(comp), dtype=torch.float32, device=DEVICE),
                      torch.tensor(np.atleast_2d(extra), dtype=torch.float32, device=DEVICE))
        return s.cpu().numpy(), adj.cpu().numpy()

    def learned_weights(self) -> dict[str, float]:
        return {k: round(float(v), 4) for k, v in zip(COMPONENTS, self.weights().detach().cpu())}


def train_fitnet(model: FitNet, groups: list[tuple[np.ndarray, np.ndarray, np.ndarray]], epochs: int = 400,
                 lr: float = .02, prior_l2: float = .5, seed: int = 0) -> dict:
    """groups: per drive (components[N,6], extra[N,2], label[N] 1=selected 0=rejected)."""
    seed_all(seed)
    model.to(DEVICE).train()
    tensors, n_pairs = [], 0
    for comp, extra, lab in groups:
        pos, neg = np.where(lab == 1)[0], np.where(lab == 0)[0]
        if len(pos) and len(neg):
            tensors.append((torch.tensor(comp, dtype=torch.float32, device=DEVICE),
                            torch.tensor(extra, dtype=torch.float32, device=DEVICE),
                            torch.tensor(pos, device=DEVICE), torch.tensor(neg, device=DEVICE)))
            n_pairs += len(pos) * len(neg)
    if not tensors:
        model.eval()
        return {"history": {"train": []}, "pairs": 0, "epochs_run": 0, "train_seconds": 0.0}
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    hist, t0 = [], time.perf_counter()
    for _ in range(epochs):
        opt.zero_grad()
        loss = 0.0
        for comp, extra, pos, neg in tensors:
            s, _ = model(comp, extra)
            diff = (s[pos].unsqueeze(1) - s[neg].unsqueeze(0)) * 20  # temperature
            loss = loss + F.softplus(-diff).mean()
        loss = loss / len(tensors) + prior_l2 * ((model.theta - model.prior_logits) ** 2).sum()
        loss.backward()
        opt.step()
        hist.append(round(loss.item(), 4))
    model.eval()
    return {"history": {"train": hist}, "pairs": int(n_pairs), "epochs_run": epochs,
            "train_seconds": round(time.perf_counter() - t0, 2)}
