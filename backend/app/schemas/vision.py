from pydantic import BaseModel, ConfigDict, Field

from app.schemas.assistant import AssistantCitation


class VisionCaptionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    caption: str
    provider: str
    model: str


class VisionVqaRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(min_length=2, max_length=2000)
    include_text_evidence: bool = Field(default=True, alias="includeTextEvidence")
    top_k: int = Field(default=4, ge=1, le=10, alias="topK")


class VisionAnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(
        default="Describe the key findings in this medical image.",
        min_length=2,
        max_length=2000,
    )
    include_text_evidence: bool = Field(default=True, alias="includeTextEvidence")
    top_k: int = Field(default=4, ge=1, le=10, alias="topK")


class VisionVqaResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    answer: str
    provider: str
    model: str
    citations: list[AssistantCitation] = []


class VisionGradcamResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    heatmap_data_url: str = Field(alias="heatmapDataUrl")


class VisionAnalyzeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    caption: str
    heatmap_data_url: str = Field(alias="heatmapDataUrl")
    vqa_answer: str | None = Field(default=None, alias="vqaAnswer")
    citations: list[AssistantCitation] = []


class VisionTraceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str = Field(alias="userId")
    document_id: str = Field(alias="documentId")
    action: str
    request_json: dict | None = Field(default=None, alias="request")
    response_json: dict | None = Field(default=None, alias="response")
    created_at: str = Field(alias="createdAt")


# VisionSearch models remain (lightweight), but no image embeddings are used.
from app.schemas.documents import DocumentChunkHit


class VisionSearchRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    query: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=6, ge=1, le=20, alias="topK")
    include_image_previews: bool = Field(default=False, alias="includeImagePreviews")


class VisionSearchImageResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    document_id: str = Field(alias="documentId")
    document_name: str = Field(alias="documentName")
    score: float
    preview_data_url: str | None = Field(default=None, alias="previewDataUrl")


class VisionSearchResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text_hits: list[DocumentChunkHit] = Field(alias="textHits")
    image_results: list[VisionSearchImageResult] = Field(alias="imageResults")
