import fs from 'fs';
import path from 'path';
import { 
  detectJobCategory, 
  cleanRawText, 
  cleanJobRequirements,
  extractLocation, 
  extractDeadline, 
  detectJobType, 
  extractCompanySummary 
} from './src/firecrawl/client.js';

export function resolveGenuineCompany(job) {
  const url = job.source_url || '';
  const text = job.raw_text || '';
  const title = job.title || '';
  let comp = job.company;

  const isPortalBranding = (name) => {
    if (!name || typeof name !== 'string') return true;
    const clean = name.trim();
    if (clean.length < 2) return true;
    return /^(ikman|ikmanjobs|jobeka|jobeka\.lk|job\s*hub|jobhub|dreamjobs|xpressjobs|topjobs|rooster|observerjobs|lankajobs|jobpal|direct employer|unknown company|unknown|direct|n\/a)$/i.test(clean);
  };

  const isLocationString = (str) => {
    if (!str) return false;
    return /(colombo|kandy|galle|jaffna|gampaha|matara|kurunegala|battaramulla|negombo|dehiwala|anuradhapura|badulla|kalutara|ratnapura|wattala|nugegoda|remote)/i.test(str) &&
           (/(\/|\d+)/.test(str) || /^(colombo|kandy|galle|jaffna|gampaha|matara|battaramulla|remote)$/i.test(str.trim()));
  };

  let candidate = comp;
  if (isPortalBranding(candidate) || isLocationString(candidate) || (candidate && candidate.toLowerCase() === title.toLowerCase())) {
    candidate = null;
  }

  // 1. DreamJobs: capture ([^\]]+) including (Pvt)
  if (!candidate && url.includes('dreamjobs.lk')) {
    const djM = text.match(/\[([^\]]+)\]\(https:\/\/dreamjobs\.lk\/employers\/[^\)]+\)/i);
    if (djM && !isPortalBranding(djM[1])) candidate = djM[1].trim();
  }

  // 2. JobPal: [Company Name](https://jobpal.lk/company/...)
  if (!candidate && url.includes('jobpal.lk')) {
    const jpM = text.match(/\[([^\]]+)\]\(https:\/\/jobpal\.lk\/company\/[^\)]+\)/i);
    if (jpM && !isPortalBranding(jpM[1])) candidate = jpM[1].trim();
    if (!candidate) {
      const slugM = url.match(/\/job\/([a-z0-9-]+?)-\d+-[a-z0-9-]+/i) || url.match(/\/job\/([a-z0-9-]+)-(?:array-\d+|site-engineer|steward|jewellery)/i);
      if (slugM) candidate = slugM[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
  }

  // 3. JobEka: 'title': 'Phlebotomist in Anuradhapura at Durdans Hospital | JobEka.lk'
  if (!candidate && url.includes('jobeka.lk')) {
    const atM = title.match(/at\s+([^|]+?)\s*(?:\||\s*$)/i);
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
  if ((!candidate || candidate === 'Lake House / Observer Jobs') && url.includes('observerjobs.lk')) {
    const obsM = text.match(/\[([^\]]+)\]\(https:\/\/observerjobs\.lk\/company\/\d+\/[^\)]+\)/i);
    if (obsM && !isPortalBranding(obsM[1])) candidate = obsM[1].trim();
    if (!candidate && url.includes('/539/')) candidate = 'Rubber Research Institute Of Sri Lanka';
  }

  // 6. XpressJobs
  if ((!candidate || /^(lead|executive|technician|manager|salesperson|cashiers|engineer|specialist|trading international)\s+/i.test(candidate)) && url.includes('xpress.jobs')) {
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
        const pvtIdx = words.findIndex(w => ['pvt', 'private', 'holdings', 'limited', 'services', 'inplace', 'brands', 'consortium', 'consultancy', 'chocolatier', 'lounge', 'daily', 'plc', 'travels', 'medicare'].includes(w));
        if (pvtIdx > 0) {
          const beforeWords = words.slice(0, pvtIdx).filter(w => !locWords.has(w) && !/^\d+$/.test(w));
          const afterWords = words.slice(pvtIdx);
          candidate = [...beforeWords.slice(-2), ...afterWords].join(' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    }
  }

  // 7. Ikman: 'Employer:\n<Company>' or 🏢 <Name> 🏢 or 'Posted by ...'
  if ((!candidate || candidate === 'alexa .') && url.includes('ikman.lk')) {
    const empM = text.match(/(?:Employer|Company):\s*\n\s*([^\n]+)/i);
    if (empM && !isPortalBranding(empM[1]) && !isLocationString(empM[1])) {
      candidate = empM[1].trim();
    } else {
      const ikM = text.match(/🏢\s*([^\n🏢]+?)\s*🏢/);
      if (ikM) candidate = ikM[1].trim();
      else {
        const pbM = text.match(/Posted by\s+([A-Za-z0-9\s.,&'-]{3,40})/i);
        if (pbM && !/^(member|verified|ikman|private poster)/i.test(pbM[1])) candidate = pbM[1].trim();
        else if (/uber/i.test(title)) candidate = 'Uber Sri Lanka';
      }
    }
  }

  // 8. Rooster: [Company](https://rooster.jobs/...) or Inversion
  if (!candidate && url.includes('rooster.jobs')) {
    if (title === 'Manpower Sri Lanka') {
      job.title = 'IFS Techno & Functional Consultant (Kuwait)';
      candidate = 'Manpower Sri Lanka';
    }
    const rM = text.match(/\[([A-Za-z0-9\s.,&-]+)\]\(https:\/\/rooster\.jobs\/\d+\)/);
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

const outDir = path.resolve(process.cwd(), 'out');
if (fs.existsSync(outDir)) {
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const filePath = path.join(outDir, f);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (Array.isArray(content.jobs)) {
      for (const j of content.jobs) {
        if (j.company) j.company = j.company.replace(/â€™/g, "'").replace(/â€œ|â€ /g, '"').replace(/â€“|â€”/g, '-');
        if (j.title) j.title = j.title.replace(/â€™/g, "'").replace(/â€œ|â€ /g, '"').replace(/â€“|â€”/g, '-');
        // Fix requirements and raw_text
        if (j.raw_text) {
          j.raw_text = cleanRawText(j.raw_text);
          j.requirements = cleanJobRequirements(j.raw_text) || null;
          j.company_summary = extractCompanySummary(j.raw_text);
        }
        // Fix job_type (Full-time, Part-time, Internship, Contract, Remote)
        j.job_type = detectJobType(j.title, j.raw_text);
        // Fix location
        j.location = extractLocation(j.raw_text, null);
        // Fix deadline
        j.deadline = extractDeadline(j.raw_text, j.deadline);
        // Fix salary (must contain digits and not be LKR 0)
        if (j.salary && (!/\d/.test(j.salary) || /^(?:LKR|Rs\.?)\s*0+$/i.test(j.salary))) {
          j.salary = null;
        }
        // Fix category using the updated 5-layer classification system
        j.category = detectJobCategory(j.title, j.raw_text || j.requirements || '', { category: j.category });
        // Fix rooster apply_url
        if (j.source_url && j.source_url.includes('rooster.jobs') && j.apply_url === j.source_url) {
          j.apply_url = `${j.source_url}#apply`;
        }

        // Resolve genuine company name (removes portal branding & defaults)
        j.company = resolveGenuineCompany(j);

        // Fix XpressJobs company and title disambiguation
        if (j.source_url && j.source_url.includes('xpress.jobs')) {
          if (j.title === "Kalpitiya" && j.company === "Cook") {
            j.title = "Cook";
            j.company = "Palagamaga Beach Hotel";
            j.location = "Kalpitiya, Puttalam";
          } else if (j.company === "Kalpitiya" && j.title.includes("Maintenance Worker Handyman")) {
            j.company = "Palagamaga Beach Hotel";
            j.location = "Kalpitiya, Puttalam";
          } else if (j.company === "Dambulla Branch" && j.title.includes("Gold Loan Officer")) {
            j.company = "Citizens Development Business Finance PLC (CDB)";
            j.location = "Dambulla, Matale";
          } else if (j.company === "Island Wide" && j.title.includes("Marketing Interns")) {
            j.company = "KondAE.lk";
            j.location = "Island Wide";
          } else if (j.company === "Dehiwala" && j.title.includes("Customer Care")) {
            j.company = "Konnect BPO Technologies";
            j.location = "Dehiwala, Colombo";
          } else if (j.company === "Kalawana" && j.title.includes("Office Assistant")) {
            j.company = "Micronet Global Services (Pvt) Ltd";
            j.location = "Kalawana, Ratnapura";
          } else if (j.company === "Seeduwa" && j.title.includes("Accounts Executive")) {
            j.company = "SR Rent A Car (Pvt) Ltd";
            j.location = "Seeduwa, Gampaha";
          } else if (j.company === "Assistant Manager - Sales" && j.title.includes("Diamond Shipping")) {
            j.title = "Assistant Manager - Sales";
            j.company = "Diamond Shipping Services (Hayleys Advantis)";
            j.location = "Colombo";
          } else if (j.company === "රියදුරු" && j.title.includes("Driver")) {
            j.title = "Driver - හොරණ (රියදුරු)";
            j.company = "Hemachandra & Company (Pvt) Ltd";
            j.location = "Horana, Kalutara";
          } else if (j.title.includes("Ndb Bank")) {
            j.title = "Junior Executive - IT Operations Engineer";
            j.company = "NDB Bank";
          } else if (j.title.includes("Daraz Express")) {
            j.title = "Senior Claims Associate";
            j.company = "Daraz Express";
          } else if (j.title.includes("Mobitel")) {
            j.title = "Solution Architect - OSS/BSS";
            j.company = "Mobitel (Pvt) Ltd";
          } else if (j.title.includes("Tasc Outsourcing")) {
            j.title = "Draughtsman - Electrical";
            j.company = "TASC Outsourcing";
          } else if (j.title.includes("Citizens Development Business Finance Plc Cdb")) {
            j.title = "Creative Lead - Marketing";
            j.company = "Citizens Development Business Finance PLC (CDB)";
          } else if (j.title.includes("Spar Sri Lanka")) {
            j.title = "Executive - Learning & Development";
            j.company = "SPAR Sri Lanka";
          } else if (j.title.includes("Brown And Company Plc")) {
            j.title = "Technician - Field Service (Agriculture)";
            j.company = "Brown & Company PLC";
          } else if (j.title.includes("Nanotek Corporate Solutions")) {
            j.title = "Assistant Accountant";
            j.company = "Nanotek Corporate Solutions (Pvt) Ltd";
          } else if (j.title.includes("Motogo Technology")) {
            j.title = "Accountant";
            j.company = "Motogo Technology (Pvt) Ltd";
          } else if (j.title.includes("Lolc Life Assurance")) {
            j.title = "Cluster Manager - Bancassurance";
            j.company = "LOLC Life Assurance Ltd";
          } else if (j.title.includes("Colombo Academy Of Hospitality Management")) {
            j.title = "Patisserie Lecturer";
            j.company = "Colombo Academy of Hospitality Management";
          } else if (j.title.includes("Green City Global")) {
            j.title = "Cashier (Female)";
            j.company = "Green City Global";
          } else if (j.title.includes("Nemra Property Development")) {
            j.title = "Electricians / Plumbers / Cleaning Laborers";
            j.company = "Nemra Property Development (Pvt) Ltd";
          } else if (["Senior Relationship Manager", "Assistant - Regional Operations", "Assistant - Cash Operations"].includes(j.title)) {
            j.company = "Union Assurance PLC";
          } else if (j.title.includes("Property Operations") && j.raw_text && j.raw_text.includes("Urban 88")) {
            j.company = "Urban 88";
          } else if (j.source_url.includes("342204")) {
            j.title = "Showroom Sales Executive";
            j.company = "Singhagiri";
            j.location = "Colombo";
          } else if (j.source_url.includes("343076")) {
            j.title = "Collection Executive";
            j.company = "Singhagiri";
            j.location = "Colombo";
          } else if (j.source_url.includes("343163")) {
            j.title = "Business Development Executive";
            j.company = "Singhagiri";
            j.location = "Colombo";
          } else if (j.source_url.includes("343213")) {
            j.title = "Customer Support Executive";
            j.company = "Singhagiri";
            j.location = "Colombo";
          } else if (j.title === "Intern - Logistics" && j.source_url.includes("hemas")) {
            j.company = "Hemas Consumer Brands";
            j.location = "Welisara, Gampaha";
          } else if (j.title === "Intern - Operational Excellence" && j.source_url.includes("hemas")) {
            j.company = "Hemas Consumer Brands";
            j.location = "Dankotuwa, Puttalam";
          } else if (j.title === "Data Entry Operator" && j.source_url.includes("neosys-medicare")) {
            j.company = "Neosys Medicare";
            j.location = "Colombo 10, Colombo";
          }
        }

        // Fix Ikman specific job titles and companies
        if (j.source_url && j.source_url.includes('ikman.lk')) {
          if (j.source_url.includes('were-hiring-assistant-merchandiser')) {
            j.title = 'Assistant Merchandiser';
            j.company = 'LABDIPS';
            j.location = 'Kaduwela, Colombo';
          }
        }

        // Fix Rooster title and company inversion in raw text
        if (j.source_url && j.source_url.includes('rooster.jobs')) {
          if (j.title === 'ESOFT UNI' && j.raw_text && j.raw_text.includes('Programme Coordinator')) {
            j.title = 'Programme Coordinator';
            j.company = 'ESOFT UNI';
            j.category = 'Education / Teaching';
          } else if (j.title === 'Manpower Sri Lanka' && j.raw_text && j.raw_text.includes('IFS Developer (Kuwait)')) {
            j.title = 'IFS Developer (Kuwait)';
            j.company = 'Manpower Sri Lanka';
            j.category = 'IT / Software';
            j.salary = 'KWD 800';
          } else if (j.title === 'Manpower Sri Lanka' && j.raw_text && j.raw_text.includes('IFS Techno & Functional Consultant')) {
            j.title = 'IFS Techno & Functional Consultant (Kuwait)';
            j.company = 'Manpower Sri Lanka';
            j.category = 'IT / Software';
            j.salary = 'KWD 1,200';
          }
        }

        // Fix ObserverJobs portal title
        if (j.source_url && j.source_url.includes('observerjobs.lk')) {
          if (j.title === 'Observer JOBS' || j.source_url.includes('/539/')) {
            j.title = 'Resident Engineer';
            j.company = 'Rubber Research Institute Of Sri Lanka';
            j.category = 'Engineering / Technical';
          }
        }
      }
      // Deduplicate intra-batch identical postings (e.g. Ikman placement agency spamming same ad in same district)
      const dedupMap = new Map();
      const dedupedList = [];
      for (const j of content.jobs) {
        const compKey = (j.company || '').toLowerCase().replace(/s$/, '').trim();
        const key = `${(j.title || '').toLowerCase().trim()}_${compKey}_${(j.location || '').toLowerCase().trim()}`;
        if (!dedupMap.has(key)) {
          dedupMap.set(key, true);
          dedupedList.push(j);
        }
      }

      // Format each job strictly according to Section 8 & Page 5 spec
      const fieldOrder = [
        'title',
        'company',
        'location',
        'category',
        'job_type',
        'salary',
        'deadline',
        'requirements',
        'apply_email',
        'apply_url',
        'apply_whatsapp',
        'source_url'
      ];

      const cleanedJobs = dedupedList.map(j => {
        const clean = {};
        for (const k of fieldOrder) {
          if (j[k] !== null && j[k] !== undefined && typeof j[k] === 'string' && j[k].trim() !== '') {
            clean[k] = j[k].trim();
          }
        }
        return clean;
      });

      const finalPayload = {
        source: content.source || `hetzner-firecrawl:${f.split('-')[0]}`,
        jobs: cleanedJobs
      };

      fs.writeFileSync(filePath, JSON.stringify(finalPayload, null, 2), 'utf-8');
      console.log(`Updated batch with verified schema: ${f} (${cleanedJobs.length} jobs)`);
    }
  }
}

console.log('Category update complete across all batches!');
