import time
import urllib.error
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Document, DocumentChunk, DocumentKind, VisionArtifact, VisionTrace, User, UserRole
from app.schemas.assistant import AssistantCitation
from app.schemas.vision import (
    VisionAnalyzeResponse,
    VisionAnalyzeRequest,
    VisionCaptionResponse,
    VisionGradcamResponse,
    VisionSearchImageResult,
    VisionSearchRequest,
    VisionSearchResponse,
    VisionTraceResponse,
    VisionVqaRequest,
    VisionVqaResponse,
)
from app.services.gradcam import generate_gradcam_heatmap_png
from app.services.embeddings import embedding_service, tokenize_text
from app.services.milvus_index import upsert_chunks
from app.services.retrieval import search_document_chunks
from app.services.storage import resolve_storage_path, save_artifact_bytes
from app.services.vision_io import load_document_image, pil_to_png_bytes, png_bytes_to_data_url
from app.services.vision_llm import caption_image, vqa_image

router = APIRouter(prefix="/vision", tags=["vision"])


def _get_visible_document(*, db: Session, user: User, document_id: str) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if user.role != UserRole.ADMIN and document.owner_user_id != user.id and not document.is_shared:
        raise HTTPException(status_code=403, detail="Access denied.")
    return document


@router.post("/documents/{document_id}/caption", response_model=VisionCaptionResponse)
def generate_caption(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionCaptionResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="Vision captioning only supports image/DICOM documents.")

    image, mime = load_document_image(document)
    png_bytes = pil_to_png_bytes(image)
    start = time.monotonic()
    try:
        caption, provider, model = caption_image(image_png_bytes=png_bytes, mime_type=mime)
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Vision provider HTTP {exc.code}.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Vision provider unavailable.") from exc
    elapsed_ms = int((time.monotonic() - start) * 1000)

    # Persist the caption as a synthetic chunk so it is retrievable (hybrid dense+BM25).
    # We store the chunk id in document.citation_metadata so subsequent captions update the same chunk.
    existing_vision = (
        (document.citation_metadata or {}).get("vision")
        if isinstance((document.citation_metadata or {}).get("vision"), dict)
        else {}
    )
    existing_chunk_id = (
        existing_vision.get("captionChunkId")
        if isinstance(existing_vision, dict)
        else None
    )

    caption_chunk: DocumentChunk | None = None
    if isinstance(existing_chunk_id, str) and existing_chunk_id:
        candidate = db.get(DocumentChunk, existing_chunk_id)
        if candidate is not None and candidate.document_id == document.id:
            caption_chunk = candidate
            caption_chunk.content = caption
            caption_chunk.lexical_terms = tokenize_text(caption)
            caption_chunk.embedding_model = embedding_service.model_name

    if caption_chunk is None:
        caption_chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=-1,
            chunk_type="vision_caption",
            section_heading="Vision caption",
            page_start=1,
            page_end=1,
            content=caption,
            lexical_terms=tokenize_text(caption),
            citation_label="Vision caption",
            embedding_model=embedding_service.model_name,
            citation_metadata={"source": "vision_caption"},
        )
        db.add(caption_chunk)
        db.flush()

    try:
        upsert_chunks(
            owner_user_id=document.owner_user_id or "shared",
            is_shared=bool(document.is_shared),
            chunk_rows=[caption_chunk],
            embeddings=embedding_service.embed_texts([caption_chunk.content]),
        )
    except Exception:
        # Keep captioning functional even if Milvus is down.
        pass

    document.citation_metadata = {
        **(document.citation_metadata or {}),
        "vision": {
            **((document.citation_metadata or {}).get("vision", {}) if isinstance((document.citation_metadata or {}).get("vision"), dict) else {}),
            "caption": caption,
            "captionProvider": provider,
            "captionModel": model,
            "captionChunkId": caption_chunk.id,
        },
    }

    trace = VisionTrace(
        user_id=user.id,
        document_id=document.id,
        action="caption",
        request_json={},
        response_json={"caption": caption, "provider": provider, "model": model, "elapsedMs": elapsed_ms},
    )
    db.add(trace)
    db.commit()

    return VisionCaptionResponse(
        trace_id=trace.id,
        document_id=document.id,
        caption=caption,
        provider=provider,
        model=model,
    )


