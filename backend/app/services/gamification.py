from datetime import datetime, time, timedelta, timezone

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models import (
    Badge,
    FlashcardReviewEvent,
    LeaderboardEntry,
    Quiz,
    QuizAttempt,
    User,
    UserBadge,
    UserProgress,
    UserRole,
    UserStreak,
)
from app.services.progress_state import compute_level, get_or_create_streak

BADGE_RULES = [
    {
        "slug": "first-case-complete",
        "name": "First Case Complete",
        "description": "Complete your first quiz.",
        "xp_reward": 50,
        "tier": "bronze",
        "category": "learning",
        "icon": "trophy",
        "metric": "quiz_attempts",
        "target": 1,
    },
    {
        "slug": "streak-starter",
        "name": "Streak Starter",
        "description": "Maintain a three day study streak.",
        "xp_reward": 100,
        "tier": "silver",
        "category": "consistency",
        "icon": "flame",
        "metric": "streak_days",
        "target": 3,
    },
    {
        "slug": "week-warrior",
        "name": "Week Warrior",
        "description": "Reach a seven day streak.",
        "xp_reward": 150,
        "tier": "gold",
        "category": "consistency",
        "icon": "calendar",
        "metric": "streak_days",
        "target": 7,
    },
    {
        "slug": "flashcard-adept",
        "name": "Flashcard Adept",
        "description": "Review 25 flashcards.",
        "xp_reward": 75,
        "tier": "bronze",
        "category": "learning",
        "icon": "book-open",
        "metric": "flashcard_reviews",
        "target": 25,
    },
    {
        "slug": "quiz-master",
        "name": "Quiz Master",
        "description": "Complete five quizzes.",
        "xp_reward": 125,
        "tier": "gold",
        "category": "performance",
        "icon": "target",
        "metric": "quiz_attempts",
        "target": 5,
    },
    {
        "slug": "accuracy-ace",
        "name": "Accuracy Ace",
        "description": "Score at least 90 percent on a quiz.",
        "xp_reward": 100,
        "tier": "gold",
        "category": "performance",
        "icon": "brain",
        "metric": "best_quiz_score",
        "target": 90,
    },
    {
        "slug": "knowledge-builder",
        "name": "Knowledge Builder",
        "description": "Earn 500 XP.",
        "xp_reward": 150,
        "tier": "silver",
        "category": "learning",
        "icon": "zap",
        "metric": "xp",
        "target": 500,
    },
    {
        "slug": "specialty-scout",
        "name": "Specialty Scout",
        "description": "Reach mastery in three topics.",
        "xp_reward": 175,
        "tier": "platinum",
        "category": "specialty",
        "icon": "star",
        "metric": "mastered_topics",
        "target": 3,
    },
]

BADGE_RULES_BY_SLUG = {rule["slug"]: rule for rule in BADGE_RULES}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def current_season(value: datetime | None = None) -> str:
    return (value or utc_now()).strftime("%Y-%m")


def ensure_badge_catalog(db: Session) -> dict[str, Badge]:
    existing = {badge.slug: badge for badge in db.scalars(select(Badge)).all()}
    for rule in BADGE_RULES:
        if rule["slug"] not in existing:
            badge = Badge(
                slug=rule["slug"],
                name=rule["name"],
                description=rule["description"],
                xp_reward=rule["xp_reward"],
            )
            db.add(badge)
            existing[rule["slug"]] = badge
    db.flush()
    return existing


