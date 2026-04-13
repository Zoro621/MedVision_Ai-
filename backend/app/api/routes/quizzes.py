"""
Quiz API routes — Phase 5+
"""
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import ContentStatus, Quiz, QuizAttempt, QuizQuestion, User, UserRole
from app.schemas.learning import (
    QuizAttemptDetailOut,
    QuizAttemptOut,
    QuizDetailOut,
    QuizGenerationRequest,
    QuizOut,
    QuizAttemptQuestionOut,
    QuizQuestionOut,
    QuizOptionOut,
    QuizSubmitRequest,
    QuizSubmitResult,
)
from app.services.adaptive_learning import (
    build_chat_session_scope,
    generate_quiz_for_chat,
    mark_questions_shown,
    quiz_matches_scope,
    require_owned_chat_session,
    update_progress_for_quiz_attempt,
)
from app.services.gamification import sync_user_gamification
from app.services.progress_state import record_learning_activity

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

# XP constants
XP_PER_CORRECT = 5
XP_BONUS_HIGH_SCORE = 20
XP_BONUS_PERFECT = 30


def _question_to_out(q: QuizQuestion) -> QuizQuestionOut:
    return QuizQuestionOut(
        id=q.id,
        questionText=q.prompt,
        options=[
            QuizOptionOut(label=opt.get("label", ""), text=opt.get("text", ""))
            for opt in (q.options_json or [])
        ],
        correctAnswer=q.correct_answer or "A",
        explanation=q.explanation,
        topic=q.topic,
        difficultyLevel=q.difficulty,
        sourceDocument=q.source_document,
        sourcePage=q.source_page,
    )


def _quiz_to_out(quiz: Quiz, best_score: int | None, attempt_count: int) -> QuizOut:
    return QuizOut(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        chatSessionId=quiz.chat_session_id,
        documentId=quiz.document_id,
        questionCount=len(quiz.questions) if quiz.questions else 0,
        estimatedMinutes=quiz.estimated_minutes,
        bestScore=best_score,
        attempts=attempt_count,
        isNew=(attempt_count == 0),
    )


def _attempt_question_to_out(question: QuizQuestion, selected_answer: str | None) -> QuizAttemptQuestionOut:
    return QuizAttemptQuestionOut(
        questionId=question.id,
        questionText=question.prompt,
        options=[
            QuizOptionOut(label=opt.get("label", ""), text=opt.get("text", ""))
            for opt in (question.options_json or [])
        ],
        selectedAnswer=selected_answer,
        correctAnswer=question.correct_answer or "A",
        isCorrect=selected_answer == question.correct_answer,
        explanation=question.explanation,
        sourceDocument=question.source_document,
        sourcePage=question.source_page,
    )


def _load_quiz(db: Session, quiz_id: str) -> Quiz:
    quiz = db.scalars(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    ).first()
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    return quiz


def _resolve_chat_session_id(
    *,
    db: Session,
    user: User,
    quiz: Quiz,
    chat_session_id: str | None,
) -> str | None:
    effective_chat_session_id = quiz.chat_session_id or chat_session_id
    if effective_chat_session_id is None:
        return None

    if quiz.chat_session_id and chat_session_id and quiz.chat_session_id != chat_session_id:
        raise HTTPException(status_code=403, detail="Quiz does not belong to this chat session.")

    if user.role != UserRole.ADMIN:
        require_owned_chat_session(db=db, user=user, chat_session_id=effective_chat_session_id)

    return effective_chat_session_id


