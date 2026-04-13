from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_role
from app.core.database import get_db
from app.models import (
    ContentStatus,
    DifficultyLevel,
    Document,
    Flashcard,
    FlashcardDeck,
    FlashcardReview,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
    UserRole,
)
from app.schemas.admin_content import (
    AdminFlashcardDeckDetail,
    AdminFlashcardDeckPayload,
    AdminFlashcardDeckSummary,
    AdminFlashcardDetail,
    AdminQuizDetail,
    AdminQuizPayload,
    AdminQuizQuestionDetail,
    AdminQuizOption,
    AdminQuizSummary,
)

router = APIRouter(prefix="/admin", tags=["admin-content"])


def _load_quiz(db: Session, quiz_id: str) -> Quiz:
    quiz = db.scalars(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    ).first()
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return quiz


def _load_deck(db: Session, deck_id: str) -> FlashcardDeck:
    deck = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.id == deck_id)
        .options(selectinload(FlashcardDeck.flashcards))
    ).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found.")
    return deck


def _quiz_to_summary(db: Session, quiz: Quiz) -> AdminQuizSummary:
    used_by, avg_score = db.execute(
        select(
            func.count(func.distinct(QuizAttempt.user_id)),
            func.avg(QuizAttempt.score),
        ).where(QuizAttempt.quiz_id == quiz.id)
    ).one()

    return AdminQuizSummary(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        documentId=quiz.document_id,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        questionCount=len(quiz.questions),
        status=quiz.status,
        usedBy=int(used_by or 0),
        avgScore=round(float(avg_score or 0)),
        estimatedMinutes=quiz.estimated_minutes,
        lastEditedAt=quiz.updated_at or quiz.created_at,
    )


def _quiz_question_to_detail(
    db: Session,
    quiz: Quiz,
    question: QuizQuestion,
) -> AdminQuizQuestionDetail:
    attempts = db.scalars(
        select(QuizAttempt).where(QuizAttempt.quiz_id == quiz.id)
    ).all()
    answered_attempts = [
        attempt for attempt in attempts
        if isinstance(attempt.answers_json, dict) and question.id in attempt.answers_json
    ]
    average_score = round(
        sum(attempt.score for attempt in answered_attempts) / len(answered_attempts)
    ) if answered_attempts else 0
    options = [
        AdminQuizOption(label=str(option.get("label", "")), text=str(option.get("text", "")))
        for option in (question.options_json or [])
    ]
    return AdminQuizQuestionDetail(
        id=question.id,
        prompt=question.prompt,
        options=options,
        correctAnswer=question.correct_answer or "A",
        explanation=question.explanation,
        sourceDocument=question.source_document,
        sourcePage=question.source_page,
        irtDifficulty=question.irt_difficulty,
        irtDiscrimination=question.irt_discrimination,
        irtGuessing=question.irt_guessing,
        orderIndex=question.order_index,
        topic=question.topic,
        difficulty=question.difficulty,
        attemptCount=len(answered_attempts),
        averageScore=average_score,
        discriminationIndex=question.irt_discrimination,
    )


def _quiz_to_detail(db: Session, quiz: Quiz) -> AdminQuizDetail:
    questions = sorted(quiz.questions, key=lambda item: item.order_index)
    return AdminQuizDetail(
        id=quiz.id,
        title=quiz.title,
        description=quiz.description,
        topic=quiz.topic,
        documentId=quiz.document_id,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        estimatedMinutes=quiz.estimated_minutes,
        status=quiz.status,
        questions=[_quiz_question_to_detail(db, quiz, question) for question in questions],
    )


def _deck_to_summary(db: Session, deck: FlashcardDeck) -> AdminFlashcardDeckSummary:
    card_ids = [card.id for card in deck.flashcards]
    used_by = 0
    if card_ids:
        used_by = int(
            db.scalar(
                select(func.count(func.distinct(FlashcardReview.user_id))).where(
                    FlashcardReview.flashcard_id.in_(card_ids)
                )
            )
            or 0
        )

    return AdminFlashcardDeckSummary(
        id=deck.id,
        title=deck.title,
        topic=deck.topic,
        documentId=deck.document_id,
        cardCount=len(deck.flashcards),
        status=deck.status,
        usedBy=used_by,
        lastEditedAt=deck.updated_at or deck.created_at,
    )


