import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchCentres, fetchLiveQueueForCentre, advanceCentreQueue, fetchFarmerActiveBooking } from '../services/api';
import { socket } from '../services/socket';
import { Users, Clock, ShieldCheck, RefreshCw, Bell, AlertCircle, ArrowRight, AlertTriangle, Sparkles, Building2, Play, CheckCircle, Zap } from 'lucide-react';
import DeviationReallocationModal from '../components/Farmer/DeviationReallocationModal';

export default function FarmerQueuePage() {
  const { user, role } = useAuth();
  const farmerId = user?.id || 'default-farmer';
  const isOfficer = ['CENTRE_OPERATOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'].includes(role);

  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('centre-1');
  const [queueData, setQueueData] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [advancingToken, setAdvancingToken] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(false);
  const [deviationAlert, setDeviationAlert] = useState(false);
  const [isReallocModalOpen, setIsReallocModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Auto-detect farmer's booked centre
  useEffect(() => {
    const detectBookedCentre = async () => {
      try {
        const res = await fetchFarmerActiveBooking(farmerId);
        if (res.success && res.active_booking?.centre_id) {
          setSelectedCentreId(res.active_booking.centre_id);
        }
      } catch (err) {
        console.warn('Could not auto-detect centre:', err);
      }
    };
    if (farmerId && farmerId !== 'default-farmer') {
      detectBookedCentre();
    }
  }, [farmerId]);

  useEffect(() => {
    loadMasterCentres();
  }, []);

  useEffect(() => {
    loadQueueState();

    // Socket.io WebSocket realtime sync + 3s Polling Fallback
    const handleQueueUpdate = (data) => {
      if (!data || !data.centre_id || data.centre_id === selectedCentreId) {
        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 1200);
        loadQueueState();
      }
    };

    socket.on('queue_updated', handleQueueUpdate);
    socket.on('appointment_booked', handleQueueUpdate);
    socket.on('payment_updated', handleQueueUpdate);

    // Polling fallback every 3 seconds for serverless environments
    const pollInterval = setInterval(() => {
      loadQueueState();
    }, 3000);

    return () => {
      socket.off('queue_updated', handleQueueUpdate);
      socket.off('appointment_booked', handleQueueUpdate);
      socket.off('payment_updated', handleQueueUpdate);
      clearInterval(pollInterval);
    };
  }, [selectedCentreId, farmerId]);

  const loadMasterCentres = async () => {
    try {
      const res = await fetchCentres();
      if (res.success && res.centres) {
        setCentres(res.centres);
      }
    } catch (err) {
      console.error('Error fetching centres:', err);
    }
  };

  const loadQueueState = async () => {
    try {
      const data = await fetchLiveQueueForCentre(selectedCentreId, farmerId);
      if (data && data.success) {
        setQueueData(data);
      }
    } catch (err) {
      console.error('Error loading live queue state:', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleAdvanceToken = async (tokenNumber, newStatus) => {
    setAdvancingToken(true);
    try {
      const res = await advanceCentreQueue({
        centre_id: selectedCentreId,
        token_number: tokenNumber,
        new_status: newStatus
      });
      if (res.success) {
        setActionNotice(`✅ Token advanced successfully!`);
        setTimeout(() => setActionNotice(null), 3000);
        loadQueueState();
      }
    } catch (err) {
      console.error('Error advancing token:', err);
    } finally {
      setAdvancingToken(false);
    }
  };

  const currentCentre = centres.find(c => c.id === selectedCentreId) || {
    id: selectedCentreId,
    name: queueData?.centre_name || 'Procurement Centre',
    district: 'Mandya'
  };

  const isYourTurn = queueData?.your_status === 'CALLED';
  const isBeingProcessed = queueData?.your_status === 'PROCESSING' || queueData?.your_status === 'WEIGHMENT' || queueData?.your_status === 'QUALITY_CHECK';
  const isCompleted = queueData?.your_status === 'COMPLETED';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>

      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Zap size={14} /> LIVE APMC GATE YARD COUNTER
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              Real-Time Queue Management
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Viewing: <strong>{currentCentre.name}</strong> • Live synchronization with Gate Operator
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ background: '#334155', padding: '0.4rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={16} color="#38bdf8" />
              <select
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
                style={{ background: '#0f172a', color: 'white', border: '1px solid #475569', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
              >
                {centres.map(c => (
                  <option key={c.id} value={c.id}>🏢 {c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setDeviationAlert(!deviationAlert)}
              style={{ background: deviationAlert ? '#ef4444' : 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <AlertTriangle size={14} /> {deviationAlert ? 'Clear Delay Alert' : 'Simulate Delay'}
            </button>

            <button onClick={loadQueueState} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={14} className={loadingQueue ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── CALL ALERT BANNER (Flashing Red when farmer's token is called) ── */}
      {isYourTurn && (
        <div style={{
          background: '#fef2f2',
          border: '2px solid #ef4444',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 25px -5px rgba(239, 68, 68, 0.3)',
          animation: 'pulse 1.5s infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fee2e2', color: '#dc2626', width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              🔔
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                GATE COUNTER NOTIFICATION
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', margin: '0.15rem 0' }}>
                TOKEN {queueData?.your_token} CALLED — PROCEED TO COUNTER NOW!
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: 0 }}>
                Please bring your produce to Counter 1 at {currentCentre.name}. The gate officer is ready to begin weighment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── PROCESSING BANNER ── */}
      {isBeingProcessed && (
        <div style={{
          background: '#f5f3ff',
          border: '2px solid #8b5cf6',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{ background: '#ede9fe', color: '#7c3aed', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
            🔄
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#5b21b6', margin: 0 }}>
              Token {queueData?.your_token} is being processed at the counter!
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6d28d9', margin: '0.2rem 0 0 0' }}>
              Current Stage: <strong>{queueData?.your_status}</strong>. Weighment and quality verification in progress.
            </p>
          </div>
        </div>
      )}

      {/* On-the-Spot Deviation Alert Banner */}
      {deviationAlert && (
        <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', boxShadow: '0 4px 12px rgba(239,68,68,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: '#fee2e2', padding: '0.6rem', borderRadius: '50%', color: '#dc2626' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#991b1b', display: 'block' }}>
                ⚠️ ON-THE-SPOT QUEUE DEVIATION ALERT DETECTED AT {currentCentre.name.toUpperCase()}
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
                Unforeseen surge at Gate Counter #1. Estimated wait time increased to 24 mins. Re-allocate storage to nearby available centre with zero queue wait.
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsReallocModalOpen(true)}
            style={{ background: '#dc2626', color: 'white', border: 'none', padding: '0.55rem 1.1rem', borderRadius: '8px', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            Re-allocate Storage Now <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Main 4 Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

        {/* Card 1: Now Serving */}
        <div className="card" style={{ background: '#f0fdf4', border: '2px solid #22c55e', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
            NOW SERVING AT COUNTER
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#14532d', margin: '0.3rem 0', fontFamily: 'monospace' }}>
            {queueData?.currently_processing?.token_number || 'NONE'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
            {queueData?.currently_processing ? `${queueData.currently_processing.farmer_name} (${queueData.currently_processing.status})` : 'Awaiting Next Token'}
          </div>
        </div>

        {/* Card 2: Your Token */}
        <div className="card" style={{
          background: isYourTurn ? '#fee2e2' : '#eff6ff',
          border: isYourTurn ? '2px solid #ef4444' : '2px solid #3b82f6',
          textAlign: 'center',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: isYourTurn ? '#991b1b' : '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>
            YOUR TOKEN & STATUS
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: isYourTurn ? '#dc2626' : '#1d4ed8', margin: '0.3rem 0', fontFamily: 'monospace' }}>
            {queueData?.your_token && queueData.your_token !== 'NOT_BOOKED' ? queueData.your_token : 'NOT BOOKED'}
          </div>
          <div style={{ fontSize: '0.75rem', color: isYourTurn ? '#dc2626' : '#2563eb', fontWeight: 800 }}>
            {isYourTurn
              ? '🔔 CALLED TO COUNTER!'
              : queueData?.your_position > 0
              ? `Queue Position #${queueData.your_position}`
              : isCompleted
              ? '✅ COMPLETED'
              : queueData?.your_status || 'Select centre where booked'}
          </div>
        </div>

        {/* Card 3: People Ahead */}
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            FARMERS AHEAD OF YOU
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {queueData?.your_position > 1 ? queueData.your_position - 1 : 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            {queueData?.total_in_queue || 0} Total in Queue
          </div>
        </div>

        {/* Card 4: Estimated Wait */}
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            ESTIMATED WAIT
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: deviationAlert ? '#dc2626' : '#d97706', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {deviationAlert ? 24 : (queueData?.your_estimated_wait || 0)} mins
          </div>
          <div style={{ fontSize: '0.75rem', color: deviationAlert ? '#dc2626' : '#b45309', fontWeight: 600 }}>
            ~{queueData?.avg_processing_minutes || 15} mins / farmer
          </div>
        </div>

      </div>

      {/* Queue Status Detail Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        {actionNotice && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#14532d', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} /> {actionNotice}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📋 Live Yard Processing Queue — {currentCentre.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Ordered by arrival / booking timestamp • {queueData?.total_in_queue || 0} waiting, {queueData?.completed_today || 0} completed today
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* ▶ Call Next Token — OFFICER ONLY */}
            {isOfficer && (
              <button
                onClick={() => handleAdvanceToken(null, 'CALLED')}
                disabled={advancingToken}
                style={{ background: '#16a34a', border: 'none', color: 'white', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 6px rgba(22,163,74,0.3)' }}
              >
                <Play size={14} /> {advancingToken ? 'Advancing...' : '▶ Call Next Token'}
              </button>
            )}

            <button
              onClick={() => setIsReallocModalOpen(true)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#2563eb', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
            >
              🔄 Transfer Facility
            </button>
          </div>
        </div>

        {/* Currently Processing Farmer Box */}
        {queueData?.currently_processing && (
          <div style={{
            background: '#f0fdf4',
            border: '2px solid #16a34a',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ background: '#16a34a', color: 'white', padding: '0.35rem 0.65rem', borderRadius: '8px', fontWeight: 900, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                {queueData.currently_processing.token_number}
              </span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                  {queueData.currently_processing.farmer_name}
                  {queueData.currently_processing.farmer_id === farmerId && (
                    <span style={{ marginLeft: '0.5rem', background: '#2563eb', color: 'white', fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>YOU</span>
                  )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>
                  Active at Gate: {queueData.currently_processing.crop_type} ({queueData.currently_processing.quantity_kg} kg)
                </div>
              </div>
            </div>

            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 800,
              background: '#dcfce7',
              color: '#14532d',
              border: '1px solid #86efac'
            }}>
              🟢 AT COUNTER: {queueData.currently_processing.status}
            </span>
          </div>
        )}

        {/* Waiting Queue List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {(!queueData?.queue_entries || queueData.queue_entries.length === 0) && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '2rem' }}>🌾</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#334155', margin: '0.5rem 0 0.2rem 0' }}>
                No Waiting Farmers in Queue for {currentCentre.name}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Queue is currently empty. Book a procurement slot to get your live token!
              </p>
            </div>
          )}

          {queueData?.queue_entries?.map((item) => {
            const isYou = item.farmer_id === farmerId;
            const posBadgeColor = item.queue_position === 1 ? '#16a34a' : isYou ? '#2563eb' : '#64748b';

            return (
              <div
                key={item.appointment_id || item.token_number}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: isYou ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isYou ? '#eff6ff' : '#ffffff',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{
                    background: posBadgeColor,
                    color: 'white',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    #{item.queue_position}
                  </span>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                        {item.token_number}
                      </span>
                      {isYou && (
                        <span style={{ background: '#2563eb', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                          YOUR TOKEN
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '0.1rem' }}>
                      {item.farmer_name} • <span style={{ color: '#16a34a' }}>{item.crop_type} ({item.quantity_kg} kg)</span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Est. Wait: ~{item.estimated_wait_minutes} mins
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    padding: '0.2rem 0.55rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800,
                    background: item.status === 'CALLED' ? '#fee2e2' : '#f1f5f9',
                    color: item.status === 'CALLED' ? '#991b1b' : '#475569'
                  }}>
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deviation Modal */}
      {isReallocModalOpen && (
        <DeviationReallocationModal
          isOpen={isReallocModalOpen}
          onClose={() => setIsReallocModalOpen(false)}
          currentCentre={currentCentre}
          centres={centres}
          farmerId={farmerId}
          onReallocationSuccess={() => {
            setIsReallocModalOpen(false);
            loadQueueState();
          }}
        />
      )}

    </div>
  );
}
