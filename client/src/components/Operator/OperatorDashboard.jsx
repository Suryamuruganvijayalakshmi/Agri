import React, { useState } from 'react';
import { Building2, Users, Weight, ShieldCheck, AlertTriangle, Play, RefreshCw, CheckCircle2, ChevronRight, Sliders, Edit3 } from 'lucide-react';
import { updateOperatorCentreStatus, updateProcurementStage, createException } from '../../services/api';

export default function OperatorDashboard({ centres, selectedCentreId = 'centre-1', onDataChanged }) {
  const centre = centres.find(c => c.id === selectedCentreId) || centres[0];

  const [status, setStatus] = useState(centre.status);
  const [dailyCap, setDailyCap] = useState(centre.daily_capacity_kg);
  const [bookedCap, setBookedCap] = useState(centre.booked_capacity_kg);
  const [activeCounters, setActiveCounters] = useState(centre.active_counters);
  const [avgProcessingMins, setAvgProcessingMins] = useState(centre.avg_processing_minutes);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Stage update form state
  const [targetProcId, setTargetProcId] = useState('PROC-2026-9042');
  const [nextStage, setNextStage] = useState('QUALITY_VERIFICATION');
  const [actualWeight, setActualWeight] = useState(2520);
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [moisture, setMoisture] = useState('13.2%');
  const [reason, setReason] = useState('Quality compliance verified at Counter #1.');
  const [owner, setOwner] = useState('Quality Testing Officer (Mandya)');
  const [nextAction, setNextAction] = useState('Forward to Assistant Director for MSP Approval');
  const [loadingStage, setLoadingStage] = useState(false);
  const [stageMessage, setStageMessage] = useState(null);

  // Exception modal state
  const [showExModal, setShowExModal] = useState(false);
  const [exReason, setExReason] = useState('Surge in un-registered vehicle queue at Gate Counter #1.');
  const [exOwner, setExOwner] = useState('Mandya Yard Traffic Marshal');
  const [exNextAction, setExNextAction] = useState('Advise un-checked farmers to switch to Pandavapura Depot');

  const handleUpdateCentreControl = async (e) => {
    e.preventDefault();
    setLoadingStatus(true);
    try {
      const res = await updateOperatorCentreStatus({
        centre_id: centre.id,
        status,
        daily_capacity_kg: Number(dailyCap),
        booked_capacity_kg: Number(bookedCap),
        active_counters: Number(activeCounters),
        avg_processing_minutes: Number(avgProcessingMins)
      });
      if (res.success && onDataChanged) onDataChanged();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleAdvanceStage = async (e) => {
    e.preventDefault();
    setLoadingStage(true);
    setStageMessage(null);
    try {
      const res = await updateProcurementStage({
        procurement_id: targetProcId,
        new_status: nextStage,
        actual_weighed_kg: Number(actualWeight),
        quality_grade: qualityGrade,
        quality_moisture: moisture,
        reason,
        owner,
        next_action: nextAction
      });

      if (res.success) {
        setStageMessage(`Stage advanced to ${nextStage}! Realtime update broadcasted to farmer.`);
        if (onDataChanged) onDataChanged();
      }
    } catch (e) {
      setStageMessage(`Error: ${e.message}`);
    } finally {
      setLoadingStage(false);
    }
  };

  const handleLogException = async (e) => {
    e.preventDefault();
    try {
      await createException({
        farmer_id: 'F-1042',
        farmer_name: 'Ramesh Gowda',
        centre_id: centre.id,
        centre_name: centre.name,
        procurement_id: targetProcId,
        type: 'OPERATIONAL_CONGESTION',
        severity: 'HIGH',
        reason: exReason,
        owner: exOwner,
        next_action: exNextAction
      });
      setShowExModal(false);
      if (onDataChanged) onDataChanged();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="card" style={{ background: '#0f172a', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.3rem' }}>Operational Control Twin</span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
              {centre.name}
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Yard Code: <strong>{centre.code}</strong> • Operating Hours: {centre.operational_start} - {centre.operational_end}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span className={`badge badge-${centre.color_status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem' }}>
              {centre.status} ({centre.utilization_percent}% Load)
            </span>
            <button onClick={() => setShowExModal(true)} className="btn btn-danger btn-sm">
              <AlertTriangle size={14} /> Create Exception
            </button>
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DAILY CAPACITY</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {centre.daily_capacity_kg.toLocaleString()} kg
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>Booked: {centre.booked_capacity_kg.toLocaleString()} kg</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>REMAINING CAPACITY</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: centre.remaining_capacity_kg > 5000 ? '#16a34a' : '#dc2626', margin: '0.2rem 0' }}>
            {centre.remaining_capacity_kg.toLocaleString()} kg
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{centre.utilization_percent}% allocated</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ACTIVE QUEUE</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {centre.queue_count} Farmers
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Across {centre.active_counters} open counters</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ESTIMATED WAIT</span>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {centre.est_wait_minutes} Minutes
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Avg processing: {centre.avg_processing_minutes} m/farmer</span>
        </div>
      </div>

      {/* Grid: Left Operator Live Controls, Right Stage Advancement */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left: Centre Operational Twin Controls */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <Sliders size={20} color="#15803d" /> Live Centre Capacity & Status Controls
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Broadcasts real-time to farmer map</span>
          </div>

          <form onSubmit={handleUpdateCentreControl} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                Yard Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="OPEN">🟢 OPEN (Good Availability)</option>
                <option value="HIGH_LOAD">🟡 HIGH LOAD (Congested)</option>
                <option value="FULL">🔴 FULL (Capacity Reached)</option>
                <option value="CLOSED">⚫ CLOSED (Intake Halted)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                Daily Intake Capacity (kg): {Number(dailyCap).toLocaleString()} kg
              </label>
              <input
                type="range"
                min="10000"
                max="100000"
                step="5000"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                Booked Capacity Shift (Simulate Surge): {Number(bookedCap).toLocaleString()} kg
              </label>
              <input
                type="range"
                min="0"
                max={dailyCap}
                step="1000"
                value={bookedCap}
                onChange={(e) => setBookedCap(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Active Counters
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={activeCounters}
                  onChange={(e) => setActiveCounters(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Avg Processing (Mins)
                </label>
                <input
                  type="number"
                  min="5"
                  max="45"
                  value={avgProcessingMins}
                  onChange={(e) => setAvgProcessingMins(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <button type="submit" disabled={loadingStatus} className="btn btn-primary btn-md">
              {loadingStatus ? 'Broadcasting Realtime...' : 'Update & Broadcast Live Operational Twin'}
            </button>
          </form>
        </div>

        {/* Right: Procurement Lifecycle Stage Updater */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <ShieldCheck size={20} color="#16a34a" /> Procurement Stage Advancement
            </h3>
            <span className="badge badge-green">Explainable Log</span>
          </div>

          {stageMessage && (
            <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', color: '#14532d', padding: '0.65rem', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem' }}>
              {stageMessage}
            </div>
          )}

          <form onSubmit={handleAdvanceStage} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Select Active Procurement ID
              </label>
              <select
                value={targetProcId}
                onChange={(e) => setTargetProcId(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              >
                <option value="PROC-2026-9042">PROC-2026-9042 (Ramesh Gowda - 2,500 kg Paddy)</option>
                <option value="PROC-2026-9102">PROC-2026-9102 (Suresh Kumar - 3,200 kg Ragi)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Target Lifecycle Stage
                </label>
                <select
                  value={nextStage}
                  onChange={(e) => setNextStage(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="CHECKED_IN">CHECKED IN (Gate Entry)</option>
                  <option value="WEIGHING">WEIGHING (Weighbridge)</option>
                  <option value="QUALITY_VERIFICATION">QUALITY VERIFICATION</option>
                  <option value="APPROVAL_PENDING">APPROVAL PENDING</option>
                  <option value="APPROVED">APPROVED (Release Payment)</option>
                  <option value="PAID">PAID (DBT Disbursed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Actual Net Weight (kg)
                </label>
                <input
                  type="number"
                  value={actualWeight}
                  onChange={(e) => setActualWeight(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Assigned Owner / Officer
                </label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Explicit Next Action
                </label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Operational Reason / Explanation
              </label>
              <textarea
                rows="2"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <button type="submit" disabled={loadingStage} className="btn btn-primary btn-md">
              {loadingStage ? 'Advancing Stage...' : 'Advance Stage & Send Explainable Update'}
            </button>
          </form>
        </div>
      </div>

      {/* OPERATOR SLOT CAPACITY & POSITION GRID MONITOR (SECTION 20) */}
      <div className="card" style={{ padding: '1.5rem', background: '#ffffff', borderRadius: '14px', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
              📊 Yard Operator Farmer Position Monitor
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
              Real-time position occupancy for <strong>{centre.name}</strong>
            </p>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
            Slot: 10:00 – 10:30 AM
          </div>
        </div>

        {/* Capacity summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem', textAlign: 'center' }}>
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SLOT CAPACITY</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>20</div>
          </div>
          <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '10px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: 700 }}>BOOKED POSITIONS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>13</div>
          </div>
          <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>AVAILABLE POSITIONS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16a34a' }}>7</div>
          </div>
        </div>

        {/* Complete position grid for operators */}
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.5rem' }}>
          POSITION OCCUPANCY MAP (01 – 20)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.65rem' }}>
          {[
            { num: '01', status: 'AVAILABLE' },
            { num: '02', status: 'BOOKED' },
            { num: '03', status: 'BOOKED' },
            { num: '04', status: 'AVAILABLE' },
            { num: '05', status: 'BOOKED' },
            { num: '06', status: 'AVAILABLE' },
            { num: '07', status: 'AVAILABLE' },
            { num: '08', status: 'BOOKED' },
            { num: '09', status: 'BOOKED' },
            { num: '10', status: 'BOOKED' },
            { num: '11', status: 'AVAILABLE' },
            { num: '12', status: 'BOOKED' },
            { num: '13', status: 'BOOKED' },
            { num: '14', status: 'BOOKED' },
            { num: '15', status: 'BOOKED' },
            { num: '16', status: 'AVAILABLE' },
            { num: '17', status: 'BOOKED' },
            { num: '18', status: 'BOOKED' },
            { num: '19', status: 'BOOKED' },
            { num: '20', status: 'AVAILABLE' }
          ].map(p => (
            <div
              key={p.num}
              style={{
                padding: '0.6rem',
                borderRadius: '8px',
                border: p.status === 'BOOKED' ? '1px solid #fca5a5' : '1px solid #86efac',
                background: p.status === 'BOOKED' ? '#fee2e2' : '#f0fdf4',
                color: p.status === 'BOOKED' ? '#991b1b' : '#14532d',
                textAlign: 'center',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}
            >
              <div>{p.num} {p.status === 'BOOKED' ? '🔴' : '🟢'}</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: '0.1rem' }}>{p.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exception Creation Modal */}
      {showExModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} /> Log Operational Exception
              </h3>
              <button onClick={() => setShowExModal(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleLogException} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Exception Reason / Issue Detail
                </label>
                <textarea
                  rows="3"
                  value={exReason}
                  onChange={(e) => setExReason(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Assigned Exception Owner
                </label>
                <input
                  type="text"
                  value={exOwner}
                  onChange={(e) => setExOwner(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                  Next Required Action
                </label>
                <input
                  type="text"
                  value={exNextAction}
                  onChange={(e) => setExNextAction(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  required
                />
              </div>

              <button type="submit" className="btn btn-danger btn-md" style={{ width: '100%' }}>
                Broadcast Exception Alert to Admin & Farmer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
