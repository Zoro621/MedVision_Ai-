# MedVision AI — Developer Handoff Notes
**Branch:** version3  
**Last updated:** April 2026  
**Status:** Phase 5 complete and tested locally

---

## What Was Built (Phase 5)

### Backend (FastAPI)
- Chat-scoped adaptive quiz and flashcard generation using Gemini API
- Non-repetition system: shown questions and cards are tracked per user per chat in the database
- Weak topic detection: after every quiz attempt, wrong topics are stored and used to weight the next quiz (70% weak topics, 30% other)
- Admin content stats: per-question attempt count, avg score, difficulty index
- All new tables auto-created on startup via bootstrap.py

### Frontend (Next.js 16)
- `lib/activeSession.ts` — stores active chat session ID in localStorage
- `app/dashboard/quizzes/generate/page.tsx` — generates adaptive MCQ quiz from active chat
- `app/dashboard/flashcards/study-chat/page.tsx` — SM-2 flashcard study scoped to active chat
- Student dashboard — weak areas panel showing topic mastery per chat
- Admin dashboard — content stats table
- Student dashboard — "Practice from Current Chat" navigation panel

---

## How to Run Locally

### Prerequisites
- Node.js 20+
- Docker Desktop (must be running)
- pnpm installed globally (`npm install -g pnpm`)

### Start Backend
```bash
cd MedVision_Ai-
copy backend\.env.example backend\.env   # first time only
docker compose up --build
```

### Start Frontend (separate terminal)
```bash
npm install    # first time only
npm run dev:local
```

### Open
- Frontend: http://127.0.0.1:3000
- Backend API: http://127.0.0.1:8000
- API Docs: http://127.0.0.1:8000/docs

### Default Admin Login
- Email: admin@medvision.ai
- Password: Admin123!
- TOTP: `docker compose exec -T backend python -c "import pyotp; print(pyotp.TOTP('JBSWY3DPEHPK3PXP').now())"` 

---

## Known Issues / Warnings
- `middleware` deprecation warning in Next.js — harmless, rename to `proxy` eventually
- pnpm lockfile warning on startup — harmless
- OCR is disabled in current Docker build (INSTALL_OCR=false). To enable: `docker compose build --build-arg INSTALL_OCR=true backend` 

---

## What Comes Next (Phase 6)
- XP, levels, streaks, badges, leaderboard
- Daily challenges and weekly quests
- Replace remaining mock dashboard panels with real data
- Cohort-level admin reporting and struggling-student alerts
- Content performance metrics

---

## Important Files
| File | Purpose |
|------|---------|
| `backend/app/services/adaptive_learning_service.py` | Core Gemini generation + weak topic logic |
| `backend/app/services/bootstrap.py` | DB schema auto-creation on startup |
| `backend/app/schemas/learning.py` | Pydantic models for quiz/flashcard |
| `lib/activeSession.ts` | Frontend chat session persistence |
| `backend/.env` | Backend environment variables (not committed) |
| `.env.local` | Frontend env (not committed) — set NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api |
