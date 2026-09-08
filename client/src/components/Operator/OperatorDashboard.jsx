import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, Users, Weight, ShieldCheck, AlertTriangle, Play, RefreshCw,
  CheckCircle2, ChevronRight, Sliders, RotateCcw, Zap, CreditCard, ArrowRight,
  Droplets, Award, UserPlus, Lock, Search, Filter, Check, Banknote, FileCheck,
  CheckCircle, Clock, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchLiveQueueForCentre, nextFarmerInQueue, startProcessingFarmer,
  recordWeighmentAPI, recordQualityAPI, completeProcurementAPI,
  updatePaymentStatusAPI, fetchCentrePaymentsAPI, seedDemoFarmersAPI,
  resetCentreAPI, updateOperatorCentreStatus
} from '../../services/api';
import useRealtimePolling from '../../hooks/useRealtimePolling';

const STATUS_STEPS = [
  { key: 'WAITING', label: 'In Queue', icon: '🕐', color: '#f59e0b' },
  { key: 'CALLED', label: 'Called', icon: '🔔', color: '#3b82f6' },
  { key: 'PROCESSING', label: 'Processing', icon: '⚙️', color: '#8b5cf6' },
  { key: 'WEIGHMENT', label: 'Weighment', icon: '⚖️', color: '#06b6d4' },
  { key: 'QUALITY_CHECK', label: 'Quality', icon: '🔬', color: '#10b981' },
  { key: 'COMPLETED', label: 'Done', icon: '✅', color: '#22c55e' }
];

