# MedVision AI — PROJECT_UNDERSTANDING.md

This document describes the **MedVision AI** codebase as of the repository state used to generate it. It is intended for developers and AI assistants who need to work on the project **without reading every source file first**. Where behavior is ambiguous, uncertain, or broken in code, that is **called out explicitly**.

---

## 1. Project Overview

### 1.1 What is MedVision AI

**MedVision AI** is a **radiology education platform** (FYP-style prototype) that combines:

- **Document ingestion** (PDF, images, DICOM) with text extraction, chunking, and **hybrid retrieval** (dense vectors + BM25 + optional reranking).
- A **grounded assistant** (RAG / agentic loop) for questions over the learner’s materials, with optional **medical chat** mode (no retrieval).
- **Adaptive quizzes and flashcards** tied to **chat sessions** and weak-topic modeling, powered by **Gemini** when configured.
- **Gamification** (XP, streaks, badges, leaderboard) and **progress dashboards**.
- **Admin** tooling for content (quizzes/decks), analytics, and operational views (students, audit).
- **Vision** features: captioning, VQA, GradCAM-style heatmaps, optional LIME/SHAP/attention overlays, and hybrid text+image search.

**Target users:** radiology students (primary), platform administrators (content, analytics, user operations).

**Domain:** medical / radiology education, document-grounded Q&A, and imaging explainability demos.

### 1.2 Tech stack

