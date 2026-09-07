import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, FileText, Scale, RefreshCw } from 'lucide-react';
import { updateProcurementStage } from '../services/api';

export default function InspectorDashboardPage() {
  const [inspections, setInspections] = useState([
    {
      id: 'INSP-2026-001',
      procurement_id: 'PROC-2026-9042',
      appointment_id: 'APPT-2026-8801',
      farmer_name: 'Ramesh Gowda',
      farmer_code: 'F-1042',
      crop: 'Paddy (Sona Masoori)',
      measured_weight_kg: 2520,
      centre_name: 'Mandya Central Procurement Yard',
      moisture_percent: 13.2,
      foreign_matter_percent: 0.4,
      damaged_percent: 0.2,
      broken_percent: 0.5,
      grade: 'Grade A',
      status: 'PENDING'
    },
    {
      id: 'INSP-2026-002',
      procurement_id: 'PROC-2026-9043',
      appointment_id: 'APPT-2026-8802',
      farmer_name: 'Siddappa Gowda',
      farmer_code: 'F-1043',
      crop: 'Ragi (Finger Millet)',
      measured_weight_kg: 3100,
      centre_name: 'Mandya Central Procurement Yard',
      moisture_percent: 12.8,
      foreign_matter_percent: 0.3,
      damaged_percent: 0.1,
      broken_percent: 0.4,
      grade: 'Grade A',
      status: 'PENDING'
    }
  ]);

  const [selectedInspection, setSelectedInspection] = useState(inspections[0]);
  const [moisture, setMoisture] = useState('13.2');
  const [foreignMatter, setForeignMatter] = useState('0.4');
  const [damaged, setDamaged] = useState('0.2');
  const [broken, setBroken] = useState('0.5');
  const [grade, setGrade] = useState('Grade A');
  const [remarks, setRemarks] = useState('Quality meets MSP Grade A standards. Moisture 13.2% within allowable limit.');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInspect = async (decision) => {
    if (!selectedInspection) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await updateProcurementStage({
        procurement_id: selectedInspection.procurement_id,
        new_status: decision === 'ACCEPT' ? 'APPROVED' : 'REJECTED',
        actual_weighed_kg: selectedInspection.measured_weight_kg,
        quality_grade: grade,
        quality_moisture: `${moisture}%`,
        reason: `Quality Inspection ${decision}: Moisture ${moisture}%, Grade ${grade}. ${remarks}`,
        owner: 'Quality Inspector (Mandya)',
        next_action: decision === 'ACCEPT' ? 'DBT Voucher Generation' : 'Farmer Advisory'
      });

      if (res.success) {
        setMessage({
          type: 'success',
          text: `Produce ${decision === 'ACCEPT' ? 'ACCEPTED & APPROVED' : 'REJECTED'}. Record updated in Supabase!`
        });

        setInspections(prev => prev.map(i => i.id === selectedInspection.id ? { ...i, status: decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : i));
      } else {
        setMessage({ type: 'error', text: res.error || 'Inspection submission failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase' }}>
            🧪 Mandya District Quality Assay Laboratory
          </span>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
            Quality Inspection Dashboard
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Inspect moisture levels, impurity specs, and certify MSP Grade A/B compliance.
          </p>
        </div>
      </div>

      {message && (
        <div style={{
          background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#15803d' : '#991b1b',
          padding: '0.85rem',
          borderRadius: '10px',
          fontSize: '0.85rem'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
        
        {/* Pending Inspections List */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
            Pending Inspections ({inspections.filter(i => i.status === 'PENDING').length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {inspections.map((item) => {
              const isSelected = selectedInspection?.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedInspection(item);
                    setMoisture(String(item.moisture_percent));
                    setForeignMatter(String(item.foreign_matter_percent));
                    setDamaged(String(item.damaged_percent));
                    setBroken(String(item.broken_percent));
                    setGrade(item.grade);
                  }}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '10px',
                    border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0fdf4' : 'white',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{item.farmer_name}</strong>
                    <span className={`badge badge-${item.status === 'ACCEPTED' ? 'green' : item.status === 'REJECTED' ? 'red' : 'yellow'}`} style={{ fontSize: '0.65rem' }}>
                      {item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {item.crop} • {item.measured_weight_kg.toLocaleString()} kg
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, marginTop: '0.2rem' }}>
                    ID: {item.procurement_id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Inspection Form */}
        {selectedInspection ? (
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', marginBottom: '1.25rem' }}>
              <span className="badge badge-green">Assay Spec Certification</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
                Inspection for {selectedInspection.farmer_name} ({selectedInspection.farmer_code})
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                {selectedInspection.crop} • Weighbridge Net Weight: <strong>{selectedInspection.measured_weight_kg.toLocaleString()} kg</strong>
              </p>
            </div>

            {/* Quality Specs Input Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Moisture Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={moisture}
                  onChange={(e) => setMoisture(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Standard ≤ 14.0%</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Foreign Matter Impurity (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={foreignMatter}
                  onChange={(e) => setForeignMatter(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
                <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>Standard ≤ 1.0%</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Damaged Grains (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={damaged}
                  onChange={(e) => setDamaged(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                  Grade Category
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                >
                  <option value="Grade A">Grade A (Full MSP Payout)</option>
                  <option value="Grade B">Grade B (Standard MSP)</option>
                  <option value="Under-Spec">Under-Spec (Requires Recheck)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
                Inspector Remarks & Test Notes
              </label>
              <textarea
                rows="3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => handleInspect('ACCEPT')}
                disabled={loading || selectedInspection.status !== 'PENDING'}
                className="btn btn-primary btn-lg"
                style={{ background: '#16a34a', borderColor: '#15803d' }}
              >
                <CheckCircle2 size={18} /> {loading ? 'Saving...' : 'Accept Produce & Certify'}
              </button>

              <button
                type="button"
                onClick={() => handleInspect('REJECT')}
                disabled={loading || selectedInspection.status !== 'PENDING'}
                className="btn btn-danger btn-lg"
              >
                <XCircle size={18} /> Reject / Send for Recheck
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            Select an inspection from the list.
          </div>
        )}

      </div>
    </div>
  );
}
