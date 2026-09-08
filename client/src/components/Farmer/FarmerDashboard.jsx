import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin, Clock, Award, Bell, ChevronRight, RefreshCw, Zap,
  CheckCircle2, CreditCard, ArrowRight, Warehouse, AlertCircle,
  FileText, Droplets, Calendar, Sparkles
} from 'lucide-react';
import { fetchFarmerDashboard } from '../../services/api';
import useRealtimePolling from '../../hooks/useRealtimePolling';
import { useLanguage } from '../../context/LanguageContext';

export default function FarmerDashboard({ centres = [] }) {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const activeFarmerId = user?.id || 'default-farmer';
  const farmerName = profile?.full_name || user?.full_name || 'Farmer';
  const farmerPhone = profile?.phone || user?.phone || '';

  // Real-time polling hook for farmer dashboard data (3s interval + socket events)
  const { data: dashData, loading, refresh, realtimePulse } = useRealtimePolling(
    () => fetchFarmerDashboard(activeFarmerId),
    3000,
    ['queue_updated', 'appointment_booked', 'payment_updated', 'centre_capacity_changed'],
    [activeFarmerId]
  );

  const activeBooking = dashData?.active_booking || null;
  const queueData = dashData?.queue || null;
  const activeProcurement = dashData?.procurement || null;
  const activePayment = dashData?.payment || null;
  const lastCompleted = dashData?.last_completed || null;
  const lastPayment = dashData?.last_payment || null;
  const history = dashData?.history || [];

  // Stage progress mapping with live multilingual support
  const stages = [
    { key: 'BOOKED', label: t.stageBooked, desc: t.stageBookedDesc },
    { key: 'WAITING', label: t.stageWaiting, desc: t.stageWaitingDesc },
    { key: 'CALLED', label: t.stageCalled, desc: t.stageCalledDesc },
    { key: 'PROCESSING', label: t.stageProcessing, desc: t.stageProcessingDesc },
    { key: 'WEIGHMENT', label: t.stageWeighment, desc: t.stageWeighmentDesc },
    { key: 'QUALITY_CHECK', label: t.stageQuality, desc: t.stageQualityDesc },
    { key: 'COMPLETED', label: t.stageCompleted, desc: t.stageCompletedDesc }
  ];

  const currentStatus = activeBooking?.status || (lastCompleted ? 'COMPLETED' : 'NOT_BOOKED');
  const currentStageIndex = stages.findIndex(s => s.key === currentStatus);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>

      {/* ── TOP HERO BANNER ──────────────────────────────────────── */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} /> Mandya District Farmer Procurement Portal
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.3rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              {t.welcome}, {farmerName}
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Farmer ID: <strong style={{ color: '#e2e8f0' }}>{activeFarmerId}</strong>
              {farmerPhone && ` • Mobile: ${farmerPhone}`}
              {user?.district && ` • District: ${user.district}`}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '9999px' }}>
              <Zap size={12} /> {realtimePulse ? 'UPDATING...' : t.liveRealtime}
            </span>
            <button
              onClick={refresh}
              className="btn btn-secondary btn-sm"
              style={{ background: '#334155', color: 'white', border: 'none', padding: '0.4rem 0.75rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            <Link
              to="/farmer/centres"
              className="btn btn-primary btn-sm"
              style={{ padding: '0.4rem 0.85rem' }}
            >
              {t.navCentres}
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4 CORE REAL-TIME STATUS CARDS ───────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>

        {/* 1. Active Token & Centre */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: activeBooking ? '5px solid #16a34a' : '5px solid #94a3b8' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.yourToken}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: activeBooking ? '#16a34a' : '#64748b', margin: '0.3rem 0', fontFamily: 'monospace' }}>
            {activeBooking ? activeBooking.token_number : 'NO TOKEN'}
          </div>
          <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600 }}>
            {activeBooking ? activeBooking.centre_name : t.noActiveBooking}
          </div>
          {activeBooking ? (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
              Slot: <strong>{activeBooking.time_slot}</strong> • {activeBooking.crop_type} ({activeBooking.declared_quantity_kg || activeBooking.quantity_kg} kg)
            </div>
          ) : (
            <Link to="/farmer/appointments" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>
              + {t.bookSlotNow} →
            </Link>
          )}
        </div>

        {/* 2. Live Queue Position */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: queueData?.your_status === 'CALLED' ? '5px solid #ef4444' : '5px solid #3b82f6' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.currentQueue}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: queueData?.your_status === 'CALLED' ? '#ef4444' : '#1e293b', margin: '0.3rem 0' }}>
            {queueData?.your_status === 'CALLED' ? (
              <span style={{ color: '#ef4444', animation: 'pulse 1s infinite' }}>🔔 YOUR TURN!</span>
            ) : queueData?.your_position > 0 ? (
              `#${queueData.your_position} in line`
            ) : activeBooking?.status === 'COMPLETED' ? (
              '✅ Completed'
            ) : (
              'Not in queue'
            )}
          </div>
          <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600 }}>
            {queueData?.your_status === 'CALLED'
              ? 'Token called! Proceed to counter.'
              : queueData?.your_position > 0
              ? `${t.estimatedWait}: ~${queueData.your_estimated_wait} mins (${queueData.total_in_queue} total)`
              : 'Queue updates in real-time'}
          </div>
          {activeBooking && (
            <Link to="/farmer/queue" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#2563eb', fontWeight: 700 }}>
              View Live Counter Screen →
            </Link>
          )}
        </div>

        {/* 3. Procurement Status */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: '5px solid #8b5cf6' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.status}
          </div>
          <div style={{ margin: '0.3rem 0' }}>
            <span style={{
              display: 'inline-block',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
              fontWeight: 800,
              background: currentStatus === 'COMPLETED' ? '#dcfce7' : currentStatus === 'CALLED' ? '#fee2e2' : currentStatus === 'PROCESSING' || currentStatus === 'WEIGHMENT' || currentStatus === 'QUALITY_CHECK' ? '#ede9fe' : '#f1f5f9',
              color: currentStatus === 'COMPLETED' ? '#166534' : currentStatus === 'CALLED' ? '#991b1b' : currentStatus === 'PROCESSING' || currentStatus === 'WEIGHMENT' || currentStatus === 'QUALITY_CHECK' ? '#6b21a8' : '#475569'
            }}>
              {currentStatus}
            </span>
          </div>
          <div style={{ fontSize: '0.825rem', color: '#334155', fontWeight: 600 }}>
            {activeProcurement?.actual_weighed_kg ? `Weighed: ${activeProcurement.actual_weighed_kg} kg` : 'Declared: ' + (activeBooking?.declared_quantity_kg || 0) + ' kg'}
            {activeProcurement?.quality_grade && activeProcurement.quality_grade !== 'Pending' ? ` • ${activeProcurement.quality_grade}` : ''}
          </div>
          <Link to="/farmer/procurement" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#7c3aed', fontWeight: 700 }}>
            {t.navProcurement} →
          </Link>
        </div>

        {/* 4. DBT Payment Status */}
        <div className="card" style={{ padding: '1.25rem', borderLeft: (activePayment?.status === 'PAID' || lastPayment?.status === 'PAID') ? '5px solid #16a34a' : '5px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {t.paymentStatus}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d', margin: '0.3rem 0' }}>
            ₹{Number(activePayment?.amount || lastPayment?.amount || ((activeBooking?.declared_quantity_kg || 2500) * 22)).toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700 }}>
            <span style={{
              padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem',
              background: (activePayment?.status || lastPayment?.status) === 'PAID' ? '#dcfce7' : (activePayment?.status || lastPayment?.status) === 'APPROVED' ? '#ccfbf1' : '#fef3c7',
              color: (activePayment?.status || lastPayment?.status) === 'PAID' ? '#166534' : (activePayment?.status || lastPayment?.status) === 'APPROVED' ? '#0f766e' : '#78350f'
            }}>
              {activePayment?.status || lastPayment?.status || 'PENDING'}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>MSP ₹2,200/Q</span>
          </div>
          <Link to="/farmer/payments" style={{ display: 'inline-block', marginTop: '0.5rem', fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
            View Payment Voucher →
          </Link>
        </div>

      </div>

      {/* ── REAL-TIME STAGE PROGRESSION TRACKER ──────────────────── */}
      {activeBooking && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {t.activeProcurementJourney}
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Synced directly with {activeBooking.centre_name} officer weighbridge and quality station
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>
              Token {activeBooking.token_number}
            </span>
          </div>

          {/* Stepper Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, 1fr)`, gap: '0.5rem', position: 'relative' }}>
            {stages.map((stg, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isFuture = idx > currentStageIndex;

              return (
                <div key={stg.key} style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    margin: '0 auto 0.4rem auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.8rem',
                    background: isCurrent ? '#16a34a' : isPast ? '#22c55e' : '#e2e8f0',
                    color: isCurrent || isPast ? 'white' : '#64748b',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(34, 197, 94, 0.25)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#16a34a' : isPast ? '#0f172a' : '#94a3b8' }}>
                    {stg.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'none' }}>
                    {stg.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prompt banner when called */}
          {activeBooking.status === 'CALLED' && (
            <div style={{
              marginTop: '1.25rem',
              background: '#fee2e2',
              border: '2px solid #ef4444',
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              animation: 'pulse 1.5s infinite'
            }}>
              <div>
                <strong style={{ color: '#991b1b', fontSize: '1rem' }}>🔔 YOUR TOKEN {activeBooking.token_number} HAS BEEN CALLED!</strong>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#7f1d1d' }}>
                  Please drive your vehicle to Counter 1 at {activeBooking.centre_name} immediately.
                </p>
              </div>
              <Link to="/farmer/queue" className="btn btn-danger btn-sm" style={{ padding: '0.5rem 1rem' }}>
                Open Counter Screen →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── FAST ACTION SHORTCUTS ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <Link
          to="/farmer/my-farm"
          className="card"
          style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #16a34a' }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#15803d' }}>🌾 My Farm — Land Marking & AI Crop Predictions</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Draw boundary on GIS satellite map, calculate acres & predict crop yields</div>
          </div>
          <ChevronRight size={20} color="#16a34a" />
        </Link>

        <Link
          to="/farmer/map"
          className="card"
          style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid #0284c7' }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0284c7' }}>🗺️ Cold Storage Facilities Map</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Explore regional cold storages, live capacity & book nearest bay</div>
          </div>
          <ChevronRight size={20} color="#0284c7" />
        </Link>

        <Link
          to="/farmer/centres"
          className="card"
          style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>🏢 {t.navCentres}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>View live wait times and capacity across all centres</div>
          </div>
          <ChevronRight size={20} color="#16a34a" />
        </Link>

        <Link
          to="/farmer/appointments"
          className="card"
          style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>📅 {t.navAppointments}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Select date, storage square, and lock in your token</div>
          </div>
          <ChevronRight size={20} color="#16a34a" />
        </Link>

        <Link
          to="/farmer/payments"
          className="card"
          style={{ padding: '1.25rem', textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>💳 {t.navPayments}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>Track state treasury payouts and bank receipts</div>
          </div>
          <ChevronRight size={20} color="#16a34a" />
        </Link>
      </div>

      {/* ── RECENT BOOKINGS & PROCUREMENT HISTORY ───────────────── */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0' }}>
          {t.recentTransactions} ({history.length})
        </h3>
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.9rem' }}>
            No previous bookings found for your account. Click <strong>"{t.bookSlotNow}"</strong> to schedule your first procurement.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.6rem' }}>{t.yourToken}</th>
                  <th style={{ padding: '0.6rem' }}>{t.centre}</th>
                  <th style={{ padding: '0.6rem' }}>Date</th>
                  <th style={{ padding: '0.6rem' }}>{t.cropType}</th>
                  <th style={{ padding: '0.6rem' }}>{t.quantity}</th>
                  <th style={{ padding: '0.6rem' }}>{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 800, fontFamily: 'monospace', color: '#16a34a' }}>
                      {item.token_number}
                    </td>
                    <td style={{ padding: '0.65rem', fontWeight: 600 }}>{item.centre_name || item.centre_id}</td>
                    <td style={{ padding: '0.65rem', color: '#64748b' }}>{item.appointment_date || item.time_slot}</td>
                    <td style={{ padding: '0.65rem' }}>{item.crop_type}</td>
                    <td style={{ padding: '0.65rem', fontWeight: 700 }}>
                      {(item.actual_weight_kg || item.declared_quantity_kg || item.quantity_kg || 0).toLocaleString()} kg
                    </td>
                    <td style={{ padding: '0.65rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800,
                        background: item.status === 'COMPLETED' ? '#dcfce7' : item.status === 'CALLED' ? '#fee2e2' : '#f1f5f9',
                        color: item.status === 'COMPLETED' ? '#166534' : item.status === 'CALLED' ? '#991b1b' : '#475569'
                      }}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
