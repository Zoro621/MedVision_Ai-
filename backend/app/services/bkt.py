"""
Bayesian Knowledge Tracing (BKT) — simplified single-skill model.
Updates mastery probability for a given topic after a quiz attempt.

Parameters (defaults based on educational literature for medical MCQ):
  p_learn  = 0.20  (probability of learning if not mastered)
  p_forget = 0.05  (probability of forgetting if mastered)
  p_slip   = 0.10  (probability of error despite mastery)
  p_guess  = 0.25  (probability of correct answer without mastery)
"""

_P_LEARN = 0.20
_P_FORGET = 0.05
_P_SLIP = 0.10
_P_GUESS = 0.25


def update_mastery(
    prior_mastery: float,
    is_correct: bool,
    p_learn: float = _P_LEARN,
    p_forget: float = _P_FORGET,
    p_slip: float = _P_SLIP,
    p_guess: float = _P_GUESS,
) -> float:
    """
    Given the prior mastery probability and whether the student answered correctly,
    return the updated posterior mastery probability (0.0–1.0).
    Also applies a learning step.
    """
    # Step 1: Observation update (Bayesian update)
    if is_correct:
        p_correct_mastered = 1.0 - p_slip
        p_correct_unmastered = p_guess
    else:
        p_correct_mastered = p_slip
        p_correct_unmastered = 1.0 - p_guess

    numerator = p_correct_mastered * prior_mastery
    denominator = numerator + p_correct_unmastered * (1.0 - prior_mastery)

    if denominator == 0.0:
        posterior = prior_mastery
    else:
        posterior = numerator / denominator

    # Step 2: Learning step (probability of mastery after this question)
    updated = posterior + (1.0 - posterior) * p_learn

    # Clamp to valid range
    return max(0.0, min(1.0, updated))


def batch_update_mastery(
    prior_mastery: float,
    correct_count: int,
    total_count: int,
) -> float:
    """
    Convenience: apply BKT updates for `correct_count` correct and
    `(total_count - correct_count)` incorrect answers sequentially.
    """
    mastery = prior_mastery
    for i in range(total_count):
        is_correct = i < correct_count
        mastery = update_mastery(mastery, is_correct)
    return mastery


def mastery_to_score(mastery: float) -> int:
    """Convert [0,1] mastery probability to integer percentage (0–100)."""
    return round(mastery * 100)
