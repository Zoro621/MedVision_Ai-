"""
Hybrid retrieval pipeline — Phase 2/7 upgrade.

Flow:
  1. BM25 lexical retrieval over all accessible chunk texts.
  2. Dense ANN search in Milvus (BioBERT embeddings, COSINE).
  3. Reciprocal Rank Fusion (55 % dense / 45 % lexical).
  4. Cross-encoder reranking of top-candidate pool.

The reranker step is toggled by RETRIEVAL_ENABLE_RERANKER in config.
"""
from __future__ import annotations

from collections import defaultdict

from rank_bm25 import BM25Okapi
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk, DocumentStatus, User, UserRole
from app.schemas.documents import DocumentChunkCitation, DocumentChunkHit
from app.services.embeddings import embedding_service, tokenize_text
from app.services.milvus_index import search_chunks
from app.services.reranker import rerank_hits

# Over-retrieve by this factor before reranking so the reranker has enough
# candidates to work with without inflating the final result count.
_RERANK_CANDIDATE_FACTOR = 4


def search_document_chunks(
    *,
    db: Session,
    user: User,
    query: str,
    top_k: int,
    document_ids: list[str] | None = None,
) -> list[DocumentChunkHit]:
    accessible_documents = _get_accessible_documents(
        db=db, user=user, document_ids=document_ids
    )
    if not accessible_documents:
        return []

    documents_by_id = {doc.id: doc for doc in accessible_documents}
    chunk_rows = db.scalars(
        select(DocumentChunk).where(
            DocumentChunk.document_id.in_(documents_by_id.keys())
        )
    ).all()
    if not chunk_rows:
        return []

    # How many candidates to pull before the reranker filters down to top_k
    candidate_k = top_k * _RERANK_CANDIDATE_FACTOR

    lexical_scores = _lexical_scores(query=query, chunks=chunk_rows)
    dense_scores   = _dense_scores(
        query=query,
        document_ids=list(documents_by_id.keys()),
        top_k=max(candidate_k, 20),
    )

    # Reciprocal Rank Fusion
    combined: dict[str, dict[str, float]] = defaultdict(
        lambda: {"dense": 0.0, "lexical": 0.0}
    )
    for chunk_id, score in dense_scores.items():
        combined[chunk_id]["dense"] = score
    for chunk_id, score in lexical_scores.items():
        combined[chunk_id]["lexical"] = score

    ranked_ids = sorted(
        combined,
        key=lambda cid: 0.55 * combined[cid]["dense"] + 0.45 * combined[cid]["lexical"],
        reverse=True,
    )[:candidate_k]

    chunk_by_id = {c.id: c for c in chunk_rows}
    hits: list[DocumentChunkHit] = []
    for chunk_id in ranked_ids:
        chunk    = chunk_by_id.get(chunk_id)
        if chunk is None:
            continue
        document = documents_by_id.get(chunk.document_id)
        if document is None:
            continue
        ds = combined[chunk_id]["dense"]
        ls = combined[chunk_id]["lexical"]
        fs = round(0.55 * ds + 0.45 * ls, 4)
        hits.append(
            DocumentChunkHit(
                chunk_id=chunk.id,
                document_id=document.id,
                document_name=document.file_name,
                page_start=chunk.page_start,
                page_end=chunk.page_end,
                score=fs,
                dense_score=round(ds, 4),
                lexical_score=round(ls, 4),
                snippet=_build_snippet(query=query, text=chunk.content),
                content=chunk.content,   # full text for reranker + linker
                section_heading=chunk.section_heading,
                parent_heading=(chunk.citation_metadata or {}).get("parentHeading")
                    if chunk.citation_metadata else None,
                citation=DocumentChunkCitation(
                    document_id=document.id,
                    document_name=document.file_name,
                    page_start=chunk.page_start,
                    page_end=chunk.page_end,
                    section_heading=chunk.section_heading,
                    citation_label=chunk.citation_label,
                ),
            )
        )

    # Cross-encoder reranking (falls back to original order if unavailable)
    return rerank_hits(query=query, hits=hits, top_k=top_k)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _get_accessible_documents(
    *,
    db: Session,
    user: User,
    document_ids: list[str] | None,
) -> list[Document]:
    query = select(Document).where(Document.status == DocumentStatus.READY)
    if document_ids:
        query = query.where(Document.id.in_(document_ids))
    documents = db.scalars(query).all()
    if user.role == UserRole.ADMIN:
        return list(documents)
    return [
        d for d in documents
        if d.owner_user_id == user.id or d.is_shared
    ]


def _lexical_scores(*, query: str, chunks: list[DocumentChunk]) -> dict[str, float]:
    corpus       = [c.lexical_terms or tokenize_text(c.content) for c in chunks]
    bm25         = BM25Okapi(corpus)
    raw_scores   = list(bm25.get_scores(tokenize_text(query)))
    max_score    = max(raw_scores) if raw_scores else 0.0
    if max_score <= 0:
        return {}
    return {
        chunk.id: float(score / max_score)
        for chunk, score in zip(chunks, raw_scores, strict=False)
        if score > 0
    }


def _dense_scores(
    *,
    query: str,
    document_ids: list[str],
    top_k: int,
) -> dict[str, float]:
    try:
        matches = search_chunks(
            query_embedding=embedding_service.embed_text(query),
            document_ids=document_ids,
            top_k=top_k,
        )
    except Exception:
        return {}
    max_score = max((m.score for m in matches), default=0.0)
    if max_score <= 0:
        return {}
    return {m.chunk_id: m.score / max_score for m in matches if m.score > 0}


def _build_snippet(*, query: str, text: str) -> str:
    normalized = text.replace("\n", " ").strip()
    if len(normalized) <= 300:
        return normalized
    query_terms = tokenize_text(query)
    lower       = normalized.lower()
    for term in query_terms:
        index = lower.find(term)
        if index != -1:
            start   = max(index - 100, 0)
            end     = min(index + 200, len(normalized))
            snippet = normalized[start:end].strip()
            if start > 0:
                snippet = f"…{snippet}"
            if end < len(normalized):
                snippet = f"{snippet}…"
            return snippet
    return f"{normalized[:297].strip()}…"
