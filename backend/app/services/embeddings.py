import math
import re

from app.core.config import get_settings

settings = get_settings()
TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


def tokenize_text(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text.lower())


class HashEmbeddingService:
    """Deterministic lightweight embedding service for Phase 2 indexing."""

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
                index = (base + offset * 1315423911) % self.dimensions
                vector[index] += 1.0 / (offset + 1)

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            return vector
        return [value / norm for value in vector]

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_text(text) for text in texts]


embedding_service = HashEmbeddingService(settings.embedding_dimensions)
