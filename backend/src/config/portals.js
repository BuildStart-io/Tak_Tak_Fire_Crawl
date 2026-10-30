import fs from 'fs';
import path from 'path';

/**
 * Base 20 Target Portals as defined in the Task Brief
 */
export const BASE_TARGET_PORTALS = [
  { id: 'topjobs', name: 'TopJobs', url: 'https://www.topjobs.lk' },
  { id: 'xpressjobs', name: 'XpressJobs', url: 'https://xpress.jobs' },
  { id: 'ikman', name: 'Ikman Jobs', url: 'https://ikman.lk/en/ads/sri-lanka/jobs' },
  { id: 'jobeka', name: 'JobEka', url: 'https://jobeka.lk' },
  { id: 'jobpal', name: 'Jobpal.lk', url: 'https://jobpal.lk' },
  { id: 'observerjobs', name: 'Observer Jobs', url: 'https://observerjobs.lk' },
  { id: 'jobfactory', name: 'Jobfactory', url: 'https://jobfactory.lk' },
  { id: 'lankajobs', name: 'LankaJobs', url: 'https://lankajobs.lk' },
  { id: 'dreamjobs', name: 'DreamJobs.lk', url: 'https://dreamjobs.lk' },
  { id: 'jobhub', name: 'Jobhub.lk', url: 'https://jobhub.lk' },
  { id: 'rooster', name: 'Rooster.jobs', url: 'https://rooster.jobs' },
  { id: 'workstone', name: 'Workstone.lk', url: 'https://workstone.lk' },
  { id: 'careerfirst', name: 'CareerFirst', url: 'https://careerfirst.lk' },
  { id: 'jobsnet', name: 'JobsNet', url: 'https://jobsnet.lk' },
  { id: 'guru', name: 'Everjobs / Guru.lk Jobs', url: 'https://www.guru.lk/jobs' },
  { id: 'sundaytimes', name: 'Sunday Times Classifieds', url: 'https://www.sundaytimes.lk/classifieds/' },
  { id: 'lankainformation', name: 'Lanka Information Jobs', url: 'https://lankainformation.lk/jobs' },
  { id: 'myjobs', name: 'MyJobs.lk', url: 'https://myjobs.lk' },
  { id: 'jobsinsrilanka', name: 'JobsInSriLanka.lk', url: 'https://jobsinsrilanka.lk' },
  { id: 'governmentjobs', name: 'Government Gazette / SL Govt Jobs', url: 'https://governmentjobs.lk' }
];

/**
 * Loads custom portals added via the Dashboard or API
 */
export function getCustomPortals() {
  const customFilePath = path.resolve(process.cwd(), 'database', 'custom_portals.json');

  try {
    if (fs.existsSync(customFilePath)) {
      const content = fs.readFileSync(customFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return [];
}

/**
 * Save a newly added portal from backend/UI
 */
export function saveCustomPortal(portalObj) {
  const customFilePath = path.resolve(process.cwd(), 'database', 'custom_portals.json');
  const dir = path.dirname(customFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const existing = getCustomPortals();
  if (!existing.some(p => p.url.toLowerCase() === portalObj.url.toLowerCase())) {
    existing.push(portalObj);
    fs.writeFileSync(customFilePath, JSON.stringify(existing, null, 2), 'utf-8');
  }
  return existing;
}

/**
 * Returns all active portals: Base 20 + any custom registered portals
 */
export function getAllPortals() {
  const custom = getCustomPortals();
  return [...BASE_TARGET_PORTALS, ...custom];
}

/**
 * Filter portals by PORTALS env variable (e.g. PORTALS=topjobs,xpressjobs,rooster)
 */
export function getActivePortals(filterString = '') {
  const all = getAllPortals();
  if (!filterString || filterString.trim() === '') {
    return all;
  }
  const requested = filterString
    .split(',')
    .map(p => p.trim().toLowerCase())
    .filter(Boolean);

  return all.filter(portal =>
    requested.includes(portal.id.toLowerCase()) ||
    requested.includes(portal.name.toLowerCase())
  );
}
