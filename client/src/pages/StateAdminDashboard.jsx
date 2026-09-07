import React, { useState, useEffect } from 'react';
import { Building, Activity, ShieldCheck, CheckCircle2, XCircle, FileText, RefreshCw, BarChart2, Zap, Sprout, AlertTriangle, Layers } from 'lucide-react';
import { fetchAdminMetrics, fetchProducts, approveProductAPI, rejectProductAPI, fetchAuditLogs } from '../services/api';
import ProcurementMap from '../components/Map/ProcurementMap';

export default function StateAdminDashboard({ centres = [] }) {
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW', 'PROPOSALS', 'AUDIT_LOGS'
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState(null);

  const loadStateData = async () => {
    try {
      setLoading(true);
      const metricsRes = await fetchAdminMetrics();
      if (metricsRes.success) setMetrics(metricsRes.metrics);

      const prodRes = await fetchProducts();
      if (prodRes.success) setProducts(prodRes.products);

      const logRes = await fetchAuditLogs();
      if (logRes.success) setAuditLogs(logRes.logs);
    } catch (err) {
      console.error('Error loading State Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStateData();
  }, []);

  const handleApproveProduct = async (prodId) => {
    setActionMsg(null);
    try {
      const res = await approveProductAPI(prodId);
      if (res.success) {
        setActionMsg(`Product proposal approved! Now available state-wide.`);
        loadStateData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRejectProduct = async (prodId) => {
    setActionMsg(null);
    try {
      const res = await rejectProductAPI(prodId);
      if (res.success) {
        setActionMsg(`Product proposal rejected.`);
        loadStateData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pendingProposals = products.filter(p => p.status === 'PENDING' || p.is_custom);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🏛️ STATE AGRICULTURAL PROCUREMENT COMMAND & GOVERNANCE CENTRE
            </span>
            <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: '0.2rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              State Admin Executive Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
              State-wide procurement monitoring, crop proposal approvals, and persistent audit logs.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: activeTab === 'OVERVIEW' ? '#16a34a' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              📊 State Overview
            </button>
            <button
              onClick={() => setActiveTab('PROPOSALS')}
              style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: activeTab === 'PROPOSALS' ? '#16a34a' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Sprout size={14} /> Crop Proposals ({pendingProposals.length})
            </button>
            <button
              onClick={() => setActiveTab('AUDIT_LOGS')}
              style={{ padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none', background: activeTab === 'AUDIT_LOGS' ? '#16a34a' : 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileText size={14} /> Audit Logs ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {actionMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
          <CheckCircle2 size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} /> {actionMsg}
        </div>
      )}

      {/* 4 State Top Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>STATE PROCURED TONNES</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d', margin: '0.2rem 0' }}>
            124.8 MT
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>124,800 kg Total Volume</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL STATE DBT DISBURSED</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563eb', margin: '0.2rem 0' }}>
            ₹27.45 Lakhs
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Direct Benefit Transfers Settled</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>TOTAL REGISTERED FARMERS</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            1,248 Farmers
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Across 139 Procurement Facilities</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ACTIVE FACILITIES</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#7c3aed', margin: '0.2rem 0' }}>
            {centres.length || 139} Storages
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>Mandya & TN Regional Yards</span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 440px', gap: '1.5rem' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '0.5rem' }}>
              <h3 className="card-title"><BarChart2 size={20} color="#16a34a" /> State Procurement Facilities Map</h3>
            </div>
            <ProcurementMap centres={centres} onSelectCentre={() => {}} onBookCentre={() => {}} />
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '1rem' }}>
              🏛️ District Performance Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { district: 'Mandya', yards: 3, capacity_mt: 125, utilization: '68%', status: 'GREEN' },
                { district: 'Coimbatore', yards: 18, capacity_mt: 450, utilization: '82%', status: 'YELLOW' },
                { district: 'Erode', yards: 12, capacity_mt: 320, utilization: '91%', status: 'RED' },
                { district: 'Thanjavur', yards: 24, capacity_mt: 680, utilization: '64%', status: 'GREEN' },
                { district: 'Salem', yards: 15, capacity_mt: 380, utilization: '74%', status: 'GREEN' }
              ].map((d, i) => (
                <div key={i} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{d.district} District</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.yards} Yards • {d.capacity_mt} MT Total Capacity</span>
                  </div>

                  <span className={`badge badge-${d.status.toLowerCase()}`}>
                    {d.utilization} Load
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CROP PROPOSALS TAB */}
      {activeTab === 'PROPOSALS' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sprout size={22} color="#16a34a" /> FARMER CROP & PRODUCT PROPOSALS APPROVAL CONSOLE
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {pendingProposals.map((p) => (
              <div key={p.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.6rem' }}>{p.icon || '🌾'}</span>
                  <div>
                    <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>{p.name}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Category: {p.category}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', background: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.85rem' }}>
                  <div>Package Weight: <strong>{p.package_weight_kg} kg</strong></div>
                  <div>Est. MSP Rate: <strong>₹{p.msp_price_per_kg}/kg</strong></div>
                  <div>Status: <span style={{ color: p.status === 'APPROVED' ? '#16a34a' : '#d97706', fontWeight: 700 }}>{p.status || 'PENDING APPROVAL'}</span></div>
                </div>

                {p.status !== 'APPROVED' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleApproveProduct(p.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Approve Crop
                    </button>
                    <button
                      onClick={() => handleRejectProduct(p.id)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AUDIT LOGS TAB */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={22} color="#2563eb" /> PERSISTENT TRANSACTION AUDIT LOGS
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '450px', overflowY: 'auto' }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                <div>
                  <strong style={{ color: '#0f172a' }}>{log.action}</strong> • <span style={{ color: '#64748b' }}>{log.entity} ({log.entity_id || 'N/A'})</span>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.15rem' }}>
                    Performed by: <strong>{log.user_name} ({log.user_role})</strong>
                  </div>
                </div>

                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
