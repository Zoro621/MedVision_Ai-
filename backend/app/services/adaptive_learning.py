import difflib
import json
import re
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
from app.services.bkt import batch_update_mastery, mastery_to_score

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
) -> Quiz:
    scope = build_chat_session_scope(db=db, user=user, chat_session_id=chat_session_id)
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
        needed = count - len(generated_questions)
        if needed <= 0:
            break
        parsed = _generate_with_gemini(
            kind="quiz",
            scope=scope,
            count=needed + 2,
            weak_topics=weak_topics,
            other_topics=other_topics,
            existing_ids=existing_ids,
            prior_texts=known_stems,
        )
        candidates = parsed.get("questions") if isinstance(parsed, dict) else parsed
        for question in _normalize_quiz_questions(candidates or []):
            if _is_duplicate_text(question["stem"], known_stems):
                continue
            generated_questions.append(question)
            known_stems.append(question["stem"])
            if len(generated_questions) >= count:
                break

    if len(generated_questions) < count:
        raise ValueError("Gemini could not generate enough distinct quiz questions for this chat yet.")

    quiz = Quiz(
        title=_build_generated_title(scope.session.title, suffix="Adaptive Quiz"),
        description=f"Adaptive quiz generated from chat session {scope.session.title}.",
        topic=_dominant_topic([question["topic"] for question in generated_questions], fallback=scope.topics[:1]),
        difficulty=_difficulty_to_enum([question["difficulty"] for question in generated_questions]),
        estimated_minutes=max(5, count * 2),
        status=ContentStatus.PUBLISHED,
        created_by_user_id=user.id,
        chat_session_id=chat_session_id,
        document_id=scope.document_ids[0] if scope.document_ids else None,
    )
    db.add(quiz)
    db.flush()

    created_questions: list[QuizQuestion] = []
    for index, question in enumerate(generated_questions[:count]):
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
) -> FlashcardDeck:
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
        needed = count - len(generated_cards)
        if needed <= 0:
            break
        parsed = _generate_with_gemini(
            kind="flashcards",
            scope=scope,
            count=needed + 2,
            weak_topics=None,
            other_topics=scope.topics,
            existing_ids=existing_ids,
            prior_texts=known_fronts,
        )
        candidates = parsed.get("flashcards") if isinstance(parsed, dict) else parsed
        for card in _normalize_flashcards(candidates or []):
            if _is_duplicate_text(card["front"], known_fronts):
                continue
            generated_cards.append(card)
            known_fronts.append(card["front"])
            if len(generated_cards) >= count:
                break

    if len(generated_cards) < count:
        raise ValueError("Gemini could not generate enough distinct flashcards for this chat yet.")

    deck = FlashcardDeck(
        title=_build_generated_title(scope.session.title, suffix="Flashcards"),
        description=f"Flashcards generated from chat session {scope.session.title}.",
        topic=_dominant_topic([card["topic"] for card in generated_cards], fallback=scope.topics[:1]),
        status=ContentStatus.PUBLISHED,
        created_by_user_id=user.id,
        chat_session_id=chat_session_id,
        document_id=scope.document_ids[0] if scope.document_ids else None,
    )
    db.add(deck)
    db.flush()

    for index, card in enumerate(generated_cards[:count]):
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


def _generate_with_gemini(
    *,
    kind: str,
    scope: ChatSessionScope,
    count: int,
    weak_topics: list[str] | None,
    other_topics: list[str] | None,
    existing_ids: list[str],
    prior_texts: list[str],
) -> dict | list:
    settings = get_settings()
    api_key = getattr(settings, "assistant_gemini_api_key", None)
    model = getattr(settings, "assistant_gemini_model", None) or "gemini-2.5-flash-lite"
    if not api_key:
        raise ValueError("Gemini is not configured on the backend.")

    context = _build_generation_context(scope=scope)
    if kind == "flashcards":
        system_prompt = (
            "You are a radiology education expert.\n"
            f"Given the following chat/document context, generate {count} flashcards.\n"
            "Each flashcard must:\n"
            f"- Test a distinct concept not already covered by existing flashcard IDs: {existing_ids}\n"
            '- Be in JSON format: { "front": "...", "back": "...", "topic": "...", "difficulty": 1-5 }\n'
            "- Never duplicate a concept already in the provided existing_ids list"
        )
        user_prompt = (
            f"Recent chat and document context:\n{context}\n\n"
            f"Existing flashcard IDs to exclude: {json.dumps(existing_ids)}\n"
            f"Existing flashcard fronts/concepts to avoid repeating: {json.dumps(prior_texts[-30:])}\n\n"
            'Return a JSON object with one key: "flashcards".'
        )
    else:
        weak_topics = weak_topics or []
        other_topics = other_topics or []
        weak_quota = round(count * 0.7) if weak_topics else 0
        other_quota = max(0, count - weak_quota)
        system_prompt = (
            "You are a radiology education expert.\n"
            f"Given the following chat context and the student's weak topics: {weak_topics},\n"
            f"generate {count} MCQ questions.\n"
            "Each question must:\n"
            "- Target one of the weak topics\n"
            f"- Not be identical to any question in existing_ids: {existing_ids}\n"
            "- Vary wording, options, and scenario from previous questions on the same concept\n"
            '- Be in JSON format: { "stem": "...", "options": ["A","B","C","D"], "correct": "A", "explanation": "...", "topic": "...", "difficulty": 1-5 }'
        )
        user_prompt = (
            f"Recent chat and document context:\n{context}\n\n"
            f"Weak topics ranked by failure rate: {json.dumps(weak_topics)}\n"
            f"Other topics available in this chat: {json.dumps(other_topics)}\n"
            f"Target split: {weak_quota} questions from weak topics and {other_quota} from other chat topics when possible.\n"
            f"Existing question IDs to exclude: {json.dumps(existing_ids)}\n"
            f"Prior question stems to avoid semantic repetition: {json.dumps(prior_texts[-40:])}\n\n"
            'Return a JSON object with one key: "questions".'
        )

    return _call_gemini_json(
        api_key=api_key,
        model=model,
        system_prompt=system_prompt,
        user_prompt=user_prompt,
    )


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
    with urllib.request.urlopen(request, timeout=90) as response:
        raw = json.loads(response.read().decode("utf-8"))

    candidates = raw.get("candidates") or []
    content = (candidates[0].get("content") if candidates else None) or {}
    parts = content.get("parts") or []
    text = (parts[0].get("text") if parts else None) or "{}"
    return _extract_json(text)


def _extract_json(text: str) -> dict | list:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError("Gemini returned invalid JSON for adaptive learning generation.") from exc


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


def _build_generated_title(base: str, *, suffix: str) -> str:
    short = (base or "Study Session").strip()[:60].rstrip()
    timestamp = datetime.now(timezone.utc).strftime("%H%M")
    return f"{short} {suffix} {timestamp}".strip()


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
