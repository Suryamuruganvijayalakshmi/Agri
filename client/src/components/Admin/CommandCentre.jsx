import React, { useState, useEffect } from 'react';
import { Landmark, Activity, AlertTriangle, CheckCircle2, Clock, MapPin, ShieldCheck, ArrowUpRight, Filter } from 'lucide-react';
import ProcurementMap from '../Map/ProcurementMap';
import { fetchAdminMetrics } from '../../services/api';

export default function CommandCentre({ centres: liveCentres }) {
  const [metrics, setMetrics] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'GREEN', 'YELLOW', 'RED', 'CLOSED'

  const loadAdminMetrics = async () => {
    try {
      const data = await fetchAdminMetrics();
      if (data.success) {
        setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, [liveCentres]);

  const centres = liveCentres || metrics?.centres || [];

  const filteredCentres = centres.filter(c => {
    if (filterStatus === 'ALL') return true;
    return c.color_status === filterStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Admin Title Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏛️ State Agriculture Procurement Monitoring Cell
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0' }}>
              Government Command Centre & Digital Twin
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Real-time operational coordination across 10 state procurement yards • Mandya & Mysore Hub
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              🟢 {centres.filter(c => c.color_status === 'GREEN').length} Operational
            </span>
            <span className="badge badge-yellow" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              🟡 {centres.filter(c => c.color_status === 'YELLOW').length} High Load
            </span>
            <span className="badge badge-red" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              🔴 {centres.filter(c => c.color_status === 'RED').length} Full
            </span>
            <span className="badge badge-grey" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              ⚫ {centres.filter(c => c.color_status === 'GREY').length} Closed
            </span>
          </div>
        </div>
      </div>

      {/* Top Strategic KPI Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>STATE CAPACITY UTILIZATION</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {metrics?.capacityUtilizationPercent || 64}%
          </h3>
          <div className="progress-bar-bg" style={{ marginTop: '0.4rem' }}>
            <div className="progress-bar-fill progress-green" style={{ width: `${metrics?.capacityUtilizationPercent || 64}%` }} />
          </div>
          <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem', display: 'block' }}>
            {(metrics?.totalBookedKg || 250000).toLocaleString()} kg booked / {(metrics?.totalCapacityKg || 410000).toLocaleString()} kg total
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>STATE AVERAGE WAIT TIME</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {metrics?.avgWaitMinutes || 18} Minutes
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Total active queue: {metrics?.totalQueueCount || 120} farmers</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING MSP APPROVALS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', margin: '0.2rem 0' }}>
            {metrics?.pendingApprovals || 12} Procurements
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Awaiting Agricultural Officer sign-off</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING DBT PAYMENTS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ec4899', margin: '0.2rem 0' }}>
            {metrics?.pendingPayments || 18} Vouchers
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Processing in State Treasury Gateway</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>UNRESOLVED EXCEPTIONS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>
            {metrics?.unresolvedExceptions || 2} Open Issues
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Requires District Nodal clearance</span>
        </div>
      </div>

      {/* Main Command Split: Left Map & Digital Twin, Right Centre Performance Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: '1.5rem' }}>
        {/* Left: Map and Digital Twin Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3 className="card-title">
              <MapPin size={20} color="#16a34a" /> District Procurement Availability Map
            </h3>

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {['ALL', 'GREEN', 'YELLOW', 'RED', 'CLOSED'].map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: filterStatus === st ? '#0f172a' : 'white',
                    color: filterStatus === st ? 'white' : '#475569',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <ProcurementMap
            centres={filteredCentres}
            onSelectCentre={() => {}}
            onBookCentre={() => {}}
          />

          {/* Digital Twin Realtime Activity Stream */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Activity size={20} color="#6366f1" /> Live Digital Twin Operational Stream
              </h3>
              <span className="badge badge-green">Realtime Feed</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '250px', overflowY: 'auto' }}>
              {metrics?.recentEvents?.map(evt => (
                <div key={evt.id} style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ color: '#0f172a' }}>{evt.new_status}</strong>
                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ color: '#475569' }}>{evt.reason}</div>
                  <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.75rem', marginTop: '0.15rem' }}>
                    Owner: {evt.owner} • Action: {evt.next_action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Centre Performance & Exceptions Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              <Landmark size={20} color="#15803d" /> Centre Performance Matrix
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '0.5rem' }}>Yard Name</th>
                    <th style={{ padding: '0.5rem' }}>Load</th>
                    <th style={{ padding: '0.5rem' }}>Queue</th>
                    <th style={{ padding: '0.5rem' }}>Wait</th>
                  </tr>
                </thead>
                <tbody>
                  {centres.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.5rem', fontWeight: 700 }}>
                        {c.name.split(' ')[0]} {c.name.split(' ')[1]}
                      </td>
                      <td style={{ padding: '0.5rem' }}>
                        <span className={`badge badge-${c.color_status.toLowerCase()}`}>
                          {c.utilization_percent}%
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem', fontWeight: 600 }}>{c.queue_count}</td>
                      <td style={{ padding: '0.5rem', color: '#d97706', fontWeight: 700 }}>{c.est_wait_minutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Exceptions Escalation Queue */}
          <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
            <h3 className="card-title" style={{ marginBottom: '0.85rem', color: '#991b1b' }}>
              <AlertTriangle size={20} color="#dc2626" /> Open Exception Escalations
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {metrics?.exceptions?.filter(e => e.status !== 'RESOLVED').map(ex => (
                <div key={ex.id} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#7f1d1d' }}>{ex.farmer_name} ({ex.id})</strong>
                    <span className="badge badge-red">{ex.severity}</span>
                  </div>
                  <div style={{ color: '#475569', marginBottom: '0.3rem' }}>{ex.reason}</div>
                  <div style={{ color: '#991b1b', fontWeight: 700, fontSize: '0.75rem' }}>
                    Assigned Owner: {ex.owner}
                  </div>
                  <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.75rem', marginTop: '0.15rem' }}>
                    Next Action: {ex.next_action}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
