"""
Progress API routes — Phase 5
Provides dashboard stats: XP, level, streak, topic mastery, recent quizzes, cards due.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import (
    ContentStatus,
    FlashcardDeck,
    FlashcardReview,
    Quiz,
    QuizAttempt,
    User,
    UserProgress,
    UserStreak,
)
from app.schemas.learning import (
    DashboardStatsOut,
    RecentQuizOut,
    TopicMasteryOut,
)

router = APIRouter(prefix="/progress", tags=["progress"])

LEVEL_XP = {1: 500, 2: 1000, 3: 2000, 4: 3000, 5: 5000, 6: 8000}
LEVEL_TITLES = {
    1: "Intern", 2: "Junior Resident", 3: "Senior Resident",
    4: "Fellow", 5: "Attending", 6: "Radiologist",
}

TOPIC_SLUGS = ["Chest", "Neuro", "MSK", "Abdominal", "Cardiac", "Paediatric"]


def _compute_level(xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_XP.items()):
        if xp >= threshold:
            level = lvl
    return level


def _xp_to_next_level(xp: int, level: int) -> int:
    return LEVEL_XP.get(level + 1, LEVEL_XP[6]) - xp


@router.get("/stats", response_model=DashboardStatsOut)
def get_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardStatsOut:
    # ── Streak + XP ─────────────────────────────────────────────────────────
    streak_row = db.scalars(
        select(UserStreak).where(UserStreak.user_id == user.id)
    ).first()

    xp = streak_row.xp if streak_row else 0
    streak_days = streak_row.streak_days if streak_row else 0
    level = _compute_level(xp)
    xp_to_next = max(0, _xp_to_next_level(xp, level))

    # ── Recent quizzes (last 3 attempts) ────────────────────────────────────
    recent_attempts = db.scalars(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.completed_at.desc())
        .limit(3)
    ).all()

    recent_quizzes: list[RecentQuizOut] = []
    quiz_scores: list[int] = []
    for attempt in recent_attempts:
        quiz = db.get(Quiz, attempt.quiz_id)
        title = quiz.title if quiz else "Quiz"
        delta = (datetime.now(timezone.utc) - attempt.completed_at.replace(tzinfo=timezone.utc)).days
        recent_quizzes.append(RecentQuizOut(title=title, score=attempt.score, daysAgo=delta))
        quiz_scores.append(attempt.score)

    avg_quiz_score = round(sum(quiz_scores) / len(quiz_scores)) if quiz_scores else 0

    # ── Topic mastery ────────────────────────────────────────────────────────
    progress_rows = db.scalars(
        select(UserProgress).where(UserProgress.user_id == user.id)
    ).all()
    mastery_map = {row.topic_slug: row for row in progress_rows}

    # Count quizzes per topic
    quiz_count_by_topic: dict[str, int] = {}
    all_attempts = db.scalars(
        select(QuizAttempt).where(QuizAttempt.user_id == user.id)
    ).all()
    for a in all_attempts:
        q = db.get(Quiz, a.quiz_id)
        if q and q.topic:
            quiz_count_by_topic[q.topic] = quiz_count_by_topic.get(q.topic, 0) + 1

    # Count flashcards per topic (total and mastered/reviewed)
    decks = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.status == ContentStatus.PUBLISHED)
        .options(selectinload(FlashcardDeck.flashcards))
    ).all()

    flash_total_by_topic: dict[str, int] = {}
    flash_done_by_topic: dict[str, int] = {}

    for deck in decks:
        topic = deck.topic or "general"
        cards = deck.flashcards
        flash_total_by_topic[topic] = flash_total_by_topic.get(topic, 0) + len(cards)

        card_ids = [c.id for c in cards]
        if card_ids:
            reviews = db.scalars(
                select(FlashcardReview).where(
                    FlashcardReview.user_id == user.id,
                    FlashcardReview.flashcard_id.in_(card_ids),
                )
            ).all()
            done = sum(
                1 for r in reviews
                if r.repetitions >= 2 and r.last_rating in ("good", "easy")
            )
            flash_done_by_topic[topic] = flash_done_by_topic.get(topic, 0) + done

    topic_mastery: list[TopicMasteryOut] = []
    for topic in TOPIC_SLUGS:
        row = mastery_map.get(topic)
        mastery = row.mastery_score if row else 0
        topic_mastery.append(TopicMasteryOut(
            topic=topic,
            mastery=mastery,
            quizzes=quiz_count_by_topic.get(topic, 0),
            flashcardsTotal=flash_total_by_topic.get(topic, 0),
            flashcardsDone=flash_done_by_topic.get(topic, 0),
        ))

    # ── Due flashcards total ─────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    total_due = 0
    for deck in decks:
        cards = deck.flashcards
        card_ids = [c.id for c in cards]
        if not card_ids:
            continue
        reviews = db.scalars(
            select(FlashcardReview).where(
                FlashcardReview.user_id == user.id,
                FlashcardReview.flashcard_id.in_(card_ids),
            )
        ).all()
        review_map = {r.flashcard_id: r for r in reviews}
        for card in cards:
            rev = review_map.get(card.id)
            if rev is None or rev.next_review_date <= now:
                total_due += 1

    return DashboardStatsOut(
        streakDays=streak_days,
        xp=xp,
        level=level,
        levelTitle=LEVEL_TITLES.get(level, "Intern"),
        xpToNextLevel=xp_to_next,
        avgQuizScore=avg_quiz_score,
        totalDueCards=total_due,
        topicMastery=topic_mastery,
        recentQuizzes=recent_quizzes,
    )
