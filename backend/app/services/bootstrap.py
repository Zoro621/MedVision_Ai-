from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import Base, engine
from app.core.security import build_avatar_initials, hash_password
from app.models import Badge, User, UserRole
from app.services.storage import ensure_storage_root


DEFAULT_BADGES = [
    {
        "slug": "first-case-complete",
        "name": "First Case Complete",
        "description": "Completed your first guided radiology case.",
        "xp_reward": 50,
    },
    {
        "slug": "streak-starter",
        "name": "Streak Starter",
        "description": "Maintained your learning streak for three days.",
        "xp_reward": 100,
    },
]


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    _sync_phase_two_schema()
    _sync_phase_four_schema()
    ensure_storage_root()


def seed_defaults(
    db: Session,
    *,
    admin_email: str,
    admin_password: str,
    admin_full_name: str,
    admin_totp_secret: str,
) -> None:
    existing_admin = db.scalar(select(User).where(User.email == admin_email.lower()))
    if existing_admin is None:
        db.add(
            User(
                email=admin_email.lower(),
                password_hash=hash_password(admin_password),
                full_name=admin_full_name,
                role=UserRole.ADMIN,
                avatar_initials=build_avatar_initials(admin_full_name),
                totp_secret=admin_totp_secret,
                totp_enabled=True,
            )
        )

    existing_badges = {badge.slug for badge in db.scalars(select(Badge)).all()}
    for badge in DEFAULT_BADGES:
        if badge["slug"] not in existing_badges:
            db.add(Badge(**badge))

    db.commit()


def _sync_phase_two_schema() -> None:
    statements = [
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(128)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS kind VARCHAR(32)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_engine VARCHAR(64)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ingestion_error TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
        "UPDATE documents SET kind = COALESCE(kind, LOWER(file_type), 'pdf')",
        "UPDATE documents SET chunk_count = COALESCE(chunk_count, 0)",
        "UPDATE documents SET is_shared = COALESCE(is_shared, FALSE)",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _sync_phase_four_schema() -> None:
    # Keep vision metadata in citation_metadata JSON so we avoid large migrations.
    # This function exists to preserve the "ALTER IF NOT EXISTS" pattern as we evolve.
    statements: list[str] = []
    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
