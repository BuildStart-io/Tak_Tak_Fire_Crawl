import React, { useState } from 'react';
import { 
  TrendingUp, 
  Search, 
  Download, 
  ExternalLink, 
  Mail, 
  PhoneCall, 
  Globe, 
  Filter 
} from 'lucide-react';

export default function RecentVacancies({ jobs = [], portals = [], onExportJson }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPortal, setSelectedPortal] = useState('all');
  const [selectedApplyType, setSelectedApplyType] = useState('all');

  const portalCounts = React.useMemo(() => {
    const counts = {};
    jobs.forEach(j => {
      const p = (j.portal || '').toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.company && job.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (job.category && job.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPortal = selectedPortal === 'all' || (job.portal || '').toLowerCase() === selectedPortal.toLowerCase();
    const matchesApply = selectedApplyType === 'all' || job.apply_type === selectedApplyType;

    return matchesSearch && matchesPortal && matchesApply;
  });

  const getApplyIcon = (type) => {
    if (type === 'apply_whatsapp') return <PhoneCall size={12} />;
    if (type === 'apply_email') return <Mail size={12} />;
    return <Globe size={12} />;
  };

  const getApplyLabel = (job) => {
    if (job.apply_type === 'apply_whatsapp') return `WhatsApp: ${job.apply_value}`;
    if (job.apply_type === 'apply_email') return `Email: ${job.apply_value}`;
    return 'Portal Form / Link';
  };

  return (
    <div className="content-card">
      {/* Card Header & Controls */}
      <div className="content-card-header">
        <div className="card-title-group">
          <TrendingUp size={18} color="var(--primary)" />
          <div>
            <h2>Recent Scraped Vacancies</h2>
            <span>Latest verified job postings from 20 Sri Lankan boards</span>
          </div>
        </div>

        <div className="toolbar-actions">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search title, company..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Portal Filter */}
          <select 
            className="filter-select"
            value={selectedPortal}
            onChange={(e) => setSelectedPortal(e.target.value)}
          >
            <option value="all">All Portals ({jobs.length})</option>
            {portals.map(p => (
              <option key={p.id} value={p.id.toLowerCase()}>
                {p.name} ({portalCounts[p.id.toLowerCase()] || 0})
              </option>
            ))}
          </select>

          {/* Apply Type Filter */}
          <select 
            className="filter-select"
            value={selectedApplyType}
            onChange={(e) => setSelectedApplyType(e.target.value)}
          >
            <option value="all">All Apply Methods</option>
            <option value="apply_email">Email Application</option>
            <option value="apply_whatsapp">WhatsApp Application</option>
            <option value="apply_url">Direct URL Form</option>
          </select>

          {/* Export JSON Button */}
          <button className="btn-secondary" onClick={() => onExportJson(filteredJobs)}>
            <Download size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Vacancy Rows List (Matching Screenshot) */}
      <div className="vacancy-list">
        {filteredJobs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No job vacancies match your search filter.
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="vacancy-row">
              <div className="vacancy-left">
                <div className="vacancy-title-line">
                  <span className="vacancy-title">{job.title}</span>
                  <span className="badge badge-portal">{job.portalName || job.portal}</span>
                  <span className="badge badge-category">{job.category}</span>
                  <span className="badge badge-type">{job.job_type}</span>
                </div>

                <div className="vacancy-meta-line">
                  <span>🏢 {job.company || 'Direct Employer'}</span>
                  <span>📍 {job.location || 'Sri Lanka'}</span>
                  <span className="badge badge-lang" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {getApplyIcon(job.apply_type)}
                    {getApplyLabel(job)}
                  </span>
                  <span>• {job.timeAgo || 'Recent'}</span>
                </div>
              </div>

              <div className="vacancy-right">
                <div className="vacancy-salary">
                  {job.salary || 'Negotiable'}
                </div>
                <div className={`status-pill ${job.status || 'ingested'}`}>
                  {job.status || 'ingested'}
                </div>
                {job.source_url && (
                  <a 
                    href={job.source_url} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: 'var(--text-subtle)' }}
                    title="View Original Post"
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
