"""
BioBERT-backed embedding service.

BioBERT (`dmis-lab/biobert-v1.1`) is a base BERT model — it has no trained
sentence-pooling head, so the previous `SentenceTransformer(...)` wrapper
silently mean-pooled untrained weights and produced poor embeddings.

This implementation loads BioBERT directly with HuggingFace `transformers`
(`AutoTokenizer` + `AutoModel`) and applies attention-mask-aware mean pooling
+ L2 normalisation, which is the correct way to derive sentence vectors
from a CLS-style BERT.

The model is lazy-loaded on first use so app startup stays fast, and the
service falls back to a deterministic hash embedder if `transformers`/`torch`
are not installed (keeps the app importable in lightweight test contexts).
"""
from __future__ import annotations

import logging
import math
import re
import threading

logger = logging.getLogger(__name__)

TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def tokenize_text(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


# ──────────────────────────────────────────────────────────────────────────────
# Hash-based fallback (no deps, deterministic)
# ──────────────────────────────────────────────────────────────────────────────

class HashEmbeddingService:
    """Deterministic lightweight embedding — used as fallback only."""

    def __init__(self, dimensions: int) -> None:
        self.dimensions = dimensions
        self.model_name = "hash-embedding-v1"

    def embed_text(self, text: str) -> list[float]:
        vector = [0.0] * self.dimensions
        tokens = tokenize_text(text)
        if not tokens:
            return vector
        for token in tokens:
            base = abs(hash(token))
            for offset in range(4):
                index = (base + offset * 1_315_423_911) % self.dimensions
                vector[index] += 1.0 / (offset + 1)
        norm = math.sqrt(sum(v * v for v in vector))
        if norm == 0:
            return vector
        return [v / norm for v in vector]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_text(t) for t in texts]


# ──────────────────────────────────────────────────────────────────────────────
# BioBERT service (transformers + torch, real loader)
# ──────────────────────────────────────────────────────────────────────────────

class BioBERTEmbeddingService:
    """
    Neural embedding service using BioBERT loaded via HuggingFace `transformers`.

    Model: `dmis-lab/biobert-v1.1` (768-dim hidden state).
    Pooling: attention-mask-weighted mean of last hidden states + L2 norm.
    Device: CUDA if available, else CPU. (BioBERT is ~440 MB; CPU is fine.)

    The model is lazy-loaded on first call to avoid blocking app startup,
    and protected by a lock so concurrent callers do not load it twice.
    """

    def __init__(
        self,
        model_name: str,
        local_path: str | None,
        dimensions: int,
        batch_size: int = 32,
        max_length: int = 512,
    ) -> None:
        self.model_name = model_name
        self._local_path = local_path
        self.dimensions = dimensions
        self._batch_size = batch_size
        self._max_length = max_length
        self._tokenizer = None
        self._model = None
        self._device = None
        self._load_lock = threading.Lock()

    # ── Lazy loader ──────────────────────────────────────────────────────────

    def _load(self) -> None:
        if self._model is not None:
            return
        with self._load_lock:
            if self._model is not None:  # double-checked lock
                return
            import torch  # type: ignore
            from transformers import AutoModel, AutoTokenizer  # type: ignore

            path = self._local_path or self.model_name
            logger.info("Loading BioBERT tokenizer + model from %s ...", path)
            tokenizer = AutoTokenizer.from_pretrained(path)
            model = AutoModel.from_pretrained(path)

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)
            model.eval()

            # Sanity-check dim against config
            hidden = int(getattr(model.config, "hidden_size", 0) or 0)
            if hidden and hidden != self.dimensions:
                logger.warning(
                    "BioBERT hidden_size=%d does not match configured "
                    "embedding_dimensions=%d. Using model hidden_size.",
                    hidden,
                    self.dimensions,
                )
                self.dimensions = hidden

            self._tokenizer = tokenizer
            self._model = model
            self._device = device
            logger.info(
                "BioBERT loaded on %s (dim=%d, max_length=%d).",
                device,
                self.dimensions,
                self._max_length,
            )

    # ── Pooling ──────────────────────────────────────────────────────────────

    @staticmethod
    def _mean_pool(last_hidden_state, attention_mask):  # type: ignore[no-untyped-def]
        """
        Mask-weighted mean pooling over token embeddings.

        last_hidden_state : (B, T, H)
        attention_mask    : (B, T) with 1 = real token, 0 = pad
        returns           : (B, H)
        """
        import torch  # type: ignore

        mask = attention_mask.unsqueeze(-1).to(last_hidden_state.dtype)
        summed = (last_hidden_state * mask).sum(dim=1)
        counts = mask.sum(dim=1).clamp(min=1e-9)
        return summed / counts

    # ── Public API ───────────────────────────────────────────────────────────

    def embed_text(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        self._load()
        import torch  # type: ignore
        import torch.nn.functional as F  # type: ignore

        out: list[list[float]] = []
        with torch.inference_mode():
            for i in range(0, len(texts), self._batch_size):
                batch = texts[i : i + self._batch_size]
                enc = self._tokenizer(  # type: ignore[union-attr]
                    batch,
                    padding=True,
                    truncation=True,
                    max_length=self._max_length,
                    return_tensors="pt",
                ).to(self._device)
                outputs = self._model(**enc)  # type: ignore[union-attr]
                pooled = self._mean_pool(outputs.last_hidden_state, enc["attention_mask"])
                pooled = F.normalize(pooled, p=2, dim=1)
                out.extend(pooled.detach().cpu().tolist())
        return out


# ──────────────────────────────────────────────────────────────────────────────
# Factory — chooses the right service based on config / availability
# ──────────────────────────────────────────────────────────────────────────────

def _build_embedding_service():
    from app.core.config import get_settings

    settings = get_settings()
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401

        return BioBERTEmbeddingService(
            model_name=settings.biobert_model_name,
            local_path=settings.biobert_local_path,
            dimensions=settings.embedding_dimensions,
            batch_size=settings.biobert_batch_size,
        )
    except ImportError:
        logger.warning(
            "transformers/torch not installed — falling back to hash embeddings "
            "(retrieval quality will be poor). "
            "Install with: pip install transformers torch"
        )
        return HashEmbeddingService(dimensions=settings.embedding_dimensions)


# Module-level singleton — importers use this directly.
embedding_service: BioBERTEmbeddingService | HashEmbeddingService = (
    _build_embedding_service()
)
