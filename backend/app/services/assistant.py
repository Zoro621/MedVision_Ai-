import json
import time
import urllib.request
import urllib.error
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import AssistantTrace, ChatMessage, ChatSession, User
from app.schemas.assistant import AssistantCitation, AssistantMode
from app.schemas.documents import DocumentChunkHit
from app.services.retrieval import search_document_chunks


@dataclass(frozen=True)
class AssistantAnswer:
    answer: str
    confidence: int
    citations: list[AssistantCitation]
    hits: list[DocumentChunkHit]
    model_provider: str
    model_name: str | None
    faithfulness_passed: bool | None
    verifier_notes: str | None


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


def persist_user_message(*, db: Session, chat_session_id: str, content: str) -> ChatMessage:
    message = ChatMessage(
        chat_session_id=chat_session_id,
        role="user",
        content=content,
    )
    db.add(message)
    session = db.get(ChatSession, chat_session_id)
    if session is not None:
        session.updated_at = datetime.now(timezone.utc)
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
    session = db.get(ChatSession, chat_session_id)
    if session is not None:
        session.updated_at = datetime.now(timezone.utc)
    db.flush()
    return message


def answer_question(
    *,
    db: Session,
    user: User,
    question: str,
    chat_session_id: str,
    top_k: int = 6,
    document_ids: list[str] | None = None,
    mode: str = AssistantMode.RAG,
) -> AssistantAnswer:
    settings = get_settings()

    if mode == AssistantMode.MEDICAL_CHAT:
        answer = _medical_chat_answer(question=question)
        return AssistantAnswer(
            answer=answer,
            confidence=65,
            citations=[],
            hits=[],
            model_provider="gemini",
            model_name=getattr(settings, "assistant_gemini_model", None) or "gemini-2.5-flash-lite",
            faithfulness_passed=None,
            verifier_notes=None,
        )

    hits = search_document_chunks(
        db=db,
        user=user,
        query=question,
        top_k=top_k,
        document_ids=document_ids,
    )
    citations = _build_citations(hits=hits)

    if not hits:
        return AssistantAnswer(
            answer=(
                "I could not find indexed material matching that question yet. "
                "Upload a document (or wait for ingestion to complete), then try again."
            ),
            confidence=0,
            citations=[],
            hits=[],
            model_provider="none",
            model_name=None,
            faithfulness_passed=None,
            verifier_notes=None,
        )

    provider = (getattr(settings, "assistant_llm_provider", "none") or "none").strip().lower()
    if provider not in ("openai", "gemini"):
        provider = "none"

    if provider == "none":
        # Extractive fallback: still grounded, but no synthesis.
        summary_lines = [
            f"{index + 1}. {hit.document_name} (page {hit.page_start})"
            f"{f' - {hit.section_heading}' if hit.section_heading else ''}\n{hit.snippet}"
            for index, hit in enumerate(hits)
        ]
        answer = (
            "Here are the most relevant indexed passages I found in your uploaded material:\n\n"
            + "\n\n".join(summary_lines)
        )
        confidence = max(0, min(100, round((hits[0].score if hits else 0.0) * 100)))
        return AssistantAnswer(
            answer=answer,
            confidence=confidence,
            citations=citations,
            hits=hits,
            model_provider="none",
            model_name=None,
            faithfulness_passed=None,
            verifier_notes=None,
        )

    if provider == "gemini":
        model = getattr(settings, "assistant_gemini_model", None) or "gemini-2.5-flash-lite"
        api_key = getattr(settings, "assistant_gemini_api_key", None)
        if not api_key:
            answer = (
                "LLM synthesis is not configured on the backend yet. "
                "Set `ASSISTANT_LLM_PROVIDER=gemini` and `ASSISTANT_GEMINI_API_KEY=...` "
                "to enable NotebookLM-style grounded answers. For now, here are the most relevant passages:\n\n"
            )
            summary_lines = [
                f"{index + 1}. {hit.document_name} (page {hit.page_start})\n{hit.snippet}"
                for index, hit in enumerate(hits)
            ]
            answer += "\n\n".join(summary_lines)
            confidence = max(0, min(100, round((hits[0].score if hits else 0.0) * 100)))
            return AssistantAnswer(
                answer=answer,
                confidence=confidence,
                citations=citations,
                hits=hits,
                model_provider="gemini",
                model_name=model,
                faithfulness_passed=None,
                verifier_notes="missing_api_key",
            )

        try:
            synthesized = _gemini_synthesize_rag(
                api_key=api_key,
                model=model,
                question=question,
                hits=hits,
            )
        except urllib.error.HTTPError as exc:
            # Stay functional even if the upstream LLM is unavailable.
            summary_lines = [
                f"{index + 1}. {hit.document_name} (page {hit.page_start})\n{hit.snippet}"
                for index, hit in enumerate(hits)
            ]
            answer = (
                f"Gemini request failed (HTTP {exc.code}). Returning grounded excerpts only:\n\n"
                + "\n\n".join(summary_lines)
            )
            confidence = max(0, min(100, round((hits[0].score if hits else 0.0) * 100)))
            return AssistantAnswer(
                answer=answer,
                confidence=confidence,
                citations=citations,
                hits=hits,
                model_provider="gemini",
                model_name=model,
                faithfulness_passed=None,
                verifier_notes=f"gemini_http_{exc.code}",
            )
        except Exception:
            summary_lines = [
                f"{index + 1}. {hit.document_name} (page {hit.page_start})\n{hit.snippet}"
                for index, hit in enumerate(hits)
            ]
            answer = (
                "I couldn’t reach Gemini right now, so I’m returning grounded excerpts only:\n\n"
                + "\n\n".join(summary_lines)
            )
            confidence = max(0, min(100, round((hits[0].score if hits else 0.0) * 100)))
            return AssistantAnswer(
                answer=answer,
                confidence=confidence,
                citations=citations,
                hits=hits,
                model_provider="gemini",
                model_name=model,
                faithfulness_passed=None,
                verifier_notes="llm_unavailable",
            )

        # No verifier for Gemini yet; confidence is retrieval-based.
        confidence = _score_confidence(hits=hits, faithfulness_passed=None)
        return AssistantAnswer(
            answer=synthesized,
            confidence=confidence,
            citations=citations,
            hits=hits,
            model_provider="gemini",
            model_name=model,
            faithfulness_passed=None,
            verifier_notes=None,
        )

    model = getattr(settings, "assistant_openai_model", None) or "gpt-4o-mini"
    api_key = getattr(settings, "assistant_openai_api_key", None)
    base_url = getattr(settings, "assistant_openai_base_url", None) or "https://api.openai.com/v1"

    if not api_key:
        answer = (
            "LLM synthesis is not configured on the backend yet. "
            "Set `ASSISTANT_LLM_PROVIDER=openai` and `ASSISTANT_OPENAI_API_KEY=...` "
            "to enable grounded answer generation. For now, here are the most relevant passages:\n\n"
        )
        summary_lines = [
            f"{index + 1}. {hit.document_name} (page {hit.page_start})\n{hit.snippet}"
            for index, hit in enumerate(hits)
        ]
        answer += "\n\n".join(summary_lines)
        confidence = max(0, min(100, round((hits[0].score if hits else 0.0) * 100)))
        return AssistantAnswer(
            answer=answer,
            confidence=confidence,
            citations=citations,
            hits=hits,
            model_provider="openai",
            model_name=model,
            faithfulness_passed=None,
            verifier_notes="missing_api_key",
        )

    try:
        synthesized = _openai_synthesize(
            base_url=base_url,
            api_key=api_key,
            model=model,
            question=question,
            hits=hits,
        )
    except Exception:
        # Stay functional even if the upstream LLM is unavailable.
        summary_lines = [
            f"{index + 1}. {hit.document_name} (page {hit.page_start})\n{hit.snippet}"
            for index, hit in enumerate(hits)
        ]
        answer = (
            "I could not reach the configured LLM provider right now, so I’m returning grounded excerpts only:\n\n"
            + "\n\n".join(summary_lines)
        )
        confidence = max(0, min(100, round((hits[0].score if hits else 0.0) * 100)))
        return AssistantAnswer(
            answer=answer,
            confidence=confidence,
            citations=citations,
            hits=hits,
            model_provider="openai",
            model_name=model,
            faithfulness_passed=None,
            verifier_notes="llm_unavailable",
        )

    faithfulness_passed: bool | None = None
    verifier_notes: str | None = None
    if getattr(settings, "assistant_enable_verifier", False):
        try:
            faithfulness_passed, verifier_notes = _openai_verify_faithfulness(
                base_url=base_url,
                api_key=api_key,
                model=model,
                question=question,
                answer=synthesized,
                hits=hits,
            )
        except Exception:
            faithfulness_passed, verifier_notes = None, "verifier_unavailable"

    confidence = _score_confidence(
        hits=hits,
        faithfulness_passed=faithfulness_passed,
    )
    return AssistantAnswer(
        answer=synthesized,
        confidence=confidence,
        citations=citations,
        hits=hits,
        model_provider="openai",
        model_name=model,
        faithfulness_passed=faithfulness_passed,
        verifier_notes=verifier_notes,
    )


