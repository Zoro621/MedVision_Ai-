"""
SHAP image explainability service — Phase 7 (KernelSHAP rewrite).

We now use **KernelSHAP** at patch granularity on the local DenseNet121
classifier (services.cxr_classifier). The previous implementation used
`shap.GradientExplainer`, which gives pixel-level attributions but:

  * Required differentiable access to the model (couldn't reuse the
    classifier facade we share with LIME).
  * Produced noisy pixel-level overlays that were hard to interpret on
    chest X-rays.

KernelSHAP is the model-agnostic flavour of SHAP. We:

  1. Divide the input into an `N × N` grid of patches (default 8 × 8 = 64
     features). Each patch is a "feature" in the Shapley game.
  2. For a coalition (binary mask over patches), absent patches are filled
     with the patch-wise mean grey value (the SHAP "background" baseline).
  3. The predict_fn batches ALL coalitions through one DenseNet forward
     pass and returns the probability of the original top class.

Falls back to an edge-density proxy if torch/shap aren't installed.

Returns
-------
  * top_pixels: patch-level summary of {x, y, w, h, value}
  * overlay_png_b64: red (+) / blue (-) attribution overlay
  * method: "shap" | "proxy"
  * explanation: human-readable summary
"""
from __future__ import annotations

import base64
import io
import logging
from dataclasses import dataclass

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

IMG_SIZE = 224


@dataclass
class ShapResult:
    overlay_png_b64: str
    top_pixels:      list[dict]    # [{x, y, w, h, value}]  (patch-level summary)
    method:          str           # "shap" | "saliency" | "proxy"
    explanation:     str           # human-readable summary


def explain_image_shap(
    *,
    image: Image.Image,
) -> ShapResult:
    """Main entry-point. Returns a `ShapResult`."""
    from app.core.config import get_settings
    settings = get_settings()

    if not settings.ml_features_enabled:
        logger.info("ML features disabled — using proxy SHAP.")
        return _proxy_shap(image=image)

    from app.services import cxr_classifier
    if not cxr_classifier.is_available():
        logger.info("Classifier unavailable — using proxy SHAP.")
        return _proxy_shap(image=image)

    try:
        return _run_kernel_shap(image=image, settings=settings)
    except ImportError as exc:
        logger.warning("shap package not installed (%s) — proxy fallback.", exc)
    except Exception as exc:
        logger.warning("KernelSHAP failed (%s) — proxy fallback.", exc)

    return _proxy_shap(image=image)


# ──────────────────────────────────────────────────────────────────────────────
# KernelSHAP on patch grid via batched DenseNet121 forward pass
# ──────────────────────────────────────────────────────────────────────────────

def _run_kernel_shap(*, image: Image.Image, settings) -> ShapResult:
    import shap  # type: ignore

    from app.services import cxr_classifier

    # ── 1) Configure patch grid ──────────────────────────────────────────────
    grid = max(4, int(getattr(settings, "shap_grid_size", 8)))   # 8x8 default
    n_features = grid * grid

    img_rgb = np.array(image.convert("RGB"))
    h, w, _ = img_rgb.shape
    ph, pw = h // grid, w // grid

    # ── 2) Pick the class to explain (top class on the unperturbed image) ────
    base_probs = cxr_classifier.predict_proba_batch([Image.fromarray(img_rgb)])[0]
    target_class = int(np.argmax(base_probs))

    # ── 3) Pre-compute the patch-mean baseline (the "absent" feature value) ──
    patch_means = np.zeros((grid, grid, 3), dtype=np.float32)
    for r in range(grid):
        for c in range(grid):
            y0, y1 = r * ph, min((r + 1) * ph, h)
            x0, x1 = c * pw, min((c + 1) * pw, w)
            patch_means[r, c] = img_rgb[y0:y1, x0:x1].reshape(-1, 3).mean(axis=0)

    # ── 4) predict_fn: maps Z (M, n_features) → probabilities (M,) ───────────
    # This is the SHAP-required signature. We render each row of Z as a
    # masked image and run them through the classifier as ONE big batch.
    def _predict_fn(z: np.ndarray) -> np.ndarray:
        z = np.asarray(z)
        if z.ndim == 1:
            z = z.reshape(1, -1)

        BATCH = 16
        out: list[float] = []
        for start in range(0, z.shape[0], BATCH):
            chunk = z[start : start + BATCH]
            imgs = [
                Image.fromarray(_render_masked(img_rgb, chunk[i], grid, ph, pw, patch_means))
                for i in range(chunk.shape[0])
            ]
            probs = cxr_classifier.predict_proba_for_class(imgs, target_class)
            out.extend(probs.tolist())
        return np.asarray(out, dtype=np.float32)

    # ── 5) Run KernelExplainer with ALL-ABSENT background (single sample) ────
    background = np.zeros((1, n_features), dtype=np.float32)
    explainer = shap.KernelExplainer(_predict_fn, background)

    # nsamples controls coalition draws; default ~ 2 * n_features + 2048 is too
    # heavy. We cap it so an 8×8 grid runs in ~3–5 s on a 3060.
    nsamples = max(64, int(getattr(settings, "shap_nsamples", 128)))
    shap_values = explainer.shap_values(
        np.ones((1, n_features), dtype=np.float32),
        nsamples=nsamples,
        silent=True,
    )
    if isinstance(shap_values, list):  # multi-output → already class-indexed
        shap_values = shap_values[0]
    sv_grid = np.asarray(shap_values).reshape(grid, grid)

    # ── 6) Upsample patch SHAP values with Gaussian smoothing ────────────────
    # Bilinear-resize the small grid first, then Gaussian-blur to remove
    # the hard rectangular block boundaries that look artefactual.
    sv_small = Image.fromarray(sv_grid.astype(np.float32))
    sv_resized = np.array(
        sv_small.resize((w, h), Image.BILINEAR),
        dtype=np.float32,
    )
    try:
        from scipy.ndimage import gaussian_filter  # type: ignore
        sigma_px = max(h, w) / (grid * 4)  # ~1/4 patch width
        sv_full = gaussian_filter(sv_resized, sigma=sigma_px)
    except ImportError:
        sv_full = sv_resized  # scipy not available; still better than hard blocks

    overlay_png, top_pixels, explanation = _render_shap_overlay(image, sv_full)
    return ShapResult(
        overlay_png_b64=base64.b64encode(overlay_png).decode(),
        top_pixels=top_pixels,
        method="shap",
        explanation=explanation,
    )