def get_user_metrics(db: Session, user_id: str) -> dict[str, int | str | None]:
    streak = get_or_create_streak(db, user_id)
    attempts = db.scalars(
        select(QuizAttempt).where(QuizAttempt.user_id == user_id)
    ).all()
    review_events = db.scalars(
        select(FlashcardReviewEvent).where(FlashcardReviewEvent.user_id == user_id)
    ).all()
    progress_rows = db.scalars(
        select(UserProgress).where(UserProgress.user_id == user_id)
    ).all()

    quiz_map = {
        quiz.id: quiz
        for quiz in db.scalars(select(Quiz).where(Quiz.id.in_([attempt.quiz_id for attempt in attempts]))).all()
    } if attempts else {}

    now = utc_now()
    today = now.date()
    week_start = today - timedelta(days=today.weekday())

    weakest_topic = None
    weakest_mastery = None
    mastered_topics = 0
    for row in progress_rows:
        mastery = row.mastery_score or 0
        if mastery >= 80:
            mastered_topics += 1
        if weakest_mastery is None or mastery < weakest_mastery:
            weakest_mastery = mastery
            weakest_topic = row.topic_slug

    quiz_attempts_today = 0
    weakest_topic_quizzes_today = 0
    quiz_attempts_this_week = 0
    quiz_xp_this_week = 0
    best_quiz_score = max((attempt.score for attempt in attempts), default=0)

    for attempt in attempts:
        completed_at = ensure_timezone(attempt.completed_at)
        quiz = quiz_map.get(attempt.quiz_id)
        if completed_at.date() == today:
            quiz_attempts_today += 1
            if weakest_topic and quiz and quiz.topic == weakest_topic:
                weakest_topic_quizzes_today += 1
        if completed_at.date() >= week_start:
            quiz_attempts_this_week += 1
            quiz_xp_this_week += attempt.xp_earned

    flashcard_reviews_this_week = 0
    review_xp_this_week = 0
    for event in review_events:
        created_at = ensure_timezone(event.created_at)
        if created_at.date() >= week_start:
            flashcard_reviews_this_week += 1
            review_xp_this_week += event.xp_earned

    return {
        "quiz_attempts": len(attempts),
        "flashcard_reviews": len(review_events),
        "best_quiz_score": best_quiz_score,
        "xp": streak.xp or 0,
        "streak_days": streak.streak_days or 0,
        "mastered_topics": mastered_topics,
        "quiz_attempts_today": quiz_attempts_today,
        "weakest_topic_quizzes_today": weakest_topic_quizzes_today,
        "quiz_attempts_this_week": quiz_attempts_this_week,
        "flashcard_reviews_this_week": flashcard_reviews_this_week,
        "xp_this_week": quiz_xp_this_week + review_xp_this_week,
        "weakest_topic": weakest_topic,
        "weakest_mastery": weakest_mastery,
    }


def sync_leaderboard_entry(db: Session, user_id: str) -> LeaderboardEntry:
    streak = get_or_create_streak(db, user_id)
    season = current_season()
    entry = db.scalars(
        select(LeaderboardEntry).where(
            LeaderboardEntry.user_id == user_id,
            LeaderboardEntry.season == season,
        )
    ).first()
    if entry is None:
        entry = LeaderboardEntry(user_id=user_id, season=season)
        db.add(entry)

    entry.xp = streak.xp or 0
    entry.streak_days = streak.streak_days or 0
    entry.level = compute_level(entry.xp)
    db.flush()
    return entry


def sync_all_leaderboard_entries(db: Session) -> None:
    students = db.scalars(
        select(User).where(User.role == UserRole.STUDENT, User.is_active.is_(True))
    ).all()
    for student in students:
        sync_leaderboard_entry(db, student.id)
    db.flush()


def sync_user_gamification(db: Session, user_id: str) -> dict[str, int | str | None]:
    badge_rows = ensure_badge_catalog(db)
    metrics = get_user_metrics(db, user_id)
    streak = get_or_create_streak(db, user_id)

    awarded_slugs = {
        row[0]
        for row in db.execute(
            select(Badge.slug)
            .join(UserBadge, UserBadge.badge_id == Badge.id)
            .where(UserBadge.user_id == user_id)
        ).all()
    }

    for rule in BADGE_RULES:
        metric_value = int(metrics.get(rule["metric"], 0) or 0)
        if metric_value < rule["target"] or rule["slug"] in awarded_slugs:
            continue

        badge = badge_rows[rule["slug"]]
        db.add(UserBadge(user_id=user_id, badge_id=badge.id))
        streak.xp = (streak.xp or 0) + badge.xp_reward
        streak.level = compute_level(streak.xp)
        awarded_slugs.add(rule["slug"])

    sync_leaderboard_entry(db, user_id)
    db.flush()
    return get_user_metrics(db, user_id)


