"""
GradCAM++ explainability service — Phase 7.

Uses a DenseNet121 backbone (CheXNet-compatible).

Priority order:
  1. CheXNet weights from CHEXNET_WEIGHTS_PATH         (best for CXR)
  2. ImageNet pretrained DenseNet121 from torchvision   (good general baseline)
  3. Proxy Gaussian heatmap                             (no PyTorch / ML_FEATURES_ENABLED=false)

GradCAM++ (Chattopadhyay et al., 2018) improves on vanilla GradCAM by
computing second-order gradients for better localisation of multiple ROIs.
"""
from __future__ import annotations

import io
import logging

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# The DenseNet121 is now owned by `services.cxr_classifier`. GradCAM, LIME,
# and SHAP all share the same instance to avoid duplicate model loads.
from app.services import cxr_classifier  # noqa: E402  (after logger setup)


def _try_load_model() -> None:
    """Compatibility shim: ensure cxr_classifier has loaded the model."""
    cxr_classifier._try_load()


def _model():
    """Return the shared classifier (or None)."""
    return cxr_classifier.get_model()


def _model_available() -> bool:
    return cxr_classifier.is_available()


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def generate_gradcam_heatmap_png(
    *,
    image: Image.Image,
    method: str = "gradcam++",
) -> bytes:
    """
    Returns a grayscale PNG where pixel intensity encodes activation strength.
    Callers convert to a jet-colourmap overlay for display.
    """
    _try_load_model()
    if _model_available():
        try:
            return _true_gradcam_plus_plus(image=image)
        except Exception as exc:
            logger.warning("True GradCAM++ failed (%s); falling back to proxy.", exc)
    return _proxy_heatmap(image)


def generate_gradcam_overlay_png(
    *,
    image: Image.Image,
    alpha: float = 0.45,
) -> bytes:
    """
    Returns an RGBA PNG of the original image with a jet-colourmap
    GradCAM++ overlay blended at `alpha` opacity.
    """
    heatmap_gray = np.frombuffer(
        generate_gradcam_heatmap_png(image=image), dtype=np.uint8
    )
    # Re-read the PNG bytes to get the actual array
    hm_img = Image.open(io.BytesIO(generate_gradcam_heatmap_png(image=image))).convert("L")
    hm_arr = np.array(hm_img, dtype=np.float32) / 255.0

    # Apply jet colormap (manual, no matplotlib dependency)
    jet = _jet_colormap(hm_arr)  # H×W×3 uint8

    orig  = image.convert("RGB").resize(hm_img.size, Image.BILINEAR)
    orig_arr = np.array(orig, dtype=np.float32)
    jet_f    = jet.astype(np.float32)
    blended  = (alpha * jet_f + (1 - alpha) * orig_arr).clip(0, 255).astype(np.uint8)

    out = io.BytesIO()
    Image.fromarray(blended, mode="RGB").save(out, format="PNG")
    return out.getvalue()


def get_heatmap_regions(heatmap_png: bytes, threshold: float = 0.6) -> list[dict]:
    """
    Extract bounding boxes of high-activation regions for explanation linking.
    Returns list of {x, y, w, h, intensity} dicts (pixel coords).
    """
    try:
        from scipy import ndimage  # type: ignore

        hm_img  = Image.open(io.BytesIO(heatmap_png)).convert("L")
        arr     = np.array(hm_img, dtype=np.float32) / 255.0
        mask    = arr >= threshold
        labeled, n = ndimage.label(mask)
        regions = []
        for label_id in range(1, n + 1):
            coords = np.argwhere(labeled == label_id)
            y0, x0 = coords.min(axis=0)
            y1, x1 = coords.max(axis=0)
            mean_intensity = float(arr[labeled == label_id].mean())
            regions.append({
                "x": int(x0), "y": int(y0),
                "w": int(x1 - x0), "h": int(y1 - y0),
                "intensity": round(mean_intensity, 3),
            })
        regions.sort(key=lambda r: r["intensity"], reverse=True)
        return regions[:8]  # top 8 regions
    except Exception:
        return []


# ──────────────────────────────────────────────────────────────────────────────
# True GradCAM++
# ──────────────────────────────────────────────────────────────────────────────

