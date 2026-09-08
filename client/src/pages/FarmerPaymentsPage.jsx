import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, ShieldCheck, Clock, CheckCircle2, AlertCircle, RefreshCw, Zap, Building, ArrowRight, Download } from 'lucide-react';
import { fetchFarmerTimeline, fetchFarmerDashboard } from '../services/api';
import useRealtimePolling from '../hooks/useRealtimePolling';

export default function FarmerPaymentsPage() {
  const { user, profile } = useAuth();
  const farmerId = user?.id || 'default-farmer';
  const farmerName = profile?.full_name || user?.full_name || 'Farmer';

  const { data: timelineData, loading, refresh, realtimePulse } = useRealtimePolling(
    () => fetchFarmerTimeline(farmerId),
    3000,
    ['payment_updated', 'queue_updated'],
    [farmerId]
  );

  const payments = timelineData?.timeline?.payments || [];

  // Payout summary
  const totalPaid = payments
    .filter(p => p.status === 'PAID' || p.status === 'COMPLETED')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPending = payments
    .filter(p => p.status !== 'PAID' && p.status !== 'COMPLETED' && p.status !== 'FAILED')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>

      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Zap size={14} /> PFMS & AADHAAR DBT PAYMENTS GATEWAY
            </span>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0.25rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              Direct Benefit Transfer (DBT) Payouts
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              State Treasury Minimum Support Price (MSP) disbursements linked directly to your Aadhaar-seeded bank account.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '9999px' }}>
              <Zap size={12} /> {realtimePulse ? 'UPDATING...' : 'LIVE SYNC'}
            </span>
            <button
              onClick={refresh}
              className="btn btn-secondary btn-sm"
              style={{ background: '#334155', color: 'white', border: 'none', padding: '0.4rem 0.75rem' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '5px solid #16a34a' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            TOTAL CREDITED (PAID)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#15803d', margin: '0.3rem 0' }}>
            ₹{totalPaid.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
            Credited via Bank DBT
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '5px solid #f59e0b' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            IN PIPELINE (PROCESSING / APPROVED)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', margin: '0.3rem 0' }}>
            ₹{totalPending.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
            Under Treasury Processing
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '5px solid #3b82f6' }}>
          <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            TOTAL VOUCHERS
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1e293b', margin: '0.3rem 0' }}>
            {payments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Procurement Payout Records
          </div>
        </div>
      </div>

      {/* Payment Vouchers List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {payments.length === 0 ? (
          <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <span style={{ fontSize: '2.5rem' }}>💳</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.5rem 0 0.25rem 0' }}>
              No Payment Vouchers Issued Yet
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
              Payment vouchers are generated automatically upon weighment and quality completion at the procurement centre.
            </p>
          </div>
        ) : (
          payments.map(p => {
            const isPaid = p.status === 'PAID' || p.status === 'COMPLETED';
            const isApproved = p.status === 'APPROVED';
            const isProcessing = p.status === 'PROCESSING';
            const isPending = p.status === 'PENDING';

            const borderColor = isPaid ? '#16a34a' : isApproved ? '#0d9488' : isProcessing ? '#3b82f6' : '#f59e0b';
            const badgeBg = isPaid ? '#dcfce7' : isApproved ? '#ccfbf1' : isProcessing ? '#eff6ff' : '#fef3c7';
            const badgeColor = isPaid ? '#166534' : isApproved ? '#0f766e' : isProcessing ? '#1e40af' : '#78350f';
            const badgeLabel = isPaid ? '🟢 PAID VIA DBT' : isApproved ? '❇️ APPROVED (TRANSFER IN PROGRESS)' : isProcessing ? '🔵 PROCESSING AT TREASURY' : '🟡 PENDING APPROVAL';

            // Payment stages
            const payStages = ['PENDING', 'PROCESSING', 'APPROVED', 'PAID'];
            const currentPayIndex = payStages.indexOf(p.status);

            return (
              <div key={p.id || p.reference_number} className="card" style={{ borderLeft: `6px solid ${borderColor}`, padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: badgeBg,
                      color: badgeColor,
                      marginBottom: '0.4rem'
                    }}>
                      {badgeLabel}
                    </span>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d', margin: 0 }}>
                      ₹{Number(p.amount).toLocaleString()}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                      VOUCHER REF: {p.reference_number || p.id}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>
                    <div>Produce: <strong>{p.crop || 'Paddy'} ({Number(p.quantity_kg || 0).toLocaleString()} kg)</strong></div>
                    <div>Initiated: <strong>{p.initiated_at ? new Date(p.initiated_at).toLocaleDateString() : 'Today'}</strong></div>
                    {p.completed_at && (
                      <div style={{ color: '#16a34a', fontWeight: 700 }}>
                        Completed: {new Date(p.completed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', textAlign: 'center' }}>
                    {payStages.map((stg, sIdx) => {
                      const isPast = sIdx < currentPayIndex;
                      const isCurr = sIdx === currentPayIndex;
                      return (
                        <div key={stg} style={{ fontSize: '0.72rem' }}>
                          <div style={{
                            height: '6px',
                            borderRadius: '3px',
                            background: isPast || isCurr ? (isPaid ? '#16a34a' : isApproved ? '#0d9488' : '#3b82f6') : '#e2e8f0',
                            marginBottom: '0.35rem'
                          }} />
                          <span style={{ fontWeight: isCurr ? 800 : 600, color: isCurr ? '#0f172a' : '#94a3b8' }}>
                            {stg}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bank & Department Details */}
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.825rem', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>DEPARTMENT OWNER:</span>
                    <strong>{p.owner || 'State Agriculture Marketing Board'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.7rem', fontWeight: 700 }}>CREDIT TARGET (AADHAAR SEEDED):</span>
                    <strong>{p.bank_account_mask || 'State Bank of India (A/C ending *4902)'}</strong>
                  </div>
                </div>

                {/* Status Explanation */}
                <div style={{ background: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '0.825rem', color: '#14532d', display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <ShieldCheck size={20} style={{ flexShrink: 0, color: '#16a34a' }} />
                  <div>
                    <strong>Status:</strong> {p.reason || 'Procurement completed. Payment voucher generated.'}
                    <div style={{ marginTop: '0.15rem' }}>Next Action: <strong>{p.next_action || 'Electronic bank credit transfer.'}</strong></div>
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
