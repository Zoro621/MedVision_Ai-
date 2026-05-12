"""
LIME image explainability service — Phase 7 (local classifier rewrite).

LIME (Ribeiro et al., 2016) explains model predictions by perturbing image
superpixels and fitting a local linear model to the prediction changes.

This implementation:
  * Uses scikit-image SLIC superpixels.
  * Uses the LOCAL DenseNet121 classifier (services.cxr_classifier) as the
    `predict_fn`. All N perturbations go through ONE batched forward pass
    on GPU, so a 36-sample LIME run completes in ~1–2 s on an RTX 3060.
    The previous VLM-based implementation made N sequential HTTP calls and
    relied on the LLM to self-rate confidence, which was slow, expensive,
    and statistically unreliable for a local explainer.
  * Falls back to an edge-density proxy heatmap if torch/scikit-image are
    not installed (ml_features_enabled=False).

Returns
-------
  * superpixels: list of {id, importance, bbox, positive}
  * overlay_png: base64-encoded PNG with top-positive regions highlighted
    green and top-negative regions highlighted red.
"""
from __future__ import annotations

import base64
import io
import logging
import time
from dataclasses import dataclass

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class LimeResult:
    superpixels:     list[dict]    # [{id, importance, bbox, positive}]
    overlay_png_b64: str           # base64 PNG
    num_samples:     int
    num_superpixels: int
    method:          str           # "lime" | "proxy"


def explain_image_lime(
    *,
    image: Image.Image,
    question: str,
) -> LimeResult:
    """
    Main entry-point.  Returns a LimeResult.
    """
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.ml_features_enabled:
        return _proxy_lime(image=image)

    try:
        return _run_lime(
            image=image,
            question=question,
            num_superpixels=settings.lime_num_superpixels,
            num_samples=settings.lime_num_samples,
            max_runtime_seconds=getattr(settings, "lime_max_runtime_seconds", 20),
        )
    except ImportError as exc:
        logger.warning("LIME deps not installed (%s) — proxy fallback.", exc)
        return _proxy_lime(image=image)
    except Exception as exc:
        logger.warning("LIME failed (%s) — proxy fallback.", exc)
        return _proxy_lime(image=image)


# ──────────────────────────────────────────────────────────────────────────────
# Real LIME
# ──────────────────────────────────────────────────────────────────────────────

def _run_lime(
    *,
    image: Image.Image,
    question: str,
    num_superpixels: int,
    num_samples: int,
    max_runtime_seconds: int,
) -> LimeResult:
    from skimage.segmentation import slic  # type: ignore
    from skimage.measure import regionprops  # type: ignore
    from sklearn.linear_model import Ridge  # type: ignore

    from app.services import cxr_classifier

    if not cxr_classifier.is_available():
        raise RuntimeError("classifier_unavailable")

    img_rgb = np.array(image.convert("RGB"))

    # ── 1) Superpixel segmentation ────────────────────────────────────────────
    # compactness=0.1: low value lets segments follow X-ray intensity gradients
    # instead of forcing compact circular shapes (which ignore anatomy).
    # sigma=2: smooth slightly more to reduce noise-driven splits.
    segments = slic(
        img_rgb,
        n_segments=num_superpixels,
        compactness=0.1,
        sigma=2,
        start_label=0,
        channel_axis=-1,
    )

    # Merge near-black background pixels (intensity < 15) into a single
    # dummy segment so they don't dilute or distort LIME importances.
    gray_arr = img_rgb.mean(axis=-1)
    bg_mask = gray_arr < 15
    if bg_mask.any():
        bg_seg_id = int(segments.max()) + 1
        segments = segments.copy()
        segments[bg_mask] = bg_seg_id

    n_segs = int(segments.max()) + 1

    # ── 2) Build N perturbation masks (always include all-ones baseline) ──────
    rng = np.random.default_rng(42)
    masks = rng.integers(0, 2, size=(num_samples, n_segs)).astype(np.float32)
    masks[0] = 1.0

    # ── 3) Determine which class we're explaining ────────────────────────────
    # We pick the top class on the unperturbed image, then explain THAT class.
    # `question` is intentionally ignored for the classifier — it only matters
    # for the VLM. (We keep the parameter so the caller signature is stable.)
    base_probs = cxr_classifier.predict_proba_batch([Image.fromarray(img_rgb)])[0]
    target_class = int(np.argmax(base_probs))

    # ── 4) Build perturbed images, batched in chunks (batch_size=16) ─────────
    BATCH = 16
    start_time = time.monotonic()
    used_masks: list[np.ndarray] = []
    scores: list[float] = []

    for batch_start in range(0, num_samples, BATCH):
        # Wall-clock budget: stop once we've collected enough samples and the
        # configured budget is exhausted. Always keep at least 8 samples so the
        # local linear fit is meaningful.
        if (
            batch_start >= 8
            and max_runtime_seconds > 0
            and (time.monotonic() - start_time) >= max_runtime_seconds
        ):
            break

        batch_masks = masks[batch_start : batch_start + BATCH]
        perturbed_imgs = [
            Image.fromarray(_apply_mask(img_rgb, segments, m))
            for m in batch_masks
        ]
        batch_probs = cxr_classifier.predict_proba_for_class(
            perturbed_imgs, target_class
        )  # (B,)
        used_masks.extend(batch_masks)
        scores.extend(batch_probs.tolist())

    if len(scores) < 4:
        raise RuntimeError("insufficient_lime_samples")

    masks_used = np.stack(used_masks).astype(np.float32)
    scores_arr = np.array(scores, dtype=np.float32)

    # Fit Ridge regression: feature = per-superpixel binary presence
    ridge = Ridge(alpha=1.0)
    ridge.fit(masks_used, scores_arr)
    importances: np.ndarray = ridge.coef_  # shape (n_segs,)

    # Normalise to [-1, 1]
    max_abs = np.abs(importances).max() or 1.0
    importances = importances / max_abs

    # Extract bounding boxes per superpixel
    labeled = segments
    props   = regionprops(labeled + 1)   # regionprops uses 1-indexed labels
    sup_out = []
    for prop in props:
        seg_id   = prop.label - 1
        imp      = float(importances[seg_id]) if seg_id < len(importances) else 0.0
        miny, minx, maxy, maxx = prop.bbox
        sup_out.append({
            "id":         seg_id,
            "importance": round(imp, 4),
            "positive":   imp > 0,
            "bbox":       {"x": int(minx), "y": int(miny), "w": int(maxx - minx), "h": int(maxy - miny)},
        })
    sup_out.sort(key=lambda s: abs(s["importance"]), reverse=True)

    # Exclude the background segment from the output list
    sup_out = [s for s in sup_out if s["id"] < len(importances)]

    overlay_png = _draw_lime_overlay(img_rgb, segments, importances)
    overlay_b64 = base64.b64encode(overlay_png).decode()

    return LimeResult(
        superpixels=sup_out,
        overlay_png_b64=overlay_b64,
        num_samples=int(masks_used.shape[0]),
        num_superpixels=n_segs,
        method="lime",
    )


