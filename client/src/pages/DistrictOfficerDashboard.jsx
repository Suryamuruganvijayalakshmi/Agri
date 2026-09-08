import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Activity, AlertTriangle, CheckCircle2, Clock, MapPin, ShieldCheck, ArrowUpRight, BarChart3, FileSpreadsheet, IndianRupee, Pencil, Save, RefreshCw } from 'lucide-react';
import ProcurementMap from '../components/Map/ProcurementMap';
import RealtimePackageMonitorWidget from '../components/Farmer/RealtimePackageMonitorWidget';
import { fetchAdminMetrics, fetchProducts, updateCropPriceAPI } from '../services/api';

export default function DistrictOfficerDashboard({ centres: liveCentres }) {
  const { profile } = useAuth();
  const districtName = profile?.district || 'Mandya';

  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [editingPrice, setEditingPrice] = useState({}); // { product_id: newPriceStr }
  const [savingPrice, setSavingPrice] = useState({});
  const [priceMsg, setPriceMsg] = useState('');

  useEffect(() => {
    fetchAdminMetrics().then(res => {
      if (res.success) setMetrics(res.metrics);
    });
    loadProducts();
  }, [liveCentres]);

  // Live local clock
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const timeLabel = now.toLocaleString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  const loadProducts = async () => {
    const res = await fetchProducts();
    if (res.success && res.products) setProducts(res.products);
  };

  const handlePriceChange = (productId, value) => {
    setEditingPrice(prev => ({ ...prev, [productId]: value }));
  };

  const handleSavePrice = async (product) => {
    const newPrice = parseFloat(editingPrice[product.id]);
    if (isNaN(newPrice) || newPrice <= 0) { setPriceMsg('⚠️ Enter a valid price.'); return; }
    setSavingPrice(prev => ({ ...prev, [product.id]: true }));
    try {
      const res = await updateCropPriceAPI({
        product_id: product.id,
        new_price_per_kg: newPrice,
        reason: `Officer MSP update from ₹${product.msp_price_per_kg}/kg to ₹${newPrice}/kg`,
        officer_name: profile?.full_name || 'District Officer'
      });
      if (res.success) {
        setPriceMsg(`✅ ${product.name} rate updated to ₹${newPrice}/kg successfully.`);
        await loadProducts();
        setEditingPrice(prev => { const n = {...prev}; delete n[product.id]; return n; });
      } else { setPriceMsg(`❌ Failed: ${res.error}`); }
    } catch (e) { setPriceMsg('❌ Network error.'); }
    setSavingPrice(prev => ({ ...prev, [product.id]: false }));
    setTimeout(() => setPriceMsg(''), 4000);
  };

  const allCentres = liveCentres || metrics?.centres || [];
  const districtCentres = allCentres.filter(c => c.district === districtName || c.district === 'Mandya');

  const operationalCount = districtCentres.filter(c => c.color_status === 'GREEN').length;
  const highLoadCount = districtCentres.filter(c => c.color_status === 'YELLOW').length;
  const fullCount = districtCentres.filter(c => c.color_status === 'RED').length;
  const closedCount = districtCentres.filter(c => c.color_status === 'GREY').length;

  const totalCap = districtCentres.reduce((s, c) => s + c.daily_capacity_kg, 0);
  const totalBooked = districtCentres.reduce((s, c) => s + (c.booked_capacity_kg || c.current_booked_kg || 0), 0);
  const utilPercent = totalCap > 0 ? Math.round((totalBooked / totalCap) * 100) : 0;
  const avgWait = districtCentres.length > 0
    ? Math.round(districtCentres.reduce((s, c) => s + c.est_wait_minutes, 0) / districtCentres.length)
    : 15;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="badge badge-green" style={{ marginBottom: '0.3rem' }}>District Level Jurisdiction</span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
              🏢 {districtName} District Nodal Command Centre
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Nodal Officer: <strong>{profile?.full_name || 'Dr. C. Mahadevan'}</strong> • Monitoring {districtCentres.length} District Yards
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to="/operator/analytics"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', fontSize: '0.82rem', fontWeight: 800, padding: '0.45rem 0.85rem' }}
            >
              <BarChart3 size={15} /> 📊 Performance Analytics
            </Link>
            <Link
              to="/operator/statements"
              className="btn btn-secondary"
              style={{ background: '#334155', color: '#fbbf24', border: '1px solid #d97706', fontSize: '0.82rem', fontWeight: 800, padding: '0.45rem 0.85rem' }}
            >
              <FileSpreadsheet size={15} /> 📑 Payment Statements
            </Link>
            <span className="badge badge-green">🟢 {operationalCount} Available</span>
            <span className="badge badge-yellow">🟡 {highLoadCount} Busy</span>
            <span className="badge badge-red">🔴 {fullCount} Full</span>
            <span className="badge badge-grey">⚫ {closedCount} Closed</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>DISTRICT CAPACITY UTILIZATION</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {utilPercent}%
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>{totalBooked.toLocaleString()} kg / {totalCap.toLocaleString()} kg</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>AVG DISTRICT WAIT TIME</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', margin: '0.2rem 0' }}>
            {avgWait} Minutes
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Across all active yards</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PENDING DISTRICT APPROVALS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', margin: '0.2rem 0' }}>
            8 Procurements
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>MSP grade verification</span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>OPEN DISTRICT EXCEPTIONS</span>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', margin: '0.2rem 0' }}>
            {metrics?.unresolvedExceptions || 2} Issues
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>Escalated for Nodal action</span>
        </div>
      </div>

      {/* Grid: Left Map, Right District Centres List */}
      <div className="responsive-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3 className="card-title"><MapPin size={20} color="#16a34a" /> District Live Availability Map</h3>
          </div>
          <ProcurementMap centres={districtCentres} onSelectCentre={() => {}} onBookCentre={() => {}} />
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '1rem' }}>
            <Building2 size={20} color="#15803d" /> {districtName} District Centres Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {districtCentres.map(c => (
              <div key={c.id} style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{c.name}</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Queue: {c.queue_count} farmers • Est wait: {c.est_wait_minutes} mins</span>
                </div>

                <span className={`badge badge-${c.color_status.toLowerCase()}`}>
                  {c.color_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Realtime Load Package Monitor */}
      <RealtimePackageMonitorWidget />

      {/* ── CROP MSP RATE MANAGEMENT PANEL ── */}
      <div className="card" style={{ padding: '1.5rem', borderLeft: '5px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <IndianRupee size={14} /> Officer Control — Crop MSP Rate Management
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0 0' }}>📋 Set Crop Minimum Support Prices</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>Changes apply instantly to all farmer calculations and payment vouchers system-wide.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
            <button onClick={loadProducts} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.75rem' }}><RefreshCw size={13} /> Refresh Rates</button>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}><Clock size={11} style={{ verticalAlign: 'middle' }} /> {timeLabel}</span>
          </div>
        </div>

        {priceMsg && (
          <div style={{ background: priceMsg.startsWith('✅') ? '#dcfce7' : '#fee2e2', border: `1px solid ${priceMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`, color: priceMsg.startsWith('✅') ? '#166534' : '#991b1b', padding: '0.65rem 1rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 700 }}>
            {priceMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {products.length === 0 && (
            <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem' }}>No crop products found. Products are seeded automatically on first startup.</div>
          )}
          {products.map(product => (
            <div key={product.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>🌾 {product.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.1rem' }}>{product.category} • Moisture ≤ {product.moisture_threshold_percent}%</div>
                </div>
                <span style={{ background: product.status === 'APPROVED' ? '#dcfce7' : '#fef3c7', color: product.status === 'APPROVED' ? '#166534' : '#92400e', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '9999px' }}>{product.status}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Current MSP:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#15803d' }}>₹{product.msp_price_per_kg}/kg</span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>= ₹{(product.msp_price_per_kg * 100).toLocaleString()}/quintal</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder={String(product.msp_price_per_kg)}
                    value={editingPrice[product.id] !== undefined ? editingPrice[product.id] : ''}
                    onChange={e => handlePriceChange(product.id, e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.8rem', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
                <button
                  onClick={() => handleSavePrice(product)}
                  disabled={!editingPrice[product.id] || savingPrice[product.id]}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '0.5rem 0.9rem', background: '#15803d', border: 'none', opacity: !editingPrice[product.id] ? 0.5 : 1 }}
                >
                  {savingPrice[product.id] ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
                  {savingPrice[product.id] ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
