export const MOCK_METRICS = {
  extractedJobs: 0,
  maxJobs: 1000,
  successRate: 100,
  activePortals: 20,
  totalPortals: 20,
  cacheSaved: 0,
  maxCache: 1000,
  nextRun: 'Today 06:00 / 14:00 (Colombo)',
  serverStatus: 'Online (Hetzner CX / Port 3002)',
  lastRunTimestamp: 'Awaiting run'
};

export const INITIAL_PORTALS = [
  { id: 'topjobs', name: 'TopJobs', url: 'https://www.topjobs.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'xpressjobs', name: 'XpressJobs', url: 'https://xpress.jobs', count: 0, status: 'Ready', latency: '-' },
  { id: 'ikman', name: 'Ikman Jobs', url: 'https://ikman.lk/en/ads/sri-lanka/jobs', count: 0, status: 'Ready', latency: '-' },
  { id: 'jobeka', name: 'JobEka', url: 'https://jobeka.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'jobpal', name: 'Jobpal.lk', url: 'https://jobpal.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'observerjobs', name: 'Observer Jobs', url: 'https://observerjobs.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'jobfactory', name: 'Jobfactory', url: 'https://jobfactory.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'lankajobs', name: 'LankaJobs', url: 'https://lankajobs.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'dreamjobs', name: 'DreamJobs.lk', url: 'https://dreamjobs.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'jobhub', name: 'Jobhub.lk', url: 'https://jobhub.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'rooster', name: 'Rooster.jobs', url: 'https://rooster.jobs', count: 0, status: 'Ready', latency: '-' },
  { id: 'workstone', name: 'Workstone.lk', url: 'https://workstone.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'careerfirst', name: 'CareerFirst', url: 'https://careerfirst.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'jobsnet', name: 'JobsNet', url: 'https://jobsnet.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'guru', name: 'Guru.lk / Everjobs', url: 'https://www.guru.lk/jobs', count: 0, status: 'Ready', latency: '-' },
  { id: 'sundaytimes', name: 'Sunday Times Classifieds', url: 'https://www.sundaytimes.lk/classifieds/', count: 0, status: 'Ready', latency: '-' },
  { id: 'lankainformation', name: 'Lanka Information Jobs', url: 'https://lankainformation.lk/jobs', count: 0, status: 'Ready', latency: '-' },
  { id: 'myjobs', name: 'MyJobs.lk', url: 'https://myjobs.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'jobsinsrilanka', name: 'JobsInSriLanka.lk', url: 'https://jobsinsrilanka.lk', count: 0, status: 'Ready', latency: '-' },
  { id: 'governmentjobs', name: 'SL Govt Jobs / Gazette', url: 'https://www.governmentjobs.lk', count: 0, status: 'Ready', latency: '-' }
];

export const TARGET_PORTALS = INITIAL_PORTALS;

// Real empty state - No fake mock jobs
export const MOCK_JOBS = [];

// Real empty state - No fake deliveries
export const MOCK_API_DELIVERIES = [];
