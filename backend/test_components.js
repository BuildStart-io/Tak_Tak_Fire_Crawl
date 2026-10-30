import assert from 'assert';
import { validateAndSanitizeJob } from './src/validation/schema.js';
import { getActivePortals } from './src/config/portals.js';
import { TakTakApiClient } from './src/api/taktak.js';
import fs from 'fs/promises';

console.log('--- Testing Job Validation & Filtering ---');

// Test 1: Valid job with apply_email
const job1 = validateAndSanitizeJob({
  title: 'QA Engineer',
  company: 'Sysco Labs',
  apply_email: 'careers@syscolabs.lk'
});
assert(job1 !== null, 'Job with email should be valid');
assert.strictEqual(job1.title, 'QA Engineer');
console.log('✅ Passed: Valid job with apply_email accepted');

// Test 2: Valid job with apply_url
const job2 = validateAndSanitizeJob({
  title: 'Software Developer',
  company: 'WSO2',
  apply_url: 'https://wso2.com/careers/apply/123'
});
assert(job2 !== null, 'Job with apply_url should be valid');
console.log('✅ Passed: Valid job with apply_url accepted');

// Test 3: Valid job with apply_whatsapp
const job3 = validateAndSanitizeJob({
  title: 'Driver',
  apply_whatsapp: '+94771234567'
});
assert(job3 !== null, 'Job with whatsapp should be valid');
console.log('✅ Passed: Valid job with apply_whatsapp accepted');

// Test 4: Invalid job WITHOUT apply method (MUST BE DROPPED)
const invalidJobNoApply = validateAndSanitizeJob({
  title: 'Accountant',
  company: 'Some Firm',
  location: 'Colombo'
  // No apply_url, no apply_email, no apply_whatsapp
});
assert.strictEqual(invalidJobNoApply, null, 'Job without apply method MUST be dropped');
console.log('✅ Passed: Listing with NO apply method was correctly dropped');

// Test 5: Invalid job with missing title
const invalidJobNoTitle = validateAndSanitizeJob({
  apply_email: 'jobs@firm.com'
});
assert.strictEqual(invalidJobNoTitle, null, 'Job without title MUST be dropped');
console.log('✅ Passed: Listing without title was correctly dropped');

// Test 6: Active Portals filter
const threePortals = getActivePortals('topjobs,xpressjobs,rooster');
assert.strictEqual(threePortals.length, 3, 'Should filter to exactly 3 portals');
console.log('✅ Passed: PORTALS filter selected 3 test portals:', threePortals.map(p => p.id).join(', '));

const allPortals = getActivePortals('');
assert.strictEqual(allPortals.length, 20, 'Should return all 20 portals');
console.log('✅ Passed: Empty filter returns all 20 portals');

// Test 7: Dry-Run file output
console.log('\n--- Testing Dry-Run Batch Saving ---');
const dryRunClient = new TakTakApiClient({ dryRun: true });
const dryRunResult = await dryRunClient.ingestBatch('test_portal', [job1, job2]);
assert(dryRunResult.ok, 'Dry run should return ok: true');
const savedFileContent = await fs.readFile(dryRunResult.filePath, 'utf-8');
const parsed = JSON.parse(savedFileContent);
assert.strictEqual(parsed.source, 'hetzner-firecrawl:test_portal');
assert.strictEqual(parsed.jobs.length, 2);
console.log(`✅ Passed: Dry-run successfully wrote ${parsed.jobs.length} jobs to ${dryRunResult.filePath}`);

// Clean up test file
await fs.unlink(dryRunResult.filePath).catch(() => {});

// Test 8: SQLite Database Operations
console.log('\n--- Testing SQLite Database Integration ---');
import { ScraperDatabase } from './src/db/database.js';
import path from 'path';

const testDbPath = path.resolve(process.cwd(), 'database', 'test_scraper.db');
const testDb = new ScraperDatabase(testDbPath);

// Check url not seen yet
assert.strictEqual(testDb.isJobSeen('https://rooster.jobs/123'), false, 'URL should not be seen initially');

// Record job
testDb.recordJob('rooster', {
  title: 'Backend Engineer',
  company: 'Tech Corp',
  source_url: 'https://rooster.jobs/123'
});

// Now url should be seen!
assert.strictEqual(testDb.isJobSeen('https://rooster.jobs/123'), true, 'URL should now be seen in SQLite');
console.log('✅ Passed: Job recorded and correctly marked as seen in SQLite');

// Test audit run log
testDb.logCrawlRun({
  portal: 'rooster',
  startedAt: new Date().toISOString(),
  foundCount: 10,
  newScraped: 2,
  skippedExisting: 8,
  droppedInvalid: 0,
  apiStatus: 'OK'
});

const stats = testDb.getStats();
assert.strictEqual(stats.totalJobs, 1, 'Should have 1 recorded job');
assert.strictEqual(stats.totalRuns, 1, 'Should have 1 recorded run');
console.log(`✅ Passed: SQLite stats verified (${stats.totalJobs} job, ${stats.totalRuns} run logged)`);

testDb.close();
await fs.unlink(testDbPath).catch(() => {});

console.log('\n🎉 ALL LOGIC, VALIDATION & SQLITE TESTS PASSED PERFECTLY!\n');

