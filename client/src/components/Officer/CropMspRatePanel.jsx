import React, { useEffect, useState } from 'react';
import { IndianRupee, RefreshCw, Save, Plus } from 'lucide-react';
import { addProductAPI, fetchProducts, updateCropPriceAPI } from '../../services/api';
import { socket } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';

export default function CropMspRatePanel({ compact = false }) {
  const { profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [editingPrice, setEditingPrice] = useState({});
  const [savingPrice, setSavingPrice] = useState({});
  const [message, setMessage] = useState('');
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [newCrop, setNewCrop] = useState({ name: '', category: 'Grain', msp_price_per_kg: '' });
  const [addingCrop, setAddingCrop] = useState(false);

  const loadProducts = async () => {
    const result = await fetchProducts();
    if (result.success) setProducts(result.products || []);
  };

  useEffect(() => {
    loadProducts();
    const handlePriceUpdate = (payload) => {
      if (payload?.products) setProducts(payload.products);
      else loadProducts();
    };
    socket.on('crop_prices_updated', handlePriceUpdate);
    return () => socket.off('crop_prices_updated', handlePriceUpdate);
  }, []);

  const savePrice = async (product) => {
    const value = Number(editingPrice[product.id]);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage('Enter a valid MSP rate greater than zero.');
      return;
    }

    setSavingPrice((current) => ({ ...current, [product.id]: true }));
    try {
      const result = await updateCropPriceAPI({
        product_id: product.id,
        new_price_per_kg: value,
        reason: `Officer updated ${product.name} MSP`,
        officer_name: profile?.full_name || 'Officer'
      });
      if (!result.success) throw new Error(result.error || 'Rate update failed');
      setProducts(result.products || products);
      setEditingPrice((current) => {
        const next = { ...current };
        delete next[product.id];
        return next;
      });
      setMessage(`${product.name} updated to Rs ${value}/kg.`);
    } catch (error) {
      setMessage(error.message || 'Unable to update MSP rate.');
    } finally {
      setSavingPrice((current) => ({ ...current, [product.id]: false }));
    }
  };

  const addCrop = async (event) => {
    event.preventDefault();
    const name = newCrop.name.trim();
    const rate = Number(newCrop.msp_price_per_kg);
    if (!name || !Number.isFinite(rate) || rate <= 0) {
      setMessage('Enter a crop name and a valid MSP rate greater than zero.');
      return;
    }

    setAddingCrop(true);
    try {
      const result = await addProductAPI({
        name,
        category: newCrop.category,
        msp_price_per_kg: rate,
        package_weight_kg: 50
      });
      if (!result.success) throw new Error(result.error || 'Crop could not be added.');
      await loadProducts();
      setNewCrop({ name: '', category: 'Grain', msp_price_per_kg: '' });
      setShowAddCrop(false);
      setMessage(`${name} added at Rs ${rate}/kg. You can now change its rate below.`);
    } catch (error) {
      setMessage(error.message || 'Unable to add crop.');
    } finally {
      setAddingCrop(false);
    }
  };

  return (
    <section className="card" style={{ padding: compact ? '1rem' : '1.5rem', borderLeft: '5px solid #f59e0b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <div style={{ color: '#92400e', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <IndianRupee size={14} /> Crop MSP Rate Management
          </div>
          <h2 style={{ margin: '0.2rem 0', fontSize: '1.15rem', color: '#0f172a' }}>Live support prices</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>Updates reach farmer calculations and open screens immediately.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => setShowAddCrop((current) => !current)} className="btn btn-primary btn-sm" title="Add a crop">
            <Plus size={14} /> Add crop
          </button>
          <button type="button" onClick={loadProducts} className="btn btn-secondary btn-sm" title="Refresh crop rates">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {message && <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#fef3c7', color: '#92400e', fontSize: '0.82rem', fontWeight: 700 }}>{message}</div>}

      {showAddCrop && (
        <form onSubmit={addCrop} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(130px, 0.8fr) auto', gap: '0.6rem', alignItems: 'end', marginBottom: '1rem', padding: '0.85rem', border: '1px solid #fed7aa', borderRadius: '8px', background: '#fff7ed' }}>
          <label style={{ display: 'grid', gap: '0.25rem', color: '#7c2d12', fontSize: '0.75rem', fontWeight: 800 }}>
            Crop name
            <input required value={newCrop.name} onChange={(event) => setNewCrop((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Ragi" style={{ padding: '0.45rem', border: '1px solid #fdba74', borderRadius: '6px', fontWeight: 400 }} />
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', color: '#7c2d12', fontSize: '0.75rem', fontWeight: 800 }}>
            Category
            <select value={newCrop.category} onChange={(event) => setNewCrop((current) => ({ ...current, category: event.target.value }))} style={{ padding: '0.5rem', border: '1px solid #fdba74', borderRadius: '6px' }}>
              <option>Grain</option>
              <option>Oilseed</option>
              <option>Cash Crop</option>
              <option>Pulse</option>
              <option>Vegetable</option>
            </select>
          </label>
          <label style={{ display: 'grid', gap: '0.25rem', color: '#7c2d12', fontSize: '0.75rem', fontWeight: 800 }}>
            Starting Rs/kg
            <input required type="number" min="0.01" step="0.01" value={newCrop.msp_price_per_kg} onChange={(event) => setNewCrop((current) => ({ ...current, msp_price_per_kg: event.target.value }))} placeholder="0.00" style={{ padding: '0.45rem', border: '1px solid #fdba74', borderRadius: '6px', fontWeight: 400 }} />
          </label>
          <button type="submit" disabled={addingCrop} className="btn btn-primary btn-sm" title="Save new crop">
            {addingCrop ? <RefreshCw size={14} className="spin" /> : <Save size={14} />} Add
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
        {products.map((product) => (
          <div key={product.id} style={{ padding: '0.9rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>{product.name}</div>
            <div style={{ color: '#15803d', fontSize: '1rem', fontWeight: 900 }}>Rs {Number(product.msp_price_per_kg).toFixed(2)}/kg</div>
            <div style={{ color: '#64748b', fontSize: '0.72rem', margin: '0.15rem 0 0.65rem' }}>Rs {(Number(product.msp_price_per_kg) * 100).toLocaleString()}/quintal</div>
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={editingPrice[product.id] || ''}
                onChange={(event) => setEditingPrice((current) => ({ ...current, [product.id]: event.target.value }))}
                placeholder="New rate / kg"
                aria-label={`New MSP rate for ${product.name}`}
                style={{ minWidth: 0, flex: 1, padding: '0.45rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
              <button type="button" onClick={() => savePrice(product)} disabled={!editingPrice[product.id] || savingPrice[product.id]} className="btn btn-primary btn-sm" title={`Save ${product.name} MSP`}>
                {savingPrice[product.id] ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
