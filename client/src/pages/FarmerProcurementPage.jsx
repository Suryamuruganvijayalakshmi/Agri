import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchFarmerDashboard } from '../services/api';
import useRealtimePolling from '../hooks/useRealtimePolling';
import {
  Weight, Award, ShieldCheck, Clock, CheckCircle2,
  AlertCircle, RefreshCw, Zap, ArrowRight, FileText,
  CreditCard, Droplets, Warehouse, ChevronRight
} from 'lucide-react';

export default function FarmerProcurementPage() {
  const { user, profile } = useAuth();
  const farmerId = user?.id || 'default-farmer';
  const farmerName = profile?.full_name || user?.full_name || 'Farmer';

  const { data: dashData, loading, refresh, realtimePulse } = useRealtimePolling(
    () => fetchFarmerDashboard(farmerId),
    3000,
    ['queue_updated', 'payment_updated', 'appointment_booked'],
    [farmerId]
  );

  const activeBooking = dashData?.active_booking || null;
  const lastCompleted = dashData?.last_completed || null;
  const activeProcurement = dashData?.procurement || null;
  const activePayment = dashData?.payment || dashData?.last_payment || null;

  const currentItem = activeBooking || lastCompleted;
  const status = currentItem?.status || 'NOT_BOOKED';

  const stages = [
    { key: 'BOOKED', label: 'Slot Booked', desc: 'Storage bay confirmed' },
    { key: 'WAITING', label: 'In Queue', desc: 'Farmer at centre yard' },
    { key: 'CALLED', label: 'Called', desc: 'Token called to gate' },
    { key: 'PROCESSING', label: 'Processing', desc: 'Gate counter active' },
    { key: 'WEIGHMENT', label: 'Weighment', desc: 'Weighbridge measured' },
    { key: 'QUALITY_CHECK', label: 'Quality Check', desc: 'Lab moisture verified' },
    { key: 'COMPLETED', label: 'Procured', desc: 'Procurement complete' }
  ];

  const currentStageIndex = stages.findIndex(s => s.key === status);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>

      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Zap size={14} /> LIVE APMC MANDI PROCUREMENT PIPELINE
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.25rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              Procurement & Quality Verification
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Real-time telemetry tracking your produce through weighbridge, lab quality check, and payment authorization.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '9999px' }}>
              <Zap size={12} /> {realtimePulse ? 'UPDATING...' : 'LIVE SYNC'}
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

      {!currentItem ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '2.5rem' }}>📦</span>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0.75rem 0 0.25rem 0' }}>
            No Active Procurement Record
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem' }}>
            You do not currently have a booking or active procurement at any centre today.
          </p>
          <Link to="/farmer/appointments" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontWeight: 800 }}>
            Book a Procurement Slot Now →
          </Link>
        </div>
      ) : (
        <>
          {/* Active Token & Centre Overview */}
          <div className="card" style={{
            borderLeft: status === 'COMPLETED' ? '6px solid #16a34a' : status === 'CALLED' ? '6px solid #ef4444' : '6px solid #8b5cf6',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  background: status === 'COMPLETED' ? '#dcfce7' : status === 'CALLED' ? '#fee2e2' : '#ede9fe',
                  color: status === 'COMPLETED' ? '#166534' : status === 'CALLED' ? '#991b1b' : '#6b21a8',
                  marginBottom: '0.5rem'
                }}>
                  {status === 'COMPLETED' ? '🟢 PROCURED & VERIFIED' : status === 'CALLED' ? '🔔 CALLED TO GATE COUNTER' : `🟡 STAGE: ${status}`}
                </span>

                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: 'monospace' }}>
                  Token #{currentItem.token_number}
                </h2>
                <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.2rem' }}>
                  Procurement Centre: <strong>{currentItem.centre_name || currentItem.centre_id}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b' }}>
                <div>Booking ID: <strong>{currentItem.booking_id || currentItem.id}</strong></div>
                <div>Scheduled: <strong>{currentItem.appointment_date} ({currentItem.time_slot})</strong></div>
              </div>
            </div>

            {/* Stepper Progression */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: '0.5rem', textAlign: 'center' }}>
                {stages.map((stg, idx) => {
                  const isPast = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stg.key}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        margin: '0 auto 0.35rem auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.8rem',
                        background: isCurrent ? '#16a34a' : isPast ? '#22c55e' : '#e2e8f0',
                        color: isCurrent || isPast ? 'white' : '#64748b',
                        boxShadow: isCurrent ? '0 0 0 4px rgba(34, 197, 94, 0.25)' : 'none'
                      }}>
                        {isPast ? '✓' : idx + 1}
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#16a34a' : isPast ? '#0f172a' : '#94a3b8' }}>
                        {stg.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Produce & Weighment Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

            {/* Weighbridge Spec Card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Weight size={20} color="#16a34a" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Weighbridge Telemetry
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Crop Variety:</span>
                  <strong>{currentItem.crop_type}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Declared Weight:</span>
                  <strong>{(currentItem.declared_quantity_kg || currentItem.quantity_kg || 0).toLocaleString()} kg</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Actual Weighed:</span>
                  <strong style={{ color: currentItem.actual_weight_kg ? '#16a34a' : '#64748b', fontSize: '0.95rem' }}>
                    {currentItem.actual_weight_kg ? `${Number(currentItem.actual_weight_kg).toLocaleString()} kg` : 'Awaiting Weighbridge'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Difference:</span>
                  <span style={{ fontWeight: 700, color: currentItem.actual_weight_kg ? '#334155' : '#94a3b8' }}>
                    {currentItem.actual_weight_kg ? `${currentItem.actual_weight_kg - (currentItem.declared_quantity_kg || 0)} kg` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quality Inspection Card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Award size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Quality & Lab Inspection
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Quality Grade:</span>
                  <span style={{
                    padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 800, fontSize: '0.78rem',
                    background: currentItem.quality_grade ? '#ede9fe' : '#f1f5f9',
                    color: currentItem.quality_grade ? '#6b21a8' : '#64748b'
                  }}>
                    {currentItem.quality_grade || 'Pending Inspection'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Moisture Content:</span>
                  <strong>{currentItem.quality_moisture || 'Pending (Standard ≤14%)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b' }}>Inspection Status:</span>
                  <strong style={{ color: currentItem.quality_grade ? '#16a34a' : '#f59e0b' }}>
                    {currentItem.quality_grade ? 'ACCEPTED' : 'Awaiting Lab'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Inspector Station:</span>
                  <span style={{ color: '#475569' }}>APMC Field Testing Unit</span>
                </div>
              </div>
            </div>

          </div>

          {/* Payment Voucher Link Card */}
          {activePayment && (
            <div className="card" style={{
              background: '#f0fdf4',
              border: '1.5px solid #86efac',
              padding: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
                  LINKED DBT PAYMENT VOUCHER
                </span>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', margin: '0.2rem 0' }}>
                  ₹{Number(activePayment.amount).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#166534' }}>
                  Status: <strong>{activePayment.status}</strong> • Ref: {activePayment.reference_number || activePayment.id}
                </div>
              </div>

              <Link
                to="/farmer/payments"
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                View Full Payment Receipt <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </>
      )}

    </div>
  );
}
