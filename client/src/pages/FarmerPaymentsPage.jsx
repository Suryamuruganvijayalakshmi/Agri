import React, { useState, useEffect } from 'react';
import { CreditCard, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { fetchFarmerTimeline } from '../services/api';

export default function FarmerPaymentsPage() {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchFarmerTimeline('F-1042').then(res => {
      if (res.success && res.timeline?.payments) {
        setPayments(res.timeline.payments);
      }
    });
  }, []);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            💳 Direct Benefit Transfer (DBT) Payment Status
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Real-time tracking of state treasury MSP payouts linked to your Aadhaar bank account.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {payments.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            No payment vouchers issued yet. Payments are generated automatically upon quality approval.
          </div>
        ) : (
          payments.map(p => {
            const isCompleted = p.status === 'COMPLETED' || p.status === 'PAID';
            const isProcessing = p.status === 'PROCESSING';

            return (
              <div key={p.id} className="card" style={{ borderLeft: `6px solid ${isCompleted ? '#16a34a' : isProcessing ? '#3b82f6' : '#f59e0b'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <span className={`badge badge-${isCompleted ? 'green' : 'yellow'}`} style={{ marginBottom: '0.3rem' }}>
                      {isCompleted ? '🟢 COMPLETED' : isProcessing ? '🔵 PROCESSING' : '🟡 PENDING'}
                    </span>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', margin: 0 }}>
                      ₹{Number(p.amount).toLocaleString()}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      Ref Voucher: {p.reference_number || p.id}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                    <div>Initiated: {p.initiated_at ? new Date(p.initiated_at).toLocaleDateString() : 'Today'}</div>
                    {p.completed_at && <div>Completed: {new Date(p.completed_at).toLocaleDateString()}</div>}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>DEPARTMENT OWNER:</span>
                    <strong>{p.owner}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>CREDIT TARGET:</span>
                    <strong>{p.bank_account_mask || 'State Bank of India (*4902)'}</strong>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.825rem', color: '#14532d', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Payment Reason & Status Explanation:</strong> {p.reason}
                    <div style={{ marginTop: '0.15rem' }}>Next Action: <strong>{p.next_action}</strong></div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
