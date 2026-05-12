import difflib
import json
import logging
import random
import re
import time
import urllib.error
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import (
    AssistantTrace,
    ChatMessage,
    ChatSession,
    ChatTopicProgress,
    ContentStatus,
    DifficultyLevel,
    Document,
    DocumentChunk,
    Flashcard,
    FlashcardDeck,
    Quiz,
    QuizQuestion,
    ShownFlashcard,
    ShownQuizQuestion,
    User,
    UserProgress,
)
from app.services import local_llm
from app.services.bkt import batch_update_mastery, mastery_to_score
from app.services.retrieval import search_document_chunks

logger = logging.getLogger(__name__)

MAX_QUIZ_GENERATION_COUNT = 20
MAX_FLASHCARD_GENERATION_COUNT = 20
GENERATION_CONTEXT_MAX_CHARS = 3000
OPENAI_GENERATION_MAX_TOKENS = 384

TOPIC_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Chest": ("chest", "lung", "pulmonary", "thorax", "pleural", "ctpa", "embolism", "x-ray"),
    "Neuro": ("brain", "neuro", "stroke", "mri", "intracranial", "cranial", "cns"),
    "MSK": ("msk", "musculoskeletal", "bone", "joint", "fracture", "orthopedic", "spine"),
    "Abdominal": ("abdomen", "abdominal", "liver", "hepatic", "renal", "kidney", "bowel", "pancreas"),
    "Cardiac": ("cardiac", "heart", "coronary", "myocardial", "aorta", "vascular"),
    "Paediatric": ("pediatric", "paediatric", "child", "infant", "neonate"),
    "Interventional": ("interventional", "biopsy", "catheter", "embolization", "stent"),
}


@dataclass(frozen=True)
class ChatSessionScope:
    session: ChatSession
    messages: list[ChatMessage]
    chunks: list[DocumentChunk]
    documents: list[Document]
    document_ids: list[str]
    topics: list[str]


def require_owned_chat_session(*, db: Session, user: User, chat_session_id: str) -> ChatSession:
    session = db.get(ChatSession, chat_session_id)
    if session is None or session.user_id != user.id:
        raise ValueError("Chat session not found.")
    return session


