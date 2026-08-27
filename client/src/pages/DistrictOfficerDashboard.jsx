import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, Activity, AlertTriangle, CheckCircle2, Clock, MapPin, ShieldCheck, ArrowUpRight } from 'lucide-react';
import ProcurementMap from '../components/Map/ProcurementMap';
import { fetchAdminMetrics } from '../services/api';

export default function DistrictOfficerDashboard({ centres: liveCentres }) {
  const { profile } = useAuth();
  const districtName = profile?.district || 'Mandya';

  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    fetchAdminMetrics().then(res => {
      if (res.success) setMetrics(res.metrics);
    });
  }, [liveCentres]);

  const allCentres = liveCentres || metrics?.centres || [];
  const districtCentres = allCentres.filter(c => c.district === districtName || c.district === 'Mandya');

  const operationalCount = districtCentres.filter(c => c.color_status === 'GREEN').length;
  const highLoadCount = districtCentres.filter(c => c.color_status === 'YELLOW').length;
  const fullCount = districtCentres.filter(c => c.color_status === 'RED').length;
  const closedCount = districtCentres.filter(c => c.color_status === 'GREY').length;

  const totalCap = districtCentres.reduce((s, c) => s + c.daily_capacity_kg, 0);
  const totalBooked = districtCentres.reduce((s, c) => s + (c.booked_capacity_kg || c.current_booked_kg || 0), 0);
  const utilPercent = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;
  const avgWait = districtCentres.length > 0
    ? Math.round(districtCentres.reduce((s, c) => s + c.est_wait_minutes, 0) / districtCentres.length)
    : 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.3rem' }}>District Level Jurisdiction</span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
              🏢 {districtName} District Nodal Command Centre
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Nodal Officer: <strong>{profile?.full_name || 'Dr. C. Mahadevan'}</strong> • Monitoring {districtCentres.length} District Yards
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="badge badge-green">🟢 {operationalCount} Available</span>
            <span className="badge badge-yellow">🟡 {highLoadCount} Busy</span>
            <span className="badge badge-red">🔴 {fullCount} Full</span>
            <span className="badge badge-grey">⚫ {closedCount} Closed</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DISTRICT CAPACITY UTILIZATION</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {utilPercent}%
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>{totalBooked.toLocaleString()} kg / {totalCap.toLocaleString()} kg</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>AVG DISTRICT WAIT TIME</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {avgWait} Minutes
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Across all active yards</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING DISTRICT APPROVALS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', margin: '0.2rem 0' }}>
            8 Procurements
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>MSP grade verification</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>OPEN DISTRICT EXCEPTIONS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>
            {metrics?.unresolvedExceptions || 2} Issues
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Escalated for Nodal action</span>
        </div>
      </div>

      {/* Grid: Left Map, Right District Centres List */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3 className="card-title"><MapPin size={20} color="#16a34a" /> District Live Availability Map</h3>
          </div>
          <ProcurementMap centres={districtCentres} onSelectCentre={() => {}} onBookCentre={() => {}} />
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            <Building2 size={20} color="#15803d" /> {districtName} District Centres Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {districtCentres.map(c => (
              <div key={c.id} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{c.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Queue: {c.queue_count} farmers • Est wait: {c.est_wait_minutes} mins</span>
                </div>

                <span className={`badge badge-${c.color_status.toLowerCase()}`}>
                  {c.color_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
