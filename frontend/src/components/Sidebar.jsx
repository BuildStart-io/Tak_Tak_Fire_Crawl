import React from 'react';
import TakTakLogo from './TakTakLogo.jsx';
import { 
  LayoutDashboard, 
  Briefcase, 
  Globe, 
  Send,
  History
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts = {} }) {
  // Navigation tabs with live counts from database and out batches
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Scraped Jobs', icon: Briefcase, count: counts.jobs },
    { id: 'portals', label: `${counts.portals || 20} Target Portals`, icon: Globe, count: `${counts.activePortals ?? 0}/${counts.portals || 20}` },
    { id: 'deliveries', label: 'TakTak Ingest API', icon: Send, count: counts.deliveries !== undefined ? counts.deliveries : '3' },
    { id: 'cron', label: 'Cron Job History', icon: History, count: counts.cronRuns !== undefined ? counts.cronRuns : '2' }
  ];

  return (
    <aside className="sidebar">
      {/* Official TakTak Jobs Logo */}
      <div className="brand-section">
        <TakTakLogo size="medium" />
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.count && (
                <span className="badge-count">{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
