from __future__ import annotations

from typing import Annotated, Any

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
    chat_session_id: Annotated[str | None, Field(alias="chatSessionId")] = None
    top_k: Annotated[int, Field(ge=1, le=20, alias="topK")] = 10
    document_ids: Annotated[list[str] | None, Field(alias="documentIds")] = None
    mode: str = Field(default=AssistantMode.RAG, description="rag | medical_chat")


class AgentStepOut(BaseModel):
    """One agentic reasoning step returned in the /ask response."""
    model_config = ConfigDict(populate_by_name=True)

    step_index: int = Field(alias="stepIndex")
    step_type: str = Field(alias="stepType")
    input_json: dict[str, Any] | None = Field(default=None, alias="inputJson")
    output_json: dict[str, Any] | None = Field(default=None, alias="outputJson")
    elapsed_ms: int | None = Field(default=None, alias="elapsedMs")


class AssistantAskResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chat_session_id: str = Field(alias="chatSessionId")
    trace_id: str = Field(alias="traceId")
    answer: str
    confidence: int
    citations: list[AssistantCitation]
    agent_steps: list[AgentStepOut] = Field(default_factory=list, alias="agentSteps")


class AssistantSessionSummary(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    document_count: int = Field(alias="documentCount")
    topic_hints: list[str] = Field(default_factory=list, alias="topicHints")


class AssistantSessionMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    role: str
    content: str
    timestamp: str
    citations: list[AssistantCitation] = Field(default_factory=list)
    confidence: int | None = None
    trace_id: str | None = Field(default=None, alias="traceId")
    agent_steps: list[AgentStepOut] = Field(default_factory=list, alias="agentSteps")


class AssistantSessionDetail(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    messages: list[AssistantSessionMessage]