def _true_gradcam_plus_plus(*, image: Image.Image) -> bytes:
    import torch
    import torch.nn.functional as F
    import torchvision.transforms as T

    model = _model()
    if model is None:
        raise RuntimeError("DenseNet121 not available.")

    transform = T.Compose([
        T.Resize((224, 224)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    # Place tensor on the same device the model is on (cxr_classifier picks GPU
    # when available). Without this, hooks on a CUDA model with a CPU tensor
    # would crash.
    device = next(model.parameters()).device
    tensor = transform(image.convert("RGB")).unsqueeze(0).to(device)  # 1×C×H×W

    # Hook the last dense block
    target_layer = model.features.denseblock4  # type: ignore[union-attr]
    activations: list[torch.Tensor] = []
    gradients:   list[torch.Tensor] = []

    def fwd_hook(_, __, output):
        activations.append(output)

    def bwd_hook(_, __, grad_output):
        gradients.append(grad_output[0])

    fh = target_layer.register_forward_hook(fwd_hook)
    bh = target_layer.register_full_backward_hook(bwd_hook)

    try:
        model.zero_grad()
        output = model(tensor)
        # Use the highest-score class
        class_idx = output.argmax(dim=1).item()
        score = output[0, class_idx]
        score.backward()
    finally:
        fh.remove()
        bh.remove()

    act = activations[0].squeeze(0)   # C×h×w
    grd = gradients[0].squeeze(0)     # C×h×w

    # GradCAM++ weight computation
    # alpha_ck = grad^2 / (2*grad^2 + sum(A * grad^3) + eps)
    grad2 = grd ** 2
    grad3 = grd ** 3
    sum_act = act.sum(dim=(1, 2), keepdim=True)
    alpha   = grad2 / (2 * grad2 + sum_act * grad3 + 1e-8)
    weights  = (alpha * F.relu(grd)).sum(dim=(1, 2))  # C

    cam = (weights[:, None, None] * act).sum(0)        # h×w
    cam = F.relu(cam)

    # Normalise and upsample to original image size
    cam_np  = cam.detach().cpu().numpy()
    lo, hi  = cam_np.min(), cam_np.max()
    if hi <= lo:
        cam_np = np.zeros_like(cam_np)
    else:
        cam_np = (cam_np - lo) / (hi - lo)

    w, h = image.size
    cam_img = Image.fromarray((cam_np * 255).astype(np.uint8), mode="L")
    cam_img = cam_img.resize((w, h), Image.BILINEAR)

    out = io.BytesIO()
    cam_img.save(out, format="PNG")
    return out.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# Proxy fallback (no PyTorch)
# ──────────────────────────────────────────────────────────────────────────────

def _proxy_heatmap(image: Image.Image) -> bytes:
    from PIL import ImageFilter

    gray    = image.convert("L")
    edges   = gray.filter(ImageFilter.FIND_EDGES)
    arr     = np.asarray(edges, dtype=np.float32)
    blurred = Image.fromarray(
        np.clip(arr, 0, 255).astype(np.uint8), mode="L"
    ).filter(ImageFilter.GaussianBlur(radius=8))
    blurred = blurred.filter(ImageFilter.MaxFilter(size=3))
    arr2    = np.asarray(blurred, dtype=np.float32)
    lo, hi  = np.percentile(arr2, (5, 99))
    if hi <= lo:
        lo, hi = float(arr2.min()), float(arr2.max() or 1.0)
    norm    = np.clip((arr2 - lo) / (hi - lo + 1e-6), 0.0, 1.0)
    norm    = np.power(norm, 0.65)
    heat_u8 = (norm * 255).astype(np.uint8)
    out     = io.BytesIO()
    Image.fromarray(heat_u8, mode="L").save(out, format="PNG")
    return out.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# Jet colormap (no matplotlib)
# ──────────────────────────────────────────────────────────────────────────────

def _jet_colormap(arr: np.ndarray) -> np.ndarray:
    """Map 0-1 float array to uint8 RGB jet colormap."""
    r = np.clip(1.5 - np.abs(4 * arr - 3),     0, 1)
    g = np.clip(1.5 - np.abs(4 * arr - 2),     0, 1)
    b = np.clip(1.5 - np.abs(4 * arr - 1),     0, 1)
    rgb = np.stack([r, g, b], axis=-1)
    return (rgb * 255).astype(np.uint8)
