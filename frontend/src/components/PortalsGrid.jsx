import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, X, Check, Clock, ExternalLink } from 'lucide-react';
import { INITIAL_PORTALS } from '../data/mockData.js';

export default function PortalsGrid({ portals = [], onPortalsChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPortalName, setNewPortalName] = useState('');
  const [newPortalUrl, setNewPortalUrl] = useState('');
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Clear any old stale mock numbers from localStorage
  useEffect(() => {
    try {
      localStorage.removeItem('taktak_custom_portals');
    } catch {}
  }, []);

  const handleAddPortal = async (e) => {
    e.preventDefault();
    setFormError('');

    const name = newPortalName.trim();
    let url = newPortalUrl.trim();

    if (!name) {
      setFormError('Please enter a portal name (e.g. LankaVacancy.lk)');
      return;
    }

    if (!url) {
      setFormError('Please enter a valid starting URL');
      return;
    }

    if (!url.startsWith('https://')) {
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      } else {
        url = `https://${url}`;
      }
    }

    // Check duplicate
    if (portals.some(p => p.url.toLowerCase() === url.toLowerCase())) {
      setFormError('This portal URL is already registered in the scraper list.');
      return;
    }

    const newPortalObj = {
      id: `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}`,
      name: name,
      url: url,
      count: 0,
      status: 'Ready / Pending Run',
      latency: '-',
      isCustom: true
    };

    try {
      // Save to backend database/custom_portals.json and get updated list
      const res = await fetch('/api/portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPortalObj)
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.portals) && onPortalsChange) {
        onPortalsChange(data.portals);
      }
    } catch {}

    setNewPortalName('');
    setNewPortalUrl('');
    setIsModalOpen(false);

    setSuccessToast(`Portal "${name}" successfully registered for future crawler cycles!`);
    setTimeout(() => setSuccessToast(''), 3500);
  };

  const handleRemovePortal = async (portalToRemove) => {
    const id = portalToRemove?.id;
    const url = portalToRemove?.url;
    try {
      const res = await fetch('/api/portals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, url })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.portals) && onPortalsChange) {
        onPortalsChange(data.portals);
        return;
      }
    } catch {}

    if (onPortalsChange) {
      onPortalsChange(portals.filter(p => p.url !== url && p.id !== id));
    }
  };

  return (
    <div className="content-card">
      {/* Header with Title and Add Portal Button */}
      <div className="content-card-header">
        <div className="card-title-group">
          <Globe size={18} color="var(--primary)" />
          <div>
            <h2>{portals.length} Sri Lankan Target Portals</h2>
          </div>
        </div>

        {/* Add Portal Button */}
        <button 
          className="btn-primary" 
          onClick={() => setIsModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={15} />
          <span>Add Custom Portal</span>
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div style={{
          padding: '12px 18px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
          color: '#15803d',
          fontSize: '13px',
          fontWeight: '600',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Portals Grid */}
      <div className="portals-grid">
        {portals.map((portal, idx) => (
          <div key={portal.id || idx} className="portal-card" style={{
            borderColor: portal.count > 0 ? '#bbf7d0' : '#e2e8f0',
            background: portal.count > 0 ? '#ffffff' : '#fafafa'
          }}>
            <div className="portal-card-header">
              <span style={{ fontSize: '12px', fontWeight: '700', color: portal.count > 0 ? 'var(--primary)' : '#94a3b8' }}>
                #{idx + 1}
              </span>
              <h3 style={{ color: portal.count > 0 ? '#0c1e38' : '#64748b' }}>{portal.name}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {portal.isCustom && (
                  <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: '10px' }}>
                    Custom
                  </span>
                )}
                <span 
                  className={`status-pill ${portal.count > 0 ? 'ingested' : 'pending'}`} 
                  style={{ 
                    fontSize: '10.5px', 
                    padding: '2px 8px',
                    background: portal.count > 0 ? '#dcfce7' : '#f1f5f9',
                    color: portal.count > 0 ? '#15803d' : '#64748b'
                  }}
                >
                  {portal.count > 0 ? 'Active' : 'Offline / 0 Jobs'}
                </span>
                {portal.isCustom && (
                  <button 
                    onClick={() => handleRemovePortal(portal)}
                    title="Remove custom portal"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <a 
              href={portal.url} 
              target="_blank" 
              rel="noreferrer" 
              className="portal-url"
              title={portal.url}
              style={{ opacity: portal.count > 0 ? 1 : 0.7 }}
            >
              {portal.url}
            </a>

            <div className="portal-stats-row">
              <span>Jobs Harvested: <strong style={{ color: portal.count > 0 ? 'var(--primary)' : '#64748b' }}>{portal.count} / 50</strong></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: portal.count > 0 ? '#15803d' : '#94a3b8' }}>
                <Clock size={12} /> {portal.count > 0 ? (portal.latency || 'Responsive') : 'Unreachable'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Portal Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(12, 30, 56, 0.6)',
          backdropFilter: 'blur(4px)',
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
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)' }}>Add Target Job Portal</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Register a new Sri Lankan job website for future crawler cycles
                </p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '12.5px',
                marginBottom: '16px'
              }}>
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddPortal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>
                  Portal Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. LankaCareers.lk, DevJobs.lk"
                  value={newPortalName}
                  onChange={(e) => setNewPortalName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>
                  Starting HTTPS URL
                </label>
                <input
                  type="text"
                  placeholder="https://example.lk/vacancies"
                  value={newPortalUrl}
                  onChange={(e) => setNewPortalUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13.5px',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                  Must be a secure HTTPS link. Firecrawl will map and discover vacancies from this page.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save &amp; Register Portal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
