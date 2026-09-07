import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Sparkles, Award, FileText, AlertTriangle } from 'lucide-react';
import { submitQualityInspectionAPI } from '../services/api';
import { socket } from '../services/socket';

export default function QualityInspectorDashboard() {
  const [appointments, setAppointments] = useState([
    { id: 'APPT-2026-9042', booking_id: 'AF-2026-00124', farmer_name: 'Ramesh Gowda', crop: 'Paddy (Sona Masoori)', declared_quantity_kg: 2500, measured_quantity_kg: 2488, token_number: 'A-0024', status: 'WEIGHED' },
    { id: 'APPT-2026-9043', booking_id: 'AF-2026-00125', farmer_name: 'Siddappa Gowda', crop: 'Ragi (Finger Millet)', declared_quantity_kg: 1800, measured_quantity_kg: 1800, token_number: 'A-0025', status: 'WEIGHED' },
    { id: 'APPT-2026-9044', booking_id: 'AF-2026-00126', farmer_name: 'Kumar S.', crop: 'Wheat (Durum)', declared_quantity_kg: 3200, measured_quantity_kg: 3190, token_number: 'A-0026', status: 'WEIGHED' }
  ]);

  const [selectedAppt, setSelectedAppt] = useState(appointments[0]);
  const [moisture, setMoisture] = useState(13.2);
  const [foreignMatter, setForeignMatter] = useState(0.4);
  const [damaged, setDamaged] = useState(0.2);
  const [grade, setGrade] = useState('Grade A');
  const [remarks, setRemarks] = useState('MSP Moisture Standard Compliant (Under 14%)');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleInspection = async (statusDecision) => {
    if (!selectedAppt) return;
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await submitQualityInspectionAPI({
        appointment_id: selectedAppt.id,
        moisture_percent: Number(moisture),
        foreign_matter_percent: Number(foreignMatter),
        damaged_percent: Number(damaged),
        grade,
        remarks,
        status: statusDecision,
        inspector_name: 'Senior Quality Inspector (Mandya)'
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record quality inspection.');
      } else {
        setSuccessMsg(`Inspection recorded as ${statusDecision}! Procurement stage updated.`);
        setAppointments(prev => prev.filter(a => a.id !== selectedAppt.id));
        setSelectedAppt(null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting quality inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🧪 Mandatory MSP Quality & Moisture Testing Laboratory
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={28} color="#4ade80" /> Quality Inspector Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
              Digitally measure moisture %, foreign matter %, assign Grade A/B, and authorize procurement payout.
            </p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.5rem 1rem', borderRadius: '10px', textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>PENDING INSPECTIONS</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fbbf24' }}>{appointments.length} Samples Waiting</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
        
        {/* Left Form: Quality Inspection Controls */}
        {selectedAppt ? (
          <div className="card" style={{ padding: '1.5rem', border: '2px solid #16a34a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>Token {selectedAppt.token_number}</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                  {selectedAppt.farmer_name} • {selectedAppt.crop}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Weighed Qty</span>
                <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>{selectedAppt.measured_quantity_kg || 2488} kg</strong>
              </div>
            </div>

            {successMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 700 }}>
                <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  Moisture Percentage (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={moisture}
                  onChange={(e) => setMoisture(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, color: moisture > 14 ? '#dc2626' : '#15803d' }}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: moisture > 14 ? '#dc2626' : '#64748b', fontWeight: 600 }}>
                  {moisture > 14 ? '⚠️ Moisture exceeds 14% threshold!' : '✓ Compliant (<14%)'}
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  Grade Classification
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  <option value="Grade A">Grade A (100% MSP Payout)</option>
                  <option value="Grade B">Grade B (Standard MSP)</option>
                  <option value="Grade C">Grade C (Deductions Apply)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  Foreign Matter %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foreignMatter}
                  onChange={(e) => setForeignMatter(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                  Damaged Grain %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={damaged}
                  onChange={(e) => setDamaged(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.3rem' }}>
                Inspector Lab Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            {/* Decision Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleInspection('ACCEPTED')}
                disabled={submitting}
                style={{ padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
              >
                <CheckCircle2 size={18} /> ACCEPT (Authorize Payout)
              </button>

              <button
                type="button"
                onClick={() => handleInspection('RECHECK')}
                disabled={submitting}
                style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid #d97706', background: '#fef9c3', color: '#854d0e', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                RECHECK
              </button>

              <button
                type="button"
                onClick={() => handleInspection('REJECTED')}
                disabled={submitting}
                style={{ padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
              >
                <XCircle size={18} /> REJECT
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            <Award size={40} color="#cbd5e1" style={{ margin: '0 auto 0.5rem auto' }} />
            Select a waiting sample from the right sidebar to perform quality & moisture inspection.
          </div>
        )}

        {/* Right Sidebar: Waiting Samples Queue */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            📋 WEIGHED SAMPLES WAITING FOR QUALITY TEST ({appointments.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {appointments.map((a) => {
              const isSelected = selectedAppt?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAppt(a)}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', fontFamily: 'monospace' }}>
                      Token {a.token_number}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.booking_id}</span>
                  </div>

                  <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{a.farmer_name}</strong>
                  <span style={{ fontSize: '0.78rem', color: '#475569' }}>{a.crop} • {a.measured_quantity_kg || a.declared_quantity_kg} kg</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