def build_chat_session_scope(
    *,
    db: Session,
    user: User,
    chat_session_id: str,
    max_messages: int = 10,
    max_chunks: int = 10,
) -> ChatSessionScope:
    session = require_owned_chat_session(db=db, user=user, chat_session_id=chat_session_id)

    messages = list(
        reversed(
            db.scalars(
                select(ChatMessage)
                .where(ChatMessage.chat_session_id == chat_session_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(max_messages)
            ).all()
        )
    )

    trace_rows = db.execute(
        select(AssistantTrace.hits_json)
        .where(AssistantTrace.chat_session_id == chat_session_id)
        .order_by(AssistantTrace.created_at.desc())
        .limit(12)
    ).all()

    chunk_ids: list[str] = []
    document_ids: list[str] = []
    for (hits_json,) in trace_rows:
        for hit in hits_json or []:
            chunk_id = hit.get("chunkId") or hit.get("chunk_id")
            document_id = hit.get("documentId") or hit.get("document_id")
            if chunk_id and chunk_id not in chunk_ids:
                chunk_ids.append(chunk_id)
            if document_id and document_id not in document_ids:
                document_ids.append(document_id)
            if len(chunk_ids) >= max_chunks:
                break
        if len(chunk_ids) >= max_chunks:
            break

    chunks: list[DocumentChunk] = []
    if chunk_ids:
        chunk_map = {
            chunk.id: chunk
            for chunk in db.scalars(
                select(DocumentChunk).where(DocumentChunk.id.in_(chunk_ids))
            ).all()
        }
        chunks = [chunk_map[chunk_id] for chunk_id in chunk_ids if chunk_id in chunk_map]
        for chunk in chunks:
            if chunk.document_id not in document_ids:
                document_ids.append(chunk.document_id)

    documents: list[Document] = []
    if document_ids:
        document_map = {
            document.id: document
            for document in db.scalars(
                select(Document).where(Document.id.in_(document_ids))
            ).all()
        }
        documents = [document_map[document_id] for document_id in document_ids if document_id in document_map]

    topics = infer_session_topics(
        db=db,
        user_id=user.id,
        chat_session_id=chat_session_id,
        messages=messages,
        chunks=chunks,
        documents=documents,
    )

    return ChatSessionScope(
        session=session,
        messages=messages,
        chunks=chunks,
        documents=documents,
        document_ids=document_ids,
        topics=topics,
    )


def list_chat_session_summaries(*, db: Session, user: User) -> list[dict]:
    sessions = db.scalars(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
    ).all()

    summaries: list[dict] = []
    for session in sessions:
        scope = build_chat_session_scope(
            db=db,
            user=user,
            chat_session_id=session.id,
            max_messages=4,
            max_chunks=4,
        )
        summaries.append(
            {
                "id": session.id,
                "title": session.title,
                "createdAt": _isoformat(session.created_at),
                "updatedAt": _isoformat(session.updated_at),
                "documentCount": len(scope.document_ids),
                "topicHints": scope.topics[:3],
            }
        )
    return summaries


def infer_session_topics(
    *,
    db: Session,
    user_id: str,
    chat_session_id: str,
    messages: list[ChatMessage],
    chunks: list[DocumentChunk],
    documents: list[Document],
) -> list[str]:
    scores: dict[str, int] = defaultdict(int)

    def scan(text: str) -> None:
        lower = (text or "").lower()
        for topic, keywords in TOPIC_KEYWORDS.items():
            scores[topic] += sum(1 for keyword in keywords if keyword in lower)

    for message in messages:
        scan(message.content)
    for chunk in chunks:
        scan(chunk.section_heading or "")
        scan(chunk.content)
    for document in documents:
        scan(document.title)
        scan(document.file_name)

    progress_rows = db.scalars(
        select(ChatTopicProgress)
        .where(
            ChatTopicProgress.user_id == user_id,
            ChatTopicProgress.chat_session_id == chat_session_id,
        )
        .order_by(
            ChatTopicProgress.failure_rate.desc(),
            ChatTopicProgress.weak_area_score.desc(),
            ChatTopicProgress.updated_at.desc(),
        )
    ).all()
    for row in progress_rows:
        if row.topic_slug:
            scores[row.topic_slug] += 4

    return [
        topic
        for topic, score in sorted(scores.items(), key=lambda item: (-item[1], item[0]))
        if score > 0
    ][:5]


def quiz_matches_scope(*, quiz: Quiz, scope: ChatSessionScope) -> bool:
    if quiz.chat_session_id:
        return quiz.chat_session_id == scope.session.id
    if quiz.document_id and quiz.document_id in scope.document_ids:
        return True
    return _topic_matches(scope.topics, quiz.topic)


def deck_matches_scope(*, deck: FlashcardDeck, scope: ChatSessionScope) -> bool:
    if deck.chat_session_id:
        return deck.chat_session_id == scope.session.id
    if deck.document_id and deck.document_id in scope.document_ids:
        return True
    return _topic_matches(scope.topics, deck.topic)


def get_ranked_weak_topics(*, db: Session, user_id: str, chat_session_id: str) -> list[ChatTopicProgress]:
    return db.scalars(
        select(ChatTopicProgress)
        .where(
            ChatTopicProgress.user_id == user_id,
            ChatTopicProgress.chat_session_id == chat_session_id,
        )
        .order_by(
            ChatTopicProgress.failure_rate.desc(),
            ChatTopicProgress.incorrect_count.desc(),
            ChatTopicProgress.updated_at.desc(),
        )
    ).all()


def build_chat_areas_to_review(*, db: Session, user_id: str) -> list[dict]:
    sessions = db.scalars(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
    ).all()

    results: list[dict] = []
    for session in sessions:
        rows = get_ranked_weak_topics(db=db, user_id=user_id, chat_session_id=session.id)
        weak_topics = [
            {
                "topic": row.topic_slug,
                "mastery": row.mastery_score,
                "weakAreaScore": row.weak_area_score or max(0, 100 - row.mastery_score),
            }
            for row in rows
            if row.incorrect_count > 0 or row.mastery_score < 70 or (row.weak_area_score or 0) >= 25
        ]
        if not weak_topics:
            continue

        updated_at = max((row.updated_at for row in rows if row.updated_at), default=session.updated_at)
        results.append(
            {
                "chatSessionId": session.id,
                "title": session.title,
                "updatedAt": _isoformat(updated_at),
                "weakTopics": weak_topics[:3],
            }
        )

    return results


def get_existing_question_history(*, db: Session, user_id: str, chat_session_id: str) -> tuple[list[str], list[str]]:
    shown_rows = db.scalars(
        select(ShownQuizQuestion).where(
            ShownQuizQuestion.user_id == user_id,
            ShownQuizQuestion.chat_session_id == chat_session_id,
        )
    ).all()
    shown_ids = [row.question_id for row in shown_rows]

    existing_questions = db.scalars(
        select(QuizQuestion)
        .join(Quiz, QuizQuestion.quiz_id == Quiz.id)
        .where(Quiz.chat_session_id == chat_session_id)
        .order_by(QuizQuestion.order_index.asc())
    ).all()
    existing_ids = list(dict.fromkeys(shown_ids + [question.id for question in existing_questions]))
    stems = [question.prompt for question in existing_questions if question.prompt]
    return existing_ids, stems


def get_existing_flashcard_history(*, db: Session, user_id: str, chat_session_id: str) -> tuple[list[str], list[str]]:
    shown_rows = db.scalars(
        select(ShownFlashcard).where(
            ShownFlashcard.user_id == user_id,
            ShownFlashcard.chat_session_id == chat_session_id,
        )
    ).all()
    shown_ids = [row.flashcard_id for row in shown_rows]

    existing_cards = db.scalars(
        select(Flashcard)
        .join(FlashcardDeck, Flashcard.deck_id == FlashcardDeck.id)
        .where(FlashcardDeck.chat_session_id == chat_session_id)
        .order_by(Flashcard.order_index.asc())
    ).all()
    existing_ids = list(dict.fromkeys(shown_ids + [card.id for card in existing_cards]))
    concepts = [card.front_text for card in existing_cards if card.front_text]
    return existing_ids, concepts


def mark_questions_shown(
    *,
    db: Session,
    user_id: str,
    chat_session_id: str,
    question_ids: list[str],
) -> None:
    if not question_ids:
        return

    existing = {
        row.question_id
        for row in db.scalars(
            select(ShownQuizQuestion).where(
                ShownQuizQuestion.user_id == user_id,
                ShownQuizQuestion.chat_session_id == chat_session_id,
                ShownQuizQuestion.question_id.in_(question_ids),
            )
        ).all()
    }
    for question_id in question_ids:
        if question_id in existing:
            continue
        db.add(
            ShownQuizQuestion(
                user_id=user_id,
                chat_session_id=chat_session_id,
                question_id=question_id,
            )
        )


def mark_flashcards_shown(
    *,
    db: Session,
    user_id: str,
    chat_session_id: str,
    flashcard_ids: list[str],
) -> None:
    if not flashcard_ids:
        return

    existing = {
        row.flashcard_id
        for row in db.scalars(
            select(ShownFlashcard).where(
                ShownFlashcard.user_id == user_id,
                ShownFlashcard.chat_session_id == chat_session_id,
                ShownFlashcard.flashcard_id.in_(flashcard_ids),
            )
        ).all()
    }
    for flashcard_id in flashcard_ids:
        if flashcard_id in existing:
            continue
        db.add(
            ShownFlashcard(
                user_id=user_id,
                chat_session_id=chat_session_id,
                flashcard_id=flashcard_id,
            )
        )


def get_shown_flashcard_ids(*, db: Session, user_id: str, chat_session_id: str) -> set[str]:
    return {
        row.flashcard_id
        for row in db.scalars(
            select(ShownFlashcard).where(
                ShownFlashcard.user_id == user_id,
                ShownFlashcard.chat_session_id == chat_session_id,
            )
        ).all()
    }


def update_progress_for_quiz_attempt(
    *,
    db: Session,
    user_id: str,
    chat_session_id: str,
    question_results: list[dict],
) -> list[str]:
    grouped: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0, "incorrect": 0})
    for result in question_results:
        topic = (result.get("topic") or "General").strip() or "General"
        grouped[topic]["total"] += 1
        if result.get("is_correct"):
            grouped[topic]["correct"] += 1
        else:
            grouped[topic]["incorrect"] += 1

    wrong_topics = [topic for topic, values in grouped.items() if values["incorrect"] > 0]

    for topic, values in grouped.items():
        _update_user_progress_row(
            db=db,
            user_id=user_id,
            topic=topic,
            correct_count=values["correct"],
            total_count=values["total"],
        )
        _update_chat_topic_progress_row(
            db=db,
            user_id=user_id,
            chat_session_id=chat_session_id,
            topic=topic,
            correct_count=values["correct"],
            total_count=values["total"],
        )

    return sorted(wrong_topics)


