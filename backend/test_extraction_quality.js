import { FirecrawlClient } from './src/firecrawl/client.js';
import { validateAndSanitizeJob } from './src/validation/schema.js';

async function testExtraction() {
  console.log('--- Testing Extraction for TopJobs, XpressJobs, Rooster ---');
  const client = new FirecrawlClient('http://localhost:3002');

  // 1. TopJobs
  console.log('\nTesting TopJobs discovery...');
  const topjobsUrls = await client.discoverJobUrls('https://www.topjobs.lk', 5);
  console.log('TopJobs discovered URLs:', topjobsUrls);
  for (const url of topjobsUrls.slice(0, 2)) {
    const scraped = await client.scrapeJobVacancy(url);
    const validated = validateAndSanitizeJob(scraped, url);
    console.log('TopJobs Scraped & Validated:', validated ? {
      title: validated.title,
      company: validated.company,
      location: validated.location,
      apply_url: validated.apply_url
    } : 'DROPPED AS INVALID');
  }

  // 2. XpressJobs
  console.log('\nTesting XpressJobs discovery...');
  const xpressUrls = await client.discoverJobUrls('https://xpress.jobs', 5);
  console.log('XpressJobs discovered URLs:', xpressUrls);
  for (const url of xpressUrls.slice(0, 2)) {
    const scraped = await client.scrapeJobVacancy(url);
    const validated = validateAndSanitizeJob(scraped, url);
    console.log('XpressJobs Scraped & Validated:', validated ? {
      title: validated.title,
      company: validated.company,
      location: validated.location,
      apply_url: validated.apply_url
    } : 'DROPPED AS INVALID');
  }

  // 3. Rooster
  console.log('\nTesting Rooster discovery...');
  const roosterUrls = await client.discoverJobUrls('https://rooster.jobs', 5);
  console.log('Rooster discovered URLs:', roosterUrls);
  for (const url of roosterUrls.slice(0, 2)) {
    const scraped = await client.scrapeJobVacancy(url);
    const validated = validateAndSanitizeJob(scraped, url);
    console.log('Rooster Scraped & Validated:', validated ? {
      title: validated.title,
      company: validated.company,
      location: validated.location,
      apply_url: validated.apply_url
    } : 'DROPPED AS INVALID');
  }
}

testExtraction().catch(console.error);
