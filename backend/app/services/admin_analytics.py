from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    AssistantTrace,
    Badge,
    ContentStatus,
    FlashcardDeck,
    FlashcardReviewEvent,
    Quiz,
    QuizAttempt,
    User,
    UserBadge,
    UserProgress,
    UserRole,
    UserStreak,
)
from app.services.progress_state import LEVEL_TITLES, compute_level


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def to_iso_date(value: datetime | None) -> str | None:
    if value is None:
        return None
    return ensure_timezone(value).date().isoformat()


def minutes_from_attempt(attempt: QuizAttempt) -> int:
    if attempt.time_taken_seconds:
        return max(1, round(attempt.time_taken_seconds / 60))
    return 10


def minutes_from_review_count(review_count: int) -> int:
    return max(1, round(review_count / 3)) if review_count > 0 else 0


def percent_change(current: int, previous: int) -> int:
    if previous <= 0:
        return 0 if current == 0 else 100
    return round(((current - previous) / previous) * 100)


def relative_time(value: datetime) -> str:
    delta = utc_now() - ensure_timezone(value)
    if delta < timedelta(minutes=1):
        return "Just now"
    if delta < timedelta(hours=1):
        minutes = max(1, round(delta.total_seconds() / 60))
        return f"{minutes} min ago"
    if delta < timedelta(days=1):
        hours = max(1, round(delta.total_seconds() / 3600))
        return f"{hours} hr ago"
    days = delta.days
    return f"{days} day ago" if days == 1 else f"{days} days ago"


def _load_core_data(db: Session) -> dict:
    students = db.scalars(
        select(User).where(User.role == UserRole.STUDENT)
    ).all()
    quizzes = db.scalars(select(Quiz)).all()
    decks = db.scalars(select(FlashcardDeck)).all()
    attempts = db.scalars(select(QuizAttempt)).all()
    review_events = db.scalars(select(FlashcardReviewEvent)).all()
    progress_rows = db.scalars(select(UserProgress)).all()
    streaks = db.scalars(select(UserStreak)).all()
    traces = db.scalars(select(AssistantTrace)).all()
    user_badges = db.scalars(select(UserBadge)).all()
    badges = db.scalars(select(Badge)).all()

    return {
        "students": students,
        "quizzes": quizzes,
        "decks": decks,
        "attempts": attempts,
        "review_events": review_events,
        "progress_rows": progress_rows,
        "streaks": streaks,
        "traces": traces,
        "user_badges": user_badges,
        "badges": badges,
    }


def build_student_snapshots(data: dict) -> list[dict]:
    attempts_by_user: dict[str, list[QuizAttempt]] = defaultdict(list)
    reviews_by_user: dict[str, list[FlashcardReviewEvent]] = defaultdict(list)
    progress_by_user: dict[str, list[UserProgress]] = defaultdict(list)
    streak_by_user = {row.user_id: row for row in data["streaks"]}

    for attempt in data["attempts"]:
        attempts_by_user[attempt.user_id].append(attempt)
    for event in data["review_events"]:
        reviews_by_user[event.user_id].append(event)
    for row in data["progress_rows"]:
        progress_by_user[row.user_id].append(row)

    snapshots: list[dict] = []
    for student in data["students"]:
        attempts = attempts_by_user.get(student.id, [])
        reviews = reviews_by_user.get(student.id, [])
        progress_rows = progress_by_user.get(student.id, [])
        streak = streak_by_user.get(student.id)

        avg_score = round(
            sum(attempt.score for attempt in attempts) / len(attempts)
        ) if attempts else 0
        weak_areas = sum(1 for row in progress_rows if (row.mastery_score or 0) < 65)
        streak_days = streak.streak_days if streak else 0
        xp = streak.xp if streak else 0
        level = compute_level(xp)

        if not student.is_active:
            status = "suspended"
        elif ensure_timezone(student.created_at).date() >= utc_now().date() - timedelta(days=7) and not attempts:
            status = "new"
        else:
            status = "active"

        if avg_score >= 80 and streak_days >= 5 and weak_areas == 0:
            risk = "thriving"
        elif avg_score < 60 or streak_days == 0 or weak_areas >= 2:
            risk = "at-risk"
        else:
            risk = "on-track"

        activity_times = [ensure_timezone(student.created_at)]
        activity_times.extend(ensure_timezone(attempt.completed_at) for attempt in attempts)
        activity_times.extend(ensure_timezone(event.created_at) for event in reviews)
        if streak and streak.last_activity_date:
            activity_times.append(ensure_timezone(streak.last_activity_date))

        total_study_time = sum(minutes_from_attempt(attempt) for attempt in attempts)
        total_study_time += minutes_from_review_count(len(reviews))

        snapshots.append(
            {
                "id": student.id,
                "name": student.full_name,
                "email": student.email,
                "level": level,
                "levelTitle": LEVEL_TITLES.get(level, "Intern"),
                "avgScore": avg_score,
                "streak": streak_days,
                "xp": xp,
                "status": status,
                "risk": risk,
                "avatarInitials": student.avatar_initials,
                "joinedAt": to_iso_date(student.created_at),
                "radiologyFocus": student.radiology_focus or [],
                "totalStudyTime": total_study_time,
                "quizzesTaken": len(attempts),
                "lastActive": max(activity_times).isoformat() if activity_times else None,
            }
        )

    snapshots.sort(key=lambda item: (item["risk"] != "at-risk", item["avgScore"], item["streak"]))
    return snapshots


