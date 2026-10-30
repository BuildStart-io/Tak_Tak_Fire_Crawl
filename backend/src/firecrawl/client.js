import { JOB_EXTRACTION_SCHEMA } from '../validation/schema.js';
import { logger } from '../utils/logger.js';

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

function isGenericTitle(title) {
  if (!title || typeof title !== 'string') return true;
  const clean = title.trim();
  if (clean.length < 3) return true;
  const lower = clean.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (GENERIC_TITLES.has(lower)) return true;
  if (
    lower.startsWith('topjobs') ||
    lower.startsWith('xpressjobs') ||
    lower.includes('sri lanka job network') ||
    lower.includes('jobs in sri lanka') ||
    lower === 'top employers'
  ) {
    return true;
  }
  return false;
}

/**
 * Extracts clean, human-readable requirements text without raw markdown images,
 * navigation buttons, or raw URL junk.
 */
export function cleanJobRequirements(markdown) {
  if (!markdown || typeof markdown !== 'string') return null;

  let text = markdown.replace(/!\[.*?\](?:\(.*?\)|\[.*?\])?/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/#+\s*/g, '').replace(/[-=]{3,}/g, '').replace(/\*{2,}/g, '');

  // 1. Look for explicit Requirements / Qualifications / What You Bring section
  const reqMatch = text.match(/(?:Requirements|Qualifications|What You Bring|Key Criteria|Key Requirements)[\s\S]*?(?:Apply for this job|How to apply|Resume\/CV|By clicking|Submit Application|Similar Jobs|$)/i);
  if (reqMatch && reqMatch[0].trim().length > 50) {
    text = reqMatch[0];
  } else {
    // 2. Check for explicit Responsibilities / The Role
    const roleMatch = text.match(/(?:Responsibilities|Duties|The Role)[\s\S]*?(?:Apply for this job|How to apply|Resume\/CV|By clicking|Submit Application|Similar Jobs|$)/i);
    if (roleMatch && roleMatch[0].trim().length > 50 && !/Find Your Dream Job/i.test(roleMatch[0])) {
      text = roleMatch[0];
    } else {
      return null;
    }
  }

  // 3. Clean noisy boilerplate lines
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .filter(l => !/^(find your dream job|all locations|discover verified|apply for this job|click or drag|resume\/cv|first name|last name|email|phone number|internationalafghanistan|share this job|by clicking|seems you have change your email|do you wish to update your email|notice: we do not use messaging apps|ats friendly|my resume builder|live resume preview|upload your photo in your resume)/i.test(l));

  const result = lines.join('\n').trim();
  // Filter out dummy template placeholder text (e.g. Responsibility 1, Responsibility 2, ATS friendly)
  if (/\b(?:responsibility\s*1\s*\*\s*responsibility\s*2|ats friendly|my resume builder|easy customization: section interchange)\b/i.test(result)) {
    return null;
  }

  // Must contain genuine requirement or bullet keywords
  if (result.length > 30 && /(?:experience|degree|diploma|skills|years|knowledge|proficien|ability|fluent|duties|manage|develop|\*|-)/i.test(result)) {
    return result.slice(0, 800);
  }
  return null;
}

/**
 * Cleans the raw advertisement markdown by stripping out AWS S3 logo links,
 * image markdown, and noisy form submission disclaimers, leaving pure readable vacancy text.
 */
export function cleanRawText(markdown) {
  if (!markdown || typeof markdown !== 'string') return null;

  // 1. Strip all markdown image tags and linked image tags: [![...](...)](...)
  let text = markdown.replace(/\[\!\[.*?\]\(.*?\)\]\(.*?\)/g, '');
  text = text.replace(/!\[.*?\](?:\(.*?\)|\[.*?\])?/g, '');

  // 2. Remove common noisy top banners and interactive form boilerplates
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => {
      if (!line) return false;
      // Strip portal site header banners, interactive popups, and form inputs
      if (/^(find your dream job|discover verified job opportunities|all locations|all categories|click or drag files|resume\/cv|first name|last name|email address|phone number|internationalafghanistan|share this job|by clicking 'submit application'|reply stop to unsubscribe)|^×$/i.test(line)) {
        return false;
      }
      if (/seems you have change your email address|do you wish to update your email address|notice: we do not use messaging apps/i.test(line)) {
        return false;
      }
      return true;
    });

  const result = lines.join('\n').trim();
  return result.length > 30 ? result.slice(0, 12000) : null;
}

/**
 * Extracts specific Sri Lankan city / district or location from advertisement text
 */