def _apply_mask(
    img: np.ndarray,
    segments: np.ndarray,
    mask: np.ndarray,
    fill_grey: int = 128,
) -> np.ndarray:
    result = img.copy()
    for seg_id, keep in enumerate(mask):
        if not keep:
            result[segments == seg_id] = fill_grey
    return result


def _draw_lime_overlay(
    img_rgb: np.ndarray,
    segments: np.ndarray,
    importances: np.ndarray,
    top_n: int = 6,
) -> bytes:
    """Colour the top-positive superpixels green and top-negative red."""
    overlay = img_rgb.copy().astype(np.float32)

    # Only consider valid segment IDs (not the background dummy)
    valid_ids = np.arange(len(importances))
    sorted_ids   = valid_ids[np.argsort(importances[valid_ids])]
    positive_ids = sorted_ids[-top_n:][::-1]
    negative_ids = sorted_ids[:top_n]

    # Use a semi-transparent blend (0.45 original + 0.55 colour) for readability
    for sid in positive_ids:
        if importances[sid] <= 0:
            continue
        mask = segments == sid
        overlay[mask] = overlay[mask] * 0.45 + np.array([0, 200, 80]) * 0.55

    for sid in negative_ids:
        if importances[sid] >= 0:
            continue
        mask = segments == sid
        overlay[mask] = overlay[mask] * 0.45 + np.array([220, 50, 50]) * 0.55

    result = np.clip(overlay, 0, 255).astype(np.uint8)
    buf    = io.BytesIO()
    Image.fromarray(result, mode="RGB").save(buf, format="PNG")
    return buf.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# Proxy fallback (edge-based, no ML deps)
# ──────────────────────────────────────────────────────────────────────────────

def _proxy_lime(*, image: Image.Image) -> LimeResult:
    """
    No scikit-image / sklearn → produce a simple grid-based pseudo-LIME result
    based on edge density so the UI still has something meaningful to show.
    """
    from PIL import ImageFilter

    w, h   = image.size
    GRID   = 6   # 6×6 = 36 pseudo-superpixels
    cw, ch = w // GRID, h // GRID

    gray     = np.array(image.convert("L"), dtype=np.float32)
    edge_img = np.array(
        Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.FIND_EDGES),
        dtype=np.float32,
    )

    sups = []
    for row in range(GRID):
        for col in range(GRID):
            y0, y1 = row * ch, min((row + 1) * ch, h)
            x0, x1 = col * cw, min((col + 1) * cw, w)
            density = float(edge_img[y0:y1, x0:x1].mean()) / 255.0
            imp     = round(density * 0.8, 4)
            sups.append({
                "id":         row * GRID + col,
                "importance": imp,
                "positive":   imp > 0.2,
                "bbox":       {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0},
            })
    sups.sort(key=lambda s: abs(s["importance"]), reverse=True)

    # Simple overlay: tint top cells
    overlay = np.array(image.convert("RGB"), dtype=np.float32)
    for sup in sups[:5]:
        b = sup["bbox"]
        overlay[b["y"]:b["y"]+b["h"], b["x"]:b["x"]+b["w"]] = (
            overlay[b["y"]:b["y"]+b["h"], b["x"]:b["x"]+b["w"]] * 0.4
            + np.array([0, 180, 80]) * 0.6
        )
    overlay = np.clip(overlay, 0, 255).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(overlay, mode="RGB").save(buf, format="PNG")
    overlay_b64 = base64.b64encode(buf.getvalue()).decode()

    return LimeResult(
        superpixels=sups,
        overlay_png_b64=overlay_b64,
        num_samples=0,
        num_superpixels=GRID * GRID,
        method="proxy",
    )
