"""
Vision API routes — Phase 4 + Phase 7 explainability.

Endpoints:
  POST /vision/documents/{id}/caption     — AI caption generation
  POST /vision/documents/{id}/vqa         — Visual question answering
  POST /vision/documents/{id}/gradcam     — GradCAM++ heatmap
  POST /vision/documents/{id}/lime        — LIME superpixel explanation
  POST /vision/documents/{id}/shap        — SHAP DeepExplainer attribution
  POST /vision/documents/{id}/attention   — Cross-modal attention + explanation links
  POST /vision/documents/{id}/analyze     — Combined (caption + GradCAM++ + VQA + optional LIME/SHAP/attention)
  GET  /vision/traces/{trace_id}          — Retrieve vision trace
  GET  /vision/artifacts/{artifact_id}    — Download stored artifact
  POST /vision/search                     — Hybrid text+image search
"""
from __future__ import annotations

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
    VisionAnalyzeRequest,
    VisionAnalyzeResponse,
    VisionAttentionResponse,
    VisionAttentionToken,
    VisionCaptionResponse,
    VisionExplanationLink,
    VisionGradcamResponse,
    VisionLimeResponse,
    VisionLimeSuperpixel,
    VisionSearchImageResult,
    VisionSearchRequest,
    VisionSearchResponse,
    VisionShapResponse,
    VisionTraceResponse,
    VisionVqaRequest,
    VisionVqaResponse,
)
from app.services.attention_viz import build_attention_and_links
from app.services.embeddings import embedding_service, tokenize_text
from app.services.gradcam import (
    generate_gradcam_heatmap_png,
    generate_gradcam_overlay_png,
    get_heatmap_regions,
)
from app.services.lime_explainer import explain_image_lime
from app.services.milvus_index import upsert_chunks
from app.services.retrieval import search_document_chunks
from app.services.shap_explainer import explain_image_shap
from app.services.storage import resolve_storage_path, save_artifact_bytes
from app.services.vision_io import load_document_image, pil_to_png_bytes, png_bytes_to_data_url
from app.services.vision_llm import caption_image, vqa_image

router = APIRouter(prefix="/vision", tags=["vision"])


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_visible_document(*, db: Session, user: User, document_id: str) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    if user.role != UserRole.ADMIN and document.owner_user_id != user.id and not document.is_shared:
        raise HTTPException(status_code=403, detail="Access denied.")
    return document


def _store_gradcam_artifact(*, db: Session, trace, document, heatmap_png: bytes) -> VisionArtifact:
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
    return artifact


def _persist_caption_chunk(*, db: Session, document: Document, caption: str, provider: str, model: str) -> None:
    """Store caption as a synthetic chunk for hybrid retrieval inclusion."""
    existing_vision = (
        (document.citation_metadata or {}).get("vision")
        if isinstance((document.citation_metadata or {}).get("vision"), dict) else {}
    )
    existing_chunk_id = existing_vision.get("captionChunkId") if isinstance(existing_vision, dict) else None

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


# ──────────────────────────────────────────────────────────────────────────────
# Caption
# ──────────────────────────────────────────────────────────────────────────────

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
    png_bytes   = pil_to_png_bytes(image)
    try:
        caption, provider, model = caption_image(image_png_bytes=png_bytes, mime_type=mime)
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Vision provider HTTP {exc.code}.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Vision provider unavailable.") from exc

    _persist_caption_chunk(db=db, document=document, caption=caption, provider=provider, model=model)

    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="caption",
        request_json={},
        response_json={"caption": caption, "provider": provider, "model": model},
    )
    db.add(trace)
    db.commit()

    return VisionCaptionResponse(traceId=trace.id, documentId=document.id,
                                  caption=caption, provider=provider, model=model)


