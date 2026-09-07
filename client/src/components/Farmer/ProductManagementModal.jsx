import React, { useState, useEffect } from 'react';
import { PlusCircle, Package, Check, X, AlertCircle, Sparkles, Sprout } from 'lucide-react';
import { fetchProducts, addProductAPI } from '../../services/api';

export default function ProductManagementModal({ isOpen, onClose, onProductSelected }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Product Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Grain');
  const [packageWeightKg, setPackageWeightKg] = useState(50);
  const [mspPricePerKg, setMspPricePerKg] = useState(25);
  const [moistureThresholdPercent, setMoistureThresholdPercent] = useState(13);
  const [icon, setIcon] = useState('🌾');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadProductsList = async () => {
    try {
      setLoading(true);
      const res = await fetchProducts();
      if (res.success && res.products) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProductsList();
    }
  }, [isOpen]);

  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await addProductAPI({
        name: name.trim(),
        category,
        package_weight_kg: Number(packageWeightKg),
        msp_price_per_kg: Number(mspPricePerKg),
        moisture_threshold_percent: Number(moistureThresholdPercent),
        icon
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to add custom product');
      } else {
        await loadProductsList();
        setShowAddForm(false);
        setName('');
        if (onProductSelected) onProductSelected(res.product);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error adding product.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '640px', width: '90%', borderRadius: '16px', padding: '1.5rem' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sprout size={24} color="#16a34a" /> FARMER PRODUCT MANAGEMENT
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
              Select an existing registered crop or register a new crop / product type.
            </p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>

        {/* Toggle Form / List */}
        {!showAddForm ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                AVAILABLE REGISTERED CROPS ({products.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', background: '#16a34a', borderColor: '#15803d', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <PlusCircle size={16} /> Register New Crop / Product
              </button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading products...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem', maxHeight: '360px', overflowY: 'auto' }}>
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (onProductSelected) onProductSelected(p);
                      onClose();
                    }}
                    style={{
                      background: p.is_custom ? '#f0fdf4' : '#f8fafc',
                      border: p.is_custom ? '2px solid #86efac' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{p.icon || '🌾'}</span>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>{p.name}</strong>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{p.category}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem', background: 'white', padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <div>1 Package: <strong>{p.package_weight_kg} kg</strong></div>
                      <div>MSP: <strong>₹{p.msp_price_per_kg}/kg</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Add New Crop Form */
          <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', color: '#166534', fontWeight: 600 }}>
              ✨ Registering a new product makes it immediately available for theatre seat slot booking!
            </div>

            {errorMsg && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.65rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Crop / Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Organic Black Rice, Turmeric"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Grain">Grain</option>
                  <option value="Millet">Millet</option>
                  <option value="Spice">Spice</option>
                  <option value="Pulse">Pulse</option>
                  <option value="Cash Crop">Cash Crop</option>
                  <option value="Organic Special">Organic Special</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Package Unit Weight (kg) *
                </label>
                <input
                  type="number"
                  value={packageWeightKg}
                  onChange={(e) => setPackageWeightKg(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                  Est. MSP Rate (₹/kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mspPricePerKg}
                  onChange={(e) => setMspPricePerKg(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.25rem' }}>
                Select Crop Icon Emoji
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['🌾', '🌱', '🌽', '🌶️', '🎋', '🥜', '🥔', '🥭'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    style={{
                      fontSize: '1.25rem',
                      padding: '0.4rem 0.6rem',
                      borderRadius: '8px',
                      border: icon === em ? '2px solid #16a34a' : '1px solid #cbd5e1',
                      background: icon === em ? '#dcfce7' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 800 }}
              >
                {saving ? 'Registering Product...' : 'Confirm & Save Crop Product'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
