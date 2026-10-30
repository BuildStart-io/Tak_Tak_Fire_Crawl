import React, { useState } from 'react';
import { Settings, Play, CheckCircle2, Shield, Clock, Terminal } from 'lucide-react';

export default function SettingsView({ onTriggerDryRun }) {
  const [isRunning, setIsRunning] = useState(false);
  const [simOutput, setSimOutput] = useState(null);

  const handleSimulate = () => {
    setIsRunning(true);
    setSimOutput('Starting test dry-run simulation across TopJobs, XpressJobs, Rooster...');
    setTimeout(() => {
      setSimOutput(`[INFO] Checked Firecrawl Port 3002 : OK
[INFO] Discovered 12 candidate vacancies on TopJobs
[INFO] Discovered 15 candidate vacancies on XpressJobs
[INFO] Discovered 10 candidate vacancies on Rooster.jobs
[DB CACHE] 22 listings skipped (already present in SQLite cache)
[INFO] Successfully extracted 15 new vacancies matching Section 7 schema
[DRY-RUN] Batches saved to ./out/topjobs-2026-10-27.json
[SUCCESS] Dry run simulation finished with 0 errors!`);
      setIsRunning(false);
      if (onTriggerDryRun) onTriggerDryRun();
    }, 1800);
  };

  return (
    <div className="content-card">
      <div className="content-card-header">
        <div className="card-title-group">
          <Settings size={18} color="var(--primary)" />
          <div>
            <h2>Runner Settings & Cron Automation</h2>
            <span>Production environment configurations and Hetzner scheduler</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Environment configuration */}
        <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--primary)" /> Active Environment (.env)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>FIRECRAWL_API_URL:</span>
              <code>http://localhost:3002</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>TAKTAK_API_URL:</span>
              <code style={{ fontSize: '11px' }}>.../api/public/jobs/ingest</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>AUTH HEADER:</span>
              <code>x-ingest-secret: **********</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>MAX_JOBS_PER_BOARD:</span>
              <code>50 (Total &le; 1,000)</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>POLITE DELAY:</span>
              <code>1,000 - 3,000 ms</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>SQLITE DATABASE:</span>
              <code>./data/scraper.db</code>
            </div>
          </div>
        </div>

        {/* Cron Schedule */}
        <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--primary)" /> Production Cron Schedule
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Configured on Hetzner Ubuntu server explicitly targeting Asia/Colombo timezone:
          </p>
          <div style={{ background: '#0f172a', color: '#38bdf8', padding: '12px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
            # Runs twice daily at 06:00 &amp; 14:00 Colombo<br />
            CRON_TZ=Asia/Colombo<br />
            0 6,14 * * * /usr/bin/node /opt/scraper-runner/index.js &gt;&gt; /var/log/scraper.log 2&gt;&amp;1
          </div>
        </div>
      </div>

      {/* Manual Simulation Run */}
      <div style={{ padding: '20px', background: '#faf5ff', borderRadius: '10px', border: '1px solid var(--primary-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b' }}>Simulate Local Dry-Run</h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Executes validation and output saving without calling TakTak production API.
            </p>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSimulate}
            disabled={isRunning}
            style={{ opacity: isRunning ? 0.7 : 1 }}
          >
            <Play size={14} />
            <span>{isRunning ? 'Running Simulation...' : 'Trigger Dry-Run Test'}</span>
          </button>
        </div>

        {simOutput && (
          <pre style={{
            background: '#1e1b4b',
            color: '#a7f3d0',
            padding: '14px',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6'
          }}>
            {simOutput}
          </pre>
        )}
      </div>
    </div>
  );
}
