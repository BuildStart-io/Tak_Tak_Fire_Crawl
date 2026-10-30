import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const isInsideBackend = process.cwd().endsWith('backend');
const rootDir = isInsideBackend ? path.resolve(process.cwd(), '..') : process.cwd();
const dbPath = path.resolve(rootDir, 'database', 'scraper.db');
const outDir = path.resolve(rootDir, 'out');

console.log('🧹 Starting full data reset...');

// 1. Clean out/ directory and archive
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir);
  for (const f of files) {
    const full = path.join(outDir, f);
    if (f.endsWith('.json')) {
      fs.unlinkSync(full);
      console.log(`Deleted payload: out/${f}`);
    } else if (f === 'archive') {
      fs.rmSync(full, { recursive: true, force: true });
      console.log(`Deleted out/archive directory.`);
    }
  }
}

// 2. Clean database tables
if (fs.existsSync(dbPath)) {
  const db = new DatabaseSync(dbPath);
  db.exec('DELETE FROM seen_jobs;');
  db.exec('DELETE FROM crawl_runs;');
  db.exec('DELETE FROM cron_cycles;');
  console.log('✅ Cleared SQLite tables: seen_jobs (cache), crawl_runs, and cron_cycles.');
  db.close();
}

console.log('\n✨ All data successfully wiped! Ready for a 100% fresh dry-run.');

