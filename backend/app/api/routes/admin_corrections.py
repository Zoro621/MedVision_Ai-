"""
Admin Human-in-the-Loop (HIL) correction API.

These endpoints back the Admin Review page. The flow is:

  1. GET  /admin/corrections/queue           — paginated list of recent
                                                 assistant + vision traces
                                                 with filters.
  2. GET  /admin/corrections/traces/{id}     — full trace detail (citations,
                                                 agent steps, image / heatmap).
  3. POST /admin/corrections                 — submit a new correction.
  4. GET  /admin/corrections                 — paginated list of corrections.
  5. GET  /admin/corrections/{id}            — single correction detail.
  6. POST /admin/corrections/{id}/review     — apply / reject (must be a
                                                 *different* admin than the
                                                 author).
  7. GET  /admin/corrections/export.jsonl    — JSONL stream for fine-tuning.

Safety properties:
  * All routes require `UserRole.ADMIN` (and the admin allowlist enforced
    at login time).
  * Submitting a correction freezes a snapshot of the original AI output
    so we retain forensic ground truth even if the trace is later deleted.
  * Lifecycle transitions are append-only via `review_notes`; we never
    delete corrections.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.database import get_db
from app.models import (
    AdminCorrection,
    AgentStep,
    AssistantTrace,
    CorrectionStatus,
    CorrectionTargetKind,
    User,
    UserRole,
    VisionArtifact,
    VisionTrace,
)
from app.schemas.admin_corrections import (
    AdminCorrectionCreate,
    AdminCorrectionListOut,
    AdminCorrectionOut,
    AdminCorrectionReview,
    AgentStepOut,
    TraceCitationOut,
    TraceDetailOut,
    TraceQueueItemOut,
    TraceQueueOut,
)
from app.services.audit_log import write_audit_log

router = APIRouter(prefix="/admin/corrections", tags=["admin-corrections"])


# ── helpers ────────────────────────────────────────────────────────────────


def _truncate(value: str | None, *, limit: int = 180) -> str | None:
    if not value:
        return value
    value = value.strip()
    return value if len(value) <= limit else value[: limit - 1] + "…"


def _user_lookup(db: Session, user_ids: Iterable[str | None]) -> dict[str, User]:
    ids = {uid for uid in user_ids if uid}
    if not ids:
        return {}
    rows = db.scalars(select(User).where(User.id.in_(ids))).all()
    return {u.id: u for u in rows}


def _correction_to_out(
    correction: AdminCorrection,
    *,
    user_map: dict[str, User] | None = None,
) -> AdminCorrectionOut:
    user_map = user_map or {}
    author = user_map.get(correction.admin_user_id) if correction.admin_user_id else None
    reviewer = (
        user_map.get(correction.reviewed_by_user_id)
        if correction.reviewed_by_user_id
        else None
    )
    return AdminCorrectionOut(
        id=correction.id,
        target_kind=correction.target_kind.value,
        assistant_trace_id=correction.assistant_trace_id,
        vision_trace_id=correction.vision_trace_id,
        admin_user_id=correction.admin_user_id,
        admin_name=author.full_name if author else None,
        original_text=correction.original_text,
        original_payload=correction.original_payload,
        corrected_text=correction.corrected_text,
        corrected_payload=correction.corrected_payload,
        rationale=correction.rationale,
        concept_tags=correction.concept_tags,
        status=correction.status.value,
        reviewed_by_user_id=correction.reviewed_by_user_id,
        reviewed_by_name=reviewer.full_name if reviewer else None,
        reviewed_at=correction.reviewed_at,
        review_notes=correction.review_notes,
        created_at=correction.created_at,
        updated_at=correction.updated_at,
    )


def _existing_correction_for(
    db: Session, *, target_kind: CorrectionTargetKind, trace_id: str
) -> AdminCorrection | None:
    column = (
        AdminCorrection.assistant_trace_id
        if target_kind == CorrectionTargetKind.ASSISTANT
        else AdminCorrection.vision_trace_id
    )
    return db.scalar(
        select(AdminCorrection)
        .where(column == trace_id)
        .order_by(AdminCorrection.created_at.desc())
        .limit(1)
    )


# ── 1. Queue (recent traces awaiting review) ──────────────────────────────


@router.get("/queue", response_model=TraceQueueOut)
def get_correction_queue(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
    target_kind: str | None = Query(None, pattern="^(assistant|vision)$"),
    only_uncorrected: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> TraceQueueOut:
    """List recent assistant + vision traces, newest first."""
    items: list[TraceQueueItemOut] = []

    # Pull both tables, then sort by created_at and paginate in Python — cheap
    # at our scale (hundreds of traces/day) and avoids a UNION.
    assistant_rows: list[AssistantTrace] = []
    vision_rows: list[VisionTrace] = []
    if target_kind in (None, "assistant"):
        q = select(AssistantTrace).order_by(desc(AssistantTrace.created_at))
        assistant_rows = db.scalars(q.limit(500)).all()
    if target_kind in (None, "vision"):
        q = select(VisionTrace).order_by(desc(VisionTrace.created_at))
        vision_rows = db.scalars(q.limit(500)).all()

    user_ids = {row.user_id for row in (*assistant_rows, *vision_rows) if row.user_id}
    user_map = _user_lookup(db, user_ids)

    # Existing-correction lookup in one batched query.
    a_ids = [r.id for r in assistant_rows]
    v_ids = [r.id for r in vision_rows]
    corrected_a: set[str] = set()
    corrected_v: set[str] = set()
    if a_ids:
        corrected_a = set(
            db.scalars(
                select(AdminCorrection.assistant_trace_id).where(
                    AdminCorrection.assistant_trace_id.in_(a_ids)
                )
            ).all()
        )
    if v_ids:
        corrected_v = set(
            db.scalars(
                select(AdminCorrection.vision_trace_id).where(
                    AdminCorrection.vision_trace_id.in_(v_ids)
                )
            ).all()
        )

    for row in assistant_rows:
        has_corr = row.id in corrected_a
        if only_uncorrected and has_corr:
            continue
        u = user_map.get(row.user_id)
        meta = row.metadata_json or {}
        items.append(
            TraceQueueItemOut(
                trace_id=row.id,
                target_kind="assistant",
                user_id=row.user_id,
                user_name=u.full_name if u else None,
                user_email=u.email if u else None,
                created_at=row.created_at,
                question_preview=_truncate(row.question),
                answer_preview=_truncate(row.answer),
                confidence=meta.get("confidence") if isinstance(meta, dict) else None,
                has_existing_correction=has_corr,
            )
        )

    for row in vision_rows:
        has_corr = row.id in corrected_v
        if only_uncorrected and has_corr:
            continue
        u = user_map.get(row.user_id)
        req = row.request_json or {}
        resp = row.response_json or {}
        question = (req.get("question") or req.get("prompt") or row.action) if isinstance(req, dict) else row.action
        answer = (resp.get("answer") or resp.get("caption") or "") if isinstance(resp, dict) else ""
        items.append(
            TraceQueueItemOut(
                trace_id=row.id,
                target_kind="vision",
                user_id=row.user_id,
                user_name=u.full_name if u else None,
                user_email=u.email if u else None,
                created_at=row.created_at,
                question_preview=_truncate(question),
                answer_preview=_truncate(answer),
                has_existing_correction=has_corr,
            )
        )

    items.sort(key=lambda i: i.created_at, reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]

    return TraceQueueOut(items=page_items, total=total, page=page, page_size=page_size)


# ── 2. Trace detail ───────────────────────────────────────────────────────


@router.get("/traces/{target_kind}/{trace_id}", response_model=TraceDetailOut)
def get_trace_detail(
    target_kind: str,
    trace_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> TraceDetailOut:
    if target_kind not in ("assistant", "vision"):
        raise HTTPException(status_code=400, detail="invalid target_kind")

    if target_kind == "assistant":
        trace = db.get(AssistantTrace, trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail="assistant trace not found")
        user = db.get(User, trace.user_id) if trace.user_id else None
        meta = trace.metadata_json or {}
        steps = db.scalars(
            select(AgentStep)
            .where(AgentStep.trace_id == trace_id)
            .order_by(AgentStep.step_index.asc())
        ).all()
        agent_steps = [
            AgentStepOut(
                step_index=s.step_index,
                step_type=s.step_type,
                input_json=s.input_json,
                output_json=s.output_json,
                elapsed_ms=s.elapsed_ms,
            )
            for s in steps
        ]
        citations = [
            TraceCitationOut(**c) if isinstance(c, dict) else TraceCitationOut(snippet=str(c))
            for c in (trace.citations_json or [])
            if isinstance(c, dict)
        ]
        existing = _existing_correction_for(
            db,
            target_kind=CorrectionTargetKind.ASSISTANT,
            trace_id=trace_id,
        )
        existing_user_map = (
            _user_lookup(db, [existing.admin_user_id, existing.reviewed_by_user_id])
            if existing
            else {}
        )
        return TraceDetailOut(
            trace_id=trace.id,
            target_kind="assistant",
            user_id=trace.user_id,
            user_name=user.full_name if user else None,
            created_at=trace.created_at,
            question=trace.question,
            answer=trace.answer,
            citations=citations,
            confidence=meta.get("confidence") if isinstance(meta, dict) else None,
            faithfulness_score=meta.get("faithfulness_score")
            if isinstance(meta, dict)
            else None,
            agent_steps=agent_steps,
            existing_correction=_correction_to_out(existing, user_map=existing_user_map)
            if existing
            else None,
        )

    # vision branch
    trace = db.get(VisionTrace, trace_id)
    if not trace:
        raise HTTPException(status_code=404, detail="vision trace not found")
    user = db.get(User, trace.user_id) if trace.user_id else None
    req = trace.request_json or {}
    resp = trace.response_json or {}
    question = (
        req.get("question") or req.get("prompt") or trace.action
        if isinstance(req, dict)
        else trace.action
    )
    answer = (
        resp.get("answer") or resp.get("caption") or ""
        if isinstance(resp, dict)
        else ""
    )

    # Heatmap / image artifacts.
    artifacts = db.scalars(
        select(VisionArtifact).where(VisionArtifact.trace_id == trace_id)
    ).all()
    image_url: str | None = None
    heatmap_url: str | None = None
    for art in artifacts:
        url = f"/api/vision/artifacts/{art.id}"
        if art.kind in {"gradcam_heatmap", "lime_heatmap", "shap_heatmap"}:
            heatmap_url = url
        elif art.kind in {"original", "image"}:
            image_url = url

    existing = _existing_correction_for(
        db, target_kind=CorrectionTargetKind.VISION, trace_id=trace_id
    )
    existing_user_map = (
        _user_lookup(db, [existing.admin_user_id, existing.reviewed_by_user_id])
        if existing
        else {}
    )
    findings = (
        resp.get("findings") if isinstance(resp, dict) and isinstance(resp.get("findings"), list) else None
    )
    return TraceDetailOut(
        trace_id=trace.id,
        target_kind="vision",
        user_id=trace.user_id,
        user_name=user.full_name if user else None,
        created_at=trace.created_at,
        question=question,
        answer=answer,
        answer_payload=resp if isinstance(resp, dict) else None,
        image_url=image_url,
        heatmap_url=heatmap_url,
        findings=findings,
        existing_correction=_correction_to_out(existing, user_map=existing_user_map)
        if existing
        else None,
    )


# ── 3. Submit a new correction ────────────────────────────────────────────


@router.post(
    "",
    response_model=AdminCorrectionOut,
    status_code=status.HTTP_201_CREATED,
)
def submit_correction(
    payload: AdminCorrectionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminCorrectionOut:
    target_kind = (
        CorrectionTargetKind.ASSISTANT
        if payload.target_kind == "assistant"
        else CorrectionTargetKind.VISION
    )

    if target_kind == CorrectionTargetKind.ASSISTANT:
        if not payload.assistant_trace_id:
            raise HTTPException(status_code=400, detail="assistant_trace_id required")
        if payload.vision_trace_id:
            raise HTTPException(
                status_code=400,
                detail="vision_trace_id must be null for assistant corrections",
            )
        trace = db.get(AssistantTrace, payload.assistant_trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail="assistant trace not found")
        original_text = trace.answer
        original_payload = {
            "question": trace.question,
            "citations": trace.citations_json,
            "metadata": trace.metadata_json,
        }
    else:
        if not payload.vision_trace_id:
            raise HTTPException(status_code=400, detail="vision_trace_id required")
        if payload.assistant_trace_id:
            raise HTTPException(
                status_code=400,
                detail="assistant_trace_id must be null for vision corrections",
            )
        trace = db.get(VisionTrace, payload.vision_trace_id)
        if not trace:
            raise HTTPException(status_code=404, detail="vision trace not found")
        resp = trace.response_json or {}
        original_text = (
            (resp.get("answer") or resp.get("caption") or "")
            if isinstance(resp, dict)
            else ""
        )
        original_payload = {
            "request": trace.request_json,
            "response": trace.response_json,
            "action": trace.action,
        }

    correction = AdminCorrection(
        admin_user_id=admin.id,
        target_kind=target_kind,
        assistant_trace_id=payload.assistant_trace_id,
        vision_trace_id=payload.vision_trace_id,
        original_text=original_text,
        original_payload=original_payload,
        corrected_text=payload.corrected_text,
        corrected_payload=payload.corrected_payload,
        rationale=payload.rationale,
        concept_tags=payload.concept_tags,
        status=CorrectionStatus.PENDING,
    )
    db.add(correction)
    db.flush()

    write_audit_log(
        db,
        action="correction.submit",
        target_type="admin_correction",
        target_id=correction.id,
        actor_user_id=admin.id,
        metadata={
            "target_kind": target_kind.value,
            "trace_id": payload.assistant_trace_id or payload.vision_trace_id,
        },
    )
    db.commit()
    db.refresh(correction)

    return _correction_to_out(correction, user_map={admin.id: admin})


# ── 4. List corrections ───────────────────────────────────────────────────


@router.get("", response_model=AdminCorrectionListOut)
def list_corrections(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
    status_filter: str | None = Query(None, alias="status", pattern="^(pending|applied|rejected)$"),
    target_kind: str | None = Query(None, pattern="^(assistant|vision)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> AdminCorrectionListOut:
    q = select(AdminCorrection)
    count_q = select(func.count()).select_from(AdminCorrection)

    if status_filter:
        st = CorrectionStatus(status_filter)
        q = q.where(AdminCorrection.status == st)
        count_q = count_q.where(AdminCorrection.status == st)
    if target_kind:
        tk = CorrectionTargetKind(target_kind)
        q = q.where(AdminCorrection.target_kind == tk)
        count_q = count_q.where(AdminCorrection.target_kind == tk)

    total = db.scalar(count_q) or 0
    rows = db.scalars(
        q.order_by(AdminCorrection.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    user_map = _user_lookup(
        db,
        [r.admin_user_id for r in rows] + [r.reviewed_by_user_id for r in rows],
    )

    return AdminCorrectionListOut(
        items=[_correction_to_out(r, user_map=user_map) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


# ── 5. Single correction ──────────────────────────────────────────────────


@router.get("/{correction_id}", response_model=AdminCorrectionOut)
def get_correction(
    correction_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminCorrectionOut:
    row = db.get(AdminCorrection, correction_id)
    if not row:
        raise HTTPException(status_code=404, detail="correction not found")
    user_map = _user_lookup(db, [row.admin_user_id, row.reviewed_by_user_id])
    return _correction_to_out(row, user_map=user_map)


# ── 6. Review a correction (apply / reject) ───────────────────────────────


@router.post("/{correction_id}/review", response_model=AdminCorrectionOut)
def review_correction(
    correction_id: str,
    payload: AdminCorrectionReview,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminCorrectionOut:
    row = db.get(AdminCorrection, correction_id)
    if not row:
        raise HTTPException(status_code=404, detail="correction not found")
    if row.status != CorrectionStatus.PENDING:
        raise HTTPException(
            status_code=409,
            detail=f"correction already {row.status.value}",
        )
    if row.admin_user_id == admin.id:
        raise HTTPException(
            status_code=403,
            detail="reviewer must be a different admin than the author",
        )

    row.status = (
        CorrectionStatus.APPLIED if payload.decision == "apply" else CorrectionStatus.REJECTED
    )
    row.reviewed_by_user_id = admin.id
    row.reviewed_at = datetime.now(timezone.utc)
    row.review_notes = payload.review_notes

    write_audit_log(
        db,
        action=f"correction.{payload.decision}",
        target_type="admin_correction",
        target_id=row.id,
        actor_user_id=admin.id,
        metadata={"target_kind": row.target_kind.value},
    )
    db.commit()
    db.refresh(row)

    user_map = _user_lookup(db, [row.admin_user_id, row.reviewed_by_user_id])
    return _correction_to_out(row, user_map=user_map)


# ── 7. Export JSONL (for downstream fine-tuning) ──────────────────────────


@router.get("/export.jsonl")
def export_corrections_jsonl(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
    status_filter: str = Query("applied", alias="status", pattern="^(pending|applied|rejected|all)$"),
) -> StreamingResponse:
    """Stream applied corrections as newline-delimited JSON for offline jobs."""

    q = select(AdminCorrection).order_by(AdminCorrection.created_at.asc())
    if status_filter != "all":
        q = q.where(AdminCorrection.status == CorrectionStatus(status_filter))

    def _row_iter():
        for row in db.scalars(q).all():
            question: str | None = None
            citations: list = []
            image_url: str | None = None

            if row.assistant_trace_id:
                trace = db.get(AssistantTrace, row.assistant_trace_id)
                if trace:
                    question = trace.question
                    citations = trace.citations_json or []
            elif row.vision_trace_id:
                trace = db.get(VisionTrace, row.vision_trace_id)
                if trace:
                    req = trace.request_json or {}
                    if isinstance(req, dict):
                        question = req.get("question") or req.get("prompt")

            payload = {
                "correction_id": row.id,
                "target_kind": row.target_kind.value,
                "question": question,
                "original_answer": row.original_text,
                "corrected_answer": row.corrected_text,
                "rationale": row.rationale,
                "concept_tags": row.concept_tags or [],
                "citations": citations,
                "image_url": image_url,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            yield json.dumps(payload, ensure_ascii=False) + "\n"

    return StreamingResponse(
        _row_iter(),
        media_type="application/x-ndjson",
        headers={"Content-Disposition": 'attachment; filename="corrections.jsonl"'},
    )
