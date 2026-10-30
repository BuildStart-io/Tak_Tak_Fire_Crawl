import 'dotenv/config';
import { getActivePortals } from './src/config/portals.js';
import { validateAndSanitizeJob } from './src/validation/schema.js';
import { FirecrawlClient } from './src/firecrawl/client.js';
import { TakTakApiClient } from './src/api/taktak.js';
import { ScraperDatabase } from './src/db/database.js';
import { randomDelay } from './src/utils/delay.js';
import { logger } from './src/utils/logger.js';

// Configuration constants from environment or defaults
const MAX_JOBS_PER_BOARD = parseInt(process.env.MAX_JOBS_PER_BOARD || '50', 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '35', 10); // Between 20 and 50
const MIN_DELAY_MS = parseInt(process.env.MIN_DELAY_MS || '1000', 10);
const MAX_DELAY_MS = parseInt(process.env.MAX_DELAY_MS || '3000', 10);

async function main() {
  const isDryRun = process.env.DRY_RUN !== 'false';
  const portalsFilter = process.env.PORTALS || '';

  const db = new ScraperDatabase();
  const dbStats = db.getStats();

  console.log(`================================================================`);
  console.log(`🚀 TAKTAK JOBS - FIRECRAWL INGESTION RUNNER`);
  console.log(`Mode               : ${isDryRun ? 'DRY-RUN (Files saved to ./out/)' : 'LIVE (Ingesting to TakTak API)'}`);
  console.log(`Firecrawl URL      : ${process.env.FIRECRAWL_API_URL || 'http://localhost:3002'}`);
  console.log(`TakTak Ingestion   : ${process.env.TAKTAK_API_URL || 'https://taktakjobs.buildstart.io/api/public/jobs/ingest'}`);
  console.log(`Portal Filter      : ${portalsFilter || 'All 20 Portals'}`);
  console.log(`Max Jobs per Board : ${MAX_JOBS_PER_BOARD}`);
  console.log(`Batch Size         : ${BATCH_SIZE}`);
  console.log(`Delay per Listing  : ${MIN_DELAY_MS}-${MAX_DELAY_MS} ms`);
  console.log(`SQLite DB Cache    : Active (${dbStats.totalJobs} jobs tracked, ${dbStats.totalRuns} prior runs)`);
  console.log(`================================================================\n`);

  const firecrawl = new FirecrawlClient();
  const taktakApi = new TakTakApiClient({ dryRun: isDryRun });

  // 1. Health check Firecrawl container
  logger.logInfo(`Checking Firecrawl health status...`);
  const health = await firecrawl.checkHealth();
  if (health.isHealthy) {
    logger.logInfo(`✅ Firecrawl container is online and responding! (Status: ${health.status})`);
  } else {
    logger.logWarn(`⚠️ Firecrawl container did not respond at ${firecrawl.baseUrl}. Ensure docker compose is running! Details: ${health.error || health.status}`);
  }

  // 2. Determine target portals
  const portalsToProcess = getActivePortals(portalsFilter);
  logger.logInfo(`Identified ${portalsToProcess.length} portal(s) to process.`);

  const runId = process.env.CRON_RUN_ID || `RUN-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const triggerType = process.env.TRIGGER_TYPE || 'manual';
  const runStartTime = new Date().toISOString();
  const portalBreakdown = {};
  let totalBatchesDelivered = 0;
  let totalSkippedFromCache = 0;

  // Register in SQLite cron cycles history
  db.createCronCycle({
    runId,
    triggerType,
    mode: isDryRun ? 'dry-run' : 'live',
    startedAt: runStartTime,
    totalPortals: portalsToProcess.length
  });

  // 3. Process each portal
  for (const portal of portalsToProcess) {
    logger.initBoard(portal.id);
    const portalStartTime = new Date().toISOString();
    logger.logInfo(`\n▶️ Starting extraction for [${portal.name}] (${portal.url})...`);

    let newScrapedCount = 0;
    let skippedCount = 0;
    let droppedCount = 0;
    let apiStatusResult = 'OK';

    try {
      // Step A: Discover listing URLs
      const listingUrls = await firecrawl.discoverJobUrls(portal.url, MAX_JOBS_PER_BOARD);
      logger.logInfo(`Found ${listingUrls.length} candidate vacancy URLs on ${portal.name}`);

      const validJobs = [];

      // Step B: Filter already seen URLs and scrape new listings
      for (let i = 0; i < listingUrls.length; i++) {
        const url = listingUrls[i];

        // Check SQLite cache: if already scraped recently, skip to save server CPU & RAM
        const ignoreCache = process.env.IGNORE_CACHE === 'true' || process.env.FORCE_REFRESH === 'true';
        if (!ignoreCache && db.isJobSeen(url)) {
          logger.inc(portal.id, 'skippedExisting', 1);
          skippedCount++;
          logger.logInfo(`[${portal.id}] [DB CACHE SKIP] Already scraped within 14 days: ${url}`);
          continue;
        }

        logger.logInfo(`[${portal.id}] (${i + 1}/${listingUrls.length}) Scraping new listing: ${url}`);

        // Random polite delay between listings
        const waited = await randomDelay(MIN_DELAY_MS, MAX_DELAY_MS);
        logger.logInfo(`[Polite Delay] Waited ${waited}ms`);

        logger.inc(portal.id, 'crawled', 1);

        const rawScraped = await firecrawl.scrapeJobVacancy(url);
        if (!rawScraped) {
          logger.logWarn(`[${portal.id}] Failed to scrape page at ${url}`);
          continue;
        }

        // Step C: Validate against schema & mandatory apply method rule
        const validatedJob = validateAndSanitizeJob(rawScraped, url);
        if (validatedJob) {
          // Check for duplicate spam within the same portal batch (e.g. Ikman placement agency spamming identical ad 10+ times)
          const isSpamDuplicate = validJobs.some(existing => {
            const sameTitle = existing.title.toLowerCase().trim() === validatedJob.title.toLowerCase().trim();
            const compA = (existing.company || '').toLowerCase().replace(/s$/, '').trim();
            const compB = (validatedJob.company || '').toLowerCase().replace(/s$/, '').trim();
            const sameCompany = compA === compB;
            const sameLocation = (existing.location || '').toLowerCase().trim() === (validatedJob.location || '').toLowerCase().trim();
            return sameTitle && sameCompany && sameLocation;
          });

          if (isSpamDuplicate) {
            logger.logWarn(`[${portal.id}] ⚠️ Skipping duplicate agency posting in same batch: "${validatedJob.title}" (${validatedJob.location})`);
            continue;
          }

          validJobs.push(validatedJob);
          logger.inc(portal.id, 'extracted', 1);
          newScrapedCount++;

          // Record in SQLite cache
          db.recordJob(portal.id, validatedJob);

          logger.logInfo(`[${portal.id}] ✅ Valid vacancy extracted: "${validatedJob.title}" (${validatedJob.company || 'Unknown Company'})`);
        } else {
          logger.inc(portal.id, 'droppedInvalid', 1);
          droppedCount++;
          logger.logWarn(`[${portal.id}] ⚠️ Dropped listing: missing required title or valid apply method (url, email, or whatsapp)`);
        }
      }

      // Step D: Batch and deliver to TakTak API (or ./out/ if dry run)
      logger.logInfo(`[${portal.id}] Ready to deliver ${validJobs.length} new valid jobs.`);
      if (validJobs.length > 0) {
        // Split into chunks of BATCH_SIZE (20-50)
        for (let idx = 0; idx < validJobs.length; idx += BATCH_SIZE) {
          const batch = validJobs.slice(idx, idx + BATCH_SIZE);
          const batchNumber = Math.floor(idx / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(validJobs.length / BATCH_SIZE);

          logger.logInfo(`[${portal.id}] Delivering batch ${batchNumber}/${totalBatches} (${batch.length} jobs)...`);
          await taktakApi.ingestBatch(portal.id, batch);
          totalBatchesDelivered++;
        }
      } else {
        logger.logInfo(`[${portal.id}] No new jobs to ingest (Skipped existing: ${skippedCount}).`);
      }

      portalBreakdown[portal.id] = newScrapedCount;

    } catch (portalError) {
      apiStatusResult = 'FAILED';
      portalBreakdown[portal.id] = 0;
      logger.logError(`[${portal.id}] Fatal error during processing`, portalError);
    } finally {
      totalSkippedFromCache += skippedCount;

      // Record crawl history in SQLite
      db.logCrawlRun({
        portal: portal.id,
        startedAt: portalStartTime,
        foundCount: skippedCount + newScrapedCount + droppedCount,
        newScraped: newScrapedCount,
        skippedExisting: skippedCount,
        droppedInvalid: droppedCount,
        apiStatus: apiStatusResult
      });

      logger.printBoardSummary(portal.id);
    }
  }

  // 4. Print Overall Run Summary & Update Cycle History
  logger.printTotalSummary();

  const totalHarvestedInRun = Object.values(portalBreakdown).reduce((a, b) => a + b, 0);
  const activeCountInRun = Object.values(portalBreakdown).filter(c => c > 0).length;
  const durationSec = Math.round((Date.now() - new Date(runStartTime).getTime()) / 1000);

  db.updateCronCycle(runId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    active_portals: activeCountInRun,
    jobs_harvested: totalHarvestedInRun,
    batches_delivered: totalBatchesDelivered,
    api_status: isDryRun ? 'HTTP 200 OK (Dry-run)' : 'HTTP 200 OK',
    breakdown_json: JSON.stringify(portalBreakdown),
    duration_seconds: durationSec,
    skipped_cache: totalSkippedFromCache
  });

  db.close();
  logger.logInfo(`Job Scraper & Ingestion run completed [Run ID: ${runId}].`);
}

main().catch(err => {
  logger.logError('Unhandled fatal error in runner', err);
  process.exit(1);
});
