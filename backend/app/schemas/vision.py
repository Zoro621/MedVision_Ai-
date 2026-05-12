from typing import Annotated

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
    include_text_evidence: Annotated[bool, Field(alias="includeTextEvidence")] = True
    top_k: Annotated[int, Field(ge=1, le=10, alias="topK")] = 4


class VisionAnalyzeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(
        default="Describe the key findings in this medical image.",
        min_length=2,
        max_length=2000,
    )
    include_text_evidence: Annotated[bool, Field(alias="includeTextEvidence")] = True
    top_k: Annotated[int, Field(ge=1, le=10, alias="topK")] = 4
    include_lime: Annotated[bool, Field(alias="includeLime")] = False
    include_shap: Annotated[bool, Field(alias="includeShap")] = False
    include_attention: Annotated[bool, Field(alias="includeAttention")] = False


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
    overlay_data_url: str | None = Field(default=None, alias="overlayDataUrl")
    method: str = Field(default="proxy")
    region_bboxes: list[dict] = Field(default_factory=list, alias="regionBboxes")


# ── LIME ──────────────────────────────────────────────────────────────────────
class VisionLimeSuperpixel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    importance: float
    positive: bool
    bbox: dict


class VisionLimeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    overlay_data_url: str = Field(alias="overlayDataUrl")
    superpixels: list[VisionLimeSuperpixel] = []
    num_samples: int = Field(alias="numSamples")
    method: str


# ── SHAP ──────────────────────────────────────────────────────────────────────
class VisionShapResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    overlay_data_url: str = Field(alias="overlayDataUrl")
    top_pixels: list[dict] = Field(default_factory=list, alias="topPixels")
    explanation: str
    method: str


# ── Attention + Linker ────────────────────────────────────────────────────────
class VisionAttentionToken(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    token: str
    heatmap_data_url: str = Field(alias="heatmapDataUrl")
    importance: float


class VisionExplanationLink(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    region_bbox: dict = Field(alias="regionBbox")
    region_label: str = Field(alias="regionLabel")
    chunk_id: str = Field(alias="chunkId")
    chunk_snippet: str = Field(alias="chunkSnippet")
    citation: str
    similarity: float


class VisionAttentionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    token_heatmaps: list[VisionAttentionToken] = Field(alias="tokenHeatmaps")
    explanation_links: list[VisionExplanationLink] = Field(alias="explanationLinks")
    method: str


# ── Combined analyze ──────────────────────────────────────────────────────────
class VisionAnalyzeResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    trace_id: str = Field(alias="traceId")
    document_id: str = Field(alias="documentId")
    caption: str
    heatmap_data_url: str = Field(alias="heatmapDataUrl")
    overlay_data_url: str | None = Field(default=None, alias="overlayDataUrl")
    gradcam_method: str = Field(default="proxy", alias="gradcamMethod")
    region_bboxes: list[dict] = Field(default_factory=list, alias="regionBboxes")
    vqa_answer: str | None = Field(default=None, alias="vqaAnswer")
    citations: list[AssistantCitation] = []
    # Optional — only populated when requested
    lime: "VisionLimeResponse | None" = None
    shap: "VisionShapResponse | None" = None
    attention: "VisionAttentionResponse | None" = None


class VisionTraceResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    user_id: str = Field(alias="userId")
    document_id: str = Field(alias="documentId")
    action: str
    request_json: dict | None = Field(default=None, alias="request")
    response_json: dict | None = Field(default=None, alias="response")
    created_at: str = Field(alias="createdAt")


# ── Search ────────────────────────────────────────────────────────────────────
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
