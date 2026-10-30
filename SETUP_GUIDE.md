# 🚀 TakTak Jobs - Self-Hosted Firecrawl Scraper & Deployment Guide

This guide details the complete local testing, Docker containerization, and production deployment process for the **TakTak Jobs Data Ingestion Runner** on a **Hetzner CX (Ubuntu)** server.

---

## 📁 Project Directory Structure

```text
fireCrawl/
├── backend/                  # Node.js Scraper Runner Engine
│   ├── src/
│   │   ├── config/           # Target portals (20 Sri Lankan boards + custom)
│   │   ├── validation/       # Section 7 Schema & Mandatory Apply Method rules
│   │   ├── firecrawl/        # Firecrawl client + resilient HTTP fallback
│   │   ├── api/              # TakTak Ingestion API + Exponential Backoff
│   │   ├── db/               # Native SQLite database (seen_jobs & audit logs)
│   │   └── utils/            # Metrics logger & random 1–3s polite delay
│   ├── index.js              # Runner execution entrypoint
│   └── test_components.js    # Logic & validation test suite
│
├── frontend/                 # Vite + React Minimal Dashboard
│   ├── src/                  # Minimal UI matching TakTak brand (Green & Navy)
│   ├── package.json
│   └── vite.config.js        # Local backend bridge middleware
│
├── database/                 # Persistent SQLite Database Directory
│   ├── scraper.db            # SQLite Cache (Deduplication across runs)
│   ├── database_export.json  # Readable JSON dump for text viewing
│   ├── schema.sql            # Table definitions
│   └── custom_portals.json   # Dynamically added custom portals
│
├── docker/                   # Docker deployment directory
│   ├── Dockerfile            # Production container for Scraper Runner
│   ├── docker-compose.yml    # Production multi-service stack (Firecrawl + Runner)
│   └── README.md             # Docker management commands
│
├── out/                      # Dry-Run JSON output batches
├── firecrawl/                # Upstream Self-Hosted Firecrawl repository
│
├── .env.example              # Environment template
├── .env                      # Local environment configuration
├── .gitignore                # Production ignore patterns
├── package.json              # Root unified workflow scripts
└── index.js                  # Root execution wrapper
```

---

## 💻 Phase 1: Local Development & Verification

### 1. Configure Environment
```bash
cp .env.example .env
```
Ensure `.env` contains:
```env
FIRECRAWL_API_URL=http://localhost:3002
TAKTAK_API_URL=https://taktakjobs.buildstart.io/api/public/jobs/ingest
INGEST_SECRET=your_ingest_secret_here
DRY_RUN=true
MAX_JOBS_PER_BOARD=50
MIN_DELAY_MS=1000
MAX_DELAY_MS=3000
```

### 2. Run Logic & Schema Tests
Verify that all mandatory schema rules and SQLite deduplication tests pass:
```bash
npm test
```

### 3. Run Step 1 Dry-Run (3 Portals: TopJobs, XpressJobs, Rooster)
Execute dry-run to verify extraction and schema conformity without sending live data:
```bash
npm run test-3
```
Output files will be saved in `./out/<portal>-<timestamp>.json`.

### 4. Run Frontend Dashboard Locally
```bash
npm run frontend:dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🌐 Phase 2: Production Deployment on Hetzner CX (Ubuntu)

> **Rollout Order Rule:** Deploy to Hetzner CX only after the local acceptance checklist passes.

### Step 1: Connect to Hetzner CX Server
```bash
ssh root@<HETZNER_SERVER_IP>
```

### Step 2: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt-get update && apt-get install -y git nodejs npm
```

### Step 3: Clone Repository on Server
```bash
mkdir -p /opt
cd /opt
git clone <YOUR_GIT_REPO_URL> scraper-runner
cd scraper-runner
```

### Step 4: Configure Production `.env`
```bash
cp .env.example .env
nano .env
```
Set:
* `DRY_RUN=false`
* `INGEST_SECRET=<REAL_PRODUCTION_SECRET>`
* `FIRECRAWL_API_URL=http://127.0.0.1:3002`

### Step 5: Security Rule (Port 3002 Isolation)
**CRITICAL:** Port 3002 must remain closed to the public internet!
Configure UFW firewall:
```bash
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (if reverse proxy is used)
ufw allow 443/tcp   # HTTPS
ufw deny 3002/tcp   # BLOCK Firecrawl from public access!
ufw enable
```

### Step 6: Start Self-Hosted Firecrawl via Docker
```bash
cd /opt/scraper-runner/firecrawl
docker compose up -d
```
Verify health:
```bash
curl -s http://127.0.0.1:3002/v2/health || curl -s http://127.0.0.1:3002/
```

### Step 7: Configure Automated Cron Job (06:00 & 14:00 Colombo)
Edit crontab on the server:
```bash
crontab -e
```
Add the following line explicitly targeting `Asia/Colombo`:
```cron
CRON_TZ=Asia/Colombo
0 6,14 * * * /usr/bin/node /opt/scraper-runner/index.js >> /var/log/scraper.log 2>&1
```

### Step 8: Monitor the First Runs
Inspect live logs:
```bash
tail -f /var/log/scraper.log
```

---

## ⚡ Phase 3: Dashboard Hosting on Vercel

1. Push your repository to **GitHub**.
2. Go to [Vercel Dashboard](https://vercel.com) & click **"Add New Project"**.
3. Select your repository.
4. Set **Root Directory** to `frontend`.
5. Framework Preset: **Vite**.
6. Click **Deploy**.
7. **Domain Binding:**
   * In Vercel Project Settings &rarr; **Domains**.
   * Add: **`scrape.buildstart.io`**.
   * Add the CNAME record in your DNS provider pointing `scrape.buildstart.io` &rarr; `cname.vercel-dns.com`.

---

## 📋 Acceptance Checklist (Section 4 Verification)

- [x] Firecrawl runs and responds to health checks.
- [x] Full dry run across target boards completes without crashing.
- [x] Every saved job strictly matches Section 7 schema with at least one apply method (`apply_url`, `apply_email`, `apply_whatsapp`).
- [x] Volume cap enforced: max 50 jobs per board, $\le$ 1,000 per run.
- [x] Random 1–3s delay active between listings.
- [x] Metrics logger tracks crawled / extracted / HTTP 200 / failed counts.
- [x] Exponential backoff retry implemented for API calls.
- [x] Local SQLite cache prevents redundant duplicate Playwright browser executions.
