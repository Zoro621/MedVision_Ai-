from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


def _coerce_db_url(url: str) -> str:
    """
    Railway (and most PaaS) provide a DATABASE_URL with the scheme
    'postgresql://' or 'postgres://', which SQLAlchemy maps to psycopg2.
    We ship psycopg v3 (psycopg[binary]), so rewrite the scheme to
    'postgresql+psycopg://' before handing it to SQLAlchemy.
    """
    for old in ("postgres://", "postgresql://"):
        if url.startswith(old):
            return "postgresql+psycopg://" + url[len(old):]
    return url


class Base(DeclarativeBase):
    pass


engine = create_engine(_coerce_db_url(settings.database_url), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
