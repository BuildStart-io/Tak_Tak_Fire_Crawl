import cron from 'node-cron';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { ScraperDatabase } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..', '..');

let isCycleRunning = false;
let currentChildProcess = null;

/**
 * Triggers a crawl execution cycle (dry-run or live)
 * @param {string} triggerType - 'scheduled' (cron 06:00/14:00) or 'manual' (UI button)
 * @param {object} options - { dryRun, portals }
 */
export function runScheduledCycle(triggerType = 'scheduled', options = {}) {
  if (isCycleRunning) {
    logger.logWarn(`[CRON] A crawl cycle is already active. Ignoring trigger.`);
    return { ok: false, message: 'A crawl cycle is already in progress' };
  }

  isCycleRunning = true;
  const colomboDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date()).replace(/[^0-9]/g, '');

  const runId = `CRON-${colomboDate.slice(0, 8)}-${colomboDate.slice(8, 12)}`;
  logger.logInfo(`[CRON SCHEDULER] ⏰ Triggering crawl cycle [${runId}] (Trigger: ${triggerType}, Colombo Time)`);

  const env = {
    ...process.env,
    CRON_RUN_ID: runId,
    TRIGGER_TYPE: triggerType,
    DRY_RUN: options.dryRun !== undefined ? String(options.dryRun) : (process.env.DRY_RUN || 'true'),
    PORTALS: options.portals || process.env.PORTALS || ''
  };

  const runnerScript = path.resolve(rootDir, 'index.js');
  const child = spawn(process.execPath, [runnerScript], {
    cwd: rootDir,
    env,
    stdio: 'inherit'
  });

  currentChildProcess = child;

  child.on('close', (code) => {
    isCycleRunning = false;
    currentChildProcess = null;
    logger.logInfo(`[CRON SCHEDULER] ✅ Crawl cycle [${runId}] finished with exit code ${code}`);
  });

  child.on('error', (err) => {
    isCycleRunning = false;
    currentChildProcess = null;
    logger.logError(`[CRON SCHEDULER] ❌ Error in cycle [${runId}]`, err);
  });

  return { ok: true, runId, message: `Cycle ${runId} started successfully` };
}

/**
 * Starts the twice-daily cron scheduler at 06:00 and 14:00 Colombo time
 * Specification: "Runs twice daily at 06:00 and 14:00 Colombo time"
 * CRON_TZ=Asia/Colombo
 * 0 6,14 * * *
 */
export function startCronScheduler() {
  const cronExpression = '0 6,14 * * *';
  const timezone = 'Asia/Colombo';

  console.log(`================================================================`);
  console.log(`⏰ TAKTAK JOBS - AUTOMATION & SCHEDULING (CRON)`);
  console.log(`Schedule    : Twice daily at 06:00 and 14:00`);
  console.log(`Timezone    : Asia/Colombo`);
  console.log(`Expression  : ${cronExpression}`);
  console.log(`================================================================\n`);

  const task = cron.schedule(cronExpression, () => {
    logger.logInfo(`[CRON TRIGGER] 🔔 Scheduled cron fired at 06:00/14:00 Colombo time!`);
    runScheduledCycle('scheduled');
  }, {
    timezone: timezone,
    scheduled: true
  });

  return task;
}

export function getSchedulerStatus() {
  return {
    isRunning: isCycleRunning,
    schedule: '06:00 & 14:00 Colombo (Daily)',
    timezone: 'Asia/Colombo',
    nextScheduledTimes: ['Today 06:00 Colombo', 'Today 14:00 Colombo']
  };
}

// If run directly from terminal: `node backend/src/scheduler/cron.js`
if (process.argv[1] && process.argv[1].endsWith('cron.js')) {
  startCronScheduler();
  logger.logInfo(`Cron daemon is standing by for 06:00 and 14:00 Colombo triggers...`);
}
