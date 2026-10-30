# 🗄️ TakTak Jobs - Database Directory (`database/`)

## 📌 Overview
This directory serves as the persistent physical storage layer for the TakTak Jobs Scraper Runner. It houses the local SQLite database cache, schema definitions, exported readable data, and custom portal registries.

---

## 📁 Files in this Directory

1. **`scraper.db`**:
   - The primary binary SQLite database file.
   - Managed directly by Node.js 22 built-in `node:sqlite` without external C++ compilation dependencies.
   - Volume-mounted in Docker containers to retain data between runs.

2. **`database_export.json`**:
   - Human-readable text/JSON export of all cached jobs and crawl run metrics.
   - Because `.db` binary files cannot be opened in standard text editors, this file allows instant inspection of all stored records directly inside VS Code or any text editor.

3. **`schema.sql`**:
   - The declarative SQL schema defining table structures (`seen_jobs` and `crawl_runs`) along with indexes for performance.

4. **`view_database.js`**:
   - CLI utility script that queries `scraper.db`, renders styled ASCII tables in the terminal, and updates `database_export.json`.

5. **`custom_portals.json`**:
   - Stores custom job portal targets added on the fly via the Web Dashboard or API.

---

## ⚡ How to Inspect the Database

To view database statistics, latest cached jobs, and crawl audit logs, run:

```bash
npm run db:view
```
or directly:
```bash
node database/view_database.js
```

---

## 🎯 Database Tables & Architecture

### 1. `seen_jobs`
- **Purpose**: URL-level deduplication across runs.
- **Fields**:
  - `url` (TEXT, PRIMARY KEY): The canonical permalink of the job vacancy.
  - `portal` (TEXT): Portal identifier (e.g., `topjobs`, `xpressjobs`, `rooster`).
  - `title` (TEXT): Job title.
  - `company` (TEXT): Employer or hiring agency name.
  - `first_seen_at` (TEXT): Timestamp when first scraped.
  - `last_seen_at` (TEXT): Timestamp when last verified.
  - `status` (TEXT): Ingestion status (`ingested`).
- **Optimization**: Before launching a headless Playwright browser to scrape a vacancy page, the runner queries `isJobSeen(url)`. If seen within the last 14 days, the listing is skipped immediately, saving ~70% server CPU and memory.

### 2. `crawl_runs`
- **Purpose**: Historical audit log tracking performance per scraping session.
- **Fields**:
  - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
  - `portal` (TEXT)
  - `started_at` (TEXT)
  - `completed_at` (TEXT)
  - `found_count` (INTEGER)
  - `new_scraped` (INTEGER)
  - `skipped_existing` (INTEGER)
  - `dropped_invalid` (INTEGER)
  - `api_status` (TEXT)