def _update_user_progress_row(
    *,
    db: Session,
    user_id: str,
    topic: str,
    correct_count: int,
    total_count: int,
) -> None:
    row = db.scalars(
        select(UserProgress).where(
            UserProgress.user_id == user_id,
            UserProgress.topic_slug == topic,
        )
    ).first()
    prior = (row.bkt_mastery_probability or 0) / 100.0 if row else 0.0
    new_mastery = batch_update_mastery(prior, correct_count, total_count)
    mastery_score = mastery_to_score(new_mastery)
    if row is None:
        db.add(
            UserProgress(
                user_id=user_id,
                topic_slug=topic,
                mastery_score=mastery_score,
                bkt_mastery_probability=mastery_score,
                weak_area_score=max(0, 100 - mastery_score),
            )
        )
        return

    row.mastery_score = mastery_score
    row.bkt_mastery_probability = mastery_score
    row.weak_area_score = max(0, 100 - mastery_score)


def _update_chat_topic_progress_row(
    *,
    db: Session,
    user_id: str,
    chat_session_id: str,
    topic: str,
    correct_count: int,
    total_count: int,
) -> None:
    row = db.scalars(
        select(ChatTopicProgress).where(
            ChatTopicProgress.user_id == user_id,
            ChatTopicProgress.chat_session_id == chat_session_id,
            ChatTopicProgress.topic_slug == topic,
        )
    ).first()
    prior = (row.bkt_mastery_probability or 0) / 100.0 if row else 0.0
    new_mastery = batch_update_mastery(prior, correct_count, total_count)
    mastery_score = mastery_to_score(new_mastery)
    incorrect_count = max(0, total_count - correct_count)

    if row is None:
        db.add(
            ChatTopicProgress(
                user_id=user_id,
                chat_session_id=chat_session_id,
                topic_slug=topic,
                attempt_count=total_count,
                correct_count=correct_count,
                incorrect_count=incorrect_count,
                failure_rate=(incorrect_count / total_count) if total_count else 0.0,
                mastery_score=mastery_score,
                bkt_mastery_probability=mastery_score,
                weak_area_score=max(
                    round((incorrect_count / total_count) * 100) if total_count else 0,
                    100 - mastery_score,
                ),
            )
        )
        return

    row.attempt_count += total_count
    row.correct_count += correct_count
    row.incorrect_count += incorrect_count
    row.failure_rate = (row.incorrect_count / row.attempt_count) if row.attempt_count else 0.0
    row.mastery_score = mastery_score
    row.bkt_mastery_probability = mastery_score
    row.weak_area_score = max(round(row.failure_rate * 100), 100 - mastery_score)


