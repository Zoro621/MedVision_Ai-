"""
Milvus vector index — Phase 2+.

Automatically handles dimension migrations: if the existing collection was
created with a different embedding dimension (e.g. 256 from hash embeddings),
it will be dropped and recreated with the correct dimension. All document
chunks will be re-indexed on next ingestion.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)

MILVUS_ALIAS = "medvision"


@dataclass
class DenseMatch:
    chunk_id: str
    score: float


def _connect() -> None:
    from pymilvus import connections

    s = get_settings()
    if s.milvus_uri:
        connections.connect(
            alias=MILVUS_ALIAS,
            uri=s.milvus_uri,
            token=s.milvus_token,
        )
    else:
        connections.connect(
            alias=MILVUS_ALIAS,
            host=s.milvus_host,
            port=s.milvus_port,
        )


def _get_collection_dim(collection_name: str) -> int | None:
    """Return the vector dimension of an existing collection, or None."""
    try:
        from pymilvus import Collection

        col = Collection(collection_name, using=MILVUS_ALIAS)
        for field in col.schema.fields:
            if field.dtype.name == "FLOAT_VECTOR":
                return field.params.get("dim")
    except Exception:
        pass
    return None


def ensure_collection() -> Any:
    from pymilvus import Collection, CollectionSchema, DataType, FieldSchema, utility

    _connect()
    s = get_settings()
    collection_name = s.milvus_collection_name
    target_dim = s.embedding_dimensions

    if utility.has_collection(collection_name, using=MILVUS_ALIAS):
        existing_dim = _get_collection_dim(collection_name)
        if existing_dim is not None and existing_dim != target_dim:
            logger.warning(
                "Milvus collection %r has dim=%d but config requires dim=%d. "
                "Dropping and recreating — all chunks will need re-indexing.",
                collection_name,
                existing_dim,
                target_dim,
            )
            utility.drop_collection(collection_name, using=MILVUS_ALIAS)
        else:
            col = Collection(collection_name, using=MILVUS_ALIAS)
            col.load()
            return col

    # Create fresh collection
    schema = CollectionSchema(
        fields=[
            FieldSchema(
                name="chunk_id",
                dtype=DataType.VARCHAR,
                is_primary=True,
                auto_id=False,
                max_length=36,
            ),
            FieldSchema(name="document_id", dtype=DataType.VARCHAR, max_length=36),
            FieldSchema(name="owner_user_id", dtype=DataType.VARCHAR, max_length=36),
            FieldSchema(name="is_shared", dtype=DataType.INT64),
            FieldSchema(name="page_start", dtype=DataType.INT64),
            FieldSchema(name="page_end", dtype=DataType.INT64),
            FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=8192),
            FieldSchema(
                name="embedding",
                dtype=DataType.FLOAT_VECTOR,
                dim=target_dim,
            ),
        ],
        description=f"MedVision document chunk embeddings (dim={target_dim})",
    )
    collection = Collection(
        name=collection_name,
        schema=schema,
        using=MILVUS_ALIAS,
        shards_num=1,
    )
    collection.create_index(
        field_name="embedding",
        index_params={
            "index_type": "AUTOINDEX",
            "metric_type": "COSINE",
            "params": {},
        },
    )
    logger.info(
        "Created Milvus collection %r with dim=%d", collection_name, target_dim
    )
    collection.load()
    return collection


def replace_document_chunks(
    *,
    document_id: str,
    owner_user_id: str,
    is_shared: bool,
    chunk_rows: list,
    embeddings: list[list[float]],
) -> None:
    collection = ensure_collection()
    delete_document_chunks(document_id=document_id)
    if not chunk_rows:
        return

    _insert_rows(
        collection=collection,
        chunk_rows=chunk_rows,
        owner_user_id=owner_user_id,
        is_shared=is_shared,
        embeddings=embeddings,
    )
    collection.flush()


def upsert_chunks(
    *,
    owner_user_id: str,
    is_shared: bool,
    chunk_rows: list,
    embeddings: list[list[float]],
) -> None:
    """Upsert a small set of chunks without wiping the full document."""
    if not chunk_rows:
        return
    if len(chunk_rows) != len(embeddings):
        raise ValueError("chunk_rows and embeddings length mismatch")

    collection = ensure_collection()
    quoted_ids = ", ".join(f'"{chunk.id}"' for chunk in chunk_rows)
    collection.delete(expr=f"chunk_id in [{quoted_ids}]")
    _insert_rows(
        collection=collection,
        chunk_rows=chunk_rows,
        owner_user_id=owner_user_id,
        is_shared=is_shared,
        embeddings=embeddings,
    )
    collection.flush()


def _insert_rows(*, collection, chunk_rows, owner_user_id, is_shared, embeddings):
    collection.insert(
        [
            [chunk.id for chunk in chunk_rows],
            [chunk.document_id for chunk in chunk_rows],
            [owner_user_id for _ in chunk_rows],
            [1 if is_shared else 0 for _ in chunk_rows],
            [chunk.page_start for chunk in chunk_rows],
            [chunk.page_end for chunk in chunk_rows],
            [chunk.content[:8191] for chunk in chunk_rows],
            embeddings,
        ]
    )


def delete_document_chunks(*, document_id: str) -> None:
    collection = ensure_collection()
    collection.delete(expr=f'document_id == "{document_id}"')


def search_chunks(
    *,
    query_embedding: list[float],
    document_ids: list[str],
    top_k: int,
) -> list[DenseMatch]:
    if not document_ids:
        return []

    collection = ensure_collection()
    quoted_ids = ", ".join(f'"{doc_id}"' for doc_id in document_ids)
    results = collection.search(
        data=[query_embedding],
        anns_field="embedding",
        param={"metric_type": "COSINE", "params": {}},
        limit=max(top_k, 1),
        expr=f"document_id in [{quoted_ids}]",
        output_fields=["chunk_id"],
    )

    matches: list[DenseMatch] = []
    for hit in results[0]:
        matches.append(DenseMatch(chunk_id=hit.id, score=float(hit.score)))
    return matches
