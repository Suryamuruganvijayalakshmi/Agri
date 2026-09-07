import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchCentres, fetchLiveQueueForCentre, advanceCentreQueue } from '../services/api';
import { socket } from '../services/socket';
import { Users, Clock, ShieldCheck, RefreshCw, Bell, AlertCircle, ArrowRight, AlertTriangle, Sparkles, Building2, Play, CheckCircle } from 'lucide-react';
import DeviationReallocationModal from '../components/Farmer/DeviationReallocationModal';

// Officer roles that may manage queue tokens
const OFFICER_ROLES = ['CENTRE_OPERATOR', 'DISTRICT_OFFICER', 'STATE_ADMIN'];

export default function FarmerQueuePage() {
  const { user, role } = useAuth();
  const farmerId = user?.id || 'default-farmer';
  const isOfficer = OFFICER_ROLES.includes(role);

  const [centres, setCentres] = useState([]);
  const [selectedCentreId, setSelectedCentreId] = useState('centre-1');
  const [queueData, setQueueData] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [advancingToken, setAdvancingToken] = useState(false);
  const [realtimePulse, setRealtimePulse] = useState(false);
  const [deviationAlert, setDeviationAlert] = useState(false);
  const [isReallocModalOpen, setIsReallocModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    loadMasterCentres();
  }, []);

  useEffect(() => {
    loadQueueState();

    // Socket.io WebSocket realtime sync + 4s Polling Fallback (Vercel serverless compatible)
    const handleQueueUpdate = (data) => {
      if (!data || !data.centre_id || data.centre_id === selectedCentreId) {
        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 1200);
        loadQueueState();
      }
    };

    socket.on('queue_updated', handleQueueUpdate);
    socket.on('appointment_booked', handleQueueUpdate);

    // Polling fallback every 4 seconds for serverless environments
    const pollInterval = setInterval(() => {
      loadQueueState();
    }, 4000);

    return () => {
      socket.off('queue_updated', handleQueueUpdate);
      socket.off('appointment_booked', handleQueueUpdate);
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
    setLoadingQueue(true);
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
        setActionNotice(`✅ Token ${tokenNumber || 'Queue'} advanced to ${newStatus}!`);
        setTimeout(() => setActionNotice(null), 3000);
        loadQueueState();
      }
    } catch (err) {
      console.error('Error advancing token:', err);
    } finally {
      setAdvancingToken(false);
    }
  };

  const currentCentre = centres.find(c => c.id === selectedCentreId) || { name: queueData?.centre_name || 'Procurement Yard' };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📡 Centre-Specific Live Queue & Capacity Engine
              </span>
              {realtimePulse && (
                <span style={{ background: '#22c55e', color: 'white', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Sparkles size={10} /> LIVE SYNC
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              {currentCentre.name} Live Queue
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
              Unique sequential First-Come, First-Served queue sequence per procurement centre. Real-time updates via WebSockets!
            </p>
          </div>

          {/* Centre Selector Dropdown & Actions */}
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
              <AlertTriangle size={14} /> {deviationAlert ? 'Clear Delay Alert' : 'Simulate Yard Delay'}
            </button>

            <button onClick={loadQueueState} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={14} className={loadingQueue ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: Now Serving */}
        <div className="card" style={{ background: '#f0fdf4', border: '2px solid #22c55e', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
            NOW SERVING
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#14532d', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {queueData?.now_serving || 'TK-01'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
            {queueData?.active_counters || 4} Counters Active
          </div>
        </div>

        {/* Card 2: Your Token */}
        <div className="card" style={{ background: '#eff6ff', border: '2px solid #3b82f6', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>
            YOUR TOKEN & POSITION
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {queueData?.your_token || 'TK-03'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>
            Queue Position #{queueData?.your_position || 3}
          </div>
        </div>

        {/* Card 3: People Ahead */}
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            PEOPLE AHEAD
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {queueData?.people_ahead !== undefined ? queueData.people_ahead : 2} Farmers
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            In Line for {currentCentre.name.split(' ')[0]}
          </div>
        </div>

        {/* Card 4: Estimated Wait */}
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            ESTIMATED WAIT
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: deviationAlert ? '#dc2626' : '#d97706', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {deviationAlert ? 24 : (queueData?.estimated_wait_minutes || 6)} mins
          </div>
          <div style={{ fontSize: '0.75rem', color: deviationAlert ? '#dc2626' : '#b45309', fontWeight: 600 }}>
            {deviationAlert ? '⚡ Yard delay detected' : `~${queueData?.avg_processing_minutes || 15} mins / batch`}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              📋 Live Yard Processing Pipeline — {currentCentre.name}
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Unique sequential queue entries ordered by booking timestamp for this centre ({queueData?.total_queue_count || 0} total)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* ▶ Call Next Token — OFFICER ONLY */}
            {isOfficer && (
              <button
                onClick={() => handleAdvanceToken(null, 'CHECKED_IN')}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {queueData?.queue_entries?.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <span style={{ fontSize: '2rem' }}>🌾</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#334155', margin: '0.5rem 0 0.2rem 0' }}>
                No Active Farmers in Queue for {currentCentre.name}
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                Queue is currently 100% fresh and empty. Book a procurement slot to get your live token!
              </p>
            </div>
          )}

          {queueData?.queue_entries?.map((item) => {
            const isYou = item.farmer_id === farmerId || item.farmer_name.includes('YOU');
            const posBadgeColor = item.queue_position === 1 ? '#16a34a' : isYou ? '#2563eb' : '#64748b';

            return (
              <div
                key={item.id || item.token_number}
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
                      <span style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                        {item.token_number}
                      </span>
                      {isYou && (
                        <span style={{ background: '#2563eb', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                          YOUR TOKEN
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: '0.1rem' }}>
                      {item.farmer_name} • <span style={{ color: '#16a34a' }}>{item.crop_type} ({item.declared_quantity_kg} kg)</span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Counter #{item.counter_number || 1} • Date: {item.appointment_date} ({item.time_slot})
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Operator Quick Action Buttons — OFFICER ONLY */}
                  {isOfficer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {item.status === 'BOOKED' && (
                        <button
                          onClick={() => handleAdvanceToken(item.token_number, 'CHECKED_IN')}
                          style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Check In
                        </button>
                      )}
                      {item.status === 'CHECKED_IN' && (
                        <button
                          onClick={() => handleAdvanceToken(item.token_number, 'WEIGHED')}
                          style={{ background: '#d97706', color: 'white', border: 'none', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Weigh
                        </button>
                      )}
                      {item.status === 'WEIGHED' && (
                        <button
                          onClick={() => handleAdvanceToken(item.token_number, 'APPROVED')}
                          style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.25rem 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge badge-${item.status === 'APPROVED' || item.status === 'WEIGHED' ? 'yellow' : isYou ? 'green' : 'grey'}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                      Est wait: <strong>{item.estimated_wait_minutes} mins</strong>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deviation Storage Re-allocation Modal */}
      <DeviationReallocationModal
        isOpen={isReallocModalOpen}
        onClose={() => setIsReallocModalOpen(false)}
        appointment={{ booking_id: 'AGR-2026-9042', centre_id: selectedCentreId, centre_name: currentCentre.name }}
        onReallocated={() => {
          setDeviationAlert(false);
          loadQueueState();
        }}
      />
    </div>
  );
}