def build_achievement_rows(db: Session, user_id: str) -> list[dict]:
    badge_rows = ensure_badge_catalog(db)
    metrics = get_user_metrics(db, user_id)
    awarded_rows = db.execute(
        select(Badge.slug, UserBadge.awarded_at)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .where(UserBadge.user_id == user_id)
    ).all()
    awarded_at_by_slug = {
        slug: ensure_timezone(awarded_at).isoformat() for slug, awarded_at in awarded_rows
    }

    achievements: list[dict] = []
    for rule in BADGE_RULES:
        badge = badge_rows[rule["slug"]]
        progress = min(int(metrics.get(rule["metric"], 0) or 0), rule["target"])
        achievements.append(
            {
                "id": badge.id,
                "title": badge.name,
                "description": badge.description,
                "icon": rule["icon"],
                "tier": rule["tier"],
                "unlockedAt": awarded_at_by_slug.get(rule["slug"]),
                "progress": progress,
                "maxProgress": rule["target"],
                "category": rule["category"],
                "xpReward": badge.xp_reward,
            }
        )

    achievements.sort(
        key=lambda item: (
            item["unlockedAt"] is None,
            item["category"],
            item["title"],
        )
    )
    return achievements


def build_leaderboard_rows(db: Session, current_user_id: str, limit: int = 10) -> list[dict]:
    sync_all_leaderboard_entries(db)
    season = current_season()
    rows = db.execute(
        select(LeaderboardEntry, User)
        .join(User, User.id == LeaderboardEntry.user_id)
        .where(LeaderboardEntry.season == season, User.role == UserRole.STUDENT)
        .order_by(
            desc(LeaderboardEntry.xp),
            desc(LeaderboardEntry.streak_days),
            desc(LeaderboardEntry.level),
            User.full_name,
        )
    ).all()

    leaderboard = []
    for rank, (entry, user) in enumerate(rows[:limit], start=1):
        leaderboard.append(
            {
                "rank": rank,
                "name": user.full_name,
                "xp": entry.xp,
                "streak": entry.streak_days,
                "level": entry.level,
                "isCurrentUser": user.id == current_user_id,
            }
        )
    return leaderboard


def build_daily_challenge_row(metrics: dict[str, int | str | None]) -> dict:
    now = utc_now()
    weakest_topic = str(metrics.get("weakest_topic") or "Chest")
    weakest_mastery = int(metrics.get("weakest_mastery") or 0)
    quiz_count = int(metrics.get("weakest_topic_quizzes_today") or metrics.get("quiz_attempts_today") or 0)

    if weakest_mastery <= 40:
        difficulty = "Beginner"
    elif weakest_mastery <= 70:
        difficulty = "Intermediate"
    else:
        difficulty = "Advanced"

    expires_at = datetime.combine(now.date() + timedelta(days=1), time.min).replace(
        tzinfo=timezone.utc
    )
    return {
        "id": f"daily-{now.date().isoformat()}",
        "title": f"{weakest_topic} Focus Sprint",
        "description": f"Complete one quiz in {weakest_topic} today to shore up your weakest area.",
        "topic": weakest_topic,
        "difficulty": difficulty,
        "xpReward": 40,
        "badgeProgress": f"{min(quiz_count, 1)}/1 quiz completed today",
        "expiresAt": expires_at.isoformat(),
        "completed": quiz_count >= 1,
    }


def build_weekly_quest_rows(metrics: dict[str, int | str | None]) -> list[dict]:
    quests = [
        {
            "id": "weekly-quizzes",
            "title": "Quiz Circuit",
            "description": "Complete three quizzes this week.",
            "xpReward": 90,
            "progress": int(metrics.get("quiz_attempts_this_week") or 0),
            "maxProgress": 3,
        },
        {
            "id": "weekly-flashcards",
            "title": "Flashcard Flow",
            "description": "Review 25 flashcards this week.",
            "xpReward": 75,
            "progress": int(metrics.get("flashcard_reviews_this_week") or 0),
            "maxProgress": 25,
        },
        {
            "id": "weekly-xp",
            "title": "XP Push",
            "description": "Earn 150 XP from study sessions this week.",
            "xpReward": 100,
            "progress": int(metrics.get("xp_this_week") or 0),
            "maxProgress": 150,
        },
    ]

    for quest in quests:
        quest["completed"] = quest["progress"] >= quest["maxProgress"]
        quest["progress"] = min(quest["progress"], quest["maxProgress"])
    return quests
