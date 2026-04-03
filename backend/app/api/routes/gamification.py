from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas.gamification import GamificationSummaryOut
from app.services.gamification import (
    build_achievement_rows,
    build_daily_challenge_row,
    build_leaderboard_rows,
    build_weekly_quest_rows,
    sync_user_gamification,
)

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/summary", response_model=GamificationSummaryOut)
def get_gamification_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> GamificationSummaryOut:
    metrics = sync_user_gamification(db, user.id)
    db.commit()

    return GamificationSummaryOut(
        achievements=build_achievement_rows(db, user.id),
        leaderboard=build_leaderboard_rows(db, user.id),
        dailyChallenge=build_daily_challenge_row(metrics),
        weeklyQuests=build_weekly_quest_rows(metrics),
    )
