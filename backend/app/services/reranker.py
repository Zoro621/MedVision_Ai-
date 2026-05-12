"""
Cross-encoder reranker — Phase 7 retrieval upgrade.

Uses cross-encoder/ms-marco-MiniLM-L-6-v2 (24 MB, fast on CPU) to
re-score the top candidate chunks returned by hybrid retrieval.

Falls back to the original BM25+dense ordering when the model is not
available (e.g. sentence-transformers not installed, or ML features
disabled in config).
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from app.schemas.documents import DocumentChunkHit

logger = logging.getLogger(__name__)


class CrossEncoderReranker:
    """Lazy-loaded cross-encoder. Thread-safe singleton."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model = None

    def _load(self):
        if self._model is not None:
            return
        try:
            from sentence_transformers.cross_encoder import CrossEncoder  # type: ignore

            logger.info("Loading cross-encoder reranker: %s", self._model_name)
            self._model = CrossEncoder(self._model_name)
            logger.info("Cross-encoder reranker loaded.")
        except Exception as exc:
            logger.warning("Cross-encoder unavailable (%s) — skipping reranking.", exc)
            raise

    def rerank(
        self,
        query: str,
        hits: list[DocumentChunkHit],
        top_k: int,
    ) -> list[DocumentChunkHit]:
        """
        Score (query, passage) pairs and return the top_k hits sorted by
        cross-encoder relevance score.
        """
        if not hits:
            return hits

        try:
            self._load()
        except Exception:
            return hits[:top_k]

        pairs = [(query, hit.snippet or hit.content[:512]) for hit in hits]
        try:
            scores: list[float] = self._model.predict(pairs).tolist()  # type: ignore
        except Exception as exc:
            logger.warning("Cross-encoder prediction failed: %s", exc)
            return hits[:top_k]

        ranked = sorted(
            zip(hits, scores),
            key=lambda t: t[1],
            reverse=True,
        )
        return [h for h, _ in ranked[:top_k]]


def _build_reranker() -> CrossEncoderReranker | None:
    from app.core.config import get_settings

    s = get_settings()
    if not s.retrieval_enable_reranker:
        return None
    return CrossEncoderReranker(model_name=s.cross_encoder_model)


# Module-level singleton
_reranker: CrossEncoderReranker | None = _build_reranker()


def rerank_hits(
    query: str,
    hits: list[DocumentChunkHit],
    top_k: int,
) -> list[DocumentChunkHit]:
    """
    Public entry-point.  If reranker is disabled or unavailable returns
    hits[:top_k] unchanged.
    """
    if _reranker is None or not hits:
        return hits[:top_k]
    return _reranker.rerank(query=query, hits=hits, top_k=top_k)
