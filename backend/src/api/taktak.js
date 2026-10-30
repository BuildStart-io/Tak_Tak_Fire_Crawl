import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Delivers job batches to TakTak Ingestion API or writes to ./out/ if DRY_RUN=true
 */
export class TakTakApiClient {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || process.env.TAKTAK_API_URL || 'https://taktakjobs.buildstart.io/api/public/jobs/ingest';
    this.ingestSecret = options.ingestSecret || process.env.INGEST_SECRET || '';
    this.dryRun = options.dryRun !== undefined ? options.dryRun : (process.env.DRY_RUN !== 'false');
    const isInsideBackend = process.cwd().endsWith('backend');
    const rootDir = isInsideBackend ? path.resolve(process.cwd(), '..') : process.cwd();
    this.outDir = options.outDir || path.resolve(rootDir, 'out');
    this.maxRetries = options.maxRetries || 3;
    this.initialBackoffMs = options.initialBackoffMs || 1000;
  }

  /**
   * Send a batch of 20-50 jobs
   * @param {string} portalId - e.g. "rooster"
   * @param {Array} jobs - Array of validated ScrapedJob objects
   * @returns {Promise<object>} API response or dry-run saved info
   */
  async ingestBatch(portalId, jobs) {
    if (!jobs || jobs.length === 0) {
      return { ok: true, received: 0, message: 'Empty batch, skipped' };
    }

    // Format and clean each job strictly according to Section 8 / Page 5 spec
    const fieldOrder = [
      'title',
      'company',
      'location',
      'category',
      'job_type',
      'salary',
      'deadline',
      'requirements',
      'apply_email',
      'apply_url',
      'apply_whatsapp',
      'source_url'
    ];

    const cleanedJobs = jobs.map(job => {
      const clean = {};
      for (const k of fieldOrder) {
        if (job[k] !== null && job[k] !== undefined && typeof job[k] === 'string' && job[k].trim() !== '') {
          clean[k] = job[k].trim();
        }
      }
      return clean;
    });

    const payload = {
      source: `hetzner-firecrawl:${portalId}`,
      jobs: cleanedJobs
    };

    if (this.dryRun) {
      return await this.saveDryRunBatch(portalId, payload);
    }

    return await this.sendWithExponentialBackoff(portalId, payload);
  }

  /**
   * Save batch to ./out/<portal>-<timestamp>.json during dry-run
   */
  async saveDryRunBatch(portalId, payload) {
    await fs.mkdir(this.outDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${portalId}-${timestamp}.json`;
    const filePath = path.join(this.outDir, filename);

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    logger.logInfo(`[DRY-RUN] Saved ${payload.jobs.length} jobs to ${filePath}`);

    return {
      ok: true,
      dryRun: true,
      filePath: filePath,
      count: payload.jobs.length
    };
  }

  /**
   * Sends batch to live API with exponential backoff retry
   */
  async sendWithExponentialBackoff(portalId, payload) {
    if (!this.ingestSecret) {
      throw new Error(`INGEST_SECRET is not set in environment or config!`);
    }

    let attempt = 0;
    let delay = this.initialBackoffMs;

    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        logger.logInfo(`[API] Sending batch of ${payload.jobs.length} jobs to TakTak (Attempt ${attempt}/${this.maxRetries + 1})...`);

        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ingest-secret': this.ingestSecret
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          logger.logInfo(`[API SUCCESS] TakTak responded: ${JSON.stringify(data)}`);
          logger.inc(portalId, 'http200', 1);
          return data;
        }

        const errorText = await response.text();
        logger.logWarn(`[API WARN] Received HTTP ${response.status}: ${errorText}`);

        // If client error (like 401 Unauthorized or 400 Bad Request), don't retry endlessly
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`TakTak API rejected request with status ${response.status}: ${errorText}`);
        }

        throw new Error(`Server error HTTP ${response.status}: ${errorText}`);
      } catch (err) {
        if (attempt > this.maxRetries) {
          logger.logError(`[API FATAL] Failed to ingest batch for ${portalId} after ${this.maxRetries + 1} attempts`, err);
          logger.inc(portalId, 'apiFailed', 1);
          throw err;
        }

        logger.logWarn(`[API RETRY] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms with exponential backoff...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff: 1s, 2s, 4s...
      }
    }
  }
}
