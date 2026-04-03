from pydantic import BaseModel, Field
from typing import Optional


# ─── Quiz schemas ────────────────────────────────────────────────────────────

class QuizOptionOut(BaseModel):
    label: str
    text: str


class QuizQuestionOut(BaseModel):
    id: str
    questionText: str
    options: list[QuizOptionOut]
    correctAnswer: str
    explanation: Optional[str] = None
    sourceDocument: Optional[str] = None
    sourcePage: Optional[int] = None

    class Config:
        from_attributes = True


class QuizOut(BaseModel):
    id: str
    title: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    questionCount: int
    estimatedMinutes: int
    bestScore: Optional[int] = None
    attempts: int = 0
    isNew: bool = False

    class Config:
        from_attributes = True


class QuizDetailOut(BaseModel):
    id: str
    title: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    estimatedMinutes: int
    questions: list[QuizQuestionOut]

    class Config:
        from_attributes = True


class QuizSubmitAnswer(BaseModel):
    questionId: str
    selectedAnswer: str  # "A"|"B"|"C"|"D"


class QuizSubmitRequest(BaseModel):
    answers: list[QuizSubmitAnswer]
    timeTakenSeconds: Optional[int] = None


class QuizSubmitResult(BaseModel):
    attemptId: str
    score: int
    correct: int
    total: int
    xpEarned: int
    questions: list[QuizQuestionOut]  # with correct answers exposed


class QuizAttemptOut(BaseModel):
    id: str
    score: int
    correctCount: int
    totalCount: int
    xpEarned: int
    completedAt: str

    class Config:
        from_attributes = True


# ─── Flashcard schemas ───────────────────────────────────────────────────────

class FlashcardOut(BaseModel):
    id: str
    deckId: str
    front: str
    back: str
    sourceDocument: Optional[str] = None
    sourcePage: Optional[int] = None
    difficulty: str = "good"   # last rating or default
    nextReviewDate: Optional[str] = None
    reviewCount: int = 0

    class Config:
        from_attributes = True


class FlashcardDeckOut(BaseModel):
    id: str
    title: str
    topic: Optional[str] = None
    totalCards: int
    dueCards: int
    masteredCards: int
    lastStudied: Optional[str] = None

    class Config:
        from_attributes = True


class FlashcardDeckDetailOut(BaseModel):
    id: str
    title: str
    topic: Optional[str] = None
    totalCards: int
    dueCards: int
    masteredCards: int
    cards: list[FlashcardOut]

    class Config:
        from_attributes = True


class FlashcardReviewRequest(BaseModel):
    cardId: str
    rating: str  # "again"|"hard"|"good"|"easy"


class FlashcardReviewResponse(BaseModel):
    cardId: str
    rating: str
    nextReviewDate: str
    intervalDays: int
    easeFactor: float


# ─── Progress schemas ────────────────────────────────────────────────────────

class TopicMasteryOut(BaseModel):
    topic: str
    mastery: int  # 0–100
    quizzes: int
    flashcardsTotal: int
    flashcardsDone: int


class RecentQuizOut(BaseModel):
    title: str
    score: int
    daysAgo: int


class DashboardStatsOut(BaseModel):
    streakDays: int
    xp: int
    level: int
    levelTitle: str
    xpToNextLevel: int
    avgQuizScore: int
    totalDueCards: int
    topicMastery: list[TopicMasteryOut]
    recentQuizzes: list[RecentQuizOut]
