import React, { useState, useEffect } from 'react';
import { AlertTriangle, ArrowRight, RefreshCw, CheckCircle2, ShieldCheck, MapPin, Warehouse } from 'lucide-react';
import { fetchCentres, reallocateStorageAPI } from '../../services/api';

export default function DeviationReallocationModal({ isOpen, onClose, appointment, onReallocated }) {
  const [centres, setCentres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [reallocating, setReallocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAlternativeCentres();
    }
  }, [isOpen]);

  const loadAlternativeCentres = async () => {
    try {
      setLoading(true);
      const res = await fetchCentres();
      if (res.success && res.centres) {
        // Filter out current appointment centre & closed centres, pick open ones
        const altList = res.centres
          .filter(c => c.id !== appointment?.centre_id && c.status !== 'CLOSED')
          .slice(0, 10);
        setCentres(altList);
        if (altList.length > 0) setSelectedTargetId(altList[0].id);
      }
    } catch (err) {
      console.error('Failed to load alternative centres:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReallocation = async () => {
    if (!appointment || !selectedTargetId) return;
    setReallocating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await reallocateStorageAPI({
        appointment_id: appointment.id || appointment.appointment_id,
        target_centre_id: selectedTargetId
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to re-allocate storage.');
      } else {
        setSuccessMsg(res.message);
        if (onReallocated) onReallocated(res);
        setTimeout(() => {
          onClose();
        }, 1800);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error reallocating storage.');
    } finally {
      setReallocating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '580px', width: '90%', borderRadius: '16px', padding: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={22} color="#dc2626" /> REALTIME STORAGE DEVIATION & RE-ALLOCATION
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
              Congestion or processing delay detected at current yard. Switch to an alternative available storage instantly!
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Current Appointment Banner */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.82rem' }}>
          <div style={{ color: '#991b1b', fontWeight: 800, marginBottom: '0.2rem' }}>
            Current Booking: {appointment?.booking_id || 'AGR-2026-9042'} ({appointment?.centre_name || 'Mandya Central Yard'})
          </div>
          <div style={{ color: '#7f1d1d' }}>
            ⚠️ Congestion Deviation: High yard density detected. Transferring seat booking will lock a position at the new storage without losing your queue priority!
          </div>
        </div>

        {successMsg ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d', padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: '0 auto 0.5rem auto' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.4rem 0' }}>Re-allocation Successful!</h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>{successMsg}</p>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '0.5rem' }}>
              Select Alternative Storage Facility ({centres.length} Available)
            </label>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} /> Loading alternative storage centers...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '260px', overflowY: 'auto', marginBottom: '1.25rem' }}>
                {centres.map((c) => {
                  const isSelected = selectedTargetId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedTargetId(c.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block' }}>{c.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>📍 {c.district || c.address} • Wait time: ~{c.est_wait_minutes || 10} mins</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', background: c.color_status === 'GREEN' ? '#dcfce7' : '#fef9c3', color: c.color_status === 'GREEN' ? '#15803d' : '#854d0e' }}>
                        {c.color_status === 'GREEN' ? 'FAST Intake' : 'Moderate'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {errorMsg && (
              <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.65rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={onClose} style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}>
                Cancel
              </button>
              <button
                onClick={handleConfirmReallocation}
                disabled={reallocating || !selectedTargetId}
                style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                {reallocating ? <RefreshCw size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {reallocating ? 'Re-allocating Storage...' : 'Confirm Realtime Re-allocation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
