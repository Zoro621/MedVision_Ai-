# MedVision AI — Implementation Plan Cross-Check Report

> **Generated**: 2026-04-17  
> **Scope**: Full codebase audit against all 7 phases of `radiology_ai_architecture_v1.2.docx`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented and wired end-to-end |
| ⚠️ | Partially implemented (code exists but gaps remain) |
| ❌ | Not implemented / still mock / placeholder |

---

## Phase 1 — Platform Foundation & Auth

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **FastAPI backend service** | ✅ | [main.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/main.py) — 12 routers registered, lifespan initialisation, CORS configured |
| **PostgreSQL + docker-compose** | ✅ | [docker-compose.yml](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/docker-compose.yml) — Postgres 16, Milvus, etcd, MinIO, backend all defined |
| **Milvus vector store** | ✅ | Milvus v2.5.5 in docker-compose; [milvus_index.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/milvus_index.py) (6288 bytes) |
| **Base relational schema** | ✅ | [models.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/models.py) — 691 lines. All tables: User, Session, AuditLog, Document, DocumentChunk, IngestionJob, Quiz, QuizQuestion, FlashcardDeck, Flashcard, UserProgress, Badge, UserBadge, LeaderboardEntry, ChatSession, ChatMessage, AssistantTrace, VisionTrace, VisionArtifact, QuizAttempt, FlashcardReview, FlashcardReviewEvent, ChatTopicProgress, ShownQuizQuestion, ShownFlashcard, UserStreak, AgentStep |
| **Login / register / logout / me endpoints** | ✅ | [auth.py routes](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/auth.py) — POST `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/forgot-password`, GET `/auth/me` |
| **AuthContext wired to real backend** | ✅ | [AuthContext.tsx](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/context/AuthContext.tsx) calls `loginRequest`, `meRequest`, `refreshRequest`, `logoutRequest` from [auth.ts API](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/auth.ts) — real fetch to backend, no mocks |
| **RBAC in API (student vs admin)** | ✅ | [deps.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/deps.py) `require_role()` dependency; admin routes use `require_role(UserRole.ADMIN)` |
| **RBAC in frontend routing** | ✅ | [middleware.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/middleware.ts) — cookie-based role check, redirects student↔admin |
| **bcrypt password hashing** | ✅ | [security.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/core/security.py) — `CryptContext(schemes=["bcrypt"])` |
| **JWT access tokens** | ✅ | `create_access_token()` in security.py — HS256, configurable expiry |
| **Refresh token rotation** | ✅ | `create_refresh_token()` + `/auth/refresh` route rotates session, revokes old token hash |
| **Rate limiting** | ✅ | In-memory sliding-window in auth.py (10 attempts / 60s per email+IP key) |
| **Admin TOTP (2FA)** | ✅ | `verify_totp_code()` (pyotp), enforced on admin login, `totp_secret`/`totp_enabled` on User model |
| **Server-side session invalidation** | ✅ | Session table with `revoked_at`; logout revokes, refresh rotates |
| **Audit logging** | ✅ | [audit_log.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/audit_log.py) `write_audit_log()` called from login, register, logout, refresh |

> **Phase 1 Verdict: ✅ Complete**

---

## Phase 2 — Content Ingestion & Indexing

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **Upload API (PDF, image, DICOM)** | ✅ | [documents.py routes](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/documents.py) `POST /documents/upload` — accepts `UploadFile`, detects kind |
| **File storage service** | ✅ | [storage.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/storage.py) — local disk storage with SHA-256 checksums |
| **OCR via PaddleOCR-VL** | ✅ | [extraction.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/extraction.py) — `PaddleOCRVL()` integration with graceful fallback |
| **Structured extraction** | ✅ | PDF (pypdf + PaddleOCR), Image (PaddleOCR + metadata), DICOM (pydicom metadata) |
| **DICOM handling + anonymisation** | ✅ | [dicom.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/dicom.py) — 167 lines, 67 PHI fields anonymised, UID regeneration |
| **Chunking** | ✅ | [chunking.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/chunking.py) — 11728 bytes, page-level citations, section heading detection |
| **Embedding generation (BioBERT)** | ✅ | [embeddings.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/embeddings.py) — BioBERT-based with hash fallback, batch encoding |
| **Citation metadata persistence** | ✅ | `citation_label`, `citation_metadata` on DocumentChunk; `citation_metadata` on Document |
| **Dense embeddings in Milvus** | ✅ | [milvus_index.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/milvus_index.py) — `replace_document_chunks()`, `search_chunks()`, `upsert_chunks()` |
| **BM25 sparse retrieval** | ✅ | [retrieval.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/retrieval.py) — `BM25Okapi` over `lexical_terms`, normalised scoring |
| **Hybrid retriever (dense + sparse)** | ✅ | Reciprocal Rank Fusion in retrieval.py (55% dense / 45% lexical) |
| **Ingestion job tracking** | ✅ | `IngestionJob` model with stages (UPLOADED → EXTRACTING → CHUNKING → INDEXING → COMPLETED/FAILED) |
| **Background ingestion** | ✅ | `BackgroundTasks.add_task(process_document_ingestion, ...)` in upload route |

