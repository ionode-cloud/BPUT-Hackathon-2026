"""CampusLink backend. All AI inference runs on the CPU: hide GPUs from PyTorch before it is imported."""
import os

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")
