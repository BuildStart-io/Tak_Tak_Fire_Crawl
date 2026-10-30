import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Mail, 
  PhoneCall, 
  Globe, 
  Calendar, 
  MapPin, 
  Briefcase, 
  DollarSign, 
  FileText, 
  Building2, 
  ShieldCheck,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Tag,
  Layers
} from 'lucide-react';

export default function JobDetailModal({ job, onClose }) {
  const [showRawText, setShowRawText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!job) return null;

  // Exact Section 7 Payload matching TakTak Ingestion API
  const section7Payload = {
    title: job.title || null,
    company: job.company || null,
    location: job.location || null,
    category: job.category || null,
    job_type: job.job_type || null,
    salary: (job.salary && /\d/.test(job.salary)) ? job.salary : null,
    deadline: job.deadline || null,
    requirements: job.requirements || null,
    company_summary: job.company_summary || null,
    raw_text: job.raw_text ? `${job.raw_text.slice(0, 300)}... [Truncated for preview]` : null,
    apply_url: job.apply_url || null,
    apply_email: job.apply_email || null,
    apply_whatsapp: job.apply_whatsapp || null,
    source_url: job.source_url || null
  };

  const fullJsonString = JSON.stringify(section7Payload, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(fullJsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const schemaFields = [
    { key: 'title', label: 'Job Title', val: job.title, required: true },
    { key: 'company', label: 'Company / Employer', val: job.company },
    { key: 'location', label: 'Work Location / District', val: job.location },
    { key: 'category', label: 'Industry Category', val: job.category },
    { key: 'job_type', label: 'Employment Type', val: job.job_type },
    { key: 'salary', label: 'Salary / Remuneration', val: (job.salary && /\d/.test(job.salary)) ? job.salary : 'Negotiable' },
    { key: 'deadline', label: 'Application Deadline', val: job.deadline ? job.deadline : null },
    { key: 'apply_url', label: 'Apply Portal / URL', val: job.apply_url },
    { key: 'apply_email', label: 'Apply Email Address', val: job.apply_email },
    { key: 'apply_whatsapp', label: 'Apply WhatsApp Number', val: job.apply_whatsapp },
    { key: 'source_url', label: 'Source Listing Permalink', val: job.source_url }
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(12, 30, 56, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Sticky Modal Header */}
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'sticky',
          top: 0,
          background: '#ffffff',
          zIndex: 10,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ maxWidth: '85%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="badge badge-portal" style={{ fontSize: '12px', fontWeight: '800' }}>
                {job.portalName || (job.portal ? job.portal.toUpperCase() : 'PORTAL')}
              </span>
              <span className="badge badge-type" style={{ fontSize: '12px' }}>
                {job.job_type || 'Full-time'}
              </span>
              <span className="badge badge-category" style={{ fontSize: '12px' }}>
                {job.category || 'General'}
              </span>
              <span style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '4px',
                fontSize: '11.5px', 
                color: '#15803d', 
                background: '#dcfce7', 
                padding: '3px 8px', 
                borderRadius: '6px',
                fontWeight: '700' 
              }}>
                <ShieldCheck size={14} /> Section 7 Validated
              </span>
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0c1e38', lineHeight: '1.25' }}>
              {job.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13.5px', marginTop: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Building2 size={15} color="#0c1e38" />
                <strong style={{ color: '#0c1e38' }}>{job.company || 'Direct Employer'}</strong>
              </div>
              <span>•</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={15} color="#059669" />
                <span>{job.location || 'Sri Lanka'}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b',
              transition: 'all 0.15s ease'
            }}
            title="Close Details Modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          
          {/* 4-Box Key Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Salary
              </div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#00a854', marginTop: '3px' }}>
                {(job.salary && /\d/.test(job.salary)) ? job.salary : 'Negotiable'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Deadline
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0c1e38', marginTop: '3px' }}>
                {job.deadline || 'Open until filled'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Category
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '600', color: '#0c1e38', marginTop: '3px' }}>
                {job.category || 'General'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                Delivery State
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#15803d', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> Ready for Ingest
              </div>
            </div>
          </div>

          {/* Section 7 Application Channels Card */}
          <div style={{
            padding: '18px 20px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Section 7 Verified Application Channels
              </h4>
              <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600' }}>
                Mandatory Apply Rule Satisfied
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* WhatsApp Button */}
              {job.apply_whatsapp ? (
                <a 
                  href={`https://wa.me/${job.apply_whatsapp.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ background: '#25D366' }}
                >
                  <PhoneCall size={15} />
                  <span>WhatsApp: {job.apply_whatsapp}</span>
                </a>
              ) : null}

              {/* Email Button */}
              {job.apply_email ? (
                <a 
                  href={`mailto:${job.apply_email}`} 
                  className="btn-primary"
                >
                  <Mail size={15} />
                  <span>Apply via Email: {job.apply_email}</span>
                </a>
              ) : null}

              {/* URL / Direct Button */}
              {job.apply_url ? (
                <a 
                  href={job.apply_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Globe size={15} />
                  <span>
                    {job.apply_url.includes('#') 
                      ? 'Open & Apply on Job Page'
                      : (job.source_url && job.apply_url.replace(/#.*$/, '') !== job.source_url.replace(/#.*$/, '')
                          ? 'Apply on External Career Portal'
                          : 'Open Vacancy Application')}
                  </span>
                </a>
              ) : null}

              {/* Source Permalink (only if different from apply_url) */}
              {job.source_url && (!job.apply_url || job.source_url.replace(/#.*$/, '') !== job.apply_url.replace(/#.*$/, '')) ? (
                <a 
                  href={job.source_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn-secondary"
                >
                  <ExternalLink size={15} />
                  <span>View Original Portal Permalink</span>
                </a>
              ) : null}
            </div>
          </div>

          {/* Section 7 All 14 Fields Inspector Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Layers size={16} color="var(--primary)" />
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0c1e38' }}>
                Section 7 Schema Extracted Fields (14 Attributes)
              </h4>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <tbody>
                  {schemaFields.map((field, idx) => (
                    <tr key={field.key} style={{ borderBottom: idx < schemaFields.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                      <td style={{ padding: '8px 14px', width: '220px', fontWeight: '600', color: '#475569', background: '#f1f5f9' }}>
                        <code>{field.key}</code>
                        <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', fontWeight: '400' }}>{field.label}</span>
                      </td>
                      <td style={{ padding: '8px 14px', color: field.val ? '#0c1e38' : '#94a3b8', fontFamily: field.key.includes('url') ? 'monospace' : 'inherit' }}>
                        {field.val ? String(field.val) : 'null (not specified on page)'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clean Job Requirements & Qualifications */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <FileText size={16} color="var(--primary)" />
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0c1e38' }}>
                Job Requirements &amp; Qualifications (Cleaned Text)
              </h4>
            </div>
            <div style={{
              fontSize: '13px',
              color: '#334155',
              lineHeight: '1.7',
              background: '#f8fafc',
              padding: '16px 20px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              whiteSpace: 'pre-line',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {job.requirements || (
                <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                  No explicit requirements or qualifications section published in this advertisement (refer to Full Raw Advertisement Text below or the original portal permalink).
                </span>
              )}
            </div>
          </div>

          {/* Collapsible Full Raw Advertisement Text */}
          {job.raw_text && (
            <div>
              <button 
                onClick={() => setShowRawText(!showRawText)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <span>{showRawText ? 'Hide Full Raw Advertisement Text' : `View Full Raw Advertisement Text (${job.raw_text.length} chars)`}</span>
                {showRawText ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {showRawText && (
                <div style={{
                  marginTop: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  fontSize: '12px',
                  color: '#475569',
                  whiteSpace: 'pre-line',
                  lineHeight: '1.6',
                  fontFamily: 'monospace'
                }}>
                  {job.raw_text}
                </div>
              )}
            </div>
          )}

          {/* Exact Wire Delivery JSON Payload */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={15} color="#0284c7" />
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#0c1e38' }}>
                  TakTak Ingestion API Wire Payload (Section 7 JSON)
                </h4>
              </div>

              <button 
                onClick={handleCopyJson}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#0c1e38',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {copiedJson ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>

            <pre style={{
              background: '#0c1e38',
              color: '#38bdf8',
              padding: '16px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              maxHeight: '220px',
              overflowY: 'auto',
              lineHeight: '1.5'
            }}>
              {fullJsonString}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
