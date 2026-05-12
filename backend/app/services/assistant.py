"""
Assistant service — wires the agentic RAG engine to persistence layer.

run_assistant_turn() is the single public entry-point called by the route.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import AgentStep, AssistantTrace, ChatMessage, ChatSession, User
from app.schemas.assistant import AssistantCitation, AssistantMode
from app.schemas.documents import DocumentChunkHit
from app.services.rag_agent import AgentAnswer
# The agent is now driven by LangGraph (services/rag_graph.py).
# `run_rag_graph` keeps the same call signature and return shape as the
# legacy `run_rag_agent`, and falls back to the legacy implementation
# automatically if the `langgraph` package is not installed.
from app.services.rag_graph import run_rag_graph


# ──────────────────────────────────────────────────────────────────────────────
# Chat session helpers
# ──────────────────────────────────────────────────────────────────────────────

def get_or_create_chat_session(
    *,
    db: Session,
    user: User,
    chat_session_id: str | None,
    title_hint: str,
) -> ChatSession:
    if chat_session_id:
        session = db.get(ChatSession, chat_session_id)
        if session is None or session.user_id != user.id:
            raise ValueError("Chat session not found.")
        return session

    title = (title_hint or "New chat").strip()
    if len(title) > 80:
        title = f"{title[:77].rstrip()}..."
    session = ChatSession(user_id=user.id, title=title)
    db.add(session)
    db.flush()
    return session


def persist_user_message(
    *, db: Session, chat_session_id: str, content: str
) -> ChatMessage:
    message = ChatMessage(
        chat_session_id=chat_session_id,
        role="user",
        content=content,
    )
    db.add(message)
    _touch_session(db, chat_session_id)
    db.flush()
    return message


def persist_assistant_message(
    *,
    db: Session,
    chat_session_id: str,
    content: str,
    citations: list[AssistantCitation],
    confidence: int,
    trace_id: str,
) -> ChatMessage:
    message = ChatMessage(
        chat_session_id=chat_session_id,
        role="assistant",
        content=content,
        citations_json=[c.model_dump(by_alias=True) for c in citations],
        confidence=confidence,
        trace_id=trace_id,
    )
    db.add(message)
    _touch_session(db, chat_session_id)
    db.flush()
    return message


def _touch_session(db: Session, chat_session_id: str) -> None:
    session = db.get(ChatSession, chat_session_id)
    if session is not None:
        session.updated_at = datetime.now(timezone.utc)


# ──────────────────────────────────────────────────────────────────────────────
# Trace persistence
# ──────────────────────────────────────────────────────────────────────────────

def _persist_trace(
    *,
    db: Session,
    user: User,
    chat_session_id: str,
    question: str,
    agent_answer: AgentAnswer,
    top_k: int,
    elapsed_ms: int,
    retrieval_mode: str,
) -> AssistantTrace:
    trace = AssistantTrace(
        chat_session_id=chat_session_id,
        user_id=user.id,
        question=question,
        answer=agent_answer.answer,
        retrieval_mode=retrieval_mode,
        top_k=top_k,
        model_provider=agent_answer.model_provider,
        model_name=agent_answer.model_name,
        hits_json=[h.model_dump(by_alias=True) for h in agent_answer.hits],
        citations_json=[c.model_dump(by_alias=True) for c in agent_answer.citations],
        faithfulness_passed=agent_answer.faithfulness_passed,
        verifier_notes=agent_answer.verifier_notes,
        metadata_json={
            "elapsedMs": elapsed_ms,
            "iterations": agent_answer.iterations,
            "reasoningSteps": agent_answer.reasoning_steps,
        },
    )
    db.add(trace)
    db.flush()
    return trace


def _persist_agent_steps(
    db: Session, *, trace_id: str, reasoning_steps: list[dict]
) -> None:
    """Materialize in-memory reasoning steps into `agent_steps` for API/UI queries."""
    for step in reasoning_steps:
        idx = int(step.get("stepIndex", 0))
        db.add(
            AgentStep(
                trace_id=trace_id,
                step_index=idx,
                step_type=str(step.get("stepType") or "unknown")[:64],
                input_json=step.get("input"),
                output_json=step.get("output"),
                elapsed_ms=step.get("elapsedMs"),
            )
        )


# ──────────────────────────────────────────────────────────────────────────────
# Main entry-point (called by route)
# ──────────────────────────────────────────────────────────────────────────────

def run_assistant_turn(
    *,
    db: Session,
    user: User,
    question: str,
    chat_session_id: str,
    top_k: int,
    document_ids: list[str] | None,
    mode: str,
) -> tuple[AssistantTrace, ChatMessage]:
    start = time.monotonic()
    retrieval_mode = "agentic_hybrid" if mode != AssistantMode.MEDICAL_CHAT else "none"

    # First pass — run without trace_id so agent steps are in memory only.
    # The legacy hand-rolled loop has been replaced by a LangGraph DAG; the
    # call signature is unchanged.
    agent_answer = run_rag_graph(
        db=db,
        user=user,
        question=question,
        chat_session_id=chat_session_id,
        top_k=top_k,
        document_ids=document_ids,
        mode=mode,
        trace_id=None,
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    # Persist trace
    trace = _persist_trace(
        db=db,
        user=user,
        chat_session_id=chat_session_id,
        question=question,
        agent_answer=agent_answer,
        top_k=top_k,
        elapsed_ms=elapsed_ms,
        retrieval_mode=retrieval_mode,
    )
    if agent_answer.reasoning_steps:
        _persist_agent_steps(db, trace_id=trace.id, reasoning_steps=agent_answer.reasoning_steps)

    # Persist assistant message
    message = persist_assistant_message(
        db=db,
        chat_session_id=chat_session_id,
        content=agent_answer.answer,
        citations=agent_answer.citations,
        confidence=agent_answer.confidence,
        trace_id=trace.id,
    )
    return trace, message