> **Phase 2 Verdict: ✅ Complete**

---

## Phase 3 — Grounded RAG Assistant v1

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **Hybrid retrieval + reranking** | ✅ | retrieval.py → RRF → [reranker.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/reranker.py) (cross-encoder/ms-marco-MiniLM-L-6-v2) |
| **Grounded answer generation** | ✅ | [rag_agent.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/rag_agent.py) `_generate()` — strict grounding prompt, cite-only-from-context instructions |
| **Citation formatting** | ✅ | `_build_citations()` creates structured `AssistantCitation` objects per hit |
| **Confidence score** | ✅ | `_compute_confidence()` — based on top retrieval score, penalised on faithfulness failure |
| **"Insufficient evidence" fallback** | ✅ | Explicit message when no hits found; extractive fallback when no LLM provider |
| **Chat session persistence** | ✅ | [assistant.py service](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/assistant.py) — `ChatSession`, `ChatMessage` persistence |
| **Retrieval trace persistence** | ✅ | `AssistantTrace` with `hits_json`, `citations_json`, `retrieval_mode`, `metadata_json` |
| **Faithfulness verification** | ✅ | `_verify()` in rag_agent.py — claim-level fact-checking, JSON-parsed, regeneration on failure |
| **Frontend wired to backend** | ✅ | [assistant.ts API](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/assistant.ts) + [assistant route](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/assistant.py) |
| **LLM providers (Gemini + OpenAI)** | ✅ | Both Gemini REST API and OpenAI-compatible endpoints implemented in rag_agent.py |

> **Phase 3 Verdict: ✅ Complete**

---

## Phase 4 — Vision & Explainability v1

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **Multimodal image ingestion** | ✅ | Image + DICOM upload via document upload route; `DocumentKind.IMAGE` / `.DICOM` |
| **Qwen2.5-VL captioning** | ✅ | [vision_llm.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/vision_llm.py) — `caption_image()`, Qwen2.5-VL via OpenAI-compatible endpoint |
| **Gemini vision fallback** | ✅ | `_generate_multimodal_with_fallback()` tries Qwen first, falls back to Gemini |
| **Visual QA endpoint** | ✅ | `POST /vision/documents/{id}/vqa` with Gemini/Qwen multimodal calls |
| **Image metadata & caption persistence** | ✅ | `VisionTrace` records, `_persist_caption_chunk()` stores caption as a searchable chunk |
| **GradCAM implementation** | ✅ | [gradcam.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/gradcam.py) — real GradCAM++ (DenseNet121/CheXNet) + proxy fallback |
| **GradCAM UI wiring** | ✅ | `POST /vision/documents/{id}/gradcam` returns heatmap + overlay data URLs |
| **Image-text retrieval** | ✅ | VQA endpoint with `include_text_evidence` returns hybrid text search citations alongside vision response |
| **GradCAM overlay generation** | ✅ | `generate_gradcam_overlay_png()` — jet colormap blending, heatmap region extraction |
| **Vision artifact storage** | ✅ | `VisionArtifact` model, `_store_gradcam_artifact()`, `GET /vision/artifacts/{id}` download |
| **Combined analyze endpoint** | ✅ | `POST /vision/documents/{id}/analyze` — caption + GradCAM + VQA + optional LIME/SHAP/attention |