def _deck_card_to_detail(card: Flashcard) -> AdminFlashcardDetail:
    return AdminFlashcardDetail(
        id=card.id,
        frontText=card.front_text,
        backText=card.back_text,
        sourceDocument=card.source_document,
        sourcePage=card.source_page,
        tags=card.tag_list,
        orderIndex=card.order_index,
        topic=card.topic,
        difficulty=card.difficulty,
    )


def _deck_to_detail(deck: FlashcardDeck) -> AdminFlashcardDeckDetail:
    cards = sorted(deck.flashcards, key=lambda item: item.order_index)
    return AdminFlashcardDeckDetail(
        id=deck.id,
        title=deck.title,
        description=deck.description,
        topic=deck.topic,
        documentId=deck.document_id,
        status=deck.status,
        cards=[_deck_card_to_detail(card) for card in cards],
    )


def _parse_difficulty(value: DifficultyLevel | None) -> DifficultyLevel | None:
    if value is None:
        return None
    return value


@router.get("/quizzes", response_model=list[AdminQuizSummary])
def list_admin_quizzes(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> list[AdminQuizSummary]:
    quizzes = db.scalars(
        select(Quiz)
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.updated_at.desc(), Quiz.created_at.desc())
    ).all()
    return [_quiz_to_summary(db, quiz) for quiz in quizzes]


@router.get("/quizzes/{quiz_id}", response_model=AdminQuizDetail)
def get_admin_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminQuizDetail:
    quiz = _load_quiz(db, quiz_id)
    return _quiz_to_detail(db, quiz)