def persist_trace(
    *,
    db: Session,
    user: User,
    chat_session_id: str,
    question: str,
    assistant_answer: AssistantAnswer,
    top_k: int,
    elapsed_ms: int,
    retrieval_mode: str,
) -> AssistantTrace:
    trace = AssistantTrace(
        chat_session_id=chat_session_id,
        user_id=user.id,
        question=question,
        answer=assistant_answer.answer,
        retrieval_mode=retrieval_mode,
        top_k=top_k,
        model_provider=assistant_answer.model_provider,
        model_name=assistant_answer.model_name,
        hits_json=[hit.model_dump(by_alias=True) for hit in assistant_answer.hits],
        citations_json=[c.model_dump(by_alias=True) for c in assistant_answer.citations],
        faithfulness_passed=assistant_answer.faithfulness_passed,
        verifier_notes=assistant_answer.verifier_notes,
        metadata_json={"elapsedMs": elapsed_ms},
    )
    db.add(trace)
    db.flush()
    return trace


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
    retrieval_mode = "hybrid_dense_bm25" if mode != AssistantMode.MEDICAL_CHAT else "none"
    assistant_answer = answer_question(
        db=db,
        user=user,
        question=question,
        chat_session_id=chat_session_id,
        top_k=top_k,
        document_ids=document_ids,
        mode=mode,
    )
    elapsed_ms = int((time.monotonic() - start) * 1000)

    trace = persist_trace(
        db=db,
        user=user,
        chat_session_id=chat_session_id,
        question=question,
        assistant_answer=assistant_answer,
        top_k=top_k,
        elapsed_ms=elapsed_ms,
        retrieval_mode=retrieval_mode,
    )
    message = persist_assistant_message(
        db=db,
        chat_session_id=chat_session_id,
        content=assistant_answer.answer,
        citations=assistant_answer.citations,
        confidence=assistant_answer.confidence,
        trace_id=trace.id,
    )
    return trace, message


