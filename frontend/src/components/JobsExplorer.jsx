import React, { useState } from 'react';
import JobDetailModal from './JobDetailModal.jsx';
import { 
  Search, 
  Download, 
  ExternalLink, 
  Mail, 
  PhoneCall, 
  Globe, 
  Filter, 
  Eye, 
  Layers, 
  Building2, 
  MapPin 
} from 'lucide-react';

export default function JobsExplorer({ jobs = [], portals = [], onExportJson }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPortal, setSelectedPortal] = useState('all');
  const [selectedApplyType, setSelectedApplyType] = useState('all');
  const [activeJobModal, setActiveJobModal] = useState(null);

  // Compute real counts per portal from current jobs list
  const portalCounts = React.useMemo(() => {
    const counts = {};
    jobs.forEach(j => {
      const p = (j.portal || '').toLowerCase();
      counts[p] = (counts[p] || 0) + 1;
    });
    return counts;
  }, [jobs]);

  // Dynamically generate chips for ALL portals in the system
  const dynamicChips = React.useMemo(() => {
    const chips = [
      { id: 'all', label: 'All Portals', count: jobs.length, isActive: true }
    ];

    const knownIds = new Set();
    const portalList = [];

    // 1. Add portals from prop
    (portals || []).forEach(p => {
      const id = p.id.toLowerCase();
      knownIds.add(id);
      portalList.push({
        id: id,
        name: p.name || id.toUpperCase(),
        count: portalCounts[id] || 0
      });
    });

    // 2. Add any other portal that exists in jobs
    Object.keys(portalCounts).forEach(id => {
      if (!knownIds.has(id) && id) {
        knownIds.add(id);
        portalList.push({
          id: id,
          name: id.toUpperCase(),
          count: portalCounts[id] || 0
        });
      }
    });

    // 3. Sort: Portals with harvested jobs first (descending), then others alphabetically
    portalList.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    portalList.forEach(p => {
      chips.push({
        id: p.id,
        label: p.name,
        count: p.count,
        isActive: p.count > 0
      });
    });

    return chips;
  }, [jobs, portals, portalCounts]);

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
    if (type === 'apply_whatsapp') return <PhoneCall size={12} color="#15803d" />;
    if (type === 'apply_email') return <Mail size={12} color="#0369a1" />;
    return <Globe size={12} color="#7e22ce" />;
  };

  return (
    <div className="content-card">
      {/* Header */}
      <div className="content-card-header">
        <div className="card-title-group">
          <Layers size={20} color="var(--primary)" />
          <div>
            <h2>Scraped Vacancies Explorer</h2>
            <span>Inspect individual job data extracted from all Sri Lankan job boards</span>
          </div>
        </div>

        <button className="btn-secondary" onClick={() => onExportJson(filteredJobs)}>
          <Download size={14} />
          <span>Export Clean JSON ({filteredJobs.length})</span>
        </button>
      </div>

      {/* Portal Selection Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
        {dynamicChips.map(chip => {
          const isSelected = selectedPortal === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => setSelectedPortal(chip.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12.5px',
                fontWeight: isSelected ? '700' : '500',
                border: isSelected ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                background: isSelected ? 'var(--primary-subtle)' : chip.isActive ? '#ffffff' : '#f8fafc',
                color: isSelected ? 'var(--primary)' : chip.isActive ? '#1e293b' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 1px 3px rgba(0,168,84,0.15)' : 'none'
              }}
            >
              <span>{chip.label}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: isSelected ? 'var(--primary)' : chip.isActive ? '#e2e8f0' : '#f1f5f9',
                color: isSelected ? '#ffffff' : chip.isActive ? '#475569' : '#94a3b8'
              }}>
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Toolbar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-input-wrapper" style={{ flex: '1', minWidth: '240px' }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by job title, employer, category, or location..."
            className="search-input"
            style={{ width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="filter-select"
          value={selectedApplyType}
          onChange={(e) => setSelectedApplyType(e.target.value)}
        >
          <option value="all">All Application Methods</option>
          <option value="apply_email">Email Application Only</option>
          <option value="apply_whatsapp">WhatsApp Contacts Only</option>
          <option value="apply_url">Direct Portal Link Only</option>
        </select>
      </div>

      {/* Rich Jobs Data Grid / Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '12px', fontWeight: '700' }}>
              <th style={{ padding: '12px 10px' }}>SOURCE PORTAL</th>
              <th style={{ padding: '12px 10px' }}>VACANCY &amp; EMPLOYER</th>
              <th style={{ padding: '12px 10px' }}>CATEGORY &amp; TYPE</th>
              <th style={{ padding: '12px 10px' }}>VERIFIED APPLY METHOD</th>
              <th style={{ padding: '12px 10px' }}>SALARY</th>
              <th style={{ padding: '12px 10px', textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  No jobs found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredJobs.map(job => (
                <tr 
                  key={job.id} 
                  style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Source Portal */}
                  <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span className="badge badge-portal" style={{ fontWeight: '700' }}>
                        {job.portalName || job.portal}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{job.timeAgo}</span>
                    </div>
                  </td>

                  {/* Vacancy Title & Company */}
                  <td style={{ padding: '14px 10px', verticalAlign: 'middle', maxWidth: '280px' }}>
                    <div style={{ fontWeight: '700', color: '#0c1e38', fontSize: '14px', lineHeight: '1.2' }}>
                      {job.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', marginTop: '3px' }}>
                      <Building2 size={13} />
                      <span>{job.company || 'Direct Employer'}</span>
                      <span>•</span>
                      <MapPin size={13} />
                      <span>{job.location || 'Sri Lanka'}</span>
                    </div>
                  </td>

                  {/* Category & Type */}
                  <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className="badge badge-category">{job.category}</span>
                      <span className="badge badge-type">{job.job_type}</span>
                    </div>
                  </td>

                  {/* Apply Method */}
                  <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getApplyIcon(job.apply_type)}
                      <span style={{ fontWeight: '600', color: '#334155' }}>
                        {job.apply_type === 'apply_whatsapp' ? `WA: ${job.apply_value}` :
                         job.apply_type === 'apply_email' ? job.apply_value :
                         'Direct Career Form'}
                      </span>
                    </div>
                  </td>

                  {/* Salary */}
                  <td style={{ padding: '14px 10px', verticalAlign: 'middle' }}>
                    <span style={{ fontWeight: '700', color: '#00a854' }}>
                      {job.salary || 'Negotiable'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 10px', verticalAlign: 'middle', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                      <button
                        onClick={() => setActiveJobModal(job)}
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        title="View Full Vacancy Details & JSON Schema"
                      >
                        <Eye size={13} />
                        <span>Inspect</span>
                      </button>

                      {job.source_url && (
                        <a
                          href={job.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ padding: '6px 10px' }}
                          title="Open Live Listing Site"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Full Job Details Modal */}
      {activeJobModal && (
        <JobDetailModal 
          job={activeJobModal} 
          onClose={() => setActiveJobModal(null)} 
        />
      )}
    </div>
  );
}
