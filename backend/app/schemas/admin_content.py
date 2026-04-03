from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import ContentStatus, DifficultyLevel


class AdminQuizOption(BaseModel):
    label: str
    text: str


class AdminQuizQuestionPayload(BaseModel):
    id: str | None = None
    prompt: str = Field(min_length=2, max_length=4000)
    options: list[AdminQuizOption] = Field(min_length=2, max_length=6)
    correct_answer: str = Field(alias="correctAnswer", min_length=1, max_length=8)
    explanation: str | None = None
    source_document: str | None = Field(default=None, alias="sourceDocument", max_length=255)
    source_page: int | None = Field(default=None, alias="sourcePage", ge=1)
    irt_difficulty: int | None = Field(default=None, alias="irtDifficulty")
    irt_discrimination: float | None = Field(default=None, alias="irtDiscrimination")
    irt_guessing: float | None = Field(default=None, alias="irtGuessing")
    order_index: int = Field(default=0, alias="orderIndex", ge=0)

    model_config = ConfigDict(populate_by_name=True)


class AdminQuizPayload(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    topic: str | None = Field(default=None, max_length=128)
    difficulty: DifficultyLevel | None = None
    estimated_minutes: int = Field(default=10, alias="estimatedMinutes", ge=1, le=180)
    status: ContentStatus = ContentStatus.DRAFT
    questions: list[AdminQuizQuestionPayload] = Field(min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class AdminQuizQuestionDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    prompt: str
    options: list[AdminQuizOption]
    correct_answer: str = Field(alias="correctAnswer")
    explanation: str | None = None
    source_document: str | None = Field(default=None, alias="sourceDocument")
    source_page: int | None = Field(default=None, alias="sourcePage")
    irt_difficulty: int | None = Field(default=None, alias="irtDifficulty")
    irt_discrimination: float | None = Field(default=None, alias="irtDiscrimination")
    irt_guessing: float | None = Field(default=None, alias="irtGuessing")
    order_index: int = Field(alias="orderIndex")


class AdminQuizSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    topic: str | None = None
    difficulty: str | None = None
    question_count: int = Field(alias="questionCount")
    status: ContentStatus
    used_by: int = Field(alias="usedBy")
    avg_score: int = Field(alias="avgScore")
    estimated_minutes: int = Field(alias="estimatedMinutes")
    last_edited_at: datetime | None = Field(default=None, alias="lastEditedAt")


class AdminQuizDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    estimated_minutes: int = Field(alias="estimatedMinutes")
    status: ContentStatus
    questions: list[AdminQuizQuestionDetail]


class AdminFlashcardPayload(BaseModel):
    id: str | None = None
    front_text: str = Field(alias="frontText", min_length=1, max_length=4000)
    back_text: str = Field(alias="backText", min_length=1, max_length=4000)
    source_document: str | None = Field(default=None, alias="sourceDocument", max_length=255)
    source_page: int | None = Field(default=None, alias="sourcePage", ge=1)
    tags: list[str] | None = Field(default=None)
    order_index: int = Field(default=0, alias="orderIndex", ge=0)

    model_config = ConfigDict(populate_by_name=True)


class AdminFlashcardDeckPayload(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    description: str | None = None
    topic: str | None = Field(default=None, max_length=128)
    status: ContentStatus = ContentStatus.DRAFT
    cards: list[AdminFlashcardPayload] = Field(min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class AdminFlashcardDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    front_text: str = Field(alias="frontText")
    back_text: str = Field(alias="backText")
    source_document: str | None = Field(default=None, alias="sourceDocument")
    source_page: int | None = Field(default=None, alias="sourcePage")
    tags: list[str] | None = None
    order_index: int = Field(alias="orderIndex")


class AdminFlashcardDeckSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    topic: str | None = None
    card_count: int = Field(alias="cardCount")
    status: ContentStatus
    used_by: int = Field(alias="usedBy")
    last_edited_at: datetime | None = Field(default=None, alias="lastEditedAt")


class AdminFlashcardDeckDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: str | None = None
    topic: str | None = None
    status: ContentStatus
    cards: list[AdminFlashcardDetail]
