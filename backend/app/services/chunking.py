"""
Advanced hierarchical + semantic chunking — Phase 2/7 upgrade.

Strategy:
  1. Hierarchical structure: Chapter → Section → Paragraph metadata preserved on
     every chunk so retrieval results carry full provenance.
  2. Semantic boundary detection: adjacent paragraphs whose lexical overlap drops
     below a threshold trigger a chunk boundary (simple but effective without
     requiring a second embedding pass).
  3. Table/figure isolation: chunks containing tabular or figure content are kept
     atomic (not merged into neighbouring text).
  4. Adaptive sizing: target 800–1 400 chars with 20 % overlap; very short
     paragraphs are merged into the next until the window fills up.
  5. Heading prepending: the section heading is prepended to every chunk's content
     so BM25 inherits the topical context even for short passages.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.services.extraction import ExtractedDocument
from app.services.embeddings import tokenize_text

# ── Sizing constants ──────────────────────────────────────────────────────────
TARGET_CHUNK_CHARS = 1_100   # sweet-spot for retrieval precision
MAX_CHUNK_CHARS    = 1_400   # hard limit before forced split
OVERLAP_RATIO      = 0.18    # 18 % overlap prevents boundary fragmentation
MIN_CHUNK_CHARS    = 120     # below this → merge with next paragraph

# ── Heading detection ─────────────────────────────────────────────────────────
# Matches lines that look like chapter/section headings:
#   "1. Introduction", "CHAPTER 2", "CT Findings:", "Key Learning Points"
_HEADING_RE = re.compile(
    r"^\s*(?:\d{1,3}[\.\)]\s+)?(?:[A-Z][A-Z\s]{3,}|[A-Z][a-z].*:)\s*$"
)
_TABLE_RE  = re.compile(r"\bTABLE\b|\bFIG(?:URE)?\b|\bFIG\.\b", re.IGNORECASE)
_ROMAN_RE  = re.compile(r"^(?:I{1,3}|IV|VI{0,3}|IX|X{0,3})\.\s+", re.IGNORECASE)


@dataclass
class ChunkDraft:
    chunk_index:      int
    chunk_type:       str
    section_heading:  str | None
    parent_heading:   str | None          # chapter-level heading
    hierarchy_level:  int                 # 0 = chapter, 1 = section, 2 = paragraph
    page_start:       int
    page_end:         int
    content:          str
    lexical_terms:    list[str]
    citation_label:   str
    citation_metadata: dict
    is_table:         bool = False
    is_figure:        bool = False
    token_count:      int = 0


def chunk_document(*, title: str, extracted: ExtractedDocument) -> list[ChunkDraft]:
    """
    Main entry-point.  Returns an ordered list of ChunkDraft objects ready for
    ingestion into PostgreSQL + Milvus.
    """
    raw_blocks = _extract_blocks(extracted)
    merged     = _merge_and_split(raw_blocks, title)
    return merged


# ──────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ──────────────────────────────────────────────────────────────────────────────

@dataclass
class _Block:
    text:            str
    page_number:     int
    section_heading: str | None
    parent_heading:  str | None
    hierarchy_level: int
    is_table:        bool
    is_figure:       bool


def _is_heading(text: str) -> bool:
    stripped = text.strip()
    if not stripped or len(stripped) > 120:
        return False
    if stripped.isupper() and len(stripped.split()) <= 8:
        return True
    if _HEADING_RE.match(stripped):
        return True
    if stripped.endswith(":") and len(stripped) <= 80:
        return True
    if _ROMAN_RE.match(stripped):
        return True
    return False


def _split_into_paragraphs(text: str) -> list[str]:
    """Split page text into paragraphs on double newlines."""
    parts = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
    return parts or [text.strip()]


def _extract_blocks(extracted: ExtractedDocument) -> list[_Block]:
    """
    Walk every page and paragraph, inferring headings and hierarchy.
    Returns a flat list of _Block, preserving page provenance.
    """
    blocks: list[_Block] = []
    chapter_heading: str | None = None
    section_heading: str | None = None

    for page in extracted.pages:
        # Use page-level section_heading as a starting context if available
        if page.section_heading:
            section_heading = page.section_heading.strip()

        paragraphs = _split_into_paragraphs(page.text)

        for para in paragraphs:
            # Single-line headings
            if _is_heading(para):
                # Distinguish chapter vs section by capitalisation pattern
                if para.isupper() or re.match(r"^\d+\.\s+[A-Z]", para):
                    chapter_heading = para.rstrip(":")
                    section_heading = None
                else:
                    section_heading = para.rstrip(":")
                continue

            is_table  = bool(_TABLE_RE.search(para[:60]))
            is_figure = "figure" in para[:60].lower() or "fig." in para[:60].lower()

            blocks.append(
                _Block(
                    text=para,
                    page_number=page.page_number,
                    section_heading=section_heading,
                    parent_heading=chapter_heading,
                    hierarchy_level=2,
                    is_table=is_table,
                    is_figure=is_figure,
                )
            )

    return blocks


def _lexical_overlap(a: str, b: str) -> float:
    """Jaccard overlap of token sets — cheap semantic boundary proxy."""
    ta = set(tokenize_text(a))
    tb = set(tokenize_text(b))
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _prepend_heading(text: str, heading: str | None) -> str:
    if heading and not text.lower().startswith(heading.lower()):
        return f"{heading}: {text}"
    return text


def _build_chunk(
    *,
    idx: int,
    title: str,
    blocks: list[_Block],
    content: str,
) -> ChunkDraft:
    first = blocks[0]
    last  = blocks[-1]
    is_table  = any(b.is_table  for b in blocks)
    is_figure = any(b.is_figure for b in blocks)

    # Prepend section heading so BM25 benefits from context terms
    enriched = _prepend_heading(content, first.section_heading)
    terms    = tokenize_text(enriched)

    page_start = first.page_number
    page_end   = last.page_number
    label      = f"{title} — p{page_start}"
    if first.section_heading:
        label = f"{title} — {first.section_heading} (p{page_start})"

    chunk_type = "table" if is_table else ("figure" if is_figure else
                 ("section" if first.section_heading else "paragraph"))

    return ChunkDraft(
        chunk_index=idx,
        chunk_type=chunk_type,
        section_heading=first.section_heading,
        parent_heading=first.parent_heading,
        hierarchy_level=first.hierarchy_level,
        page_start=page_start,
        page_end=page_end,
        content=enriched,
        lexical_terms=terms,
        citation_label=label,
        citation_metadata={
            "page": page_start,
            "sectionHeading": first.section_heading,
            "parentHeading": first.parent_heading,
            "citationLabel": label,
        },
        is_table=is_table,
        is_figure=is_figure,
        token_count=len(terms),
    )


def _split_long_block(text: str, max_chars: int, overlap_chars: int) -> list[str]:
    """Split a single very long paragraph, preserving overlap."""
    parts: list[str] = []
    while len(text) > max_chars:
        split_at = text.rfind(" ", 0, max_chars)
        if split_at == -1:
            split_at = max_chars
        parts.append(text[:split_at].strip())
        overlap_start = max(0, split_at - overlap_chars)
        text = text[overlap_start:].strip()
    if text:
        parts.append(text)
    return parts


def _merge_and_split(blocks: list[_Block], title: str) -> list[ChunkDraft]:
    """
    Greedy merge: accumulate blocks until we exceed TARGET_CHUNK_CHARS or hit a
    semantic boundary, then emit a chunk.  Tables/figures are always atomic.
    """
    overlap_chars = int(TARGET_CHUNK_CHARS * OVERLAP_RATIO)
    chunks: list[ChunkDraft] = []
    idx = 0

    window_blocks: list[_Block] = []
    window_text = ""

    def flush(carry_overlap: bool = True):
        nonlocal window_text, window_blocks, idx
        if not window_blocks:
            return
        chunks.append(
            _build_chunk(
                idx=idx,
                title=title,
                blocks=window_blocks,
                content=window_text,
            )
        )
        idx += 1
        if carry_overlap and window_text:
            # Keep a trailing overlap slice in the next window
            overlap = window_text[-overlap_chars:]
            window_text   = overlap
            window_blocks = [window_blocks[-1]]  # keep provenance of last block
        else:
            window_text   = ""
            window_blocks = []

    for i, block in enumerate(blocks):
        # ── Table / figure: always isolated ──────────────────────────────────
        if block.is_table or block.is_figure:
            flush(carry_overlap=False)
            # Handle oversized table cells
            for part in _split_long_block(block.text, MAX_CHUNK_CHARS, overlap_chars):
                chunks.append(
                    _build_chunk(
                        idx=idx,
                        title=title,
                        blocks=[block],
                        content=part,
                    )
                )
                idx += 1
            continue

        # ── Semantic boundary check ──────────────────────────────────────────
        heading_changed = (
            window_blocks
            and block.section_heading != window_blocks[-1].section_heading
        )
        # Only trigger semantic flush when the window is already substantial —
        # avoids premature single-block-per-page behaviour on low-overlap text.
        overlap_dropped = (
            window_blocks
            and _lexical_overlap(block.text, window_blocks[-1].text) < 0.15
        )
        if heading_changed or overlap_dropped:
            flush()

        # ── Very long single block ────────────────────────────────────────────
        if len(block.text) > MAX_CHUNK_CHARS:
            flush(carry_overlap=False)
            parts = _split_long_block(block.text, TARGET_CHUNK_CHARS, overlap_chars)
            for part in parts:
                chunks.append(
                    _build_chunk(
                        idx=idx,
                        title=title,
                        blocks=[block],
                        content=part,
                    )
                )
                idx += 1
            continue

        # ── Normal accumulation ───────────────────────────────────────────────
        candidate = (window_text + "\n" + block.text).strip() if window_text else block.text
        if len(candidate) > TARGET_CHUNK_CHARS and window_text:
            flush()
            candidate = block.text

        window_text = candidate
        window_blocks.append(block)

    flush(carry_overlap=False)
    return chunks
