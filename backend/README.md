# MedVision Backend

Phase 1 introduces a new FastAPI backend for the current prototype. This service owns:

- authentication and role-based access control
- persisted users, sessions, and audit logs
- the base relational schema shells for documents, quizzes, flashcards, progress, badges, and leaderboard data
- local development connectivity to PostgreSQL and Milvus

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and adjust secrets if needed.
2. Start the local stack from the repo root:

```bash
docker compose up --build
```

3. Run the frontend separately from the repo root:

```bash
npm run dev
```

The backend seeds a default admin account on startup using the bootstrap env vars.

Default local admin credentials:

- Email: `admin@medvision.ai`
- Password: `Admin123!`
- TOTP secret: `JBSWY3DPEHPK3PXP`

Use that secret in an authenticator app to generate the six-digit admin login code.