export default function OperatorDashboard({ centres = [], selectedCentreId = 'centre-1', onDataChanged }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active station from URL pathname
  const activeTab = location.pathname.includes('/queue')
    ? 'queue'
    : location.pathname.includes('/weighment')
    ? 'weighment'
    : location.pathname.includes('/quality')
    ? 'quality'
    : (location.pathname.includes('/payments') || location.pathname.includes('/payment'))
    ? 'payments'
    : 'console';

  const isAssigned = Boolean(user?.assigned_centre_id);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'STATE_ADMIN';

  const [centreId, setCentreId] = useState(
    user?.assigned_centre_id || localStorage.getItem('agriflow_selected_centre_id') || selectedCentreId || 'centre-1'
  );

  useEffect(() => {
    if (user?.assigned_centre_id) {
      setCentreId(user.assigned_centre_id);
      localStorage.setItem('agriflow_selected_centre_id', user.assigned_centre_id);
    }
  }, [user?.assigned_centre_id]);

  const centre = centres.find(c => c.id === centreId) || centres[0] || { id: centreId, name: 'Procurement Centre' };

  // Realtime queue polling
  const fetchQueue = useCallback(() => fetchLiveQueueForCentre(centreId), [centreId]);
  const { data: queueData, loading: loadingQueue, realtimePulse, refresh: refreshQueue } = useRealtimePolling(
    fetchQueue, 3000, ['queue_updated', 'appointment_booked', 'payment_updated'], [centreId]
  );

  // Processing actions state
  const [actionLoading, setActionLoading] = useState('');
  const [actionNotice, setActionNotice] = useState(null);
  const [weighmentKg, setWeighmentKg] = useState('');
  const [tareKg, setTareKg] = useState('1250');
  const [grossKg, setGrossKg] = useState('');
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [qualityMoisture, setQualityMoisture] = useState('13%');
  const [foreignMatter, setForeignMatter] = useState('0.5%');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Payments ledger state
  const [paymentsList, setPaymentsList] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [paymentSearch, setPaymentSearch] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetchCentrePaymentsAPI(centreId);
      if (res.success) setPaymentsList(res.payments || []);
    } catch (e) {
      console.warn('[Payments Fetch]', e.message);
    }
  }, [centreId]);

  useEffect(() => {
    fetchPayments();
  }, [centreId, fetchPayments, queueData]);

  const notify = (msg) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4500);
  };

  // ── CORE PIPELINE ACTIONS ──────────────────────────────────────

  // Station 1: Call Next Farmer from Queue
  const handleNextFarmer = async () => {
    setActionLoading('next');
    const res = await nextFarmerInQueue(centreId);
    if (res.success) {
      notify(res.message || '🔔 Next farmer called!');
    } else {
      notify(`❌ ${res.error || 'No farmers in queue.'}`);
    }
    refreshQueue();
    if (onDataChanged) onDataChanged();
    setActionLoading('');
  };

  const handleStartProcessing = async () => {
    setActionLoading('process');
    const res = await startProcessingFarmer(centreId, queueData?.currently_processing?.appointment_id);
    if (res.success) notify(res.message);
    else notify(`❌ ${res.error}`);
    refreshQueue();
    setActionLoading('');
  };

  // Station 2: Record Weighment
  const handleRecordWeighment = async (valKg) => {
    const weightToSubmit = valKg || weighmentKg || (grossKg && tareKg ? Number(grossKg) - Number(tareKg) : null);
    if (!weightToSubmit || Number(weightToSubmit) <= 0) {
      return notify('❌ Enter valid actual net weight in kg.');
    }
    setActionLoading('weigh');
    const res = await recordWeighmentAPI(centreId, queueData?.currently_processing?.appointment_id, Number(weightToSubmit));
    if (res.success) {
      notify(`⚖️ ${res.message || 'Weighment recorded successfully!'}`);
      setWeighmentKg('');
      setGrossKg('');
    } else {
      notify(`❌ ${res.error}`);
    }
    refreshQueue();
    setActionLoading('');
  };

  // Station 3: Quality Check
  const handleRecordQuality = async () => {
    setActionLoading('quality');
    const res = await recordQualityAPI(centreId, queueData?.currently_processing?.appointment_id, qualityGrade, qualityMoisture);
    if (res.success) {
      notify(`🔬 ${res.message || 'Quality check certified!'}`);
    } else {
      notify(`❌ ${res.error}`);
    }
    refreshQueue();
    setActionLoading('');
  };

  // Station 4: Complete Procurement & DBT Issuance
  const handleCompleteProcurement = async () => {
    setActionLoading('complete');
    const res = await completeProcurementAPI(centreId, queueData?.currently_processing?.appointment_id);
    if (res.success) {
      notify(`✅ ${res.message || 'Procurement completed! DBT Payment voucher generated.'}`);
      fetchPayments();
    } else {
      notify(`❌ ${res.error}`);
    }
    refreshQueue();
    if (onDataChanged) onDataChanged();
    setActionLoading('');
  };

  // Station 4: Confirm & Approve DBT Payment
  const handleApprovePayment = async (paymentId) => {
    setActionLoading(`approve-${paymentId}`);
    const res = await updatePaymentStatusAPI(paymentId, 'APPROVED');
    if (res.success) {
      notify('🛡️ Payment APPROVED! Direct Benefit Transfer initiated to State Treasury.');
      refreshQueue();
      fetchPayments();
    } else {
      notify(`❌ ${res.error || 'Failed to approve payment.'}`);
    }
    setActionLoading('');
  };

  // Station 4: Confirm Disbursed / Mark PAID
  const handleDisbursePayment = async (paymentId) => {
    setActionLoading(`pay-${paymentId}`);
    const res = await updatePaymentStatusAPI(paymentId, 'PAID');
    if (res.success) {
      notify('🎉 Payment DISBURSED! Funds credited via DBT & SMS confirmation dispatched.');
      refreshQueue();
      fetchPayments();
    } else {
      notify(`❌ ${res.error || 'Failed to disburse payment.'}`);
    }
    setActionLoading('');
  };

  const handleSeedDemoFarmers = async () => {
    setActionLoading('seed');
    const res = await seedDemoFarmersAPI(centreId, 10);
    if (res.success) notify(`✅ ${res.farmers?.length || 0} demo farmers added!`);
    else notify(`❌ ${res.error}`);
    refreshQueue();
    if (onDataChanged) onDataChanged();
    setActionLoading('');
  };

  const handleResetCentre = async () => {
    setActionLoading('reset');
    const res = await resetCentreAPI(centreId);
    if (res.success) {
      notify('✅ Centre reset to clean state!');
      setShowResetConfirm(false);
      fetchPayments();
    } else {
      notify(`❌ ${res.error}`);
    }
    refreshQueue();
    if (onDataChanged) onDataChanged();
    setActionLoading('');
  };

  const cp = queueData?.currently_processing;
  const queue = queueData?.queue_entries || [];
  const totalInQueue = queueData?.total_in_queue || 0;
  const completedToday = queueData?.completed_today || 0;

  const getCurrentStepIndex = (status) => STATUS_STEPS.findIndex(s => s.key === status);

  // Filtered payments
  const filteredPayments = paymentsList.filter(p => {
    if (paymentFilter !== 'ALL' && p.status !== paymentFilter) return false;
    if (paymentSearch) {
      const q = paymentSearch.toLowerCase();
      return (p.farmer_name || '').toLowerCase().includes(q) ||
             (p.reference_number || '').toLowerCase().includes(q) ||
             (p.id || '').toLowerCase().includes(q) ||
             (p.crop || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <div className="card" style={{ background: '#0f172a', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
              <span className="badge badge-green">Official Procurement Station</span>
              <span style={{ fontSize: '0.75rem', background: '#1e293b', color: '#94a3b8', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #334155' }}>
                End-to-End Gov Pipeline
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              <Building2 size={22} style={{ verticalAlign: 'middle', marginRight: 8, color: '#4ade80' }} />
              {centre.name}
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Facility Code: <strong>{centre.code}</strong> • Assigned Officer: <strong>{user?.full_name || user?.email || 'Govt Officer'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!isAdmin && isAssigned ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(22, 163, 74, 0.15)',
                border: '1.5px solid #16a34a',
                padding: '0.45rem 0.9rem',
                borderRadius: '10px',
                boxShadow: '0 0 12px rgba(22, 163, 74, 0.2)'
              }}>
                <Lock size={15} color="#4ade80" />
                <span style={{ fontSize: '0.8rem', color: '#86efac', fontWeight: 800 }}>
                  Station: {centre.name}
                </span>
                <span style={{ background: '#166534', color: '#bbf7d0', fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                  LOCKED
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid #334155' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>Facility:</span>
                <select
                  value={centreId}
                  onChange={(e) => {
                    setCentreId(e.target.value);
                    localStorage.setItem('agriflow_selected_centre_id', e.target.value);
                  }}
                  style={{
                    background: '#0f172a',
                    color: '#38bdf8',
                    border: '1px solid #0284c7',
                    borderRadius: '6px',
                    padding: '0.35rem 0.6rem',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {centres.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.district || 'Mandya'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {realtimePulse && <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 700 }}>● LIVE</span>}
            <button onClick={() => { refreshQueue(); fetchPayments(); }} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* 5-Station Interactive Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: '#162032',
        padding: '0.45rem',
        borderRadius: '14px',
        border: '1px solid #334155',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => navigate('/operator/appointments')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            border: activeTab === 'console' ? '1.5px solid #16a34a' : '1px solid transparent',
            background: activeTab === 'console' ? 'linear-gradient(135deg, #166534, #15803d)' : 'transparent',
            color: activeTab === 'console' ? '#ffffff' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Sliders size={16} /> 1. Console
        </button>

        <button
          type="button"
          onClick={() => navigate('/operator/queue')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            border: activeTab === 'queue' ? '1.5px solid #0284c7' : '1px solid transparent',
            background: activeTab === 'queue' ? 'linear-gradient(135deg, #0369a1, #0284c7)' : 'transparent',
            color: activeTab === 'queue' ? '#ffffff' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={16} /> 2. Realtime Queue ({totalInQueue})
        </button>

        <button
          type="button"
          onClick={() => navigate('/operator/weighment')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            border: activeTab === 'weighment' ? '1.5px solid #0891b2' : '1px solid transparent',
            background: activeTab === 'weighment' ? 'linear-gradient(135deg, #0e7490, #06b6d4)' : 'transparent',
            color: activeTab === 'weighment' ? '#ffffff' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <Weight size={16} /> 3. Weighbridge
        </button>

        <button
          type="button"
          onClick={() => navigate('/operator/quality')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            border: activeTab === 'quality' ? '1.5px solid #059669' : '1px solid transparent',
            background: activeTab === 'quality' ? 'linear-gradient(135deg, #047857, #10b981)' : 'transparent',
            color: activeTab === 'quality' ? '#ffffff' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={16} /> 4. Quality Check
        </button>

        <button
          type="button"
          onClick={() => navigate('/operator/payments')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            border: activeTab === 'payments' ? '1.5px solid #9333ea' : '1px solid transparent',
            background: activeTab === 'payments' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : 'transparent',
            color: activeTab === 'payments' ? '#ffffff' : '#94a3b8',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <CreditCard size={16} /> 5. Payment Steps
        </button>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div style={{
          background: actionNotice.startsWith('❌') ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${actionNotice.startsWith('❌') ? '#fecaca' : '#86efac'}`,
          color: actionNotice.startsWith('❌') ? '#991b1b' : '#166534',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontWeight: 700,
          fontSize: '0.92rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          {actionNotice}
        </div>
      )}

      {/* Overview Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '0.9rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>IN QUEUE</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f59e0b' }}>{totalInQueue}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '0.9rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>CURRENT AT STATION</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#8b5cf6' }}>{cp ? cp.token_number : 'None'}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '0.9rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>STAGE</div>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.3rem' }}>
            {cp ? (STATUS_STEPS.find(s => s.key === cp.status)?.label || cp.status) : 'Idle'}
          </div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '0.9rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>COMPLETED TODAY</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#22c55e' }}>{completedToday}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '0.9rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>DBT PAYMENTS</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#a855f7' }}>{paymentsList.length}</div>
        </div>
      </div>

      {/* ── STATION 1: REALTIME QUEUE VIEW ────────────────────────────── */}
      {activeTab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ background: '#0f172a', color: 'white', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8' }}>
                  <Users size={22} /> Live Farmer Queue Management
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                  Call farmers sequentially to the weighbridge counter and track estimated wait times.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={handleNextFarmer}
                  disabled={actionLoading === 'next' || queue.length === 0}
                  className="btn btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    padding: '0.75rem 1.4rem',
                    fontSize: '1rem',
                    fontWeight: 800
                  }}
                >
                  <Play size={18} /> {actionLoading === 'next' ? 'Calling...' : '📢 CALL NEXT FARMER'}
                </button>
                <button onClick={handleSeedDemoFarmers} disabled={actionLoading === 'seed'} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                  <UserPlus size={15} /> Add Demo Farmers
                </button>
              </div>
            </div>
          </div>

          {/* Currently Called Banner if exists */}
          {cp && (
            <div className="card" style={{ background: '#1e1b4b', border: '2px solid #818cf8', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: '#4f46e5', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '1.6rem', fontWeight: 900 }}>
                    {cp.token_number}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#a5b4fc', fontWeight: 700, textTransform: 'uppercase' }}>CURRENTLY AT STATION</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{cp.farmer_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#c7d2fe' }}>
                      {cp.crop_type} • Declared: {(cp.declared_quantity_kg || cp.quantity_kg)?.toLocaleString()} kg • Status: <strong>{cp.status}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button
                    onClick={() => navigate('/operator/weighment')}
                    className="btn btn-primary"
                    style={{ background: '#0891b2', fontWeight: 800 }}
                  >
                    <Weight size={16} /> Direct to Weighbridge Station <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Queue List */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} color="#0284c7" /> Farmers Waiting in Line ({queue.length})
            </h3>

            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <Users size={48} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                <h4 style={{ margin: '0 0 0.4rem 0', color: '#475569' }}>The queue is currently empty</h4>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>Click "Add Demo Farmers" to populate test farmers or wait for farmer bookings.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {queue.map((entry, idx) => (
                  <div
                    key={entry.appointment_id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1.2rem',
                      borderRadius: '12px',
                      background: idx === 0 ? '#f0fdf4' : '#f8fafc',
                      border: idx === 0 ? '2px solid #86efac' : '1px solid #e2e8f0',
                      boxShadow: idx === 0 ? '0 4px 12px rgba(22, 163, 74, 0.1)' : 'none',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        background: idx === 0 ? '#16a34a' : '#334155',
                        color: 'white',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '8px',
                        fontWeight: 900,
                        fontSize: '1.1rem',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}>
                        {entry.token_number}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                          {entry.farmer_name}
                          {entry.farmer_phone && (
                            <span style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 500, marginLeft: '0.5rem' }}>
                              📱 {entry.farmer_phone}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                          🌾 <strong>{entry.crop_type || 'Paddy'}</strong> • Declared: {(entry.declared_quantity_kg || entry.quantity_kg || 2500)?.toLocaleString()} kg
                          {entry.position_number && <span style={{ color: '#16a34a', marginLeft: '0.5rem', fontWeight: 700 }}>[Storage Bay #{entry.position_number}]</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: idx === 0 ? '#15803d' : '#64748b' }}>
                          #{entry.queue_position || idx + 1} in line
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          ~{entry.estimated_wait_minutes || (idx + 1) * 12} min wait
                        </div>
                      </div>
                      {idx === 0 && (
                        <button
                          onClick={handleNextFarmer}
                          disabled={actionLoading === 'next'}
                          className="btn btn-primary"
                          style={{
                            background: '#16a34a',
                            fontSize: '0.85rem',
                            padding: '0.45rem 0.9rem',
                            fontWeight: 800
                          }}
                        >
                          {actionLoading === 'next' ? 'Calling...' : '📢 Call Now'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATION 2: WEIGHBRIDGE VIEW ───────────────────────────────── */}
      {activeTab === 'weighment' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem' }}>
          {/* Left Scale Control Panel */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0891b2' }}>
                <Weight size={22} /> Heavy Duty Digital Weighbridge Terminal
              </h2>
              <span className="badge badge-blue">Bay Scale #01 • Calibrated</span>
            </div>

            {/* Scale Digital Readout Screen */}
            <div style={{
              background: '#020617',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '2px solid #0891b2',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.2)',
              color: '#38bdf8',
              fontFamily: 'monospace'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', fontWeight: 700, marginBottom: '0.5rem' }}>
                <span>METTLER TOLEDO DIGITAL TERMINAL</span>
                <span>STATUS: STABLE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.5rem', margin: '1rem 0' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 900, color: '#38bdf8', textShadow: '0 0 10px rgba(56, 189, 248, 0.6)' }}>
                  {weighmentKg || (cp?.actual_weight_kg) || (grossKg && tareKg ? Math.max(0, Number(grossKg) - Number(tareKg)) : (cp?.declared_quantity_kg || 2500))}
                </span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0284c7' }}>KG NET</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid #1e293b', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                <div>GROSS: <strong>{grossKg || (Number(weighmentKg || cp?.actual_weight_kg || cp?.declared_quantity_kg || 2500) + Number(tareKg))} KG</strong></div>
                <div style={{ textAlign: 'right' }}>TARE DEDUCTION: <strong>{tareKg} KG</strong></div>
              </div>
            </div>

            {/* Current Farmer at Scale */}
            {cp ? (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#0891b2', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', fontWeight: 900, fontSize: '1.2rem' }}>
                    {cp.token_number}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{cp.farmer_name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      Crop: <strong>{cp.crop_type}</strong> • Declared Quantity: <strong>{(cp.declared_quantity_kg || cp.quantity_kg)?.toLocaleString()} kg</strong>
                    </div>
                  </div>
                </div>

                {/* Weighment Input & Presets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
                    Gross Vehicle Weight (Tractor/Truck + Produce in kg):
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="number"
                      placeholder="e.g. 3750"
                      value={grossKg}
                      onChange={(e) => {
                        setGrossKg(e.target.value);
                        if (e.target.value && tareKg) {
                          setWeighmentKg(String(Math.max(0, Number(e.target.value) - Number(tareKg))));
                        }
                      }}
                      style={{ flex: 1, padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Tare:</span>
                      <input
                        type="number"
                        value={tareKg}
                        onChange={(e) => {
                          setTareKg(e.target.value);
                          if (grossKg && e.target.value) {
                            setWeighmentKg(String(Math.max(0, Number(grossKg) - Number(e.target.value))));
                          }
                        }}
                        style={{ width: '85px', padding: '0.6rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginTop: '0.4rem' }}>
                    Quick Net Weight Presets:
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[1500, 2000, 2500, 3200, 4500, 5000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setWeighmentKg(String(val));
                          setGrossKg(String(val + Number(tareKg)));
                        }}
                        style={{
                          background: weighmentKg === String(val) ? '#0891b2' : '#f1f5f9',
                          color: weighmentKg === String(val) ? 'white' : '#334155',
                          border: '1px solid #cbd5e1',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {val.toLocaleString()} kg
                      </button>
                    ))}
                  </div>

                  {/* Primary Action Button */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.6rem' }}>
                    <button
                      onClick={() => handleRecordWeighment()}
                      disabled={actionLoading === 'weigh'}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        background: '#0891b2',
                        padding: '0.75rem',
                        fontSize: '0.95rem',
                        fontWeight: 800
                      }}
                    >
                      <Weight size={17} /> {actionLoading === 'weigh' ? 'Recording Scale Data...' : 'Confirm & Record Weight'}
                    </button>
                  </div>

                  {/* If weighment completed, show Next Station button */}
                  {(cp.status === 'WEIGHMENT' || cp.actual_weight_kg) && (
                    <div style={{ marginTop: '0.75rem', background: '#ecfeff', border: '1.5px solid #a5f3fc', padding: '0.85rem', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ color: '#0e7490', fontWeight: 800, fontSize: '0.92rem' }}>
                            ✅ Net Weight Recorded: {cp.actual_weight_kg || weighmentKg} kg
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#155e75' }}>
                            Weighment slip generated. Farmer is cleared for moisture and quality inspection.
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/operator/quality')}
                          className="btn btn-primary"
                          style={{ background: '#059669', fontWeight: 800, fontSize: '0.85rem' }}
                        >
                          <ShieldCheck size={16} /> Proceed to Quality Check →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                <Weight size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <h4 style={{ color: '#475569', margin: '0 0 0.25rem 0' }}>Scale is currently idle</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>Call the next farmer from the queue to start weighing.</p>
                <button
                  onClick={handleNextFarmer}
                  disabled={actionLoading === 'next' || queue.length === 0}
                  className="btn btn-primary"
                  style={{ background: '#0891b2' }}
                >
                  <Play size={16} /> Call Next Farmer ({totalInQueue} waiting)
                </button>
              </div>
            )}
          </div>

          {/* Right Reference Guidelines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                Standard Tare Deductions
              </h4>
              <ul style={{ fontSize: '0.82rem', color: '#475569', paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
                <li>Tractor Single Trolley: <strong>1,250 kg</strong> standard tare</li>
                <li>Tractor Double Trolley: <strong>2,100 kg</strong> standard tare</li>
                <li>Mini Truck (e.g. Tata Ace): <strong>850 kg</strong> standard tare</li>
                <li>Bag Packaging: <strong>0.8 kg per jute sack</strong> allowance</li>
              </ul>
            </div>

            <div className="card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#166534' }}>
                Tolerance & Legal Metrology
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#166534', margin: 0, lineHeight: 1.5 }}>
                Weights are audited under Legal Metrology Act 2009. Automated tare subtraction ensures zero weight fraud for farmers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STATION 3: QUALITY CHECK VIEW ─────────────────────────────── */}
      {activeTab === 'quality' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.25rem' }}>
          {/* Left Quality Inspection Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669' }}>
                <ShieldCheck size={22} /> Moisture & Grading Quality Lab
              </h2>
              <span className="badge badge-green">Govt Procurement Standards</span>
            </div>

            {cp ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Farmer Info */}
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '12px', border: '1.5px solid #86efac' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span className="badge badge-green" style={{ marginBottom: '0.2rem' }}>Token {cp.token_number}</span>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{cp.farmer_name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                        Produce: <strong>{cp.crop_type}</strong> • Net Weight: <strong>{(cp.actual_weight_kg || cp.quantity_kg || 2500)?.toLocaleString()} kg</strong>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Status:</div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>{cp.status}</span>
                    </div>
                  </div>
                </div>

                {/* Quality Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                      Moisture Content (%)
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={qualityMoisture}
                        onChange={e => setQualityMoisture(e.target.value)}
                        placeholder="13%"
                        style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginTop: '0.25rem' }}>
                      ✓ Standard: ≤ 14.0% Max allowed for MSP
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                      Procurement Grade
                    </label>
                    <select
                      value={qualityGrade}
                      onChange={e => setQualityGrade(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem', fontWeight: 700 }}
                    >
                      <option value="Grade A">Grade A (Premium FAQ — 100% MSP)</option>
                      <option value="Grade B">Grade B (Standard FAQ — 95% MSP)</option>
                      <option value="Grade C">Grade C (Commercial — 85% MSP)</option>
                      <option value="Rejected">Rejected (Moisture &gt; 17%)</option>
                    </select>
                  </div>
                </div>

                {/* Additional Inspection Parameters */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                      Foreign Matter / Chaff (%)
                    </label>
                    <input
                      type="text"
                      value={foreignMatter}
                      onChange={e => setForeignMatter(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                      Visual Purity & Discoloration
                    </label>
                    <select style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.95rem' }}>
                      <option>Clean, lustrous golden grain (PASS)</option>
                      <option>Minor discoloration &lt; 2% (PASS)</option>
                      <option>Significant insect damage (FAIL)</option>
                    </select>
                  </div>
                </div>

                {/* Submit Quality Report Button */}
                <button
                  onClick={handleRecordQuality}
                  disabled={actionLoading === 'quality'}
                  className="btn btn-primary"
                  style={{
                    background: '#059669',
                    padding: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    marginTop: '0.5rem'
                  }}
                >
                  <ShieldCheck size={18} /> {actionLoading === 'quality' ? 'Certifying Quality...' : 'Certify & Submit Quality Report'}
                </button>

                {/* If Quality already done, show Proceed to Payment Button */}
                {(cp.status === 'QUALITY_CHECK' || cp.quality_grade) && (
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ color: '#166534', fontWeight: 800, fontSize: '0.95rem' }}>
                          ✅ Quality Certified: {cp.quality_grade || qualityGrade} ({cp.quality_moisture || qualityMoisture} Moisture)
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                          Produce is verified for MSP Direct Benefit Transfer approval.
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/operator/payments')}
                        className="btn btn-primary"
                        style={{ background: '#7e22ce', fontWeight: 800, fontSize: '0.88rem' }}
                      >
                        <CreditCard size={16} /> Proceed to Payment Confirmation →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                <ShieldCheck size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <h4 style={{ color: '#475569', margin: '0 0 0.25rem 0' }}>No produce currently in Quality Lab</h4>
                <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0' }}>Weigh a farmer first at the weighbridge to send produce for inspection.</p>
                <button onClick={() => navigate('/operator/weighment')} className="btn btn-primary" style={{ background: '#0891b2' }}>
                  <Weight size={16} /> Go to Weighbridge Station
                </button>
              </div>
            )}
          </div>

          {/* Right Quality Reference Guidelines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                Government MSP Quality Specifications
              </h4>
              <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div>• Moisture: <strong>14.0% Maximum</strong></div>
                <div>• Foreign Matter: <strong>1.0% Maximum (Inorganic: 0.5%)</strong></div>
                <div>• Damaged / Discolored Grains: <strong>3.0% Maximum</strong></div>
                <div>• Broken Grains: <strong>15.0% Maximum</strong></div>
              </div>
            </div>

            <div className="card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#1e40af' }}>
                Digital Audit Trail
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#1e3a8a', margin: 0, lineHeight: 1.5 }}>
                Every quality report is logged with inspector credentials, timestamp, and moisture sample metrics to eliminate manual tampering.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STATION 4: PAYMENT CONFIRMATION VIEW ───────────────────────── */}
      {activeTab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Current Procurement Payment Settlement Card */}
          <div className="card" style={{ background: '#0f172a', color: 'white', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-green" style={{ marginBottom: '0.3rem' }}>DBT Direct Benefit Transfer Portal</span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#c084fc' }}>
                  <CreditCard size={22} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  Officer Payment Confirmation & Settlement
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Confirm final procurement acceptance, approve DBT vouchers, and disburse bank transfers to farmers.
                </p>
              </div>

              {/* Action Buttons for Current Processing Farmer */}
              {cp && (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  {cp.status === 'QUALITY_CHECK' && (
                    <button
                      onClick={handleCompleteProcurement}
                      disabled={actionLoading === 'complete'}
                      className="btn btn-primary"
                      style={{ background: '#16a34a', padding: '0.65rem 1.2rem', fontWeight: 800 }}
                    >
                      <CheckCircle size={17} /> {actionLoading === 'complete' ? 'Completing...' : '✅ Complete Procurement & Issue DBT'}
                    </button>
                  )}

                  {cp.payment && cp.payment.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleApprovePayment(cp.payment.id)}
                      disabled={actionLoading.startsWith('approve')}
                      className="btn btn-primary"
                      style={{ background: '#9333ea', padding: '0.65rem 1.2rem', fontWeight: 800 }}
                    >
                      <Award size={17} /> Confirm & Approve DBT Transfer
                    </button>
                  )}

                  {cp.payment && cp.payment.status === 'APPROVED' && (
                    <button
                      onClick={() => handleDisbursePayment(cp.payment.id)}
                      disabled={actionLoading.startsWith('pay')}
                      className="btn btn-primary"
                      style={{ background: '#16a34a', padding: '0.65rem 1.2rem', fontWeight: 800 }}
                    >
                      <Banknote size={17} /> 💸 Disburse Payment (Mark PAID)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Current Farmer Voucher Summary if cp exists */}
            {cp && (
              <div style={{ marginTop: '1.25rem', background: '#1e293b', padding: '1.2rem', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>FARMER / TOKEN</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                      {cp.farmer_name} <span style={{ color: '#38bdf8' }}>({cp.token_number})</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{cp.crop_type} • Grade: {cp.quality_grade || 'Grade A'}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>NET ACCEPTED WEIGHT</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#4ade80' }}>
                      {(cp.actual_weight_kg || cp.quantity_kg || 2500)?.toLocaleString()} KG
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Rate: ₹22.00 / kg (MSP)</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>TOTAL DBT PAYABLE</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c084fc' }}>
                      ₹{(((cp.actual_weight_kg || cp.quantity_kg || 2500)) * 22).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Direct to Bank Account</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>DBT STATUS</div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.2rem',
                      background: cp.payment?.status === 'PAID' ? '#166534' : cp.payment?.status === 'APPROVED' ? '#581c87' : '#854d0e',
                      color: 'white',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 800
                    }}>
                      {cp.payment?.status || (cp.status === 'COMPLETED' ? 'PROCESSING' : 'AWAITING COMPLETION')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* All Centre DBT Payments Table */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Centre Procurement DBT Transactions ({filteredPayments.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                  Realtime ledger of payments generated at this facility.
                </p>
              </div>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ALL', 'PROCESSING', 'APPROVED', 'PAID', 'PENDING'].map(f => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    style={{
                      background: paymentFilter === f ? '#7e22ce' : '#f1f5f9',
                      color: paymentFilter === f ? 'white' : '#475569',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search by farmer name, reference number, or crop..."
                value={paymentSearch}
                onChange={e => setPaymentSearch(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.9rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
              />
            </div>

            {filteredPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                <CreditCard size={40} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No payments match the selected filter.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Voucher Ref</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Farmer</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Crop & Weight</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Total Amount</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>DBT Status</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                          {p.reference_number || p.id}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 800, color: '#0f172a' }}>
                          {p.farmer_name || 'Farmer'}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: '#475569' }}>
                          {p.crop || 'Paddy'} • <strong>{(p.quantity_kg || 2500).toLocaleString()} kg</strong>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontWeight: 900, color: '#7e22ce' }}>
                          ₹{(p.amount || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            background: p.status === 'PAID' ? '#dcfce7' : p.status === 'APPROVED' ? '#f3e8ff' : p.status === 'PROCESSING' ? '#fef9c3' : '#f1f5f9',
                            color: p.status === 'PAID' ? '#166534' : p.status === 'APPROVED' ? '#7e22ce' : p.status === 'PROCESSING' ? '#854d0e' : '#475569'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                          {p.status === 'PROCESSING' && (
                            <button
                              onClick={() => handleApprovePayment(p.id)}
                              disabled={actionLoading === `approve-${p.id}`}
                              style={{
                                background: '#7e22ce',
                                color: 'white',
                                border: 'none',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {actionLoading === `approve-${p.id}` ? '...' : 'Approve DBT'}
                            </button>
                          )}
                          {p.status === 'APPROVED' && (
                            <button
                              onClick={() => handleDisbursePayment(p.id)}
                              disabled={actionLoading === `pay-${p.id}`}
                              style={{
                                background: '#16a34a',
                                color: 'white',
                                border: 'none',
                                padding: '0.3rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer'
                              }}
                            >
                              {actionLoading === `pay-${p.id}` ? '...' : 'Disburse (PAID)'}
                            </button>
                          )}
                          {p.status === 'PAID' && (
                            <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '0.78rem' }}>
                              ✓ Credited
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATION 5: OPERATOR CONSOLE (DEFAULT OVERVIEW) ─────────────── */}
      {activeTab === 'console' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Left: Currently Processing + Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="card" style={{ border: cp ? '2px solid #8b5cf6' : '2px dashed #334155', minHeight: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#8b5cf6' }}>
                  ⚙️ Active Station Farmer
                </h3>
                {cp && (
                  <span className="badge badge-blue">
                    {STATUS_STEPS.find(s => s.key === cp.status)?.label || cp.status}
                  </span>
                )}
              </div>

              {cp ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ background: '#8b5cf6', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '1.6rem', fontWeight: 900 }}>
                      {cp.token_number}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem' }}>{cp.farmer_name}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {cp.crop_type} • {(cp.actual_weight_kg || cp.declared_quantity_kg || cp.quantity_kg)?.toLocaleString()} kg
                      </div>
                    </div>
                  </div>

                  {/* Status Stepper */}
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                    {STATUS_STEPS.map((s, i) => {
                      const current = getCurrentStepIndex(cp.status);
                      const isActive = i <= current;
                      const isCurrent = i === current;
                      return (
                        <div key={s.key} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ height: '4px', borderRadius: '2px', background: isActive ? s.color : '#e2e8f0', transition: 'background 0.3s' }} />
                          <div style={{ fontSize: '0.6rem', marginTop: '0.2rem', fontWeight: isCurrent ? 800 : 500, color: isActive ? s.color : '#94a3b8' }}>
                            {s.icon} {s.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contextual Action based on current step */}
                  {cp.status === 'CALLED' && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleStartProcessing} disabled={actionLoading === 'process'} className="btn btn-primary" style={{ flex: 1, padding: '0.6rem' }}>
                        {actionLoading === 'process' ? 'Starting...' : '▶ Start Processing'}
                      </button>
                      <button onClick={() => navigate('/operator/weighment')} className="btn btn-secondary" style={{ padding: '0.6rem' }}>
                        Weighbridge →
                      </button>
                    </div>
                  )}

                  {cp.status === 'PROCESSING' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Actual Weight (kg)</label>
                        <input
                          type="number"
                          value={weighmentKg}
                          onChange={e => setWeighmentKg(e.target.value)}
                          placeholder={String(cp.quantity_kg || 2500)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}
                        />
                      </div>
                      <button onClick={() => handleRecordWeighment()} disabled={actionLoading === 'weigh'} className="btn btn-primary" style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                        <Weight size={14} /> {actionLoading === 'weigh' ? '...' : 'Record Weight'}
                      </button>
                    </div>
                  )}

                  {cp.status === 'WEIGHMENT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Grade</label>
                          <select value={qualityGrade} onChange={e => setQualityGrade(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                            <option>Grade A</option><option>Grade B</option><option>Grade C</option><option>Rejected</option>
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Moisture %</label>
                          <input value={qualityMoisture} onChange={e => setQualityMoisture(e.target.value)} placeholder="13%" style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }} />
                        </div>
                      </div>
                      <button onClick={handleRecordQuality} disabled={actionLoading === 'quality'} className="btn btn-primary" style={{ width: '100%', padding: '0.6rem' }}>
                        <ShieldCheck size={14} /> {actionLoading === 'quality' ? '...' : 'Submit Quality Check'}
                      </button>
                    </div>
                  )}

                  {cp.status === 'QUALITY_CHECK' && (
                    <button onClick={handleCompleteProcurement} disabled={actionLoading === 'complete'} className="btn btn-primary" style={{ width: '100%', padding: '0.6rem', fontSize: '0.9rem', background: '#22c55e' }}>
                      <CheckCircle2 size={14} /> {actionLoading === 'complete' ? '...' : '✅ Complete Procurement & Issue DBT'}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  <Users size={40} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.3 }} />
                  <p style={{ fontWeight: 600, margin: 0 }}>No farmer currently processing.</p>
                  <p style={{ fontSize: '0.8rem' }}>Click "Next Farmer" to call the next farmer from queue.</p>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleNextFarmer} disabled={actionLoading === 'next'} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', fontWeight: 800, minWidth: '150px' }}>
                <Play size={18} /> {actionLoading === 'next' ? 'Calling...' : 'NEXT FARMER'}
              </button>
            </div>

            {/* Utility Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button onClick={handleSeedDemoFarmers} disabled={actionLoading === 'seed'} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }}>
                <UserPlus size={14} /> {actionLoading === 'seed' ? 'Seeding...' : 'Add 10 Demo Farmers'}
              </button>
              <button onClick={() => setShowResetConfirm(true)} className="btn btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', color: '#ef4444' }}>
                <RotateCcw size={14} /> Reset Centre
              </button>
            </div>
          </div>

          {/* Right: Live Queue List */}
          <div className="card" style={{ maxHeight: '600px', overflow: 'auto' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 0.75rem 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} /> Waiting Queue ({totalInQueue})
            </h3>

            {loadingQueue && !queueData ? (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>Loading queue...</p>
            ) : queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <p style={{ fontWeight: 600 }}>Queue is empty.</p>
                <p style={{ fontSize: '0.8rem' }}>Add demo farmers or wait for bookings.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {queue.map((entry, idx) => (
                  <div key={entry.appointment_id || entry.id || idx} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.65rem 0.85rem', borderRadius: '10px',
                    background: idx === 0 ? '#fefce8' : '#f8fafc',
                    border: idx === 0 ? '1.5px solid #fde047' : '1px solid #e2e8f0',
                    boxShadow: idx === 0 ? '0 2px 8px rgba(234, 179, 8, 0.15)' : 'none'
                  }}>
                    <div style={{
                      background: idx === 0 ? '#f59e0b' : '#334155',
                      color: 'white', padding: '0.35rem 0.65rem', borderRadius: '8px',
                      fontWeight: 900, fontSize: '0.95rem', minWidth: '55px', textAlign: 'center'
                    }}>
                      {entry.token_number}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0f172a' }}>
                        {entry.farmer_name}
                        {entry.farmer_phone && <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 500, marginLeft: '0.4rem' }}>({entry.farmer_phone})</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.15rem' }}>
                        <strong>{entry.crop_type || 'Produce'}</strong> • {(entry.declared_quantity_kg || entry.quantity_kg || 2500)?.toLocaleString()} kg
                        {entry.position_number && <span style={{ color: '#15803d', marginLeft: '0.3rem', fontWeight: 700 }}>[Bay #{entry.position_number}]</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: idx === 0 ? '#b45309' : '#64748b' }}>
                        #{entry.queue_position || idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <AlertTriangle size={40} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontWeight: 800 }}>Reset {centre.name}?</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>This will clear all active bookings, queue, and daily stats for this centre only.</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
              <button onClick={() => setShowResetConfirm(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleResetCentre} disabled={actionLoading === 'reset'} className="btn btn-primary" style={{ background: '#ef4444' }}>
                {actionLoading === 'reset' ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
