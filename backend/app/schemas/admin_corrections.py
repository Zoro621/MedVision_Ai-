"""
Pydantic schemas for the admin Human-in-the-Loop (HIL) correction workflow.

These schemas describe the JSON contracts of `/admin/corrections/*` routes
that allow the three production admins to:

  * inspect recent assistant / vision AI traces (the "queue"),
  * submit an authoritative correction for a single trace,
  * review pending corrections submitted by another admin,
  * apply / reject corrections (lifecycle transitions),
  * and export the full corpus as JSONL for downstream fine-tuning /
    distillation.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# ── Queue items ────────────────────────────────────────────────────────────

class TraceQueueItemOut(BaseModel):
    """A single AI trace surfaced in the admin review queue."""

    trace_id: str
    target_kind: Literal["assistant", "vision"]
    user_id: str | None = None
    user_name: str | None = None
    user_email: str | None = None
    created_at: datetime

    # Display-only summary fields (truncated server-side).
    question_preview: str | None = None
    answer_preview: str | None = None
    image_thumbnail_url: str | None = None  # vision only

    # Existing AI confidence / faithfulness if available.
    confidence: float | None = None
    has_existing_correction: bool = False


class TraceQueueOut(BaseModel):
    items: list[TraceQueueItemOut]
    total: int
    page: int
    page_size: int


# ── Trace detail (used by the Trace Inspector pane) ────────────────────────

class TraceCitationOut(BaseModel):
    document_id: str | None = None
    document_title: str | None = None
    page: int | None = None
    snippet: str | None = None
    score: float | None = None


class AgentStepOut(BaseModel):
    step_index: int
    step_type: str
    input_json: dict | None = None
    output_json: dict | None = None
    elapsed_ms: int | None = None


class TraceDetailOut(BaseModel):
    trace_id: str
    target_kind: Literal["assistant", "vision"]
    user_id: str | None = None
    user_name: str | None = None
    created_at: datetime

    # Question + answer.
    question: str | None = None
    answer: str
    answer_payload: dict | None = None  # structured (e.g. flashcards/quizzes)
    citations: list[TraceCitationOut] = []

    # Vision-only.
    image_url: str | None = None
    heatmap_url: str | None = None
    findings: list[dict] | None = None

    # Diagnostics.
    confidence: float | None = None
    faithfulness_score: float | None = None
    agent_steps: list[AgentStepOut] = []

    # Existing correction (if any).
    existing_correction: AdminCorrectionOut | None = None


# ── Submit / review corrections ────────────────────────────────────────────

class AdminCorrectionCreate(BaseModel):
    """Payload to create a new correction for a trace."""

    target_kind: Literal["assistant", "vision"]
    assistant_trace_id: str | None = None
    vision_trace_id: str | None = None

    corrected_text: str = Field(..., min_length=1)
    corrected_payload: dict | None = None
    rationale: str | None = None
    concept_tags: list[str] | None = None


class AdminCorrectionReview(BaseModel):
    """Payload for a second-admin review (apply / reject)."""

    decision: Literal["apply", "reject"]
    review_notes: str | None = None


class AdminCorrectionOut(BaseModel):
    id: str
    target_kind: Literal["assistant", "vision"]
    assistant_trace_id: str | None = None
    vision_trace_id: str | None = None

    admin_user_id: str | None = None
    admin_name: str | None = None

    original_text: str | None = None
    original_payload: dict | None = None

    corrected_text: str
    corrected_payload: dict | None = None
    rationale: str | None = None
    concept_tags: list[str] | None = None

    status: Literal["pending", "applied", "rejected"]
    reviewed_by_user_id: str | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime | None = None
    review_notes: str | None = None

    created_at: datetime
    updated_at: datetime


class AdminCorrectionListOut(BaseModel):
    items: list[AdminCorrectionOut]
    total: int
    page: int
    page_size: int


# Resolve forward refs introduced by the existing-correction nesting on
# TraceDetailOut.
TraceDetailOut.model_rebuild()


# ── Export ────────────────────────────────────────────────────────────────

class AdminCorrectionExportRow(BaseModel):
    """One JSONL row in the export feed (consumed by fine-tuning jobs)."""

    correction_id: str
    target_kind: Literal["assistant", "vision"]
    question: str | None = None
    original_answer: str | None = None
    corrected_answer: str
    rationale: str | None = None
    concept_tags: list[str] = []
    citations: list[Any] = []
    image_url: str | None = None
    created_at: datetime
