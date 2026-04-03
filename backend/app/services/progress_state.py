from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import UserStreak

LEVEL_XP = {1: 500, 2: 1000, 3: 2000, 4: 3000, 5: 5000, 6: 8000}
LEVEL_TITLES = {
    1: "Intern",
    2: "Junior Resident",
    3: "Senior Resident",
    4: "Fellow",
    5: "Attending",
    6: "Radiologist",
}


def compute_level(xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_XP.items()):
        if xp >= threshold:
            level = lvl
    return level


def xp_to_next_level(xp: int, level: int) -> int:
    return max(0, LEVEL_XP.get(level + 1, LEVEL_XP[6]) - xp)


def get_or_create_streak(db: Session, user_id: str) -> UserStreak:
    streak = db.scalars(
        select(UserStreak).where(UserStreak.user_id == user_id)
    ).first()
    if streak is None:
        streak = UserStreak(user_id=user_id, xp=0, level=1, streak_days=0, longest_streak=0)
        db.add(streak)
        db.flush()
    return streak


def record_learning_activity(
    *,
    db: Session,
    user_id: str,
    xp_earned: int,
    activity_at: datetime | None = None,
) -> UserStreak:
    streak = get_or_create_streak(db, user_id)
    activity_time = activity_at or datetime.now(timezone.utc)
    activity_date = activity_time.date()
    last_activity_date = streak.last_activity_date.date() if streak.last_activity_date else None

    if last_activity_date is None:
        streak.streak_days = 1
    elif activity_date == last_activity_date:
        # Same-day activity preserves the current streak.
        streak.streak_days = max(streak.streak_days, 1)
    elif activity_date == last_activity_date + timedelta(days=1):
        streak.streak_days += 1
    else:
        streak.streak_days = 1

    streak.longest_streak = max(streak.longest_streak, streak.streak_days)
    streak.last_activity_date = datetime.combine(
        activity_date,
        datetime.min.time(),
    ).replace(tzinfo=timezone.utc)
    streak.xp = (streak.xp or 0) + xp_earned
    streak.level = compute_level(streak.xp)
    return streak
