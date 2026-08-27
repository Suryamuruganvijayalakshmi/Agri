import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Weight, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Sparkles, ChevronRight } from 'lucide-react';
import { fetchSlots } from '../services/api';
import { supabase } from '../lib/supabase';
import FarmerBookingPositionGrid from '../components/Farmer/FarmerBookingPositionGrid';

export default function FarmerAppointmentsPage({ centres = [] }) {
  const defaultCentre = centres.find(c => c.id === 'centre-1') || centres[0] || {
    id: 'centre-1',
    name: 'Mandya Central Procurement Yard',
    remaining_capacity_kg: 19000,
    color_status: 'GREEN'
  };

  const [selectedCentreId, setSelectedCentreId] = useState(defaultCentre.id);
  const [crop, setCrop] = useState('Paddy (Sona Masoori)');
  const [quantity, setQuantity] = useState(2500);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const centre = centres.find(c => c.id === selectedCentreId) || defaultCentre;

  // Fetch slots from Supabase / Backend API
  const loadSlots = async () => {
    try {
      setLoadingSlots(true);

      // 1. Try Supabase query
      const { data: supaSlots, error: supaErr } = await supabase
        .from('slots')
        .select('*')
        .eq('centre_id', selectedCentreId)
        .eq('slot_date', date);

      if (!supaErr && supaSlots && supaSlots.length > 0) {
        setSlots(supaSlots);
        if (!selectedSlot || !supaSlots.find(s => s.id === selectedSlot.id)) {
          setSelectedSlot(supaSlots.find(s => s.is_available) || supaSlots[0]);
        }
        setLoadingSlots(false);
        return;
      }

      // 2. Fallback to Express backend API
      const res = await fetchSlots(selectedCentreId, date);
      if (res.success && res.slots) {
        setSlots(res.slots);
        if (!selectedSlot || !res.slots.find(s => s.id === selectedSlot.id)) {
          setSelectedSlot(res.slots.find(s => s.is_available) || res.slots[0]);
        }
      } else {
        // Fallback slots if initializing fresh
        const mockSlots = [
          { id: `slot-${selectedCentreId}-0830`, start_time: '08:30 - 09:00 AM', maximum_bookings: 20, current_bookings: 8, is_available: true },
          { id: `slot-${selectedCentreId}-0900`, start_time: '09:00 - 09:30 AM', maximum_bookings: 20, current_bookings: 14, is_available: true },
          { id: `slot-${selectedCentreId}-1000`, start_time: '10:00 - 10:30 AM', maximum_bookings: 20, current_bookings: 19, is_available: true },
          { id: `slot-${selectedCentreId}-1100`, start_time: '11:00 - 11:30 AM', maximum_bookings: 20, current_bookings: 20, is_available: false }
        ];
        setSlots(mockSlots);
        setSelectedSlot(mockSlots[2]);
      }
    } catch (e) {
      console.error('Error fetching slots:', e);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedCentreId, date]);

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📍 Database-Backed Real-Time Slot Booking
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              Farmer Booking Position System
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Real-time cinema-style position reservation backed by Supabase PostgreSQL and Row-Level Locks.
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '0.75rem 1rem', textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>SELECTED CENTRE</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#4ade80' }}>{centre?.name || 'Mandya Central'}</div>
          </div>
        </div>
      </div>

      {/* Main Booking Controls */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '1rem' }}>
          1. Select Procurement Centre & Crop Details
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          
          {/* Facility Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              🏢 Select Cold Storage / Procurement Centre
            </label>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #16a34a', fontSize: '0.88rem', fontWeight: 700 }}
            >
              {centres.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district || 'Mandya'}) - {c.daily_capacity_kg ? `${Math.round(c.daily_capacity_kg/1000)} MT` : '3,500 MT'}
                </option>
              ))}
            </select>
          </div>

          {/* Crop Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Produce Crop Type
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
            >
              <option value="Paddy (Sona Masoori)">Paddy (Sona Masoori)</option>
              <option value="Ragi (Finger Millet)">Ragi (Finger Millet)</option>
              <option value="Maize (Corn)">Maize (Corn)</option>
              <option value="Wheat">Wheat</option>
              <option value="Multipurpose / Fruits & Vegetables">Multipurpose / Fruits & Vegetables</option>
              <option value="Marine & Fish Products">Marine & Fish Products</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Produce Quantity (kg)
            </label>
            <input
              type="number"
              min="100"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
              required
            />
          </div>

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Booking Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
              required
            />
          </div>
        </div>

        {/* Selected Cold Storage Facility Detail Badge Card */}
        {centre && (
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>COLD STORAGE NAME</span>
              <strong style={{ color: '#0f172a' }}>{centre.name}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>LOCATION / DISTRICT</span>
              <strong style={{ color: '#16a34a' }}>📍 {centre.district || 'Mandya'}, {centre.state || 'Tamil Nadu / Karnataka'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>FACILITY CAPACITY</span>
              <strong style={{ color: '#2563eb' }}>{centre.daily_capacity_kg ? `${Math.round(centre.daily_capacity_kg/1000)} MT (${centre.daily_capacity_kg.toLocaleString()} kg)` : '3,500 MT'}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>ITEMS HANDLED & SECTOR</span>
              <strong style={{ color: '#7c3aed' }}>{centre.item_type || 'Multipurpose Produce'} ({centre.sector || 'Public/Pvt'})</strong>
            </div>
          </div>
        )}

        {/* Time Slot Cards Section */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
          2. Select Appointment Time Slot
        </h3>

        {loadingSlots ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
            Loading available database time slots...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {slots.map(s => {
              const max = s.maximum_bookings || 20;
              const booked = s.current_bookings || 0;
              const avail = Math.max(0, max - booked);
              const isFull = booked >= max || !s.is_available;
              const isSelected = selectedSlot?.id === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (!isFull) setSelectedSlot(s);
                  }}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: isSelected
                      ? '2px solid #16a34a'
                      : isFull
                      ? '1px solid #e2e8f0'
                      : '1px solid #cbd5e1',
                    background: isSelected
                      ? '#dcfce7'
                      : isFull
                      ? '#f8fafc'
                      : 'white',
                    opacity: isFull ? 0.65 : 1,
                    cursor: isFull ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(22, 163, 74, 0.15)' : 'none'
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isFull ? '#64748b' : '#0f172a' }}>
                    {s.start_time}
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0.3rem 0', color: isFull ? '#dc2626' : '#15803d' }}>
                    {isFull ? `${max} / ${max} BOOKED` : `${booked} / ${max} BOOKED`}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: isFull ? '#991b1b' : '#166534', fontWeight: 600 }}>
                    {isFull ? 'FULL' : `${avail} AVAILABLE`}
                  </div>

                  <button
                    type="button"
                    disabled={isFull}
                    style={{
                      marginTop: '0.65rem',
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: isFull ? '#cbd5e1' : isSelected ? '#16a34a' : '#f1f5f9',
                      color: isFull ? '#475569' : isSelected ? 'white' : '#0f172a',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: isFull ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isFull ? '[ FULL ]' : isSelected ? '✓ SELECTED' : '[ VIEW POSITIONS ]'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Cinema-Style Farmer Booking Position Grid */}
      {selectedSlot && (
        <FarmerBookingPositionGrid
          slot={selectedSlot}
          centre={centre}
          farmerId="F-1042"
          farmerName="Ramesh Gowda"
          crop={crop}
          quantityKg={quantity}
          onBookingSuccess={() => {
            loadSlots();
          }}
        />
      )}
    </div>
  );
}
