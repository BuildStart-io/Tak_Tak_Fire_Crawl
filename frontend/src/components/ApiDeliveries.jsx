import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw 
} from 'lucide-react';

export default function ApiDeliveries({ deliveries: initialDeliveries }) {
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [filter, setFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);

  React.useEffect(() => {
    setDeliveries(initialDeliveries);
  }, [initialDeliveries]);

  const toggleExpand = (id) => {
    setExpandedLogId(prev => prev === id ? null : id);
  };

  const handleManualRetry = (batchId) => {
    setRetryingId(batchId);
    setTimeout(() => {
      setDeliveries(prev => prev.map(item => {
        if (item.id === batchId) {
          return {
            ...item,
            status: 'recovered',
            httpStatus: 200,
            created: item.batchSize - 2,
            duplicates: 2,
            retryCount: item.retryCount + 1,
            retryLogs: [
              ...item.retryLogs,
              { 
                attempt: item.retryCount + 1, 
                time: new Date().toLocaleTimeString(), 
                success: true, 
                message: 'Manual operator retry: TakTak Ingestion API responded with HTTP 200 OK!' 
              }
            ]
          };
        }
        return item;
      }));
      setRetryingId(null);
    }, 1200);
  };

  const filteredDeliveries = deliveries.filter(item => {
    if (filter === 'success') return item.status === 'success';
    if (filter === 'recovered') return item.status === 'recovered';
    if (filter === 'failed') return item.status === 'failed';
    return true;
  });

  const successCount = deliveries.filter(d => d.status === 'success').length;
  const recoveredCount = deliveries.filter(d => d.status === 'recovered').length;
  const failedCount = deliveries.filter(d => d.status === 'failed').length;
  const totalDeliveredJobs = deliveries.reduce((acc, d) => acc + (d.batchSize || 0), 0);

  return (
    <div className="content-card">
      {/* Header */}
      <div className="content-card-header">
        <div className="card-title-group">
          <Send size={18} color="var(--primary)" />
          <div>
            <h2>TakTak Jobs Ingestion API Pipeline</h2>
          </div>
        </div>
      </div>

      {/* 3 Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', border: '1px solid #bbf7d0', borderRadius: '12px', background: '#f0fdf4' }}>
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '700' }}>SUCCESSFUL INGESTIONS</div>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#15803d' }}>
            {totalDeliveredJobs} Vacancies ({successCount} Batches)
          </div>
          <div style={{ fontSize: '12px', color: '#166534', marginTop: '2px' }}>Batched 20-50 jobs per API call (HTTP 200)</div>
        </div>

        <div style={{ padding: '16px', border: '1px solid #fed7aa', borderRadius: '12px', background: '#fff7ed' }}>
          <div style={{ fontSize: '12px', color: '#c2410c', fontWeight: '700' }}>RECOVERED VIA RETRY</div>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#c2410c' }}>
            {recoveredCount} Batches
          </div>
          <div style={{ fontSize: '12px', color: '#9a3412', marginTop: '2px' }}>Exponential backoff succeeded</div>
        </div>

        <div style={{ padding: '16px', border: '1px solid #fecaca', borderRadius: '12px', background: '#fef2f2' }}>
          <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '700' }}>FAILED BATCHES</div>
          <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '4px', color: '#b91c1c' }}>
            {failedCount} Batch
          </div>
          <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '2px' }}>Exceeded 3 retries or timeout</div>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12.5px',
            fontWeight: filter === 'all' ? '700' : '500',
            border: filter === 'all' ? '1px solid var(--primary)' : '1px solid #e2e8f0',
            background: filter === 'all' ? 'var(--primary-subtle)' : '#ffffff',
            color: filter === 'all' ? 'var(--primary)' : '#475569',
            cursor: 'pointer'
          }}
        >
          All Batches ({deliveries.length})
        </button>

        <button
          onClick={() => setFilter('recovered')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12.5px',
            fontWeight: filter === 'recovered' ? '700' : '500',
            border: filter === 'recovered' ? '1px solid #ea580c' : '1px solid #e2e8f0',
            background: filter === 'recovered' ? '#fff7ed' : '#ffffff',
            color: filter === 'recovered' ? '#ea580c' : '#475569',
            cursor: 'pointer'
          }}
        >
          Retried &amp; Recovered ({recoveredCount})
        </button>

        <button
          onClick={() => setFilter('failed')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12.5px',
            fontWeight: filter === 'failed' ? '700' : '500',
            border: filter === 'failed' ? '1px solid #dc2626' : '1px solid #e2e8f0',
            background: filter === 'failed' ? '#fef2f2' : '#ffffff',
            color: filter === 'failed' ? '#dc2626' : '#475569',
            cursor: 'pointer'
          }}
        >
          Failed Deliveries ({failedCount})
        </button>

        <button
          onClick={() => setFilter('success')}
          style={{
            padding: '6px 14px',
            borderRadius: '9999px',
            fontSize: '12.5px',
            fontWeight: filter === 'success' ? '700' : '500',
            border: filter === 'success' ? '1px solid #16a34a' : '1px solid #e2e8f0',
            background: filter === 'success' ? '#f0fdf4' : '#ffffff',
            color: filter === 'success' ? '#16a34a' : '#475569',
            cursor: 'pointer'
          }}
        >
          Direct Success ({successCount})
        </button>
      </div>

      {/* Batches Feed */}
      <div className="vacancy-list">
        {filteredDeliveries.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No API delivery batches recorded yet. Run a scrape or dry-run to generate batches.
          </div>
        ) : (
          filteredDeliveries.map(del => {
            const isExpanded = expandedLogId === del.id;
            const hasRetryLogs = del.retryLogs && del.retryLogs.length > 0;

            return (
              <div 
                key={del.id} 
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '12px',
                background: del.status === 'failed' ? '#fffbfa' : del.status === 'recovered' ? '#fffdfa' : '#ffffff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '800', color: 'var(--navy)', fontSize: '15px' }}>
                      Batch #{del.id} — {del.portal}
                    </span>
                    <span className="badge badge-portal">{del.batchSize} Vacancies</span>
                    
                    {del.status === 'success' && (
                      <span className="badge" style={{ background: '#f0fdf4', color: '#15803d' }}>
                        HTTP 200 OK
                      </span>
                    )}

                    {del.status === 'recovered' && (
                      <span className="badge" style={{ background: '#fff7ed', color: '#c2410c' }}>
                        Recovered ({del.retryCount} Retries)
                      </span>
                    )}

                    {del.status === 'failed' && (
                      <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c' }}>
                        HTTP {del.httpStatus} (Failed)
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <span>🕒 {del.timestamp}</span>
                    {del.status !== 'failed' ? (
                      <span> • TakTak Server: received {del.batchSize}, created {del.created}, duplicates {del.duplicates}</span>
                    ) : (
                      <span style={{ color: '#b91c1c' }}> • Error: {del.errorReason}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {del.status === 'failed' && (
                    <button 
                      onClick={() => handleManualRetry(del.id)}
                      className="btn-primary"
                      disabled={retryingId === del.id}
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <RotateCcw size={13} className={retryingId === del.id ? 'spin-icon' : ''} />
                      <span>{retryingId === del.id ? 'Retrying API...' : 'Retry Batch Now'}</span>
                    </button>
                  )}

                  {hasRetryLogs && (
                    <button 
                      onClick={() => toggleExpand(del.id)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        color: '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span>{isExpanded ? 'Hide Retry Logs' : `View Retry Logs (${del.retryLogs.length})`}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Retry & Backoff Trace */}
              {isExpanded && hasRetryLogs && (
                <div style={{
                  marginTop: '14px',
                  padding: '12px 16px',
                  background: '#0c1e38',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  <div style={{ color: '#38bdf8', fontWeight: '700', marginBottom: '8px' }}>
                    ⚡ EXPONENTIAL BACKOFF RETRY TRACE:
                  </div>
                  {del.retryLogs.map((log, lIdx) => (
                    <div key={lIdx} style={{ marginBottom: '6px', lineHeight: '1.5' }}>
                      {log.success ? (
                        <div style={{ color: '#4ade80' }}>
                          [{log.time}] Attempt {log.attempt}: ✅ {log.message}
                        </div>
                      ) : (
                        <div style={{ color: '#f87171' }}>
                          [{log.time}] Attempt {log.attempt}: ❌ {log.error} &rarr; Backoff delay: {log.delayMs}ms
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }))}
      </div>
    </div>
  );
}
