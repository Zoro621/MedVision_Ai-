"""
Original chunking strategy — simple sliding window with word-boundary splits.

Produces ~1 chunk per page for dense medical textbooks (243 chunks for 242 pages).
MAX_CHUNK_CHARS=900, CHUNK_OVERLAP_CHARS=160, plain double-newline paragraph split.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.services.extraction import ExtractedDocument
from app.services.embeddings import tokenize_text

MAX_CHUNK_CHARS    = 900   # hard limit before word-boundary split
CHUNK_OVERLAP_CHARS = 160  # chars of overlap carried into next chunk


@dataclass
class ChunkDraft:
    chunk_index:       int
    chunk_type:        str
    section_heading:   str | None
    parent_heading:    str | None
    hierarchy_level:   int
    page_start:        int
    page_end:          int
    content:           str
    lexical_terms:     list[str]
    citation_label:    str
    citation_metadata: dict
    is_table:          bool = False
    is_figure:         bool = False
    token_count:       int = 0


def chunk_document(*, title: str, extracted: ExtractedDocument) -> list[ChunkDraft]:
    """Main entry-point. Returns ordered ChunkDraft list for ingestion."""
    chunks: list[ChunkDraft] = []
    carryover = ""
    chunk_index = 0

    for page in extracted.pages:
        paragraphs = [b.strip() for b in page.text.split("\n\n") if b.strip()]
        current_heading = page.section_heading

        for paragraph in paragraphs:
            if len(paragraph) <= 80 and (paragraph.isupper() or paragraph.endswith(":")):
                current_heading = paragraph.rstrip(":")
                continue

            working_text = f"{carryover}\n{paragraph}".strip() if carryover else paragraph
            while len(working_text) > MAX_CHUNK_CHARS:
                split_at = working_text.rfind(" ", 0, MAX_CHUNK_CHARS)
                if split_at == -1:
                    split_at = MAX_CHUNK_CHARS
                chunk_text = working_text[:split_at].strip()
                chunks.append(_build_chunk(
                    title=title,
                    chunk_index=chunk_index,
                    page_number=page.page_number,
                    section_heading=current_heading,
                    content=chunk_text,
                ))
                chunk_index += 1
                overlap = chunk_text[-CHUNK_OVERLAP_CHARS:]
                working_text = f"{overlap} {working_text[split_at:].strip()}".strip()
            carryover = working_text

        if carryover:
            chunks.append(_build_chunk(
                title=title,
                chunk_index=chunk_index,
                page_number=page.page_number,
                section_heading=current_heading,
                content=carryover,
            ))
            chunk_index += 1
            carryover = ""

    return chunks


def _build_chunk(
    *,
    title: str,
    chunk_index: int,
    page_number: int,
    section_heading: str | None,
    content: str,
) -> ChunkDraft:
    citation_label = f"{title} - page {page_number}"
    return ChunkDraft(
        chunk_index=chunk_index,
        chunk_type="section" if section_heading else "paragraph",
        section_heading=section_heading,
        parent_heading=None,
        hierarchy_level=2,
        page_start=page_number,
        page_end=page_number,
        content=content,
        lexical_terms=tokenize_text(content),
        citation_label=citation_label,
        citation_metadata={
            "page": page_number,
            "sectionHeading": section_heading,
            "citationLabel": citation_label,
        },
    )