# ──────────────────────────────────────────────────────────────────────────────
# VQA
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/documents/{document_id}/vqa", response_model=VisionVqaResponse)
def visual_qa(
    document_id: str,
    payload: VisionVqaRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionVqaResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="VQA only supports image/DICOM documents.")

    image, mime = load_document_image(document)
    png_bytes   = pil_to_png_bytes(image)
    try:
        answer, provider, model = vqa_image(question=payload.question, image_png_bytes=png_bytes, mime_type=mime)
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Vision provider HTTP {exc.code}.") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Vision provider unavailable.") from exc

    citations: list[AssistantCitation] = []
    if payload.include_text_evidence:
        hits = search_document_chunks(db=db, user=user, query=payload.question, top_k=payload.top_k)
        citations = [
            AssistantCitation(
                document_name=h.document_name, page=h.page_start,
                chapter=h.section_heading or h.citation.citation_label, snippet=h.snippet,
            ) for h in hits
        ]

    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="vqa",
        request_json={"question": payload.question},
        response_json={"answer": answer, "provider": provider, "model": model},
    )
    db.add(trace)
    db.commit()

    return VisionVqaResponse(
        traceId=trace.id, documentId=document.id,
        answer=answer, provider=provider, model=model, citations=citations,
    )


# ──────────────────────────────────────────────────────────────────────────────
# GradCAM++
# ──────────────────────────────────────────────────────────────────────────────

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
    heatmap_png  = generate_gradcam_heatmap_png(image=image)
    overlay_png  = generate_gradcam_overlay_png(image=image)
    heatmap_url  = png_bytes_to_data_url(heatmap_png)
    overlay_url  = png_bytes_to_data_url(overlay_png)
    regions      = get_heatmap_regions(heatmap_png)

    from app.services import gradcam as gradcam_mod
    method = "gradcam++" if gradcam_mod._model_available() else "proxy"

    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="gradcam",
        request_json={},
        response_json={"method": method, "regions": regions},
    )
    db.add(trace)
    db.flush()
    _store_gradcam_artifact(db=db, trace=trace, document=document, heatmap_png=heatmap_png)
    db.commit()

    return VisionGradcamResponse(
        traceId=trace.id, documentId=document.id,
        heatmapDataUrl=heatmap_url, overlayDataUrl=overlay_url,
        method=method, regionBboxes=regions,
    )


# ──────────────────────────────────────────────────────────────────────────────
# LIME
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/documents/{document_id}/lime", response_model=VisionLimeResponse)
def lime_explanation(
    document_id: str,
    payload: VisionVqaRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionLimeResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="LIME only supports image/DICOM documents.")

    image, _ = load_document_image(document)
    result   = explain_image_lime(image=image, question=payload.question)

    superpixels = [
        VisionLimeSuperpixel(id=s["id"], importance=s["importance"],
                             positive=s["positive"], bbox=s["bbox"])
        for s in result.superpixels[:20]
    ]
    overlay_url = f"data:image/png;base64,{result.overlay_png_b64}"

    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="lime",
        request_json={"question": payload.question},
        response_json={"method": result.method, "numSamples": int(result.num_samples),
                       "numSuperpixels": int(result.num_superpixels)},
    )
    db.add(trace)
    db.commit()

    return VisionLimeResponse(
        traceId=trace.id, documentId=document.id,
        overlayDataUrl=overlay_url, superpixels=superpixels,
        numSamples=result.num_samples, method=result.method,
    )