def _build_citations(*, hits: list[DocumentChunkHit]) -> list[AssistantCitation]:
    citations: list[AssistantCitation] = []
    for hit in hits:
        citations.append(
            AssistantCitation(
                document_name=hit.citation.document_name,
                page=hit.citation.page_start,
                chapter=hit.section_heading or hit.citation.citation_label,
                snippet=hit.snippet,
            )
        )
    return citations


def _score_confidence(*, hits: list[DocumentChunkHit], faithfulness_passed: bool | None) -> int:
    base = max(0.0, min(1.0, hits[0].score if hits else 0.0))
    confidence = round(base * 100)
    if faithfulness_passed is False:
        confidence = max(5, min(60, confidence))
    return max(0, min(100, confidence))


def _format_context_blocks(*, hits: list[DocumentChunkHit], max_chars: int = 14000) -> str:
    blocks: list[str] = []
    used = 0
    for idx, hit in enumerate(hits, start=1):
        header = f"[{idx}] {hit.document_name} p{hit.page_start}-{hit.page_end}"
        if hit.section_heading:
            header += f" | {hit.section_heading}"
        text = hit.snippet
        block = f"{header}\n{text}"
        if used + len(block) > max_chars:
            break
        blocks.append(block)
        used += len(block)
    return "\n\n".join(blocks)


def _openai_synthesize(*, base_url: str, api_key: str, model: str, question: str, hits: list[DocumentChunkHit]) -> str:
    context = _format_context_blocks(hits=hits)
    system = (
        "You are MedVision AI, a radiology study assistant. "
        "Answer ONLY using the provided context passages. "
        "If the context is insufficient, say you don't have enough evidence. "
        "When you use a passage, cite it with bracket numbers like [1], [2]."
    )
    user = f"Question:\n{question}\n\nContext passages:\n{context}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.2,
    }
    response = _openai_chat(base_url=base_url, api_key=api_key, payload=payload)
    content = response.get("choices", [{}])[0].get("message", {}).get("content")
    return (content or "").strip() or "I could not generate an answer for that question."


