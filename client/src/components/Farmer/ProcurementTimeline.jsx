import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, CreditCard, ChevronRight, User, AlertCircle, FileText, XCircle } from 'lucide-react';
import { cancelAppointmentAPI } from '../../services/api';
import { supabase } from '../../lib/supabase';

export default function ProcurementTimeline({ timeline }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState(null);

  if (!timeline || !timeline.active_procurement) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>No active procurement tracking found for this account.</p>
      </div>
    );
  }

  const proc = timeline.active_procurement;
  const events = timeline.events || [];
  const payment = timeline.payments?.find(p => p.procurement_id === proc.id);

  const handleCancelAppointment = async () => {
    if (!window.confirm('Are you sure you want to cancel this appointment? The position will immediately become AVAILABLE for other farmers.')) return;
    setCancelling(true);
    setCancelMessage(null);

    try {
      // 1. Try Supabase RPC `cancel_appointment`
      if (proc.appointment_id) {
        const { data: supaData, error: supaErr } = await supabase.rpc('cancel_appointment', {
          p_appointment_id: proc.appointment_id
        });
        if (!supaErr && supaData?.success) {
          setCancelMessage('Appointment cancelled in PostgreSQL. Position released to AVAILABLE.');
          setCancelling(false);
          setTimeout(() => window.location.reload(), 1500);
          return;
        }
      }

      // 2. Fallback Express API
      const res = await cancelAppointmentAPI(proc.appointment_id || proc.id);
      if (res.success) {
        setCancelMessage('Appointment cancelled. Position released to AVAILABLE.');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setCancelMessage(`Cancel failed: ${res.error}`);
      }
    } catch (err) {
      setCancelMessage(`Error: ${err.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const stages = [
    { key: 'ENTRY', label: '1. Entry (Gate Check-in & Pass Verification)' },
    { key: 'SLOT_BOOK', label: '2. Slot Book (Theatre Seat & Package Reservation)' },
    { key: 'WEIGHING', label: '3. Weighing (Weighbridge Gross & Net Weight)' },
    { key: 'PAYMENT_FROM_OWNER', label: '4. Payment from Owner (Facility Purchaser Authorization)' },
    { key: 'GOVT', label: '5. Govt (Treasury & DBT Bank Disbursement)' }
  ];

  const getStageIndex = (status) => {
    if (status === 'ENTRY' || status === 'CHECKED_IN') return 0;
    if (status === 'SLOT_BOOK' || status === 'BOOKED') return 1;
    if (status === 'WEIGHING' || status === 'QUALITY_VERIFICATION') return 2;
    if (status === 'PAYMENT_FROM_OWNER' || status === 'APPROVAL_PENDING' || status === 'APPROVED') return 3;
    if (status === 'GOVT' || status === 'PAYMENT_PROCESSING' || status === 'PAID') return 4;
    const idx = stages.findIndex(s => s.key === status);
    return idx === -1 ? 1 : idx;
  };

  const currentIdx = getStageIndex(proc.status);

  // Latest explainable event
  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Active Procurement Header Card */}
      <div className="card" style={{ borderLeft: '5px solid #16a34a' }}>
        <div className="card-header" style={{ marginBottom: '0.75rem' }}>
          <div>
            <span className="badge badge-green" style={{ fontSize: '0.65rem', marginBottom: '0.2rem' }}>
              Procurement ID: {proc.id}
            </span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {proc.crop} • {proc.quantity_kg.toLocaleString()} kg
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.1rem 0 0 0' }}>
              📍 {proc.centre_name}
            </p>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
            <span className="badge badge-yellow" style={{ fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}>
              {proc.status.replace('_', ' ')}
            </span>

            {proc.status === 'BOOKED' && (
              <button
                type="button"
                onClick={handleCancelAppointment}
                disabled={cancelling}
                style={{
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: cancelling ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <XCircle size={14} /> {cancelling ? 'Cancelling...' : 'Cancel & Release Position'}
              </button>
            )}

            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Updated: {new Date(proc.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {cancelMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {cancelMessage}
          </div>
        )}

        {/* Explainable Status Highlight Box */}
        {latestEvent && (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem', marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              <ShieldCheck size={14} /> EXPLAINABLE STATUS BREAKDOWN
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.825rem' }}>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>CURRENT STAGE & STATUS:</span>
                <strong style={{ color: '#0f172a' }}>{latestEvent.new_status}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>DEPARTMENT OWNER:</span>
                <strong style={{ color: '#0f172a' }}>{latestEvent.owner}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>OPERATIONAL REASON:</span>
                <strong style={{ color: '#334155' }}>{latestEvent.reason}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>EXPLICIT NEXT ACTION:</span>
                <strong style={{ color: '#16a34a' }}>{latestEvent.next_action}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Timeline */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '1.25rem' }}>
          <Clock size={20} color="#15803d" /> Live Procurement Journey Timeline
        </h3>

        <div className="timeline-container">
          {stages.map((stage, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const eventForStage = events.find(e => e.new_status === stage.key);

            return (
              <div
                key={stage.key}
                className={`timeline-step ${isDone ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                style={{ cursor: eventForStage ? 'pointer' : 'default' }}
                onClick={() => eventForStage && setSelectedEvent(eventForStage)}
              >
                <div className="timeline-marker">
                  {isDone ? '✓' : isCurrent ? '⏳' : idx + 1}
                </div>

                <div style={{ background: isCurrent ? '#f0fdf4' : 'transparent', border: isCurrent ? '1px solid #bbf7d0' : 'none', padding: isCurrent ? '0.75rem' : '0.2rem 0', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#14532d' : isDone ? '#0f172a' : '#94a3b8' }}>
                      {stage.label}
                    </h4>

                    {eventForStage && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(eventForStage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {eventForStage && (
                    <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                      {eventForStage.reason}
                    </p>
                  )}

                  {isCurrent && (
                    <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', background: 'white', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px dashed #86efac', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#166534', fontWeight: 700 }}>
                      <span>Next step: {eventForStage?.next_action || 'Processing at centre counter'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Direct Benefit Transfer (DBT) Payment Status Section */}
      {payment && (
        <div className="card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #cbd5e1' }}>
          <div className="card-header">
            <h3 className="card-title">
              <CreditCard size={20} color="#16a34a" /> Direct Benefit Transfer (DBT) Payment Status
            </h3>
            <span className={`badge badge-${payment.status === 'PAID' ? 'green' : 'yellow'}`}>
              {payment.status}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: '#f1f5f9', padding: '1rem', borderRadius: '10px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Total MSP Payout:</span>
              <strong style={{ fontSize: '1.25rem', color: '#15803d', fontWeight: 800 }}>₹{payment.amount.toLocaleString()}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Payment Voucher Ref:</span>
              <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{payment.reference_number}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Processing Department:</span>
              <strong style={{ color: '#0f172a' }}>{payment.owner}</strong>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Bank Credit Target:</span>
              <strong style={{ color: '#0f172a' }}>{payment.bank_account_mask}</strong>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.8rem', color: '#14532d', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Payment Explanation:</strong> {payment.reason}
              <div style={{ marginTop: '0.1rem' }}>Next Payout Step: <strong>{payment.next_action}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Step Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Stage Transition Log Detail</h3>
              <button onClick={() => setSelectedEvent(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div><span style={{ color: '#64748b' }}>Transition:</span> <strong>{selectedEvent.previous_status} → {selectedEvent.new_status}</strong></div>
              <div><span style={{ color: '#64748b' }}>Handled By:</span> <strong>{selectedEvent.actor_name} ({selectedEvent.actor_role})</strong></div>
              <div><span style={{ color: '#64748b' }}>Assigned Owner:</span> <strong>{selectedEvent.owner}</strong></div>
              <div><span style={{ color: '#64748b' }}>Timestamp:</span> <strong>{new Date(selectedEvent.created_at).toLocaleString()}</strong></div>
              <div><span style={{ color: '#64748b' }}>Operational Reason:</span> <strong>{selectedEvent.reason}</strong></div>
              <div><span style={{ color: '#64748b' }}>Explicit Next Action:</span> <strong style={{ color: '#16a34a' }}>{selectedEvent.next_action}</strong></div>
              {selectedEvent.notes && (
                <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Inspector Notes:</span>
                  {selectedEvent.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
