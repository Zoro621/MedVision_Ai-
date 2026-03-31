# MedVision AI — How to Run Locally

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | For the Next.js frontend |
| pnpm | 8+ | `npm install -g pnpm` |
| Python | 3.12 | For the backend |
| Docker Desktop | Latest | For PostgreSQL + Milvus + MinIO |

---

## 1. Start Infrastructure (PostgreSQL + Milvus + MinIO)

```powershell
# From the project root
docker compose up -d postgres etcd minio milvus
```

Wait ~15 seconds for Milvus to become healthy, then verify:

```powershell
docker compose ps
# All four services should show status "running" or "healthy"
```

---

## 2. Start the Backend (FastAPI)

### Option A — Run directly with Python (recommended for development)

```powershell
# Create and activate virtual environment
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows PowerShell

# Install base dependencies
pip install -r requirements.txt

# (Optional) Install OCR support — requires a GPU or takes time to download
pip install -r requirements-ocr.txt

# Copy environment file and edit if needed
copy .env.example .env

# Start the backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend auto-creates the PostgreSQL schema and seeds the default admin on first boot.

### Option B — Run the backend in Docker

```powershell
docker compose up -d backend
```

Backend is available at: **http://localhost:8000**  
API docs (Swagger): **http://localhost:8000/docs**  
Health check: **http://localhost:8000/api/health**

---

## 3. Start the Frontend (Next.js)

```powershell
# From the project root
pnpm install
pnpm dev
```

Frontend is available at: **http://localhost:3000**

---

## 4. Default Credentials

| Role | Email | Password | Note |
|------|-------|----------|------|
| Admin | `admin@medvision.ai` | `Admin123!` | Requires TOTP — see below |
| Student | *(register via UI)* | *(your choice)* | `/register` |

### Admin TOTP Setup

The default admin TOTP secret is `JBSWY3DPEHPK3PXP`. To get a valid 6-digit code:

```python
# Run this one-liner in any Python shell with pyotp installed
python -c "import pyotp; print(pyotp.TOTP('JBSWY3DPEHPK3PXP').now())"
```

Or add `JBSWY3DPEHPK3PXP` as a manual entry in any authenticator app (Google Authenticator, Authy, etc.).

---

## 5. Observe the PostgreSQL Database

### Connect via psql in Docker

```powershell
docker exec -it fyp_prototype-postgres-1 psql -U medvision -d medvision
```

> **Note:** The container name might differ. Run `docker compose ps` to find the exact name.

### Useful queries

```sql
-- List all registered users
SELECT id, email, full_name, role, is_active, failed_login_attempts, created_at
FROM users
ORDER BY created_at DESC;

-- List all active sessions (logged-in users)
SELECT s.id, u.email, u.role, s.ip_address, s.created_at, s.expires_at, s.revoked_at
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.revoked_at IS NULL AND s.expires_at > NOW()
ORDER BY s.created_at DESC;

-- Audit log — recent auth events
SELECT created_at, action, target_type, target_id, metadata_json
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;

-- All uploaded documents and their ingestion status
SELECT id, title, file_name, kind, status, page_count, chunk_count, owner_user_id, created_at
FROM documents
ORDER BY created_at DESC;

-- Document chunks for a specific document
SELECT chunk_index, page_start, section_heading, LEFT(content, 80) AS preview
FROM document_chunks
WHERE document_id = '<paste-document-id-here>'
ORDER BY chunk_index;

-- Leaderboard
SELECT u.full_name, l.xp, l.level, l.streak_days, l.season
FROM leaderboard l
JOIN users u ON l.user_id = u.id
ORDER BY l.xp DESC;

-- Badges earned by users
SELECT u.email, b.name, ub.awarded_at
FROM user_badges ub
JOIN users u ON ub.user_id = u.id
JOIN badges b ON ub.badge_id = b.id
ORDER BY ub.awarded_at DESC;
```

### Exit psql

```sql
\q
```

---

## 6. All-in-One (Docker only — no local Python needed)

```powershell
# Start everything including the backend in Docker
docker compose up -d

# Follow backend logs
docker compose logs -f backend

# Stop everything
docker compose down
```

> **OCR note:** The backend Docker image is built without OCR by default (`INSTALL_OCR=false`).  
> To build with OCR support (requires GPU passthrough in Docker):
> ```powershell
> docker compose build --build-arg INSTALL_OCR=true backend
> docker compose up -d backend
> ```

---

## 7. Useful Dev Commands

```powershell
# Reset the database (wipe all data and re-seed)
docker compose down -v          # removes named volumes (data is lost!)
docker compose up -d postgres etcd minio milvus
# Then restart the backend

# View running containers
docker compose ps

# Backend logs (real-time)
docker compose logs -f backend

# PostgreSQL logs
docker compose logs -f postgres

# Run Next.js type-check
pnpm tsc --noEmit

# Run Next.js linter
pnpm lint
```

---

## 8. Environment Variables

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+psycopg://medvision:medvision@localhost:5432/medvision` | PostgreSQL connection |
| `JWT_SECRET_KEY` | `change-me-to-a-long-random-secret` | **Change in production** |
| `MILVUS_HOST` | `localhost` | Milvus vector DB host |
| `ENABLE_PADDLEOCR_VL` | `true` | Toggle OCR extraction |
| `BOOTSTRAP_ADMIN_EMAIL` | `admin@medvision.ai` | Seeded admin email |
| `BOOTSTRAP_ADMIN_PASSWORD` | `Admin123!` | Seeded admin password |
| `BOOTSTRAP_ADMIN_TOTP_SECRET` | `JBSWY3DPEHPK3PXP` | Admin 2FA secret |

Frontend env (create `fyp_prototype/.env.local`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```
