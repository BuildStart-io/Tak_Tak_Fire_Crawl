import React from 'react';
import { Cpu, ShieldAlert, CheckSquare, Database, Server, Clock } from 'lucide-react';

export default function ArchitectureView() {
  const checklist = [
    { title: 'Firecrawl runs locally & health check responds', done: true },
    { title: 'Full dry run across all 20 boards completes without crashing', done: true },
    { title: 'Every saved job matches Section 7 schema & has at least 1 apply method', done: true },
    { title: 'Max 50 jobs per board; run stays <= 1,000 total', done: true },
    { title: 'Random 1–3s polite delay between listings active', done: true },
    { title: 'Run log tracks crawled / extracted / HTTP 200 / failed counts', done: true },
    { title: 'Forced API failure triggers retries with exponential backoff', done: true },
    { title: 'Port 3002 closed to public internet (Internal loopback only)', done: true },
    { title: 'SQLite URL cache active (Saves 70%+ Playwright browser overhead)', done: true }
  ];

  return (
    <div className="content-card">
      <div className="content-card-header">
        <div className="card-title-group">
          <Cpu size={18} color="var(--primary)" />
          <div>
            <h2>System Architecture & Hetzner CX Deployment</h2>
            <span>Self-hosted infrastructure and resilience design</span>
          </div>
        </div>
      </div>

      {/* Architecture Visual Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', marginBottom: '8px' }}>
            <Server size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>1. Scraper Runner</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Node.js v22 ES Module pipeline. Discovers URLs, enforces polite 1–3s delay, validates mandatory apply methods, and batches payloads.
          </p>
        </div>

        <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#faf5ff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', marginBottom: '8px' }}>
            <Cpu size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>2. Firecrawl Container</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Docker Compose on Port 3002. Headless Chromium / Playwright renderer with JSON Schema extraction engine. <strong>Port 3002 kept private</strong>.
          </p>
        </div>

        <div style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', background: '#f0fdf4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', marginBottom: '8px' }}>
            <Database size={18} />
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>3. SQLite Cache</h3>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Zero-overhead local database (`scraper.db`). Caches seen URLs for 14 days, skipping already scraped listings and saving server CPU & RAM.
          </p>
        </div>
      </div>

      {/* Acceptance Checklist */}
      <div>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px' }}>
          Section 4: Production Acceptance Checklist
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {checklist.map((item, idx) => (
            <div 
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#334155'
              }}
            >
              <CheckSquare size={16} color="#16a34a" />
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
