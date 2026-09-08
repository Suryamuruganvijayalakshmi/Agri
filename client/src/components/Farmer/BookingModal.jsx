import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, Weight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import FarmerBookingPositionGrid from './FarmerBookingPositionGrid';
import { fetchProducts, fetchSlots } from '../../services/api';

export default function BookingModal({ centre, farmerId = 'F-1042', farmerName = 'Ramesh Gowda', onClose, onBookingSuccess }) {
  const [crop, setCrop] = useState('Paddy (Sona Masoori)');
  const [products, setProducts] = useState([]);
  const [quantity, setQuantity] = useState(1000);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotError, setSlotError] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });

  useEffect(() => {
    let active = true;
    fetchProducts().then((result) => {
      if (!active || !result.success || !result.products?.length) return;
      setProducts(result.products);
      setCrop((current) => result.products.some((product) => product.name === current)
        ? current
        : result.products[0].name);
    }).catch(() => {});

    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setSlotsLoading(true);
    setSlotError('');
    fetchSlots(centre?.id || 'centre-1', date).then((result) => {
      if (!active) return;
      const availableSlots = (result.slots || []).filter((slot) => slot.is_available && !slot.is_past);
      setSlots(availableSlots);
      setSelectedSlotId((current) => availableSlots.some((slot) => slot.id === current)
        ? current
        : availableSlots[0]?.id || '');
    }).catch(() => {
      if (active) setSlotError('Unable to load slots for this date. Please refresh and try again.');
    }).finally(() => {
      if (active) setSlotsLoading(false);
    });

    return () => { active = false; };
  }, [centre?.id, date]);

  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>MongoDB Real-Time Database</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0 0' }}>
              Book Position: {centre?.name || 'Mandya Central Yard'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={18} color="#64748b" />
          </button>
        </div>

        {/* Inputs Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
              Crop Type
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              {products.length === 0 && <option value="Paddy (Sona Masoori)">Paddy (Sona Masoori)</option>}
              {products.map((product) => (
                <option key={product.id} value={product.name}>{product.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
              Quantity (kg)
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
              Booking Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
              Available Slot (1,000 kg)
            </label>
            <select
              value={selectedSlotId}
              onChange={(event) => setSelectedSlotId(event.target.value)}
              disabled={slotsLoading || slots.length === 0}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              {slotsLoading && <option value="">Loading available slots...</option>}
              {!slotsLoading && slots.length === 0 && <option value="">No available slots for this date</option>}
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>{slot.start_time} • {slot.available_positions_count} bays open</option>
              ))}
            </select>
          </div>
        </div>

        {slotError && <div style={{ marginBottom: '1rem', padding: '0.65rem 0.8rem', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '0.82rem', fontWeight: 700 }}>{slotError}</div>}
        {!slotsLoading && !slotError && slots.length === 0 && <div style={{ marginBottom: '1rem', padding: '0.65rem 0.8rem', borderRadius: '8px', background: '#fef3c7', color: '#92400e', fontSize: '0.82rem', fontWeight: 700 }}>No open 1,000 kg slots are available on this date.</div>}

        {/* Real-Time Position Grid Component */}
        {selectedSlot && <FarmerBookingPositionGrid
            slot={selectedSlot}
            centre={centre}
            farmerId={farmerId}
            farmerName={farmerName}
            crop={crop}
            quantityKg={quantity}
            appointmentDate={date}
            onBookingSuccess={(appt) => {
              if (onBookingSuccess) onBookingSuccess(appt);
              setTimeout(() => onClose(), 2500);
            }}
          />}
      </div>
    </div>
  );
}
