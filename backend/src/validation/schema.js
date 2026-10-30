/**
 * JSON Schema specification for Firecrawl LLM/schema extraction
 * Matches Section 7 of the task brief
 */
export const JOB_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Job title, e.g. 'Software QA Intern'"
    },
    company: {
      type: ["string", "null"],
      description: "Company name, e.g. 'Silverline Technologies'"
    },
    location: {
      type: ["string", "null"],
      description: "Location, e.g. 'Colombo', 'Kandy', 'Remote'"
    },
    category: {
      type: ["string", "null"],
      description: "Job category/field, e.g. 'IT / Software', 'Accounting'"
    },
    job_type: {
      type: ["string", "null"],
      enum: ["Full-time", "Part-time", "Internship", "Contract", "Remote", null],
      description: "Employment type"
    },
    salary: {
      type: ["string", "null"],
      description: "Salary details, e.g. 'LKR 75,000 - 100,000' or null"
    },
    deadline: {
      type: ["string", "null"],
      description: "Application deadline in ISO date (YYYY-MM-DD) or text"
    },
    requirements: {
      type: ["string", "null"],
      description: "Qualifications, skills, or bullet points"
    },
    company_summary: {
      type: ["string", "null"],
      description: "Brief summary about the hiring company"
    },
    raw_text: {
      type: ["string", "null"],
      description: "Full raw text of the vacancy advertisement"
    },
    apply_url: {
      type: ["string", "null"],
      description: "Direct application link or employer form URL"
    },
    apply_email: {
      type: ["string", "null"],
      description: "Application email, e.g. 'careers@example.com'"
    },
    apply_whatsapp: {
      type: ["string", "null"],
      description: "WhatsApp contact number, e.g. '+94771234567'"
    },
    source_url: {
      type: ["string", "null"],
      description: "Direct permalink of the listing"
    }
  },
  required: ["title"]
};

/**
 * Validates and sanitizes a scraped job object according to Section 7 & Section 4 checklist.
 * 
 * CRITICAL RULE:
 * "every vacancy must have at least one valid apply method — apply_url, apply_email or apply_whatsapp. Drop any listing that has none."
 * 
 * @param {object} rawJob
 * @param {string} fallbackSourceUrl
 * @returns {object|null} Returns sanitized ScrapedJob or null if invalid
 */
export function validateAndSanitizeJob(rawJob, fallbackSourceUrl = null) {
  if (!rawJob || typeof rawJob !== 'object') {
    return null;
  }

  const title = (rawJob.title || '').trim();
  if (!title || title.length < 3) {
    return null; // Title is strictly required and must be meaningful
  }

  // Generic / placeholder titles to strictly reject
  const GENERIC_TITLES = new Set([
    'job vacancy',
    'job vacancies',
    'vacancy',
    'vacancies',
    'general vacancy',
    'topjobs',
    'top employers',
    'top employers in sri lanka',
    'vacview',
    'xpressjobs',
    'rooster',
    'rooster jobs',
    'observer jobs',
    'observerjobs',
    'careers',
    'career',
    'advertisement',
    'untitled',
    'home',
    'jobs in sri lanka',
    'sri lanka job network',
    'direct employer',
    'login from here',
    'recover password',
    'login'
  ]);

  const lowerTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (GENERIC_TITLES.has(lowerTitle)) {
    return null; // Reject generic title placeholder
  }

  // Reject titles that are just portal branding or portal site titles
  if (
    lowerTitle.startsWith('topjobs') ||
    lowerTitle.startsWith('xpressjobs') ||
    lowerTitle.startsWith('observer jobs') ||
    lowerTitle.startsWith('observerjobs') ||
    lowerTitle.startsWith('rooster jobs') ||
    lowerTitle.includes('sri lanka job network') ||
    lowerTitle.includes('jobs in sri lanka') ||
    lowerTitle === 'top employers' ||
    lowerTitle === 'ikman lk' ||
    lowerTitle === 'ikman' ||
    lowerTitle.includes('bad gateway') ||
    lowerTitle.includes('service unavailable')
  ) {
    return null;
  }

  // Reject HTTP error pages (e.g. Cloudflare 502 Bad Gateway, 503, 504, 404)
  const rawTextLower = (rawJob.raw_text || '').toLowerCase();
  const companyLower = (rawJob.company || '').toLowerCase();
  if (
    companyLower.includes('502') ||
    companyLower.includes('bad gateway') ||
    companyLower.includes('cloudflare') ||
    companyLower.includes('ray id') ||
    companyLower.includes('503') ||
    companyLower.includes('504') ||
    rawTextLower.includes('web server reported a bad gateway') ||
    rawTextLower.includes('cloudflare ray id') ||
    rawTextLower.includes('errorcode_502')
  ) {
    return null; // Reject Cloudflare and HTTP server error pages
  }

  // Reject source URLs that are clearly category lists or banner ads
  const sourceUrl = (rawJob.source_url || fallbackSourceUrl || '').trim();
  if (sourceUrl) {
    const lowerUrl = sourceUrl.toLowerCase();
    if (
      lowerUrl.includes('/admin/bannerservlet') ||
      lowerUrl.match(/\/jobs\/[a-z0-9-]+-jobs$/i) ||
      lowerUrl.match(/\/jobs\/jobs-in-[a-z0-9-]+$/i)
    ) {
      return null;
    }
  }

  // Extract application methods
  const apply_url = (rawJob.apply_url || '').trim() || null;
  const apply_email = (rawJob.apply_email || '').trim() || null;
  const apply_whatsapp = (rawJob.apply_whatsapp || '').trim() || null;

  // Strict Rule Check: Must have at least one valid apply method
  const hasValidApply = Boolean(
    (apply_url && (apply_url.startsWith('http://') || apply_url.startsWith('https://'))) ||
    (apply_email && apply_email.includes('@')) ||
    (apply_whatsapp && apply_whatsapp.replace(/[^0-9]/g, '').length >= 7)
  );

  if (!hasValidApply) {
    // Drop any listing that has none
    return null;
  }

  return {
    title: title,
    company: (rawJob.company && !/^(ikman|ikmanjobs|jobeka|jobeka\.lk|job\s*hub|jobhub|dreamjobs|xpressjobs|topjobs|rooster|observerjobs|lankajobs|jobpal)$/i.test(rawJob.company.trim())) 
      ? rawJob.company.trim() 
      : (rawJob.company === null ? null : 'Direct Employer'),
    location: (rawJob.location || '').trim() || null,
    category: (rawJob.category || '').trim() || null,
    job_type: (rawJob.job_type || '').trim() || null,
    salary: (rawJob.salary || '').trim() || null,
    deadline: (rawJob.deadline || '').trim() || null,
    requirements: (rawJob.requirements || '').trim() || null,
    company_summary: (rawJob.company_summary || '').trim() || null,
    raw_text: (rawJob.raw_text || '').trim() || null,
    apply_url: apply_url,
    apply_email: apply_email,
    apply_whatsapp: apply_whatsapp,
    source_url: (rawJob.source_url || fallbackSourceUrl || '').trim() || null
  };
}
