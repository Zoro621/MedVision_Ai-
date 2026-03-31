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

    # Module 3: grounded assistant (optional LLM synthesis)
    assistant_llm_provider: str = "none"  # "none" | "openai" | "gemini"
    assistant_openai_api_key: str | None = None
    assistant_openai_base_url: str = "https://api.openai.com/v1"
    assistant_openai_model: str = "gpt-4o-mini"
    assistant_enable_verifier: bool = False

    assistant_gemini_api_key: str | None = None
    assistant_gemini_model: str = "gemini-2.5-flash-lite"

    # Phase 4: Vision provider preference. "qwen" will be tried first (if configured),
    # and we fall back to gemini automatically when qwen isn't available.
    vision_provider: str = "qwen"  # qwen | gemini
    vision_gemini_api_key: str | None = None
    vision_gemini_model: str = "gemini-2.5-flash-lite"

    # Qwen2.5-VL (OpenAI-compatible server such as vLLM)
    vision_qwen_base_url: str | None = None  # e.g. http://localhost:8001/v1
    vision_qwen_api_key: str | None = None
    vision_qwen_model: str = "qwen2.5-vl"



@lru_cache
def get_settings() -> Settings:
    return Settings()
