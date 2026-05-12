from __future__ import annotations

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import AgentStep, ChatMessage, ChatSession, User
from app.schemas.assistant import (
    AgentStepOut,
    AssistantAskRequest,
    AssistantAskResponse,
    AssistantSessionDetail,
    AssistantSessionMessage,
    AssistantSessionSummary,
)
from app.services.adaptive_learning import list_chat_session_summaries
from app.services.assistant import (
    get_or_create_chat_session,
    persist_user_message,
    run_assistant_turn,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _isoformat(value) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


@router.get("/sessions", response_model=list[AssistantSessionSummary])
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[AssistantSessionSummary]:
    return [
        AssistantSessionSummary.model_validate(payload)
        for payload in list_chat_session_summaries(db=db, user=user)
    ]


@router.get("/sessions/{session_id}", response_model=AssistantSessionDetail)
def get_session_detail(
    session_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AssistantSessionDetail:
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Chat session not found.")

    rows = db.scalars(
        select(ChatMessage)
        .where(ChatMessage.chat_session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    trace_ids = [row.trace_id for row in rows if row.trace_id]
    steps_by_trace: dict[str, list[AgentStepOut]] = {}
    if trace_ids:
        step_rows = db.scalars(
            select(AgentStep)
            .where(AgentStep.trace_id.in_(trace_ids))
            .order_by(AgentStep.trace_id.asc(), AgentStep.step_index.asc())
        ).all()
        for row in step_rows:
            steps_by_trace.setdefault(row.trace_id, []).append(
                AgentStepOut(
                    stepIndex=row.step_index,
                    stepType=row.step_type,
                    inputJson=row.input_json,
                    outputJson=row.output_json,
                    elapsedMs=row.elapsed_ms,
                )
            )

    return AssistantSessionDetail(
        id=session.id,
        title=session.title,
        createdAt=_isoformat(session.created_at),
        updatedAt=_isoformat(session.updated_at),
        messages=[
            AssistantSessionMessage(
                id=row.id,
                role=row.role,
                content=row.content,
                timestamp=_isoformat(row.created_at),
                citations=row.citations_json or [],
                confidence=row.confidence,
                traceId=row.trace_id,
                agentSteps=steps_by_trace.get(row.trace_id or "", []),
            )
            for row in rows
        ],
    )


@router.post("/ask", response_model=AssistantAskResponse)
def ask_assistant(
    payload: AssistantAskRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> AssistantAskResponse:
    try:
        session = get_or_create_chat_session(
            db=db,
            user=user,
            chat_session_id=payload.chat_session_id,
            title_hint=payload.question,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    persist_user_message(db=db, chat_session_id=session.id, content=payload.question)
    trace, assistant_message = run_assistant_turn(
        db=db,
        user=user,
        question=payload.question,
        chat_session_id=session.id,
        top_k=payload.top_k,
        document_ids=payload.document_ids,
        mode=payload.mode,
    )
    db.commit()

    # Load agent reasoning steps for UI accordion (table rows, or legacy metadata fallback)
    steps_rows = db.scalars(
        select(AgentStep)
        .where(AgentStep.trace_id == trace.id)
        .order_by(AgentStep.step_index)
    ).all()
    agent_steps = [
        AgentStepOut(
            stepIndex=row.step_index,
            stepType=row.step_type,
            inputJson=row.input_json,
            outputJson=row.output_json,
            elapsedMs=row.elapsed_ms,
        )
        for row in steps_rows
    ]
    if not agent_steps and trace.metadata_json:
        legacy = trace.metadata_json.get("reasoningSteps") or []
        for step in legacy:
            if not isinstance(step, dict):
                continue
            agent_steps.append(
                AgentStepOut(
                    stepIndex=int(step.get("stepIndex", 0)),
                    stepType=str(step.get("stepType") or "unknown"),
                    inputJson=step.get("input"),
                    outputJson=step.get("output"),
                    elapsedMs=step.get("elapsedMs"),
                )
            )

    return AssistantAskResponse(
        chat_session_id=session.id,
        trace_id=trace.id,
        answer=assistant_message.content,
        confidence=max(0, min(100, assistant_message.confidence or 0)),
        citations=[
            citation
            for citation in (assistant_message.citations_json or [])
        ],
        agent_steps=agent_steps,
    )
