import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, ChevronRight, RefreshCw, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { runDemoStep } from '../../services/api';

export default function DemoStoryRunner({ onClose, onRoleSwitch, onRefreshData }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [logMessage, setLogMessage] = useState('Step 1 ready: Click Execute to trigger live scenario!');

  const steps = [
    {
      step: 1,
      title: "1. Farmer Opens Map & Books Centre A (62% Green)",
      desc: "Centre A is 62% green with 14 min wait. System recommends Centre A. Farmer Ramesh Gowda books 2,500 kg slot at 10:30 AM.",
      actionRole: "FARMER"
    },
    {
      step: 2,
      title: "2. Operator Triggers Congestion (62% → 91% RED Marker)",
      desc: "Operator updates Centre A capacity. Realtime Socket fires! Map turns RED instantly without page refresh. Disruption alert & alternative recommended to Ramesh Gowda.",
      actionRole: "OPERATOR"
    },
    {
      step: 3,
      title: "3. Operator Advances Stage to APPROVED",
      desc: "Operator checks farmer in, completes weighbridge & quality verification. MSP compliance verified. Explainable status shows owner & next action.",
      actionRole: "OPERATOR"
    },
    {
      step: 4,
      title: "4. Direct Benefit Transfer Payment Completed (PAID)",
      desc: "Treasury releases ₹55,440 via Aadhaar DBT credit. Ref PAY-2026-004821 generated. Pitch transformation complete!",
      actionRole: "FARMER"
    }
  ];

  const handleExecuteStep = async (stepNum) => {
    setLoading(true);
    try {
      const targetStepObj = steps.find(s => s.step === stepNum);
      if (targetStepObj && onRoleSwitch) {
        onRoleSwitch(targetStepObj.actionRole);
      }

      const res = await runDemoStep(stepNum);
      if (res.success) {
        setLogMessage(`✅ ${res.message}`);
        setCurrentStep(stepNum < 4 ? stepNum + 1 : 4);
        if (onRefreshData) onRefreshData();
      }
    } catch (e) {
      setLogMessage(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={24} color="#f59e0b" />
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                AGRIFlow 5-Minute Judge Pitch Demo Story Runner
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                Automates the exact real-time end-to-end transformation story requested by judges.
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Live Step Tracker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
          {steps.map((st) => {
            const isActive = currentStep === st.step;
            const isCompleted = currentStep > st.step;

            return (
              <div
                key={st.step}
                style={{
                  background: isActive ? '#1e293b' : 'rgba(255,255,255,0.03)',
                  border: isActive ? '2px solid #16a34a' : '1px solid rgba(255,255,255,0.08)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ background: isCompleted ? '#16a34a' : isActive ? '#f59e0b' : '#334155', color: 'white', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      {isCompleted ? '✓' : st.step}
                    </span>
                    <strong style={{ fontSize: '0.95rem', color: isActive ? '#4ade80' : 'white' }}>{st.title}</strong>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0, paddingLeft: '1.8rem' }}>
                    {st.desc}
                  </p>
                </div>

                <button
                  onClick={() => handleExecuteStep(st.step)}
                  disabled={loading}
                  className="btn btn-sm btn-primary"
                  style={{ flexShrink: 0, padding: '0.4rem 0.75rem' }}
                >
                  {loading && currentStep === st.step ? <RefreshCw size={14} className="spin" /> : <Play size={14} />} Execute Step {st.step}
                </button>
              </div>
            );
          })}
        </div>

        {/* Live Execution Output Log */}
        <div style={{ background: '#020617', border: '1px solid #1e293b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.8rem', color: '#4ade80', fontFamily: 'monospace' }}>
          <strong style={{ color: '#94a3b8' }}>DEMO REALTIME BUS LOG:</strong>
          <div style={{ marginTop: '0.25rem' }}>{logMessage}</div>
        </div>
      </div>
    </div>
  );
}