def _openai_verify_faithfulness(
    *,
    base_url: str,
    api_key: str,
    model: str,
    question: str,
    answer: str,
    hits: list[DocumentChunkHit],
) -> tuple[bool, str | None]:
    context = _format_context_blocks(hits=hits)
    system = (
        "You are a strict verifier. Determine whether the answer is fully supported by the context. "
        "Return a JSON object with keys: supported (true/false), notes (string)."
    )
    user = f"Question:\n{question}\n\nAnswer:\n{answer}\n\nContext:\n{context}"

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    response = _openai_chat(base_url=base_url, api_key=api_key, payload=payload)
    content = response.get("choices", [{}])[0].get("message", {}).get("content") or "{}"
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return False, "verifier_invalid_json"
    supported = bool(parsed.get("supported"))
    notes = parsed.get("notes")
    return supported, notes if isinstance(notes, str) else None


def _openai_chat(*, base_url: str, api_key: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/chat/completions",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = resp.read()
    return json.loads(raw.decode("utf-8"))


def _gemini_synthesize_rag(*, api_key: str, model: str, question: str, hits: list[DocumentChunkHit]) -> str:
    """
    NotebookLM-style: retrieve -> synthesize, but force grounding on retrieved passages.

    We pass the retrieved passages as numbered context blocks [1], [2], ... and require
    the model to cite those numbers inline. Citations are also returned separately in the API.
    """
    context = _format_context_blocks(hits=hits)
    system = (
        "You are MedVision AI, a radiology study assistant. "
        "Answer ONLY using the provided context passages. "
        "If the context is insufficient, say you don't have enough evidence from the document. "
        "When you use a passage, cite it with bracket numbers like [1], [2]. "
        "Do not invent facts not present in the context."
    )
    user_text = f"Question:\n{question}\n\nContext passages:\n{context}\n\nWrite a grounded answer with citations."
    return _gemini_generate_text(
        api_key=api_key,
        model=model,
        system_instruction=system,
        user_text=user_text,
    )


def _medical_chat_answer(*, question: str) -> str:
    """
    Domain-specific medical chatbot (Chest X-ray / radiology education).
    This intentionally does not rely on user-uploaded documents; it is a separate mode from RAG.
    """
    settings = get_settings()
    api_key = getattr(settings, "assistant_gemini_api_key", None)
    model = getattr(settings, "assistant_gemini_model", None) or "gemini-2.5-flash-lite"
    if not api_key:
        return (
            "Medical chat mode is not configured yet. Add `ASSISTANT_GEMINI_API_KEY` to `backend/.env` "
            "and restart the backend.\n\n"
            "Tip: you can still use RAG mode to answer strictly from your uploaded documents."
        )

    system = (
        "You are MedVision AI, a medical-domain radiology tutor specializing in chest X-ray interpretation. "
        "Keep answers educational, structured, and high-yield for radiology students. "
        "Do not provide medical diagnosis or treatment advice for a real patient; suggest clinical correlation. "
        "Prefer differential diagnosis, key radiographic signs, and what to check next (view, positioning, technical factors)."
    )
    prompt = f"{question}\n\nAnswer as a chest X-ray radiology tutor."

    try:
        return _gemini_generate_text(
            api_key=api_key,
            model=model,
            system_instruction=system,
            user_text=prompt,
        )
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            return (
                "Gemini quota exceeded (HTTP 429). This API key has hit its current rate limit or free-tier quota. "
                "Please generate a new key in Google AI Studio (or wait for quota reset / enable billing), "
                "then restart the backend.\n\n"
                "Tip: you can still use RAG mode to answer from your indexed documents."
            )
        if exc.code in (401, 403):
            return (
                "Gemini authentication failed (HTTP 401/403). Please verify the API key is valid and enabled for the Gemini API, "
                "then restart the backend."
            )
        return (
            f"Gemini request failed (HTTP {exc.code}). Try again later, or switch back to RAG mode."
        )
    except Exception:
        return (
            "I couldn’t reach the Gemini service right now. "
            "Try again in a moment, or switch back to RAG mode for answers from your indexed documents."
        )


def _gemini_generate_text(
    *,
    api_key: str,
    model: str,
    system_instruction: str,
    user_text: str,
) -> str:
    """
    Gemini Developer API: models.generateContent
    POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {
            "role": "system",
            "parts": [{"text": system_instruction}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_text}],
            }
        ],
        "generationConfig": {"temperature": 0.3},
    }

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url=url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    # Response shape: candidates[0].content.parts[0].text
    candidates = raw.get("candidates") or []
    content = (candidates[0].get("content") if candidates else None) or {}
    parts = content.get("parts") or []
    text = (parts[0].get("text") if parts else None) or ""
    return text.strip() or "I couldn't generate a response."
