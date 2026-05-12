from datetime import datetime, timezone


from sqlalchemy import delete, desc, select

from app.core.database import SessionLocal
from app.models import (
    Document,
    DocumentChunk,
    DocumentStatus,
    IngestionJob,
    IngestionStage,
)
from app.services.chunking import chunk_document
from app.services.embeddings import embedding_service
from app.services.extraction import extract_document_content
from app.services.milvus_index import replace_document_chunks


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def process_document_ingestion(document_id: str, job_id: str) -> None:
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        job = db.get(IngestionJob, job_id)
        if document is None or job is None:
            return

        job.started_at = utc_now()
        _update_job(db, document, job, stage=IngestionStage.EXTRACTING, progress=20)

        extracted = extract_document_content(document)
        document.extracted_text = extracted.combined_text
        document.page_count = extracted.page_count
        document.extraction_engine = extracted.extraction_engine

        _update_job(db, document, job, stage=IngestionStage.CHUNKING, progress=55)

        db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
        chunk_drafts = chunk_document(title=document.title, extracted=extracted)
        chunk_rows = [
            DocumentChunk(
                document_id=document.id,
                chunk_index=draft.chunk_index,
                chunk_type=draft.chunk_type,
                section_heading=draft.section_heading,
                page_start=draft.page_start,
                page_end=draft.page_end,
                content=draft.content,
                lexical_terms=draft.lexical_terms,
                citation_label=draft.citation_label,
                embedding_model=embedding_service.model_name,
                citation_metadata=draft.citation_metadata,
            )
            for draft in chunk_drafts
        ]
        db.add_all(chunk_rows)
        db.flush()

        _update_job(db, document, job, stage=IngestionStage.INDEXING, progress=80)

        embeddings = embedding_service.embed_texts([chunk.content for chunk in chunk_rows])
        dense_index_status = "indexed"
        try:
            replace_document_chunks(
                document_id=document.id,
                owner_user_id=document.owner_user_id or "system",
                is_shared=document.is_shared,
                chunk_rows=chunk_rows,
                embeddings=embeddings,
            )
        except Exception as exc:
            dense_index_status = f"degraded:{exc}"

        document.chunk_count = len(chunk_rows)
        document.citation_metadata = {
            **(document.citation_metadata or {}),
            "pageCount": document.page_count,
            "chunkCount": document.chunk_count,
            "extractionEngine": document.extraction_engine,
            "denseIndex": dense_index_status,
        }
        document.ingestion_error = None
        document.status = DocumentStatus.READY
        job.stage = IngestionStage.COMPLETED
        job.status = DocumentStatus.READY
        job.progress = 100
        job.completed_at = utc_now()
        db.commit()
    except Exception as exc:
        _mark_ingestion_failed(document_id=document_id, job_id=job_id, error_message=str(exc))
    finally:
        db.close()


def latest_ingestion_job(db, document_id: str) -> IngestionJob | None:
    return db.scalar(
        select(IngestionJob)
        .where(IngestionJob.document_id == document_id)
        .order_by(desc(IngestionJob.created_at))
    )


def _update_job(
    db,
    document: Document,
    job: IngestionJob,
    *,
    stage: IngestionStage,
    progress: int,
) -> None:
    document.status = DocumentStatus.PROCESSING
    job.stage = stage
    job.status = DocumentStatus.PROCESSING
    job.progress = progress
    db.commit()


def _mark_ingestion_failed(
    *,
    document_id: str,
    job_id: str,
    error_message: str,
) -> None:
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        job = db.get(IngestionJob, job_id)
        if document is None or job is None:
            return
        document.status = DocumentStatus.FAILED
        document.ingestion_error = error_message
        job.stage = IngestionStage.FAILED
        job.status = DocumentStatus.FAILED
        job.error_message = error_message
        job.completed_at = utc_now()
        db.commit()
    finally:
        db.close()