@router.post("/documents/{document_id}/vqa", response_model=VisionVqaResponse)
def visual_qa(
    document_id: str,
    payload: VisionVqaRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionVqaResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="Vision VQA only supports image/DICOM documents.")

    image, mime = load_document_image(document)
    png_bytes = pil_to_png_bytes(image)
    start = time.monotonic()
    try:
        answer, provider, model = vqa_image(question=payload.question, image_png_bytes=png_bytes, mime_type=mime)
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Vision provider HTTP {exc.code}.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Vision provider unavailable.") from exc
    elapsed_ms = int((time.monotonic() - start) * 1000)

    citations: list[AssistantCitation] = []
    hits_json: list[dict] | None = None
    if payload.include_text_evidence:
        hits = search_document_chunks(db=db, user=user, query=payload.question, top_k=payload.top_k)
        hits_json = [hit.model_dump(by_alias=True) for hit in hits]
        citations = [
            AssistantCitation(
                document_name=hit.citation.document_name,
                page=hit.citation.page_start,
                chapter=hit.section_heading or hit.citation.citation_label,
                snippet=hit.snippet,
            )
            for hit in hits
        ]

    trace = VisionTrace(
        user_id=user.id,
        document_id=document.id,
        action="vqa",
        request_json={
            "question": payload.question,
            "includeTextEvidence": payload.include_text_evidence,
            "topK": payload.top_k,
        },
        response_json={
            "answer": answer,
            "provider": provider,
            "model": model,
            "elapsedMs": elapsed_ms,
            "hits": hits_json,
            "citations": [c.model_dump(by_alias=True) for c in citations],
        },
    )
    db.add(trace)
    db.commit()

    return VisionVqaResponse(
        trace_id=trace.id,
        document_id=document.id,
        answer=answer,
        provider=provider,
        model=model,
        citations=citations,
    )


@router.post("/documents/{document_id}/gradcam", response_model=VisionGradcamResponse)
def gradcam_overlay(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionGradcamResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="GradCAM only supports image/DICOM documents.")

    image, _ = load_document_image(document)
    start = time.monotonic()
    heatmap_png = generate_gradcam_heatmap_png(image=image)
    elapsed_ms = int((time.monotonic() - start) * 1000)
    heatmap_data_url = png_bytes_to_data_url(heatmap_png)

    trace = VisionTrace(
        user_id=user.id,
        document_id=document.id,
        action="gradcam",
        request_json={},
        response_json={"elapsedMs": elapsed_ms, "gradcam": {"mode": "proxy"}},
    )
    db.add(trace)
    db.flush()

    stored = save_artifact_bytes(
        owner_user_id=document.owner_user_id,
        document_id=document.id,
        file_name=f"gradcam_{trace.id}.png",
        mime_type="image/png",
        content=heatmap_png,
    )
    artifact = VisionArtifact(
        trace_id=trace.id,
        document_id=document.id,
        kind="gradcam_heatmap",
        mime_type=stored.mime_type,
        storage_path=stored.path,
        file_size_bytes=stored.file_size_bytes,
        checksum_sha256=stored.checksum_sha256,
    )
    db.add(artifact)
    trace.response_json = {**(trace.response_json or {}), "artifactId": artifact.id}
    db.commit()

    return VisionGradcamResponse(
        trace_id=trace.id,
        document_id=document.id,
        heatmap_data_url=heatmap_data_url,
    )


@router.post("/documents/{document_id}/analyze", response_model=VisionAnalyzeResponse)
def analyze_image(
    document_id: str,
    payload: VisionAnalyzeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionAnalyzeResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="Vision analysis only supports image/DICOM documents.")

    image, mime = load_document_image(document)
    png_bytes = pil_to_png_bytes(image)

    start = time.monotonic()
    try:
        caption, provider, model = caption_image(image_png_bytes=png_bytes, mime_type=mime)
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Vision provider HTTP {exc.code}.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Vision provider unavailable.") from exc
    heatmap_png = generate_gradcam_heatmap_png(image=image)
    heatmap_data_url = png_bytes_to_data_url(heatmap_png)

    try:
        answer, _, _ = vqa_image(question=payload.question, image_png_bytes=png_bytes, mime_type=mime)
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Vision provider HTTP {exc.code}.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Vision provider unavailable.") from exc
    elapsed_ms = int((time.monotonic() - start) * 1000)

    citations: list[AssistantCitation] = []
    hits_json: list[dict] | None = None
    if payload.include_text_evidence:
        hits = search_document_chunks(db=db, user=user, query=payload.question, top_k=payload.top_k)
        hits_json = [hit.model_dump(by_alias=True) for hit in hits]
        citations = [
            AssistantCitation(
                document_name=hit.citation.document_name,
                page=hit.citation.page_start,
                chapter=hit.section_heading or hit.citation.citation_label,
                snippet=hit.snippet,
            )
            for hit in hits
        ]

    # Persist caption so it's reusable and retrievable.
    existing_vision = (
        (document.citation_metadata or {}).get("vision")
        if isinstance((document.citation_metadata or {}).get("vision"), dict)
        else {}
    )
    existing_chunk_id = (
        existing_vision.get("captionChunkId")
        if isinstance(existing_vision, dict)
        else None
    )
    caption_chunk: DocumentChunk | None = None
    if isinstance(existing_chunk_id, str) and existing_chunk_id:
        candidate = db.get(DocumentChunk, existing_chunk_id)
        if candidate is not None and candidate.document_id == document.id:
            caption_chunk = candidate
            caption_chunk.content = caption
            caption_chunk.lexical_terms = tokenize_text(caption)
            caption_chunk.embedding_model = embedding_service.model_name

    if caption_chunk is None:
        caption_chunk = DocumentChunk(
            document_id=document.id,
            chunk_index=-1,
            chunk_type="vision_caption",
            section_heading="Vision caption",
            page_start=1,
            page_end=1,
            content=caption,
            lexical_terms=tokenize_text(caption),
            citation_label="Vision caption",
            embedding_model=embedding_service.model_name,
            citation_metadata={"source": "vision_caption"},
        )
        db.add(caption_chunk)
        db.flush()

    try:
        upsert_chunks(
            owner_user_id=document.owner_user_id or "shared",
            is_shared=bool(document.is_shared),
            chunk_rows=[caption_chunk],
            embeddings=embedding_service.embed_texts([caption_chunk.content]),
        )
    except Exception:
        pass

    document.citation_metadata = {
        **(document.citation_metadata or {}),
        "vision": {
            **(existing_vision if isinstance(existing_vision, dict) else {}),
            "caption": caption,
            "captionProvider": provider,
            "captionModel": model,
            "captionChunkId": caption_chunk.id,
        },
    }

    trace = VisionTrace(
        user_id=user.id,
        document_id=document.id,
        action="analyze",
        request_json={
            "question": payload.question,
            "includeTextEvidence": payload.include_text_evidence,
            "topK": payload.top_k,
        },
        response_json={
            "caption": caption,
            "vqaAnswer": answer,
            "provider": provider,
            "model": model,
            "elapsedMs": elapsed_ms,
            "hits": hits_json,
            "gradcam": {"mode": "proxy"},
            "citations": [c.model_dump(by_alias=True) for c in citations],
        },
    )
    db.add(trace)
    db.flush()

    stored = save_artifact_bytes(
        owner_user_id=document.owner_user_id,
        document_id=document.id,
        file_name=f"gradcam_{trace.id}.png",
        mime_type="image/png",
        content=heatmap_png,
    )
    artifact = VisionArtifact(
        trace_id=trace.id,
        document_id=document.id,
        kind="gradcam_heatmap",
        mime_type=stored.mime_type,
        storage_path=stored.path,
        file_size_bytes=stored.file_size_bytes,
        checksum_sha256=stored.checksum_sha256,
    )
    db.add(artifact)
    trace.response_json = {**(trace.response_json or {}), "artifactId": artifact.id}
    db.commit()

    return VisionAnalyzeResponse(
        trace_id=trace.id,
        document_id=document.id,
        caption=caption,
        heatmap_data_url=heatmap_data_url,
        vqa_answer=answer,
        citations=citations,
    )