def _render_masked(
    img_rgb: np.ndarray,
    coalition: np.ndarray,
    grid: int,
    ph: int,
    pw: int,
    patch_means: np.ndarray,
) -> np.ndarray:
    """
    Apply a coalition mask: present patches keep their pixels; absent patches
    are replaced with the patch's mean colour (SHAP background baseline).
    """
    h, w, _ = img_rgb.shape
    out = img_rgb.copy()
    for idx, present in enumerate(coalition):
        if present > 0.5:
            continue
        r, c = divmod(idx, grid)
        y0, y1 = r * ph, min((r + 1) * ph, h)
        x0, x1 = c * pw, min((c + 1) * pw, w)
        out[y0:y1, x0:x1] = patch_means[r, c].astype(np.uint8)
    return out


# ──────────────────────────────────────────────────────────────────────────────
# Proxy (no PyTorch)
# ──────────────────────────────────────────────────────────────────────────────

def _proxy_shap(*, image: Image.Image) -> ShapResult:
    from PIL import ImageFilter

    gray   = np.array(image.convert("L"), dtype=np.float32) / 255.0
    edges  = np.array(
        Image.fromarray((gray * 255).astype(np.uint8)).filter(ImageFilter.FIND_EDGES),
        dtype=np.float32,
    ) / 255.0
    # Positive: high-edge areas.  Negative: flat/uniform areas.
    proxy = edges - (1.0 - edges) * 0.3

    overlay_png, top_pixels, explanation = _render_shap_overlay(image, proxy)
    return ShapResult(
        overlay_png_b64=base64.b64encode(overlay_png).decode(),
        top_pixels=top_pixels,
        method="proxy",
        explanation=explanation,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Shared rendering
# ──────────────────────────────────────────────────────────────────────────────

def _render_shap_overlay(
    image: Image.Image,
    sv: np.ndarray,
    patch_size: int = 16,
) -> tuple[bytes, list[dict], str]:
    """
    Render red (+) / blue (-) SHAP overlay and extract top patch summary.
    sv: 2-D float array (H×W), unnormalised.
    """
    w, h   = image.size
    sv_img = Image.fromarray(sv.astype(np.float32)).resize((w, h), Image.BILINEAR)
    sv_arr = np.array(sv_img, dtype=np.float32)

    # Normalise to [-1, +1]
    mx = np.abs(sv_arr).max() or 1.0
    sv_norm = sv_arr / mx

    # Percentile-based thresholds so both positive AND negative always appear
    # (fixed ±0.1 can miss all negatives when values cluster on one side).
    flat = sv_norm.ravel()
    pos_thresh = float(np.percentile(flat, 80))   # top 20% positive
    neg_thresh = float(np.percentile(flat, 20))   # bottom 20% negative
    pos_thresh = max(pos_thresh, 0.05)
    neg_thresh = min(neg_thresh, -0.05)

    # Build RGBA overlay
    orig  = np.array(image.convert("RGB"), dtype=np.float32)
    shap_overlay = np.zeros((h, w, 4), dtype=np.uint8)
    pos_mask = sv_norm > pos_thresh
    neg_mask = sv_norm < neg_thresh

    shap_overlay[pos_mask] = [220, 50,  50,  180]   # red for positive SHAP
    shap_overlay[neg_mask] = [50,  100, 220, 140]   # blue for negative SHAP

    # Blend
    alpha   = shap_overlay[:, :, 3:4].astype(np.float32) / 255.0
    rgb_out = (orig * (1 - alpha) + shap_overlay[:, :, :3] * alpha).clip(0, 255).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(rgb_out, mode="RGB").save(buf, format="PNG")
    overlay_png = buf.getvalue()

    # Extract patch-level summary
    ph, pw  = max(1, h // patch_size), max(1, w // patch_size)
    patches = []
    for row in range(ph):
        for col in range(pw):
            y0, y1 = row * patch_size, min((row + 1) * patch_size, h)
            x0, x1 = col * patch_size, min((col + 1) * patch_size, w)
            val = float(sv_norm[y0:y1, x0:x1].mean())
            patches.append({"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "value": round(val, 4)})
    patches.sort(key=lambda p: abs(p["value"]), reverse=True)
    top_patches = patches[:12]

    pos_frac = float(pos_mask.mean())
    explanation = (
        f"Red regions ({pos_frac:.0%} of image) contributed positively to the prediction. "
        f"Blue regions had negative influence."
    )
    return overlay_png, top_patches, explanation
