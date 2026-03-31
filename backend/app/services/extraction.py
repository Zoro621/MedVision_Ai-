from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image
from pydicom import dcmread
from pypdf import PdfReader

from app.core.config import get_settings
from app.models import Document, DocumentKind

settings = get_settings()


@dataclass
class ExtractedPage:
    page_number: int
    text: str
    section_heading: str | None = None


@dataclass
class ExtractedDocument:
    pages: list[ExtractedPage]
    extraction_engine: str

    @property
    def page_count(self) -> int:
        return len(self.pages)

    @property
    def combined_text(self) -> str:
        return "\n\n".join(page.text for page in self.pages if page.text)


def _guess_heading(text: str) -> str | None:
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if len(line) <= 80 and (line.isupper() or line.endswith(":")):
            return line.rstrip(":")
        return None
    return None


def extract_document_content(document: Document) -> ExtractedDocument:
    path = Path(document.storage_path or "")
    if document.kind == DocumentKind.PDF:
        return _extract_pdf(path)
    if document.kind == DocumentKind.DICOM:
        return _extract_dicom(path)
    return _extract_image(path)


def _extract_pdf(path: Path) -> ExtractedDocument:
    reader = PdfReader(str(path))
    raw_page_texts = [((page.extract_text() or "").strip()) for page in reader.pages]
    ocr_pages = _extract_with_paddleocr_vl(path) if settings.enable_paddleocr_vl else []

    pages: list[ExtractedPage] = []
    used_paddleocr = any(page.strip() for page in ocr_pages)
    for index, text in enumerate(raw_page_texts, 1):
        if len(ocr_pages) >= index and ocr_pages[index - 1].strip():
            text = ocr_pages[index - 1].strip()
        elif not text and len(ocr_pages) >= index:
            text = ocr_pages[index - 1].strip()
        if not text and settings.allow_ocr_fallback:
            text = (
                f"Scanned PDF page {index}. PaddleOCR-VL text extraction was unavailable "
                "in this environment."
            )
        pages.append(
            ExtractedPage(
                page_number=index,
                text=text,
                section_heading=_guess_heading(text),
            )
        )

    return ExtractedDocument(
        pages=pages,
        extraction_engine="paddleocr-vl-1.5" if used_paddleocr else "pypdf",
    )


def _extract_image(path: Path) -> ExtractedDocument:
    image = Image.open(path)
    metadata_text = (
        f"Image file {path.name}. Dimensions: {image.width}x{image.height}. "
        f"Color mode: {image.mode}."
    )

    if settings.enable_paddleocr_vl:
        ocr_pages = _extract_with_paddleocr_vl(path)
        ocr_text = "\n\n".join(page for page in ocr_pages if page).strip()
        text = "\n\n".join(part for part in [ocr_text, metadata_text] if part)
        engine = "paddleocr-vl-1.5" if ocr_text else "image-metadata-fallback"
    elif settings.allow_ocr_fallback:
        text = metadata_text
        engine = "image-metadata-fallback"
    else:
        raise ValueError("OCR is required for image ingestion but no OCR engine is enabled.")

    return ExtractedDocument(pages=[ExtractedPage(page_number=1, text=text)], extraction_engine=engine)


def _extract_dicom(path: Path) -> ExtractedDocument:
    dataset = dcmread(str(path), stop_before_pixels=False, force=True)
    parts = [
        f"DICOM file {path.name}.",
        "Metadata anonymization status: "
        f"PatientIdentityRemoved={getattr(dataset, 'PatientIdentityRemoved', 'UNKNOWN')}.",
        f"Modality: {getattr(dataset, 'Modality', 'Unknown')}.",
        f"Study description: {getattr(dataset, 'StudyDescription', 'N/A')}.",
        f"Series description: {getattr(dataset, 'SeriesDescription', 'N/A')}.",
        f"Body part examined: {getattr(dataset, 'BodyPartExamined', 'N/A')}.",
    ]
    rows = getattr(dataset, "Rows", None)
    cols = getattr(dataset, "Columns", None)
    if rows and cols:
        parts.append(f"Resolution: {rows}x{cols}.")
    if getattr(dataset, "DeidentificationMethod", None):
        parts.append(f"Deidentification method: {dataset.DeidentificationMethod}.")

    return ExtractedDocument(
        pages=[ExtractedPage(page_number=1, text=" ".join(parts))],
        extraction_engine="dicom-metadata",
    )


def _extract_with_paddleocr_vl(path: Path) -> list[str]:
    engine = _get_paddleocr_vl_engine()
    if engine is None:
        return []

    try:
        output = engine.predict(
            input=str(path),
            use_doc_orientation_classify=settings.paddleocr_vl_use_doc_orientation_classify,
            use_doc_unwarping=settings.paddleocr_vl_use_doc_unwarping,
        )
    except Exception:
        return []

    pages: list[str] = []
    for item in output:
        text = _coerce_paddleocr_page_text(item)
        pages.append(text.strip())
    return pages


@lru_cache(maxsize=1)
def _get_paddleocr_vl_engine() -> Any | None:
    try:
        from paddleocr import PaddleOCRVL  # type: ignore  # pragma: no cover
    except ImportError:
        return None

    try:
        # PaddleOCRVL() takes no model_name argument — it uses the built-in
        # default model (PaddleOCR-VL-1.5). Passing any extra kwargs here
        # raises TypeError and would silently return None, skipping OCR.
        return PaddleOCRVL()
    except Exception:
        return None


def _coerce_paddleocr_page_text(item: Any) -> str:
    markdown = getattr(item, "markdown", None)
    if markdown is None and isinstance(item, dict):
        markdown = item.get("markdown")

    text = _coerce_markdown_payload(markdown)
    if text:
        return text

    if isinstance(item, dict):
        return _coerce_markdown_payload(item)
    return ""


def _coerce_markdown_payload(payload: Any) -> str:
    if payload is None:
        return ""
    if isinstance(payload, str):
        return payload
    if isinstance(payload, dict):
        for key in ("text", "markdown_text", "markdown", "content"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
        blocks = payload.get("blocks")
        if isinstance(blocks, list):
            block_texts = [_coerce_markdown_payload(block) for block in blocks]
            return "\n\n".join(text for text in block_texts if text)
    if isinstance(payload, list):
        parts = [_coerce_markdown_payload(item) for item in payload]
        return "\n\n".join(text for text in parts if text)
    return ""