@router.post("/quizzes", response_model=AdminQuizDetail, status_code=status.HTTP_201_CREATED)
def create_admin_quiz(
    payload: AdminQuizPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminQuizDetail:
    quiz = Quiz(
        title=payload.title,
        description=payload.description,
        topic=payload.topic,
        document_id=payload.document_id,
        difficulty=_parse_difficulty(payload.difficulty),
        estimated_minutes=payload.estimated_minutes,
        status=payload.status,
        created_by_user_id=user.id,
    )
    db.add(quiz)
    db.flush()

    for index, question in enumerate(payload.questions):
        db.add(
            QuizQuestion(
                quiz_id=quiz.id,
                prompt=question.prompt,
                options_json=[option.model_dump() for option in question.options],
                correct_answer=question.correct_answer,
                explanation=question.explanation,
                topic=question.topic or payload.topic,
                difficulty=question.difficulty,
                source_document=question.source_document,
                source_page=question.source_page,
                irt_difficulty=question.irt_difficulty,
                irt_discrimination=question.irt_discrimination,
                irt_guessing=question.irt_guessing,
                order_index=question.order_index if question.order_index is not None else index,
            )
        )

    db.commit()
    return _quiz_to_detail(db, _load_quiz(db, quiz.id))


@router.put("/quizzes/{quiz_id}", response_model=AdminQuizDetail)
def update_admin_quiz(
    quiz_id: str,
    payload: AdminQuizPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminQuizDetail:
    quiz = _load_quiz(db, quiz_id)
    quiz.title = payload.title
    quiz.description = payload.description
    quiz.topic = payload.topic
    quiz.document_id = payload.document_id
    quiz.difficulty = _parse_difficulty(payload.difficulty)
    quiz.estimated_minutes = payload.estimated_minutes
    quiz.status = payload.status
    quiz.questions.clear()
    db.flush()

    for index, question in enumerate(payload.questions):
        quiz.questions.append(
            QuizQuestion(
                prompt=question.prompt,
                options_json=[option.model_dump() for option in question.options],
                correct_answer=question.correct_answer,
                explanation=question.explanation,
                topic=question.topic or payload.topic,
                difficulty=question.difficulty,
                source_document=question.source_document,
                source_page=question.source_page,
                irt_difficulty=question.irt_difficulty,
                irt_discrimination=question.irt_discrimination,
                irt_guessing=question.irt_guessing,
                order_index=question.order_index if question.order_index is not None else index,
            )
        )

    db.commit()
    return _quiz_to_detail(db, _load_quiz(db, quiz.id))


@router.post("/quizzes/{quiz_id}/publish", response_model=AdminQuizDetail)
def publish_admin_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminQuizDetail:
    quiz = _load_quiz(db, quiz_id)
    quiz.status = ContentStatus.PUBLISHED
    db.commit()
    return _quiz_to_detail(db, _load_quiz(db, quiz.id))


@router.post("/quizzes/{quiz_id}/archive", response_model=AdminQuizDetail)
def archive_admin_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminQuizDetail:
    quiz = _load_quiz(db, quiz_id)
    quiz.status = ContentStatus.ARCHIVED
    db.commit()
    return _quiz_to_detail(db, _load_quiz(db, quiz.id))


@router.delete("/quizzes/{quiz_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_admin_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> Response:
    quiz = _load_quiz(db, quiz_id)
    db.delete(quiz)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/flashcard-decks", response_model=list[AdminFlashcardDeckSummary])
def list_admin_flashcard_decks(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> list[AdminFlashcardDeckSummary]:
    decks = db.scalars(
        select(FlashcardDeck)
        .options(selectinload(FlashcardDeck.flashcards))
        .order_by(FlashcardDeck.updated_at.desc(), FlashcardDeck.created_at.desc())
    ).all()
    return [_deck_to_summary(db, deck) for deck in decks]


@router.get("/flashcard-decks/{deck_id}", response_model=AdminFlashcardDeckDetail)
def get_admin_flashcard_deck(
    deck_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminFlashcardDeckDetail:
    deck = _load_deck(db, deck_id)
    return _deck_to_detail(deck)


@router.post("/flashcard-decks", response_model=AdminFlashcardDeckDetail, status_code=status.HTTP_201_CREATED)
def create_admin_flashcard_deck(
    payload: AdminFlashcardDeckPayload,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminFlashcardDeckDetail:
    deck = FlashcardDeck(
        title=payload.title,
        description=payload.description,
        topic=payload.topic,
        document_id=payload.document_id,
        status=payload.status,
        created_by_user_id=user.id,
    )
    db.add(deck)
    db.flush()

    for index, card in enumerate(payload.cards):
        db.add(
            Flashcard(
                deck_id=deck.id,
                front_text=card.front_text,
                back_text=card.back_text,
                topic=card.topic or payload.topic,
                difficulty=card.difficulty,
                source_document=card.source_document,
                source_page=card.source_page,
                tag_list=card.tags,
                order_index=card.order_index if card.order_index is not None else index,
            )
        )

    db.commit()
    return _deck_to_detail(_load_deck(db, deck.id))


@router.put("/flashcard-decks/{deck_id}", response_model=AdminFlashcardDeckDetail)
def update_admin_flashcard_deck(
    deck_id: str,
    payload: AdminFlashcardDeckPayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminFlashcardDeckDetail:
    deck = _load_deck(db, deck_id)
    deck.title = payload.title
    deck.description = payload.description
    deck.topic = payload.topic
    deck.document_id = payload.document_id
    deck.status = payload.status
    deck.flashcards.clear()
    db.flush()

    for index, card in enumerate(payload.cards):
        deck.flashcards.append(
            Flashcard(
                front_text=card.front_text,
                back_text=card.back_text,
                topic=card.topic or payload.topic,
                difficulty=card.difficulty,
                source_document=card.source_document,
                source_page=card.source_page,
                tag_list=card.tags,
                order_index=card.order_index if card.order_index is not None else index,
            )
        )

    db.commit()
    return _deck_to_detail(_load_deck(db, deck.id))


@router.post("/flashcard-decks/{deck_id}/publish", response_model=AdminFlashcardDeckDetail)
def publish_admin_flashcard_deck(
    deck_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminFlashcardDeckDetail:
    deck = _load_deck(db, deck_id)
    deck.status = ContentStatus.PUBLISHED
    db.commit()
    return _deck_to_detail(_load_deck(db, deck.id))


@router.post("/flashcard-decks/{deck_id}/archive", response_model=AdminFlashcardDeckDetail)
def archive_admin_flashcard_deck(
    deck_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> AdminFlashcardDeckDetail:
    deck = _load_deck(db, deck_id)
    deck.status = ContentStatus.ARCHIVED
    db.commit()
    return _deck_to_detail(_load_deck(db, deck.id))


@router.delete("/flashcard-decks/{deck_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_admin_flashcard_deck(
    deck_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.ADMIN)),
) -> Response:
    deck = _load_deck(db, deck_id)
    db.delete(deck)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
