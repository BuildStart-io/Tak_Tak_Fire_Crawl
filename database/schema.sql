-- ==============================================================
-- TakTak Jobs Scraper - SQLite Database Schema
-- Location: /home/kapi/Documents/fireCrawl/database/scraper.db
-- ==============================================================

-- 1. SEEN JOBS TABLE (Deduplication & Cache)
-- Tracks every vacancy URL extracted to prevent re-opening headless browser
CREATE TABLE IF NOT EXISTS seen_jobs (
    url TEXT PRIMARY KEY,                       -- Unique vacancy permalink URL
    portal TEXT NOT NULL,                       -- e.g. 'topjobs', 'rooster', 'xpressjobs'
    title TEXT,                                 -- e.g. 'Software QA Intern'
    company TEXT,                               -- e.g. 'Silverline Technologies'
    first_seen_at TEXT NOT NULL,                -- ISO timestamp when first scraped
    last_seen_at TEXT NOT NULL,                 -- ISO timestamp when last checked
    status TEXT DEFAULT 'ingested'              -- 'ingested' or 'pending'
);

-- Index for fast lookup when crawler visits portals
CREATE INDEX IF NOT EXISTS idx_seen_portal ON seen_jobs (portal);
CREATE INDEX IF NOT EXISTS idx_seen_date ON seen_jobs (first_seen_at);


-- 2. CRAWL RUNS AUDIT LOG TABLE
-- Records every cron run execution metrics for accountability and monitoring
CREATE TABLE IF NOT EXISTS crawl_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portal TEXT NOT NULL,                       -- Portal identifier
    started_at TEXT NOT NULL,                   -- Start ISO timestamp
    completed_at TEXT,                          -- End ISO timestamp
    found_count INTEGER DEFAULT 0,              -- Total vacancy links discovered
    new_scraped INTEGER DEFAULT 0,              -- New vacancies scraped via Firecrawl
    skipped_existing INTEGER DEFAULT 0,         -- Redundant listings skipped via cache
    dropped_invalid INTEGER DEFAULT 0,          -- Listings dropped (missing apply method)
    api_status TEXT DEFAULT 'OK'                -- 'OK' or 'FAILED'
);
