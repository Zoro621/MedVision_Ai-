from collections import defaultdict

from rank_bm25 import BM25Okapi
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk, DocumentStatus, User, UserRole
from app.schemas.documents import DocumentChunkCitation, DocumentChunkHit
from app.services.embeddings import embedding_service, tokenize_text
from app.services.milvus_index import search_chunks


def search_document_chunks(
    *,
    db: Session,
    user: User,
    query: str,
    top_k: int,
    document_ids: list[str] | None = None,
) -> list[DocumentChunkHit]:
    accessible_documents = _get_accessible_documents(
        db=db,
        user=user,
        document_ids=document_ids,
    )
    if not accessible_documents:
        return []

    documents_by_id = {document.id: document for document in accessible_documents}
    chunk_rows = db.scalars(
        select(DocumentChunk).where(
            DocumentChunk.document_id.in_(documents_by_id.keys())
        )
    ).all()
    if not chunk_rows:
        return []

    lexical_scores = _lexical_scores(query=query, chunks=chunk_rows)
    dense_scores = _dense_scores(
        query=query,
        document_ids=list(documents_by_id.keys()),
        top_k=max(top_k * 3, 10),
    )

    combined_scores: dict[str, dict[str, float]] = defaultdict(
        lambda: {"dense": 0.0, "lexical": 0.0}
    )
    for chunk_id, score in dense_scores.items():
        combined_scores[chunk_id]["dense"] = score
    for chunk_id, score in lexical_scores.items():
        combined_scores[chunk_id]["lexical"] = score

    ranked_chunk_ids = sorted(
        combined_scores,
        key=lambda chunk_id: 0.55 * combined_scores[chunk_id]["dense"]
        + 0.45 * combined_scores[chunk_id]["lexical"],
        reverse=True,
    )[:top_k]

    chunk_by_id = {chunk.id: chunk for chunk in chunk_rows}
    hits: list[DocumentChunkHit] = []
    for chunk_id in ranked_chunk_ids:
        chunk = chunk_by_id[chunk_id]
        document = documents_by_id[chunk.document_id]
        dense_score = combined_scores[chunk_id]["dense"]
        lexical_score = combined_scores[chunk_id]["lexical"]
        final_score = 0.55 * dense_score + 0.45 * lexical_score
        hits.append(
            DocumentChunkHit(
                chunk_id=chunk.id,
                document_id=document.id,
                document_name=document.file_name,
                page_start=chunk.page_start,
                page_end=chunk.page_end,
                score=round(final_score, 4),
                dense_score=round(dense_score, 4),
                lexical_score=round(lexical_score, 4),
                snippet=_build_snippet(query=query, text=chunk.content),
                section_heading=chunk.section_heading,
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
    return hits


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
        return documents

    return [
        document
        for document in documents
        if document.owner_user_id == user.id or document.is_shared
    ]


def _lexical_scores(
    *,
    query: str,
    chunks: list[DocumentChunk],
) -> dict[str, float]:
    corpus = [chunk.lexical_terms or tokenize_text(chunk.content) for chunk in chunks]
    bm25 = BM25Okapi(corpus)
    raw_scores = list(bm25.get_scores(tokenize_text(query)))
    max_score = max(raw_scores) if raw_scores else 0.0
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

    max_score = max((match.score for match in matches), default=0.0)
    if max_score <= 0:
        return {}
    return {
        match.chunk_id: match.score / max_score
        for match in matches
        if match.score > 0
    }


def _build_snippet(*, query: str, text: str) -> str:
    normalized = text.replace("\n", " ").strip()
    if len(normalized) <= 260:
        return normalized

    query_terms = tokenize_text(query)
    lower = normalized.lower()
    for term in query_terms:
        index = lower.find(term)
        if index != -1:
            start = max(index - 90, 0)
            end = min(index + 170, len(normalized))
            snippet = normalized[start:end].strip()
            if start > 0:
                snippet = f"...{snippet}"
            if end < len(normalized):
                snippet = f"{snippet}..."
            return snippet

    return f"{normalized[:257].strip()}..."
