import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'database', 'scraper.db');

if (!fs.existsSync(dbPath)) {
  console.log(`❌ Database file not found at: ${dbPath}`);
  console.log('Run a scrape or dry-run first: npm run dry-run');
  process.exit(1);
}

const db = new DatabaseSync(dbPath);

console.log('====================================================');
console.log('📊 TAKTAK JOBS - LOCAL SQLITE DATABASE INSPECTOR');
console.log(`📁 File: ${dbPath}`);
console.log('====================================================\n');

// 1. Seen Jobs Summary
try {
  const jobsCount = db.prepare('SELECT COUNT(*) as c FROM seen_jobs').get().c;
  console.log(`🟢 Total Cached Seen Jobs: ${jobsCount}`);

  const recentJobs = db.prepare(`
    SELECT url, portal, title, company, first_seen_at, status 
    FROM seen_jobs 
    ORDER BY first_seen_at DESC 
    LIMIT 10
  `).all();

  if (recentJobs.length > 0) {
    console.log('\n--- Latest 10 Cached Vacancies ---');
    console.table(recentJobs.map(j => ({
      Portal: j.portal,
      Title: (j.title || '').slice(0, 30),
      Company: (j.company || '').slice(0, 20),
      'First Seen': j.first_seen_at.slice(0, 19).replace('T', ' '),
      Status: j.status
    })));
  } else {
    console.log('ℹ️  No jobs cached yet.');
  }

  // 2. Crawl Runs
  const runsCount = db.prepare('SELECT COUNT(*) as c FROM crawl_runs').get().c;
  console.log(`\n🟣 Total Crawl Runs Logged: ${runsCount}`);

  const recentRuns = db.prepare(`
    SELECT id, portal, started_at, found_count, new_scraped, skipped_existing, dropped_invalid, api_status 
    FROM crawl_runs 
    ORDER BY id DESC 
    LIMIT 10
  `).all();

  if (recentRuns.length > 0) {
    console.log('\n--- Latest 10 Crawl Runs ---');
    console.table(recentRuns.map(r => ({
      ID: r.id,
      Portal: r.portal,
      Found: r.found_count,
      'New Ingested': r.new_scraped,
      Skipped: r.skipped_existing,
      Dropped: r.dropped_invalid,
      Status: r.api_status,
      Time: r.started_at.slice(0, 19).replace('T', ' ')
    })));
  }

  // 3. Export readable JSON dump
  const allJobs = db.prepare('SELECT * FROM seen_jobs ORDER BY first_seen_at DESC').all();
  const allRuns = db.prepare('SELECT * FROM crawl_runs ORDER BY id DESC').all();
  const exportPath = path.resolve(process.cwd(), 'database', 'database_export.json');
  fs.writeFileSync(exportPath, JSON.stringify({
    exported_at: new Date().toISOString(),
    total_jobs: allJobs.length,
    total_runs: allRuns.length,
    seen_jobs: allJobs,
    crawl_runs: allRuns
  }, null, 2), 'utf-8');

  console.log(`\n✅ Generated readable JSON copy: database/database_export.json`);
  console.log('   (You can open database_export.json in your editor to read all data as text!)\n');

} catch (err) {
  console.error('Error querying database:', err.message);
} finally {
  db.close();
}
