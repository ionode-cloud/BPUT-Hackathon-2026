"""PlacementNet – PyTorch deep-ensemble MLP predicting P(placed) from a student's
tabular profile, with Integrated-Gradients explanations."""
from __future__ import annotations

import numpy as np
import torch
from torch import nn

from .core import DEVICE, train_binary


class PlacementNet(nn.Module):
    """Standardise → [Linear → LayerNorm → GELU → Dropout] x k → Linear(1).
    With hidden=() it is exactly a logistic-regression model (used as a baseline)."""

    def __init__(self, n_in: int, mean: np.ndarray, std: np.ndarray, hidden=(64, 32), dropout: float = .15):
        super().__init__()
        self.register_buffer("mean", torch.tensor(mean, dtype=torch.float32))
        self.register_buffer("std", torch.tensor(np.where(std < 1e-6, 1.0, std), dtype=torch.float32))
        layers, d = [], n_in
        for h in hidden:
            layers += [nn.Linear(d, h), nn.LayerNorm(h), nn.GELU(), nn.Dropout(dropout)]
            d = h
        layers.append(nn.Linear(d, 1))
        self.net = nn.Sequential(*layers)
        self.hidden = tuple(hidden)

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # logits
        return self.net((x - self.mean) / self.std).squeeze(-1)


class DeepEnsemble(nn.Module):
    """Average of independently-initialised PlacementNets – better calibrated
    probabilities and an uncertainty estimate (std across members)."""

    def __init__(self, members: list[PlacementNet]):
        super().__init__()
        self.members = nn.ModuleList(members)

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # probability
        return torch.stack([torch.sigmoid(m(x)) for m in self.members]).mean(0)

    @torch.inference_mode()
    def predict(self, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        self.eval()
        x = torch.tensor(X, dtype=torch.float32, device=DEVICE)
        ps = torch.stack([torch.sigmoid(m(x)) for m in self.members])
        return ps.mean(0).cpu().numpy(), ps.std(0).cpu().numpy()


def fit_ensemble(X: np.ndarray, y: np.ndarray, n_members: int = 5, hidden=(64, 32), epochs: int = 300,
                 base_seed: int = 0) -> tuple[DeepEnsemble, list[dict]]:
    mean, std = X.mean(0), X.std(0)
    members, logs = [], []
    for i in range(n_members):
        net = PlacementNet(X.shape[1], mean, std, hidden=hidden)
        logs.append(train_binary(net, X, y, seed=base_seed + i, epochs=epochs))
        members.append(net)
    return DeepEnsemble(members).to(DEVICE).eval(), logs


def integrated_gradients(model: nn.Module, x: np.ndarray, baseline: np.ndarray, steps: int = 32) -> np.ndarray:
    """IG attributions (in probability units) for a batch x [N, F] w.r.t. baseline [F] or [N, F].
    Sum over features ≈ P(x) − P(baseline) (completeness axiom)."""
    model.eval()
    xt = torch.tensor(np.atleast_2d(x), dtype=torch.float32, device=DEVICE)
    bt = torch.tensor(np.broadcast_to(baseline, xt.shape).copy(), dtype=torch.float32, device=DEVICE)
    alphas = torch.linspace(0, 1, steps + 1, device=DEVICE)[1:].view(-1, 1, 1)
    path = (bt + alphas * (xt - bt)).reshape(-1, xt.shape[1]).requires_grad_(True)
    out = model(path).sum()
    (grad,) = torch.autograd.grad(out, path)
    avg = grad.view(steps, *xt.shape).mean(0)
    return ((xt - bt) * avg).detach().cpu().numpy()