| Layer | Technology |
|--------|------------|
| **Frontend** | Next.js (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI primitives (`components/ui/*`), Recharts, Lucide icons, Sonner toasts |
| **Backend** | Python 3, FastAPI, SQLAlchemy 2, Pydantic v2, Uvicorn |
| **Database** | PostgreSQL 16 (Docker) — primary relational store for users, content, traces, progress |
| **Vector DB** | Milvus 2.5 (standalone in Docker) — dense ANN search over chunk embeddings |
| **Object storage (infra)** | MinIO in Docker — **used by Milvus** as object storage backend; **application uploads** use **local filesystem** under `STORAGE_ROOT`, not the MinIO API |
| **AI / ML** | Google Gemini (Generative Language API) for assistant, adaptive generation, vision caption/VQA when configured; optional OpenAI-compatible Qwen-VL URL; sentence-transformers + BioBERT for embeddings; PyTorch/torchvision for GradCAM path when enabled |
| **Auth** | JWT (HS256) in **HTTP-only cookies**, server-side session rows, bcrypt passwords, TOTP for admins |

### 1.3 Architecture overview

```
Browser (Next.js :3000)
  ├─ cookies: medvision_token, medvision_refresh_token, medvision_role
  └─ fetch(..., credentials: "include") → FastAPI (:8000) /api/*

FastAPI
  ├─ PostgreSQL: users, documents, chunks, quizzes, chat, progress, traces, …
  ├─ Background tasks: document ingestion pipeline
  ├─ Milvus: vector index per chunk (embeddings from BioBERT or hash fallback)
  └─ Optional external HTTPS: Gemini, OpenAI

Docker Compose (see docker-compose.yml)
  postgres, etcd, minio, milvus, backend
```

**Data flow (RAG):** User asks question → `rag_agent.run_rag_agent` retrieves chunks via `search_document_chunks` (BM25 + Milvus + fusion + reranker) → LLM generates grounded answer (if provider not `none`) → optional verifier → persist `AssistantTrace` + `ChatMessage`.

**Reasoning steps — two storage paths:**

- **`assistant_traces.metadata_json`** (set in `_persist_trace`): includes `elapsedMs`, `iterations`, and **`reasoningSteps`** (the full step list from the agent loop). This is **persisted** for every successful turn.
- **`agent_steps` table:** Rows are only inserted inside `_log_step` when **`trace_id` is not `None`**. The current `run_assistant_turn` calls `run_rag_agent(..., trace_id=None)`, so **no `AgentStep` rows are written**.
- **API response:** `GET /assistant/ask` response builds `agentSteps` **only** from SQL `SELECT agent_steps WHERE trace_id = ...`, **not** from `metadata_json`. So the UI typically receives **`agentSteps: []`** even though **`reasoningSteps` exists on the trace** in the database — a **contract/UI gap** unless the route is changed to fall back to metadata or `trace_id` is passed into `run_rag_agent` after creating a placeholder trace.

---

## 2. Repository Structure

### 2.1 Root layout (conceptual)

| Path | Purpose |
|------|---------|
| `app/` | Next.js App Router pages and layouts |
| `components/` | UI: shared shadcn-style components, dashboard shell, admin shell, landing, auth helpers |
| `context/` | React contexts (`AuthContext`, `DashboardStatsContext`) |
| `lib/` | API clients, utils, validations, mock data |
| `types/` | Shared TypeScript types |
| `backend/` | FastAPI application (`app/` package) |
| `docker-compose.yml` | Postgres, etcd, MinIO, Milvus, backend service |
| `docker-compose.override.yml` | Local overrides (if present) |
| `package.json` | Frontend scripts and dependencies |
| `middleware.ts` | Route protection via cookies |
| `implementation_plan.md`, `phase_crosscheck.md`, `handoff.md`, `walkthrough.md`, `RUNNING.md` | Project notes (not required for runtime) |

### 2.2 Frontend (`app/`)

| Path | Description |
|------|-------------|
| `app/layout.tsx` | Root layout, global styles |
| `app/page.tsx` | Marketing / landing entry |
| `app/globals.css` | Global CSS |
| `app/(auth)/layout.tsx` | Auth section layout |
| `app/(auth)/login/page.tsx` | Student login |
| `app/(auth)/register/page.tsx` | Student registration |
| `app/(auth)/forgot-password/page.tsx` | Forgot password (API audit-only) |
| `app/dashboard/layout.tsx` | Student dashboard layout |
| `app/dashboard/page.tsx` | Dashboard home (stats, decks, gamification hooks) |
| `app/dashboard/settings/page.tsx` | Student settings |
| `app/dashboard/assistant/page.tsx` | RAG assistant UI + uploads |
| `app/dashboard/gradcam/page.tsx` | Vision / explainability UI |
| `app/dashboard/progress/page.tsx` | Progress views |
| `app/dashboard/quizzes/page.tsx` | Quiz list |
| `app/dashboard/quizzes/generate/page.tsx` | Generate quiz from chat session |
| `app/dashboard/quizzes/[quizId]/take/page.tsx` | Take quiz |
| `app/dashboard/quizzes/[quizId]/results/page.tsx` | Quiz results |
| `app/dashboard/flashcards/page.tsx` | Deck list |
| `app/dashboard/flashcards/study-chat/page.tsx` | Flashcard study in chat context |
| `app/dashboard/flashcards/[deckId]/page.tsx` | Deck detail |
| `app/dashboard/flashcards/[deckId]/study/page.tsx` | Study session |
| `app/dashboard/achievements/page.tsx` | Achievements |
| `app/admin/(auth)/layout.tsx` | Admin auth layout |
| `app/admin/(auth)/login/page.tsx` | Admin login (TOTP) |
| `app/admin/dashboard/layout.tsx` | Admin dashboard layout |
| `app/admin/dashboard/page.tsx` | Admin home |
| `app/admin/dashboard/analytics/page.tsx` | Admin analytics |
| `app/admin/dashboard/content/page.tsx` | Content hub |
| `app/admin/dashboard/content/quiz-builder/page.tsx` | Quiz builder |
| `app/admin/dashboard/content/flashcard-builder/page.tsx` | Flashcard builder |
| `app/admin/dashboard/students/page.tsx` | Student list (operations API) |
| `app/admin/dashboard/students/[studentId]/page.tsx` | Student detail (may use mock data — see code) |
| `app/admin/dashboard/audit-log/page.tsx` | Audit log |
| `app/admin/dashboard/system/page.tsx` | System status |
| `app/admin/dashboard/settings/page.tsx` | Admin settings |

### 2.3 Frontend shared (`components/`)

- **`components/ui/*`**: Large set of Radix-based primitives (button, dialog, form, table, chart wrappers, etc.) — design system for the app.
- **`components/dashboard/shell/*`**: `DashboardLayout`, `Sidebar`, `Topbar`, `MobileNav`.
- **`components/dashboard/ui/*`**: `StatCard`, `ProgressBar`, `StreakCalendar`, `DailyChallengeBanner`, `StudySessionSelector`, skeletons, etc.
- **`components/dashboard/charts/*`**: e.g. `TopicRadarChart`.
- **`components/dashboard/gradcam/*`**: Upload zone, viewer, evidence panel, analysis controls.
- **`components/admin/*`**: Admin layout, sidebar, topbar, charts, student table widgets; some imports reference **`lib/mockData/admin`** for counts/badges in shell chrome.
- **`components/landing/*`**: Landing sections + `ThreeScene` (Three.js).
- **`components/auth/*`**: Shared auth form visuals (password strength, lockout, etc.).
- **`components/theme-provider.tsx`**: Theme provider (next-themes).

### 2.4 Frontend API & utilities (`lib/`)

| File | Role |
|------|------|
| `lib/api/base.ts` | `getApiBaseUrl`, `apiUrl` — uses `NEXT_PUBLIC_API_BASE_URL` or infers `hostname:8000/api` |
| `lib/api/auth.ts` | Register, login, me, refresh, logout, forgot-password |
| `lib/api/documents.ts` | Upload, list, chunks, search |
| `lib/api/assistant.ts` | `askAssistant`, sessions |
| `lib/api/vision.ts` | Vision analyze, traces, artifacts |
| `lib/api/quizzes.ts` | Quiz CRUD-style calls, generate, submit, attempts |
| `lib/api/flashcards.ts` | Decks, due cards, review |
| `lib/api/progress.ts` | `getDashboardStats`, `getWeakAreas` |
| `lib/api/gamification.ts` | Gamification summary |
| `lib/api/adminContent.ts` | Admin quiz/deck CRUD |
| `lib/api/adminAnalytics.ts` | Admin analytics |
| `lib/api/adminOperations.ts` | Paginated students, suspend, reset password, audit log page |
| `lib/activeSession.ts` | Persist selected chat session id (localStorage) |
| `lib/studySession.ts` | Study session helpers |
| `lib/dashboard/currentUser.ts` | Display user helpers |
| `lib/utils.ts` | `cn` etc. |
| `lib/validations/authSchemas.ts` | Zod schemas for auth forms |
| `lib/mockData/dashboard.ts` | Mock dashboard data (legacy / fallback) |
| `lib/mockData/admin.ts` | Mock admin data for some UI components |

### 2.5 Backend (`backend/app/`)

| Path | Description |
|------|-------------|
| `main.py` | FastAPI app, CORS, router includes, lifespan (bootstrap DB + seed) |
| `models.py` | SQLAlchemy ORM models |
| `core/config.py` | Pydantic `Settings` / env |
| `core/database.py` | Engine, session, `Base` |
| `core/security.py` | JWT, cookies names, bcrypt, TOTP |
| `api/deps.py` | `get_current_user`, `require_role` |
| `api/routes/*.py` | Feature routers (see section 4) |
| `schemas/*.py` | Pydantic request/response models |
| `services/*.py` | Business logic (ingestion, retrieval, assistant, gamification, etc.) |

### 2.6 What lives where

- **Frontend:** All React/Next UI, client-side API wrappers, routing, cookie-based redirects in `middleware.ts`.
- **Backend:** Persistence, auth, LLM calls, retrieval, vision processing, admin aggregation.
- **Shared:** No shared package; **TypeScript types** in `types/` mirror backend concepts manually. **API contracts** must be kept in sync by convention.

---

## 3. Database Schema

All tables are created via SQLAlchemy `Base.metadata.create_all()` at startup, plus **ad-hoc ALTER** statements in `bootstrap.py` for legacy DB compatibility.

### 3.1 Tables — columns, types, relationships

**Note:** SQLAlchemy `Mapped[...]` types below are logical; PostgreSQL uses appropriate types (e.g. `TIMESTAMPTZ`, `JSON`/`JSONB`).

#### `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | UUID string (36) | PK |
| `email` | string | unique |
| `password_hash` | string | bcrypt |
| `full_name` | string | |
| `role` | enum `student` / `admin` | `UserRole` |
| `institution_type` | string?, nullable | |
| `training_level` | string?, nullable | |
| `radiology_focus` | JSON list?, nullable | |
| `referral_source` | string?, nullable | |
| `avatar_initials` | string | |
| `is_active` | bool | |
| `failed_login_attempts` | int | |
| `locked_until` | datetime?, tz | |
| `last_login_at` | datetime?, tz | |
| `totp_secret` | string?, nullable | |
| `totp_enabled` | bool | |
| `created_at`, `updated_at` | datetime | |

**Relationships:** `sessions` one-to-many.

#### `sessions`

| Column | Type |
|--------|------|
| `id` | PK UUID |
| `user_id` | FK → `users.id` **ON DELETE CASCADE** |
| `refresh_token_hash` | string (SHA-256 of refresh JWT) |
| `user_agent`, `ip_address` | optional |
| `expires_at` | datetime |
| `revoked_at` | datetime? |
| `created_at` | datetime |

#### `audit_logs`

| Column | Type |
|--------|------|
| `id` | PK |
| `actor_user_id` | FK → `users.id` **ON DELETE SET NULL**, nullable |
| `action` | string |
| `target_type` | string |
| `target_id` | string?, nullable |
| `metadata_json` | JSON?, nullable |
| `created_at` | datetime |

#### `documents`

| Column | Type |
|--------|------|
| `id` | PK |
| `owner_user_id` | FK → `users.id` **SET NULL** |
| `title`, `file_name` | string |
| `mime_type` | string?, nullable |
| `file_type` | string |
| `kind` | enum: `pdf`, `image`, `dicom` |
| `storage_path` | string?, nullable |
| `file_size_bytes` | int?, nullable |
| `checksum_sha256` | string?, nullable |
| `page_count` | int?, nullable |
| `chunk_count` | int |
| `extraction_engine` | string?, nullable |
| `extracted_text` | text?, nullable |
| `ingestion_error` | text?, nullable |
| `is_shared` | bool |
| `status` | enum: `pending`, `processing`, `ready`, `failed` |
| `citation_metadata` | JSON?, nullable |
| `created_at`, `updated_at` | datetime |

#### `document_chunks`

| Column | Type |
|--------|------|
| `id` | PK |
| `document_id` | FK → `documents.id` **CASCADE** |
| `chunk_index` | int | **UNIQUE** with `document_id` |
| `chunk_type` | string |
| `section_heading` | string?, nullable |
| `page_start`, `page_end` | int |
| `content` | text |
| `lexical_terms` | JSON list?, nullable |
| `citation_label` | string |
| `embedding_model` | string?, nullable |
| `citation_metadata` | JSON?, nullable |
| `created_at` | datetime |

#### `ingestion_jobs`

| Column | Type |
|--------|------|
| `id` | PK |
| `document_id` | FK **CASCADE** |
| `stage` | enum `IngestionStage` |
| `status` | `DocumentStatus` |
| `progress` | int |
| `error_message` | text?, nullable |
| `metadata_json` | JSON?, nullable |
| `created_at`, `started_at`, `completed_at` | datetime |

#### `quizzes`

| Column | Type |
|--------|------|
| `id` | PK |
| `title`, `description` | text / optional |
| `topic` | string?, nullable, indexed |
| `chat_session_id` | FK → `chat_sessions.id` **SET NULL**, nullable |
| `document_id` | FK → `documents.id` **SET NULL**, nullable |
| `status` | enum `draft` / `published` / `archived` |
| `difficulty` | enum beginner/intermediate/advanced?, nullable |
| `estimated_minutes` | int |
| `created_by_user_id` | FK users **SET NULL** |
| `created_at`, `updated_at` | datetime |

**Relationships:** `questions` → `quiz_questions`.

#### `quiz_questions`

| Column | Type |
|--------|------|
| `id` | PK |
| `quiz_id` | FK **CASCADE** |
| `chat_session_id` | FK **SET NULL**, nullable |
| `prompt` | text |
| `topic` | string?, nullable |
| `difficulty` | int?, nullable |
| `options_json` | JSON list of `{label, text}` |
| `correct_answer` | string? (e.g. `A`–`D`) |
| `explanation` | text?, nullable |
| `source_document`, `source_page` | optional |
| `irt_*` | optional IRT fields |
| `order_index` | int |

#### `flashcard_decks`

| Column | Type |
|--------|------|
| `id` | PK |
| `title`, `description` | |
| `topic` | string?, nullable |
| `chat_session_id` | FK **SET NULL** |
| `document_id` | FK **SET NULL** |
| `status` | `ContentStatus` |
| `created_by_user_id` | FK **SET NULL** |
| `created_at`, `updated_at` | datetime |

#### `flashcards`

| Column | Type |
|--------|------|
| `id` | PK |
| `deck_id` | FK **CASCADE** |
| `chat_session_id` | FK **SET NULL** |
| `front_text`, `back_text` | text |
| `topic` | string?, nullable |
| `difficulty` | int?, nullable |
| `source_document`, `source_page` | optional |
| `tag_list` | JSON?, nullable |
| `order_index` | int |

#### `user_progress`

| Column | Type |
|--------|------|
| `id` | PK |
| `user_id` | FK **CASCADE** |
| `topic_slug` | string | **UNIQUE** per user |
| `mastery_score` | int |
| `bkt_mastery_probability` | int?, nullable |
| `weak_area_score` | int?, nullable |
| `updated_at` | datetime |

#### `badges` / `user_badges`

Standard slug/name/description/xp_reward; `user_badges` links user ↔ badge with `awarded_at`.

#### `leaderboard`

| Column | Type |
|--------|------|
| `id` | PK |
| `user_id` | FK **CASCADE** |
| `season` | string | **UNIQUE** with `user_id` |
| `xp`, `streak_days`, `level` | int |
| `updated_at` | datetime |

#### `chat_sessions`

| Column | Type |
|--------|------|
| `id` | PK |
| `user_id` | FK **CASCADE** |
| `title` | string |
| `created_at`, `updated_at` | datetime |

#### `chat_messages`

| Column | Type |
|--------|------|
| `id` | PK |
| `chat_session_id` | FK **CASCADE** |
| `role` | string |
| `content` | text |
| `citations_json` | JSON?, nullable |
| `confidence` | int?, nullable |
| `trace_id` | string?, nullable |
| `created_at` | datetime |

#### `assistant_traces`

| Column | Type |
|--------|------|
| `id` | PK |
| `chat_session_id` | FK **CASCADE** |
| `user_id` | FK **CASCADE** |
| `question`, `answer` | text |
| `retrieval_mode` | string |
| `top_k` | int |
| `model_provider`, `model_name` | strings |
| `hits_json`, `citations_json` | JSON |
| `faithfulness_passed` | bool?, nullable |
| `verifier_notes` | text?, nullable |
| `metadata_json` | JSON?, nullable |
| `created_at` | datetime |

#### `vision_traces` / `vision_artifacts`

Store vision API runs and file artifacts (e.g. GradCAM PNG) with FK to `documents` and `vision_traces`.

#### Phase 5+ learning tables (see comment in `models.py`)

- **`quiz_attempts`**: `quiz_id`, `user_id`, `chat_session_id?`, score, counts, time, xp, `answers_json`, `wrong_topics_json`, `completed_at`.
- **`flashcard_reviews`**: SM-2 state per `(user_id, chat_session_id, flashcard_id)` unique.
- **`flashcard_review_events`**: audit stream of reviews + xp.
- **`chat_topic_progress`**: per chat session topic stats + BKT fields.
- **`shown_quiz_questions`**, **`shown_flashcards`**: non-repetition tracking per chat session.
- **`user_streaks`**: one row per user (XP, level, streak).
- **`agent_steps`**: FK `trace_id` → `assistant_traces.id`, step index, type, JSON in/out, timing.

### 3.2 Foreign keys summary

- **User** is central: sessions, documents (owner), chat sessions, attempts, progress, streaks, traces, etc.
- **Quiz/flashcard** content links optionally to **chat_sessions** and **documents** for scoped adaptive content.
- **Cascade** deletes propagate from quizzes/decks to questions/cards/reviews as modeled.

### 3.3 Phase attribution (tables)

| Phase | Tables / additions |
|-------|----------------------|
| **Phase 1** | `users`, `sessions`, `audit_logs` |
| **Phase 2** | `documents`, `document_chunks`, `ingestion_jobs`; Milvus external |
| **Phase 3** (assistant) | `chat_sessions`, `chat_messages`, `assistant_traces` |
| **Phase 4** (vision) | `vision_traces`, `vision_artifacts` |
| **Phase 5** (learning engine) | `quiz_attempts`, `flashcard_reviews`, `flashcard_review_events`, `chat_topic_progress`, `shown_quiz_questions`, `shown_flashcards`, `user_streaks`; extended quiz/flashcard/chat FKs |
| **Phase 6+** | Gamification usage of badges/leaderboard; analytics |
| **Phase 7** (agentic RAG) | `agent_steps` |

Exact phase naming in documentation may vary; **`models.py`** marks “Phase 5: Learning Engine tables” before `QuizAttempt`.

---

## 4. Backend — API Endpoints

**Global prefix:** `settings.api_prefix` default **`/api`**.  
**Auth:** Unless noted, protected routes use **`get_current_user`**: JWT from cookie `medvision_token`, session not revoked, session row valid.

Below, **“cookie auth”** means browser sends cookies; responses may also include JSON `accessToken` for clients that read it (frontend primarily uses cookies).

### 4.1 Health & root

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| GET | `/` | No | — | `{"name","apiPrefix","status"}` |
| GET | `/api/health` | No (DB session used) | — | `status`, `database`, `milvus` host/port info |

### 4.2 Auth (`/api/auth`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/register` | No | `RegisterRequest` (fullName, email, password, institutionType, trainingLevel, radiologyFocus, referralSource?) | `{ message }` **201** |
| POST | `/login` | No | `LoginRequest` (email, password, role, totpCode? for admin) | `AuthResponse` + **sets cookies** |
| GET | `/me` | Cookie JWT | — | `AuthUser` |
| POST | `/refresh` | Refresh cookie | — | `AuthResponse` + **rotates cookies** |
| POST | `/logout` | Refresh optional | — | `{ message }` + clears cookies |
| POST | `/forgot-password` | No | `{ email }` | Generic message (**no email sent**; audit log if user exists) |

**Implementation notes:** Rate limit + lockout on login; admin requires TOTP when `totp_enabled` on user.

### 4.3 Documents (`/api/documents`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/upload` | Yes | `multipart/form-data`: `file`, `is_shared` (form) | `DocumentSummary` **202**; background ingestion |
| GET | `` | Yes | — | `{ documents: DocumentSummary[] }` |
| GET | `/{document_id}/chunks` | Yes | — | `DocumentChunkResponse[]` |
| POST | `/search` | Yes | `DocumentSearchRequest` (query, topK, documentIds?) | `DocumentSearchResponse` (hits, totalHits, retrievalMode) |

### 4.4 Assistant (`/api/assistant`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/sessions` | Yes | — | `AssistantSessionSummary[]` |
| POST | `/ask` | Yes | `AssistantAskRequest` (question, chatSessionId?, topK, documentIds?, mode `rag` \| `medical_chat`) | `AssistantAskResponse` (chatSessionId, traceId, answer, confidence, citations, agentSteps) |

### 4.5 Vision (`/api/vision`)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/documents/{document_id}/caption` | Yes | — | `VisionCaptionResponse` |
| POST | `/documents/{document_id}/vqa` | Yes | `VisionVqaRequest` | `VisionVqaResponse` |
| POST | `/documents/{document_id}/gradcam` | Yes | — | `VisionGradcamResponse` |
| POST | `/documents/{document_id}/lime` | Yes | `VisionVqaRequest` (question) | `VisionLimeResponse` |
| POST | `/documents/{document_id}/shap` | Yes | — | `VisionShapResponse` |
| POST | `/documents/{document_id}/attention` | Yes | `VisionVqaRequest` | `VisionAttentionResponse` |
| POST | `/documents/{document_id}/analyze` | Yes | `VisionAnalyzeRequest` | `VisionAnalyzeResponse` (combined) |
| GET | `/traces/{trace_id}` | Yes | — | `VisionTraceResponse` |
| GET | `/artifacts/{artifact_id}` | Yes | — | **File download** (`FileResponse`) |
| POST | `/search` | Yes | `VisionSearchRequest` | `VisionSearchResponse` |

### 4.6 Quizzes (`/api/quizzes`)

| Method | Path | Auth | Body / query | Response |
|--------|------|------|--------------|----------|
| POST | `/generate` | Yes | `QuizGenerationRequest` (chatSessionId, count) | `QuizDetailOut` |
| GET | `` | Yes | `?chatSessionId=` optional | `QuizOut[]` (empty if no chatSessionId and not admin) |
| GET | `/{quiz_id}` | Yes | `?chatSessionId=` | `QuizDetailOut` |
| POST | `/{quiz_id}/submit` | Yes | `QuizSubmitRequest` | `QuizSubmitResult` |
| GET | `/{quiz_id}/attempts` | Yes | `?chatSessionId=` | `QuizAttemptOut[]` |
| GET | `/attempts/{attempt_id}` | Yes | — | `QuizAttemptDetailOut` |

**Stub / limitation notes:**

- **Generate** requires **Gemini** (`assistant_gemini_api_key`) and chat context; otherwise **502/400**.
- **GET quiz detail** includes **`correctAnswer` in each question** — clients receive answers before submit (integrity risk for untrusted clients).

### 4.7 Flashcards (`/api/flashcards`)

| Method | Path | Auth | Body / query | Response |
|--------|------|------|--------------|----------|
| POST | `/generate` | Yes | `FlashcardGenerationRequest` | `FlashcardDeckDetailOut` |
| GET | `/decks` | Yes | `?chatSessionId=` | `FlashcardDeckOut[]` |
| GET | `/decks/{deck_id}` | Yes | `?chatSessionId=` | `FlashcardDeckDetailOut` |
| GET | `/decks/{deck_id}/due` | Yes | `?chatSessionId=` | `FlashcardOut[]` |
| POST | `/decks/{deck_id}/review` | Yes | `FlashcardReviewRequest` (cardId, rating, chatSessionId) | `FlashcardReviewResponse` |

### 4.8 Progress (`/api/progress`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/stats` | Yes | `DashboardStatsOut` |

**Frontend `lib/api/progress.ts` references `/progress/weak-areas` — that route does not exist in `progress.py`.** `getWeakAreas()` would **404** unless added elsewhere.

### 4.9 Gamification (`/api/gamification`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/summary` | Yes | `GamificationSummaryOut` |

### 4.10 Admin analytics (`/api/admin/analytics`)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/overview` | **Admin** | `AdminOverviewOut` |
| GET | `/report` | **Admin** | `AdminAnalyticsReportOut` |

### 4.11 Admin content (`/api/admin`)

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| GET | `/quizzes` | Admin | List summaries |
| GET | `/quizzes/{quiz_id}` | Admin | Detail |
| POST | `/quizzes` | Admin | Create |
| PUT | `/quizzes/{quiz_id}` | Admin | Replace questions |
| POST | `/quizzes/{quiz_id}/publish` | Admin | |
| POST | `/quizzes/{quiz_id}/archive` | Admin | |
| DELETE | `/quizzes/{quiz_id}` | Admin | **204** |
| GET | `/flashcard-decks` | Admin | |
| GET | `/flashcard-decks/{deck_id}` | Admin | |
| POST | `/flashcard-decks` | Admin | |
| PUT | `/flashcard-decks/{deck_id}` | Admin | |
| POST | `/flashcard-decks/{deck_id}/publish` | Admin | |
| POST | `/flashcard-decks/{deck_id}/archive` | Admin | |
| DELETE | `/flashcard-decks/{deck_id}` | Admin | **204** |

### 4.12 Admin operations (`/api/admin`)

**Critical:** `backend/app/api/routes/admin_operations.py` **imports `UserStatus` from `app.models`, which does not exist**. Importing this module **raises `ImportError`**, which prevents loading `app.main` if this router is imported. **Treat current admin operations routes as broken until fixed.**

Documented **intended** surface (from source):

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/students` | Admin | Legacy student list |
| GET | `/students/{id}` | Admin | Student detail |
| GET | `/audit-logs` | Admin | Legacy audit list |
| GET | `/system` | Admin | System status |
| GET | `/operations/students` | Admin | Paginated students |
| POST | `/operations/students/{id}/suspend` | Admin | Suspend (implementation references non-existent user status) |
| POST | `/operations/students/{id}/reset-password` | Admin | **Bug:** assigns `user.hashed_password` but model field is **`password_hash`** |
| GET | `/operations/audit-log` | Admin | **Bug:** uses `AuditLog.user_id` / `resource_id` — real columns are **`actor_user_id`**, **`target_type`**, **`target_id`** |

---

## 5. Backend — Services & Logic

### 5.1 Service files (role summary)

| Service | Role |
|---------|------|
| `bootstrap.py` | `create_all`, phase ALTER migrations, storage root, seed admin + badges + demo quizzes/decks |
| `ingestion.py` | Background pipeline: extract → chunk → embed → Milvus replace |
| `extraction.py` | PDF/image/DICOM text extraction |
| `chunking.py` | Split extracted text into `DocumentChunk` drafts |
| `embeddings.py` | BioBERT via sentence-transformers, or hash fallback |
| `milvus_index.py` | Collection lifecycle, upsert/replace/search |
| `retrieval.py` | Hybrid BM25 + Milvus + RRF + reranker |
| `reranker.py` | Cross-encoder reranking |
| `storage.py` | Local file save, artifact save, path resolve |
| `dicom.py` | DICOM anonymization |
| `assistant.py` | Chat session CRUD helpers, `run_assistant_turn` orchestration |
| `rag_agent.py` | Agentic RAG loop: retrieve → score → generate → verify → fallback |
| `adaptive_learning.py` | Chat scope, weak topics, Gemini quiz/deck generation, BKT progress hooks |
| `bkt.py` | Bayesian Knowledge Tracing (simplified) |
| `sm2.py` | SM-2 spaced repetition |
| `gamification.py` | Badges, leaderboard rows, daily/weekly UI rows |
| `progress_state.py` | Levels, streak updates |
| `admin_analytics.py` | Admin overview/report |
| `admin_operations.py` | Student list/detail, audit list, system status |
| `audit_log.py` | Write audit entries |
| `vision_llm.py`, `vision_io.py` | Caption/VQA provider glue |
| `gradcam.py`, `lime_explainer.py`, `shap_explainer.py`, `attention_viz.py` | Explainability |

### 5.2 Adaptive learning (`adaptive_learning.py`)

- **Scope:** Builds `ChatSessionScope` from recent messages + chunk IDs from recent `AssistantTrace.hits_json` + documents; infers **topics** via keyword scores + `ChatTopicProgress`.
- **Weak topics:** Ranked by failure rate / incorrect counts for **Gemini quiz** prompts (~70% weak / ~30% other split when weak topics exist).
- **Non-repetition:** Tracks `ShownQuizQuestion` / `ShownFlashcard` and prior stems/fronts; duplicate detection via normalized text + `difflib` ratio threshold **0.88**; up to **2** Gemini calls to fill quota.
- **Gemini:** Uses `assistant_gemini_api_key` + `assistant_gemini_model`; REST `generateContent` with JSON MIME type.

### 5.3 RAG pipeline

1. **Ingestion:** `process_document_ingestion` deletes old chunks, recomputes chunks, `embedding_service.embed_texts`, `replace_document_chunks` in Milvus.
2. **Chunking:** `chunk_document` (structure in `chunking.py`).
3. **Search:** `search_document_chunks` loads accessible chunks for user, BM25 on `lexical_terms`, Milvus dense search, **0.55/0.45** fusion, rerank top `4× top_k` candidates down to `top_k`.

### 5.4 SM-2 (`sm2.py`)

- Ratings map: `again`→0, `hard`→1, `good`→2, `easy`→3 internal.
- Updates ease factor (min 1.3), interval days, repetitions, `next_review_date`.

### 5.5 BKT (`bkt.py`)

- Parameters: `p_learn=0.2`, `p_forget=0.05`, `p_slip=0.1`, `p_guess=0.25`.
- `batch_update_mastery` applies sequential updates for correct/incorrect counts per topic.
- Stored as integer **0–100** in `mastery_score` / `bkt_mastery_probability` fields in progress rows (**same value** used in adaptive_learning updates).

### 5.6 `bootstrap.py` startup

1. `initialize_database()`: `create_all`, `_sync_phase_two_schema`, `_sync_phase_four_schema`, `_sync_phase_five_schema`, `ensure_storage_root()`.
2. `seed_defaults()`: create **admin user** if missing (email/password/TOTP from settings), seed **badges**, `seed_learning_content()` (demo quizzes + decks if absent).

---

## 6. Frontend — Pages & Routes

**Component library:** Radix UI + Tailwind; **`components/ui/*`** is the primary design system.

### 6.1 Pages and primary API usage

| Route | Renders | API / data |
|-------|---------|------------|
| `/` | Landing | Mostly static; Three.js scene |
| `/login`, `/register`, `/forgot-password` | Auth | `auth.ts` |
| `/dashboard` | Overview | `getDashboardStats`, `listDecks`, `getGamificationSummary`, `getWeakAreas` (**broken endpoint**), `getActiveSession` |
| `/dashboard/assistant` | Chat + uploads | `listDocuments`, `uploadDocument`, `askAssistant`, active session |
| `/dashboard/gradcam` | Vision analysis | `vision.ts` |
| `/dashboard/progress` | Progress | stats / progress APIs |
| `/dashboard/quizzes` | Quiz list | `listQuizzes` |
| `/dashboard/quizzes/generate` | Generate | `generateQuiz` |
| `/dashboard/quizzes/[id]/take` | Take | `getQuiz`, `submitQuiz` |
| `/dashboard/quizzes/[id]/results` | Results | attempt detail fetch |
| `/dashboard/flashcards/*` | Decks / study | `flashcards.ts` |
| `/dashboard/achievements` | Achievements | gamification |
| `/dashboard/settings` | Settings | user context |
| `/admin/login` | Admin login | `auth.ts` with admin role + TOTP |
| `/admin/dashboard` | Admin home | analytics / content links |
| `/admin/dashboard/analytics` | Analytics | `adminAnalytics.ts` |
| `/admin/dashboard/content/*` | Builders | `adminContent.ts` |
| `/admin/dashboard/students` | Students | `adminOperations.ts` |
| `/admin/dashboard/students/[id]` | Student detail | **may use `lib/mockData/admin`** per imports — verify file |
| `/admin/dashboard/audit-log` | Audit | `adminOperations.ts` |
| `/admin/dashboard/system` | System | admin API |

### 6.2 Mock vs live data

- **Mock:** `lib/mockData/*`; some **admin shell** components still import mock constants for display badges/counts.
- **Live:** Dashboard stats, assistant, documents, most quiz/flashcard flows when backend is up.

---

## 7. Authentication & Authorization

### 7.1 Flow

1. **Register:** POST `/api/auth/register` → student user in DB.
2. **Login:** POST `/api/auth/login` with `role` → validates password; **admins** need **TOTP** if enabled; creates **session** row; sets **HTTP-only** cookies: `medvision_token` (access JWT), `medvision_refresh_token`, `medvision_role`.
3. **JWT:** Access token includes `sub`, `role`, `sid` (session id), `type=access`, `exp`, `jti`.
4. **Refresh:** POST `/api/auth/refresh` uses refresh cookie; validates session + hash; **revokes** old session; issues new tokens (rotation).
5. **Logout:** POST `/api/auth/logout` revokes session if refresh parses.
6. **Me:** GET `/api/auth/me` with access cookie.

### 7.2 Roles

| Role | Access |
|------|--------|
| `student` | `/dashboard/*` (middleware), student APIs |
| `admin` | `/admin/dashboard/*`, admin APIs (`require_role(UserRole.ADMIN)`) |

### 7.3 Token storage and transport

- **Storage:** HTTP-only cookies (not accessible to JS). Frontend uses `credentials: "include"` on `fetch`.
- **Alternative:** JSON body also returns `accessToken` on login/refresh; primary design is cookie-based.

---

## 8. AI & External Services

### 8.1 Gemini

| Use | Location | Input | Output |
|-----|----------|-------|--------|
| Adaptive quiz/flashcards | `adaptive_learning._call_gemini_json` | System + user prompts with chat/doc context | JSON questions or flashcards |
| RAG generation / verifier / decompose | `rag_agent.py` | Grounded answer prompt; verifier JSON; optional decompose | Text / JSON |
| Medical chat | `rag_agent._medical_chat` | User question | Free-form educational text |
| Vision caption/VQA | `vision_llm.py` | Image bytes + optional question | Caption or answer |

**Env:** `ASSISTANT_GEMINI_API_KEY`, `ASSISTANT_GEMINI_MODEL`, `VISION_GEMINI_API_KEY`, `VISION_GEMINI_MODEL` (see §9).

### 8.2 Milvus

- Collection name default `document_chunks`.
- Fields include `chunk_id`, `document_id`, `owner_user_id`, `is_shared`, page range, content, `embedding`.
- Queried in `milvus_index.search_chunks` / `replace_document_chunks`.

### 8.3 MinIO

- Runs in Docker as **Milvus internal object storage** (etcd + MinIO + Milvus).
- **Application file uploads** do not use MinIO SDK; they use **`STORAGE_ROOT`** on disk.

### 8.4 Other

- **OpenAI-compatible** API for optional Qwen-VL (`VISION_QWEN_*`).
- **HuggingFace** models for BioBERT and cross-encoder reranker (downloaded on first use).

---

## 9. Environment Variables

**Source of truth in code:** `backend/app/core/config.py` (`Settings`).  
**Example file:** `backend/.env.example` (names may differ — Pydantic accepts **case-insensitive** env vars).

### 9.1 Backend (`Settings` field → typical env name)

| Variable | Default (if any) | Required |
|----------|------------------|----------|
| `app_name` | `MedVision Backend` | No |
| `api_prefix` | `/api` | No |
| `frontend_origin` | `http://localhost:3000` | No |
| `database_url` | local Postgres DSN | **Yes** in production |
| `jwt_secret_key` | placeholder (**must change**) | **Yes** |
| `access_token_expire_minutes` | `15` | No |
| `refresh_token_expire_days` | `7` | No |
| `cookie_domain` | `None` | No |
| `cookie_secure` | `False` | No (set **True** behind HTTPS) |
| `milestone_env` | `development` | No |
| `milvus_host`, `milvus_port`, `milvus_collection_name` | localhost / 19530 / `document_chunks` | Milvus required for dense search |
| `embedding_dimensions` | `768` | No |
| `biobert_model_name`, `biobert_local_path`, `biobert_batch_size` | BioBERT defaults | No |
| `storage_root` | `./storage` | No |
| `max_upload_size_mb` | `50` | No |
| `enable_paddleocr_vl`, paddle OCR flags, `allow_ocr_fallback` | see `config.py` | No |
| `enable_dicom_anonymization` | `True` | No |
| `bootstrap_admin_*` | demo admin | No (change in prod) |
| `retrieval_enable_reranker` | `True` | No |
| `cross_encoder_model` | MiniLM cross-encoder | No |
| `assistant_llm_provider` | `none` | Set `gemini` or `openai` for LLM |
| `assistant_openai_*` | OpenAI defaults | If provider `openai` |
| `assistant_enable_verifier` | `True` | No |
| `assistant_gemini_api_key`, `assistant_gemini_model` | — | **Required** for Gemini LLM features |
| `agentic_max_iterations`, `agentic_context_score_threshold`, `agentic_enable_query_decomposition` | see `config.py` | No |
| `vision_provider`, `vision_gemini_*`, `vision_qwen_*` | see `config.py` | Vision features |
| `ml_features_enabled` | `False` | No (true for full torch GradCAM path) |
| `chexnet_weights_path`, `lime_*`, `shap_*` | see `config.py` | No |

**`.env.example` discrepancies:** Contains variables like `BIOBERT_ENABLED`, `RERANKER_ENABLED`, `BIOBERT_MODEL_NAME` that are **not** defined on `Settings` — they are **ignored** (`extra="ignore"`) unless code is added. Prefer names matching **`config.py`**.

### 9.2 Frontend

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Override API base (e.g. `http://localhost:8000/api`) |

If unset, browser builds URL from `window.location` hostname + port **8000**.

---

## 10. Feature Status Table (Phases 1–6+)

| Feature | Backend | Frontend | Notes |
|---------|---------|----------|-------|
| P1 Auth (register/login/me/refresh/logout) | Implemented | Implemented | Cookies + JWT |
| P1 TOTP admin | Implemented | Admin login collects TOTP | |
| P1 RBAC | Implemented | `middleware.ts` | |
| P2 Document upload | Implemented | Assistant page | |
| P2 Ingestion pipeline | Implemented | Poll/list documents | |
| P2 Hybrid retrieval | Implemented | Search API | |
| P3 RAG assistant | Implemented | Assistant page | Provider may be `none` → extractive fallback |
| P3 Medical chat | Implemented | Mode toggle | Needs Gemini key |
| P4 Vision caption/VQA/analyze | Implemented | GradCAM page | Needs API keys + GPU/CPU for heavy ML |
| P5 Quizzes (list/take/submit) | Implemented | Quizzes pages | Correct answers exposed in GET quiz |
| P5 Adaptive generate quiz/cards | Implemented | Generate pages | Needs Gemini |
| P5 SM-2 / BKT | Implemented | Flashcards | |
| P6 Gamification UI | Implemented | Achievements / dashboard | |
| P6 Progress dashboard | Implemented | Dashboard | |
| Admin analytics | Implemented | Admin analytics | |
| Admin content CRUD | Implemented | Builders | |
| Admin operations (students/audit) | **Broken import / schema bugs** | Wired | Fix `UserStatus`, `AuditLog` columns, `password_hash` |
| Agent steps UI | Partial | Assistant | DB steps likely empty; metadata may hold reasoning |

---

## 11. Known Issues & Technical Debt

1. **`admin_operations.py`**: Imports non-existent **`UserStatus`** → **ImportError**, blocks `app.main` load.
2. **Reset password route:** Uses **`user.hashed_password`**; model uses **`password_hash`**.
3. **Paginated audit log:** Uses wrong **`AuditLog`** column names (`user_id`, `resource_id`).
4. **`ingestion.py`:** `utc_now()` uses **`UTC`** undefined — should be `timezone.utc` → **runtime NameError** when ingestion runs.
5. **`build_admin_system_status`:** Compares document status to **`"indexed"`** but enum is **`ready`** → indexed count wrong.
6. **Quiz GET:** Returns **correct answers** before attempt.
7. **`submitQuiz` frontend:** Omits **`timeTakenSeconds`** in JSON body.
8. **`getWeakAreas`:** Calls **non-existent** `/progress/weak-areas`.
9. **Agent steps:** `run_rag_agent` called with **`trace_id=None`** → **`AgentStep` DB rows not written**; response `agentSteps` often empty.
10. **`.env.example` vs `config.py`:** Several keys ignored by Settings.
11. **MinIO:** Not used by app uploads — only Milvus dependency; **do not assume S3 API** for user files.
12. **Mock data:** Admin shell / student detail may still reference mocks — confirm per file when hardening.

---

## 12. Testing Entry Points

Base URL: `http://localhost:8000` (or Docker). API prefix: `/api`.  
**Cookies:** Use a client that stores `Set-Cookie` (browser, or `requests.Session`).

### 12.1 Health

- **GET** `/api/health` → 200, `database: reachable`.

### 12.2 Auth

- **POST** `/api/auth/register`  
  - Body: `{"fullName":"Test User","email":"test@example.com","password":"Password1!","institutionType":"Uni","trainingLevel":"Student","radiologyFocus":["Chest"]}`  
  - **201**, message.
- **POST** `/api/auth/login`  
  - Body: `{"email":"...","password":"...","role":"student"}`  
  - **200**, `user`, `accessToken`, cookies set.
- **GET** `/api/auth/me` with access cookie → user object.

### 12.3 Documents

- **POST** `/api/documents/upload` `multipart/form-data` with `file` + optional `is_shared=false` → **202**.
- **GET** `/api/documents` → list when ready.
- **POST** `/api/documents/search` JSON `{"query":"pe","topK":5}` → hits.

**DB:** new `documents`, `ingestion_jobs` rows; after job, `document_chunks` + Milvus upsert.

### 12.4 Assistant

- **POST** `/api/assistant/ask`  
  - Body: `{"question":"What is in chapter 1?","mode":"rag","topK":6}`  
  - Prerequisite: indexed documents.  
  - **DB:** `chat_sessions`, `chat_messages`, `assistant_traces`.

### 12.5 Quizzes

- **POST** `/api/quizzes/generate` `{"chatSessionId":"<uuid>","count":5}` — needs prior assistant context + Gemini key.
- **GET** `/api/quizzes?chatSessionId=...` — lists published quizzes in scope.
- **POST** `/api/quizzes/{id}/submit`  
  - Body: `{"chatSessionId":"<uuid>","answers":[{"questionId":"...","selectedAnswer":"A"}],"timeTakenSeconds":120}`  
  - **DB:** `quiz_attempts`, `user_progress`, `chat_topic_progress`, `user_streaks`.

### 12.6 Flashcards

- **POST** `/api/flashcards/decks/{id}/review` with `cardId`, `rating` (`again|hard|good|easy`), `chatSessionId`.

### 12.7 Progress & gamification

- **GET** `/api/progress/stats`
- **GET** `/api/gamification/summary`

### 12.8 Vision

- **POST** `/api/vision/documents/{document_id}/analyze` with JSON body per `VisionAnalyzeRequest` — needs image/DICOM document **ready**.

### 12.9 Admin

- Login as admin with TOTP, then **GET** `/api/admin/analytics/overview` — **200** if role admin.

---

## Appendix: Uncertainties

- Whether **`reasoningSteps`** inside `assistant_traces.metadata_json` is always populated — depends on `rag_agent` runtime; inspect a trace row after a request.
- **Exact** behavior of PaddleOCR and DICOM pipelines on Windows vs Linux — test in target environment.
- **Next.js 16** + React 19: verify peer compatibility with all Radix components in CI.

---

*End of PROJECT_UNDERSTANDING.md*
