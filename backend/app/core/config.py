from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "MedVision Backend"
    api_prefix: str = "/api"
    frontend_origin: str = "http://localhost:3000"
    database_url: str = (
        "postgresql+psycopg://medvision:medvision@localhost:5432/medvision"
    )
    jwt_secret_key: str = Field(
        default="change-me-to-a-long-random-secret",
        min_length=32,
    )
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cookie_domain: str | None = None
    cookie_secure: bool = False
    milestone_env: str = "development"
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection_name: str = "document_chunks"
    embedding_dimensions: int = 256
    storage_root: str = "./storage"
    max_upload_size_mb: int = 50
    enable_paddleocr_vl: bool = True
    paddleocr_vl_use_doc_orientation_classify: bool = False
    paddleocr_vl_use_doc_unwarping: bool = False
    allow_ocr_fallback: bool = True
    enable_dicom_anonymization: bool = True
    bootstrap_admin_email: str = "admin@medvision.ai"
    bootstrap_admin_password: str = "Admin123!"
    bootstrap_admin_full_name: str = "MedVision Admin"
    bootstrap_admin_totp_secret: str = "JBSWY3DPEHPK3PXP"


@lru_cache
def get_settings() -> Settings:
    return Settings()
