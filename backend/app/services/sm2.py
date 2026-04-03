"""
SM-2 Spaced Repetition Algorithm
Rating scale: 0=again, 1=hard, 2=good, 3=easy  (mapped from frontend 1-4)
"""
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class SM2State:
    ease_factor: float      # Starting at 2.5, min 1.3
    interval: int           # Days until next review
    repetitions: int        # Successful reviews in a row
    next_review_date: date  # When to show again


def initial_state() -> SM2State:
    return SM2State(
        ease_factor=2.5,
        interval=1,
        repetitions=0,
        next_review_date=date.today(),
    )


def update_sm2(state: SM2State, rating: int) -> SM2State:
    """
    rating: 0=again, 1=hard, 2=good, 3=easy
    Returns updated SM-2 state.
    """
    ef = state.ease_factor
    reps = state.repetitions
    interval = state.interval

    if rating < 2:  # again or hard — reset
        reps = 0
        interval = 1
        if rating == 1:  # hard but not again
            interval = max(1, round(interval * 1.2))
    else:  # good or easy
        if reps == 0:
            interval = 1
        elif reps == 1:
            interval = 6
        else:
            interval = round(interval * ef)
        reps += 1

    # Update ease factor
    # q = rating mapped to SM-2 quality (0-5)
    q = {0: 0, 1: 2, 2: 4, 3: 5}[rating]
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef = max(1.3, ef)

    if rating == 3:  # easy bonus
        interval = round(interval * 1.3)

    next_review = date.today() + timedelta(days=interval)

    return SM2State(
        ease_factor=round(ef, 4),
        interval=interval,
        repetitions=reps,
        next_review_date=next_review,
    )


def rating_label_to_int(label: str) -> int:
    """Convert frontend rating string to SM-2 int."""
    return {"again": 0, "hard": 1, "good": 2, "easy": 3}.get(label, 2)
