from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class QuizOptionOut(BaseModel):
    label: str
    text: str


class QuizQuestionOut(BaseModel):
    id: str
    questionText: str
    options: list[QuizOptionOut]
    correctAnswer: str
    explanation: Optional[str] = None
    topic: Optional[str] = None
    difficultyLevel: Optional[int] = None
    sourceDocument: Optional[str] = None
    sourcePage: Optional[int] = None

    class Config:
        from_attributes = True


class QuizOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    questionCount: int
    estimatedMinutes: int
    bestScore: Optional[int] = None
    attempts: int = 0
    isNew: bool = False

    class Config:
        from_attributes = True


class QuizDetailOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    estimatedMinutes: int
    questions: list[QuizQuestionOut]

    class Config:
        from_attributes = True


class QuizSubmitAnswer(BaseModel):
    questionId: str
    selectedAnswer: str


class QuizSubmitRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    answers: list[QuizSubmitAnswer]
    timeTakenSeconds: Optional[int] = None
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")


class QuizSubmitResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    attemptId: str
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
    score: int
    correct: int
    total: int
    xpEarned: int
    wrongTopics: list[str] = []
    questions: list[QuizQuestionOut]


class QuizAttemptOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
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
    model_config = ConfigDict(populate_by_name=True)

    id: str
    quizId: str
    quizTitle: str
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
    score: int
    correctCount: int
    totalCount: int
    xpEarned: int
    timeTakenSeconds: Optional[int] = None
    completedAt: str
    wrongTopics: list[str] = []
    questions: list[QuizAttemptQuestionOut]


class FlashcardOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    deckId: str
    front: str
    back: str
    topic: Optional[str] = None
    difficultyLevel: Optional[int] = None
    sourceDocument: Optional[str] = None
    sourcePage: Optional[int] = None
    difficulty: str = "good"
    nextReviewDate: Optional[str] = None
    reviewCount: int = 0

    class Config:
        from_attributes = True


class FlashcardDeckOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    topic: Optional[str] = None
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    totalCards: int
    dueCards: int
    masteredCards: int
    lastStudied: Optional[str] = None

    class Config:
        from_attributes = True


class FlashcardDeckDetailOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    topic: Optional[str] = None
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")
    document_id: Optional[str] = Field(default=None, alias="documentId")
    totalCards: int
    dueCards: int
    masteredCards: int
    cards: list[FlashcardOut]

    class Config:
        from_attributes = True


class FlashcardReviewRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    cardId: str
    rating: str
    chat_session_id: Optional[str] = Field(default=None, alias="chatSessionId")


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


class ChatAreasToReviewOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chat_session_id: str = Field(alias="chatSessionId")
    title: str
    updated_at: str = Field(alias="updatedAt")
    weak_topics: list[WeakAreaOut] = Field(alias="weakTopics")


class StudyActivityOut(BaseModel):
    date: str
    quizzes: int
    flashcards: int
    minutes: int


class DashboardStatsOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

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
    areas_to_review_by_chat: list[ChatAreasToReviewOut] = Field(
        default_factory=list,
        alias="areasToReviewByChat",
    )
    studyActivity: list[StudyActivityOut]


class QuizGenerationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chat_session_id: str = Field(alias="chatSessionId", min_length=1)
    count: int = Field(default=5, ge=1, le=15)


class FlashcardGenerationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chat_session_id: str = Field(alias="chatSessionId", min_length=1)
    count: int = Field(default=8, ge=1, le=20)