@router.get("/traces/{trace_id}", response_model=VisionTraceResponse)
def get_vision_trace(
    trace_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionTraceResponse:
    trace = db.get(VisionTrace, trace_id)
    if trace is None:
        raise HTTPException(status_code=404, detail="Trace not found.")

    document = db.get(Document, trace.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if user.role != UserRole.ADMIN and document.owner_user_id != user.id and not document.is_shared:
        raise HTTPException(status_code=403, detail="Access denied.")

    created_at = (
        trace.created_at.replace(tzinfo=timezone.utc).isoformat()
        if trace.created_at
        else ""
    )
    return VisionTraceResponse(
        id=trace.id,
        userId=trace.user_id,
        documentId=trace.document_id,
        action=trace.action,
        request=trace.request_json,
        response=trace.response_json,
        createdAt=created_at,
    )


@router.get("/artifacts/{artifact_id}")
def get_vision_artifact(
    artifact_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FileResponse:
    artifact = db.get(VisionArtifact, artifact_id)
    if artifact is None:
        raise HTTPException(status_code=404, detail="Artifact not found.")

    document = db.get(Document, artifact.document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if user.role != UserRole.ADMIN and document.owner_user_id != user.id and not document.is_shared:
        raise HTTPException(status_code=403, detail="Access denied.")

    path = resolve_storage_path(artifact.storage_path)
    return FileResponse(path=str(path), media_type=artifact.mime_type, filename=path.name)


@router.post("/search", response_model=VisionSearchResponse)
def vision_search(
    payload: VisionSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionSearchResponse:
    text_hits = search_document_chunks(db=db, user=user, query=payload.query, top_k=payload.top_k)

    image_results: list[VisionSearchImageResult] = []

    # Lightweight: derive "image results" from text retrieval by selecting image/DICOM docs.
    if text_hits:
        doc_ids = {hit.document_id for hit in text_hits}
        documents = {
            doc.id: doc
            for doc in db.scalars(select(Document).where(Document.id.in_(doc_ids))).all()
        }
        seen: set[str] = set()
        for hit in text_hits:
            doc = documents.get(hit.document_id)
            if doc is None or doc.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
                continue
            if user.role != UserRole.ADMIN and doc.owner_user_id != user.id and not doc.is_shared:
                continue
            if doc.id in seen:
                continue
            seen.add(doc.id)

            preview_data_url = None
            if payload.include_image_previews:
                try:
                    img, _ = load_document_image(doc)
                    preview_data_url = png_bytes_to_data_url(pil_to_png_bytes(img))
                except Exception:
                    preview_data_url = None

            image_results.append(
                VisionSearchImageResult(
                    documentId=doc.id,
                    documentName=doc.file_name,
                    score=hit.score,
                    previewDataUrl=preview_data_url,
                )
                    )

    return VisionSearchResponse(textHits=text_hits, imageResults=image_results)