# ──────────────────────────────────────────────────────────────────────────────
# SHAP
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/documents/{document_id}/shap", response_model=VisionShapResponse)
def shap_explanation(
    document_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionShapResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="SHAP only supports image/DICOM documents.")

    image, _ = load_document_image(document)
    result   = explain_image_shap(image=image)
    overlay_url = f"data:image/png;base64,{result.overlay_png_b64}"

    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="shap",
        request_json={},
        response_json={"method": result.method, "explanation": result.explanation},
    )
    db.add(trace)
    db.commit()

    return VisionShapResponse(
        traceId=trace.id, documentId=document.id,
        overlayDataUrl=overlay_url, topPixels=result.top_pixels,
        explanation=result.explanation, method=result.method,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Attention + Explanation Links
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/documents/{document_id}/attention", response_model=VisionAttentionResponse)
def attention_visualization(
    document_id: str,
    payload: VisionVqaRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionAttentionResponse:
    document = _get_visible_document(db=db, user=user, document_id=document_id)
    if document.kind not in (DocumentKind.IMAGE, DocumentKind.DICOM):
        raise HTTPException(status_code=400, detail="Attention viz only supports image/DICOM documents.")

    image, mime = load_document_image(document)

    # Get caption from document metadata (if already computed) or generate fresh
    existing_caption = (
        (document.citation_metadata or {}).get("vision", {}).get("caption", "")
        if isinstance((document.citation_metadata or {}).get("vision"), dict) else ""
    )
    if not existing_caption:
        png_bytes = pil_to_png_bytes(image)
        try:
            existing_caption, _, _ = caption_image(image_png_bytes=png_bytes, mime_type=mime)
        except Exception:
            existing_caption = payload.question

    hits    = search_document_chunks(db=db, user=user, query=payload.question, top_k=payload.top_k)
    hm_png  = generate_gradcam_heatmap_png(image=image)
    regions = get_heatmap_regions(hm_png)

    result  = build_attention_and_links(
        image=image,
        caption=existing_caption,
        retrieved_chunks=hits,
        heatmap_regions=regions,
    )

    token_heatmaps = [
        VisionAttentionToken(
            token=t.token,
            heatmapDataUrl=f"data:image/png;base64,{t.heatmap_b64}",
            importance=t.importance,
        ) for t in result.token_heatmaps
    ]
    expl_links = [
        VisionExplanationLink(
            regionBbox=lnk.region_bbox,
            regionLabel=lnk.region_label,
            chunkId=lnk.chunk_id,
            chunkSnippet=lnk.chunk_snippet,
            citation=lnk.citation,
            similarity=lnk.similarity,
        ) for lnk in result.explanation_links
    ]

    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="attention",
        request_json={"question": payload.question},
        response_json={"method": result.method, "tokenCount": len(token_heatmaps),
                       "linkCount": len(expl_links)},
    )
    db.add(trace)
    db.commit()

    return VisionAttentionResponse(
        traceId=trace.id, documentId=document.id,
        tokenHeatmaps=token_heatmaps, explanationLinks=expl_links,
        method=result.method,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Combined Analyze (main endpoint used by the UI)
# ──────────────────────────────────────────────────────────────────────────────

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
    png_bytes   = pil_to_png_bytes(image)

    # ── Caption ───────────────────────────────────────────────────────────────
    # Keep analyze usable even if external caption providers are down.
    provider = "fallback"
    model = "proxy"
    try:
        cap, provider, model = caption_image(image_png_bytes=png_bytes, mime_type=mime)
        _persist_caption_chunk(db=db, document=document, caption=cap, provider=provider, model=model)
    except Exception:
        cap = "Caption temporarily unavailable. GradCAM/vision evidence is still provided."

    # ── GradCAM++ ─────────────────────────────────────────────────────────────
    heatmap_png = generate_gradcam_heatmap_png(image=image)
    overlay_png = generate_gradcam_overlay_png(image=image)
    hm_url      = png_bytes_to_data_url(heatmap_png)
    ov_url      = png_bytes_to_data_url(overlay_png)
    regions     = get_heatmap_regions(heatmap_png)

    from app.services import gradcam as gradcam_mod
    gcam_method = "gradcam++" if gradcam_mod._model_available() else "proxy"

    # ── VQA ───────────────────────────────────────────────────────────────────
    vqa_answer: str | None = None
    try:
        vqa_answer, _, _ = vqa_image(question=payload.question, image_png_bytes=png_bytes, mime_type=mime)
    except Exception:
        vqa_answer = None

    # ── Text evidence ─────────────────────────────────────────────────────────
    citations: list[AssistantCitation] = []
    hits = []
    if payload.include_text_evidence:
        hits = search_document_chunks(db=db, user=user, query=payload.question, top_k=payload.top_k)
        citations = [
            AssistantCitation(
                document_name=h.document_name, page=h.page_start,
                chapter=h.section_heading or h.citation.citation_label, snippet=h.snippet,
            ) for h in hits
        ]

    # ── Optional LIME ─────────────────────────────────────────────────────────
    lime_resp: VisionLimeResponse | None = None
    if payload.include_lime:
        try:
            lime_r = explain_image_lime(image=image, question=payload.question)
            lime_resp = VisionLimeResponse(
                traceId="inline", documentId=document.id,
                overlayDataUrl=f"data:image/png;base64,{lime_r.overlay_png_b64}",
                superpixels=[
                    VisionLimeSuperpixel(id=s["id"], importance=s["importance"],
                                         positive=s["positive"], bbox=s["bbox"])
                    for s in lime_r.superpixels[:20]
                ],
                numSamples=lime_r.num_samples, method=lime_r.method,
            )
        except Exception as exc:
            pass

    # ── Optional SHAP ─────────────────────────────────────────────────────────
    shap_resp: VisionShapResponse | None = None
    if payload.include_shap:
        try:
            shap_r = explain_image_shap(image=image)
            shap_resp = VisionShapResponse(
                traceId="inline", documentId=document.id,
                overlayDataUrl=f"data:image/png;base64,{shap_r.overlay_png_b64}",
                topPixels=shap_r.top_pixels, explanation=shap_r.explanation,
                method=shap_r.method,
            )
        except Exception:
            pass

    # ── Optional Attention ────────────────────────────────────────────────────
    attn_resp: VisionAttentionResponse | None = None
    if payload.include_attention:
        try:
            attn_r = build_attention_and_links(
                image=image, caption=cap,
                retrieved_chunks=hits, heatmap_regions=regions,
            )
            attn_resp = VisionAttentionResponse(
                traceId="inline", documentId=document.id,
                tokenHeatmaps=[
                    VisionAttentionToken(
                        token=t.token,
                        heatmapDataUrl=f"data:image/png;base64,{t.heatmap_b64}",
                        importance=t.importance,
                    ) for t in attn_r.token_heatmaps
                ],
                explanationLinks=[
                    VisionExplanationLink(
                        regionBbox=lnk.region_bbox, regionLabel=lnk.region_label,
                        chunkId=lnk.chunk_id, chunkSnippet=lnk.chunk_snippet,
                        citation=lnk.citation, similarity=lnk.similarity,
                    ) for lnk in attn_r.explanation_links
                ],
                method=attn_r.method,
            )
        except Exception:
            pass

    # ── Trace + artifact ──────────────────────────────────────────────────────
    trace = VisionTrace(
        user_id=user.id, document_id=document.id, action="analyze",
        request_json={"question": payload.question, "includeLime": payload.include_lime,
                      "includeShap": payload.include_shap, "includeAttention": payload.include_attention},
        response_json={
            "caption": cap, "vqaAnswer": vqa_answer,
            "provider": provider, "model": model,
            "gradcamMethod": gcam_method, "regionCount": len(regions),
        },
    )
    db.add(trace)
    db.flush()
    _store_gradcam_artifact(db=db, trace=trace, document=document, heatmap_png=heatmap_png)
    db.commit()

    return VisionAnalyzeResponse(
        traceId=trace.id, documentId=document.id,
        caption=cap, heatmapDataUrl=hm_url, overlayDataUrl=ov_url,
        gradcamMethod=gcam_method, regionBboxes=regions,
        vqaAnswer=vqa_answer, citations=citations,
        lime=lime_resp, shap=shap_resp, attention=attn_resp,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Trace + Artifact retrieval
# ──────────────────────────────────────────────────────────────────────────────

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
        trace.created_at.replace(tzinfo=timezone.utc).isoformat() if trace.created_at else ""
    )
    return VisionTraceResponse(
        id=trace.id, userId=trace.user_id, documentId=trace.document_id,
        action=trace.action, request=trace.request_json,
        response=trace.response_json, createdAt=created_at,
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


# ──────────────────────────────────────────────────────────────────────────────
# Vision search
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/search", response_model=VisionSearchResponse)
def vision_search(
    payload: VisionSearchRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VisionSearchResponse:
    text_hits = search_document_chunks(db=db, user=user, query=payload.query, top_k=payload.top_k)
    image_results: list[VisionSearchImageResult] = []

    if text_hits:
        doc_ids   = {h.document_id for h in text_hits}
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
                    pass
            image_results.append(VisionSearchImageResult(
                documentId=doc.id, documentName=doc.file_name,
                score=hit.score, previewDataUrl=preview_data_url,
            ))

    return VisionSearchResponse(textHits=text_hits, imageResults=image_results)
