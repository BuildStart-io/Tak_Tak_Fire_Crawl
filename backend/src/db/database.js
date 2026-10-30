import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * SQLite Local Database Manager
 * Optimizes scraping by caching seen listing URLs so we don't waste
 * server resources re-scraping the same vacancy twice a day.
 */
export class ScraperDatabase {
  constructor(dbPath = null) {
    // Database lives in workspace root database/ directory
    const isInsideBackend = process.cwd().endsWith('backend');
    const rootDir = isInsideBackend ? path.resolve(process.cwd(), '..') : process.cwd();
    const targetDir = path.resolve(rootDir, 'database');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    this.dbFilePath = dbPath || path.join(targetDir, 'scraper.db');
    const parentDir = path.dirname(this.dbFilePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    this.db = new DatabaseSync(this.dbFilePath);
    this.initTables();
  }

  initTables() {
    // 1. Seen jobs table for fast URL deduplication
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS seen_jobs (
        url TEXT PRIMARY KEY,
        portal TEXT NOT NULL,
        title TEXT,
        company TEXT,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        status TEXT DEFAULT 'ingested'
      );
    `);

    // 2. Metrics & run history audit log
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS crawl_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        portal TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        found_count INTEGER DEFAULT 0,
        new_scraped INTEGER DEFAULT 0,
        skipped_existing INTEGER DEFAULT 0,
        dropped_invalid INTEGER DEFAULT 0,
        api_status TEXT
      );
    `);

    // 3. Cron scheduled cycles & runs history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cron_cycles (
        run_id TEXT PRIMARY KEY,
        trigger_type TEXT DEFAULT 'scheduled',
        mode TEXT DEFAULT 'dry-run',
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT DEFAULT 'running',
        total_portals INTEGER DEFAULT 20,
        active_portals INTEGER DEFAULT 0,
        jobs_harvested INTEGER DEFAULT 0,
        batches_delivered INTEGER DEFAULT 0,
        api_status TEXT DEFAULT 'HTTP 200 OK',
        breakdown_json TEXT DEFAULT '{}',
        duration_seconds INTEGER DEFAULT 0
      );
    `);

    // Create index on portal and first_seen_at
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_seen_portal ON seen_jobs (portal);
      CREATE INDEX IF NOT EXISTS idx_seen_date ON seen_jobs (first_seen_at);
      CREATE INDEX IF NOT EXISTS idx_cron_date ON cron_cycles (started_at);
    `);
  }

  /**
   * Check if a job URL was already scraped recently
   * @param {string} url - Permalink URL
   * @param {number} maxAgeDays - Expiry in days (default: 14 days)
   * @returns {boolean}
   */
  isJobSeen(url, maxAgeDays = 14) {
    if (!url) return false;
    try {
      const stmt = this.db.prepare(`
        SELECT url, first_seen_at 
        FROM seen_jobs 
        WHERE url = ?
      `);
      const row = stmt.get(url.trim());
      if (!row) return false;

      // Check if within maxAgeDays
      const firstSeen = new Date(row.first_seen_at).getTime();
      const now = Date.now();
      const ageDays = (now - firstSeen) / (1000 * 60 * 60 * 24);
      return ageDays <= maxAgeDays;
    } catch (err) {
      logger.logError(`[DB ERROR] Failed checking seen URL: ${url}`, err);
      return false;
    }
  }

  /**
   * Record a newly scraped job in the database
   * @param {string} portal - Portal ID
   * @param {object} job - Validated ScrapedJob
   */
  recordJob(portal, job) {
    if (!job || !job.source_url) return;
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO seen_jobs (url, portal, title, company, first_seen_at, last_seen_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ingested')
        ON CONFLICT(url) DO UPDATE SET
          last_seen_at = excluded.last_seen_at,
          title = COALESCE(excluded.title, seen_jobs.title),
          company = COALESCE(excluded.company, seen_jobs.company)
      `);
      stmt.run(
        job.source_url.trim(),
        portal,
        job.title || null,
        job.company || null,
        now,
        now
      );
    } catch (err) {
      logger.logError(`[DB ERROR] Failed inserting job ${job.source_url}`, err);
    }
  }

  /**
   * Record a completed crawl run in the audit log
   */
  logCrawlRun({ portal, startedAt, foundCount, newScraped, skippedExisting, droppedInvalid, apiStatus }) {
    try {
      const now = new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO crawl_runs (portal, started_at, completed_at, found_count, new_scraped, skipped_existing, dropped_invalid, api_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        portal,
        startedAt,
        now,
        foundCount || 0,
        newScraped || 0,
        skippedExisting || 0,
        droppedInvalid || 0,
        apiStatus || 'OK'
      );
      this.exportToJson();
    } catch (err) {
      logger.logError(`[DB ERROR] Failed logging crawl run for ${portal}`, err);
    }
  }

  /**
   * Automatically exports database contents to database/database_export.json
   */
  exportToJson() {
    try {
      const seenJobs = this.db.prepare('SELECT * FROM seen_jobs ORDER BY first_seen_at DESC').all();
      const crawlRuns = this.db.prepare('SELECT * FROM crawl_runs ORDER BY started_at DESC').all();
      const isInsideBackend = process.cwd().endsWith('backend');
      const rootDir = isInsideBackend ? path.resolve(process.cwd(), '..') : process.cwd();
      const exportPath = path.resolve(rootDir, 'database', 'database_export.json');
      fs.writeFileSync(exportPath, JSON.stringify({
        exported_at: new Date().toISOString(),
        total_jobs: seenJobs.length,
        total_runs: crawlRuns.length,
        seen_jobs: seenJobs,
        crawl_runs: crawlRuns
      }, null, 2));
    } catch {}
  }

  /**
   * Get database statistics
   */
  getStats() {
    try {
      const totalJobs = this.db.prepare('SELECT COUNT(*) as count FROM seen_jobs').get().count;
      const totalRuns = this.db.prepare('SELECT COUNT(*) as count FROM crawl_runs').get().count;
      return { totalJobs, totalRuns };
    } catch {
      return { totalJobs: 0, totalRuns: 0 };
    }
  }

  /**
   * Register a new cron or manual crawl cycle
   */
  createCronCycle({ runId, triggerType = 'scheduled', mode = 'dry-run', startedAt = null, totalPortals = 20 }) {
    try {
      const start = startedAt || new Date().toISOString();
      const stmt = this.db.prepare(`
        INSERT INTO cron_cycles (run_id, trigger_type, mode, started_at, status, total_portals)
        VALUES (?, ?, ?, ?, 'running', ?)
        ON CONFLICT(run_id) DO UPDATE SET
          status = 'running',
          started_at = excluded.started_at
      `);
      stmt.run(runId, triggerType, mode, start, totalPortals);
    } catch (err) {
      logger.logError(`[DB ERROR] Failed creating cron cycle ${runId}`, err);
    }
  }

  /**
   * Update a completed or failed cron cycle with final metrics
   */
  updateCronCycle(runId, data = {}) {
    try {
      const stmt = this.db.prepare(`
        UPDATE cron_cycles SET
          completed_at = ?,
          status = ?,
          active_portals = ?,
          jobs_harvested = ?,
          batches_delivered = ?,
          api_status = ?,
          breakdown_json = ?,
          duration_seconds = ?,
          skipped_cache = ?
        WHERE run_id = ?
      `);
      stmt.run(
        data.completed_at || new Date().toISOString(),
        data.status || 'completed',
        data.active_portals || 0,
        data.jobs_harvested || 0,
        data.batches_delivered || 0,
        data.api_status || 'HTTP 200 OK',
        typeof data.breakdown_json === 'string' ? data.breakdown_json : JSON.stringify(data.breakdown_json || {}),
        data.duration_seconds || 0,
        data.skipped_cache || 0,
        runId
      );
      this.exportToJson();
    } catch (err) {
      logger.logError(`[DB ERROR] Failed updating cron cycle ${runId}`, err);
    }
  }

  /**
   * Retrieve all cron cycles ordered by started_at DESC
   */
  getCronCycles() {
    try {
      const rows = this.db.prepare('SELECT * FROM cron_cycles ORDER BY started_at DESC').all();
      return rows.map(r => {
        let breakdown = {};
        try {
          breakdown = JSON.parse(r.breakdown_json || '{}');
        } catch {}
        return {
          ...r,
          breakdown
        };
      });
    } catch (err) {
      logger.logError(`[DB ERROR] Failed getting cron cycles`, err);
      return [];
    }
  }

  /**
   * Get latest cron cycle
   */
  getLatestCronCycle() {
    try {
      const row = this.db.prepare('SELECT * FROM cron_cycles ORDER BY started_at DESC LIMIT 1').get();
      if (!row) return null;
      let breakdown = {};
      try {
        breakdown = JSON.parse(row.breakdown_json || '{}');
      } catch {}
      return { ...row, breakdown };
    } catch {
      return null;
    }
  }

  close() {
    try {
      this.db.close();
    } catch {}
  }
}
