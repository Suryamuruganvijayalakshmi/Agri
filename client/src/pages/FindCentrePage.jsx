import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Clock, Weight, ShieldCheck, CheckCircle2, ChevronRight, Zap, RefreshCw, Sparkles, MapPin, Phone } from 'lucide-react';
import { fetchCentres } from '../services/api';
import useRealtimePolling from '../hooks/useRealtimePolling';

export default function FindCentrePage() {
  const navigate = useNavigate();
  const [filterDistrict, setFilterDistrict] = useState('ALL');

  const { data: centresData, loading, refresh, realtimePulse } = useRealtimePolling(
    fetchCentres,
    3000,
    ['centres_updated', 'centre_capacity_changed', 'appointment_booked', 'queue_updated']
  );

  const centres = Array.isArray(centresData) ? centresData : (centresData?.centres || []);

  // Compute best recommendation: open centre with lowest utilization and highest remaining capacity
  const availableCentres = centres.filter(c => c.status !== 'CLOSED');
  const recommendedCentre = [...availableCentres].sort((a, b) => {
    const utilA = (a.booked_capacity_kg || 0) / (a.daily_capacity_kg || 1);
    const utilB = (b.booked_capacity_kg || 0) / (b.daily_capacity_kg || 1);
    if (utilA !== utilB) return utilA - utilB;
    return (b.remaining_capacity_kg || 0) - (a.remaining_capacity_kg || 0);
  })[0];

  const filteredCentres = filterDistrict === 'ALL'
    ? centres
    : centres.filter(c => (c.district || '').toLowerCase() === filterDistrict.toLowerCase());

  const districts = ['ALL', ...new Set(centres.map(c => c.district).filter(Boolean))];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} /> Smart Congestion Avoidance System
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.3rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              Find Procurement Centres
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0.3rem 0 0 0' }}>
              Compare real-time capacity, live queue wait times, and select the optimal centre for rapid unloading.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '9999px' }}>
              <Zap size={12} /> {realtimePulse ? 'SYNCING...' : 'LIVE REAL-TIME'}
            </span>
            <button
              onClick={refresh}
              className="btn btn-secondary btn-sm"
              style={{ background: '#334155', color: 'white', border: 'none', padding: '0.4rem 0.75rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Centre Spotlight */}
      {recommendedCentre && (
        <div style={{
          background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
          borderRadius: '16px',
          padding: '1.5rem',
          color: 'white',
          border: '1.5px solid #10b981',
          boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem'
        }}>
          <div>
            <span style={{
              background: '#f59e0b',
              color: '#78350f',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              ⭐ AI RECOMMENDED FOR MINIMAL WAIT
            </span>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0.5rem 0 0.25rem 0' }}>
              {recommendedCentre.name}
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#a7f3d0', margin: 0 }}>
              {recommendedCentre.address || `${recommendedCentre.district}, Karnataka`} • Token Prefix: <strong>{recommendedCentre.token_prefix || 'A'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a7f3d0', fontWeight: 700 }}>REMAINING CAPACITY</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                {(recommendedCentre.remaining_capacity_kg || (recommendedCentre.daily_capacity_kg - recommendedCentre.booked_capacity_kg) || 0).toLocaleString()} kg
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a7f3d0', fontWeight: 700 }}>EST. WAIT TIME</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fef08a' }}>
                ~{recommendedCentre.est_wait_minutes || 12} mins
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#a7f3d0', fontWeight: 700 }}>IN QUEUE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>
                {recommendedCentre.queue_count || 0} Farmers
              </div>
            </div>
            <button
              onClick={() => navigate(`/farmer/appointments?centre_id=${recommendedCentre.id}`)}
              style={{
                background: '#ffffff',
                color: '#065f46',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}
            >
              Book at Recommended Centre <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 700 }}>Filter District:</span>
          {districts.map(d => (
            <button
              key={d}
              onClick={() => setFilterDistrict(d)}
              style={{
                background: filterDistrict === d ? '#16a34a' : '#f1f5f9',
                color: filterDistrict === d ? 'white' : '#475569',
                border: 'none',
                padding: '0.35rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Showing <strong>{filteredCentres.length}</strong> Procurement Centres
        </div>
      </div>

      {/* Centres Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
        {filteredCentres.map(c => {
          const isRec = recommendedCentre?.id === c.id;
          const capacityTotal = c.daily_capacity_kg || 50000;
          const capacityBooked = c.booked_capacity_kg || 0;
          const capacityRemain = Math.max(0, capacityTotal - capacityBooked);
          const utilPercent = Math.min(100, Math.round((capacityBooked / capacityTotal) * 100));

          const isClosed = c.status === 'CLOSED';
          const isHigh = utilPercent > 75 || c.status === 'HIGH_LOAD';
          const isFull = utilPercent >= 100 || c.status === 'FULL';

          const statusColor = isClosed ? '#ef4444' : isFull ? '#dc2626' : isHigh ? '#f59e0b' : '#16a34a';
          const statusBg = isClosed ? '#fee2e2' : isFull ? '#fee2e2' : isHigh ? '#fef3c7' : '#dcfce7';
          const statusLabel = isClosed ? '🔴 CLOSED' : isFull ? '🔴 FULL' : isHigh ? '🟡 HIGH LOAD' : '🟢 OPEN (RAPID)';

          return (
            <div
              key={c.id}
              className="card"
              style={{
                border: isRec ? '2px solid #10b981' : '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '1.5rem',
                position: 'relative',
                borderRadius: '14px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              {isRec && (
                <span style={{
                  position: 'absolute', top: '-10px', right: '16px',
                  background: '#10b981', color: 'white',
                  fontSize: '0.65rem', fontWeight: 900,
                  padding: '0.2rem 0.6rem', borderRadius: '9999px',
                  letterSpacing: '0.04em'
                }}>
                  ⭐ RECOMMENDED
                </span>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{
                      padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 800,
                      background: statusBg, color: statusColor, display: 'inline-block', marginBottom: '0.4rem'
                    }}>
                      {statusLabel}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {c.name}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                      CODE: {c.code} • TOKEN PREFIX: <strong>{c.token_prefix || 'A'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                  <MapPin size={14} color="#64748b" style={{ flexShrink: 0 }} />
                  <span>{c.address || `${c.district}, ${c.state}`}</span>
                </div>

                {/* Capacity Progress Bar */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <span style={{ color: '#475569' }}>Capacity Utilization</span>
                    <span style={{ color: statusColor }}>{utilPercent}% Booked</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${utilPercent}%`,
                      height: '100%',
                      background: statusColor,
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem' }}>
                    <span>Booked: <strong>{capacityBooked.toLocaleString()} kg</strong></span>
                    <span>Remaining: <strong style={{ color: '#16a34a' }}>{capacityRemain.toLocaleString()} kg</strong></span>
                  </div>
                </div>

                {/* Metric Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: '#f1f5f9', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>LIVE QUEUE</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {c.queue_count || 0} Farmers
                    </div>
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '0.6rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>EST. WAIT</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      ~{c.est_wait_minutes || 15} min
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => navigate(`/farmer/appointments?centre_id=${c.id}`)}
                disabled={isClosed || isFull}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: isClosed || isFull ? '#cbd5e1' : isRec ? '#10b981' : '#16a34a',
                  color: 'white',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: isClosed || isFull ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem'
                }}
              >
                {isClosed ? 'Centre Closed' : isFull ? 'Capacity Full' : 'Select Centre & Book Slot'}
                {!isClosed && !isFull && <ChevronRight size={16} />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
