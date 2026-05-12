"""
Shared chest-X-ray classifier service.

A single DenseNet121 instance is loaded lazily and reused by:

  * `services/gradcam.py` — for true GradCAM++ heatmaps.
  * `services/lime_explainer.py` — as the LIME `predict_fn`.
  * `services/shap_explainer.py` — as the KernelSHAP `predict_fn`.

Why share the loader?
---------------------
DenseNet121 is ~32 MB on disk and ~30 MB resident. We do NOT want three
copies in process memory, and we want the explainers to be cheap to call
many times during a single LIME/SHAP run (which both spam perturbations).

The model is wrapped in `predict_proba_batch()` which:
  * Pre-applies the standard ImageNet transform.
  * Runs ONE forward pass per call (so callers can fold N perturbations
    into a single batch — the dominant LIME/SHAP perf win).
  * Returns sigmoid probabilities (`N × C`).

Pretrained weights
------------------
  1. CheXNet weights via `settings.chexnet_weights_path` (if provided)
  2. ImageNet pretrained DenseNet121 fallback (still useful as a generic
     activation model for explanation visualisations).
  3. Random init only if both fail (LIME/SHAP outputs become noise; we
     emit a logger warning and let the explainer fall back to its proxy).

Public surface
--------------
    is_available() -> bool
    predict_proba_batch(images: list[PIL.Image]) -> np.ndarray  # (N, C)
    predict_proba_for_class(images, class_idx) -> np.ndarray    # (N,)
    top_class(image) -> int
    get_model() -> torch.nn.Module | None  # for GradCAM hooks
    image_size() -> int                    # 224
"""
from __future__ import annotations

import logging
import threading
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ── Module state ──────────────────────────────────────────────────────────────
_MODEL: Any = None
_TRANSFORM: Any = None
_DEVICE: str = "cpu"
_MODEL_MODE: str = "uninitialized"  # "torch" | "unavailable"
_LOAD_LOCK = threading.Lock()

IMAGE_SIZE = 224
NUM_CLASSES_DEFAULT = 14  # CheXNet pathologies


# ──────────────────────────────────────────────────────────────────────────────
# Loader
# ──────────────────────────────────────────────────────────────────────────────

def _try_load() -> None:
    """Idempotent, thread-safe lazy load."""
    global _MODEL, _TRANSFORM, _DEVICE, _MODEL_MODE
    if _MODEL is not None or _MODEL_MODE == "unavailable":
        return

    with _LOAD_LOCK:
        if _MODEL is not None or _MODEL_MODE == "unavailable":
            return

        from app.core.config import get_settings
        settings = get_settings()
        if not settings.ml_features_enabled:
            _MODEL_MODE = "unavailable"
            logger.info("CXR classifier disabled (ml_features_enabled=False).")
            return

        try:
            import torch
            import torch.nn as nn
            import torchvision.models as tvm
            import torchvision.transforms as T

            # 1) Build skeleton (no weights yet)
            net = tvm.densenet121(weights=None)
            net.classifier = nn.Sequential(
                nn.Linear(net.classifier.in_features, NUM_CLASSES_DEFAULT),
            )

            # 2) Try to load CheXNet weights
            weights_path = settings.chexnet_weights_path
            loaded_chexnet = False
            if weights_path:
                try:
                    state = torch.load(weights_path, map_location="cpu")
                    if any(k.startswith("module.") for k in state.keys()):
                        state = {k.replace("module.", ""): v for k, v in state.items()}
                    net.load_state_dict(state, strict=False)
                    loaded_chexnet = True
                    logger.info("CXR classifier: loaded CheXNet weights from %s", weights_path)
                except Exception as exc:
                    logger.warning(
                        "CXR classifier: CheXNet weights failed (%s); using ImageNet.",
                        exc,
                    )

            # 3) Fallback to ImageNet pretrained DenseNet121
            if not loaded_chexnet:
                net = tvm.densenet121(weights=tvm.DenseNet121_Weights.IMAGENET1K_V1)
                logger.info("CXR classifier: using ImageNet-pretrained DenseNet121.")

            device = "cuda" if torch.cuda.is_available() else "cpu"
            net.to(device)
            net.eval()

            _MODEL = net
            _DEVICE = device
            _TRANSFORM = T.Compose([
                T.Resize((IMAGE_SIZE, IMAGE_SIZE)),
                T.ToTensor(),
                T.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225],
                ),
            ])
            _MODEL_MODE = "torch"
            logger.info("CXR classifier ready (device=%s).", device)

        except ImportError as exc:
            _MODEL_MODE = "unavailable"
            logger.warning(
                "CXR classifier: PyTorch / torchvision not installed (%s).", exc,
            )
        except Exception as exc:
            _MODEL_MODE = "unavailable"
            logger.warning("CXR classifier load failed: %s", exc)


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def is_available() -> bool:
    _try_load()
    return _MODEL_MODE == "torch"


def get_model():
    """Return the loaded DenseNet121 (or None). Used by GradCAM++ hooks."""
    _try_load()
    return _MODEL


def image_size() -> int:
    return IMAGE_SIZE


def predict_proba_batch(images: list[Image.Image]) -> np.ndarray:
    """
    Run a single forward pass over `images` and return per-class
    sigmoid probabilities, shape (N, C).

    Raises RuntimeError if the model is unavailable. Callers should check
    `is_available()` first and fall back to a proxy explanation if False.
    """
    if not images:
        return np.zeros((0, NUM_CLASSES_DEFAULT), dtype=np.float32)

    _try_load()
    if _MODEL_MODE != "torch":
        raise RuntimeError("CXR classifier not available (PyTorch missing).")

    import torch  # type: ignore

    tensors = []
    for img in images:
        rgb = img.convert("RGB")
        tensors.append(_TRANSFORM(rgb))
    batch = torch.stack(tensors, dim=0).to(_DEVICE)

    with torch.inference_mode():
        logits = _MODEL(batch)               # (N, C)
        probs = torch.sigmoid(logits)        # multilabel head
    return probs.detach().cpu().numpy().astype(np.float32)


def predict_proba_for_class(
    images: list[Image.Image],
    class_idx: int,
) -> np.ndarray:
    """
    Convenience wrapper: returns probabilities for ONE class, shape (N,).
    Used as the LIME / SHAP `predict_fn` after we've decided which class
    to explain (typically `top_class(original_image)`).
    """
    probs = predict_proba_batch(images)
    if probs.shape[1] <= class_idx:
        raise IndexError(
            f"class_idx={class_idx} out of bounds for {probs.shape[1]} classes."
        )
    return probs[:, class_idx]


def top_class(image: Image.Image) -> int:
    """Return the argmax class index for a single image."""
    probs = predict_proba_batch([image])
    return int(np.argmax(probs[0]))
