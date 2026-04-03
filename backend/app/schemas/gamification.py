from typing import Optional

from pydantic import BaseModel


class AchievementOut(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    tier: str
    unlockedAt: Optional[str] = None
    progress: int
    maxProgress: int
    category: str
    xpReward: int


class LeaderboardEntryOut(BaseModel):
    rank: int
    name: str
    xp: int
    streak: int
    level: int
    isCurrentUser: bool = False


class DailyChallengeOut(BaseModel):
    id: str
    title: str
    description: str
    topic: str
    difficulty: str
    xpReward: int
    badgeProgress: Optional[str] = None
    expiresAt: str
    completed: bool


class WeeklyQuestOut(BaseModel):
    id: str
    title: str
    description: str
    xpReward: int
    progress: int
    maxProgress: int
    completed: bool


class GamificationSummaryOut(BaseModel):
    achievements: list[AchievementOut]
    leaderboard: list[LeaderboardEntryOut]
    dailyChallenge: DailyChallengeOut
    weeklyQuests: list[WeeklyQuestOut]
