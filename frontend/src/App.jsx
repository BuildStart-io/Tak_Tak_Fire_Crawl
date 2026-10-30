import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.jsx';
import MetricCard from './components/MetricCard.jsx';
import RecentVacancies from './components/RecentVacancies.jsx';
import JobsExplorer from './components/JobsExplorer.jsx';
import PortalsGrid from './components/PortalsGrid.jsx';
import ApiDeliveries from './components/ApiDeliveries.jsx';
import CronHistory from './components/CronHistory.jsx';
import { 
  MOCK_METRICS, 
  TARGET_PORTALS, 
  MOCK_JOBS, 
  MOCK_API_DELIVERIES 
} from './data/mockData.js';
import { 
  Briefcase, 
  CheckCircle2, 
  Globe, 
  Database 
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(MOCK_METRICS);
  const [jobs, setJobs] = useState(MOCK_JOBS);
  const [portals, setPortals] = useState(TARGET_PORTALS);
  const [deliveries, setDeliveries] = useState(MOCK_API_DELIVERIES);
  const [cronCycles, setCronCycles] = useState([]);

  // Load real scraped jobs, portals, deliveries, and cron history from backend bridge
  const loadAllData = () => {
    // 1. Fetch real jobs from out/ batches
    fetch('/api/real-jobs')
      .then(res => res.json())
      .then(data => {
        if (data.ok && Array.isArray(data.jobs)) {
          setJobs(data.jobs);
          setMetrics(prev => ({
            ...prev,
            extractedJobs: data.jobs.length,
            cacheSaved: data.jobs.length,
            lastRunTimestamp: data.jobs.length > 0 ? 'Recently completed' : 'Awaiting run'
          }));
        }
      })
      .catch(() => {});

    // 2. Fetch real portals with exact harvested counts
    fetch('/api/portals')
      .then(res => res.json())
      .then(pData => {
        if (pData.ok && Array.isArray(pData.portals)) {
          setPortals(pData.portals);
          const activeCount = pData.portals.filter(p => p.count > 0).length;
          setMetrics(prev => ({
            ...prev,
            activePortals: activeCount,
            totalPortals: pData.portals.length
          }));
        }
      })
      .catch(() => {});

    // 3. Fetch real deliveries from out/ batches
    fetch('/api/real-deliveries')
      .then(res => res.json())
      .then(delData => {
        if (delData.ok && Array.isArray(delData.deliveries)) {
          setDeliveries(delData.deliveries);
        }
      })
      .catch(() => {});

    // 4. Fetch cron execution history
    fetch('/api/cron-history')
      .then(res => res.json())
      .then(cData => {
        if (cData.ok && Array.isArray(cData.cycles)) {
          setCronCycles(cData.cycles);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 8000);
    return () => clearInterval(interval);
  }, []);

  // When a new cron job / crawl run starts: reset the dashboard view for the fresh harvest
  const handleTriggerNewRun = () => {
    setJobs([]);
    setDeliveries([]);
    setPortals(prev => prev.map(p => ({ ...p, count: 0, status: 'Ready / Pending Run' })));
    setMetrics(prev => ({
      ...prev,
      extractedJobs: 0,
      activePortals: 0,
      cacheSaved: 0,
      lastRunTimestamp: 'Crawl cycle in progress...'
    }));
    setTimeout(loadAllData, 2000);
  };

  // Handle Export JSON
  const handleExportJson = (dataToExport) => {
    const jsonString = JSON.stringify(dataToExport || jobs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `taktak-scraped-jobs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        counts={{ 
          jobs: jobs.length,
          portals: portals.length,
          activePortals: portals.filter(p => (p.count || 0) > 0).length,
          deliveries: deliveries.length,
          cronRuns: cronCycles.length,
          successRate: deliveries.length > 0 
            ? `${Math.round((deliveries.filter(d => d.httpStatus === 200).length / deliveries.length) * 100)}%` 
            : '100%'
        }}
      />

      {/* Main Content Area */}
      <main className="main-wrapper">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-title">
            <h1>
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'jobs' && 'Scraped Vacancies Explorer'}
              {activeTab === 'portals' && `${portals.length} Target Portals`}
              {activeTab === 'deliveries' && 'TakTak API Ingestion Deliveries'}
              {activeTab === 'cron' && 'Cron Job History & Schedules'}
            </h1>
            <p>
              {activeTab === 'dashboard' && 'High-level metrics and recent vacancy ingestion stream'}
              {activeTab === 'jobs' && 'Detailed database view of all vacancies extracted across Sri Lankan boards'}
              {activeTab === 'portals' && `Health, latency, and crawl status for all ${portals.length} job websites`}
              {activeTab === 'deliveries' && 'Payload batches and TakTak Ingestion API HTTP 200 delivery logs'}
              {activeTab === 'cron' && 'Automated 06:00 & 14:00 Colombo execution cycles, live runs, and metrics archive'}
            </p>
          </div>
        </header>

        {/* 4 Top Metric Cards (Shown on Dashboard Overview) */}
        {activeTab === 'dashboard' && (
          <div className="metrics-grid">
            <MetricCard
              title="Jobs Harvested (This Run)"
              value={metrics.extractedJobs}
              limit={metrics.maxJobs}
              progressPercent={(metrics.extractedJobs / metrics.maxJobs) * 100}
              icon={Briefcase}
            />

            <MetricCard
              title="TakTak API Ingestion Rate"
              value={`${metrics.successRate}%`}
              limit="100%"
              progressPercent={metrics.successRate}
              icon={CheckCircle2}
            />

            <MetricCard
              title="Active Target Boards"
              value={metrics.activePortals}
              limit={metrics.totalPortals}
              progressPercent={(metrics.activePortals / metrics.totalPortals) * 100}
              icon={Globe}
            />

            <MetricCard
              title="Cached Listings (SQLite Saved)"
              value={metrics.cacheSaved}
              limit={metrics.maxCache}
              progressPercent={(metrics.cacheSaved / metrics.maxCache) * 100}
              icon={Database}
            />
          </div>
        )}

        {/* Tab 1: Dashboard Overview -> Compact Feed */}
        {activeTab === 'dashboard' && (
          <RecentVacancies 
            jobs={jobs} 
            portals={portals}
            onExportJson={handleExportJson} 
          />
        )}

        {/* Tab 2: Scraped Jobs -> Dedicated Deep Explorer Table with Site Badges & Inspector Modal */}
        {activeTab === 'jobs' && (
          <JobsExplorer 
            jobs={jobs} 
            portals={portals}
            onExportJson={handleExportJson} 
          />
        )}

        {/* Tab 3: Target Portals */}
        {activeTab === 'portals' && (
          <PortalsGrid 
            portals={portals} 
            onPortalsChange={(newPortals) => {
              setPortals(newPortals);
              const activeCount = newPortals.filter(p => (p.count || 0) > 0).length;
              setMetrics(prev => ({
                ...prev,
                activePortals: activeCount,
                totalPortals: newPortals.length
              }));
            }} 
          />
        )}

        {/* Tab 4: TakTak API Deliveries */}
        {activeTab === 'deliveries' && (
          <ApiDeliveries deliveries={deliveries} />
        )}

        {/* Tab 5: Cron Job History & Schedules */}
        {activeTab === 'cron' && (
          <CronHistory onTriggerNewRun={handleTriggerNewRun} />
        )}
      </main>
    </div>
  );
}
