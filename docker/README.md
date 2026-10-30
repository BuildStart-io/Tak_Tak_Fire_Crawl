# 🐳 TakTak Jobs - Docker Folder (`docker/`)

## 📌 Enna Ithu? (Docker Folder Vilakkam)
Intha folder-il TakTak Jobs project-in Docker infrastructure files thaan irukkindrana. Root directory-il docker files kalandhu irukkamal, anaithu docker configuration-kalum intha `docker/` folder-kullae thiramaana muraiyil maatrrappattullana.

Ingu ulla files:
1. `Dockerfile`: Scraper runner microservice-kku thevaiyana Node.js 22 container image build seyyapadum file.
2. `docker-compose.yml`: Server-il 4 containers-aiyum serndhu run seyyum orchestration configuration:
   - `taktak-firecrawl`: Firecrawl scraping engine (Port 3002 - loopback/internal only).
   - `taktak-playwright`: Headless Chromium/Playwright microservice (JavaScript render panna uthavum).
   - `taktak-redis`: Firecrawl queue & job scheduling memory cache.
   - `taktak-runner`: TakTak vacancy extractor, schema validator matrum TakTak Jobs API pusher.

---

## ⚡ Epadi Docker Run Seivathu? (How to Run Docker)

### 1. Containers Start Seiya:
```bash
docker compose -f docker/docker-compose.yml up -d
```
alladhu root package.json shortcut:
```bash
npm run docker:up
```

### 2. Live Logs Paarka:
```bash
docker compose -f docker/docker-compose.yml logs -f
```

### 3. Containers Stop Seiya:
```bash
docker compose -f docker/docker-compose.yml down
```

---

## 🔒 Security Rule:
- Firecrawl port `3002` localhost / loopback (`127.0.0.1:3002`) mattumae bind aagirukkum. Hetzner server-il intha port-ai internet-kku thirakkakoodathu.
