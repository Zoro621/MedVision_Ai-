from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import DocumentKind, DocumentStatus, IngestionStage


class DocumentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    title: str
    file_name: str = Field(serialization_alias="fileName")
    mime_type: str | None = Field(default=None, serialization_alias="mimeType")
    file_type: str = Field(serialization_alias="fileType")
    kind: DocumentKind
    status: DocumentStatus
    file_size_bytes: int | None = Field(default=None, serialization_alias="fileSizeBytes")
    page_count: int | None = Field(default=None, serialization_alias="pageCount")
    chunk_count: int = Field(serialization_alias="chunkCount")
    is_shared: bool = Field(serialization_alias="isShared")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")
    ingestion_stage: IngestionStage | None = Field(
        default=None,
        serialization_alias="ingestionStage",
    )
    ingestion_progress: int | None = Field(
        default=None,
        serialization_alias="ingestionProgress",
    )
    ingestion_error: str | None = Field(
        default=None,
        serialization_alias="ingestionError",
    )


class DocumentChunkCitation(BaseModel):
    document_id: str = Field(serialization_alias="documentId")
    document_name: str = Field(serialization_alias="documentName")
    page_start: int = Field(serialization_alias="pageStart")
    page_end: int = Field(serialization_alias="pageEnd")
    section_heading: str | None = Field(default=None, serialization_alias="sectionHeading")
    citation_label: str = Field(serialization_alias="citationLabel")


class DocumentChunkHit(BaseModel):
    chunk_id: str = Field(serialization_alias="chunkId")
    document_id: str = Field(serialization_alias="documentId")
    document_name: str = Field(serialization_alias="documentName")
    page_start: int = Field(serialization_alias="pageStart")
    page_end: int = Field(serialization_alias="pageEnd")
    score: float
    dense_score: float = Field(serialization_alias="denseScore")
    lexical_score: float = Field(serialization_alias="lexicalScore")
    snippet: str
    content: str = ""  # full chunk text (used by reranker & explainability linker)
    section_heading: str | None = Field(default=None, serialization_alias="sectionHeading")
    parent_heading: str | None = Field(default=None, serialization_alias="parentHeading")
    citation: DocumentChunkCitation


class DocumentSearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20, validation_alias="topK")
    document_ids: list[str] | None = Field(
        default=None,
        validation_alias="documentIds",
    )


class DocumentSearchResponse(BaseModel):
    hits: list[DocumentChunkHit]
    total_hits: int = Field(serialization_alias="totalHits")
    retrieval_mode: str = Field(serialization_alias="retrievalMode")


class DocumentChunkResponse(BaseModel):
    chunk_id: str = Field(serialization_alias="chunkId")
    chunk_index: int = Field(serialization_alias="chunkIndex")
    page_start: int = Field(serialization_alias="pageStart")
    page_end: int = Field(serialization_alias="pageEnd")
    section_heading: str | None = Field(default=None, serialization_alias="sectionHeading")
    content: str
    citation_label: str = Field(serialization_alias="citationLabel")


class DocumentListResponse(BaseModel):
    documents: list[DocumentSummary]