def generate_quiz_for_chat(
    *,
    db: Session,
    user: User,
    chat_session_id: str,
    count: int,
    topic: str | None = None,
) -> Quiz:
    target_count = max(1, min(count, MAX_QUIZ_GENERATION_COUNT))
    scope = build_chat_session_scope(db=db, user=user, chat_session_id=chat_session_id)
    scope = _augment_scope_with_indexed_embeddings(
        db=db,
        user=user,
        scope=scope,
        max_chunks=12,
    )
    if not scope.messages and not scope.chunks:
        raise ValueError("This chat does not have enough context yet. Ask a few grounded questions first.")

    existing_ids, prior_stems = get_existing_question_history(
        db=db,
        user_id=user.id,
        chat_session_id=chat_session_id,
    )
    weak_rows = get_ranked_weak_topics(db=db, user_id=user.id, chat_session_id=chat_session_id)
    weak_topics = [row.topic_slug for row in weak_rows if row.incorrect_count > 0][:5]
    other_topics = [topic for topic in scope.topics if topic not in weak_topics]

    generated_questions: list[dict] = []
    known_stems = list(prior_stems)
    for _ in range(2):
        needed = target_count - len(generated_questions)
        if needed <= 0:
            break
        try:
            parsed = _generate_with_llm(
                kind="quiz",
                scope=scope,
                count=needed,
                weak_topics=weak_topics,
                other_topics=other_topics,
                existing_ids=existing_ids,
                prior_texts=known_stems,
                topic_hint=topic,
            )
        except ValueError as exc:
            logger.warning("Quiz LLM generation failed; switching to local fallback: %s", exc)
            break
        candidates = parsed.get("questions") if isinstance(parsed, dict) else parsed
        for question in _normalize_quiz_questions(candidates or []):
            if _is_duplicate_text(question["stem"], known_stems):
                continue
            generated_questions.append(question)
            known_stems.append(question["stem"])
            if len(generated_questions) >= target_count:
                break

    if len(generated_questions) < target_count:
        for question in _build_fallback_quiz_questions(
            scope=scope,
            count=target_count - len(generated_questions),
            existing_texts=known_stems,
            weak_topics=weak_topics,
        ):
            if _is_duplicate_text(question["stem"], known_stems):
                continue
            generated_questions.append(question)
            known_stems.append(question["stem"])
            if len(generated_questions) >= target_count:
                break

    if len(generated_questions) < target_count:
        for question in _build_emergency_quiz_questions(
            scope=scope,
            count=target_count - len(generated_questions),
            existing_texts=known_stems,
        ):
            if _is_duplicate_text(question["stem"], known_stems):
                continue
            generated_questions.append(question)
            known_stems.append(question["stem"])
            if len(generated_questions) >= target_count:
                break

    if len(generated_questions) < target_count:
        raise ValueError("Could not generate enough distinct quiz questions for this chat yet.")

    quiz = Quiz(
        title=_build_generated_title(
            scope.session.title,
            suffix="Adaptive Quiz",
            documents=scope.documents,
            topic=topic,
        ),
        description=f"Adaptive quiz generated from chat session {scope.session.title}.",
        topic=_dominant_topic([question["topic"] for question in generated_questions], fallback=scope.topics[:1]),
        difficulty=_difficulty_to_enum([question["difficulty"] for question in generated_questions]),
        estimated_minutes=max(3, target_count * 2),
        status=ContentStatus.PUBLISHED,
        created_by_user_id=user.id,
        chat_session_id=chat_session_id,
        document_id=scope.document_ids[0] if scope.document_ids else None,
    )
    db.add(quiz)
    db.flush()

    created_questions: list[QuizQuestion] = []
    for index, question in enumerate(generated_questions[:target_count]):
        created = QuizQuestion(
            quiz_id=quiz.id,
            chat_session_id=chat_session_id,
            prompt=question["stem"],
            topic=question["topic"],
            difficulty=question["difficulty"],
            options_json=question["options_json"],
            correct_answer=question["correct"],
            explanation=question["explanation"],
            irt_difficulty=question["difficulty"],
            order_index=index,
        )
        db.add(created)
        created_questions.append(created)

    db.flush()
    mark_questions_shown(
        db=db,
        user_id=user.id,
        chat_session_id=chat_session_id,
        question_ids=[question.id for question in created_questions],
    )
    db.flush()
    return quiz


def generate_flashcards_for_chat(
    *,
    db: Session,
    user: User,
    chat_session_id: str,
    count: int,
    topic: str | None = None,
) -> FlashcardDeck:
    target_count = max(1, min(count, MAX_FLASHCARD_GENERATION_COUNT))
    scope = build_chat_session_scope(db=db, user=user, chat_session_id=chat_session_id)
    if not scope.messages and not scope.chunks:
        raise ValueError("This chat does not have enough context yet. Ask a few grounded questions first.")

    existing_ids, prior_fronts = get_existing_flashcard_history(
        db=db,
        user_id=user.id,
        chat_session_id=chat_session_id,
    )

    generated_cards: list[dict] = []
    known_fronts = list(prior_fronts)
    for _ in range(2):
        needed = target_count - len(generated_cards)
        if needed <= 0:
            break
        try:
            parsed = _generate_with_llm(
                kind="flashcards",
                scope=scope,
                count=needed,
                weak_topics=None,
                other_topics=scope.topics,
                existing_ids=existing_ids,
                prior_texts=known_fronts,
                topic_hint=topic,
            )
        except ValueError as exc:
            logger.warning("Flashcard LLM generation failed; switching to local fallback: %s", exc)
            break
        candidates = parsed.get("flashcards") if isinstance(parsed, dict) else parsed
        for card in _normalize_flashcards(candidates or []):
            if _is_duplicate_text(card["front"], known_fronts):
                continue
            generated_cards.append(card)
            known_fronts.append(card["front"])
            if len(generated_cards) >= target_count:
                break

    if len(generated_cards) < target_count:
        for card in _build_fallback_flashcards(
            scope=scope,
            count=target_count - len(generated_cards),
            existing_texts=known_fronts,
        ):
            if _is_duplicate_text(card["front"], known_fronts):
                continue
            generated_cards.append(card)
            known_fronts.append(card["front"])
            if len(generated_cards) >= target_count:
                break

    if len(generated_cards) < target_count:
        raise ValueError("Could not generate enough distinct flashcards for this chat yet.")

    deck = FlashcardDeck(
        title=_build_generated_title(
            scope.session.title,
            suffix="Flashcards",
            documents=scope.documents,
            topic=topic,
        ),
        description=f"Flashcards generated from chat session {scope.session.title}.",
        topic=_dominant_topic([card["topic"] for card in generated_cards], fallback=scope.topics[:1]),
        status=ContentStatus.PUBLISHED,
        created_by_user_id=user.id,
        chat_session_id=chat_session_id,
        document_id=scope.document_ids[0] if scope.document_ids else None,
    )
    db.add(deck)
    db.flush()

    for index, card in enumerate(generated_cards[:target_count]):
        db.add(
            Flashcard(
                deck_id=deck.id,
                chat_session_id=chat_session_id,
                front_text=card["front"],
                back_text=card["back"],
                topic=card["topic"],
                difficulty=card["difficulty"],
                tag_list=[card["topic"]] if card["topic"] else None,
                order_index=index,
            )
        )

    db.flush()
    return deck


