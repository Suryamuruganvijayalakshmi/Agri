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

  const getTodayLocalDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedCentreId, setSelectedCentreId] = useState(queryCentreId || defaultCentre.id);
  const [crop, setCrop] = useState('Paddy (Sona Masoori)');
  const [quantity, setQuantity] = useState(2500);
  const [date, setDate] = useState(getTodayLocalDateStr());

  // Real-time live clock ticking every second
  const [liveClock, setLiveClock] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [quickBookingLoading, setQuickBookingLoading] = useState(false);
  const [quickBookingSuccess, setQuickBookingSuccess] = useState(null);
  const [quickBookingError, setQuickBookingError] = useState(null);

  const isFutureBookingDate = date > getTodayLocalDateStr();
  const getSlotCapacity = (slot) => {
    const available = slot.available_positions_count;
    if (Number.isFinite(available)) return available;
    return Math.max(0, (slot.maximum_bookings || 20) - (slot.current_bookings || 0));
  };
  const selectableSlots = slots.filter((slot) => getSlotCapacity(slot) > 0 && (isFutureBookingDate || !slot.is_past));

  // Storage bays needed: 500 kg per bay
  const neededBays = Math.max(1, Math.ceil(Number(quantity || 0) / 500));

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

  // Fetch slots directly from MongoDB backend API with real-time intelligence
  const loadSlots = async (isBackground = false) => {
    try {
      if (!isBackground) setLoadingSlots(true);
      const res = await fetchSlots(selectedCentreId, date);
      if (res.success && res.slots && res.slots.length > 0) {
        setSlots(res.slots);
        setSelectedSlot(prev => {
          // If previous selection still exists and is not past, preserve it
          if (prev) {
            const match = res.slots.find(s => s.id === prev.id);
            if (match && match.is_available && !match.is_past) return match;
          }
          // If server provided recommended slot (current or next upcoming)
          if (res.recommended_slot_id) {
            const rec = res.slots.find(s => s.id === res.recommended_slot_id);
            if (rec && rec.is_available && !rec.is_past) return rec;
          }
          // Prioritize current active slot, then upcoming available slot
          const availableForDate = res.slots.filter(s => {
            const available = Number.isFinite(s.available_positions_count)
              ? s.available_positions_count > 0
              : (s.maximum_bookings || 20) > (s.current_bookings || 0);
            return available && (date > getTodayLocalDateStr() || !s.is_past);
          });
          return availableForDate.find(s => s.is_current)
            || availableForDate.find(s => s.is_upcoming)
            || availableForDate[0]
            || null;
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

  // Quick 1-click multi-bay slot booking
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b' }}>Allocated Bays:</span>
                <strong style={{ color: '#16a34a' }}>{quickBookingSuccess.appointment?.bays_label || `Bay #${quickBookingSuccess.appointment?.position_number || '01'}`}</strong>
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

      {/* Header Banner with Real-Time Live Clock */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📍 WAREHOUSE STORAGE AREA GRID &amp; MULTI-SLOT APPOINTMENT
              </span>
              <span style={{
                background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #4ade80',
                color: '#86efac', padding: '0.2rem 0.6rem', borderRadius: '9999px',
                fontSize: '0.72rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
                <Clock size={12} />
                LIVE: {liveClock.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {liveClock.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
              </span>
            </div>
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
            1. Select Procurement Storage Yard &amp; Crop Details
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

          {/* Quantity with Multi-Bay indicator */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Declared Quantity (kg)
            </label>
            <input
              type="number"
              min="50"
              step="50"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
              required
            />
            <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.3rem 0.55rem', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Weight size={13} color="#16a34a" />
              <span>
                {Number(quantity || 0).toLocaleString()} kg = <strong>{neededBays} Bay{neededBays > 1 ? 's' : ''}</strong> (500 kg each).
                {neededBays > 1 ? ' Multi-bay booking active!' : ' Standard 1-bay booking.'}
              </span>
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem' }}>
              Booking Date (From Today)
            </label>
            <input
              type="date"
              min={getTodayLocalDateStr()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem', fontWeight: 600 }}
              required
            />
          </div>
        </div>

        {/* Time Slot Selection */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            2. Select Real-Time Storage Time Slot
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
            Operating Hours: 08:00 AM – 08:00 PM • Synchronized with Live Clock
          </span>
        </div>

        {loadingSlots ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
            Loading available storage time slots...
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {selectableSlots.map(s => {
              const max = s.maximum_bookings || 20;
              const booked = s.current_bookings || 0;
              const avail = getSlotCapacity(s);
              const isPast = !isFutureBookingDate && Boolean(s.is_past);
              const isCurrent = Boolean(s.is_current);
              const isFull = avail <= 0;
              const isSelected = selectedSlot?.id === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (!isPast && !isFull) setSelectedSlot(s);
                  }}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '12px',
                    border: isSelected
                      ? '2px solid #16a34a'
                      : isCurrent
                      ? '2px solid #22c55e'
                      : isPast || isFull
                      ? '1px solid #e2e8f0'
                      : '1px solid #cbd5e1',
                    background: isSelected
                      ? '#dcfce7'
                      : isCurrent
                      ? '#f0fdf4'
                      : isPast || isFull
                      ? '#f8fafc'
                      : 'white',
                    opacity: isPast ? 0.55 : isFull ? 0.7 : 1,
                    cursor: isPast || isFull ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected
                      ? '0 4px 14px rgba(22, 163, 74, 0.2)'
                      : isCurrent
                      ? '0 0 12px rgba(34, 197, 94, 0.25)'
                      : 'none',
                    position: 'relative'
                  }}
                >
                  {/* Real-time Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: isPast ? '#94a3b8' : '#0f172a' }}>
                      {s.start_time}
                    </span>
                    {isCurrent ? (
                      <span style={{ background: '#22c55e', color: 'white', fontSize: '0.62rem', fontWeight: 900, padding: '0.15rem 0.45rem', borderRadius: '9999px', letterSpacing: '0.04em' }}>
                        ⚡ CURRENT (NOW)
                      </span>
                    ) : isPast ? (
                      <span style={{ background: '#e2e8f0', color: '#64748b', fontSize: '0.62rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '9999px' }}>
                        PAST TIME
                      </span>
                    ) : (
                      <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '0.62rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '9999px' }}>
                        🟢 UPCOMING
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, margin: '0.25rem 0', color: isPast ? '#94a3b8' : isFull ? '#dc2626' : '#15803d' }}>
                    {isFull ? `${max} / ${max} SQUARES OCCUPIED` : `${booked} / ${max} SQUARES OCCUPIED`}
                  </div>

                  <div style={{ fontSize: '0.73rem', color: isPast ? '#94a3b8' : isFull ? '#991b1b' : '#166534', fontWeight: 600 }}>
                    {isPast ? 'SLOT EXPIRED TODAY' : isFull ? 'FULL' : `${avail} OPEN SQUARES (${avail * 500} kg cap)`}
                  </div>

                  <button
                    type="button"
                    disabled={isPast || isFull}
                    style={{
                      marginTop: '0.6rem',
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: isPast ? '#e2e8f0' : isFull ? '#cbd5e1' : isSelected ? '#16a34a' : '#f1f5f9',
                      color: isPast ? '#94a3b8' : isFull ? '#475569' : isSelected ? 'white' : '#0f172a',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: isPast || isFull ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isPast ? '[ PAST TIME ]' : isFull ? '[ FULL ]' : isSelected ? '✓ SELECTED' : '[ SELECT SLOT ]'}
                  </button>
                </div>
              );
            })}
            {selectableSlots.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: '1rem', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 700, fontSize: '0.85rem' }}>
                No open 1,000 kg slots are available for this date.
              </div>
            )}
          </div>
        )}

        {/* Quick 1-Click Multi-Bay Booking Option */}
        {selectedSlot && (
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '0.95rem' }}>
                ⚡ Fast Booking for {selectedSlot.start_time} ({neededBays} Storage Bay{neededBays > 1 ? 's' : ''})
              </div>
              <div style={{ fontSize: '0.8rem', color: '#15803d' }}>
                Skip manual square selection — locks next {neededBays} open bays simultaneously for {Number(quantity).toLocaleString()} kg produce and issues token.
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
              {quickBookingLoading ? 'Booking Bays...' : `Instant Multi-Bay Book (${neededBays} Bay${neededBays > 1 ? 's' : ''})`} <ArrowRight size={16} />
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
          appointmentDate={date}
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
