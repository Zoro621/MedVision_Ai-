import io

import numpy as np
from PIL import Image, ImageFilter


def generate_gradcam_heatmap_png(*, image: Image.Image) -> bytes:
    """
    Lightweight, model-free GradCAM-style heatmap for educational UI wiring.
    Uses edge strength + blur as a proxy attention map, normalized to 0-255.
    Output is a grayscale PNG where pixel intensity is heat strength.
    """
    gray = image.convert("L")

    # Edge magnitude approximation using built-in filters.
    # FIND_EDGES is not Sobel, but good enough for a baseline overlay.
    edges = gray.filter(ImageFilter.FIND_EDGES)

    # Convert to numpy for normalization.
    arr = np.asarray(edges, dtype=np.float32)
    # Blur to produce contiguous blobs (more GradCAM-like), then lightly dilate
    # so the overlay is easier to see without heavy models.
    blurred = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), mode="L").filter(
        ImageFilter.GaussianBlur(radius=8)
    )
    blurred = blurred.filter(ImageFilter.MaxFilter(size=3))
    arr2 = np.asarray(blurred, dtype=np.float32)
    lo, hi = np.percentile(arr2, (5, 99))
    if hi <= lo:
        lo, hi = float(arr2.min()), float(arr2.max() or 1.0)
    norm = np.clip((arr2 - lo) / (hi - lo + 1e-6), 0.0, 1.0)
    # Gamma to lift mid-range activations for better visibility.
    norm = np.power(norm, 0.65)
    heat_u8 = (norm * 255).astype(np.uint8)

    output = io.BytesIO()
    Image.fromarray(heat_u8, mode="L").save(output, format="PNG")
    return output.getvalue()