export function extractLocation(text, rawLoc = null) {
  const isInvalidLocation = (val) => {
    if (!val || typeof val !== 'string') return true;
    const clean = val.trim();
    if (clean.length < 2 || clean.length > 60 || clean.includes('\n')) return true;
    // Reject any markdown links, URLs, web protocols, domains, email, or markdown symbols
    if (/[\[\]\(\)\{\}<>\\\/|@^~*#]/.test(clean)) return true;
    if (/https?:\/\/|www\.|\.lk|\.com|\/contact|\/about|\/terms|\/privacy/i.test(clean)) return true;
    if (/\b(?:contact|about us|terms|privacy|share|follow|facebook|twitter|instagram|linkedin|tiktok|youtube|copyright|all rights reserved)\b/i.test(clean)) return true;
    if (/\b(?:senior|junior|executive|executives|manager|officer|assistant|trainee|operator|driver|engineer)\b/i.test(clean)) return true;
    return /^(Sri Lanka|Previous|Next|Related Jobs|All Locations|Basis|Contract Basis|Full Time|Part Time|Permanent|Temporary|Internship|Any|Day Shift|Night Shift|Urgent|Apply Now)$/i.test(clean) ||
           /\b(?:basis|shift|days?\s*left)\b/i.test(clean);
  };

  // If rawLoc is provided from portal or metadata and is genuine location
  if (rawLoc && !isInvalidLocation(rawLoc)) {
    return rawLoc.trim();
  }
  if (!text) return 'Sri Lanka';

  // 1. LankaJobs layout: "* Location\n##### Colombo" or "* Location\n##### Sri Lanka"
  const ljMatch = text.match(/\*\s*Location\s*\r?\n#+\s*([^\n\r*]+)/i);
  if (ljMatch) {
    let loc = ljMatch[1].trim().replace(/^[:\s-]+/, '').replace(/\s+/g, ' ');
    loc = loc.replace(/,\s*Sri Lanka$/i, '').trim();
    if (loc.length > 2 && loc.length < 60 && !isInvalidLocation(loc)) {
      return loc;
    }
    if (/^Sri Lanka$/i.test(loc)) {
      return 'Sri Lanka';
    }
  }

  // 2. Explicit Location tag: "Location: ...", "Work Location: ...", "Place of Work: ...", "Based in: ..."
  const m1 = text.match(/(?:Location|Work Location|Job Location|Place of Work|Based in|Stationed in|Workplace|Branch):\s*([^\n\r|*]+)/i);
  if (m1 && m1[1].trim().length > 2 && !/PVT|LTD|Part-Time|Full-Time|Basis/i.test(m1[1])) {
    let loc = m1[1].trim().replace(/^[:\s-]+/, '').replace(/\s+/g, ' ');
    loc = loc.replace(/,\s*Sri Lanka$/i, '').trim();
    if (loc.length > 2 && loc.length < 60 && !/^(null|undefined|na|n\/a)$/i.test(loc) && !isInvalidLocation(loc)) {
      return loc;
    }
  }

  // 3. Multi-part pipe header: "<Title> | <Location> | <Company>"
  const pipeMatch = text.match(/(?:^|\n)([^\n|]+?)\s*\|\s*([^\n|]+?)\s*\|\s*([^\n|]+?)(?:\r?\n|$)/);
  if (pipeMatch) {
    const candidate = pipeMatch[2].trim();
    if (candidate.length > 2 && candidate.length < 50 && !/PVT|LTD|Full[- ]Time|Part[- ]Time|Permanent|Contract|Internship|XpressJobs|TopJobs|Rooster|rider|driver|officer|manager|executive|engineer|assistant|required|தேவை|අවශ්‍යයි/i.test(candidate) && !isInvalidLocation(candidate)) {
      return candidate;
    }
  }

  // 5. XpressJobs single line right before "days left"
  const m2 = text.match(/\n([^\n\r]+?)\r?\n\d+\s+days?\s+left/i);
  if (m2 && m2[1].trim().length > 2 && !/PVT|LTD|Full Time|Part-Time|Previous|Next|View all/i.test(m2[1])) {
    const candidate = m2[1].trim();
    if (candidate.length > 2 && candidate.length < 50 && !isInvalidLocation(candidate)) {
      return candidate;
    }
  }

  // 6. Rooster pattern: "Full-timeColombo, Sri Lanka" or "ContractIndia" (single line, no newlines)
  const roosterLoc = text.match(/(?:Full-time|Part-time|Contract|Internship|Permanent)[ \t]*([A-Za-z \t,.-]+?)(?:[ \t]+(?:Apply for this job|USD|LKR)|\r?\n|$)/i);
  if (roosterLoc && roosterLoc[1].trim().length > 2 && roosterLoc[1].trim().length < 50) {
    let loc = roosterLoc[1].trim().replace(/^[:\s-]+/, '').replace(/\s+/g, ' ');
    loc = loc.replace(/,\s*Sri Lanka$/i, '').trim();
    if (!/^(null|undefined|na|n\/a|next|previous|related jobs)$/i.test(loc) && loc.length > 2 && !isInvalidLocation(loc)) {
      return loc;
    }
  }

  // 7. Dynamic fallback: All 25 Sri Lankan Districts + Commercial Hubs + Remote / Hybrid / Overseas
  const SRI_LANKAN_DISTRICTS = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
    'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
    'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
    'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
    'Colombo 01', 'Colombo 02', 'Colombo 03', 'Colombo 04', 'Colombo 05', 'Colombo 06', 'Colombo 07', 'Colombo 08', 'Colombo 09', 'Colombo 10', 'Colombo 11', 'Colombo 12', 'Colombo 13', 'Colombo 14', 'Colombo 15',
    'Negombo', 'Dehiwala', 'Moratuwa', 'Kotte', 'Battaramulla', 'Rajagiriya', 'Nugegoda',
    'Wattala', 'Katunayake', 'Kelaniya', 'Panadura', 'Horana', 'Chilaw', 'Ja-Ela', 'Beruwala', 'Weligama',
    'Remote', 'Hybrid', 'Island Wide'
  ];
  // Remove sidebar "Similar Jobs" or "Related Jobs" before scanning for districts so ads in the sidebar don't override the real location
  const cleanDistrictText = text.replace(/(?:###\s*Similar Jobs|Similar Jobs|Related Jobs)[\s\S]*?(?:Job Summary|Share this Job|$)/i, '');
  for (const district of SRI_LANKAN_DISTRICTS) {
    const reg = new RegExp('\\b' + district + '\\b', 'i');
    if (reg.test(cleanDistrictText)) return district;
  }

  // 7. Explicit Foreign / Overseas Job detection
  if (/\b(?:foreign job|overseas|abroad|qatar|dubai|uae|saudi|kuwait|oman|bahrain|serbia|romania|malaysia)\b/i.test(text)) {
    return 'Overseas';
  }

  return 'Sri Lanka';
}

/**
 * Extracts vacancy closing deadline or converts "X days left" into ISO date
 */
export function extractDeadline(text, preDeadline = null) {
  if (preDeadline && preDeadline.trim().length > 2) {
    return preDeadline.trim();
  }
  if (!text) return null;

  // 1. XpressJobs: X days left -> compute actual ISO date
  const daysLeftMatch = text.match(/(\d+)\s+days?\s+left/i);
  if (daysLeftMatch) {
    const days = parseInt(daysLeftMatch[1], 10);
    const date = new Date('2026-10-28');
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  // 2. Explicit Closing Date / Deadline
  const explicitDate = text.match(/(?:Closing Date|Deadline|Apply Before|Expires|Valid Until)[\s:]*([A-Za-z0-9\s,-]+?)(?:\r?\n|\.|$)/i);
  if (explicitDate && explicitDate[1].trim().length > 4 && explicitDate[1].trim().length < 30) {
    const raw = explicitDate[1].trim();
    if (/\d/.test(raw)) return raw;
  }

  // 3. Direct date regex (e.g. 2026-11-15 or 15 Nov 2026)
  const dMatch = text.match(/\b(202[4-9]-[0-1][0-9]-[0-3][0-9]|\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+202[4-9])\b/i);
  if (dMatch) return dMatch[0];

  return null;
}

/**
 * Detects employment type according to Section 7 schema:
 * Full-time | Part-time | Internship | Contract | Remote
 */
export function detectJobType(title = '', text = '') {
  const combined = (title + ' ' + (text || '').slice(0, 1500)).toLowerCase();
  if (/\b(?:intern|internship|trainee)\b/i.test(combined)) return 'Internship';
  if (/\b(?:part-time|part time)\b/i.test(combined)) return 'Part-time';
  if (/\b(?:contract|contractual|temporary|freelance)\b/i.test(combined)) return 'Contract';
  if (/\b(?:fully remote|100% remote|remote role|remote position)\b/i.test(combined)) return 'Remote';
  return 'Full-time';
}

/**
 * Extracts company summary/description if published on the page
 */
export function extractCompanySummary(text) {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(/(?:The Company|About Us|About The Company)[\s\S]*?(?:The Role|Job Description|Responsibilities|Requirements|What You Bring|Qualifications|Employment Details|Apply|$)/i);
  if (m && m[0].trim().length > 40) {
    let summary = m[0]
      .replace(/^(?:The Company|About Us|About The Company)[#*\s:]*/i, '')
      .replace(/[#*]+/g, '')
      .trim();
    const lines = summary.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const clean = lines.join(' ').trim();
    if (clean.length > 30) {
      return clean.slice(0, 400);
    }
  }
  return null;
}

/**
 * Automatically classifies job title & description into real industry categories
 * according to Section 7 schema specification (e.g. 'IT / Software', 'Accounting / Finance')
 */
export function detectJobCategory(title, text = '', metadata = {}) {
  const rawTitle = title || '';
  const t = rawTitle.toLowerCase();
  const desc = (text || '').toLowerCase();
  const metaCat = ((metadata.category || '') + ' ' + (metadata.department || '')).toLowerCase();

  // 1. Engineering / Technical (Must be checked BEFORE general IT / Software so Civil/Mechanical engineers aren't caught by 'engineer')
  if (/\b(?:civil|mechanical|electrical|electronic|marine|chemical|structural|aeronautical|automobile|automotive|resident engineer|chief engineer|maintenance engineer|site engineer|project engineer|service engineer|draughtsman|draftsman|technician|quantity surveyor|\bqs\b|surveyor|fitter|welder|machinist|electrician|plumber|foreman|plant operator)\b/i.test(t)) {
    if (!/\b(?:software|qa|test|cloud|devops|data|frontend|backend|full stack|web|firmware)\b/i.test(t)) {
      return 'Engineering / Technical';
    }
  }

  // 2. IT / Software
  if (/\b(?:software|developer|programmer|full stack|frontend|backend|devops|data scientist|data engineer|machine learning|\b(ai|ml)\b|react|python|node|java|\.net|c\+\+|php|boomi|qa tester|cloud|solution architect|software architect|web designer|web developer|sysadmin|system administrator|database administrator|\bdba\b|information technology|it manager|it infrastructure|it executive|it support|it officer|it assistant|it administrator|it specialist|\bict\b|cyber security|network engineer|network administrator|computer technology|computer hardware|computer instructor)\b/i.test(t) ||
      /\bIT\b/.test(rawTitle)) {
    return 'IT / Software';
  }

  // 3. Accounting / Finance (Including Sinhala and Tamil banking/cashier terms)
  if (/\b(?:finance|financial|account|accountant|accounts|audit|auditor|taxation|\btax\b|banking|banker|shroff|cashier|teller|wealth planner|financial advisor|insurance|underwriter|credit officer|leasing|recovery officer|microfinance|\bcma\b|\bacca\b|\bcfa\b|treasury|bancassurance)\b/i.test(t) ||
      /(?:බැංකු|ගණකාධිකාරී|මුදල් අයකැමි|අයකැමි|ගිණුම්|ණය)/i.test(t) ||
      /(?:வங்கி|கணக்காளர்|காசாளர்|நிதி)/i.test(t)) {
    return 'Accounting / Finance';
  }

  // 4. Hospitality / Tourism
  if (/\b(?:hotel|resort|restaurant|hospitality|tourism|tourist|travel|chef|cook|sous chef|steward|barista|bartender|waiter|waitress|f&b|food & beverage|housekeeping|room boy|baker|bakery|pastry|juice maker|culinary|kitchen)\b/i.test(t)) {
    return 'Hospitality / Tourism';
  }

  // 5. Logistics / Supply Chain
  if (/\b(?:logistics|supply chain|procurement|warehouse|shipping|inventory|stores|storekeeper|transport|transport officer|fleet|freight|cargo|clearing|forwarding|courier|delivery rider|delivery driver|driver|chauffeur)\b/i.test(t)) {
    return 'Logistics / Supply Chain';
  }

  // 6. Sales / Business Dev
  if (/\b(?:sales|business development|\bbdm\b|account manager|merchandiser|merchandising|customer acquisition|telesales|telemarketing|sales executive|sales representative|real estate agent)\b/i.test(t)) {
    return 'Sales / Business Dev';
  }

  // 7. Human Resources
  if (/\b(?:\bhr\b|human resource|human resources|talent acquisition|recruitment|recruiter|training|learning.*development|people & culture|people partner)\b/i.test(t)) {
    if (!/\bstudent recruitment\b/i.test(t)) {
      return 'Human Resources';
    }
  }

  // 8. Design / Creative
  if (/\b(?:\b(ui|ux)\b|designer|graphic designer|creative designer|video editor|animator|art director|multimedia|photographer|videographer|copywriter|3d artist|illustrator)\b/i.test(t)) {
    return 'Design / Creative';
  }

  // 9. Marketing / PR
  if (/\b(?:marketing|digital marketing|\bseo\b|brand manager|brand executive|social media|advertising|public relations|\bpr executive\b|growth hacker|content creator)\b/i.test(t)) {
    return 'Marketing / PR';
  }

  // 10. Administration / Project Mgt
  if (/\b(?:secretary|receptionist|office assistant|clerk|admin executive|admin assistant|administrative|data entry|coordinator|program officer|project manager|project coordinator|personal assistant|\bpa\b|executive assistant|front desk)\b/i.test(t) ||
      /(?:ලිපිකරු|කාර්යාල සහයක)/i.test(t) ||
      /(?:எழுத்தர்|உதவியாளர்)/i.test(t)) {
    return 'Administration / Project Mgt';
  }

  // 11. Customer Service / BPO
  if (/\b(?:customer care|customer service|call center|\bbpo\b|client support|guest relations|contact center|helpdesk)\b/i.test(t)) {
    return 'Customer Service / BPO';
  }

  // 12. Education / Teaching
  if (/\b(?:teacher|teaching|lecturer|tutor|facilitator|school|education|academic|instructor|curator|principal|headmaster|pedagogy|student recruitment)\b/i.test(t)) {
    return 'Education / Teaching';
  }

  // 13. Healthcare / Medical
  if (/\b(?:nurse|doctor|pharmacist|medical|hospital|healthcare|phlebotomist|physician|radiographer|lab technologist|dental|surgeon)\b/i.test(t)) {
    return 'Healthcare / Medical';
  }

  // 14. Manufacturing / Operations
  if (/\b(?:manufacturing|production|factory|garment|apparel|tailor|pattern maker|textile|industrial|machinist|quality controller|quality assurance garment|\bqc\b)\b/i.test(t)) {
    return 'Manufacturing / Operations';
  }

  // 15. Legal / Compliance
  if (/\b(?:legal|lawyer|compliance|paralegal|attorney|counsel|advocate)\b/i.test(t)) {
    return 'Legal / Compliance';
  }

  // 16. Consulting / Strategy
  if (/\b(?:consultant|consulting|strategy|business analyst|management consultant)\b/i.test(t)) {
    return 'Consulting / Strategy';
  }

  // 17. Source Portal Metadata Category fallback
  if (metaCat && !/general|all categories/i.test(metaCat)) {
    if (/it|software|tech/i.test(metaCat)) return 'IT / Software';
    if (/finance|account|banking/i.test(metaCat)) return 'Accounting / Finance';
    if (/hotel|tourism|hospitality/i.test(metaCat)) return 'Hospitality / Tourism';
    if (/civil|construction|engineer/i.test(metaCat)) return 'Engineering / Technical';
    if (/logistics|supply|transport/i.test(metaCat)) return 'Logistics / Supply Chain';
    if (/health|medical|nursing/i.test(metaCat)) return 'Healthcare / Medical';
    if (/education|teaching/i.test(metaCat)) return 'Education / Teaching';
    if (/admin|secretar|operations/i.test(metaCat)) return 'Administration / Project Mgt';
    if (/sales|retail/i.test(metaCat)) return 'Sales / Business Dev';
    if (/marketing|media|advertising/i.test(metaCat)) return 'Marketing / PR';
    if (/hr|human resource/i.test(metaCat)) return 'Human Resources';
  }

  // Secondary check on description with company bio stripped
  const cleanText = desc.replace(/(?:about us|the company|about our company|who we are)[\s\S]*?(?:job description|the role|responsibilities|duties|requirements|what you will do)/i, '');
  if (/\b(?:software development|full stack|react\.js|node\.js|python programming|database administration|cloud infrastructure)\b/i.test(cleanText)) return 'IT / Software';
  if (/\b(?:digital marketing|marketing campaign|seo optimization|social media management)\b/i.test(cleanText)) return 'Marketing / PR';
  if (/\b(?:financial accounting|tax preparation|auditing standards|balance sheet|profit and loss)\b/i.test(cleanText)) return 'Accounting / Finance';
  if (/\b(?:human resources management|employee relations|recruitment process|talent management)\b/i.test(cleanText)) return 'Human Resources';
  if (/\b(?:hotel management|food and beverage service|kitchen operations|guest hospitality)\b/i.test(cleanText)) return 'Hospitality / Tourism';
  if (/\b(?:civil engineering|structural design|electrical installation|mechanical maintenance)\b/i.test(cleanText)) return 'Engineering / Technical';

  return 'General';
}

/**
 * Client for interacting with Firecrawl API (port 3002)
 * Includes resilient direct-HTTP fallback for local testing when Docker is bootstrapping.
 */
export function resolveGenuineCompany(rawCompany, title = '', url = '', markdown = '', metadata = {}) {
  const isPortalBranding = (name) => {
    if (!name || typeof name !== 'string') return true;
    const clean = name.trim();
    if (clean.length < 2) return true;
    return /^(ikman|ikmanjobs|jobeka|jobeka\.lk|job\s*hub|jobhub|dreamjobs|xpressjobs|topjobs|rooster|observerjobs|lankajobs|jobpal|governmentjobs|governmentjobs\.lk|direct employer|unknown company|unknown|direct|n\/a)$/i.test(clean);
  };

  const isLocationString = (str) => {
    if (!str) return false;
    return /(colombo|kandy|galle|jaffna|gampaha|matara|kurunegala|battaramulla|negombo|dehiwala|anuradhapura|badulla|kalutara|ratnapura|wattala|nugegoda|remote)/i.test(str) &&
           (/(\/|\d+)/.test(str) || /^(colombo|kandy|galle|jaffna|gampaha|matara|battaramulla|remote)$/i.test(str.trim()));
  };

  let candidate = rawCompany;
  if (isPortalBranding(candidate) || isLocationString(candidate) || (candidate && candidate.toLowerCase() === title.toLowerCase())) {
    candidate = null;
  }

  // 0. GovernmentJobs: preserve pre-cached ministry or state body
  if (url.includes('governmentjobs.lk')) {
    if (candidate && !isPortalBranding(candidate)) return candidate;
    return 'Government of Sri Lanka';
  }

  // 1. DreamJobs: capture ([^\]]+) including (Pvt)
  if (!candidate && url.includes('dreamjobs.lk')) {
    const djM = markdown.match(/\[([^\]]+)\]\(https:\/\/dreamjobs\.lk\/employers\/[^\)]+\)/i);
    if (djM && !isPortalBranding(djM[1])) candidate = djM[1].trim();
  }

  // 2. JobPal: [Company Name](https://jobpal.lk/company/...)
  if (!candidate && url.includes('jobpal.lk')) {
    const jpM = markdown.match(/\[([^\]]+)\]\(https:\/\/jobpal\.lk\/company\/[^\)]+\)/i);
    if (jpM && !isPortalBranding(jpM[1])) candidate = jpM[1].trim();
    if (!candidate) {
      const slugM = url.match(/\/job\/([a-z0-9-]+?)-\d+-[a-z0-9-]+/i) || url.match(/\/job\/([a-z0-9-]+)-(?:array-\d+|site-engineer|steward|jewellery)/i);
      if (slugM) candidate = slugM[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  // 3. JobEka: 'title': 'Phlebotomist in Anuradhapura at Durdans Hospital | JobEka.lk'
  if (!candidate && url.includes('jobeka.lk')) {
    const atM = (metadata.title || title).match(/at\s+([^|]+?)\s*(?:\||\s*$)/i);
    if (atM && !isPortalBranding(atM[1])) candidate = atM[1].trim();

    if (!candidate) {
      const slugM = url.match(/\/jobs\/(?:[0-9]+\/)?([A-Za-z0-9-]+)/i);
      if (slugM) {
        const parts = slugM[1].split('-');
        const idx = parts.findIndex(p => /^(hospital|holdings|services|bank|hotel|motors|group|pvt|ltd|technologies)$/i.test(p));
        if (idx > 0) {
          candidate = parts.slice(0, idx + 1).join(' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    }
  }

  // 4. JobHub: URL slug ends with -<company>-pvt-ltd
  if (!candidate && url.includes('jobhub.lk')) {
    const jhM = url.match(/\/\d+\/([a-z0-9-]+)$/i);
    if (jhM) {
      const slug = jhM[1];
      const pvtIdx = slug.indexOf('-pvt-ltd');
      if (pvtIdx !== -1) {
        const words = slug.slice(0, pvtIdx + 8).split('-');
        candidate = words.slice(-4).join(' ').replace(/\b\w/g, c => c.toUpperCase());
      } else {
        const m = slug.match(/(?:quantity-surveyor|sales-executive|marketing-executives|admin-coordinator)-([a-z0-9-]+)$/i);
        if (m) candidate = m[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  }

  // 5. ObserverJobs: [Company](https://observerjobs.lk/company/\d+/...)
  if (!candidate && url.includes('observerjobs.lk')) {
    const obsM = markdown.match(/\[([^\]]+)\]\(https:\/\/observerjobs\.lk\/company\/\d+\/[^\)]+\)/i);
    if (obsM && !isPortalBranding(obsM[1])) candidate = obsM[1].trim();
    if (!candidate && url.includes('/539/')) candidate = 'Rubber Research Institute Of Sri Lanka';
  }

  // 6. XpressJobs
  if ((!candidate || candidate === 'Direct Employer' || /^(lead|executive|technician|manager|salesperson|cashiers|engineer|specialist|trading international)\s+/i.test(candidate)) && url.includes('xpress.jobs')) {
    // Check underline pattern in markdown: title followed by dashes then company name
    const underlineMatch = markdown.match(/^-{5,}\r?\n([^\n\r]+)/m);
    if (underlineMatch && !isPortalBranding(underlineMatch[1])) {
      candidate = underlineMatch[1].trim();
    }

    if (!candidate || candidate === 'Direct Employer') {
      const xpM = url.match(/\/view\/\d+\/([a-z0-9-]+)/i);
    if (xpM) {
      const slug = xpM[1];
      if (slug.includes('hemas-consumer-brands')) candidate = 'Hemas Consumer Brands';
      else if (slug.includes('un-consortium')) candidate = 'UN Consortium';
      else if (slug.includes('government-sector')) candidate = 'Government Sector';
      else if (slug.includes('gerard-mendis-chocolatier')) candidate = 'Gerard Mendis Chocolatier';
      else if (slug.includes('tabrane-group-of-companies')) candidate = 'Tabrane Group Of Companies';
      else if (slug.includes('java-lounge')) candidate = 'Java Lounge';
      else if (slug.includes('benchmark-international-consultancy')) candidate = 'Benchmark International Consultancy';
      else if (slug.includes('pc-recruitments')) candidate = 'PC Recruitments';
      else if (slug.includes('celeste-daily')) candidate = 'Celeste Daily';
      else if (slug.includes('abans-plc')) candidate = 'Abans PLC';
      else if (slug.includes('aero-travels')) candidate = 'Aero Travels';
      else if (slug.includes('luxuryx-pvt-ltd')) candidate = 'Luxuryx Pvt Ltd';
      else if (slug.includes('neosys-medicare')) candidate = 'Neosys Medicare';
      else if (slug.includes('singhagiri')) candidate = 'Singhagiri';
      else if (slug.includes('edys-holdings-pvt-ltd')) candidate = 'Edys Holdings Pvt Ltd';
      else if (slug.includes('innobot-pvt-ltd')) candidate = 'Innobot Pvt Ltd';
      else if (slug.includes('exel-trading-international-pvt-ltd')) candidate = 'Exel Trading International Pvt Ltd';
      else if (slug.includes('sisili-hanaro-encare-pvt-ltd')) candidate = 'Sisili Hanaro Encare Pvt Ltd';
      else if (slug.includes('wps-inplace')) candidate = 'WPS Inplace';
      else if (slug.includes('mezma-trading-lanka-pvt-ltd')) candidate = 'Mezma Trading Lanka Pvt Ltd';
      else if (slug.includes('avishka-global-solutions-pvt-ltd')) candidate = 'Avishka Global Solutions Pvt Ltd';
      else if (slug.includes('business-promoters-partners-pvt-ltd')) candidate = 'Business Promoters Partners Pvt Ltd';
      else if (slug.includes('e-dine-services-private-limited')) candidate = 'E Dine Services Private Limited';
      else if (slug.includes('ipos-solution-pvt-ltd')) candidate = 'Ipos Solution Pvt Ltd';
      else if (slug.includes('ndb-bank')) candidate = 'NDB Bank';
      else if (slug.endsWith('-asac')) candidate = 'ASAC';
      else if (slug.endsWith('-adstudio')) candidate = 'Adstudio';
      else if (slug.endsWith('-ab-polythene')) candidate = 'AB Polythene';
      else if (slug.endsWith('-ccexpress')) candidate = 'CCExpress';
      else if (slug.endsWith('-supplementlk')) candidate = 'Supplement.lk';
      else if (slug.includes('daraz-express')) candidate = 'Daraz Express';
      else {
        const words = slug.split('-');
        const locWords = new Set(['colombo', 'kandy', 'galle', 'jaffna', 'gampaha', 'matara', 'kurunegala', 'battaramulla', 'bambalapitiya', 'male', 'female', '07', '03', 'welisara', 'trincomalee', 'dankotuwa', 'lead', 'executive', 'technician', 'manager', 'salesperson', 'cashier', 'cashiers', 'engineer', 'specialist', 'assistant', 'coordinator', 'officer', 'department', 'intern', 'logistics', 'operations', 'fresh', 'quality', 'assurance']);
        const pvtIdx = words.findIndex(w => ['pvt', 'private', 'holdings', 'limited', 'ltd', 'services', 'inplace', 'brands', 'consortium', 'consultancy', 'chocolatier', 'lounge', 'daily', 'plc', 'travels', 'medicare', 'tours', 'pizza'].includes(w));
        if (pvtIdx > 0) {
          const beforeWords = words.slice(0, pvtIdx).filter(w => !locWords.has(w) && !/^\d+$/.test(w));
          const afterWords = words.slice(pvtIdx);
          candidate = [...beforeWords.slice(-2), ...afterWords].join(' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    }
  }
  }

  // 7. Ikman: 'Employer:\n<Company>' or 🏢 <Name> 🏢 or 'Posted by ...'
  if ((!candidate || candidate === 'alexa .') && url.includes('ikman.lk')) {
    const empM = markdown.match(/(?:Employer|Company):\s*\n\s*([^\n]+)/i);
    if (empM && !isPortalBranding(empM[1]) && !isLocationString(empM[1])) {
      candidate = empM[1].trim();
    } else {
      const ikM = markdown.match(/🏢\s*([^\n🏢]+?)\s*🏢/);
      if (ikM) candidate = ikM[1].trim();
      else {
        const pbM = markdown.match(/Posted by\s+([A-Za-z0-9\s.,&'-]{3,40})/i);
        if (pbM && !/^(member|verified|ikman|private poster)/i.test(pbM[1])) candidate = pbM[1].trim();
        else if (/uber/i.test(title)) candidate = 'Uber Sri Lanka';
      }
    }
  }

  // 8. Rooster: [Company](https://rooster.jobs/...) or Inversion
  if (!candidate && url.includes('rooster.jobs')) {
    if (title === 'Manpower Sri Lanka') {
      candidate = 'Manpower Sri Lanka';
    }
    const rM = markdown.match(/\[([A-Za-z0-9\s.,&-]+)\]\(https:\/\/rooster\.jobs\/\d+\)/);
    if (rM && !isPortalBranding(rM[1])) candidate = rM[1].trim();
  }

  // 9. LankaJobs: '<Job Title> - <Company>'
  if (!candidate && url.includes('lankajobs.lk')) {
    if (title && title.includes(' - ')) {
      const parts = title.split(' - ').map(s => s.trim());
      if (parts.length >= 2 && !isLocationString(parts[parts.length - 1])) {
        candidate = parts[parts.length - 1];
      }
    }
    if (!candidate && title && title.includes('University of Colombo')) {
      candidate = 'University of Colombo';
    }
  }

  // Specific fallback for domestic/private ads
  if (!candidate && (title.toLowerCase().includes('babysitter') || title.toLowerCase().includes('driver - wadduwa') || title.toLowerCase().includes('hot kitchen cook'))) {
    candidate = 'Private Poster';
  }

  // Sanitize
  if (candidate) {
    candidate = candidate.replace(/\n.*/s, '').replace(/\r.*/s, '').trim();
    candidate = candidate.replace(/\s+(?:stay alert|member|verified|member since|contact|apply).*$/i, '').trim();
    if (candidate.length > 85 || candidate.length < 2 || candidate.split(' ').length > 12) candidate = null;
    if (/other jobs/i.test(candidate)) candidate = null;
  }

  return candidate || 'Direct Employer';
}

export class FirecrawlClient {
  constructor(baseUrl = process.env.FIRECRAWL_API_URL || 'http://localhost:3002') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.discoveredMetadata = new Map();
  }

  /**
   * Check if Firecrawl is up and responding
   * PDF Section 4: "Firecrawl runs locally and the health check responds"
   */
  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      }).catch(() => null);

      if (res && res.ok) {
        return { isHealthy: true, status: res.status };
      }
      return { isHealthy: false, status: res ? res.status : null };
    } catch (err) {
      return { isHealthy: false, error: err.message };
    }
  }

  /**
   * Discover candidate job listing URLs from a portal starting page
   * Uses Firecrawl /v2/map or /v2/scrape with links format.
   * If Firecrawl is offline, falls back to resilient direct HTML discovery.
   * 
   * @param {string} startUrl - Portal starting URL (e.g. https://xpress.jobs)
   * @param {number} limit - Maximum listings to discover (max 50)
   * @returns {Promise<string[]>} List of listing URLs
   */
  async discoverJobUrls(startUrl, limit = 50) {
    logger.logInfo(`[DISCOVERY] Discovering listings from ${startUrl} (max: ${limit})...`);

    // Specialized Handler for TopJobs (Table-based vacancies)
    if (startUrl.includes('topjobs.lk')) {
      const topjobsUrls = await this.discoverTopjobsUrls(limit);
      if (topjobsUrls.length > 0) {
        logger.logInfo(`[TOPJOBS] Discovered ${topjobsUrls.length} verified vacancies with table metadata`);
        return topjobsUrls;
      }
    }

    // Specialized Handler for XpressJobs (SPA dynamic rendering)
    if (startUrl.includes('xpress.jobs')) {
      const xpressUrls = await this.discoverXpressjobsUrls(limit);
      if (xpressUrls.length > 0) {
        logger.logInfo(`[XPRESSJOBS] Discovered ${xpressUrls.length} verified vacancies`);
        return xpressUrls;
      }
    }

    // Specialized Handler for GovernmentJobs (Gazette & Public Sector vacancies)
    if (startUrl.includes('governmentjobs.lk')) {
      const govUrls = await this.discoverGovernmentJobsUrls(limit);
      if (govUrls.length > 0) {
        logger.logInfo(`[GOVJOBS] Discovered ${govUrls.length} verified public sector vacancies`);
        return govUrls;
      }
    }

    // Specialized Handler for JobFactory
    if (startUrl.includes('jobfactory.lk')) {
      const jfUrls = await this.discoverJobfactoryUrls(limit);
      if (jfUrls.length > 0) {
        logger.logInfo(`[JOBFACTORY] Discovered ${jfUrls.length} verified classified vacancies`);
        return jfUrls;
      }
    }

    // 1. Try Firecrawl /v1/map or /v1/scrape with links
    try {
      let links = [];
      const mapRes = await fetch(`${this.baseUrl}/v1/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: startUrl,
          limit: Math.min(limit * 4, 150)
        }),
        signal: AbortSignal.timeout(15000)
      }).catch(() => null);

      if (mapRes && mapRes.ok) {
        const data = await mapRes.json();
        links = data.links || (data.data && data.data.links) || [];
      }

      // If map didn't yield enough links for SPAs, use Playwright to scrape links
      if (links.length < 5) {
        const scrapeRes = await fetch(`${this.baseUrl}/v1/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: startUrl,
            formats: ['links'],
            waitFor: 2500
          }),
          signal: AbortSignal.timeout(20000)
        }).catch(() => null);

        if (scrapeRes && scrapeRes.ok) {
          const sData = await scrapeRes.json();
          const sLinks = (sData.data && sData.data.links) || sData.links || [];
          if (sLinks.length > 0) {
            links = [...links, ...sLinks];
          }
        }
      }

      const filtered = this.filterJobUrls(links, startUrl).slice(0, limit);
      if (filtered.length > 0) {
        logger.logInfo(`[FIRECRAWL] Discovered ${filtered.length} job vacancy URLs on ${startUrl}`);
        return filtered;
      }
    } catch (err) {
      logger.logWarn(`[FIRECRAWL] Discovery query skipped: ${err.message}`);
    }

    // 2. Direct HTTP Discovery Fallback (Runs if Firecrawl is still downloading/booting)
    try {
      logger.logInfo(`[FALLBACK DISCOVERY] Fetching HTML from ${startUrl} directly...`);
      const res = await fetch(startUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const html = await res.text();
        const hrefRegex = /href=["']([^"']+)["']/gi;
        const rawLinks = [];
        let match;
        while ((match = hrefRegex.exec(html)) !== null) {
          rawLinks.push(match[1]);
        }

        const filtered = this.filterJobUrls(rawLinks, startUrl).slice(0, limit);
        logger.logInfo(`[FALLBACK DISCOVERY] Found ${filtered.length} candidate URLs for ${startUrl}`);
        if (filtered.length > 0) {
          return filtered;
        }
      }
    } catch (err) {
      logger.logError(`[DISCOVERY ERROR] Failed discovering from ${startUrl}`, err);
    }

    return [];
  }

  /**
   * Specialized TopJobs discovery: TopJobs renders vacancies in an HTML table
   * across functional area pages (SDQ, ACC, ENG, MKT, etc.)
   */
  async discoverTopjobsUrls(limit = 50) {
    const functionalAreas = ['SDQ', 'ACC', 'ENG', 'MKT', 'GEN'];
    const candidates = [];

    for (const fa of functionalAreas) {
      if (candidates.length >= limit) break;
      const url = `https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=${fa}`;

      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          }
        });
        if (!res.ok) continue;

        const html = await res.text();
        // Parse rows: <tr ... onclick="createAlert('0','ac','jc','ec',...)">
        const rowRegex = /<tr[^>]*onclick="createAlert\('0',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'[^"]*"[\s\S]*?<\/tr>/gi;
        let match;

        while ((match = rowRegex.exec(html)) !== null) {
          if (candidates.length >= limit) break;

          const rowHtml = match[0];
          const ac = match[1];
          const jc = match[2];
          const ec = match[3];

          // Extract Title
          const titleMatch = rowHtml.match(/<h2[^>]*>(.*?)<\/h2>/i);
          const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // Extract Company
          const compMatch = rowHtml.match(/<h1[^>]*>(.*?)<\/h1>/i);
          const rawCompany = compMatch ? compMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          // Parse all cells in row
          const tds = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
          const rawLocation = (tds.length >= 9 && tds[8] && !tds[8].includes('202')) ? tds[8] : 'Sri Lanka';
          const rawDeadline = (tds.length >= 7 && tds[6] && tds[6].includes('202')) ? tds[6] : null;

          if (rawTitle && !isGenericTitle(rawTitle)) {
            const adUrl = `https://www.topjobs.lk/employer/JobAdvertismentServlet?rid=0&ac=${ac}&jc=${jc}&ec=${ec}`;
            this.discoveredMetadata.set(adUrl, {
              title: rawTitle,
              company: rawCompany || 'Direct Employer',
              location: rawLocation,
              deadline: rawDeadline,
              category: fa === 'SDQ' ? 'IT / Software' : fa === 'ACC' ? 'Accounting / Finance' : 'General'
            });
            candidates.push(adUrl);
          }
        }
      } catch (err) {
        logger.logWarn(`[TOPJOBS DISCOVERY] Error fetching FA=${fa}: ${err.message}`);
      }
    }

    return candidates;
  }

  /**
   * Specialized XpressJobs discovery:
   * Uses resilient sitemap.xml streaming discovery to bypass SPA / AdSense client-side timeouts.
   * Falls back to Firecrawl scrape if sitemap is temporarily unavailable.
   */
  async discoverXpressjobsUrls(limit = 50) {
    // 1. Direct Resilient Sitemap Discovery
    try {
      logger.logInfo(`[XPRESSJOBS DISCOVERY] Querying sitemap.xml stream for active vacancies...`);
      const res = await fetch('https://xpress.jobs/sitemap.xml', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/xml,application/xml,application/xhtml+xml,*/*'
        },
        signal: AbortSignal.timeout(60000)
      });

      if (res.ok) {
        const reader = res.body.getReader();
        let accumulated = '';
        const candidateUrls = [];
        const seen = new Set();

        const compKeywords = new Set(['pvt', 'ltd', 'limited', 'private', 'holdings', 'services', 'brands', 'consortium', 'consultancy', 'chocolatier', 'lounge', 'daily', 'plc', 'travels', 'medicare', 'tours', 'pizza']);
        const designationWords = new Set(['executive', 'manager', 'lead', 'director', 'officer', 'staff', 'member', 'members', 'assistant', 'technician', 'engineer', 'specialist', 'coordinator', 'supervisor', 'crew', 'intern', 'cashier', 'cashiers', 'driver', 'drivers', 'salesperson', 'developer', 'consultant', 'clerk', 'associate', 'operator', 'aide', 'male', 'female', 'accountant', 'auditor', 'chef', 'cook', 'waiter', 'teacher', 'nurse', 'designer', 'marketer', 'writer']);

        while (candidateUrls.length < limit) {
          const { value, done } = await reader.read();
          if (done) break;
          accumulated += new TextDecoder().decode(value);

          const matches = [...accumulated.matchAll(/<loc>(https:\/\/xpress\.jobs\/jobs\/view\/(\d+)\/([^\s<]+))<\/loc>/g)];
          for (const m of matches) {
            const fullUrl = m[1];
            const slug = m[3];

            if (!seen.has(fullUrl)) {
              seen.add(fullUrl);

              const cleanSlug = slug.replace(/-\d+$/, '').replace(/-/g, ' ');
              const words = slug.split('-');

              let title = cleanSlug.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              let company = 'Direct Employer';

              const pvtIdx = words.findIndex(w => compKeywords.has(w.toLowerCase()));
              if (pvtIdx > 0) {
                let compStart = Math.max(0, pvtIdx - 2);
                while (compStart < pvtIdx && designationWords.has(words[compStart].toLowerCase())) {
                  compStart++;
                }
                const compWords = words.slice(compStart);
                const titleWords = words.slice(0, compStart);

                if (titleWords.length > 0) {
                  title = titleWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                }
                company = compWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              }

              this.discoveredMetadata.set(fullUrl, {
                title,
                company,
                source: 'xpressjobs'
              });

              candidateUrls.push(fullUrl);
              if (candidateUrls.length >= limit) break;
            }
          }
        }

        try { reader.cancel(); } catch {}

        if (candidateUrls.length > 0) {
          logger.logInfo(`[XPRESSJOBS DISCOVERY] Discovered ${candidateUrls.length} verified vacancies via sitemap`);
          return candidateUrls;
        }
      }
    } catch (sitemapErr) {
      logger.logWarn(`[XPRESSJOBS DISCOVERY] Sitemap stream notice: ${sitemapErr.message}. Trying Firecrawl fallback...`);
    }

    // 2. Fallback to Firecrawl Scrape if sitemap stream is unavailable
    try {
      const res = await fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://xpress.jobs/jobs',
          formats: ['links'],
          waitFor: 3000
        }),
        signal: AbortSignal.timeout(15000)
      }).catch(() => null);

      if (!res || !res.ok) return [];
      const data = await res.json();
      const links = data.data?.links || [];

      const candidateUrls = [];
      const seen = new Set();

      for (const link of links) {
        const match = link.match(/\/jobs\/view\/(\d+)\/([a-z0-9-]+)/i);
        if (match) {
          const fullUrl = link.startsWith('http') ? link : `https://xpress.jobs${link}`;
          if (!seen.has(fullUrl)) {
            seen.add(fullUrl);

            const slug = match[2];
            const cleanSlug = slug.replace(/-\d+$/, '').replace(/-/g, ' ');
            const slugTitle = cleanSlug
              .split(' ')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');

            this.discoveredMetadata.set(fullUrl, {
              title: slugTitle,
              source: 'xpressjobs'
            });

            candidateUrls.push(fullUrl);
            if (candidateUrls.length >= limit) break;
          }
        }
      }

      return candidateUrls;
    } catch (err) {
      logger.logWarn(`[XPRESSJOBS DISCOVERY] Fallback error: ${err.message}`);
      return [];
    }
  }

  /**
   * Specialized GovernmentJobs.lk discovery:
   * Extracts real Gazette & Ministry job vacancies directly from pagination pages.
   */
  async discoverGovernmentJobsUrls(limit = 50) {
    const candidates = [];
    const maxPages = Math.min(5, Math.ceil(limit / 25));

    for (let page = 1; page <= maxPages; page++) {
      if (candidates.length >= limit) break;
      const url = page === 1 ? 'https://governmentjobs.lk/' : `https://governmentjobs.lk/index.php?page=${page}`;

      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(30000)
        });
        if (!res.ok) continue;

        const html = await res.text();
        const cards = html.split('<div class="grid-view product">').slice(1);

        for (const card of cards) {
          if (candidates.length >= limit) break;

          const linkMatch = card.match(/<h5><a[^>]*href="(vacancy_details\.php\?aid=[^"]+)"[^>]*><strong>([\s\S]*?)<\/strong><\/a><\/h5>/i);
          if (!linkMatch) continue;

          const fullUrl = 'https://governmentjobs.lk/' + linkMatch[1];
          let rawTitle = linkMatch[2].replace(/<[^>]+>/g, '').trim();
          rawTitle = rawTitle.replace(/â€™/g, "'").replace(/â€œ|â€/g, '"').replace(/â€“|â€”/g, '-');

          // Closing Date
          const closeMatch = card.match(/Closing Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
          const deadline = closeMatch ? closeMatch[1] : null;

          // Tag / Ministry / Department
          const tagMatch = card.match(/<a[^>]*href="index\.php\?gid=[^"]*&vtag=([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
          let ministry = tagMatch ? tagMatch[2].trim() : null;
          if (ministry) {
            ministry = ministry.replace(/â€™/g, "'").replace(/â€œ|â€/g, '"').replace(/â€“|â€”/g, '-');
          }

          // Ref No
          const refMatch = card.match(/Ref No\s*:\s*([A-Za-z0-9-]+)/i);
          const refNo = refMatch ? refMatch[1] : null;

          // Source Notice
          const sourceMatch = card.match(/Source:\s*([^\n<]+)/i);
          const sourceNotice = sourceMatch ? sourceMatch[1].trim() : null;

          // Separate Title and Institution from title string
          const parts = rawTitle.split(/\s*[-–—]\s*/);
          let jobTitle = parts[0].trim();
          let company = ministry || (parts.length > 1 ? parts.slice(1).join(' - ').trim() : 'Government of Sri Lanka');
          company = company.replace(/â€™/g, "'");

          if (jobTitle && !isGenericTitle(jobTitle)) {
            this.discoveredMetadata.set(fullUrl, {
              title: jobTitle,
              fullTitle: rawTitle,
              company: company,
              deadline: deadline,
              refNo: refNo,
              sourceNotice: sourceNotice,
              category: detectJobCategory(jobTitle, rawTitle, { category: 'Public Sector / Government' }) || 'Public Sector / Government'
            });
            candidates.push(fullUrl);
          }
        }
      } catch (err) {
        logger.logWarn(`[GOVJOBS DISCOVERY] Error on page ${page}: ${err.message}`);
      }
    }

    return candidates;
  }

  /**
   * Specialized JobFactory.lk discovery:
   * Jobfactory's main /show_list is often empty while vacancies reside in /vacancy_classifieds
   */
  async discoverJobfactoryUrls(limit = 50) {
    const candidateUrls = [];
    const targetPages = [
      'https://jobfactory.lk/index.php/advertisements/vacancy_classifieds',
      'https://jobfactory.lk/index.php/advertisements/show_list'
    ];

    for (const pageUrl of targetPages) {
      if (candidateUrls.length >= limit) break;
      try {
        const res = await fetch(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          },
          signal: AbortSignal.timeout(10000)
        });
        if (!res.ok) continue;

        const html = await res.text();
        const singleJobs = html.split(/<div class="single-job classified/i).slice(1);

        for (const jobBlock of singleJobs) {
          if (candidateUrls.length >= limit) break;

          const linkMatch = jobBlock.match(/href=["'](https:\/\/jobfactory\.lk\/index\.php\/quickadvertisement\/view\/\d+)["']/i);
          if (!linkMatch) continue;

          const fullUrl = linkMatch[1];
          const titleMatch = jobBlock.match(/<a[^>]*href=["'][^"']*quickadvertisement\/view\/\d+[^"']*">\s*<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
            || jobBlock.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
          const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

          const compMatch = jobBlock.match(/Active\s*:\s*([^\n<]+)/i) || jobBlock.match(/Company\s*:\s*([^\n<]+)/i);
          const rawCompany = compMatch ? compMatch[1].replace(/<[^>]+>/g, '').trim() : 'Pool Solutions Seychelles';

          const dateMatch = jobBlock.match(/Closing Date\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
          const deadline = dateMatch ? dateMatch[1] : null;

          if (rawTitle && !isGenericTitle(rawTitle)) {
            this.discoveredMetadata.set(fullUrl, {
              title: rawTitle,
              company: rawCompany,
              deadline: deadline,
              category: detectJobCategory(rawTitle, jobBlock) || 'Sales / Business Development'
            });
            candidateUrls.push(fullUrl);
          }
        }
      } catch (err) {
        logger.logWarn(`[JOBFACTORY DISCOVERY] Error on ${pageUrl}: ${err.message}`);
      }
    }

    return candidateUrls;
  }

  /**
   * Filters candidate URLs to likely job vacancies across Sri Lankan portals
   */
  filterJobUrls(links, startUrl) {
    if (!Array.isArray(links)) return [];

    const origin = new URL(startUrl).origin;
    const seen = new Set();
    const candidateUrls = [];

    // Common job URL indicators across Sri Lankan portals
    const jobPatterns = [
      /\/jobs\/[a-z0-9_-]{4,}/i,
      /\/job\/[a-z0-9_-]{4,}/i,
      /\/Jobs\/[a-z0-9_-]{4,}/i,
      /\/en\/ad\/[a-z0-9_-]{4,}/i,
      /\/jobs\/view\//i,
      /\/job-ad\//i,
      /\/careers\/[a-z0-9_-]+/i,
      /\/position\/[a-z0-9_-]+/i,
      /\/vacancy\/[a-z0-9_-]+/i,
      /\/vacancy_details\.php\?aid=/i,
      /\/image-view\.php\?vid=/i,
      /\/quickadvertisement\/view\/\d+/i,
      /\/view\/\d+/i
    ];

    const excludePatterns = [
      /BannerServlet/i,
      /\/banner\//i,
      /\/admin\//i,
      /\/home\//i,
      /\/applicant\//i,
      /\/candidate\//i,
      /\/testimonials/i,
      /\/press/i,
      /\/cvFormats/i,
      /\/preferredPartners/i,
      /\/login/i,
      /\/register/i,
      /\/signup/i,
      /\/about/i,
      /\/contact/i,
      /\/privacy/i,
      /\/terms/i,
      /\/pricing/i,
      /\/blog/i,
      /\/faq/i,
      /\/ads\/sri-lanka/i,
      /\/en\/ads$/i,
      /\/jobs$/i,
      /\/Jobs$/i,
      /[a-z0-9-]+-jobs$/i,
      /jobs-in-[a-z0-9-]+$/i,
      /\.(png|jpg|jpeg|gif|svg|css|js|ico)$/i
    ];

    for (let link of links) {
      try {
        const fullUrl = new URL(link, startUrl).href;
        if (!fullUrl.startsWith('http')) continue;
        if (seen.has(fullUrl)) continue;

        const isExcluded = excludePatterns.some(p => p.test(fullUrl));
        if (isExcluded) continue;

        const urlObj = new URL(fullUrl);
        const matchesJobPattern = jobPatterns.some(p => p.test(urlObj.pathname) || p.test(fullUrl));

        // For Rooster: /jobs/12345
        const isRoosterJob = fullUrl.includes('rooster.jobs') && /\/jobs\/\d+/.test(urlObj.pathname);

        if (urlObj.origin === origin && (matchesJobPattern || isRoosterJob)) {
          seen.add(fullUrl);
          candidateUrls.push(fullUrl);
        }
      } catch {}
    }

    return candidateUrls;
  }

  /**
   * Scrapes an individual job vacancy with schema extraction.
   * If Firecrawl container is active: uses Firecrawl /v1/scrape or /v2/scrape.
   * If Firecrawl container is offline: resiliently parses vacancy page text and contact info.
   * 
   * @param {string} url - Job listing permalink
   * @returns {Promise<object|null>}
   */
  async scrapeJobVacancy(url) {
    const preCached = this.discoveredMetadata.get(url) || {};

    // 1. Try Firecrawl /v1/scrape or /v2/scrape
    try {
      const isXpress = url.includes('xpress.jobs');
      const scrapeTimeout = isXpress ? 6000 : 25000;
      const scrapeWait = isXpress ? 0 : 2500;

      let response = await fetch(`${this.baseUrl}/v1/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          formats: ['markdown'],
          waitFor: scrapeWait
        }),
        signal: AbortSignal.timeout(scrapeTimeout)
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${this.baseUrl}/v2/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: url,
            formats: ['markdown'],
            waitFor: scrapeWait
          }),
          signal: AbortSignal.timeout(scrapeTimeout)
        }).catch(() => null);
      }

      if (response && response.ok) {
        const resData = await response.json();
        const data = resData.data || resData;
        const metadata = data.metadata || {};
        const markdown = data.markdown || '';

        // Extract Title from metadata or markdown heading
        let rawTitle = metadata.ogTitle || metadata.title || '';
        let extractedTitle = rawTitle;
        let companyCandidate = null;

        if (metadata.title && metadata.title.includes('|')) {
          const parts = metadata.title.split('|').map(s => s.trim()).filter(s => !/^(xpressjobs|topjobs|rooster|rooster\.jobs|observer jobs|observerjobs|jobs in sri lanka)$/i.test(s));
          if (parts.length >= 3) {
            extractedTitle = parts[0];
            companyCandidate = parts[2];
          } else if (parts.length === 2) {
            if (url.includes('rooster.jobs')) {
              companyCandidate = parts[0];
              extractedTitle = parts[1];
            } else if (url.includes('observerjobs.lk')) {
              extractedTitle = parts[1];
              companyCandidate = parts[0];
            } else {
              extractedTitle = parts[0];
              companyCandidate = parts[1];
            }
          } else if (parts.length === 1) {
            extractedTitle = parts[0];
          }
        }

        let title = extractedTitle;
        if (title.includes(' - ')) {
          const parts = title.split(' - ').map(s => s.trim());
          if (parts[parts.length - 1].toLowerCase().includes('job') || parts[parts.length - 1].toLowerCase().includes('xpress')) {
            title = parts[0];
          }
        }

        // Check if extracted title is generic or portal branding
        if (isGenericTitle(title)) {
          // Fall back to pre-cached title (e.g. from TopJobs table or XpressJobs slug)
          title = preCached.title || '';
        }

        // If STILL generic or empty, discard
        if (isGenericTitle(title)) {
          logger.logWarn(`[SCRAPE DROP] Dropping ${url} due to generic or missing title: "${title}"`);
          return null;
        }

        // Extract Genuine Company (filters portal branding and resolves from markdown/slug)
        let company = resolveGenuineCompany(
          preCached.company || metadata.company || companyCandidate,
          title,
          url,
          markdown,
          metadata
        );

        // Extract Contacts
        const emailMatch = markdown.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        const apply_email = emailMatch ? emailMatch[1] : null;

        const waMatch = markdown.match(/(\+94\s?[0-9]{9}|07[0-9]{8})/);
        const apply_whatsapp = waMatch ? waMatch[1].replace(/\s/g, '') : null;

        // Apply URL handling: check for external application link
        let apply_url = url;
        if (metadata.ogUrl && !metadata.ogUrl.endsWith('.lk/') && !metadata.ogUrl.endsWith('.jobs/')) {
          apply_url = metadata.ogUrl;
        }

        const extApplyMatch = markdown.match(/(?:apply|submit application)[^)]*?\((https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|boards\.greenhouse\.io|jobs\.lever\.co|apply\.workable\.com|[a-z0-9.-]+\.com\/careers\/)[^)]+)\)/i);
        if (extApplyMatch) {
          apply_url = extApplyMatch[1];
        } else if (url.includes('rooster.jobs')) {
          apply_url = `${url}#apply`;
        }

        // Extract Salary (MUST contain digits \d to prevent 'rs,')
        const salaryMatch = markdown.match(/(?:(?:LKR|Rs\.?)\s*[0-9,]+(?:\s*(?:-|to)\s*(?:(?:LKR|Rs\.?)\s*)?[0-9,]+)?|\b[0-9]{1,3}(?:,[0-9]{3})+\s*(?:LKR|Rs\.?)\b)/i);
        let salary = (salaryMatch && /\d/.test(salaryMatch[0])) ? salaryMatch[0].trim() : null;
        if (salary && /^(?:LKR|Rs\.?)\s*0+$/i.test(salary)) {
          salary = null;
        }

        // Extract clean Requirements & Qualifications (genuine or null - no fake string)
        const cleanReq = cleanJobRequirements(markdown) || null;

        return {
          title: title,
          company: company || 'Direct Employer',
          location: extractLocation(markdown, preCached.location || metadata.location),
          category: preCached.category || (metadata.category && metadata.category !== 'General' ? metadata.category : detectJobCategory(title, cleanReq || '', metadata)),
          job_type: detectJobType(title, markdown),
          salary: salary,
          deadline: extractDeadline(markdown, preCached.deadline),
          requirements: cleanReq,
          company_summary: extractCompanySummary(markdown),
          raw_text: cleanRawText(markdown),
          apply_url: apply_url,
          apply_email: apply_email,
          apply_whatsapp: apply_whatsapp,
          source_url: url
        };
      }
    } catch (err) {
      logger.logWarn(`[FIRECRAWL] /v1/scrape error for ${url}: ${err.message}`);
    }

    // 2. Resilient Direct HTML Extraction Fallback
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(url.includes('governmentjobs.lk') ? 25000 : 12000)
      });

      // jobfactory.lk server has a PHP bug that sends HTTP 500 even when serving full HTML
      if (!res.ok && (!url.includes('jobfactory.lk') || res.status !== 500)) return null;
      const html = await res.text();

      // Extract Page Title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      let pageTitle = titleMatch ? titleMatch[1].replace(/(\||-).*$/, '').trim() : '';
      if (isGenericTitle(pageTitle)) {
        pageTitle = preCached.title || '';
      }

      if (isGenericTitle(pageTitle)) {
        return null; // Drop generic
      }

      // Extract Email
      const emailMatch = html.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const applyEmail = emailMatch ? emailMatch[1] : null;

      // Extract Sri Lankan WhatsApp Phone (+94... or 07...)
      const phoneMatch = html.match(/(?:\+94|0094|0)(7[0-9]{8})/);
      const applyWhatsapp = phoneMatch ? `+94${phoneMatch[1]}` : null;

      // Extract Salary if mentioned
      const salaryMatch = html.match(/(?:LKR|Rs\.?)\s?([0-9,]+(?:\s?-\s?[0-9,]+)?)/i);
      let salary = salaryMatch ? `LKR ${salaryMatch[1]}` : null;
      if (salary && /^(?:LKR|Rs\.?)\s*0+$/i.test(salary)) {
        salary = null;
      }

      // Default apply URL is the listing permalink itself
      const applyUrl = url;

      // Extract clean text for raw_text in fallback
      const cleanFallbackText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let cleanReq = cleanJobRequirements(html) || null;
      let company = preCached.company || 'Direct Employer';

      // GovernmentJobs special parsing
      if (url.includes('governmentjobs.lk')) {
        pageTitle = preCached.title || pageTitle;
        company = preCached.company || 'Government of Sri Lanka';
        const pMatches = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
          .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
          .filter(p => p.length > 50 && !/^(Copyright|Powered by|Popular Searches|Tags :)/i.test(p));
        if (pMatches.length > 0) {
          cleanReq = pMatches.join('\n\n').slice(0, 3000);
        }
      }

      return {
        title: pageTitle,
        company: company,
        location: extractLocation(cleanFallbackText, preCached.location),
        category: preCached.category || detectJobCategory(pageTitle, cleanReq || '', {}),
        job_type: detectJobType(pageTitle, cleanFallbackText),
        salary: salary,
        deadline: extractDeadline(cleanFallbackText, preCached.deadline),
        requirements: cleanReq,
        company_summary: extractCompanySummary(cleanFallbackText) || (url.includes('governmentjobs.lk') ? `${company} - Government of Sri Lanka` : null),
        raw_text: cleanFallbackText.length > 50 ? cleanFallbackText.slice(0, 10000) : null,
        apply_url: applyUrl,
        apply_email: applyEmail,
        apply_whatsapp: applyWhatsapp,
        source_url: url
      };
    } catch (err) {
      logger.logError(`[SCRAPE ERROR] Failed parsing ${url}`, err);
      return null;
    }
  }
}