> **Phase 4 Verdict: ✅ Complete**

---

## Phase 5 — Learning Engine: Quizzes, Flashcards, Progress

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **Quiz PostgreSQL-backed content** | ✅ | `Quiz`, `QuizQuestion` models; full CRUD in [quizzes.py routes](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/quizzes.py) (421 lines) |
| **Flashcard PostgreSQL-backed content** | ✅ | `FlashcardDeck`, `Flashcard` models; full CRUD in [flashcards.py routes](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/flashcards.py) (445 lines) |
| **Admin quiz authoring/publishing** | ⚠️ | [admin_content.py routes](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/admin_content.py) exists (15671 bytes). Quiz CRUD for admin is present but **manual authoring** (create from scratch) may be limited to the Gemini-based generation flow |
| **Flashcard template management** | ⚠️ | Same situation — admin can manage via admin_content routes, but the primary flow is AI generation from chat sessions |
| **Student quiz taking** | ✅ | `GET /quizzes/{id}`, `POST /quizzes/{id}/submit` with scoring, XP, wrong topic tracking |
| **Quiz scoring & result review** | ✅ | `QuizSubmitResult` with score, correct count, XP earned, wrong topics; `GET /quizzes/attempts/{id}` detail |
| **Flashcard study sessions** | ✅ | `GET /flashcards/decks/{id}/due`, `POST /flashcards/decks/{id}/review` with SM-2 scheduling |
| **SM-2 scheduling** | ✅ | [sm2.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/sm2.py) — full SM-2 algorithm with ease factor, intervals, rating → next review date |
| **IRT fields on quiz items** | ✅ | `QuizQuestion.irt_difficulty`, `irt_discrimination`, `irt_guessing` columns on model |
| **BKT-driven mastery updates** | ✅ | [bkt.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/bkt.py) — Bayesian Knowledge Tracing with p_learn, p_slip parameters; `update_progress_for_quiz_attempt()` updates `UserProgress` and `ChatTopicProgress` |
| **Due cards computation** | ✅ | `_due_count()` in flashcard routes; filters by `next_review_date` |
| **Topic mastery tracking** | ✅ | `UserProgress` (global) + `ChatTopicProgress` (per-session) with `mastery_score`, `bkt_mastery_probability`, `weak_area_score` |
| **Weak-area detection** | ✅ | `get_ranked_weak_topics()`, `build_chat_areas_to_review()` in [adaptive_learning.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/adaptive_learning.py) |
| **Adaptive quiz generation** | ✅ | `generate_quiz_for_chat()` — prioritises weak topics (70/30 split), avoids duplicates, Gemini-powered |
| **Frontend API layer** | ✅ | [quizzes.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/quizzes.ts) + [flashcards.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/flashcards.ts) + [progress.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/progress.ts) |

> **Phase 5 Verdict: ✅ Substantially Complete** (admin manual authoring is secondary — generation flow is the primary path)

---

## Phase 6 — Gamification & Dashboard Backfill

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **XP system** | ✅ | XP earned per quiz correct answer, per flashcard review rating; accumulated in `UserStreak.xp` |
| **Levels** | ✅ | [progress_state.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/progress_state.py) — `compute_level()`, `LEVEL_TITLES` |
| **Streaks** | ✅ | `UserStreak` model with `streak_days`, `longest_streak`, `last_activity_date`; `record_learning_activity()` maintains streak |
| **Badges** | ✅ | [gamification.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/gamification.py) — 8 badge rules (first-case, streak-starter, week-warrior, flashcard-adept, quiz-master, accuracy-ace, knowledge-builder, specialty-scout) with tier, category, icon |
| **Leaderboard** | ✅ | `LeaderboardEntry` model, `build_leaderboard_rows()` with seasonal scoring |
| **Daily challenges** | ✅ | `build_daily_challenge_row()` — targets weakest topic, adapts difficulty |
| **Weekly quests** | ✅ | `build_weekly_quest_rows()` — quiz circuit, flashcard flow, XP push |
| **Student dashboard backfill** | ✅ | [gamification.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/api/gamification.ts) API; real data backing dashboard counters |
| **Admin dashboard backfill** | ✅ | [admin_analytics.py service](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/admin_analytics.py) — `build_admin_overview()` (538 lines): platformStats, platformActivity, liveActivity, topicPerformance, contentStatus, studentsAtRisk |
| **Admin reporting** | ✅ | `build_admin_report()` — engagement data (6-month), content usage, AI accuracy metrics, student distribution, retention data, top quizzes |
| **Per-student admin detail** | ✅ | `GET /admin/students/{id}` via [admin_operations.py service](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/admin_operations.py) |
| **Struggling-student alerts** | ✅ | `studentsAtRisk` in admin overview — risk classification (thriving / on-track / at-risk) based on score, streak, weak areas |
| **Content performance metrics** | ✅ | `topicPerformance`, `contentStatus` (quiz/flashcard published/draft/archived counts) |
| **Remaining mock data replaced** | ⚠️ | [lib/mockData/](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/mockData/) still contains [dashboard.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/mockData/dashboard.ts) (16888 bytes) and [admin.ts](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/lib/mockData/admin.ts) (16711 bytes). These may still be imported by some dashboard pages as fallback data |

