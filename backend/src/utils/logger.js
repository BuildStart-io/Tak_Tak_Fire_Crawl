/**
 * Metrics tracking and formatted logging per board
 */
export class MetricsLogger {
  constructor() {
    this.boardStats = new Map();
  }

  initBoard(boardId) {
    if (!this.boardStats.has(boardId)) {
      this.boardStats.set(boardId, {
        crawled: 0,
        extracted: 0,
        skippedExisting: 0,
        droppedInvalid: 0,
        http200: 0,
        apiFailed: 0,
        startTime: Date.now(),
        endTime: null
      });
    }
  }

  inc(boardId, metric, count = 1) {
    this.initBoard(boardId);
    const stats = this.boardStats.get(boardId);
    if (stats[metric] !== undefined) {
      stats[metric] += count;
    }
  }

  logInfo(msg) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${msg}`);
  }

  logWarn(msg) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${msg}`);
  }

  logError(msg, err = null) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${msg}`, err ? err.message || err : '');
  }

  printBoardSummary(boardId) {
    const stats = this.boardStats.get(boardId);
    if (!stats) return;
    stats.endTime = Date.now();
    const durationSec = ((stats.endTime - stats.startTime) / 1000).toFixed(1);

    console.log(`\n==================================================`);
    console.log(`📊 METRICS SUMMARY: ${boardId.toUpperCase()}`);
    console.log(`--------------------------------------------------`);
    console.log(`Crawled Pages        : ${stats.crawled}`);
    console.log(`Successfully Extracted: ${stats.extracted}`);
    console.log(`Skipped (DB Cached)  : ${stats.skippedExisting}`);
    console.log(`Dropped (No Apply)   : ${stats.droppedInvalid}`);
    console.log(`API HTTP 200 Batches : ${stats.http200}`);
    console.log(`API Failed Batches   : ${stats.apiFailed}`);
    console.log(`Duration             : ${durationSec}s`);
    console.log(`==================================================\n`);
  }

  printTotalSummary() {
    let totalCrawled = 0;
    let totalExtracted = 0;
    let totalSkipped = 0;
    let totalDropped = 0;
    let total200 = 0;
    let totalFailed = 0;

    for (const [, stats] of this.boardStats) {
      totalCrawled += stats.crawled;
      totalExtracted += stats.extracted;
      totalSkipped += stats.skippedExisting;
      totalDropped += stats.droppedInvalid;
      total200 += stats.http200;
      totalFailed += stats.apiFailed;
    }

    console.log(`\n##################################################`);
    console.log(`🏆 OVERALL RUN SUMMARY (${this.boardStats.size} boards)`);
    console.log(`##################################################`);
    console.log(`Total Crawled Pages        : ${totalCrawled}`);
    console.log(`Total Extracted & Valid    : ${totalExtracted}`);
    console.log(`Total Skipped (DB Cached)  : ${totalSkipped}`);
    console.log(`Total Dropped Listings     : ${totalDropped}`);
    console.log(`Total API HTTP 200 Sent    : ${total200}`);
    console.log(`Total API Failed           : ${totalFailed}`);
    console.log(`##################################################\n`);
  }
}

export const logger = new MetricsLogger();