def _ensure_quiz_visible_to_user(
    *,
    db: Session,
    user: User,
    quiz: Quiz,
    chat_session_id: str | None,
) -> str | None:
    effective_chat_session_id = _resolve_chat_session_id(
        db=db,
        user=user,
        quiz=quiz,
        chat_session_id=chat_session_id,
    )

    if user.role == UserRole.ADMIN:
        return effective_chat_session_id

    if quiz.status != ContentStatus.PUBLISHED:
        raise HTTPException(status_code=403, detail="Quiz not published.")

    if quiz.chat_session_id:
        return effective_chat_session_id

    if not effective_chat_session_id:
        raise HTTPException(status_code=400, detail="chatSessionId is required for scoped quizzes.")

    scope = build_chat_session_scope(db=db, user=user, chat_session_id=effective_chat_session_id)
    if not quiz_matches_scope(quiz=quiz, scope=scope):
        raise HTTPException(status_code=403, detail="Quiz is outside the current chat scope.")

    return effective_chat_session_id


@router.post("/generate", response_model=QuizDetailOut)
def generate_quiz(
    payload: QuizGenerationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizDetailOut:
    try:
        require_owned_chat_session(db=db, user=user, chat_session_id=payload.chat_session_id)
        quiz = generate_quiz_for_chat(
            db=db,
            user=user,
            chat_session_id=payload.chat_session_id,
            count=payload.count,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Quiz generation failed: {exc}") from exc

    quiz = _load_quiz(db, quiz.id)
    questions = sorted(quiz.questions, key=lambda item: item.order_index)
    return QuizDetailOut(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        chatSessionId=quiz.chat_session_id,
        documentId=quiz.document_id,
        estimatedMinutes=quiz.estimated_minutes,
        questions=[_question_to_out(question) for question in questions],
    )


@router.get("", response_model=list[QuizOut])
def list_quizzes(
    chat_session_id: str | None = Query(default=None, alias="chatSessionId"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[QuizOut]:
    if not chat_session_id and user.role != UserRole.ADMIN:
        return []

    scope = None
    if chat_session_id:
        scope = build_chat_session_scope(db=db, user=user, chat_session_id=chat_session_id)

    quizzes = db.scalars(
        select(Quiz)
        .where(Quiz.status == ContentStatus.PUBLISHED)
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.created_at.desc())
    ).all()

    results: list[QuizOut] = []
    for quiz in quizzes:
        if scope and not quiz_matches_scope(quiz=quiz, scope=scope):
            continue
        attempt_query = select(QuizAttempt).where(
            QuizAttempt.quiz_id == quiz.id,
            QuizAttempt.user_id == user.id,
        )
        if chat_session_id:
            attempt_query = attempt_query.where(QuizAttempt.chat_session_id == chat_session_id)
        attempts = db.scalars(attempt_query).all()
        best = max((attempt.score for attempt in attempts), default=None)
        results.append(_quiz_to_out(quiz, best_score=best, attempt_count=len(attempts)))

    return results


@router.get("/{quiz_id}", response_model=QuizDetailOut)
def get_quiz(
    quiz_id: str,
    chat_session_id: str | None = Query(default=None, alias="chatSessionId"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizDetailOut:
    quiz = _load_quiz(db, quiz_id)
    effective_chat_session_id = _ensure_quiz_visible_to_user(
        db=db,
        user=user,
        quiz=quiz,
        chat_session_id=chat_session_id,
    )

    sorted_questions = sorted(quiz.questions, key=lambda q: q.order_index)
    if effective_chat_session_id:
        mark_questions_shown(
            db=db,
            user_id=user.id,
            chat_session_id=effective_chat_session_id,
            question_ids=[question.id for question in sorted_questions],
        )
        db.commit()

    return QuizDetailOut(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        chatSessionId=quiz.chat_session_id or effective_chat_session_id,
        documentId=quiz.document_id,
        estimatedMinutes=quiz.estimated_minutes,
        questions=[_question_to_out(question) for question in sorted_questions],
    )


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResult)
def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizSubmitResult:
    quiz = _load_quiz(db, quiz_id)
    effective_chat_session_id = _ensure_quiz_visible_to_user(
        db=db,
        user=user,
        quiz=quiz,
        chat_session_id=payload.chat_session_id,
    )
    if effective_chat_session_id is None:
        raise HTTPException(status_code=400, detail="chatSessionId is required for scoped quiz attempts.")

    question_map = {question.id: question for question in quiz.questions}
    answers_dict = {answer.questionId: answer.selectedAnswer for answer in payload.answers}
    sorted_questions = sorted(quiz.questions, key=lambda item: item.order_index)

    question_results = []
    for question in sorted_questions:
        selected = answers_dict.get(question.id)
        is_correct = selected == question.correct_answer
        question_results.append(
            {
                "question_id": question.id,
                "topic": question.topic or quiz.topic or "General",
                "is_correct": is_correct,
            }
        )

    correct_count = sum(1 for result in question_results if result["is_correct"])
    total_count = len(sorted_questions)
    score = round((correct_count / total_count) * 100) if total_count > 0 else 0

    xp = correct_count * XP_PER_CORRECT
    if score >= 80:
        xp += XP_BONUS_HIGH_SCORE
    if score == 100:
        xp += XP_BONUS_PERFECT

    wrong_topics = update_progress_for_quiz_attempt(
        db=db,
        user_id=user.id,
        chat_session_id=effective_chat_session_id,
        question_results=question_results,
    )

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user.id,
        chat_session_id=effective_chat_session_id,
        score=score,
        correct_count=correct_count,
        total_count=total_count,
        time_taken_seconds=payload.timeTakenSeconds,
        xp_earned=xp,
        answers_json=answers_dict,
        wrong_topics_json=wrong_topics,
    )
    db.add(attempt)

    record_learning_activity(db=db, user_id=user.id, xp_earned=xp)
    sync_user_gamification(db, user.id)

    db.flush()
    db.commit()

    return QuizSubmitResult(
        attemptId=attempt.id,
        chatSessionId=effective_chat_session_id,
        score=score,
        correct=correct_count,
        total=total_count,
        xpEarned=xp,
        wrongTopics=wrong_topics,
        questions=[_question_to_out(question) for question in sorted_questions],
    )


@router.get("/{quiz_id}/attempts", response_model=list[QuizAttemptOut])
def list_attempts(
    quiz_id: str,
    chat_session_id: str | None = Query(default=None, alias="chatSessionId"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[QuizAttemptOut]:
    query = (
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.completed_at.desc())
    )
    if chat_session_id:
        query = query.where(QuizAttempt.chat_session_id == chat_session_id)

    attempts = db.scalars(query).all()
    return [
        QuizAttemptOut(
            id=attempt.id,
            chatSessionId=attempt.chat_session_id,
            score=attempt.score,
            correctCount=attempt.correct_count,
            totalCount=attempt.total_count,
            xpEarned=attempt.xp_earned,
            completedAt=(
                attempt.completed_at.replace(tzinfo=timezone.utc).isoformat()
                if attempt.completed_at
                else ""
            ),
        )
        for attempt in attempts
    ]


@router.get("/attempts/{attempt_id}", response_model=QuizAttemptDetailOut)
def get_attempt_detail(
    attempt_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizAttemptDetailOut:
    attempt = db.get(QuizAttempt, attempt_id)
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found.")
    if attempt.user_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied.")

    quiz = _load_quiz(db, attempt.quiz_id)
    answers = attempt.answers_json or {}
    questions = sorted(quiz.questions, key=lambda item: item.order_index)

    return QuizAttemptDetailOut(
        id=attempt.id,
        quizId=quiz.id,
        quizTitle=quiz.title,
        chatSessionId=attempt.chat_session_id,
        score=attempt.score,
        correctCount=attempt.correct_count,
        totalCount=attempt.total_count,
        xpEarned=attempt.xp_earned,
        timeTakenSeconds=attempt.time_taken_seconds,
        completedAt=(
            attempt.completed_at.replace(tzinfo=timezone.utc).isoformat()
            if attempt.completed_at
            else ""
        ),
        wrongTopics=attempt.wrong_topics_json or [],
        questions=[
            _attempt_question_to_out(question, answers.get(question.id))
            for question in questions
        ],
    )