def build_admin_overview(db: Session) -> dict:
    data = _load_core_data(db)
    snapshots = build_student_snapshots(data)
    now = utc_now()
    today = now.date()

    quiz_map = {quiz.id: quiz for quiz in data["quizzes"]}
    deck_map = {deck.id: deck for deck in data["decks"]}
    user_map = {user.id: user for user in data["students"]}
    badge_map = {badge.id: badge for badge in data["badges"]}

    quizzes_today = sum(1 for attempt in data["attempts"] if ensure_timezone(attempt.completed_at).date() == today)
    flashcards_today = sum(1 for event in data["review_events"] if ensure_timezone(event.created_at).date() == today)
    new_today = sum(1 for student in data["students"] if ensure_timezone(student.created_at).date() == today)

    trace_rows = [trace for trace in data["traces"] if trace.faithfulness_passed is not None]
    if trace_rows:
        ai_accuracy = round(
            100 * sum(1 for trace in trace_rows if trace.faithfulness_passed) / len(trace_rows)
        )
    else:
        ai_accuracy = 0

    activity_window_start = today - timedelta(days=29)
    activity_by_day = {
        (activity_window_start + timedelta(days=offset)).isoformat(): {
            "quizAttempts": 0,
            "flashcardReviews": 0,
            "activeStudents": set(),
        }
        for offset in range(30)
    }

    for attempt in data["attempts"]:
        day = ensure_timezone(attempt.completed_at).date().isoformat()
        if day in activity_by_day:
            activity_by_day[day]["quizAttempts"] += 1
            activity_by_day[day]["activeStudents"].add(attempt.user_id)

    for event in data["review_events"]:
        day = ensure_timezone(event.created_at).date().isoformat()
        if day in activity_by_day:
            activity_by_day[day]["flashcardReviews"] += 1
            activity_by_day[day]["activeStudents"].add(event.user_id)

    platform_activity = [
        {
            "date": day,
            "quizAttempts": values["quizAttempts"],
            "activeStudents": len(values["activeStudents"]),
            "flashcardReviews": values["flashcardReviews"],
        }
        for day, values in activity_by_day.items()
    ]

    topic_scores: dict[str, list[int]] = defaultdict(list)
    for attempt in data["attempts"]:
        quiz = quiz_map.get(attempt.quiz_id)
        topic = quiz.topic if quiz and quiz.topic else "General"
        topic_scores[topic].append(attempt.score)

    topic_performance = [
        {
            "topic": topic,
            "avgScore": round(sum(scores) / len(scores)),
            "attempts": len(scores),
        }
        for topic, scores in sorted(topic_scores.items())
    ]

    quiz_status = {"published": 0, "draft": 0, "archived": 0}
    flashcard_status = {"published": 0, "draft": 0, "archived": 0}
    for quiz in data["quizzes"]:
        quiz_status[quiz.status.value if hasattr(quiz.status, "value") else str(quiz.status)] += 1
    for deck in data["decks"]:
        flashcard_status[deck.status.value if hasattr(deck.status, "value") else str(deck.status)] += 1

    live_activity_rows = []
    for attempt in data["attempts"]:
        student = user_map.get(attempt.user_id)
        quiz = quiz_map.get(attempt.quiz_id)
        if not student:
            continue
        live_activity_rows.append(
            (
                ensure_timezone(attempt.completed_at),
                {
                    "id": f"quiz-{attempt.id}",
                    "studentName": student.full_name,
                    "action": "Completed quiz",
                    "detail": f"{quiz.title if quiz else 'Quiz'} ({attempt.score}%)",
                    "type": "success" if attempt.score >= 70 else "warning",
                },
            )
        )

    for event in data["review_events"]:
        student = user_map.get(event.user_id)
        deck = deck_map.get(event.deck_id)
        if not student:
            continue
        live_activity_rows.append(
            (
                ensure_timezone(event.created_at),
                {
                    "id": f"review-{event.id}",
                    "studentName": student.full_name,
                    "action": "Reviewed flashcards",
                    "detail": deck.title if deck else "Study deck",
                    "type": "neutral",
                },
            )
        )

    for user_badge in data["user_badges"]:
        student = user_map.get(user_badge.user_id)
        badge = badge_map.get(user_badge.badge_id)
        if not student or not badge:
            continue
        live_activity_rows.append(
            (
                ensure_timezone(user_badge.awarded_at),
                {
                    "id": f"badge-{user_badge.id}",
                    "studentName": student.full_name,
                    "action": "Badge earned",
                    "detail": badge.name,
                    "type": "achievement",
                },
            )
        )

    live_activity_rows.sort(key=lambda item: item[0], reverse=True)
    live_activity = [
        {
            **payload,
            "timestamp": relative_time(when),
        }
        for when, payload in live_activity_rows[:10]
    ]

    students_at_risk = [snapshot for snapshot in snapshots if snapshot["risk"] == "at-risk"][:5]

    return {
        "platformStats": {
            "totalStudents": len(snapshots),
            "newToday": new_today,
            "quizzesToday": quizzes_today,
            "flashcardsToday": flashcards_today,
            "aiAccuracy": ai_accuracy,
            "studentsAtRisk": len([snapshot for snapshot in snapshots if snapshot["risk"] == "at-risk"]),
        },
        "platformActivity": platform_activity,
        "liveActivity": live_activity,
        "topicPerformance": topic_performance,
        "contentStatus": {
            "quizzes": quiz_status,
            "flashcards": flashcard_status,
        },
        "studentsAtRisk": students_at_risk,
    }


