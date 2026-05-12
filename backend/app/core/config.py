from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_BACKEND_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Always resolve backend/.env even when process CWD is the repo root.
        env_file=(str(_BACKEND_ENV_FILE), ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = Field(
        default="MedVision Backend",
        validation_alias=AliasChoices("app_name", "APP_NAME"),
    )
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

    # ── Milvus ────────────────────────────────────────────────────────────────
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection_name: str = "document_chunks"
    milvus_uri: str = ""        # Zilliz Cloud: full https endpoint URL
    milvus_token: str = ""      # Zilliz Cloud: API key token

    # ── Embeddings (BioBERT) ──────────────────────────────────────────────────
    # Dimension MUST match the model. BioBERT → 768. Hash fallback → 256.
    embedding_dimensions: int = 768
    # HuggingFace model id or local path
    biobert_model_name: str = Field(
        default="dmis-lab/biobert-v1.1",
        validation_alias=AliasChoices("biobert_model_name", "BIOBERT_MODEL_NAME"),
    )
    # Override with a local directory to avoid downloading (air-gapped deployments)
    biobert_local_path: str | None = None
    # Batch size for encoding large document corpora during ingestion
    biobert_batch_size: int = 32

    # ── Storage ──────────────────────────────────────────────────────────────
    storage_root: str = "./storage"
    max_upload_size_mb: int = 50

    # ── OCR ──────────────────────────────────────────────────────────────────
    enable_paddleocr_vl: bool = True
    paddleocr_vl_use_doc_orientation_classify: bool = False
    paddleocr_vl_use_doc_unwarping: bool = False
    allow_ocr_fallback: bool = True

    # ── DICOM ────────────────────────────────────────────────────────────────
    enable_dicom_anonymization: bool = True

    # ── Bootstrap admin ──────────────────────────────────────────────────────
    bootstrap_admin_email: str = "admin@medvision.ai"
    bootstrap_admin_password: str = "Admin123!"
    bootstrap_admin_full_name: str = "MedVision Admin"
    bootstrap_admin_totp_secret: str = "JBSWY3DPEHPK3PXP"
    bootstrap_admin_totp_code: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "bootstrap_admin_totp_code",
            "BOOTSTRAP_ADMIN_TOTP_CODE",
        ),
    )

    # ── Admin allowlist (hard cap: only these emails can hold the admin role) ─
    # Comma-separated string of up to 3 admin emails. The bootstrap admin email
    # is always implicitly included.
    admin_allowed_emails: str = Field(
        default="",
        validation_alias=AliasChoices(
            "admin_allowed_emails",
            "ADMIN_ALLOWED_EMAILS",
        ),
    )
    admin_max_count: int = 3

    @property
    def admin_allowlist(self) -> set[str]:
        """Return the lowercase set of emails permitted to hold the admin role."""
        emails = {
            e.strip().lower()
            for e in (self.admin_allowed_emails or "").split(",")
            if e.strip()
        }
        if self.bootstrap_admin_email:
            emails.add(self.bootstrap_admin_email.strip().lower())
        return emails

    # ── Retrieval ────────────────────────────────────────────────────────────
    # Enable cross-encoder reranking after hybrid retrieval
    retrieval_enable_reranker: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "retrieval_enable_reranker",
            "RERANKER_ENABLED",
        ),
    )
    cross_encoder_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-6-v2",
        validation_alias=AliasChoices(
            "cross_encoder_model",
            "RERANKER_MODEL_NAME",
        ),
    )

    # ── Assistant (grounded RAG) ─────────────────────────────────────────────
    # Provider is now LOCAL by default. Cloud paths (gemini/openai) are
    # commented out in service code; flip provider here only if you re-enable.
    assistant_llm_provider: str = "openai"   # openai | ollama | none
    assistant_enable_verifier: bool = True   # faithfulness gate ON by default

    # ── Local LLM via Ollama (OpenAI-compatible at /v1/chat/completions) ─────
    # Run `ollama serve` then `ollama pull llama3.1:8b-instruct-q4_K_M` and
    # `ollama pull qwen2.5vl:7b-q4_K_M`. With 6 GB VRAM Ollama swaps models
    # in/out automatically, so loading both via the same daemon is fine.
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3.2:3b"
    ollama_vision_model: str = "qwen2.5vl:3b"
    ollama_request_timeout_s: int = 180
    ollama_chat_max_tokens: int = 1024
    ollama_temperature: float = 0.2
    # Cap context window to reduce KV-cache RAM. Llama 3.2 defaults to 128k
    # which requires ~13 GB KV cache. 4096 is sufficient for RAG use cases.
    ollama_num_ctx: int = 4096

    # region disabled-cloud-providers
    # ── DISABLED: cloud LLM providers (Gemini / OpenAI / OpenRouter) ─────────
    # These fields are kept so legacy `.env` files still parse, but the code
    # paths that read them are commented out. Re-enable a provider only by
    # restoring the corresponding service-layer code.
    assistant_openai_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "assistant_openai_api_key",
            "ASSISTANT_OPENAI_API_KEY",
            "OPENROUTER_API_KEY",
        ),
    )
    assistant_openai_base_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias=AliasChoices(
            "assistant_openai_base_url",
            "ASSISTANT_OPENAI_BASE_URL",
            "OPENROUTER_BASE_URL",
        ),
    )
    assistant_openai_model: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices(
            "assistant_openai_model",
            "ASSISTANT_OPENAI_MODEL",
            "OPENROUTER_MODEL",
        ),
    )
    assistant_openai_max_tokens: int = Field(
        default=512,
        validation_alias=AliasChoices(
            "assistant_openai_max_tokens",
            "ASSISTANT_OPENAI_MAX_TOKENS",
            "OPENROUTER_MAX_TOKENS",
        ),
    )
    assistant_gemini_api_key: str | None = None
    assistant_gemini_model: str = "gemini-2.5-flash-lite"
    # endregion disabled-cloud-providers

    # ── Agentic RAG ───────────────────────────────────────────────────────────
    agentic_max_iterations: int = 3
    agentic_context_score_threshold: float = 0.35
    agentic_enable_query_decomposition: bool = True

    # ── Vision provider ───────────────────────────────────────────────────────
    # "openai" — uses GPT-4o via OpenAI API (needs ASSISTANT_OPENAI_API_KEY).
    # "ollama" — uses ollama_vision_model (Qwen2.5-VL) via Ollama multimodal API.
    vision_provider: str = "openai"
    openai_vision_model: str = "gpt-4o"

    # region disabled-vision-cloud-providers
    vision_gemini_api_key: str | None = None
    vision_gemini_model: str = "gemini-2.5-flash-lite"
    vision_qwen_base_url: str | None = None
    vision_qwen_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "vision_qwen_api_key",
            "VISION_QWEN_API_KEY",
            "HF_TOKEN",
        ),
    )
    vision_qwen_model: str = "qwen2.5-vl"
    # endregion disabled-vision-cloud-providers

    # ── ML / Explainability ───────────────────────────────────────────────────
    # When False, GradCAM/LIME/SHAP fall back to lightweight proxies.
    # Defaults to True; override with ML_FEATURES_ENABLED=false if PyTorch is not installed.
    ml_features_enabled: bool = True
    # Path to CheXNet-style DenseNet121 weights (.pth). If empty, uses ImageNet pretrained.
    chexnet_weights_path: str | None = None
    # LIME parameters
    lime_num_samples: int = 200         # min 100 for stable Ridge; 200 good balance
    lime_num_superpixels: int = 80      # more segments = finer anatomical detail
    lime_max_runtime_seconds: int = 30
    # SHAP parameters (KernelSHAP on patch grid)
    shap_background_samples: int = 20  # legacy; unused since KernelSHAP rewrite
    shap_grid_size: int = 12           # 12x12 = 144 features; finer than 8x8
    shap_nsamples: int = 256           # more coalition draws = stabler values


@lru_cache
def get_settings() -> Settings:
    return Settings()


def invalidate_settings_cache() -> None:
    """Call this in tests or after .env changes to force a fresh Settings parse."""
    get_settings.cache_clear()
