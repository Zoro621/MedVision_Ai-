"""
Quiz API routes — Phase 5
"""
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import (
    ContentStatus,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
    UserProgress,
    UserRole,
)
from app.schemas.learning import (
    QuizAttemptDetailOut,
    QuizAttemptOut,
    QuizDetailOut,
    QuizOut,
    QuizAttemptQuestionOut,
    QuizQuestionOut,
    QuizOptionOut,
    QuizSubmitRequest,
    QuizSubmitResult,
)
from app.services.bkt import batch_update_mastery, mastery_to_score
from app.services.gamification import sync_user_gamification
from app.services.progress_state import record_learning_activity

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

# XP constants
XP_PER_CORRECT = 5
XP_BONUS_HIGH_SCORE = 20   # if score >= 80%
XP_BONUS_PERFECT = 30      # if score == 100%


def _question_to_out(q: QuizQuestion) -> QuizQuestionOut:
    options = []
    if q.options_json:
        for opt in q.options_json:
            options.append(QuizOptionOut(label=opt.get("label", ""), text=opt.get("text", "")))
    return QuizQuestionOut(
        id=q.id,
        questionText=q.prompt,
        options=options,
        correctAnswer=q.correct_answer or "A",
        explanation=q.explanation,
        sourceDocument=q.source_document,
        sourcePage=q.source_page,
    )


def _quiz_to_out(
    quiz: Quiz,
    best_score: int | None,
    attempt_count: int,
) -> QuizOut:
    q_count = len(quiz.questions) if quiz.questions else 0
    return QuizOut(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        questionCount=q_count,
        estimatedMinutes=quiz.estimated_minutes,
        bestScore=best_score,
        attempts=attempt_count,
        isNew=(attempt_count == 0),
    )


def _attempt_question_to_out(
    question: QuizQuestion,
    selected_answer: str | None,
) -> QuizAttemptQuestionOut:
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


@router.get("", response_model=list[QuizOut])
def list_quizzes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[QuizOut]:
    """List all published quizzes with student's best score."""
    quizzes = db.scalars(
        select(Quiz)
        .where(Quiz.status == ContentStatus.PUBLISHED)
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.created_at.desc())
    ).all()

    results = []
    for quiz in quizzes:
        # Fetch best score and attempt count for this user
        attempts = db.scalars(
            select(QuizAttempt)
            .where(QuizAttempt.quiz_id == quiz.id, QuizAttempt.user_id == user.id)
        ).all()
        best = max((a.score for a in attempts), default=None)
        results.append(_quiz_to_out(quiz, best_score=best, attempt_count=len(attempts)))

    return results


@router.get("/{quiz_id}", response_model=QuizDetailOut)
def get_quiz(
    quiz_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizDetailOut:
    """Get quiz detail including all questions (for taking the quiz)."""
    quiz = db.scalars(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    ).first()

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")
    if quiz.status != ContentStatus.PUBLISHED and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Quiz not published.")

    sorted_questions = sorted(quiz.questions, key=lambda q: q.order_index)
    return QuizDetailOut(
        id=quiz.id,
        title=quiz.title,
        topic=quiz.topic,
        difficulty=quiz.difficulty.value if quiz.difficulty else None,
        estimatedMinutes=quiz.estimated_minutes,
        questions=[_question_to_out(q) for q in sorted_questions],
    )


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResult)
def submit_quiz(
    quiz_id: str,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> QuizSubmitResult:
    """Submit quiz answers, persist attempt, update mastery and XP."""
    quiz = db.scalars(
        select(Quiz)
        .where(Quiz.id == quiz_id)
        .options(selectinload(Quiz.questions))
    ).first()

    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    question_map = {q.id: q for q in quiz.questions}
    answers_dict = {a.questionId: a.selectedAnswer for a in payload.answers}

    correct_count = sum(
        1 for qid, selected in answers_dict.items()
        if question_map.get(qid) and question_map[qid].correct_answer == selected
    )
    total_count = len(quiz.questions)
    score = round((correct_count / total_count) * 100) if total_count > 0 else 0

    xp = correct_count * XP_PER_CORRECT
    if score >= 80:
        xp += XP_BONUS_HIGH_SCORE
    if score == 100:
        xp += XP_BONUS_PERFECT

    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=user.id,
        score=score,
        correct_count=correct_count,
        total_count=total_count,
        time_taken_seconds=payload.timeTakenSeconds,
        xp_earned=xp,
        answers_json=answers_dict,
    )
    db.add(attempt)

    # Update BKT mastery for quiz topic
    topic = quiz.topic or "general"
    progress = db.scalars(
        select(UserProgress).where(
            UserProgress.user_id == user.id,
            UserProgress.topic_slug == topic,
        )
    ).first()

    prior = (progress.bkt_mastery_probability or 0) / 100.0 if progress else 0.0
    new_mastery = batch_update_mastery(prior, correct_count, total_count)
    mastery_score = mastery_to_score(new_mastery)

    if progress is None:
        progress = UserProgress(
            user_id=user.id,
            topic_slug=topic,
            mastery_score=mastery_score,
            bkt_mastery_probability=mastery_score,
            weak_area_score=max(0, 100 - mastery_score),
        )
        db.add(progress)
    else:
        progress.mastery_score = mastery_score
        progress.bkt_mastery_probability = mastery_score
        progress.weak_area_score = max(0, 100 - mastery_score)

    # Track streak and XP for the learning loop.
    record_learning_activity(db=db, user_id=user.id, xp_earned=xp)
    sync_user_gamification(db, user.id)

    db.flush()
    db.commit()

    sorted_questions = sorted(quiz.questions, key=lambda q: q.order_index)
    return QuizSubmitResult(
        attemptId=attempt.id,
        score=score,
        correct=correct_count,
        total=total_count,
        xpEarned=xp,
        questions=[_question_to_out(q) for q in sorted_questions],
    )


@router.get("/{quiz_id}/attempts", response_model=list[QuizAttemptOut])
def list_attempts(
    quiz_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[QuizAttemptOut]:
    """List the current user's attempts for a quiz."""
    attempts = db.scalars(
        select(QuizAttempt)
        .where(QuizAttempt.quiz_id == quiz_id, QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.completed_at.desc())
    ).all()

    out = []
    for a in attempts:
        completed_str = (
            a.completed_at.replace(tzinfo=timezone.utc).isoformat()
            if a.completed_at else ""
        )
        out.append(QuizAttemptOut(
            id=a.id,
            score=a.score,
            correctCount=a.correct_count,
            totalCount=a.total_count,
            xpEarned=a.xp_earned,
            completedAt=completed_str,
        ))
    return out


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

    quiz = db.scalars(
        select(Quiz)
        .where(Quiz.id == attempt.quiz_id)
        .options(selectinload(Quiz.questions))
    ).first()
    if quiz is None:
        raise HTTPException(status_code=404, detail="Quiz not found.")

    answers = attempt.answers_json or {}
    questions = sorted(quiz.questions, key=lambda item: item.order_index)
    completed_str = (
        attempt.completed_at.replace(tzinfo=timezone.utc).isoformat()
        if attempt.completed_at else ""
    )

    return QuizAttemptDetailOut(
        id=attempt.id,
        quizId=quiz.id,
        quizTitle=quiz.title,
        score=attempt.score,
        correctCount=attempt.correct_count,
        totalCount=attempt.total_count,
        xpEarned=attempt.xp_earned,
        timeTakenSeconds=attempt.time_taken_seconds,
        completedAt=completed_str,
        questions=[
            _attempt_question_to_out(question, answers.get(question.id))
            for question in questions
        ],
    )
