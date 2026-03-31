import hashlib
import mimetypes
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from fastapi import UploadFile

from app.core.config import get_settings
from app.models import DocumentKind
from app.services.dicom import anonymize_dicom_file

settings = get_settings()


@dataclass
class StoredUpload:
    path: str
    file_name: str
    title: str
    mime_type: str | None
    kind: DocumentKind
    file_size_bytes: int
    checksum_sha256: str
    storage_metadata: dict | None = None


def ensure_storage_root() -> Path:
    root = Path(settings.storage_root).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


def _hash_file(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as file_handle:
        while chunk := file_handle.read(1024 * 1024):
            hasher.update(chunk)
    return hasher.hexdigest()


def _hash_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


ARTIFACTS_DIRNAME: Final[str] = "_artifacts"


@dataclass
class StoredArtifact:
    path: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    checksum_sha256: str


def save_artifact_bytes(
    *,
    owner_user_id: str | None,
    document_id: str,
    file_name: str,
    mime_type: str,
    content: bytes,
) -> StoredArtifact:
    """
    Persist a derived artifact (e.g. heatmap png) under the same storage root
    used for uploads, so it survives refresh/restarts.
    """
    root = ensure_storage_root()
    owner_dir = owner_user_id or "shared"
    artifact_dir = (root / owner_dir / document_id / ARTIFACTS_DIRNAME).resolve()
    artifact_dir.mkdir(parents=True, exist_ok=True)

    target_path = artifact_dir / file_name
    target_path.write_bytes(content)

    return StoredArtifact(
        path=str(target_path),
        file_name=file_name,
        mime_type=mime_type,
        file_size_bytes=len(content),
        checksum_sha256=_hash_bytes(content),
    )


def resolve_storage_path(path: str) -> Path:
    """
    Resolve and validate a storage path.
    Keeps file reads scoped under STORAGE_ROOT to avoid path traversal.
    """
    root = ensure_storage_root()
    target = Path(path).resolve()
    if root not in target.parents and target != root:
        raise ValueError("Invalid storage path.")
    return target


def detect_kind(file_name: str, mime_type: str | None) -> DocumentKind:
    suffix = Path(file_name).suffix.lower()
    normalized_mime = (mime_type or "").lower()

    if suffix == ".pdf" or normalized_mime == "application/pdf":
        return DocumentKind.PDF
    if suffix in {".dcm", ".dicom"} or "dicom" in normalized_mime:
        return DocumentKind.DICOM
    return DocumentKind.IMAGE


async def save_upload_file(
    *,
    upload: UploadFile,
    owner_user_id: str,
    document_id: str,
) -> StoredUpload:
    root = ensure_storage_root()
    document_dir = root / owner_user_id / document_id
    document_dir.mkdir(parents=True, exist_ok=True)

    file_name = upload.filename or f"{document_id}.bin"
    target_path = document_dir / file_name

    size = 0
    with target_path.open("wb") as file_handle:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            file_handle.write(chunk)

    await upload.close()

    mime_type = upload.content_type or mimetypes.guess_type(file_name)[0]
    title = Path(file_name).stem.replace("_", " ").replace("-", " ").strip() or "Untitled"
    kind = detect_kind(file_name, mime_type)
    storage_metadata: dict | None = None

    if kind == DocumentKind.DICOM and settings.enable_dicom_anonymization:
        anonymization = anonymize_dicom_file(target_path)
        size = target_path.stat().st_size
        storage_metadata = {
            "dicomAnonymization": {
                "anonymized": anonymization.anonymized,
                "tagsBlanketed": anonymization.tags_blanketed,
                "tagsRemoved": anonymization.tags_removed,
                "privateTagsRemoved": anonymization.private_tags_removed,
                "note": anonymization.note,
            }
        }

    return StoredUpload(
        path=str(target_path),
        file_name=file_name,
        title=title,
        mime_type=mime_type,
        kind=kind,
        file_size_bytes=size,
        checksum_sha256=_hash_file(target_path),
        storage_metadata=storage_metadata,
    )
