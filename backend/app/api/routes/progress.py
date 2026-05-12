from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import (
    ContentStatus,
    FlashcardDeck,
    FlashcardReview,
    FlashcardReviewEvent,
    Quiz,
    QuizAttempt,
    User,
    UserProgress,
    UserStreak,
)
from app.schemas.learning import (
    DashboardStatsOut,
    RecentQuizOut,
    StudyActivityOut,
    TopicMasteryOut,
    WeakAreaOut,
)
from app.services.adaptive_learning import (
    build_chat_areas_to_review,
    get_ranked_weak_topics,
    require_owned_chat_session,
)
from app.services.progress_state import LEVEL_TITLES, compute_level, xp_to_next_level

router = APIRouter(prefix="/progress", tags=["progress"])

DEFAULT_TOPICS = ["Chest", "Neuro", "MSK", "Abdominal", "Cardiac", "Paediatric"]


@router.get("/weak-areas", response_model=list[WeakAreaOut])
def get_weak_areas(
    chat_session_id: str | None = Query(
        default=None,
        alias="chatSessionId",
        description="Optional. When set, returns weak topics scoped to this chat session.",
    ),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[WeakAreaOut]:
    if chat_session_id:
        try:
            require_owned_chat_session(db=db, user=user, chat_session_id=chat_session_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        rows = get_ranked_weak_topics(
            db=db, user_id=user.id, chat_session_id=chat_session_id
        )
        return [
            WeakAreaOut(
                topic=r.topic_slug,
                mastery=r.mastery_score,
                weakAreaScore=(
                    r.weak_area_score
                    if r.weak_area_score is not None
                    else max(0, 100 - r.mastery_score)
                ),
            )
            for r in rows
        ]

    progress_rows = db.scalars(
        select(UserProgress).where(UserProgress.user_id == user.id)
    ).all()
    weak: list[WeakAreaOut] = []
    for row in progress_rows:
        mastery = row.mastery_score
        weak_score = (
            row.weak_area_score
            if row.weak_area_score is not None
            else max(0, 100 - mastery)
        )
        if weak_score >= 35 or mastery < 65:
            weak.append(
                WeakAreaOut(
                    topic=row.topic_slug,
                    mastery=mastery,
                    weakAreaScore=weak_score,
                )
            )
    weak.sort(
        key=lambda item: (item.weakAreaScore, 100 - item.mastery),
        reverse=True,
    )
    return weak


@router.get("/stats", response_model=DashboardStatsOut)
def get_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DashboardStatsOut:
    streak_row = db.scalars(
        select(UserStreak).where(UserStreak.user_id == user.id)
    ).first()

    xp = streak_row.xp if streak_row else 0
    streak_days = streak_row.streak_days if streak_row else 0
    level = compute_level(xp)
    xp_to_next = xp_to_next_level(xp, level)

    recent_attempts = db.scalars(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.completed_at.desc())
        .limit(3)
    ).all()

    recent_quizzes: list[RecentQuizOut] = []
    all_attempts = db.scalars(
        select(QuizAttempt)
        .where(QuizAttempt.user_id == user.id)
        .order_by(QuizAttempt.completed_at.desc())
    ).all()
    quiz_scores: list[int] = []
    quiz_count_by_topic: dict[str, int] = {}

    for attempt in recent_attempts:
        quiz = db.get(Quiz, attempt.quiz_id)
        title = quiz.title if quiz else "Quiz"
        delta = (
            datetime.now(timezone.utc) - attempt.completed_at.replace(tzinfo=timezone.utc)
        ).days
        recent_quizzes.append(RecentQuizOut(title=title, score=attempt.score, daysAgo=delta))

    for attempt in all_attempts:
        quiz_scores.append(attempt.score)
        quiz = db.get(Quiz, attempt.quiz_id)
        if quiz and quiz.topic:
            quiz_count_by_topic[quiz.topic] = quiz_count_by_topic.get(quiz.topic, 0) + 1

    avg_quiz_score = round(sum(quiz_scores) / len(quiz_scores)) if quiz_scores else 0

    progress_rows = db.scalars(
        select(UserProgress).where(UserProgress.user_id == user.id)
    ).all()
    mastery_map = {row.topic_slug: row for row in progress_rows}

    decks = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.status == ContentStatus.PUBLISHED)
        .options(selectinload(FlashcardDeck.flashcards))
        .order_by(FlashcardDeck.created_at.desc())
    ).all()

    flash_total_by_topic: dict[str, int] = {}
    flash_done_by_topic: dict[str, int] = {}
    total_due = 0
    now = datetime.now(timezone.utc)

    for deck in decks:
        topic = deck.topic or "General"
        cards = deck.flashcards
        flash_total_by_topic[topic] = flash_total_by_topic.get(topic, 0) + len(cards)

        card_ids = [card.id for card in cards]
        if not card_ids:
            continue

        reviews = db.scalars(
            select(FlashcardReview).where(
                FlashcardReview.user_id == user.id,
                FlashcardReview.flashcard_id.in_(card_ids),
            )
        ).all()
        review_map = {review.flashcard_id: review for review in reviews}
        done_count = 0
        for card in cards:
            review = review_map.get(card.id)
            if review and review.repetitions >= 2 and review.last_rating in ("good", "easy"):
                done_count += 1
            if review is None or review.next_review_date <= now:
                total_due += 1
        flash_done_by_topic[topic] = flash_done_by_topic.get(topic, 0) + done_count

    topic_order = list(
        dict.fromkeys(
            DEFAULT_TOPICS
            + sorted(mastery_map.keys())
            + sorted(flash_total_by_topic.keys())
            + sorted(quiz_count_by_topic.keys())
        )
    )

    topic_mastery: list[TopicMasteryOut] = []
    weak_areas: list[WeakAreaOut] = []
    for topic in topic_order:
        row = mastery_map.get(topic)
        mastery = row.mastery_score if row else 0
        weak_area_score = row.weak_area_score if row and row.weak_area_score is not None else max(0, 100 - mastery)
        item = TopicMasteryOut(
            topic=topic,
            mastery=mastery,
            quizzes=quiz_count_by_topic.get(topic, 0),
            flashcardsTotal=flash_total_by_topic.get(topic, 0),
            flashcardsDone=flash_done_by_topic.get(topic, 0),
            weakAreaScore=weak_area_score,
        )
        topic_mastery.append(item)
        if weak_area_score >= 35 or mastery < 65:
            weak_areas.append(
                WeakAreaOut(topic=topic, mastery=mastery, weakAreaScore=weak_area_score)
            )

    weak_areas.sort(key=lambda item: (item.weakAreaScore, 100 - item.mastery), reverse=True)

    study_activity = _build_study_activity(db=db, user_id=user.id)

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
        weakAreas=weak_areas[:4],
        areasToReviewByChat=build_chat_areas_to_review(db=db, user_id=user.id),
        studyActivity=study_activity,
    )


