"""
Quiz API routes — Phase 5
"""
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
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
    UserStreak,
)
from app.schemas.learning import (
    QuizAttemptOut,
    QuizDetailOut,
    QuizOut,
    QuizQuestionOut,
    QuizOptionOut,
    QuizSubmitRequest,
    QuizSubmitResult,
)
from app.services.bkt import batch_update_mastery, mastery_to_score

router = APIRouter(prefix="/quizzes", tags=["quizzes"])

# XP constants
XP_PER_CORRECT = 5
XP_BONUS_HIGH_SCORE = 20   # if score >= 80%
XP_BONUS_PERFECT = 30      # if score == 100%

LEVEL_XP = {1: 500, 2: 1000, 3: 2000, 4: 3000, 5: 5000, 6: 8000}
LEVEL_TITLES = {
    1: "Intern", 2: "Junior Resident", 3: "Senior Resident",
    4: "Fellow", 5: "Attending", 6: "Radiologist",
}


def _compute_level(xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_XP.items()):
        if xp >= threshold:
            level = lvl
    return level


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
        )
        db.add(progress)
    else:
        progress.mastery_score = mastery_score
        progress.bkt_mastery_probability = mastery_score

    # Update XP and level in UserStreak
    streak = db.scalars(
        select(UserStreak).where(UserStreak.user_id == user.id)
    ).first()
    if streak is None:
        streak = UserStreak(user_id=user.id, xp=xp, level=1)
        db.add(streak)
    else:
        streak.xp = (streak.xp or 0) + xp
    streak.level = _compute_level(streak.xp)

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