def _generate_with_llm(
    *,
    kind: str,
    scope: ChatSessionScope,
    count: int,
    weak_topics: list[str] | None,
    other_topics: list[str] | None,
    existing_ids: list[str],
    prior_texts: list[str],
    topic_hint: str | None = None,
) -> dict | list:
    settings = get_settings()

    # Trim context to cut token usage; Ollama context windows are also bounded.
    context = _build_generation_context(scope=scope, max_chars=GENERATION_CONTEXT_MAX_CHARS)
    prior_sample = prior_texts[-6:]
    excluded_count = len(existing_ids)  # send count only, not full UUID list

    topic_clause = f' Focus specifically on the topic: "{topic_hint}".' if topic_hint else ""

    if kind == "flashcards":
        system_prompt = (
            "You are a medical education expert. "
            f"Generate exactly {count} flashcards from the context below.{topic_clause} "
            "Each must cover a distinct concept not previously generated. "
            'Return ONLY valid JSON: {"flashcards": [{"front": "Q", "back": "A", "topic": "T", "difficulty": 2}]}'
        )
        user_prompt = (
            f"Context:\n{context}\n\n"
            f"Already generated: {excluded_count} flashcards. "
            f"Avoid repeating these recent concepts: {json.dumps(prior_sample)}\n"
            f'Return JSON with key "flashcards" containing {count} new cards.'
        )
    else:
        weak_topics = weak_topics or []
        other_topics = other_topics or []
        system_prompt = (
            "You are a medical education expert. "
            f"Generate exactly {count} MCQ questions from the context below.{topic_clause} "
            "Prioritise weak topics if provided. "
            'Return ONLY valid JSON: {"questions": [{"stem": "Q", "options": ["A. x", "B. y", "C. z", "D. w"], "correct": "A", "explanation": "E", "topic": "T", "difficulty": 2}]}'
        )
        user_prompt = (
            f"Context:\n{context}\n\n"
            f"Weak topics (prioritise): {json.dumps(weak_topics[:5])}\n"
            f"Other topics: {json.dumps(other_topics[:5])}\n"
            f"Already generated: {excluded_count} questions. "
            f"Avoid repeating these recent stems: {json.dumps(prior_sample)}\n"
            f'Return JSON with key "questions" containing {count} new questions.'
        )

    provider = (settings.assistant_llm_provider or "ollama").lower()
    model_label = (
        settings.assistant_openai_model if provider == "openai"
        else settings.ollama_chat_model
    )
    logger.info(
        "Adaptive generation via %s: kind=%s count=%d model=%s",
        provider, kind, count, model_label,
    )
    try:
        return local_llm.chat_json(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=(
                settings.assistant_openai_max_tokens if provider == "openai"
                else settings.ollama_chat_max_tokens
            ),
        )
    except local_llm.LocalLLMUnavailable as exc:
        raise ValueError(
            f"LLM ({provider}) is unavailable. Check your API key or "
            "start `ollama serve` before generating quizzes / flashcards."
        ) from exc
    except local_llm.LocalLLMError as exc:
        raise ValueError(f"LLM error during adaptive generation: {exc}") from exc


# ──────────────────────────────────────────────────────────────────────────────
# region disabled-cloud-providers — legacy OpenAI / Gemini JSON callers.
# These functions are no longer invoked; left in place (still callable but
# unreferenced) so re-enabling cloud providers requires only restoring the
# branch in `_generate_questions_via_llm`. They are NOT removed because doing
# so would also force changes to the (currently unused) retry contract.
# ──────────────────────────────────────────────────────────────────────────────

