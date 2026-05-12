# MedVision AI — Deployment Guide (Local LLM / Ollama)

All deployment strategies use **Ollama with locally-hosted models** — no paid LLM APIs.

---

## Quick Start — Run the Complete App

Two modes depending on your preference. **Mode A (Docker) is the easiest.**

### Prerequisites (both modes)

```powershell
# 1. Ensure Ollama is installed and running
ollama serve                                  # starts Ollama server (skip if already running)

# 2. Pull the required models
ollama pull llama3.1:8b-instruct-q4_K_M
ollama pull qwen2.5vl:7b-q4_K_M

# 3. Create your .env from the example
Copy-Item backend\.env.example backend\.env  # REQUIRED — compose will error without this
```

---

### Mode A — Everything in Docker (Recommended)

All services (infra + backend + frontend) run in containers. Ollama stays on your host.

```powershell
# Open backend\.env and change ONE line so the container can reach your host's Ollama:
#   OLLAMA_BASE_URL=http://host.docker.internal:11434
#   (leave DATABASE_URL and MILVUS_HOST as-is — they use Docker DNS)

# Build and start all services
docker compose up -d --build

# Watch logs (optional)
docker compose logs -f backend
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Swagger docs | http://localhost:8000/docs |
| Postgres | localhost:5432 (user: medvision / pass: medvision) |

> **Windows note**: `host.docker.internal` works natively on Docker Desktop for Windows/Mac.
> On Linux add `extra_hosts: ["host.docker.internal:host-gateway"]` to the backend service in `docker-compose.yml`.

To stop everything:
```powershell
docker compose down
```

To stop and wipe all data (full reset):
```powershell
docker compose down -v
```

---

### Mode B — Infra in Docker, App Native (Dev / Hot Reload)

Faster iteration — backend reloads on file save, no Docker rebuilds needed.

```powershell
# 1. Start only the infrastructure
docker compose up -d postgres milvus etcd minio

# 2. Edit backend\.env — switch to localhost addressing:
#   DATABASE_URL=postgresql+psycopg://medvision:medvision@localhost:5432/medvision
#   MILVUS_HOST=localhost
#   OLLAMA_BASE_URL=http://localhost:11434

# 3. Create and activate Python venv (first time only)
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 4. Run the backend (with hot reload)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```powershell
# 5. In a SEPARATE terminal — run the frontend
npm install        # first time only
npm run dev
```

---

### Verify everything is working

```powershell
# Check all Docker services are healthy
docker compose ps

# Test backend is responding
curl http://localhost:8000/api/health

# Check Ollama has the models loaded
ollama list
```

---

## Models Required

Pull these before running the app:

```powershell
ollama pull llama3.1:8b-instruct-q4_K_M   # chatbot, quiz, flashcard generation
ollama pull qwen2.5vl:7b-q4_K_M           # chest X-ray vision analysis
```

| Model | RAM required | Use case |
|---|---|---|
| `llama3.1:8b-instruct-q4_K_M` | ~6 GB | RAG chatbot, quizzes, flashcards |
| `qwen2.5vl:7b-q4_K_M` | ~6 GB | Medical image (VLM) analysis |

> Minimum 16 GB system RAM recommended to run both models + backend + infra.  
> If RAM is limited run only one model at a time — Ollama lazy-loads and unloads automatically.

---

## Option 1 — Fully Local (Development)

Run everything on your machine. No tunnel, no cloud.

### Prerequisites

- Docker Desktop installed and running
- Ollama installed (`https://ollama.com`)
- Python 3.12 virtual environment in `backend/`
- Node.js 18+

### Steps

```powershell
# 1. Copy and configure environment
Copy-Item backend\.env.example backend\.env
# Edit backend\.env:
#   OLLAMA_BASE_URL=http://localhost:11434
#   DATABASE_URL=postgresql+psycopg://medvision:medvision@localhost:5432/medvision
#   MILVUS_HOST=localhost

# 2. Start infrastructure (Postgres, Milvus, MinIO)
docker compose up -d postgres milvus etcd minio

# 3. Start backend
cd backend
.\.venv\Scripts\Activate.ps1        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. Start frontend (new terminal)
cd ..
npm install
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| Swagger docs | http://localhost:8000/docs |

---

## Option 2 — Laptop as Server + Cloudflare Tunnel (Job Fair / Demo)

Best for **on-site demos** (university job fair, presentations) where you are physically present with your laptop. Visitors access a public HTTPS URL; all AI runs on your machine — zero cost, zero rate limits.

```
Visitor's browser
      │
      ▼
 Vercel (Next.js frontend) ──────────────────────────────────┐
                                                              │
 NEXT_PUBLIC_API_BASE_URL = https://xxx.trycloudflare.com/api │
                                                              ▼
                                          Cloudflare Tunnel (free HTTPS)
                                                              │
                                                              ▼
                                          Your Laptop  →  FastAPI :8000
                                                         Ollama   :11434
                                                         Postgres :5432
                                                         Milvus   :19530
```

### Steps

#### A. Run backend on your laptop

```powershell
# 1. Start infra
docker compose up -d postgres milvus etcd minio

# 2. Edit backend\.env
#   OLLAMA_BASE_URL=http://localhost:11434

