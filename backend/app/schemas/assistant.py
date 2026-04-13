from pydantic import BaseModel, ConfigDict, Field


class AssistantMode(str):
    RAG = "rag"
    MEDICAL_CHAT = "medical_chat"


class AssistantCitation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_name: str = Field(alias="documentName")
    page: int
    chapter: str
    snippet: str


class AssistantAskRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(min_length=2, max_length=4000)
    chat_session_id: str | None = Field(default=None, alias="chatSessionId")
    top_k: int = Field(default=6, ge=1, le=12, alias="topK")
    document_ids: list[str] | None = Field(default=None, alias="documentIds")
    mode: str = Field(default=AssistantMode.RAG, description="rag | medical_chat")


class AssistantAskResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chat_session_id: str = Field(alias="chatSessionId")
    trace_id: str = Field(alias="traceId")
    answer: str
    confidence: int
    citations: list[AssistantCitation]


class AssistantSessionSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    document_count: int = Field(alias="documentCount")
    topic_hints: list[str] = Field(default_factory=list, alias="topicHints")
