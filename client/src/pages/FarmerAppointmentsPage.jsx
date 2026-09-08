import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, Weight, CheckCircle2, AlertTriangle, ShieldCheck, MapPin, Sparkles, ChevronRight, Sprout, Smartphone, Warehouse, Zap, ArrowRight } from 'lucide-react';
import { fetchSlots, bookAppointmentAtomic } from '../services/api';
import { socket } from '../services/socket';
import FarmerBookingPositionGrid from '../components/Farmer/FarmerBookingPositionGrid';
import ProductManagementModal from '../components/Farmer/ProductManagementModal';
import RealtimePackageMonitorWidget from '../components/Farmer/RealtimePackageMonitorWidget';

export default function FarmerAppointmentsPage({ centres = [] }) {
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryCentreId = searchParams.get('centre_id');
  const defaultCentre = (queryCentreId && centres.find(c => c.id === queryCentreId))
    || centres.find(c => c.id === 'centre-1')
    || centres[0]
    || {
      id: 'centre-1',
      name: 'Mandya Central Procurement Yard',
      remaining_capacity_kg: 19000,
      color_status: 'GREEN'
    };

  const [selectedCentreId, setSelectedCentreId] = useState(queryCentreId || defaultCentre.id);
  const [crop, setCrop] = useState('Paddy (Sona Masoori)');
  const [quantity, setQuantity] = useState(2500);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [quickBookingLoading, setQuickBookingLoading] = useState(false);
  const [quickBookingSuccess, setQuickBookingSuccess] = useState(null);
  const [quickBookingError, setQuickBookingError] = useState(null);

  // Live centre from socket (updates when officer changes capacity/status)
  const [liveCentres, setLiveCentres] = useState(centres);
  const centre = liveCentres.find(c => c.id === selectedCentreId) || defaultCentre;
  const [centreAlert, setCentreAlert] = useState(null);

  const activeFarmerId = user?.id || 'default-farmer';
  const activeFarmerName = profile?.full_name || user?.full_name || 'Farmer';
  const activeFarmerPhone = profile?.phone || user?.phone || '';

  // Update selected centre if query param changes
  useEffect(() => {
    if (queryCentreId && queryCentreId !== selectedCentreId) {
      setSelectedCentreId(queryCentreId);
    }
  }, [queryCentreId]);

  // Subscribe to realtime centre updates from officer dashboard
  useEffect(() => {
    const handleCentresUpdated = (updatedCentres) => {
      if (Array.isArray(updatedCentres)) setLiveCentres(updatedCentres);
    };
    const handleCapacityChanged = (payload) => {
      if (payload?.centre) {
        setLiveCentres(prev => prev.map(c => c.id === payload.centre.id ? { ...c, ...payload.centre } : c));
      }
    };
    const handleCentreNotif = (notif) => {
      if (!notif.centre_id || notif.centre_id === selectedCentreId) {
        setCentreAlert(notif);
      }
    };
    socket.on('centres_updated', handleCentresUpdated);
    socket.on('centre_capacity_changed', handleCapacityChanged);
    socket.on('centre_notification', handleCentreNotif);
    return () => {
      socket.off('centres_updated', handleCentresUpdated);
      socket.off('centre_capacity_changed', handleCapacityChanged);
      socket.off('centre_notification', handleCentreNotif);
    };
  }, [selectedCentreId]);

  useEffect(() => setCentreAlert(null), [selectedCentreId]);

  // Fetch slots directly from MongoDB backend API
  const loadSlots = async (isBackground = false) => {
    try {
      if (!isBackground) setLoadingSlots(true);
      const res = await fetchSlots(selectedCentreId, date);
      if (res.success && res.slots && res.slots.length > 0) {
        setSlots(res.slots);
        setSelectedSlot(prev => {
          if (!prev) return res.slots.find(s => s.is_available) || res.slots[0];
          return res.slots.find(s => s.id === prev.id) || prev;
        });
      }
    } catch (e) {
      console.error('Error fetching slots:', e);
    } finally {
      if (!isBackground) setLoadingSlots(false);
    }
  };

  useEffect(() => {
    loadSlots(false);

    const onLiveSlots = () => loadSlots(true);
    socket.on('slots_updated', onLiveSlots);
    socket.on('slot_position_updated', onLiveSlots);
    socket.on('appointment_booked', onLiveSlots);

    const pollTimer = setInterval(() => loadSlots(true), 3000);

    return () => {
      socket.off('slots_updated', onLiveSlots);
      socket.off('slot_position_updated', onLiveSlots);
      socket.off('appointment_booked', onLiveSlots);
      clearInterval(pollTimer);
    };
  }, [selectedCentreId, date]);

  // Quick 1-click slot booking
  const handleQuickBook = async () => {
    setQuickBookingLoading(true);
    setQuickBookingError(null);
    setQuickBookingSuccess(null);

    try {
      const res = await bookAppointmentAtomic({
        farmer_id: activeFarmerId,
        farmer_name: activeFarmerName,
        farmer_phone: activeFarmerPhone,
        centre_id: selectedCentreId,
        appointment_date: date,
        time_slot: selectedSlot?.start_time || '09:00 AM',
        quantity_kg: Number(quantity),
        crop
      });

      if (!res.success) {
        setQuickBookingError(res.error || 'Failed to book slot.');
      } else {
        setQuickBookingSuccess({
          token: res.token_number,
          centreName: centre.name,
          appointment: res.appointment
        });
        loadSlots();
      }
    } catch (err) {
      setQuickBookingError(err.message || 'Error booking appointment.');
    } finally {
      setQuickBookingLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>

      {/* ── BOOKING CONFIRMATION SUCCESS MODAL ── */}
      {quickBookingSuccess && (
        <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center', padding: '2rem', borderRadius: '16px', border: '2px solid #16a34a' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <CheckCircle2 size={36} />
            </div>
            <span style={{ background: '#f0fdf4', color: '#166534', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800 }}>
              SLOT BOOKING CONFIRMED
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0.75rem 0 0.25rem 0' }}>
              Token: {quickBookingSuccess.token}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1.5rem' }}>
              Your appointment is booked at <strong>{quickBookingSuccess.centreName}</strong>. You are now in the live queue!
            </p>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', textAlign: 'left', fontSize: '0.85rem', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Farmer:</span>
                <strong>{activeFarmerName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Crop & Quantity:</span>
                <strong>{crop} ({Number(quantity).toLocaleString()} kg)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{ color: '#16a34a', fontWeight: 800 }}>WAITING IN QUEUE</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/farmer/queue')}
                className="btn btn-primary"
                style={{ flex: 1, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800 }}
              >
                Go to Live Queue Counter <ArrowRight size={16} />
              </button>
              <button
                onClick={() => setQuickBookingSuccess(null)}
                className="btn btn-secondary"
                style={{ padding: '0.75rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIVE CENTRE STATUS ALERT ── */}
      {centreAlert && (
        <div style={{
          background: centreAlert.message?.toLowerCase().includes('closed') ? '#fef2f2' : '#f0fdf4',
          border: '1.5px solid',
          borderColor: centreAlert.message?.toLowerCase().includes('closed') ? '#fca5a5' : '#86efac',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <span style={{ fontSize: '1.5rem' }}>{centreAlert.icon || '🏢'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Centre Update: {centreAlert.title}</div>
            <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.15rem' }}>{centreAlert.message}</div>
          </div>
          <button onClick={() => setCentreAlert(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1.1rem' }}>✕</button>
        </div>
      )}

      {/* ── CENTRE STATUS BADGE ── */}
      {centre && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap',
          padding: '0.65rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selected Centre:</span>
          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{centre.name}</span>
          <span style={{
            padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800,
            background: centre.status === 'OPEN' ? '#dcfce7' : centre.status === 'HIGH_LOAD' ? '#fef3c7' : '#fee2e2',
            color: centre.status === 'OPEN' ? '#14532d' : centre.status === 'HIGH_LOAD' ? '#78350f' : '#7f1d1d'
          }}>
            {centre.status === 'OPEN' ? '🟢 OPEN' : centre.status === 'HIGH_LOAD' ? '🟡 HIGH LOAD' : centre.status === 'FULL' ? '🔴 FULL' : centre.status || 'OPEN'}
          </span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Capacity: <strong>{(centre.daily_capacity_kg || 0).toLocaleString()} kg</strong></span>
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 700 }}>Remaining: {(centre.remaining_capacity_kg || (centre.daily_capacity_kg - (centre.booked_capacity_kg || 0)) || 0).toLocaleString()} kg</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#16a34a', fontWeight: 800, marginLeft: 'auto' }}>
            <Zap size={10} /> LIVE
          </span>
        </div>
      )}

      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📍 WAREHOUSE STORAGE AREA GRID & INSTANT APPOINTMENT
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0 0', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Warehouse size={28} color="#4ade80" /> Storage Area Booking System
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.2rem 0 0 0' }}>
              Booking for: <strong>{activeFarmerName}</strong> (ID: {activeFarmerId})
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/farmer/centres')}
              className="btn btn-secondary btn-sm"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }}
            >
              🏢 Compare Other Centres
            </button>
          </div>
        </div>
      </div>

      {/* Main Booking Controls */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            1. Select Procurement Storage Yard & Crop Details
          </h3>
          <button
            type="button"
            onClick={() => setIsProductModalOpen(true)}
            style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Sprout size={16} /> ➕ Add / Manage Crops
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Facility Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              🏢 Select Storage Facility / Procurement Yard
            </label>
            <select
              value={selectedCentreId}
              onChange={(e) => setSelectedCentreId(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #16a34a', fontSize: '0.88rem', fontWeight: 700 }}
            >
              {centres.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.district || 'Mandya'}) - Prefix: {c.token_prefix || 'A'}
                </option>
              ))}
            </select>
          </div>

          {/* Crop Select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Produce Crop / Product
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
            >
              <option value="Paddy (Sona Masoori)">🌾 Paddy (Sona Masoori)</option>
              <option value="Ragi (Finger Millet)">🌱 Ragi (Finger Millet)</option>
              <option value="Maize (Corn)">🌽 Maize (Corn)</option>
              <option value="Wheat (Durum)">🌾 Wheat (Durum)</option>
              <option value="Sugarcane">🎋 Sugarcane</option>
              <option value="Organic Black Rice">🌾 Organic Black Rice</option>
              <option value="Turmeric / Spices">🌶️ Turmeric / Spices</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Declared Quantity (kg)
            </label>
            <input
              type="number"
              min="50"
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

        {/* Time Slot Selection */}
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
          2. Select Storage Time Slot
        </h3>

        {loadingSlots ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
            Loading available storage time slots...
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
                    {isFull ? `${max} / ${max} SQUARES OCCUPIED` : `${booked} / ${max} SQUARES OCCUPIED`}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: isFull ? '#991b1b' : '#166534', fontWeight: 600 }}>
                    {isFull ? 'FULL' : `${avail} OPEN SQUARES`}
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
                    {isFull ? '[ FULL ]' : isSelected ? '✓ SELECTED' : '[ VIEW SQUARES ]'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick 1-Click Booking Option */}
        {selectedSlot && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>
                ⚡ Fast Slot Booking for {selectedSlot.start_time}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                Skip square selection — automatically lock in next available spot and issue token immediately.
              </div>
              {quickBookingError && (
                <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.3rem', fontWeight: 700 }}>
                  ⚠️ {quickBookingError}
                </div>
              )}
            </div>

            <button
              onClick={handleQuickBook}
              disabled={quickBookingLoading}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {quickBookingLoading ? 'Booking Slot...' : 'Instant Slot Book'} <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* 3. Storage Bay Area Grid of Squares */}
      {selectedSlot && (
        <FarmerBookingPositionGrid
          slot={selectedSlot}
          centre={centre}
          farmerId={activeFarmerId}
          farmerName={activeFarmerName}
          crop={crop}
          quantityKg={quantity}
          onBookingSuccess={() => {
            loadSlots();
          }}
        />
      )}

      {/* 4. Realtime Load Package Monitor */}
      <RealtimePackageMonitorWidget />

      {/* Product Management Modal */}
      <ProductManagementModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onProductSelected={(p) => setCrop(p.name)}
      />
    </div>
  );
}