# 3. Start backend
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### B. Install and start Cloudflare Tunnel

```powershell
# Install (one time)
winget install --id Cloudflare.cloudflared

# Start tunnel — prints a free public HTTPS URL
cloudflared tunnel --url http://localhost:8000
```

Output example:
```
https://abc-def-123.trycloudflare.com
```

> For a **permanent URL** that survives restarts: create a free Cloudflare account,
> run `cloudflared tunnel create medvision` and follow the setup wizard.

#### C. Deploy frontend to Vercel

```powershell
npm install -g vercel
vercel --prod
```

In the Vercel dashboard → Project → **Settings → Environment Variables**, add:

```
NEXT_PUBLIC_API_BASE_URL = https://abc-def-123.trycloudflare.com/api
```

Trigger a redeploy after saving. Your Vercel URL is now the public frontend.

#### D. Day-of checklist

```
[ ] Laptop plugged into power
[ ] ollama serve                   (auto-starts on most installs)
[ ] docker compose up -d postgres milvus etcd minio
[ ] cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
[ ] cloudflared tunnel --url http://localhost:8000
[ ] Confirm tunnel URL matches NEXT_PUBLIC_API_BASE_URL in Vercel
[ ] Print QR code linking to your Vercel app URL
```

---

## Option 3 — Single GPU Cloud VM (Full Cloud, 24/7)

Use this if you need the app running **without your laptop** (always-on deployment).

### Cheapest GPU cloud options

| Platform | Machine | VRAM | Approx. cost |
|---|---|---|---|
| **Vast.ai** | RTX 3080 | 16 GB | ~$0.15–0.25/hr |
| **RunPod** | RTX 3090 | 24 GB | ~$0.20–0.30/hr |
| **AWS EC2** | g4dn.xlarge (T4) | 16 GB | ~$0.16/hr spot |
| **Google Cloud** | n1-standard-4 + T4 | 16 GB | ~$0.35/hr |

> For a 2-day job fair: Vast.ai or RunPod costs ~$1–3 total.  
> Stop/delete the instance when not in use.

### Architecture

```
┌──────────────────────── GPU VM ────────────────────────────┐
│  Ollama       :11434                                        │
│  FastAPI      :8000   (port open to internet)              │
│  Postgres     :5432   (internal only)                      │
│  Milvus       :19530  (internal only)                      │
└────────────────────────────────────────────────────────────┘
          ↑
   Vercel frontend calls https://<vm-ip>:8000/api
```

### Steps (Ubuntu 22.04 VM)

```bash
# 1. Install Docker
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER && newgrp docker

# 2. Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 3. Pull models
ollama pull llama3.1:8b-instruct-q4_K_M
ollama pull qwen2.5vl:7b-q4_K_M

# 4. Clone the repo and configure
git clone <your-repo-url> medvision && cd medvision
cp backend/.env.example backend/.env
# Edit backend/.env:
#   OLLAMA_BASE_URL=http://localhost:11434
#   FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
#   COOKIE_SECURE=true

# 5. Start everything
docker compose up -d --build
```

Open port **8000** in the VM's firewall / security group.  
Keep ports 5432, 19530, 9000 closed to the internet.

### Add HTTPS to the VM (required for cookies + browser security)

```bash
# Option A: Cloudflare Tunnel (free, no domain needed)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared
cloudflared tunnel --url http://localhost:8000

# Option B: Nginx + Let's Encrypt (requires a domain name)
sudo apt install nginx certbot python3-certbot-nginx -y
# Point your domain A record to the VM IP, then:
sudo certbot --nginx -d api.yourdomain.com
```

### Frontend (Vercel)

```
NEXT_PUBLIC_API_BASE_URL = https://<tunnel-or-domain>/api
```

---

## Environment Variables Reference

Key variables in `backend/.env` that affect deployment:

```env
# Ollama endpoint — change this per deployment method
OLLAMA_BASE_URL=http://localhost:11434

# Model names — must exactly match what you pulled
OLLAMA_CHAT_MODEL=llama3.1:8b-instruct-q4_K_M
OLLAMA_VLM_MODEL=qwen2.5vl:7b-q4_K_M

# Database — keep default for Docker Compose deployments
DATABASE_URL=postgresql+psycopg://medvision:medvision@postgres:5432/medvision

# CORS — set to your Vercel app URL in cloud deployments
FRONTEND_ORIGIN=http://localhost:3000

# Secure cookies — set true when using HTTPS
COOKIE_SECURE=false
```

> When running the **backend outside Docker** (Options 1 and 2), change:
> - `DATABASE_URL` → replace `@postgres:` with `@localhost:`
> - `MILVUS_HOST` → `localhost`

---

## Comparison Summary

| | Option 1 (Local) | Option 2 (Tunnel) | Option 3 (GPU Cloud) |
|---|---|---|---|
| **Cost** | Free | Free | ~$0.15–0.35/hr |
| **Internet access** | No | Yes (Vercel URL) | Yes |
| **Requires your laptop** | Yes | Yes | No |
| **Rate limits** | None | None | None |
| **Setup time** | 10 min | 20 min | 45–60 min |
| **Best for** | Development | Job fair demo | Always-on deploy |
