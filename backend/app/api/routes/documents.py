from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models import Document, DocumentChunk, DocumentStatus, IngestionJob, IngestionStage, User, UserRole
from app.schemas.documents import (
    DocumentChunkResponse,
    DocumentListResponse,
    DocumentSearchRequest,
    DocumentSearchResponse,
    DocumentSummary,
)
from app.services.ingestion import latest_ingestion_job, process_document_ingestion
from app.services.retrieval import search_document_chunks
from app.services.storage import resolve_storage_path, save_upload_file

router = APIRouter(prefix="/documents", tags=["documents"])
settings = get_settings()


@router.post("/upload", response_model=DocumentSummary, status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    is_shared: bool = Form(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentSummary:
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required.")

    document_id = str(uuid4())
    stored_file = await save_upload_file(
        upload=file,
        owner_user_id=user.id,
        document_id=document_id,
    )
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if stored_file.file_size_bytes > max_bytes:
        Path(stored_file.path).unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.max_upload_size_mb} MB limit.",
        )

    document = Document(
        id=document_id,
        owner_user_id=user.id,
        title=stored_file.title,
        file_name=stored_file.file_name,
        mime_type=stored_file.mime_type,
        file_type=Path(stored_file.file_name).suffix.lstrip(".").lower() or stored_file.kind.value,
        kind=stored_file.kind,
        storage_path=stored_file.path,
        file_size_bytes=stored_file.file_size_bytes,
        checksum_sha256=stored_file.checksum_sha256,
        status=DocumentStatus.PENDING,
        is_shared=is_shared and user.role == UserRole.ADMIN,
        citation_metadata=stored_file.storage_metadata,
    )
    db.add(document)
    db.flush()

    job = IngestionJob(
        document_id=document.id,
        stage=IngestionStage.UPLOADED,
        status=DocumentStatus.PENDING,
        progress=5,
        metadata_json={"source": "upload"},
    )
    db.add(job)
    db.commit()
    db.refresh(document)
    db.refresh(job)

    background_tasks.add_task(process_document_ingestion, document.id, job.id)
    return _serialize_document(document=document, job=job)


@router.get("", response_model=DocumentListResponse)
def list_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentListResponse:
    documents = db.scalars(select(Document).order_by(Document.created_at.desc())).all()
    visible_documents = [
        document
        for document in documents
        if user.role == UserRole.ADMIN
        or document.owner_user_id == user.id
        or document.is_shared
    ]
    return DocumentListResponse(
        documents=[
            _serialize_document(document=document, job=latest_ingestion_job(db, document.id))
            for document in visible_documents
        ]
    )


@router.get("/{document_id}/chunks", response_model=list[DocumentChunkResponse])
def get_document_chunks(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[DocumentChunkResponse]:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    chunks = db.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document.id)
        .order_by(DocumentChunk.chunk_index.asc())
    ).all()
    return [
        DocumentChunkResponse(
            chunk_id=chunk.id,
            chunk_index=chunk.chunk_index,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            section_heading=chunk.section_heading,
            content=chunk.content,
            citation_label=chunk.citation_label,
        )
        for chunk in chunks
    ]


@router.post("/search", response_model=DocumentSearchResponse)
def search_documents(
    payload: DocumentSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> DocumentSearchResponse:
    hits = search_document_chunks(
        db=db,
        user=user,
        query=payload.query,
        top_k=payload.top_k,
        document_ids=payload.document_ids,
    )
    return DocumentSearchResponse(
        hits=hits,
        total_hits=len(hits),
        retrieval_mode="hybrid_dense_bm25",
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Response:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if user.role != UserRole.ADMIN and document.owner_user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own documents.")

    if document.storage_path:
        resolve_storage_path(document.storage_path).unlink(missing_ok=True)

    db.delete(document)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _get_visible_document(*, db: Session, user: User, document_id: str) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if (
        user.role != UserRole.ADMIN
        and document.owner_user_id != user.id
        and not document.is_shared
    ):
        raise HTTPException(status_code=403, detail="Access denied.")
    return document


def _serialize_document(document: Document, job: IngestionJob | None) -> DocumentSummary:
    return DocumentSummary(
        id=document.id,
        title=document.title,
        file_name=document.file_name,
        mime_type=document.mime_type,
        file_type=document.file_type,
        kind=document.kind,
        status=document.status,
        file_size_bytes=document.file_size_bytes,
        page_count=document.page_count,
        chunk_count=document.chunk_count,
        is_shared=document.is_shared,
        created_at=document.created_at,
        updated_at=document.updated_at,
        ingestion_stage=job.stage if job else None,
        ingestion_progress=job.progress if job else None,
        ingestion_error=document.ingestion_error,
    )
