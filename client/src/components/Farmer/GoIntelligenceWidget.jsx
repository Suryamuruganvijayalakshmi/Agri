import React, { useEffect, useState } from 'react';
import { Compass, CheckCircle2, AlertTriangle, Clock, ArrowRight, RefreshCw, MapPin } from 'lucide-react';
import { fetchGoIntelligence } from '../../services/api';

export default function GoIntelligenceWidget({ centreId, onSelectAlternative }) {
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadIntelligence = async () => {
    setLoading(true);
    try {
      const data = await fetchGoIntelligence(centreId || 'centre-1');
      if (data.success) {
        setIntelligence(data.intelligence);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntelligence();
  }, [centreId]);

  if (loading) {
    return (
      <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
        <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Evaluating Go / Don't-Go Intelligence...</p>
      </div>
    );
  }

  if (!intelligence) return null;

  const isGo = intelligence.decision === 'GO';
  const isCaution = intelligence.decision === 'CAUTION';

  const bgGradient = isGo
    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
    : isCaution
    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
    : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';

  const borderColor = isGo ? '#bbf7d0' : isCaution ? '#fde68a' : '#fecaca';
  const titleColor = isGo ? '#14532d' : isCaution ? '#78350f' : '#7f1d1d';

  return (
    <div className="card" style={{ background: bgGradient, borderColor, padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Compass size={22} color={titleColor} />
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: titleColor, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            🌾 SHOULD I GO NOW? INTELLIGENCE
          </span>
        </div>
        <span className={`badge badge-${intelligence.color_status.toLowerCase()}`}>
          {intelligence.centre_name}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'white', padding: '0.65rem', borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
          {isGo ? (
            <CheckCircle2 size={32} color="#16a34a" />
          ) : (
            <AlertTriangle size={32} color={isCaution ? '#d97706' : '#dc2626'} />
          )}
        </div>

        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: titleColor, margin: 0 }}>
            {intelligence.title}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.2rem' }}>
            {intelligence.summary}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem', border: `1px solid ${borderColor}` }}>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Queue Length:</span>
          <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{intelligence.queue_count} farmers</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Estimated Wait:</span>
          <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{intelligence.est_wait_minutes} minutes</strong>
        </div>
        <div>
          <span style={{ color: '#64748b', display: 'block' }}>Active Counters:</span>
          <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{intelligence.active_counters} open</strong>
        </div>
      </div>

      {/* Operational Advice Bullet Points */}
      <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1rem' }}>
        <strong style={{ color: titleColor, display: 'block', marginBottom: '0.3rem' }}>Operational Guidance:</strong>
        <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
          {intelligence.recommendation_notes.map((note, idx) => (
            <li key={idx} style={{ marginBottom: '0.25rem' }}>{note}</li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {isGo ? (
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }}>
            <MapPin size={14} /> Open Live GPS Directions to Yard
          </button>
        ) : (
          <>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onSelectAlternative}>
              View Recommended Alternative
            </button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }}>
              Reschedule Slot
            </button>
          </>
        )}
      </div>
    </div>
  );
}
