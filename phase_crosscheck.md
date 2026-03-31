# Phase 1 & Phase 2 Cross-Check

## Phase 1 — Platform Foundation and Auth

### ✅ Backend service (FastAPI) + local infra
- **FastAPI** app in [backend/app/main.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/main.py) with CORS, lifespan, 3 routers
- **PostgreSQL 16** in [docker-compose.yml](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/docker-compose.yml) with healthcheck
- **Milvus 2.5.5** + etcd + MinIO in [docker-compose.yml](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/docker-compose.yml)
- **[database.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/core/database.py)**: SQLAlchemy engine + `sessionmaker` + [get_db](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/core/database.py#19-25) dependency
- **[bootstrap.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/bootstrap.py)**: [initialize_database()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/bootstrap.py#26-30) calls `Base.metadata.create_all()` + [_sync_phase_two_schema()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/bootstrap.py#62-83) on every startup — zero-migration schema management

### ✅ Base relational schema

All tables exist in [models.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py):

| Table | Model | ✅ |
|-------|-------|----|
| `users` | [User](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#65-92) | Full: email, password_hash, role, TOTP, lockout, last_login |
| `sessions` | [Session](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#94-109) | Full: refresh_token_hash, revoked_at, expires_at, IP, user_agent |
| `audit_logs` | [AuditLog](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#111-125) | Full: actor, action, target_type/id, metadata_json |
| [documents](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py#86-105) | [Document](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#127-160) | Full: owner, kind, status, storage_path, checksum, chunks |
| [document_chunks](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py#107-131) | [DocumentChunk](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#162-185) | Full: chunk_index, lexical_terms, citation_label, embedding_model |
| `ingestion_jobs` | [IngestionJob](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#187-208) | Full: stage, progress, error, timestamps |
| `quizzes` / `quiz_questions` | [Quiz](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#210-228) + [QuizQuestion](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#230-239) | Shell ✅ (IRT difficulty field included) |
| `flashcard_decks` / `flashcards` | [FlashcardDeck](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#241-256) + [Flashcard](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#258-268) | Shell ✅ |
| `user_progress` | [UserProgress](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#270-283) | Shell ✅ (mastery_score + BKT probability) |
| `badges` / `user_badges` | [Badge](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/types/dashboard.ts#88-99) + [UserBadge](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py#298-308) | Shell ✅ (XP reward) |
| `leaderboard` | [LeaderboardEntry](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/types/dashboard.ts#79-87) | Shell ✅ (season, XP, streak, level) |

### ✅ Real auth endpoints (replacing mock)

All 5 endpoints implemented in [backend/app/api/routes/auth.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/auth.py) and wired in [AuthContext.tsx](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/context/AuthContext.tsx):

| Endpoint | Implemented | Frontend Connected |
|----------|-------------|-------------------|
| `POST /api/auth/register` | ✅ | ✅ [registerRequest()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts#65-79) |
| `POST /api/auth/login` | ✅ | ✅ [loginRequest()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts#53-64) |
| `GET /api/auth/me` | ✅ | ✅ [meRequest()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts#80-85) |
| `POST /api/auth/refresh` | ✅ | ✅ [refreshRequest()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts#86-91) |
| `POST /api/auth/logout` | ✅ | ✅ [logoutRequest()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts#92-97) |
| `POST /api/auth/forgot-password` | ✅ (audit log only, no email) | ✅ [forgotPasswordRequest()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts#98-104) |

### ✅ RBAC in API and frontend routing

- **API-level RBAC**: [deps.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py) exposes [get_current_user](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py#10-54) (any authenticated user) and [require_role(*roles)](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py#56-66) (role-gated dependency). Document routes check `user.role == UserRole.ADMIN` inline.
- **Frontend routing**: [middleware.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/middleware.ts) checks `medvision_token` + `medvision_role` cookies:
  - Students → `/dashboard/*` only
  - Admins → `/admin/dashboard/*` only
  - Authenticated users redirected away from auth pages

### ✅ bcrypt + JWT + refresh rotation + rate limiting + admin TOTP

| Requirement | Implementation | File |
|-------------|----------------|------|
| bcrypt hashing | `CryptContext(schemes=["bcrypt"])` | [security.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/core/security.py) |
| JWT access tokens | 15-minute HS256 JWT with `sub`, [role](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py#56-66), `sid`, `jti` | [security.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/core/security.py) |
| Refresh token rotation | Old session revoked on each refresh, new session created | [auth.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/schemas/auth.py) [refresh_session()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/auth.py#304-369) |
| Server-side session invalidation | `session.revoked_at` set on logout/refresh; [deps.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py) validates | [deps.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py), [auth.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/schemas/auth.py) |
| Rate limiting | Sliding window: 10 attempts / 60 seconds per email+IP | [auth.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/schemas/auth.py) [enforce_rate_limit()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/auth.py#117-127) |
| Account lockout | 5 failed attempts → 15-minute lockout persisted in DB | [auth.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/schemas/auth.py) [register_failed_attempt()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/auth.py#133-159) |
| Admin TOTP | `pyotp.TOTP.verify()` required for every admin login | [security.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/core/security.py), [auth.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/schemas/auth.py) |
| Lockout sync to frontend | `remainingAttempts` + `lockedUntil` returned in 401 detail | [AuthContext.tsx](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/context/AuthContext.tsx) `syncLockStateFromError()` |

### ✅ Acceptance Criteria — Phase 1
- ✅ Students can register and log in with real persisted accounts
- ✅ Admins can log in (TOTP required) to `/admin/dashboard`
- ✅ Server-side session invalidation via refresh token revocation
- ✅ Both roles see their respective dashboards

---

## Phase 2 — Content Ingestion and Indexing

### ✅ Upload APIs for PDFs, scanned docs, DICOM, images

`POST /api/documents/upload` in [documents.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/schemas/documents.py):
- Accepts `multipart/form-data` with [file](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/Dockerfile) + optional `is_shared` flag
- File type detection via extension + MIME type in [storage.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/storage.py) → `DocumentKind.PDF | .IMAGE | .DICOM`
- 50 MB upload size limit enforced server-side
- SHA-256 checksum computed and stored per document

### ✅ Ingestion jobs: full pipeline

[services/ingestion.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/ingestion.py) — [process_document_ingestion()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/ingestion.py#23-96) runs as a **FastAPI `BackgroundTask`**:

| Stage | Progress | Service | ✅ |
|-------|----------|---------|---|
| `UPLOADED` | 5% | On upload endpoint | ✅ |
| `EXTRACTING` | 20% | [extraction.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/extraction.py) | ✅ |
| `CHUNKING` | 55% | [chunking.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/chunking.py) | ✅ |
| `INDEXING` | 80% | [milvus_index.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/milvus_index.py) | ✅ |
| `COMPLETED` | 100% | [ingestion.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/ingestion.py) | ✅ |
| `FAILED` | — | [_mark_ingestion_failed()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/ingestion.py#121-142) | ✅ |

### ✅ Extraction engines

| Document type | Engine | Details |
|--------------|--------|---------|
| PDF | pypdf + PaddleOCR-VL 1.5 | PaddleOCR preferred; pypdf fallback; text-only fallback if neither |
| Scanned PDF | PaddleOCR-VL 1.5 | `enable_paddleocr_vl=True` in config; OCR pages override pypdf text |
| Image | PaddleOCR-VL 1.5 + metadata | Dimensions, color mode appended |
| DICOM | pydicom metadata | Modality, body part, resolution; **full PHI anonymization** (70+ fields) |

> **Fix applied (today):** `PaddleOCRVL()` now called with no args — previously `model_name=` kwarg caused `TypeError` → silent fallback → OCR never ran.

### ✅ Chunking with citation metadata

[services/chunking.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/chunking.py):
- Max 900 chars per chunk, 160-char overlap between consecutive chunks
- Heading detection: short ALL-CAPS lines or lines ending in `:` become `section_heading`
- Each chunk stores: `chunk_index`, `chunk_type`, `section_heading`, `page_start`, `page_end`, [content](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/extraction.py#48-55), `lexical_terms`, `citation_label` (`"Title - page N"`)
- Citation metadata persisted in both [document_chunks](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py#107-131) (PostgreSQL) and `documents.citation_metadata` (JSON)

### ✅ Embeddings

[services/embeddings.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/embeddings.py) — [HashEmbeddingService](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/embeddings.py#14-40):
- 256-dimensional deterministic hash vectors (lightweight Phase 2 placeholder)
- Token-based: lowercase alphanumeric tokenization
- L2-normalized output
- **Note:** This is explicitly a placeholder. Real semantic embeddings (e.g. sentence-transformers) are needed for Phase 3 to achieve meaningful dense retrieval quality.

### ✅ Milvus vector index

[services/milvus_index.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/milvus_index.py):
- Collection auto-created with COSINE / AUTOINDEX on first use
- Schema: `chunk_id` (PK), `document_id`, `owner_user_id`, `is_shared`, `page_start`, `page_end`, [content](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/extraction.py#48-55), `embedding` (float[256])
- [replace_document_chunks()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/milvus_index.py#85-111) deletes old vectors then bulk-inserts new ones
- Access control: `owner_user_id` + `is_shared` fields stored in Milvus for filter expressions

### ✅ Sparse retrieval (BM25)

[services/retrieval.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/retrieval.py) — [_lexical_scores()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/retrieval.py#114-130):
- `BM25Okapi` from `rank-bm25` over pre-tokenized `lexical_terms` stored in PostgreSQL
- Scores normalized to [0, 1]

### ✅ Hybrid retriever

[services/retrieval.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/retrieval.py) — [search_document_chunks()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/retrieval.py#13-91):
- Dense scores (Milvus cosine, normalized) weighted at **55%**
- Lexical scores (BM25, normalized) weighted at **45%**
- Combined ranking → top-K results with full citation objects

### ✅ Storage in PostgreSQL + Milvus

- PostgreSQL: [documents](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py#86-105), [document_chunks](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py#107-131), `ingestion_jobs` fully populated after ingestion
- Milvus: [document_chunks](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py#107-131) collection with embeddings and metadata

### ✅ Accessibility controls

- Students see only their own documents + shared admin documents
- Admins see all documents
- Filter applied in both [_get_accessible_documents()](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/retrieval.py#93-112) (PostgreSQL) and via Milvus field expressions

### ✅ Acceptance Criteria — Phase 2
- ✅ Uploaded material is searchable via `/api/documents/search`
- ✅ Documents are chunked with page-level citations
- ✅ Chunks linked to uploading user or shared admin content
- ✅ Ingestion status trackable via `GET /api/documents` (`ingestionStage`, `ingestionProgress`)

---

## ⚠️ Known Gaps (not blockers for Phase 1 & 2 acceptance)

| Gap | Impact | Phase |
|-----|--------|-------|
| No actual password-reset email | Forgot password is audit-logged only | 1 |
| Hash-based embeddings (not neural) | Dense retrieval quality is low | 2 |
| No LLM answer synthesis | Assistant returns raw search snippets | 3 |
| Quiz/flashcard CRUD APIs | Models exist; no endpoints yet | 3 |
| Progress/badge grant APIs | Models exist; no endpoints yet | 3 |
| Admin panel not backend-connected | All mock data | 3 |