def _call_openai_json(
    *,
    api_key: str,
    base_url: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int,
    attempt: int = 1,
) -> dict | list:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": max(64, int(max_tokens)),
    }

    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url=f"{base_url.rstrip('/')}/chat/completions",
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        detail_lower = detail.lower()

        if exc.code in (429, 503) and attempt < 3:
            delay = min(8.0, (2 ** attempt) + random.uniform(0.1, 0.8))
            logger.warning(
                "OpenAI-compatible generation throttled (HTTP %s); retrying in %.1fs (attempt %s)",
                exc.code,
                delay,
                attempt,
            )
            time.sleep(delay)
            return _call_openai_json(
                api_key=api_key,
                base_url=base_url,
                model=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=max_tokens,
                attempt=attempt + 1,
            )

        if exc.code == 402 and "fewer max_tokens" in detail_lower and max_tokens > 128:
            reduced = max(128, max_tokens // 2)
            logger.warning("OpenAI-compatible generation hit credit/token cap; retrying with max_tokens=%s", reduced)
            return _call_openai_json(
                api_key=api_key,
                base_url=base_url,
                model=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=reduced,
                attempt=attempt + 1,
            )

        raise ValueError(f"OpenAI-compatible HTTP {exc.code}: {detail[:300] or 'request failed'}") from exc
    except Exception as exc:
        raise ValueError(f"OpenAI-compatible network error: {exc}") from exc

    choices = raw.get("choices") or []
    message = (choices[0].get("message") if choices else None) or {}
    text = message.get("content") or "{}"
    return _extract_json(text)


def _call_gemini_json(
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
) -> dict | list:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {"role": "system", "parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {"temperature": 0.4, "responseMimeType": "application/json"},
    }

    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url=url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        if exc.code == 429:
            if getattr(_call_gemini_json, '_retrying', False):
                raise ValueError(
                    "Gemini quota exceeded (HTTP 429). "
                    "Wait ~1 min and retry, or add a Groq fallback: set "
                    "ASSISTANT_LLM_PROVIDER=openai and ASSISTANT_OPENAI_API_KEY in backend/.env. "
                    f"Detail: {detail[:300]}"
                ) from exc
            logger.warning("Gemini 429 rate-limit; waiting 5 s then retrying once.")
            import time as _time; _time.sleep(5)
            _call_gemini_json._retrying = True
            try:
                return _call_gemini_json(
                    api_key=api_key, model=model,
                    system_prompt=system_prompt, user_prompt=user_prompt,
                )
            finally:
                _call_gemini_json._retrying = False
        if exc.code in (400, 403):
            raise ValueError(
                f"Gemini rejected request (HTTP {exc.code}). "
                "Verify ASSISTANT_GEMINI_API_KEY is valid and Generative Language API is enabled. "
                f"Detail: {detail[:300]}"
            ) from exc
        raise ValueError(f"Gemini HTTP {exc.code}: {detail[:300] or 'request failed'}") from exc
    except Exception as exc:
        raise ValueError(f"Gemini network error: {exc}") from exc

    candidates = raw.get("candidates") or []
    content = (candidates[0].get("content") if candidates else None) or {}
    parts = content.get("parts") or []
    text = (parts[0].get("text") if parts else None) or "{}"
    return _extract_json(text)

# endregion disabled-cloud-providers


def _extract_json(text: str) -> dict | list:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    # Some providers return JSON wrapped in prose; try extracting the first JSON block.
    def _attempt_parse(value: str) -> dict | list | None:
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (dict, list)):
                return parsed
        except json.JSONDecodeError:
            return None
        return None

    parsed = _attempt_parse(cleaned)
    if parsed is not None:
        return parsed

    obj_start = cleaned.find("{")
    obj_end = cleaned.rfind("}")
    if obj_start != -1 and obj_end > obj_start:
        parsed = _attempt_parse(cleaned[obj_start:obj_end + 1])
        if parsed is not None:
            return parsed

    arr_start = cleaned.find("[")
    arr_end = cleaned.rfind("]")
    if arr_start != -1 and arr_end > arr_start:
        parsed = _attempt_parse(cleaned[arr_start:arr_end + 1])
        if parsed is not None:
            return parsed

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError("LLM returned invalid JSON for adaptive learning generation.") from exc


