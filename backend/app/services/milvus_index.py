from dataclasses import dataclass
from typing import Any

from app.core.config import get_settings
from app.models import DocumentChunk

settings = get_settings()
MILVUS_ALIAS = "medvision"


@dataclass
class DenseMatch:
    chunk_id: str
    score: float


def _connect() -> None:
    from pymilvus import connections

    connections.connect(
        alias=MILVUS_ALIAS,
        host=settings.milvus_host,
        port=settings.milvus_port,
    )


def ensure_collection() -> Any:
    from pymilvus import Collection, CollectionSchema, DataType, FieldSchema, utility

    _connect()
    collection_name = settings.milvus_collection_name
    if not utility.has_collection(collection_name, using=MILVUS_ALIAS):
        schema = CollectionSchema(
            fields=[
                FieldSchema(
                    name="chunk_id",
                    dtype=DataType.VARCHAR,
                    is_primary=True,
                    auto_id=False,
                    max_length=36,
                ),
                FieldSchema(
                    name="document_id",
                    dtype=DataType.VARCHAR,
                    max_length=36,
                ),
                FieldSchema(
                    name="owner_user_id",
                    dtype=DataType.VARCHAR,
                    max_length=36,
                ),
                FieldSchema(name="is_shared", dtype=DataType.INT64),
                FieldSchema(name="page_start", dtype=DataType.INT64),
                FieldSchema(name="page_end", dtype=DataType.INT64),
                FieldSchema(
                    name="content",
                    dtype=DataType.VARCHAR,
                    max_length=8192,
                ),
                FieldSchema(
                    name="embedding",
                    dtype=DataType.FLOAT_VECTOR,
                    dim=settings.embedding_dimensions,
                ),
            ],
            description="Phase 2 document chunk embeddings",
        )
        collection = Collection(
            name=collection_name,
            schema=schema,
            using=MILVUS_ALIAS,
            shards_num=1,
        )
        collection.create_index(
            field_name="embedding",
            index_params={"index_type": "AUTOINDEX", "metric_type": "COSINE", "params": {}},
        )
    else:
        collection = Collection(collection_name, using=MILVUS_ALIAS)

    collection.load()
    return collection


def replace_document_chunks(
    *,
    document_id: str,
    owner_user_id: str,
    is_shared: bool,
    chunk_rows: list[DocumentChunk],
    embeddings: list[list[float]],
) -> None:
    collection = ensure_collection()
    delete_document_chunks(document_id=document_id)
    if not chunk_rows:
        return

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
    collection.flush()


def upsert_chunks(
    *,
    owner_user_id: str,
    is_shared: bool,
    chunk_rows: list[DocumentChunk],
    embeddings: list[list[float]],
) -> None:
    """
    Upsert a small set of chunks without wiping the full document.
    We delete by primary key (chunk_id) then insert.
    """
    if not chunk_rows:
        return
    if len(chunk_rows) != len(embeddings):
        raise ValueError("chunk_rows and embeddings length mismatch")

    collection = ensure_collection()
    quoted_ids = ", ".join(f'"{chunk.id}"' for chunk in chunk_rows)
    collection.delete(expr=f"chunk_id in [{quoted_ids}]")
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
    collection.flush()


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
