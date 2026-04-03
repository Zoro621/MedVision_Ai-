from typing import Optional

from pydantic import BaseModel


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
    selectedAnswer: str


class QuizSubmitRequest(BaseModel):
    answers: list[QuizSubmitAnswer]
    timeTakenSeconds: Optional[int] = None


class QuizSubmitResult(BaseModel):
    attemptId: str
    score: int
    correct: int
    total: int
    xpEarned: int
    questions: list[QuizQuestionOut]


class QuizAttemptOut(BaseModel):
    id: str
    score: int
    correctCount: int
    totalCount: int
    xpEarned: int
    completedAt: str

    class Config:
        from_attributes = True


class QuizAttemptQuestionOut(BaseModel):
    questionId: str
    questionText: str
    options: list[QuizOptionOut]
    selectedAnswer: Optional[str] = None
    correctAnswer: str
    isCorrect: bool
    explanation: Optional[str] = None
    sourceDocument: Optional[str] = None
    sourcePage: Optional[int] = None


class QuizAttemptDetailOut(BaseModel):
    id: str
    quizId: str
    quizTitle: str
    score: int
    correctCount: int
    totalCount: int
    xpEarned: int
    timeTakenSeconds: Optional[int] = None
    completedAt: str
    questions: list[QuizAttemptQuestionOut]


class FlashcardOut(BaseModel):
    id: str
    deckId: str
    front: str
    back: str
    sourceDocument: Optional[str] = None
    sourcePage: Optional[int] = None
    difficulty: str = "good"
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
    rating: str


class FlashcardReviewResponse(BaseModel):
    cardId: str
    rating: str
    nextReviewDate: str
    intervalDays: int
    easeFactor: float
    xpEarned: int


class TopicMasteryOut(BaseModel):
    topic: str
    mastery: int
    quizzes: int
    flashcardsTotal: int
    flashcardsDone: int
    weakAreaScore: int = 0


class RecentQuizOut(BaseModel):
    title: str
    score: int
    daysAgo: int


class WeakAreaOut(BaseModel):
    topic: str
    mastery: int
    weakAreaScore: int


class StudyActivityOut(BaseModel):
    date: str
    quizzes: int
    flashcards: int
    minutes: int


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
    weakAreas: list[WeakAreaOut]
    studyActivity: list[StudyActivityOut]
