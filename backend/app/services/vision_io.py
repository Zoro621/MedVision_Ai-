import base64
import io
from pathlib import Path

import numpy as np
from PIL import Image
from pydicom import dcmread

from app.models import Document, DocumentKind


def load_document_image(document: Document) -> tuple[Image.Image, str]:
    """
    Returns a PIL image and a best-effort mime type for Gemini inline_data.
    Supports standard images and basic DICOM pixel extraction.
    """
    path = Path(document.storage_path or "")
    if not path.exists():
        raise FileNotFoundError("Document storage file not found.")

    if document.kind == DocumentKind.DICOM:
        image = _load_dicom_as_image(path)
        return image, "image/png"

    image = Image.open(path).convert("RGB")
    mime = (document.mime_type or "").lower()
    if mime.startswith("image/"):
        return image, mime
    # Default for unknown
    return image, "image/png"


def pil_to_png_bytes(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def png_bytes_to_data_url(png_bytes: bytes) -> str:
    encoded = base64.b64encode(png_bytes).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def _load_dicom_as_image(path: Path) -> Image.Image:
    dataset = dcmread(str(path), stop_before_pixels=False, force=True)
    if not hasattr(dataset, "pixel_array"):
        raise ValueError("DICOM contains no pixel data.")

    pixels = dataset.pixel_array.astype(np.float32)
    # Normalize with windowing-ish approach (simple percentile clip).
    low, high = np.percentile(pixels, (1, 99))
    if high <= low:
        low, high = float(pixels.min()), float(pixels.max() or 1.0)
    pixels = np.clip((pixels - low) / (high - low + 1e-6), 0.0, 1.0)
    pixels_u8 = (pixels * 255).astype(np.uint8)

    if pixels_u8.ndim == 2:
        return Image.fromarray(pixels_u8, mode="L").convert("RGB")
    if pixels_u8.ndim == 3 and pixels_u8.shape[-1] in (3, 4):
        return Image.fromarray(pixels_u8[..., :3], mode="RGB")

    # Fallback: take first slice
    while pixels_u8.ndim > 2:
        pixels_u8 = pixels_u8[0]
    return Image.fromarray(pixels_u8, mode="L").convert("RGB")

