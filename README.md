# MedVision AI

**AI-Powered Radiology Education Platform**

> Learn radiology the way your brain scans it. Upload your textbooks, ask anything, get grounded answers with citations, visual explainability, and adaptive learning.

🌐 **Live Application**: [https://med-vision-ai-ashen.vercel.app](https://med-vision-ai-ashen.vercel.app)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Project Architecture](#project-architecture)
- [Folder Structure](#folder-structure)
- [Installation Guide](#installation-guide)
- [Environment Variables](#environment-variables)
- [Database Documentation](#database-documentation)
- [Dependencies Documentation](#dependencies-documentation)
- [Running the Application Locally](#running-the-application-locally)
- [API Documentation](#api-documentation)
- [Deployment Information](#deployment-information)
- [Troubleshooting](#troubleshooting)
- [Development Guide](#development-guide)
- [Additional Notes](#additional-notes)

---

## Project Overview

MedVision AI is a full-stack AI-powered radiology education platform designed for medical students and radiology trainees. The platform combines a modern Next.js frontend with a FastAPI backend, integrating advanced AI/ML capabilities for document understanding, visual explainability, adaptive learning, and gamification.

The system supports uploading radiology textbooks (PDF, images, DICOM), uses Retrieval-Augmented Generation (RAG) with an agentic graph architecture to answer questions grounded in uploaded content, provides visual explainability via GradCAM++/LIME/SHAP heatmaps, and delivers adaptive quizzes and flashcards with spaced repetition (SM-2 algorithm) and Bayesian Knowledge Tracing (BKT).

---

## Key Features

### Student Portal
- **AI Assistant (Agentic RAG)** — Ask questions about radiology; receive citations-backed, hallucination-checked answers with reasoning transparency (agentic step-by-step traces)
- **Document Management** — Upload PDF, image, and DICOM files; automatic text extraction, chunking, and vector indexing via BioBERT embeddings + Milvus
- **GradCAM++ Explainability** — Generate class-activation heatmaps over radiology images using DenseNet121 (CheXNet or ImageNet pretrained)
- **LIME & SHAP Explainability** — Superpixel-based (LIME) and KernelSHAP patch-grid attribution maps for interpretable AI
- **Attention Visualization** — Cross-modal attention + explanation links between image regions and text chunks
- **Adaptive Quizzes** — AI-generated multiple-choice quizzes with IRT difficulty parameters, BKT mastery tracking, and weak-area identification
- **Flashcards with Spaced Repetition** — SM-2 algorithm scheduling, due-card tracking, and mastery metrics
- **Gamification** — XP system, leveling, streaks, badges, leaderboard, daily challenges, and weekly quests
- **Progress Tracking** — Topic mastery dashboard, study activity heatmaps, weak-area analysis, and per-chat session scoped progress

### Admin Portal
- **Analytics Dashboard** — Platform-wide usage stats, user engagement, and content performance
- **Content Management** — Create, edit, publish, archive, and delete quizzes and flashcard decks (full CRUD)
- **Student Management** — View, search, suspend, and reset passwords for student accounts
- **Human-in-the-Loop (HIL) Corrections** — Review AI traces (assistant + vision), submit expert corrections, dual-admin review workflow, and JSONL export for fine-tuning
- **Audit Logging** — Immutable log of all security-relevant actions (login, logout, registration, corrections)
- **System Status** — Real-time health monitoring of database, Milvus, and connected services

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript 5.7 |
| **UI Components** | Radix UI primitives, shadcn/ui, Lucide React icons |
| **Styling** | Tailwind CSS 4, tw-animate-css, class-variance-authority |
| **3D / Animation** | React Three Fiber, Three.js, Motion (Framer Motion) |
| **Charts** | Recharts 2.15 |
| **Forms** | React Hook Form + Zod validation |
| **Backend** | FastAPI 0.115, Uvicorn, Python 3.12 |
| **ORM** | SQLAlchemy 2.0 (async-compatible, psycopg v3 driver) |
| **Database** | PostgreSQL 16 (Alpine) |
| **Vector Database** | Milvus 2.5.5 (standalone, with etcd + MinIO backing) |
| **Embeddings** | BioBERT (dmis-lab/biobert-v1.1) via HuggingFace Transformers |
| **Reranker** | Cross-encoder/ms-marco-MiniLM-L-6-v2 (sentence-transformers) |
| **LLM Providers** | OpenAI GPT-4o/4o-mini (default), Ollama (local Llama/Qwen) |
| **Agentic RAG** | LangGraph + LangChain Core (planner→retriever→generator→verifier graph) |
| **ML / XAI** | PyTorch, torchvision (DenseNet121), scikit-learn, scikit-image, SHAP, LIME |
| **OCR (optional)** | PaddleOCR-VL 3.3+ with PaddlePaddle |
| **Medical Imaging** | pydicom (DICOM), Pillow (image processing) |
| **Auth** | JWT (python-jose HS256), bcrypt (passlib), TOTP (pyotp) |
| **Containerization** | Docker, Docker Compose |
| **Frontend Deployment** | Vercel |
| **Analytics** | Vercel Analytics |

---

## System Requirements

### Required Software

| Software | Minimum Version | Notes |
|----------|----------------|-------|
| **Node.js** | 22.x LTS | For Next.js frontend |
| **npm** | 10.x+ | Included with Node.js (pnpm also supported) |
| **Python** | 3.12+ | For FastAPI backend |
| **Docker** | 24.x+ | For PostgreSQL, Milvus, backend containers |
| **Docker Compose** | v2.20+ | Orchestration of all services |
| **Git** | 2.40+ | Version control |

### Operating System
- Windows 10/11, macOS 12+, or Linux (Ubuntu 22.04+ recommended)

### Hardware Recommendations
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **RAM** | 8 GB | 16 GB+ (for PyTorch + Milvus) |
| **Disk** | 10 GB free | 30 GB+ (ML model weights, vector indices) |
| **GPU** | Not required | NVIDIA GPU with CUDA (for faster ML inference) |

### Additional Prerequisites
- OpenAI API key (if using `openai` provider for LLM/Vision)
- Ollama installed locally (if using `ollama` provider for LLM/Vision)

---

## Project Architecture

### High-Level Architecture

```
┌─────────────────────┐          ┌──────────────────────┐
│                     │  HTTPS   │                      │
│   Next.js Frontend  │◄────────►│  FastAPI Backend      │
│   (Vercel / :3000)  │  Cookie  │  (Docker / :8000)     │
│                     │  Auth    │                      │
└─────────────────────┘          └──────┬──────┬────────┘
                                        │      │
                                        │      │
                         ┌──────────────┘      └──────────────┐
                         ▼                                     ▼
               ┌──────────────────┐                 ┌──────────────────┐
               │  PostgreSQL 16   │                 │  Milvus 2.5      │
               │  (Relational DB) │                 │  (Vector DB)     │
               │  port: 5432      │                 │  port: 19530     │
               └──────────────────┘                 └──────┬──────┬───┘
                                                           │      │
                                                    ┌──────┘      └──────┐
                                                    ▼                    ▼
                                              ┌──────────┐        ┌──────────┐
                                              │   etcd    │        │  MinIO   │
                                              │ (metadata)│        │ (object) │
                                              └──────────┘        └──────────┘
```

### Frontend–Backend Interaction Flow

1. **Authentication**: Cookie-based JWT (access + refresh tokens stored as HttpOnly cookies). The Next.js middleware (`middleware.ts`) reads `medvision_token` and `medvision_role` cookies to enforce route protection.
2. **API Calls**: The frontend uses `lib/api/base.ts` to resolve the backend URL (`NEXT_PUBLIC_API_BASE_URL` or auto-detected `{protocol}//{hostname}:8000/api`). All requests include `credentials: "include"` for cookie forwarding.
3. **Real-time Feedback**: Document ingestion runs as a FastAPI `BackgroundTask`. The frontend polls document status to track ingestion progress.

### Database Interaction Flow

- **PostgreSQL**: All relational data (users, sessions, documents, chunks, quizzes, flashcards, progress, gamification, traces, corrections) via SQLAlchemy 2.0 ORM.
- **Milvus**: Dense vector embeddings for document chunks (BioBERT 768-dim). Used for semantic similarity search in the hybrid retrieval pipeline (dense + BM25 lexical fusion).
- **Hybrid Retrieval**: Queries are embedded via BioBERT → Milvus ANN search → BM25 lexical re-ranking → cross-encoder reranking (ms-marco-MiniLM) → top-k results.

### Authentication & Authorization Flow

```
┌──────────┐     POST /api/auth/login      ┌──────────────┐
│  Client  │ ────────────────────────────►  │  Auth Route   │
│          │  { email, password, role,      │  (FastAPI)    │
│          │    totpCode? }                 └──────┬───────┘
│          │                                       │
│          │  Set-Cookie: medvision_token,          │ Verify password (bcrypt)
│          │  medvision_refresh_token,              │ Verify TOTP (admin only)
│          │  medvision_role                        │ Check admin allowlist
│          │ ◄─────────────────────────────────────┘
│          │
│          │     GET /api/auth/me (with cookies)
│          │ ────────────────────────────────────►  Token decoded (HS256)
│          │                                        Session validated
│          │ ◄──────────────────────────────────── User object returned
└──────────┘
```

- **Roles**: `student` and `admin`
- **Admin access**: Restricted by `ADMIN_ALLOWED_EMAILS` (max 3 admins)
- **Brute-force protection**: Rate limiter (10 attempts/60s per email+IP), account lockout after 5 failures (15-minute lockout)
- **TOTP 2FA**: Required for all admin logins

### Agentic RAG Pipeline (LangGraph)

```
User Question
     │
     ▼
┌─────────────┐
│   Planner   │──── Decomposes query, selects retrieval strategy
└─────┬───────┘
      ▼
┌─────────────┐
│  Retriever  │──── Hybrid search (Milvus dense + BM25 lexical + reranker)
└─────┬───────┘
      ▼
┌─────────────┐
│  Generator  │──── LLM synthesis with context (OpenAI / Ollama)
└─────┬───────┘
      ▼
┌─────────────┐
│  Verifier   │──── Faithfulness check (hallucination gate)
└─────┬───────┘
      ▼
┌─────────────┐
│   Decider   │──── Accept, rephrase, or re-retrieve (up to 3 iterations)
└─────────────┘
```

---

## Folder Structure

```
fyp_prototype/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth route group (student)
│   │   ├── layout.tsx            # Auth layout wrapper
│   │   ├── login/                # Student login page
│   │   ├── register/             # Student registration (multi-step)
│   │   └── forgot-password/      # Password reset page
│   ├── admin/                    # Admin route group
│   │   ├── (auth)/               # Admin auth pages
│   │   │   └── login/            # Admin login (with TOTP)
│   │   └── dashboard/            # Admin dashboard
│   │       ├── page.tsx          # Admin overview page
│   │       ├── layout.tsx        # Admin dashboard layout (sidebar)
│   │       ├── analytics/        # Analytics dashboard
│   │       ├── content/          # Content management (quizzes/decks)
│   │       ├── review/           # HIL corrections interface
│   │       ├── students/         # Student management
│   │       ├── audit-log/        # Audit log viewer
│   │       ├── settings/         # Admin settings
│   │       └── system/           # System status page
│   ├── dashboard/                # Student dashboard
│   │   ├── page.tsx              # Main dashboard (stats, activity)
│   │   ├── layout.tsx            # Dashboard layout (sidebar)
│   │   ├── assistant/            # AI chat assistant page
│   │   ├── flashcards/           # Flashcard study page
│   │   ├── quizzes/              # Quiz listing & attempt pages
│   │   ├── gradcam/              # GradCAM++ / LIME / SHAP viewer
│   │   ├── progress/             # Progress & analytics page
│   │   ├── achievements/         # Gamification achievements page
│   │   └── settings/             # User settings page
│   ├── layout.tsx                # Root layout (providers, fonts, meta)
│   ├── page.tsx                  # Landing page (marketing)
│   └── globals.css               # Global CSS (Tailwind base, themes)
│
├── backend/                      # FastAPI Python backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app creation, CORS, router registration
│   │   ├── models.py             # SQLAlchemy ORM models (all 25+ tables)
│   │   ├── api/
│   │   │   ├── deps.py           # Auth dependencies (get_current_user, require_role)
│   │   │   └── routes/           # API endpoint files
│   │   │       ├── auth.py       # Register, login, logout, refresh, forgot-password
│   │   │       ├── assistant.py  # Chat sessions, ask (agentic RAG)
│   │   │       ├── documents.py  # Upload, list, search, delete documents
│   │   │       ├── vision.py     # Caption, VQA, GradCAM++, LIME, SHAP, attention, analyze
│   │   │       ├── quizzes.py    # Generate, list, get, submit, attempts
│   │   │       ├── flashcards.py # Generate, list decks, due cards, SM-2 review
│   │   │       ├── gamification.py # Gamification summary (achievements, leaderboard)
│   │   │       ├── progress.py   # Stats, weak areas, topic mastery, study activity
│   │   │       ├── health.py     # Health check endpoint
│   │   │       ├── admin_analytics.py   # Admin overview & report
│   │   │       ├── admin_content.py     # Admin CRUD for quizzes & flashcard decks
│   │   │       ├── admin_corrections.py # HIL correction queue, submit, review, export
│   │   │       └── admin_operations.py  # Student management, audit log, system status
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic Settings (all env vars)
│   │   │   ├── database.py       # SQLAlchemy engine, session factory
│   │   │   └── security.py       # JWT, bcrypt, TOTP, token hashing
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   │   ├── auth.py           # Auth schemas
│   │   │   ├── assistant.py      # Assistant schemas
│   │   │   ├── documents.py      # Document schemas
│   │   │   ├── vision.py         # Vision schemas
│   │   │   ├── learning.py       # Quiz, flashcard, progress schemas
│   │   │   ├── gamification.py   # Gamification schemas
│   │   │   ├── admin_analytics.py     # Admin analytics schemas
│   │   │   ├── admin_content.py       # Admin content schemas
│   │   │   ├── admin_corrections.py   # Admin correction schemas
│   │   │   └── admin_operations.py    # Admin operations schemas
│   │   └── services/             # Business logic layer
│   │       ├── adaptive_learning.py   # BKT, quiz/flashcard generation, scope matching
│   │       ├── admin_analytics.py     # Admin overview/report builders
│   │       ├── admin_operations.py    # Student list, audit log, system status
│   │       ├── assistant.py           # Chat session management, RAG turn runner
│   │       ├── attention_viz.py       # Cross-modal attention & explanation links
│   │       ├── audit_log.py           # Audit log writer
│   │       ├── bkt.py                 # Bayesian Knowledge Tracing engine
│   │       ├── bootstrap.py           # DB initialization, seed defaults, admin setup
│   │       ├── chunking.py            # Document chunking (sentence-aware, semantic)
│   │       ├── cxr_classifier.py      # CheXNet DenseNet121 classifier
│   │       ├── dicom.py               # DICOM file processing & anonymization
│   │       ├── embeddings.py          # BioBERT embedding service
│   │       ├── extraction.py          # Text extraction from PDF/images
│   │       ├── gamification.py        # XP, badges, streaks, leaderboard logic
│   │       ├── gradcam.py             # GradCAM++ heatmap & overlay generation
│   │       ├── ingestion.py           # Document ingestion pipeline
│   │       ├── lime_explainer.py      # LIME superpixel explanation
│   │       ├── local_llm.py           # Ollama LLM client (OpenAI-compat /v1)
│   │       ├── local_vlm.py           # Ollama Vision-Language Model client
│   │       ├── milvus_index.py        # Milvus collection management & upsert
│   │       ├── progress_state.py      # Streak/XP/level utilities
│   │       ├── rag_agent.py           # Agentic RAG orchestrator
│   │       ├── rag_graph.py           # LangGraph state machine definition
│   │       ├── reranker.py            # Cross-encoder reranking service
│   │       ├── retrieval.py           # Hybrid search (dense + BM25 + reranker)
│   │       ├── shap_explainer.py      # SHAP KernelSHAP explanation
│   │       ├── sm2.py                 # SM-2 spaced repetition algorithm
│   │       ├── storage.py             # File storage (uploads, artifacts)
│   │       ├── vision_io.py           # Image I/O utilities
│   │       └── vision_llm.py          # Vision LLM provider (OpenAI/Ollama)
│   ├── storage/                  # File storage root (uploads, artifacts)
│   ├── .env.example              # Environment variable template
│   ├── .env                      # Local env overrides (gitignored)
│   ├── Dockerfile                # Backend Docker image (Python 3.12-slim)
│   ├── requirements.txt          # Core Python dependencies
│   ├── requirements-ocr.txt      # Optional PaddleOCR dependencies
│   └── requirements-ml-extra.txt # Optional SHAP C-extension
│
├── components/                   # Shared React components
│   ├── ui/                       # shadcn/ui primitives (57 components)
│   ├── auth/                     # Auth form components (11 files)
│   ├── landing/                  # Landing page sections (8 files)
│   ├── dashboard/                # Student dashboard components
│   │   ├── charts/               # Chart components (Recharts)
│   │   ├── gradcam/              # GradCAM viewer components
│   │   ├── shell/                # Dashboard shell (sidebar, header)
│   │   └── ui/                   # Dashboard-specific UI components
│   ├── admin/                    # Admin dashboard components
│   │   ├── charts/               # Admin chart components
│   │   ├── shell/                # Admin shell (sidebar, header)
│   │   └── ui/                   # Admin-specific UI components
│   └── theme-provider.tsx        # next-themes provider wrapper
│
├── context/                      # React Context providers
│   ├── AuthContext.tsx            # Authentication state management
│   └── DashboardStatsContext.tsx  # Dashboard stats state management
│
├── hooks/                        # Custom React hooks
│   ├── use-mobile.ts             # Responsive breakpoint hook
│   ├── use-toast.ts              # Toast notification hook
│   ├── useAdminOverview.ts       # Admin overview data fetching
│   └── useDocuments.ts           # Document list fetching
│
├── lib/                          # Shared utilities & API clients
│   ├── api/                      # Backend API client functions
│   │   ├── base.ts               # API base URL resolver
│   │   ├── auth.ts               # Auth API (login, register, etc.)
│   │   ├── assistant.ts          # Assistant API (sessions, ask)
│   │   ├── documents.ts          # Documents API (upload, list, search)
│   │   ├── vision.ts             # Vision API (caption, VQA, GradCAM)
│   │   ├── quizzes.ts            # Quizzes API (generate, submit)
│   │   ├── flashcards.ts         # Flashcards API (decks, review)
│   │   ├── gamification.ts       # Gamification API
│   │   ├── progress.ts           # Progress API
│   │   ├── adminAnalytics.ts     # Admin analytics API
│   │   ├── adminContent.ts       # Admin content CRUD API
│   │   ├── adminCorrections.ts   # Admin corrections API
│   │   └── adminOperations.ts    # Admin operations API
│   ├── dashboard/                # Dashboard utility functions
│   ├── mockData/                 # Mock data for development
│   ├── validations/
│   │   └── authSchemas.ts        # Zod validation schemas for auth forms
│   ├── fonts.ts                  # Google Fonts configuration (Syne, DM Sans, JetBrains Mono)
│   ├── utils.ts                  # Utility functions (cn, etc.)
│   ├── activeSession.ts          # Active study session utilities
│   └── studySession.ts           # Study session state management
│
├── types/                        # TypeScript type definitions
│   ├── auth.ts                   # Auth types (AuthUser, LoginCredentials, etc.)
│   ├── dashboard.ts              # Dashboard types (Quiz, Flashcard, Badge, etc.)
│   ├── admin.ts                  # Admin types
│   └── index.ts                  # Re-exports
│
├── styles/
│   └── globals.css               # Additional global styles
│
├── public/                       # Static assets
│   ├── icon.svg                  # App icon (SVG)
│   ├── icon-dark-32x32.png       # Dark mode favicon
│   ├── icon-light-32x32.png      # Light mode favicon
│   ├── apple-icon.png            # Apple touch icon
│   ├── placeholder-logo.svg      # Logo placeholder
│   └── placeholder-user.jpg      # User avatar placeholder
│
├── docker-compose.yml            # Main services (postgres, milvus, etcd, minio, backend)
├── docker-compose.override.yml   # Dev overrides (frontend, optional ollama)
├── middleware.ts                  # Next.js middleware (route protection)
├── next.config.mjs               # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── postcss.config.mjs            # PostCSS configuration (Tailwind)
├── components.json               # shadcn/ui configuration
├── package.json                  # Frontend dependencies & scripts
└── .gitignore                    # Git ignore rules
```

---

## Installation Guide

### Prerequisites

Ensure all [system requirements](#system-requirements) are installed before proceeding.

### 1. Clone the Repository

```bash
git clone https://github.com/AbdulRehmanKhanDurrani/MedVision_Ai-.git
cd MedVision_Ai-
```

### 2. Backend Setup

#### Option A: Docker Compose (Recommended)

This starts PostgreSQL, Milvus (+ etcd, MinIO), and the backend API server:

```bash
# Copy environment template and configure
cp backend/.env.example backend/.env

# Edit backend/.env — set your API keys and secrets:
#   JWT_SECRET_KEY=<random-32-char-string>
#   ASSISTANT_OPENAI_API_KEY=sk-your-key-here (if using OpenAI)

# Start all services
docker compose up -d

# Verify all services are healthy
docker compose ps
```

#### Option B: Manual Backend Setup

```bash
# Create Python virtual environment
cd backend
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Optional: OCR support (large download)
pip install -r requirements-ocr.txt

# Optional: Full SHAP support
pip install -r requirements-ml-extra.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your settings

# Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Note**: For manual setup, PostgreSQL and Milvus must be running separately. See [`docker-compose.yml`](./docker-compose.yml) for default connection parameters.

### 3. Frontend Setup

```bash
# From the project root directory
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Verify Setup

1. **Backend health check**: Visit `http://localhost:8000/api/health`
   - Expected: `{"status": "ok", "database": "reachable", "milvus": {"host": "...", "port": 19530}}`

2. **Frontend**: Visit `http://localhost:3000`
   - You should see the landing page

3. **Login with bootstrap admin** (local dev only):
   - Set `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and `BOOTSTRAP_ADMIN_TOTP_SECRET` in `backend/.env`
   - Then sign in using those values (do not use default credentials in production)

---

## Environment Variables

All backend environment variables are defined in `backend/.env.example`. The `Settings` class in `backend/app/core/config.py` (Pydantic Settings) reads them from `backend/.env`.

### Core Application

| Variable | Purpose | Default |
|----------|---------|---------|
| `APP_NAME` | Application display name | `MedVision Backend` |
| `API_PREFIX` | API route prefix | `/api` |
| `FRONTEND_ORIGIN` | Allowed CORS origin(s), comma-separated | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg://medvision:medvision@postgres:5432/medvision` |
| `JWT_SECRET_KEY` | JWT signing key (≥32 chars) | `change-me-to-a-long-random-secret-at-least-32-chars` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `COOKIE_DOMAIN` | Cookie domain (empty = same origin) | *(empty)* |
| `COOKIE_SECURE` | Secure flag on cookies | `false` |
| `MILESTONE_ENV` | Environment identifier | `development` |

### Vector Database (Milvus)

| Variable | Purpose | Default |
|----------|---------|---------|
| `MILVUS_HOST` | Milvus server hostname | `milvus` (Docker) / `localhost` |
| `MILVUS_PORT` | Milvus gRPC port | `19530` |
| `MILVUS_COLLECTION_NAME` | Vector collection name | `document_chunks` |
| `MILVUS_URI` | Zilliz Cloud endpoint (optional) | *(empty)* |
| `MILVUS_TOKEN` | Zilliz Cloud API key (optional) | *(empty)* |

### Embeddings

| Variable | Purpose | Default |
|----------|---------|---------|
| `BIOBERT_MODEL_NAME` | HuggingFace model ID | `dmis-lab/biobert-v1.1` |
| `BIOBERT_LOCAL_PATH` | Local model directory (air-gapped) | *(empty)* |
| `EMBEDDING_DIMENSIONS` | Vector dimension (must match model) | `768` |

### Reranker

| Variable | Purpose | Default |
|----------|---------|---------|
| `RERANKER_ENABLED` | Enable cross-encoder reranking | `true` |
| `RERANKER_MODEL_NAME` | Cross-encoder model | `cross-encoder/ms-marco-MiniLM-L-6-v2` |

### Storage

| Variable | Purpose | Default |
|----------|---------|---------|
| `STORAGE_ROOT` | File storage directory | `./storage` |
| `MAX_UPLOAD_SIZE_MB` | Maximum upload file size | `50` |

### OCR

| Variable | Purpose | Default |
|----------|---------|---------|
| `ENABLE_PADDLEOCR_VL` | Enable PaddleOCR-VL | `true` |
| `ALLOW_OCR_FALLBACK` | Fall back to basic extraction if OCR fails | `true` |
| `ENABLE_DICOM_ANONYMIZATION` | Strip patient data from DICOM files | `true` |

### Bootstrap Admin

| Variable | Purpose | Default |
|----------|---------|---------|
| `BOOTSTRAP_ADMIN_EMAIL` | Initial admin email | *(set in `backend/.env`)* |
| `BOOTSTRAP_ADMIN_PASSWORD` | Initial admin password | *(generate a strong password in `backend/.env`)* |
| `BOOTSTRAP_ADMIN_FULL_NAME` | Initial admin display name | *(set in `backend/.env`)* |
| `BOOTSTRAP_ADMIN_TOTP_SECRET` | TOTP secret for admin 2FA | *(generate a new secret in `backend/.env`)* |
| `ADMIN_ALLOWED_EMAILS` | Comma-separated admin allowlist (max 3) | `admin@medvision.ai,admin2@medvision.ai,admin3@medvision.ai` |

### LLM Provider

| Variable | Purpose | Default |
|----------|---------|---------|
| `ASSISTANT_LLM_PROVIDER` | LLM provider (`openai` / `ollama` / `none`) | `openai` |
| `ASSISTANT_ENABLE_VERIFIER` | Enable faithfulness verification | `true` |
| `ASSISTANT_OPENAI_API_KEY` | OpenAI API key | *(required for openai provider)* |
| `ASSISTANT_OPENAI_BASE_URL` | OpenAI base URL | `https://api.openai.com/v1` |
| `ASSISTANT_OPENAI_MODEL` | OpenAI chat model | `gpt-4o-mini` |
| `ASSISTANT_OPENAI_MAX_TOKENS` | Max tokens for LLM response | `1024` |

### Ollama (Local LLM)

| Variable | Purpose | Default |
|----------|---------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | `http://localhost:11434` |
| `OLLAMA_CHAT_MODEL` | Ollama chat model | `llama3.2:3b` |
| `OLLAMA_VISION_MODEL` | Ollama vision model | `llava:7b` |
| `OLLAMA_REQUEST_TIMEOUT_S` | Request timeout (seconds) | `180` |
| `OLLAMA_NUM_CTX` | Context window cap (tokens) | `4096` |

### Vision & Explainability

| Variable | Purpose | Default |
|----------|---------|---------|
| `VISION_PROVIDER` | Vision provider (`openai` / `ollama`) | `openai` |
| `OPENAI_VISION_MODEL` | OpenAI vision model | `gpt-4o` |
| `ML_FEATURES_ENABLED` | Enable GradCAM++/LIME/SHAP (requires PyTorch) | `true` |
| `CHEXNET_WEIGHTS_PATH` | CheXNet weights file path (optional) | *(empty, uses ImageNet)* |

### Frontend Environment

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API URL override | *(auto-detected from browser URL)* |

---

## Database Documentation

### Database Setup

**Type**: PostgreSQL 16 (Alpine)

**Docker Setup** (recommended):
```bash
docker compose up -d postgres
```

**Manual Setup**:
```bash
# Install PostgreSQL 16
# Create database and user:
psql -U postgres -c "CREATE USER medvision WITH PASSWORD 'medvision';"
psql -U postgres -c "CREATE DATABASE medvision OWNER medvision;"
```

The application uses SQLAlchemy's `Base.metadata.create_all()` in `services/bootstrap.py` → `initialize_database()` during app startup. **No manual migrations are required** — all tables are created automatically on first run.

### Schema Overview

The database consists of **25+ tables** defined in `backend/app/models.py`:

#### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts (students & admins) | `id`, `email`, `password_hash`, `role`, `totp_secret`, `totp_enabled` |
| `sessions` | JWT session tracking | `id`, `user_id` (FK), `refresh_token_hash`, `expires_at`, `revoked_at` |
| `audit_logs` | Immutable security audit trail | `id`, `actor_user_id` (FK), `action`, `target_type`, `target_id`, `metadata_json` |

#### Document & RAG Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `documents` | Uploaded files (PDF, image, DICOM) | `id`, `owner_user_id` (FK), `title`, `kind`, `status`, `storage_path`, `chunk_count` |
| `document_chunks` | Text chunks for retrieval | `id`, `document_id` (FK), `chunk_index`, `content`, `lexical_terms` (JSON), `embedding_model` |
| `ingestion_jobs` | Background ingestion tracking | `id`, `document_id` (FK), `stage`, `status`, `progress` |

#### Learning Engine Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `quizzes` | Quiz containers | `id`, `title`, `topic`, `difficulty`, `status`, `chat_session_id` (FK) |
| `quiz_questions` | Individual questions | `id`, `quiz_id` (FK), `prompt`, `options_json`, `correct_answer`, `irt_difficulty` |
| `quiz_attempts` | Student quiz submissions | `id`, `quiz_id` (FK), `user_id` (FK), `score`, `xp_earned`, `answers_json` |
| `flashcard_decks` | Flashcard deck containers | `id`, `title`, `topic`, `status`, `chat_session_id` (FK) |
| `flashcards` | Individual cards | `id`, `deck_id` (FK), `front_text`, `back_text`, `tag_list` (JSON) |
| `flashcard_reviews` | SM-2 spaced repetition state | `id`, `user_id` (FK), `flashcard_id` (FK), `ease_factor`, `interval_days`, `next_review_date` |
| `flashcard_review_events` | Review history log | `id`, `user_id` (FK), `flashcard_id` (FK), `rating`, `xp_earned` |

#### AI Chat & Traces

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `chat_sessions` | Chat conversation containers | `id`, `user_id` (FK), `title` |
| `chat_messages` | Individual messages (user/assistant) | `id`, `chat_session_id` (FK), `role`, `content`, `citations_json`, `confidence` |
| `assistant_traces` | RAG turn audit trail | `id`, `chat_session_id` (FK), `question`, `answer`, `retrieval_mode`, `faithfulness_passed` |
| `agent_steps` | Agentic reasoning steps | `id`, `trace_id` (FK), `step_index`, `step_type`, `input_json`, `output_json`, `elapsed_ms` |

#### Vision & Explainability

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `vision_traces` | Vision action audit trail | `id`, `user_id` (FK), `document_id` (FK), `action`, `request_json`, `response_json` |
| `vision_artifacts` | Stored heatmaps/images | `id`, `trace_id` (FK), `kind`, `storage_path`, `checksum_sha256` |

#### Gamification & Progress

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `user_progress` | Per-topic mastery scores | `id`, `user_id` (FK), `topic_slug`, `mastery_score`, `bkt_mastery_probability` |
| `chat_topic_progress` | Per-chat-session topic mastery | `id`, `user_id` (FK), `chat_session_id` (FK), `topic_slug`, `mastery_score` |
| `badges` | Badge definitions | `id`, `slug`, `name`, `description`, `xp_reward` |
| `user_badges` | Awarded badges | `id`, `user_id` (FK), `badge_id` (FK), `awarded_at` |
| `leaderboard` | Seasonal leaderboard | `id`, `user_id` (FK), `season`, `xp`, `streak_days`, `level` |
| `user_streaks` | User streak & XP state | `id`, `user_id` (FK), `streak_days`, `xp`, `level`, `longest_streak` |
| `shown_quiz_questions` | Prevents question repetition | `id`, `user_id` (FK), `chat_session_id` (FK), `question_id` (FK) |
| `shown_flashcards` | Prevents flashcard repetition | `id`, `user_id` (FK), `chat_session_id` (FK), `flashcard_id` (FK) |

#### Admin Corrections (HIL)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `admin_corrections` | Expert corrections of AI outputs | `id`, `admin_user_id` (FK), `target_kind`, `corrected_text`, `status`, `reviewed_by_user_id` (FK) |

### Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ sessions : has
    users ||--o{ documents : owns
    users ||--o{ chat_sessions : has
    users ||--o{ quiz_attempts : takes
    users ||--o{ flashcard_reviews : reviews
    users ||--o{ user_progress : tracks
    users ||--o{ user_streaks : has
    users ||--o{ user_badges : earns
    
    documents ||--o{ document_chunks : contains
    documents ||--o{ ingestion_jobs : has
    documents ||--o{ vision_traces : analyzed_in
    
    chat_sessions ||--o{ chat_messages : contains
    chat_sessions ||--o{ assistant_traces : logged_in
    chat_sessions ||--o{ quizzes : generated_from
    chat_sessions ||--o{ flashcard_decks : generated_from
    
    assistant_traces ||--o{ agent_steps : contains
    vision_traces ||--o{ vision_artifacts : produces
    
    quizzes ||--o{ quiz_questions : contains
    quizzes ||--o{ quiz_attempts : attempted_via
    
    flashcard_decks ||--o{ flashcards : contains
    flashcards ||--o{ flashcard_reviews : reviewed_via
    
    badges ||--o{ user_badges : awarded_as
    
    admin_corrections }o--|| assistant_traces : corrects
    admin_corrections }o--|| vision_traces : corrects
```

### SQL — Database Creation

The application auto-creates all tables. If you need to create them manually:

```sql
-- Create database
CREATE USER medvision WITH PASSWORD 'medvision';
CREATE DATABASE medvision OWNER medvision;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medvision TO medvision;
```

All table DDL is generated by SQLAlchemy from the models in `backend/app/models.py`. The `initialize_database()` function in `backend/app/services/bootstrap.py` calls `Base.metadata.create_all(bind=engine)` on app startup.

---

## Dependencies Documentation

### Frontend Dependencies

#### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | React meta-framework (App Router, SSR, middleware) |
| `react` / `react-dom` | 19.2.4 | UI rendering library |
| `typescript` | 5.7.3 | Type safety |

#### UI Component Library (Radix UI / shadcn)
| Package | Purpose |
|---------|---------|
| `@radix-ui/react-*` (25 packages) | Accessible, unstyled UI primitives (dialog, dropdown, tabs, etc.) |
| `class-variance-authority` | Component variant management |
| `clsx` + `tailwind-merge` | Conditional class merging |
| `lucide-react` | Icon library |
| `cmdk` | Command palette component |
| `vaul` | Drawer component |
| `sonner` | Toast notifications |
| `input-otp` | OTP input field (admin TOTP) |

#### Styling
| Package | Purpose |
|---------|---------|
| `tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/postcss` | PostCSS integration |
| `tw-animate-css` | Animation utilities |
| `autoprefixer` | CSS vendor prefix automation |

#### Data & Visualization
| Package | Purpose |
|---------|---------|
| `recharts` | Chart library for dashboard analytics |
| `date-fns` | Date manipulation utility |
| `react-day-picker` | Calendar component |

#### 3D & Animation
| Package | Purpose |
|---------|---------|
| `@react-three/fiber` | React renderer for Three.js (landing page 3D scene) |
| `@react-three/drei` | Three.js helper components |
| `three` | 3D graphics library |
| `motion` | Animation library (Framer Motion) |

#### Forms & Validation
| Package | Purpose |
|---------|---------|
| `react-hook-form` | Form state management |
| `@hookform/resolvers` | Resolver adapters (Zod integration) |
| `zod` | Schema-based validation |

#### Other
| Package | Purpose |
|---------|---------|
| `@vercel/analytics` | Production analytics |
| `next-themes` | Theme (dark/light) management |
| `react-resizable-panels` | Resizable panel layout |
| `embla-carousel-react` | Carousel component |

### Backend Dependencies

#### Core Framework
| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.115.8 | Web framework for API |
| `uvicorn[standard]` | 0.34.0 | ASGI server |
| `pydantic-settings` | 2.7.1 | Environment variable management |
| `python-multipart` | 0.0.20 | File upload handling |
| `email-validator` | 2.2.0 | Email format validation |

#### Database
| Package | Version | Purpose |
|---------|---------|---------|
| `sqlalchemy` | 2.0.38 | ORM for PostgreSQL |
| `psycopg[binary]` | 3.2.5 | PostgreSQL driver (async-capable, v3) |
| `pymilvus` | 2.5.4 | Milvus vector DB client |

#### Authentication
| Package | Version | Purpose |
|---------|---------|---------|
| `python-jose[cryptography]` | 3.3.0 | JWT creation & verification |
| `passlib[bcrypt]` | 1.7.4 | Password hashing (bcrypt) |
| `bcrypt` | 4.0.1 | bcrypt C backend |
| `pyotp` | 2.9.0 | TOTP 2FA generation/verification |

#### AI/ML — Embeddings & Retrieval
| Package | Version | Purpose |
|---------|---------|---------|
| `sentence-transformers` | 3.4.1 | Cross-encoder reranking model |
| `transformers` | 4.51.3 | BioBERT tokenizer & model loading |
| `torch` | 2.6.0 | Deep learning framework |
| `torchvision` | 0.21.0 | DenseNet121 (CheXNet) for GradCAM++ |
| `rank-bm25` | 0.2.2 | BM25 lexical scoring |
| `numpy` | 2.2.3 | Numerical computation |
| `scipy` | 1.13.1 | Scientific computing utilities |

#### AI/ML — Explainability
| Package | Version | Purpose |
|---------|---------|---------|
| `scikit-learn` | 1.6.1 | LIME Ridge regression, SHAP utilities |
| `scikit-image` | 0.25.2 | LIME superpixel segmentation (SLIC) |
| `shap` | 0.47.0 | SHAP KernelExplainer for attribution maps |

#### AI/ML — Agentic RAG
| Package | Version | Purpose |
|---------|---------|---------|
| `langgraph` | 0.2.62 | Graph-based agent orchestration |
| `langchain-core` | 0.3.31 | BaseMessage classes, runnable infrastructure |

#### Document Processing
| Package | Version | Purpose |
|---------|---------|---------|
| `pypdf` | 5.4.0 | PDF text extraction |
| `pydicom` | 3.0.1 | DICOM medical image parsing |
| `Pillow` | 11.2.1 | Image processing & conversion |

#### Optional Dependencies
| Package | File | Purpose |
|---------|------|---------|
| `paddlepaddle` | `requirements-ocr.txt` | PaddlePaddle framework for OCR |
| `paddleocr[doc-parser]` | `requirements-ocr.txt` | PaddleOCR-VL document OCR |
| `shap` | `requirements-ml-extra.txt` | SHAP C-extension (performance) |

---

## Running the Application Locally

### Quick Start (Docker Compose)

```bash
# 1. Clone and enter project
git clone https://github.com/AbdulRehmanKhanDurrani/MedVision_Ai-.git
cd MedVision_Ai-

# 2. Configure backend environment
cp backend/.env.example backend/.env
# Edit backend/.env: set JWT_SECRET_KEY, ASSISTANT_OPENAI_API_KEY

# 3. Start all backend services (PostgreSQL, Milvus, backend API)
docker compose up -d

# 4. Install frontend dependencies
npm install

# 5. Start frontend dev server
npm run dev

# 6. Open http://localhost:3000 in your browser
```

### Full Docker Setup (Including Frontend)

```bash
# Starts everything including frontend in Docker:
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# Milvus:   http://localhost:19530
# MinIO:    http://localhost:9001
```

### With Local Ollama (Free LLM)

```bash
# Start Ollama service
ollama serve

# Pull models
ollama pull llama3.2:3b        # Chat model
ollama pull llava:7b            # Vision model (optional)

# Set in backend/.env:
#   ASSISTANT_LLM_PROVIDER=ollama
#   VISION_PROVIDER=ollama
```

### Verifying Successful Setup

| Check | URL / Command | Expected Result |
|-------|---------------|-----------------|
| Backend health | `GET http://localhost:8000/api/health` | `{"status": "ok", "database": "reachable"}` |
| Backend root | `GET http://localhost:8000/` | `{"name": "MedVision Backend", "status": "running"}` |
| Frontend | `http://localhost:3000` | Landing page renders |
| Login | Student or admin login page | Login succeeds with bootstrap credentials |

---

## API Documentation

All API endpoints are prefixed with `/api`. Authentication is via HttpOnly cookies set by the login endpoint.

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | Public | Register a new student account |
| `POST` | `/auth/login` | Public | Login (student or admin), returns JWT cookies |
| `GET` | `/auth/me` | Required | Get current authenticated user |
| `POST` | `/auth/refresh` | Cookie | Refresh access token using refresh token |
| `POST` | `/auth/logout` | Cookie | Revoke session, clear cookies |
| `POST` | `/auth/forgot-password` | Public | Request password reset email |

**Login Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "student",
  "totp_code": "123456"  // Required for admin only
}
```

### Documents (`/api/documents`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/documents/upload` | Required | Upload a document (PDF, image, DICOM) |
| `GET` | `/documents` | Required | List all visible documents |
| `GET` | `/documents/{id}/chunks` | Required | Get document chunks |
| `POST` | `/documents/search` | Required | Hybrid search across documents |
| `DELETE` | `/documents/{id}` | Required | Delete a document |

### AI Assistant (`/api/assistant`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/assistant/sessions` | Required | List chat sessions |
| `GET` | `/assistant/sessions/{id}` | Required | Get session detail (messages + agent steps) |
| `POST` | `/assistant/ask` | Required | Ask a question (runs agentic RAG pipeline) |

**Ask Request Body:**
```json
{
  "question": "What are the signs of pneumothorax on chest X-ray?",
  "chat_session_id": "uuid-or-null",
  "top_k": 6,
  "document_ids": ["uuid"],
  "mode": "agentic"
}
```

### Vision & Explainability (`/api/vision`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/vision/documents/{id}/caption` | Required | Generate AI caption for image |
| `POST` | `/vision/documents/{id}/vqa` | Required | Visual question answering |
| `POST` | `/vision/documents/{id}/gradcam` | Required | GradCAM++ heatmap generation |
| `POST` | `/vision/documents/{id}/lime` | Required | LIME superpixel explanation |
| `POST` | `/vision/documents/{id}/shap` | Required | SHAP attribution map |
| `POST` | `/vision/documents/{id}/attention` | Required | Cross-modal attention visualization |
| `POST` | `/vision/documents/{id}/analyze` | Required | Combined analysis (caption + GradCAM + VQA + optional LIME/SHAP/attention) |
| `GET` | `/vision/traces/{trace_id}` | Required | Retrieve vision trace |
| `GET` | `/vision/artifacts/{artifact_id}` | Required | Download stored artifact |
| `POST` | `/vision/search` | Required | Hybrid text + image search |

### Quizzes (`/api/quizzes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/quizzes/generate` | Required | Generate quiz from chat session context |
| `GET` | `/quizzes` | Required | List available quizzes |
| `GET` | `/quizzes/{id}` | Required | Get quiz detail (questions) |
| `POST` | `/quizzes/{id}/submit` | Required | Submit quiz answers (scores, XP, weak areas) |
| `GET` | `/quizzes/{id}/attempts` | Required | List quiz attempts |
| `GET` | `/quizzes/attempts/{attempt_id}` | Required | Get attempt detail (per-question review) |

### Flashcards (`/api/flashcards`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/flashcards/generate` | Required | Generate flashcard deck from chat context |
| `GET` | `/flashcards/decks` | Required | List flashcard decks |
| `GET` | `/flashcards/decks/{id}` | Required | Get deck detail (cards + review state) |
| `GET` | `/flashcards/decks/{id}/due` | Required | Get due cards for a deck |
| `GET` | `/flashcards/due` | Required | Get all due cards across decks |
| `POST` | `/flashcards/decks/{id}/review` | Required | Submit card review (SM-2 update, XP) |

### Gamification (`/api/gamification`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/gamification/summary` | Required | Get achievements, leaderboard, daily challenge, weekly quests |

### Progress (`/api/progress`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/progress/stats` | Required | Dashboard stats (XP, streak, topic mastery, study activity) |
| `GET` | `/progress/weak-areas` | Required | Ranked weak topics |

### Admin Analytics (`/api/admin/analytics`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/analytics/overview` | Admin | Platform overview statistics |
| `GET` | `/admin/analytics/report` | Admin | Detailed analytics report |

### Admin Content (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/quizzes` | Admin | List all quizzes (admin view) |
| `GET` | `/admin/quizzes/{id}` | Admin | Get quiz detail (with answers) |
| `POST` | `/admin/quizzes` | Admin | Create new quiz |
| `PUT` | `/admin/quizzes/{id}` | Admin | Update quiz |
| `POST` | `/admin/quizzes/{id}/publish` | Admin | Publish quiz |
| `POST` | `/admin/quizzes/{id}/archive` | Admin | Archive quiz |
| `DELETE` | `/admin/quizzes/{id}` | Admin | Delete quiz |
| `GET` | `/admin/flashcard-decks` | Admin | List all decks |
| `GET` | `/admin/flashcard-decks/{id}` | Admin | Get deck detail |
| `POST` | `/admin/flashcard-decks` | Admin | Create deck |
| `PUT` | `/admin/flashcard-decks/{id}` | Admin | Update deck |
| `POST` | `/admin/flashcard-decks/{id}/publish` | Admin | Publish deck |
| `POST` | `/admin/flashcard-decks/{id}/archive` | Admin | Archive deck |
| `DELETE` | `/admin/flashcard-decks/{id}` | Admin | Delete deck |

### Admin Operations (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/students` | Admin | List all students |
| `GET` | `/admin/students/{id}` | Admin | Get student detail |
| `GET` | `/admin/operations/students` | Admin | Paginated student list with search |
| `POST` | `/admin/operations/students/{id}/suspend` | Admin | Suspend student account |
| `POST` | `/admin/operations/students/{id}/reset-password` | Admin | Reset student password |
| `GET` | `/admin/audit-logs` | Admin | List audit logs |
| `GET` | `/admin/operations/audit-log` | Admin | Paginated audit log |
| `GET` | `/admin/system` | Admin | System status |

### Admin Corrections (`/api/admin/corrections`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/admin/corrections/queue` | Admin | Paginated trace queue (filterable) |
| `GET` | `/admin/corrections/traces/{kind}/{id}` | Admin | Trace detail (citations, agent steps, heatmaps) |
| `POST` | `/admin/corrections` | Admin | Submit expert correction |
| `GET` | `/admin/corrections` | Admin | List corrections (filterable by status/kind) |
| `GET` | `/admin/corrections/{id}` | Admin | Single correction detail |
| `POST` | `/admin/corrections/{id}/review` | Admin | Apply/reject correction (dual-admin) |
| `GET` | `/admin/corrections/export.jsonl` | Admin | JSONL export for fine-tuning |

### Health (`/api`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | Public | Health check (DB + Milvus status) |

---

## Deployment Information

### Current Deployment

| Component | Platform | URL |
|-----------|----------|-----|
| **Frontend** | Vercel | [https://med-vision-ai-ashen.vercel.app](https://med-vision-ai-ashen.vercel.app) |
| **Backend** | Docker (self-hosted or cloud) | Configured via `NEXT_PUBLIC_API_BASE_URL` |

### Frontend Deployment (Vercel)

The frontend is deployed to Vercel with automatic builds:

```bash
# Build command (Vercel auto-detects)
npm run build

# Output: .next/ directory (SSR + static)
```

**Vercel Configuration**:
- Framework: Next.js (auto-detected)
- Build command: `next build`
- Output directory: `.next`
- Environment variable: `NEXT_PUBLIC_API_BASE_URL` must point to the production backend

### Backend Deployment (Docker)

```bash
# Build the backend image
docker build -t medvision-backend ./backend

# Build with optional features
docker build -t medvision-backend \
  --build-arg INSTALL_OCR=true \
  --build-arg INSTALL_ML=true \
  ./backend

# Run with Docker Compose
docker compose up -d
```

### Production Considerations

- Set `COOKIE_SECURE=true` for HTTPS deployments
- Set `COOKIE_DOMAIN` to your domain
- Use a strong `JWT_SECRET_KEY` (≥32 random characters)
- Set `MILESTONE_ENV=production`
- Set `FRONTEND_ORIGIN` to your production frontend URL
- Use managed PostgreSQL (e.g., Railway, Supabase, RDS)
- Consider Zilliz Cloud for managed Milvus (`MILVUS_URI` + `MILVUS_TOKEN`)

---

## Troubleshooting

### Dependency Installation Failures

| Issue | Solution |
|-------|----------|
| `npm install` fails with peer dependency conflicts | Run `npm install --legacy-peer-deps` |
| Python `torch` installation too slow | Use `--index-url https://download.pytorch.org/whl/cpu` for CPU-only |
| `psycopg` build error on Windows | Install `psycopg[binary]` (already in requirements.txt) |
| PaddleOCR install fails | OCR is optional; skip `requirements-ocr.txt` and set `ENABLE_PADDLEOCR_VL=false` |

### Environment Variable Issues

| Issue | Solution |
|-------|----------|
| Backend won't start: "JWT_SECRET_KEY too short" | Ensure `JWT_SECRET_KEY` is ≥32 characters |
| "Module not found" for BioBERT | First run downloads the model (~440MB); ensure internet access |
| Backend ignores `.env` | File must be at `backend/.env` (not project root) |
| Frontend can't reach backend | Set `NEXT_PUBLIC_API_BASE_URL` or ensure backend runs on same hostname port 8000 |

### Database Connection Problems

| Issue | Solution |
|-------|----------|
| "Connection refused" to PostgreSQL | Ensure PostgreSQL is running: `docker compose ps postgres` |
| "Role medvision does not exist" | Run `docker compose up -d postgres` (auto-creates user/db) |
| Milvus connection timeout | Milvus needs etcd + MinIO; run full `docker compose up -d` |
| "relation does not exist" | Tables auto-create on startup; restart the backend |

### Build Failures

| Issue | Solution |
|-------|----------|
| TypeScript errors on build | Run `npx tsc --noEmit` to check; may need `@types/*` packages |
| Next.js build OOM | Increase Node memory: `NODE_OPTIONS=--max_old_space_size=4096 npm run build` |
| Docker build slow | Use BuildKit: `DOCKER_BUILDKIT=1 docker compose build` |

### Runtime Errors

| Issue | Solution |
|-------|----------|
| "Vision provider unavailable" (502) | Check `ASSISTANT_OPENAI_API_KEY` or Ollama is running |
| GradCAM returns "proxy" method | PyTorch/torchvision not installed or `ML_FEATURES_ENABLED=false` |
| Document upload fails | Check `MAX_UPLOAD_SIZE_MB` and `STORAGE_ROOT` permissions |
| Admin login rejected | Verify email is in `ADMIN_ALLOWED_EMAILS` and TOTP code is correct |

---

## Development Guide

### Available Scripts

**Frontend:**
```bash
npm run dev          # Start dev server (hot reload)
npm run dev:local    # Dev server on 127.0.0.1:3000
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
```

**Backend:**
```bash
# From backend/ directory with venv activated
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000   # Dev server
```

### Adding New Features

#### Adding a New API Endpoint

1. **Define schema** in `backend/app/schemas/` (Pydantic models)
2. **Create route** in `backend/app/api/routes/` (FastAPI router)
3. **Register router** in `backend/app/main.py`
4. **Add service logic** in `backend/app/services/` (if needed)
5. **Add frontend API client** in `lib/api/` (TypeScript fetch wrapper)
6. **Add types** in `types/` (TypeScript interfaces)

#### Adding a New Dashboard Page

1. Create page component in `app/dashboard/<feature>/page.tsx`
2. Add navigation link in `components/dashboard/shell/`
3. Create feature-specific components in `components/dashboard/`
4. Add API client in `lib/api/`

### Coding Conventions

#### Frontend
- **Components**: PascalCase (`AssistantChat.tsx`)
- **Hooks**: camelCase with `use` prefix (`useDocuments.ts`)
- **API clients**: camelCase (`lib/api/assistant.ts`)
- **Types**: PascalCase interfaces (`AuthUser`)
- **Path aliases**: `@/` maps to project root
- **UI primitives**: Use shadcn/ui components from `components/ui/`

#### Backend
- **Modules**: snake_case (`admin_corrections.py`)
- **Classes**: PascalCase (`AdminCorrection`)
- **Routes**: Organized by domain (`/api/auth`, `/api/vision`, etc.)
- **Services**: Pure functions or classes, no direct HTTP logic
- **Models**: SQLAlchemy 2.0 `Mapped` annotations with `mapped_column`
- **Schemas**: Pydantic v2 `BaseModel` with `model_validate`

### Testing

- **Backend**: The project does not currently include an automated test suite. Manual testing can be done via the FastAPI interactive docs at `http://localhost:8000/docs` (Swagger UI).
- **Frontend**: No automated tests are configured. Use the browser dev tools and UI interactions for manual verification.

---

## Additional Notes

### Architectural Decisions

1. **Cookie-based JWT over Bearer tokens**: Chosen for HttpOnly cookie security (XSS protection) and automatic cookie forwarding across frontend/backend origins.

2. **Dual-database design (PostgreSQL + Milvus)**: PostgreSQL handles all relational data and ACID transactions; Milvus provides high-performance approximate nearest neighbor (ANN) search for BioBERT dense embeddings.

3. **BioBERT over general-purpose embeddings**: Domain-specific biomedical embeddings (768-dim) provide significantly better retrieval quality for radiology content versus general models like `all-MiniLM-L6-v2`.

4. **Agentic RAG with LangGraph**: The multi-step planner→retriever→generator→verifier architecture enables self-correcting responses with faithfulness checking, reducing hallucination in medical content.

5. **SM-2 spaced repetition + BKT**: The combination of SuperMemo 2 scheduling for flashcards and Bayesian Knowledge Tracing for mastery estimation provides personalized adaptive learning.

6. **Admin corrections as a separate table with dual-admin review**: Ensures corrections are auditable, the original AI output is preserved (forensic snapshot), and no single admin can unilaterally alter AI outputs.

### Known Limitations

- **No email sending**: Password reset and email verification are placeholder implementations; no SMTP integration exists.
- **No WebSocket/SSE**: RAG responses are synchronous; long queries may timeout on slow LLM providers.
- **Single-instance Milvus**: The standalone Milvus setup is not horizontally scalable; consider Milvus cluster or Zilliz Cloud for production.
- **No automated testing**: The project lacks unit tests, integration tests, and E2E tests.
- **Admin count hard-capped at 3**: Defined by `ADMIN_ALLOWED_EMAILS` and enforced at login + boot time.

### Security Considerations

- TOTP 2FA is **required** for all admin logins
- Admin allowlist is enforced at both login and application boot (non-allowlisted admins are demoted)
- All passwords are hashed with bcrypt (cost factor = default)
- Refresh token rotation on each refresh (old token revoked)
- Rate limiting on login endpoint (10 attempts/60s per email+IP)
- Account lockout after 5 failed attempts (15-minute cooldown)
- DICOM anonymization strips patient metadata before storage
- Audit log captures all security-relevant actions

---

## License

```
MIT License

Copyright (c) 2026 Emad Hasan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---