def _build_study_activity(*, db: Session, user_id: str) -> list[StudyActivityOut]:
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=6)

    attempts = db.scalars(
        select(QuizAttempt).where(QuizAttempt.user_id == user_id)
    ).all()
    review_events = db.scalars(
        select(FlashcardReviewEvent).where(FlashcardReviewEvent.user_id == user_id)
    ).all()

    by_day: dict[str, dict[str, int]] = {}
    for offset in range(7):
        day = start_date + timedelta(days=offset)
        by_day[day.isoformat()] = {"quizzes": 0, "flashcards": 0, "minutes": 0}

    for attempt in attempts:
        completed = attempt.completed_at.replace(tzinfo=timezone.utc).date()
        key = completed.isoformat()
        if key not in by_day:
            continue
        by_day[key]["quizzes"] += 1
        minutes = round((attempt.time_taken_seconds or 0) / 60)
        by_day[key]["minutes"] += max(1, minutes) if attempt.time_taken_seconds else 10

    for event in review_events:
        completed = event.created_at.replace(tzinfo=timezone.utc).date()
        key = completed.isoformat()
        if key not in by_day:
            continue
        by_day[key]["flashcards"] += 1

    for key, values in by_day.items():
        if values["flashcards"] > 0:
            values["minutes"] += max(1, round(values["flashcards"] / 3))

    return [
        StudyActivityOut(
            date=day,
            quizzes=values["quizzes"],
            flashcards=values["flashcards"],
            minutes=values["minutes"],
        )
        for day, values in by_day.items()
    ]
