from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.assistant import AssistantAskRequest, AssistantAskResponse
from app.services.assistant import (
    get_or_create_chat_session,
    persist_user_message,
    run_assistant_turn,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])


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

    return AssistantAskResponse(
        chat_session_id=session.id,
        trace_id=trace.id,
        answer=assistant_message.content,
        confidence=max(0, min(100, assistant_message.confidence or 0)),
        citations=[
            citation
            for citation in (assistant_message.citations_json or [])
        ],
    )
