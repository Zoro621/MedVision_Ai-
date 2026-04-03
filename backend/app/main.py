from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.documents import router as documents_router
from app.api.routes.flashcards import router as flashcards_router
from app.api.routes.health import router as health_router
from app.api.routes.progress import router as progress_router
from app.api.routes.quizzes import router as quizzes_router
from app.api.routes.vision import router as vision_router
from app.core.config import get_settings
from app.core.database import SessionLocal
from app.services.bootstrap import initialize_database, seed_defaults

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    db = SessionLocal()
    try:
        seed_defaults(
            db,
            admin_email=settings.bootstrap_admin_email,
            admin_password=settings.bootstrap_admin_password,
            admin_full_name=settings.bootstrap_admin_full_name,
            admin_totp_secret=settings.bootstrap_admin_totp_secret,
        )
    finally:
        db.close()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(documents_router, prefix=settings.api_prefix)
app.include_router(assistant_router, prefix=settings.api_prefix)
app.include_router(vision_router, prefix=settings.api_prefix)
app.include_router(quizzes_router, prefix=settings.api_prefix)
app.include_router(flashcards_router, prefix=settings.api_prefix)
app.include_router(progress_router, prefix=settings.api_prefix)


@app.get("/")
def root() -> dict:
    return {
        "name": settings.app_name,
        "apiPrefix": settings.api_prefix,
        "status": "running",
    }