def _normalize_quiz_questions(items: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        options = item.get("options") or []
        if not isinstance(options, list) or len(options) < 4:
            continue
        option_texts = [str(option).strip() for option in options[:4]]
        if any(not text for text in option_texts):
            continue
        labels = ["A", "B", "C", "D"]
        correct = str(item.get("correct") or "").strip().upper()
        if correct not in labels:
            for label, option_text in zip(labels, option_texts, strict=False):
                if correct.lower() == option_text.lower():
                    correct = label
                    break
        if correct not in labels:
            continue
        topic = str(item.get("topic") or "General").strip() or "General"
        difficulty = _clamp_difficulty(item.get("difficulty"))
        stem = str(item.get("stem") or "").strip()
        if not stem:
            continue
        normalized.append(
            {
                "stem": stem,
                "options_json": [
                    {"label": label, "text": option_text}
                    for label, option_text in zip(labels, option_texts, strict=False)
                ],
                "correct": correct,
                "explanation": str(item.get("explanation") or "").strip() or None,
                "topic": topic,
                "difficulty": difficulty,
            }
        )
    return normalized


def _normalize_flashcards(items: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        front = str(item.get("front") or "").strip()
        back = str(item.get("back") or "").strip()
        if not front or not back:
            continue
        normalized.append(
            {
                "front": front,
                "back": back,
                "topic": str(item.get("topic") or "General").strip() or "General",
                "difficulty": _clamp_difficulty(item.get("difficulty")),
            }
        )
    return normalized


def _build_fallback_quiz_questions(
    *,
    scope: ChatSessionScope,
    count: int,
    existing_texts: list[str],
    weak_topics: list[str],
) -> list[dict]:
    sentences = _extract_scope_sentences(scope)
    if not sentences:
        sentences = _extract_scope_sentences(scope, min_len=18, limit=36)
    prioritized_topics = weak_topics + [topic for topic in scope.topics if topic not in weak_topics]
    normalized_existing = existing_texts[:]
    results: list[dict] = []

    for index, sentence in enumerate(sentences):
        topic = _pick_topic_for_text(sentence, prioritized_topics or scope.topics)
        stem = f"Which statement is best supported by the indexed material about {topic.lower()}?"
        if _is_duplicate_text(stem, normalized_existing):
            continue

        distractors = _build_distractor_sentences(sentences, sentence)
        if len(distractors) < 3:
            distractors.extend(_build_topic_distractors(topic=topic, correct=sentence))

        # Keep unique, non-empty distractors distinct from correct sentence.
        normalized_correct = _normalize_text(sentence)
        uniq: list[str] = []
        seen_local: set[str] = set()
        for item in distractors:
            key = _normalize_text(item)
            if not key or key == normalized_correct or key in seen_local:
                continue
            seen_local.add(key)
            uniq.append(item)
            if len(uniq) >= 3:
                break

        if len(uniq) < 3:
            continue

        options = [sentence, *uniq[:3]]
        labeled = [
            {"label": label, "text": text}
            for label, text in zip(["A", "B", "C", "D"], options, strict=False)
        ]
        results.append(
            {
                "stem": stem,
                "options_json": labeled,
                "correct": "A",
                "explanation": sentence,
                "topic": topic,
                "difficulty": 2 + (index % 3),
            }
        )
        normalized_existing.append(stem)
        if len(results) >= count:
            break

    return results


def _build_fallback_flashcards(
    *,
    scope: ChatSessionScope,
    count: int,
    existing_texts: list[str],
) -> list[dict]:
    sentences = _extract_scope_sentences(scope)
    normalized_existing = existing_texts[:]
    results: list[dict] = []

    for sentence in sentences:
        topic = _pick_topic_for_text(sentence, scope.topics)
        front = _build_flashcard_prompt(sentence, topic)
        if _is_duplicate_text(front, normalized_existing):
            continue

        results.append(
            {
                "front": front,
                "back": sentence,
                "topic": topic,
                "difficulty": 2,
            }
        )
        normalized_existing.append(front)
        if len(results) >= count:
            break

    return results


def _extract_scope_sentences_with_bounds(
    *,
    scope: ChatSessionScope,
    min_len: int,
    max_len: int,
    limit: int,
) -> list[str]:
    seen: list[str] = []
    for chunk in scope.chunks:
        raw_parts = re.split(r"(?<=[.!?])\s+", chunk.content or "")
        for part in raw_parts:
            sentence = part.strip()
            if len(sentence) < min_len or len(sentence) > max_len:
                continue
            if _is_duplicate_text(sentence, seen, threshold=0.92):
                continue
            seen.append(sentence)
            if len(seen) >= limit:
                return seen

    for message in scope.messages:
        sentence = (message.content or "").strip()
        if len(sentence) < min_len or len(sentence) > max(220, max_len):
            continue
        if _is_duplicate_text(sentence, seen, threshold=0.92):
            continue
        seen.append(sentence)
        if len(seen) >= limit:
            break

    return seen


def _extract_scope_sentences(scope: ChatSessionScope, min_len: int = 45, limit: int = 24) -> list[str]:
    return _extract_scope_sentences_with_bounds(
        scope=scope,
        min_len=min_len,
        max_len=260,
        limit=limit,
    )


def _build_distractor_sentences(sentences: list[str], correct: str) -> list[str]:
    distractors: list[str] = []
    for sentence in sentences:
        if sentence == correct:
            continue
        if _is_duplicate_text(sentence, [correct], threshold=0.75):
            continue
        distractors.append(sentence)
    return distractors


def _build_topic_distractors(*, topic: str, correct: str) -> list[str]:
    base = topic.lower() if topic else "radiology"
    return [
        f"A finding unrelated to {base} is explicitly emphasized in the indexed material.",
        f"The indexed material states there is no relevant {base} evidence in this context.",
        f"The indexed material prioritizes administrative workflow over {base} interpretation.",
        f"The indexed material suggests broad differential possibilities without a specific {base} teaching point.",
    ]


def _build_emergency_quiz_questions(
    *,
    scope: ChatSessionScope,
    count: int,
    existing_texts: list[str],
) -> list[dict]:
    topics = scope.topics or ["General"]
    document_names = [doc.file_name for doc in scope.documents if doc.file_name]
    source_label = document_names[0] if document_names else (scope.session.title or "the indexed material")
    normalized_existing = existing_texts[:]
    results: list[dict] = []

    for idx in range(max(count * 2, 6)):
        topic = topics[idx % len(topics)]
        stem = f"Based on {source_label}, which option best reflects the indexed teaching point for {topic.lower()}? (set {idx + 1})"
        if _is_duplicate_text(stem, normalized_existing):
            continue

        correct_text = f"It prioritizes evidence-grounded interpretation patterns for {topic.lower()}."
        options = [
            {"label": "A", "text": correct_text},
            {"label": "B", "text": f"It excludes all {topic.lower()} findings from discussion."},
            {"label": "C", "text": f"It focuses only on administrative workflow rather than {topic.lower()} clues."},
            {"label": "D", "text": f"It states no useful information can be derived about {topic.lower()}."},
        ]
        results.append(
            {
                "stem": stem,
                "options_json": options,
                "correct": "A",
                "explanation": correct_text,
                "topic": topic,
                "difficulty": 2,
            }
        )
        normalized_existing.append(stem)
        if len(results) >= count:
            break

    return results


def _pick_topic_for_text(text: str, topics: list[str]) -> str:
    normalized_text = _normalize_text(text)
    for topic in topics:
        if _normalize_text(topic) in normalized_text:
            return topic
    for topic, keywords in TOPIC_KEYWORDS.items():
        if any(keyword in normalized_text for keyword in keywords):
            return topic
    return topics[0] if topics else "General"


def _build_flashcard_prompt(sentence: str, topic: str) -> str:
    short = sentence.split(".")[0].strip()
    if len(short) > 90:
        short = short[:87].rstrip() + "..."
    return f"What key point from the indexed {topic.lower()} material matches this clue: {short}?"


def _build_generation_context(*, scope: ChatSessionScope, max_chars: int = 16000) -> str:
    lines: list[str] = [f"Chat session title: {scope.session.title}", "", "Last 10 chat messages:"]
    for message in scope.messages:
        lines.append(f"- {message.role}: {message.content}")

    if scope.chunks:
        lines.extend(["", "Document chunks:"])
        for index, chunk in enumerate(scope.chunks, start=1):
            lines.append(
                f"[{index}] document_id={chunk.document_id} page {chunk.page_start}-{chunk.page_end}"
                f"{f' | {chunk.section_heading}' if chunk.section_heading else ''}"
            )
            lines.append(chunk.content)

    return "\n".join(lines)[:max_chars]


def _augment_scope_with_indexed_embeddings(
    *,
    db: Session,
    user: User,
    scope: ChatSessionScope,
    max_chunks: int,
) -> ChatSessionScope:
    query = _build_embedding_query(scope)
    if not query:
        return scope

    try:
        hits = search_document_chunks(
            db=db,
            user=user,
            query=query,
            top_k=max_chunks,
            document_ids=scope.document_ids or None,
        )
    except Exception as exc:
        logger.warning("Embedding retrieval enrichment failed: %s", exc)
        return scope

    if not hits:
        return scope

    hit_ids: list[str] = []
    for hit in hits:
        if hit.chunk_id not in hit_ids:
            hit_ids.append(hit.chunk_id)
        if len(hit_ids) >= max_chunks:
            break

    chunk_map = {
        chunk.id: chunk
        for chunk in db.scalars(
            select(DocumentChunk).where(DocumentChunk.id.in_(hit_ids))
        ).all()
    }
    retrieved_chunks = [chunk_map[chunk_id] for chunk_id in hit_ids if chunk_id in chunk_map]
    if not retrieved_chunks:
        return scope

    merged_chunks = list(scope.chunks)
    seen_chunk_ids = {chunk.id for chunk in merged_chunks}
    for chunk in retrieved_chunks:
        if chunk.id in seen_chunk_ids:
            continue
        merged_chunks.append(chunk)
        seen_chunk_ids.add(chunk.id)
        if len(merged_chunks) >= max_chunks:
            break

    merged_doc_ids = list(scope.document_ids)
    for chunk in merged_chunks:
        if chunk.document_id not in merged_doc_ids:
            merged_doc_ids.append(chunk.document_id)

    documents: list[Document] = []
    if merged_doc_ids:
        document_map = {
            document.id: document
            for document in db.scalars(
                select(Document).where(Document.id.in_(merged_doc_ids))
            ).all()
        }
        documents = [document_map[document_id] for document_id in merged_doc_ids if document_id in document_map]

    topics = infer_session_topics(
        db=db,
        user_id=user.id,
        chat_session_id=scope.session.id,
        messages=scope.messages,
        chunks=merged_chunks,
        documents=documents,
    )

    return ChatSessionScope(
        session=scope.session,
        messages=scope.messages,
        chunks=merged_chunks,
        documents=documents,
        document_ids=merged_doc_ids,
        topics=topics,
    )


def _build_embedding_query(scope: ChatSessionScope) -> str:
    parts: list[str] = []
    user_messages = [msg.content for msg in scope.messages if msg.role == "user" and msg.content]
    if user_messages:
        parts.extend(user_messages[-3:])
    if scope.topics:
        parts.append(" ".join(scope.topics))
    query = " ".join(part.strip() for part in parts if part and part.strip()).strip()
    return query[:400]


def _is_duplicate_text(candidate: str, existing_texts: list[str], threshold: float = 0.88) -> bool:
    normalized_candidate = _normalize_text(candidate)
    for existing in existing_texts:
        normalized_existing = _normalize_text(existing)
        if normalized_candidate == normalized_existing:
            return True
        if difflib.SequenceMatcher(None, normalized_candidate, normalized_existing).ratio() >= threshold:
            return True
    return False


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", (value or "").lower())).strip()


def _build_generated_title(
    base: str,
    *,
    suffix: str,
    documents: list | None = None,
    topic: str | None = None,
) -> str:
    # Prefer: explicit topic > first document name > session title
    label = None
    if topic and topic.strip():
        label = topic.strip()[:60]
    elif documents:
        first_name = getattr(documents[0], "original_filename", None) or getattr(documents[0], "title", None)
        if first_name:
            # Strip extension for cleaner title
            label = re.sub(r"\.[a-zA-Z0-9]{2,5}$", "", first_name).strip()[:60]
    if not label:
        label = (base or "Study Session").strip()[:60].rstrip()
    timestamp = datetime.now(timezone.utc).strftime("%H%M")
    return f"{label} {suffix} {timestamp}".strip()


def _difficulty_to_enum(values: list[int]) -> DifficultyLevel:
    avg = sum(values) / max(len(values), 1)
    if avg <= 2:
        return DifficultyLevel.BEGINNER
    if avg >= 4:
        return DifficultyLevel.ADVANCED
    return DifficultyLevel.INTERMEDIATE


def _clamp_difficulty(value: object) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return 3
    return max(1, min(5, parsed))


def _dominant_topic(topics: list[str], fallback: list[str] | None = None) -> str | None:
    counts: dict[str, int] = defaultdict(int)
    for topic in topics:
        if topic:
            counts[topic] += 1
    if counts:
        return max(counts.items(), key=lambda item: (item[1], item[0]))[0]
    return fallback[0] if fallback else None


def _topic_matches(topics: list[str], candidate: str | None) -> bool:
    if not candidate:
        return False
    normalized = _normalize_text(candidate)
    return any(_normalize_text(topic) == normalized for topic in topics)


def _isoformat(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()