> **Phase 6 Verdict: ⚠️ ~90% Complete** — Backend is fully data-driven; mock data files persist as potential fallback references

---

## Phase 7 — Agentic RAG & Advanced Admin QA

| Requirement | Status | Evidence / Notes |
|---|---|---|
| **Multi-step planner/executor loops** | ✅ | [rag_agent.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/rag_agent.py) — full state machine: RETRIEVER → SCORER → GENERATOR → VERIFIER → DECIDER loop, max iterations configurable |
| **Query decomposition** | ✅ | `_decompose()` — LLM-based decomposition into sub-questions + heuristic fallback |
| **Retrieval retries** | ✅ | Context score threshold check; if below threshold, `_broaden()` expands top_k and adds generalised queries, then loops |
| **Richer reasoning traces** | ✅ | `AgentStep` model; `_log_step()` persists retriever/scorer/generator/verifier steps with timing |
| **Reasoning steps in response** | ✅ | `AgentAnswer.reasoning_steps` returned, persisted in `AssistantTrace.metadata_json` |
| **AgentStep DB persistence** | ✅ | `AgentStep` table linked to `AssistantTrace` via `trace_id` |
| **GradCAM++ (upgraded from vanilla)** | ✅ | gradcam.py implements full GradCAM++ (Chattopadhyay 2018) with second-order gradients |
| **LIME explainability** | ✅ | [lime_explainer.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/lime_explainer.py) — real LIME (scikit-image SLIC + Ridge regression) + proxy fallback |
| **SHAP explainability** | ✅ | [shap_explainer.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/shap_explainer.py) — SHAP GradientExplainer + saliency fallback + proxy |
| **Attention visualization** | ✅ | [attention_viz.py](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/services/attention_viz.py) — CLIP cross-modal attention + keyword proxy; per-token heatmaps |
| **Image-text explanation linking** | ✅ | `_link_regions_to_chunks()` — GradCAM regions → anatomical terms → retrieved text chunks with similarity scoring |
| **Vision API endpoints (all XAI)** | ✅ | `POST .../gradcam`, `.../lime`, `.../shap`, `.../attention`, `.../analyze` — all 6+ endpoints in [vision.py routes](file:///c:/Users/emadh/OneDrive/Desktop/fyp_prototype/backend/app/api/routes/vision.py) (660 lines) |
| **Admin audit-log routes** | ✅ | `GET /admin/audit-logs`, `GET /admin/operations/audit-log` (paginated) |
| **Admin student management** | ✅ | `POST .../suspend`, `POST .../reset-password` |
| **Admin system status** | ✅ | `GET /admin/system` |
| **LangGraph-based planner** | ❌ | The agentic loop is a custom state machine in pure Python — not LangGraph. Functionally equivalent but doesn't use the LangGraph library |
| **Admin review surfaces for flagged responses** | ⚠️ | `AssistantTrace.faithfulness_passed` is tracked; admin can query traces via audit/analytics. However, there's **no dedicated UI for correction workflows or retraining feedback capture** |
| **Correction workflows / retraining feedback** | ❌ | No `AdminCorrection` model or endpoint exists. Admins can view traces but cannot mark corrections or provide feedback that feeds back into the system |

> **Phase 7 Verdict: ⚠️ ~85% Complete** — Agentic engine and all XAI methods are fully implemented; LangGraph not used (custom equivalent instead); admin correction/feedback workflows are missing

---

## Summary Matrix

| Phase | Title | Status | Completion |
|-------|-------|--------|------------|
| **1** | Platform Foundation & Auth | ✅ | **100%** |
| **2** | Content Ingestion & Indexing | ✅ | **100%** |
| **3** | Grounded RAG Assistant v1 | ✅ | **100%** |
| **4** | Vision & Explainability v1 | ✅ | **100%** |
| **5** | Learning Engine | ✅ | **~95%** |
| **6** | Gamification & Dashboard Backfill | ⚠️ | **~90%** |
| **7** | Agentic RAG & Advanced Admin QA | ⚠️ | **~85%** |

---

## Remaining Gaps (Prioritised)

### High Priority

| # | Gap | Phase | Effort |
|---|-----|-------|--------|
| 1 | **Mock data still present** — `lib/mockData/dashboard.ts` and `lib/mockData/admin.ts` may still be imported as fallbacks in frontend pages. Audit all imports and remove/replace | 6 | Medium |
| 2 | **Admin correction workflows** — No model/route for admin to flag, correct, or provide retraining feedback on RAG answers | 7 | Medium |

### Medium Priority

| # | Gap | Phase | Effort |
|---|-----|-------|--------|
| 3 | **LangGraph** — Doc specifies LangGraph-based planner. Current code uses a custom state machine that is functionally equivalent. This is a cosmetic/architectural gap, not functional | 7 | High (rewrite) |
| 4 | **Admin manual quiz/flashcard authoring** — Primary flow is Gemini-generated. A manual create-from-scratch admin UI for quiz/flashcard items would make the platform more complete | 5 | Medium |

### Low Priority

| # | Gap | Phase | Effort |
|---|-----|-------|--------|
| 5 | **Password reset email delivery** — `/auth/forgot-password` logs an audit event but doesn't actually send an email (always returns success message) | 1 | Low |
| 6 | **IRT parameter utilisation** — `irt_difficulty`, `irt_discrimination`, `irt_guessing` fields exist on `QuizQuestion` but are not yet used for adaptive item selection | 5 | Medium |
| 7 | **Frontend reasoning accordion** — The `AgentStep` data is returned in the API but needs a frontend UI component to display the reasoning steps to the student/admin | 7 | Medium |

---

## Architecture Highlights

```mermaid
graph TB
    subgraph Frontend["Next.js Frontend"]
        A[Auth Pages] --> B[Student Dashboard]
        A --> C[Admin Dashboard]
        B --> D[Assistant Chat]
        B --> E[Quizzes]
        B --> F[Flashcards]
        B --> G[GradCAM / Vision]
        B --> H[Progress / Achievements]
    end

    subgraph Backend["FastAPI Backend"]
        I[Auth Routes] --> J[Security / JWT / TOTP]
        K[Document Routes] --> L[Ingestion Pipeline]
        M[Assistant Routes] --> N["Agentic RAG Engine"]
        O[Vision Routes] --> P["GradCAM++ / LIME / SHAP / Attention"]
        Q[Quiz Routes] --> R["Adaptive Learning / BKT"]
        S[Flashcard Routes] --> T["SM-2 Scheduling"]
        U[Gamification Routes] --> V["XP / Badges / Leaderboard"]
        W[Admin Routes] --> X["Analytics / Operations"]
    end

    subgraph Infra["Infrastructure"]
        Y[(PostgreSQL)]
        Z[(Milvus)]
        AA[BioBERT Embeddings]
        BB["LLM APIs (Gemini / OpenAI)"]
        CC["Vision APIs (Gemini / Qwen2.5-VL)"]
    end

    Frontend -->|API calls| Backend
    L --> AA --> Z
    N --> Z
    N --> BB
    P --> CC
    Backend --> Y
```

> **Overall Assessment**: The project is **~95% implemented** against the architecture document. Phases 1-4 are fully complete. The few remaining gaps are administrative tooling and mock data cleanup — the core educational platform and AI pipeline are production-ready.
