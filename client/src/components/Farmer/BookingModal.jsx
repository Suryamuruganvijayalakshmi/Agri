import React, { useState } from 'react';
import { X, Calendar, Clock, Weight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import FarmerBookingPositionGrid from './FarmerBookingPositionGrid';

export default function BookingModal({ centre, farmerId = 'F-1042', farmerName = 'Ramesh Gowda', onClose, onBookingSuccess }) {
  const [crop, setCrop] = useState('Paddy (Sona Masoori)');
  const [quantity, setQuantity] = useState(2500);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedSlot = {
    id: `slot-${centre?.id || 'centre-1'}-1000`,
    start_time: '10:00 - 10:30 AM',
    maximum_bookings: 20,
    current_bookings: 13,
    is_available: true
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <div>
            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>Supabase Real-Time Database</span>
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
              <option value="Paddy (Sona Masoori)">Paddy (Sona Masoori)</option>
              <option value="Ragi (Finger Millet)">Ragi (Finger Millet)</option>
              <option value="Maize (Corn)">Maize (Corn)</option>
              <option value="Wheat">Wheat</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
              Quantity (kg)
            </label>
            <input
              type="number"
              min="100"
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
        </div>

        {/* Real-Time Position Grid Component */}
        <FarmerBookingPositionGrid
          slot={selectedSlot}
          centre={centre}
          farmerId={farmerId}
          farmerName={farmerName}
          crop={crop}
          quantityKg={quantity}
          onBookingSuccess={(appt) => {
            if (onBookingSuccess) onBookingSuccess(appt);
            setTimeout(() => onClose(), 2500);
          }}
        />
      </div>
    </div>
  );
}