def build_admin_report(db: Session) -> dict:
    data = _load_core_data(db)
    snapshots = build_student_snapshots(data)
    now = utc_now()
    today = now.date()
    current_start = today - timedelta(days=29)
    previous_start = current_start - timedelta(days=30)
    previous_end = current_start - timedelta(days=1)

    quiz_map = {quiz.id: quiz for quiz in data["quizzes"]}
    deck_map = {deck.id: deck for deck in data["decks"]}

    def in_range(value: datetime, start: date, end: date) -> bool:
        current_date = ensure_timezone(value).date()
        return start <= current_date <= end

    current_attempts = [attempt for attempt in data["attempts"] if in_range(attempt.completed_at, current_start, today)]
    previous_attempts = [attempt for attempt in data["attempts"] if in_range(attempt.completed_at, previous_start, previous_end)]
    current_reviews = [event for event in data["review_events"] if in_range(event.created_at, current_start, today)]
    previous_reviews = [event for event in data["review_events"] if in_range(event.created_at, previous_start, previous_end)]

    current_active_users = {attempt.user_id for attempt in current_attempts} | {event.user_id for event in current_reviews}
    previous_active_users = {attempt.user_id for attempt in previous_attempts} | {event.user_id for event in previous_reviews}

    current_minutes = sum(minutes_from_attempt(attempt) for attempt in current_attempts)
    current_minutes += minutes_from_review_count(len(current_reviews))
    previous_minutes = sum(minutes_from_attempt(attempt) for attempt in previous_attempts)
    previous_minutes += minutes_from_review_count(len(previous_reviews))

    current_avg_minutes = round(current_minutes / max(len(current_active_users), 1)) if current_active_users else 0
    previous_avg_minutes = round(previous_minutes / max(len(previous_active_users), 1)) if previous_active_users else 0

    current_avg_score = round(sum(attempt.score for attempt in current_attempts) / len(current_attempts)) if current_attempts else 0
    previous_avg_score = round(sum(attempt.score for attempt in previous_attempts) / len(previous_attempts)) if previous_attempts else 0

    metrics = {
        "activeStudents": {
            "value": len(current_active_users),
            "change": percent_change(len(current_active_users), len(previous_active_users)),
        },
        "quizCompletions": {
            "value": len(current_attempts),
            "change": percent_change(len(current_attempts), len(previous_attempts)),
        },
        "avgStudyTimeMinutes": {
            "value": current_avg_minutes,
            "change": percent_change(current_avg_minutes, previous_avg_minutes),
        },
        "avgQuizScore": {
            "value": current_avg_score,
            "change": percent_change(current_avg_score, previous_avg_score),
        },
    }

    engagement_data = []
    for offset in range(5, -1, -1):
        month_anchor = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        month_start = (month_anchor.replace(day=1) - timedelta(days=offset * 32)).replace(day=1)
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
        activity_users = set()

        for attempt in data["attempts"]:
            completed_at = ensure_timezone(attempt.completed_at)
            if month_start <= completed_at < next_month:
                activity_users.add(attempt.user_id)
        for event in data["review_events"]:
            created_at = ensure_timezone(event.created_at)
            if month_start <= created_at < next_month:
                activity_users.add(event.user_id)

        new_users = sum(
            1
            for student in data["students"]
            if month_start <= ensure_timezone(student.created_at) < next_month
        )
        engagement_data.append(
            {
                "date": month_start.strftime("%b"),
                "activeUsers": len(activity_users),
                "newUsers": new_users,
                "returningUsers": max(0, len(activity_users) - new_users),
            }
        )

    content_usage_by_topic: dict[str, dict[str, int]] = defaultdict(
        lambda: {"quizzes": 0, "flashcards": 0}
    )
    for attempt in current_attempts:
        quiz = quiz_map.get(attempt.quiz_id)
        topic = quiz.topic if quiz and quiz.topic else "General"
        content_usage_by_topic[topic]["quizzes"] += 1
    for event in current_reviews:
        deck = deck_map.get(event.deck_id)
        topic = deck.topic if deck and deck.topic else "General"
        content_usage_by_topic[topic]["flashcards"] += 1
    content_usage = [
        {"name": topic, **values}
        for topic, values in sorted(content_usage_by_topic.items())
    ]

    ai_metrics = []
    trace_rows = data["traces"]
    for index in range(6, 0, -1):
        week_start = today - timedelta(days=today.weekday() + (index - 1) * 7)
        week_end = week_start + timedelta(days=6)
        weekly_traces = [
            trace
            for trace in trace_rows
            if in_range(trace.created_at, week_start, week_end)
        ]
        faithful = [trace for trace in weekly_traces if trace.faithfulness_passed is not None]
        accuracy = round(
            100 * sum(1 for trace in faithful if trace.faithfulness_passed) / len(faithful)
        ) if faithful else 0
        ai_metrics.append(
            {
                "date": f"W{7 - index}",
                "accuracy": accuracy,
                "usage": len(weekly_traces),
            }
        )

    student_distribution = [
        {
            "name": "Thriving",
            "value": len([snapshot for snapshot in snapshots if snapshot["risk"] == "thriving"]),
            "color": "#22C55E",
        },
        {
            "name": "On Track",
            "value": len([snapshot for snapshot in snapshots if snapshot["risk"] == "on-track"]),
            "color": "#00C2FF",
        },
        {
            "name": "At Risk",
            "value": len([snapshot for snapshot in snapshots if snapshot["risk"] == "at-risk"]),
            "color": "#EF4444",
        },
    ]

    retention_counts = []
    for index in range(8, 0, -1):
        week_start = today - timedelta(days=today.weekday() + (index - 1) * 7)
        week_end = week_start + timedelta(days=6)
        active_users = {
            attempt.user_id
            for attempt in data["attempts"]
            if in_range(attempt.completed_at, week_start, week_end)
        } | {
            event.user_id
            for event in data["review_events"]
            if in_range(event.created_at, week_start, week_end)
        }
        retention_counts.append(len(active_users))

    baseline = retention_counts[0] if retention_counts and retention_counts[0] > 0 else max(retention_counts or [1])
    retention_data = [
        {
            "week": f"Week {index + 1}",
            "rate": round((count / max(baseline, 1)) * 100) if count else 0,
        }
        for index, count in enumerate(retention_counts)
    ]

    top_quiz_rows = []
    attempts_by_quiz: dict[str, list[QuizAttempt]] = defaultdict(list)
    current_attempts_by_quiz: dict[str, list[QuizAttempt]] = defaultdict(list)
    previous_attempts_by_quiz: dict[str, list[QuizAttempt]] = defaultdict(list)
    for attempt in data["attempts"]:
        attempts_by_quiz[attempt.quiz_id].append(attempt)
    for attempt in current_attempts:
        current_attempts_by_quiz[attempt.quiz_id].append(attempt)
    for attempt in previous_attempts:
        previous_attempts_by_quiz[attempt.quiz_id].append(attempt)

    for quiz_id, attempts in attempts_by_quiz.items():
        quiz = quiz_map.get(quiz_id)
        if not quiz:
            continue
        top_quiz_rows.append(
            {
                "title": quiz.title,
                "attempts": len(attempts),
                "avgScore": round(sum(item.score for item in attempts) / len(attempts)),
                "trend": "up"
                if len(current_attempts_by_quiz.get(quiz_id, []))
                >= len(previous_attempts_by_quiz.get(quiz_id, []))
                else "down",
            }
        )
    top_quiz_rows.sort(key=lambda item: item["attempts"], reverse=True)

    return {
        "metrics": metrics,
        "engagementData": engagement_data,
        "contentUsage": content_usage,
        "aiMetrics": ai_metrics,
        "studentDistribution": student_distribution,
        "retentionData": retention_data,
        "topQuizzes": top_quiz_rows[:5],
    }
