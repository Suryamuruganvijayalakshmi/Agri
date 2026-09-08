import React, { useState, useEffect } from 'react';
import { socket } from '../../services/socket';
import { fetchSlotPositions, bookPhoneWhatsappAPI, bookAppointmentPosition } from '../../services/api';
import { CheckCircle2, AlertTriangle, RefreshCw, Sparkles, QrCode, Warehouse, Box, PhoneCall, MessageSquare, Send, Smartphone, MousePointerClick } from 'lucide-react';

export default function FarmerBookingPositionGrid({
  slot,
  centre,
  farmerId = 'F-1042',
  farmerName = 'Ramesh Gowda',
  crop = 'Paddy (Sona Masoori)',
  quantityKg = 2500,
  appointmentDate,
  onBookingSuccess
}) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimePulse, setRealtimePulse] = useState(false);

  // Multi-Bay Web Selection State
  const [selectedPositions, setSelectedPositions] = useState([]);

  // Calculate needed 500kg storage bays
  const packageWeight = 500; // kg per storage bay position
  const neededBays = Math.max(1, Math.ceil(Number(quantityKg || 0) / packageWeight));

  // Phone / WhatsApp Booking State
  const [channel, setChannel] = useState('WHATSAPP'); // 'WHATSAPP' | 'TELEPHONE'
  const [phone, setPhone] = useState('+91 98450 12345');
  const [packagesCount, setPackagesCount] = useState(neededBays);
  const [textCommand, setTextCommand] = useState(`BOOK ${neededBays} PACKAGES MANDYA 10:00AM`);
  
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const slotId = slot?.id || 'slot-centre-1-1000';

  // Keep packagesCount synchronized when neededBays changes
  useEffect(() => {
    setPackagesCount(neededBays);
    setTextCommand(`BOOK ${neededBays} PACKAGES MANDYA ${slot?.start_time ? slot.start_time.split(' ')[0] : '10:00AM'}`);
  }, [neededBays, slot?.start_time]);

  // ── CAPACITY-LINKED GRID SIZE ────────────────────────────────────────────────
  const centreDailyKg = centre?.daily_capacity_kg || slot?.maximum_bookings * 500 || 20 * 500;
  const totalPositions = Math.max(1, Math.round(centreDailyKg / packageWeight));
  const remainingKg = centre?.remaining_capacity_kg ?? centreDailyKg;

  // Load positions for the slot
  const loadPositions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetchSlotPositions(slotId);
      if (res.success && res.positions && res.positions.length > 0) {
        setPositions(res.positions);
      } else {
        const freshPositions = Array.from({ length: totalPositions }, (_, i) => {
          const num = i + 1;
          return {
            id: `pos-${slotId}-${num}`,
            slot_id: slotId,
            position_number: num,
            status: 'AVAILABLE'
          };
        });
        setPositions(freshPositions);
      }
    } catch (err) {
      console.error('Failed to load storage positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();

    // ── REALTIME: when officer updates capacity or bookings occur ──
    const handleCentresUpdated = (updatedCentres) => {
      if (!centre) return;
      const fresh = Array.isArray(updatedCentres)
        ? updatedCentres.find(c => c.id === centre.id)
        : null;
      if (fresh) loadPositions();
    };

    const handleSlotUpdated = (payload) => {
      if (payload?.slot_id === slotId || payload?.position?.slot_id === slotId) {
        loadPositions();
      }
    };

    socket.on('centres_updated', handleCentresUpdated);
    socket.on('centre_capacity_changed', handleCentresUpdated);
    socket.on('slot_position_updated', handleSlotUpdated);
    socket.on('appointment_booked', loadPositions);

    // 4-second polling fallback for serverless
    const pollTimer = setInterval(loadPositions, 4000);

    return () => {
      socket.off('centres_updated', handleCentresUpdated);
      socket.off('centre_capacity_changed', handleCentresUpdated);
      socket.off('slot_position_updated', handleSlotUpdated);
      socket.off('appointment_booked', loadPositions);
      clearInterval(pollTimer);
    };
  }, [slotId, centre?.id, centre?.daily_capacity_kg]);

  // Derived counts & Storage Area Square metrics
  const bookedCount = positions.filter(p => p.status === 'BOOKED').length;
  const availableCount = positions.filter(p => p.status === 'AVAILABLE').length;
  const isFull = availableCount === 0 || bookedCount >= totalPositions;
  const bookedPercent = Math.round((bookedCount / (totalPositions || 1)) * 100);

  // Auto-Select next available bays needed for declared weight
  const handleAutoSelectBays = () => {
    const available = positions.filter(p => p.status === 'AVAILABLE');
    const toSelect = available.slice(0, neededBays);
    setSelectedPositions(toSelect);
  };

  // Group 20 positions into 4 Storage Zones (Zone A, B, C, D - 5 squares each)
  const zones = [
    { name: 'STORAGE ZONE A (NORTH BAY)', squares: positions.slice(0, 5) },
    { name: 'STORAGE ZONE B (EAST BAY)', squares: positions.slice(5, 10) },
    { name: 'STORAGE ZONE C (SOUTH BAY)', squares: positions.slice(10, 15) },
    { name: 'STORAGE ZONE D (WEST BAY)', squares: positions.slice(15, 20) }
  ];

  // Direct Web Booking Action (Multi-Bay)
  const handleWebDirectBooking = async () => {
    if (selectedPositions.length === 0) return;
    setBookingLoading(true);
    setErrorMsg(null);
    setBookingSuccessMsg(null);
    setConfirmedBooking(null);

    try {
      const res = await bookAppointmentPosition({
        farmer_id: farmerId,
        farmer_name: farmerName,
        centre_id: centre?.id || 'centre-1',
        slot_id: slotId,
        position_numbers: selectedPositions.map(p => p.position_number),
        position_number: selectedPositions[0]?.position_number,
        crop_type: crop,
        declared_quantity_kg: Number(quantityKg),
        appointment_date: appointmentDate
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Selected positions were just booked by another farmer. Please choose other squares.');
      } else {
        setBookingSuccessMsg(`Direct Web Booking Confirmed for ${res.bays_label || 'Selected Bays'}!`);
        setConfirmedBooking(res.appointment);
        setShowQrModal(true);
        setSelectedPositions([]);
        loadPositions();
        if (onBookingSuccess) onBookingSuccess(res.appointment);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error processing web booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  // WhatsApp & Phone Hotline Booking Action
  const handlePhoneWhatsappBooking = async (e) => {
    if (e) e.preventDefault();
    setBookingLoading(true);
    setErrorMsg(null);
    setBookingSuccessMsg(null);
    setConfirmedBooking(null);

    try {
      const res = await bookPhoneWhatsappAPI({
        phone,
        farmer_name: farmerName,
        textCommand,
        channel,
        centre_id: centre?.id || 'centre-1',
        packages_count: Number(packagesCount),
        crop
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to process WhatsApp / Telephone booking.');
      } else {
        setBookingSuccessMsg(res.message);
        setConfirmedBooking(res.appointment);
        setShowQrModal(true);
        loadPositions();
        if (onBookingSuccess) onBookingSuccess(res.appointment);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error processing phone booking.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.08)' }}>

      {/* ============================================================
          QR CODE BOOKING CONFIRMATION MODAL
          Automatically pops up after successful booking
      ============================================================ */}
      {showQrModal && confirmedBooking && (() => {
        const qrData = `AGRIFLOW-BOOKING:${confirmedBooking.booking_id}:${confirmedBooking.qr_token || confirmedBooking.token_number}:${confirmedBooking.centre_id || 'centre-1'}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrData)}&color=166534&bgcolor=f0fdf4`;
        const bayNum = confirmedBooking.position_number < 10 ? `0${confirmedBooking.position_number}` : `${confirmedBooking.position_number}`;

        return (
          <div
            onClick={() => setShowQrModal(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.72)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '1rem'
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#ffffff', borderRadius: '20px',
                padding: '2rem', maxWidth: '480px', width: '100%',
                boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                border: '3px solid #16a34a',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
                position: 'relative'
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  position: 'absolute', top: '1rem', right: '1rem',
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px', fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b', fontWeight: 900
                }}
              >
                ✕
              </button>

              {/* Success header */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>✅</div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#14532d', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
                  Booking Confirmed!
                </h2>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  Present this QR code at the Yard Gate Counter
                </p>
              </div>

              {/* QR Code */}
              <div style={{
                background: '#f0fdf4', border: '3px dashed #86efac',
                borderRadius: '16px', padding: '1.25rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem'
              }}>
                <img
                  src={qrUrl}
                  alt="Booking QR Code"
                  style={{ width: '220px', height: '220px', borderRadius: '10px', display: 'block' }}
                />
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#16a34a', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                  Token #{confirmedBooking.token_number}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {confirmedBooking.qr_token || confirmedBooking.booking_id}
                </div>
              </div>

              {/* Booking details table */}
              <div style={{ width: '100%', background: '#f8fafc', borderRadius: '12px', padding: '1rem', fontSize: '0.82rem' }}>
                {[
                  ['Booking ID', confirmedBooking.booking_id],
                  ['Storage Bays', confirmedBooking.bays_label || `BAY #${bayNum}`],
                  ['Procurement Centre', confirmedBooking.centre_name || centre?.name || 'Procurement Yard'],
                  ['Crop & Quantity', `${confirmedBooking.crop_type} (${confirmedBooking.declared_quantity_kg} kg)`],
                  ['Appointment Date', confirmedBooking.appointment_date || 'Today'],
                  ['Time Slot', confirmedBooking.time_slot || '—']
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #e2e8f0', gap: '1rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontWeight: 800, color: '#0f172a', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Email notice */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#1e40af', width: '100%', textAlign: 'center' }}>
                📧 Booking confirmation &amp; QR code has been emailed to your registered contact.
              </div>

              {/* Close */}
              <button
                onClick={() => setShowQrModal(false)}
                style={{
                  width: '100%', padding: '0.75rem', borderRadius: '10px', border: 'none',
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(22,163,74,0.3)'
                }}
              >
                ✓ Close &amp; Continue
              </button>
            </div>
          </div>
        );
      })()}
      
      {/* Header & Realtime Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Warehouse size={24} color="#16a34a" /> 📦 WAREHOUSE STORAGE BAY AREA GRID
            </h2>
            {realtimePulse && (
              <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Sparkles size={12} className="animate-spin" /> Live Sync
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
            Each square = 1 Storage Unit (50kg capacity). <strong>Book directly by selecting an open square below OR use WhatsApp/Phone hotline!</strong>
          </p>
        </div>

        <button onClick={loadPositions} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Storage Bays
        </button>
      </div>

      {/* Storage Area Capacity Bar */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
          <span style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Box size={16} color="#16a34a" /> STORAGE BAY OCCUPATION (1 SQUARE = 1 STORAGE AREA UNIT / 50KG)
          </span>
          <span style={{ color: isFull ? '#dc2626' : '#16a34a' }}>
            {bookedCount} / {totalPositions} SQUARES OCCUPIED ({availableCount} OPEN STORAGE SQUARES)
          </span>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ width: `${bookedPercent}%`, background: isFull ? '#ef4444' : '#f59e0b', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${100 - bookedPercent}%`, background: '#22c55e', transition: 'width 0.4s ease' }} />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.78rem', fontWeight: 700, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#f0fdf4', border: '2px solid #22c55e', display: 'inline-block' }} />
            <span>🟩 AVAILABLE SQUARE ({availableCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#dcfce7', border: '2px solid #16a34a', display: 'inline-block' }} />
            <span>✨ SELECTED SQUARE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#fee2e2', border: '2px solid #ef4444', display: 'inline-block' }} />
            <span>🟥 OCCUPIED ({bookedCount})</span>
          </div>
        </div>
      </div>

      {/* STORAGE FLOOR LAYOUT: GRID OF SQUARES WITH CLICK-TO-SELECT */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
          Loading Storage Floor Layout...
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          {/* Multi-Bay Produce Weight Info & Auto-Select Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                Declared Weight: {Number(quantityKg).toLocaleString()} kg • Requires {neededBays} Storage Bay{neededBays > 1 ? 's' : ''} (500 kg each)
              </span>
              <div style={{ fontSize: '0.78rem', color: selectedPositions.length >= neededBays ? '#16a34a' : '#2563eb', fontWeight: 700 }}>
                {selectedPositions.length === 0
                  ? `Click ${neededBays} open green square(s) below or click Auto-Select.`
                  : `Selected ${selectedPositions.length} of ${neededBays} required bays: ${selectedPositions.map(p => '#' + (p.position_number < 10 ? '0' + p.position_number : p.position_number)).join(', ')}`}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoSelectBays}
              style={{
                background: '#22c55e', color: 'white', border: 'none', padding: '0.45rem 0.9rem',
                borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.35rem'
              }}
            >
              <Sparkles size={15} /> ⚡ Auto-Select Next {neededBays} Open Bays
            </button>
          </div>

          {zones.map((zone, zIdx) => (
            <div key={zIdx} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.4rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.2rem' }}>
                {zone.name}
              </div>

              {/* GRID OF SQUARES (MULTI-SELECT SUPPORT) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.85rem' }}>
                {zone.squares.map((sq) => {
                  if (!sq) return null;
                  const isOccupied = sq.status === 'BOOKED';
                  const isSelected = selectedPositions.some(p => p.id === sq.id);
                  const sqNumStr = sq.position_number < 10 ? `0${sq.position_number}` : `${sq.position_number}`;

                  return (
                    <div
                      key={sq.id}
                      onClick={() => {
                        if (!isOccupied) {
                          setSelectedPositions(prev => {
                            const exists = prev.some(p => p.id === sq.id);
                            if (exists) return prev.filter(p => p.id !== sq.id);
                            return [...prev, sq];
                          });
                        }
                      }}
                      style={{
                        aspectRatio: '1 / 1', // Perfect Square
                        borderRadius: '12px',
                        border: isSelected
                          ? '3px solid #16a34a'
                          : isOccupied
                          ? '3px solid #ef4444'
                          : '3px solid #22c55e',
                        background: isSelected
                          ? 'linear-gradient(135deg, #dcfce7 0%, #86efac 100%)'
                          : isOccupied
                          ? 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)'
                          : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        color: isOccupied ? '#991b1b' : '#14532d',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        gap: '0.2rem',
                        cursor: isOccupied ? 'not-allowed' : 'pointer',
                        boxShadow: isSelected ? '0 0 16px rgba(22, 163, 74, 0.4)' : '0 4px 10px rgba(0,0,0,0.06)',
                        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all 0.25s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', color: isOccupied ? '#991b1b' : '#166534' }}>
                        BAY #{sqNumStr}
                      </span>
                      <span style={{ fontSize: '1.6rem' }}>
                        {isSelected ? '✨' : isOccupied ? '📦' : '🟩'}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        {isSelected ? 'SELECTED' : isOccupied ? 'OCCUPIED' : 'CLICK TO ADD'}
                      </span>
                      <span style={{ fontSize: '0.58rem', opacity: 0.8 }}>
                        {packageWeight} kg Area
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* WEB DIRECT MULTI-BAY BOOKING BUTTON */}
      {selectedPositions.length > 0 && (
        <div style={{ background: '#f0fdf4', border: '2px solid #16a34a', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
              ✓ Multi-Bay Web Booking Ready ({selectedPositions.length} Selected)
            </span>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0.1rem 0 0 0' }}>
              Selected Storage Bays: {selectedPositions.map(p => `BAY #${p.position_number < 10 ? '0' + p.position_number : p.position_number}`).join(', ')}
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.1rem 0 0 0' }}>
              Farmer: <strong>{farmerName}</strong> • Produce: <strong>{crop}</strong> ({quantityKg} kg)
            </p>
          </div>

          <button
            type="button"
            onClick={handleWebDirectBooking}
            disabled={bookingLoading}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
            }}
          >
            {bookingLoading ? <RefreshCw size={18} className="animate-spin" /> : <MousePointerClick size={18} />}
            CONFIRM WEB BOOKING ({selectedPositions.length} BAYS)
          </button>
        </div>
      )}

      {/* SUCCESS / ERROR ALERTS & CONFIRMED BOOKING TOKEN CARD */}
      {bookingSuccessMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <CheckCircle2 size={20} color="#16a34a" /> {bookingSuccessMsg}
          </div>

          {confirmedBooking && (
            <div style={{ background: 'white', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: '10px', marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>BOOKING ID</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontFamily: 'monospace' }}>{confirmedBooking.booking_id}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>QUEUE TOKEN</span>
                <strong style={{ fontSize: '1.1rem', color: '#16a34a' }}>Token {confirmedBooking.token_number}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>STORAGE SQUARE(S)</span>
                <strong style={{ fontSize: '0.95rem', color: '#2563eb' }}>
                  {confirmedBooking.bays_label || `BAY #${confirmedBooking.position_number < 10 ? '0' + confirmedBooking.position_number : confirmedBooking.position_number}`}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>QR TOKEN</span>
                <span style={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <QrCode size={14} color="#16a34a" /> {confirmedBooking.qr_token || 'QR-VERIFIED'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '1rem', borderRadius: '12px', marginBottom: '1.25rem', fontWeight: 700, fontSize: '0.85rem' }}>
          <AlertTriangle size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} /> {errorMsg}
        </div>
      )}

      {/* WHATSAPP & TELEPHONE BOOKING SIMULATOR FORM */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '2px solid #2563eb', borderRadius: '16px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Smartphone size={20} color="#2563eb" /> 📞 OR BOOK VIA WHATSAPP & TELEPHONE HOTLINE
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
              Prefer booking over the phone? Enter details below to simulate an automated WhatsApp or IVR hotline booking!
            </p>
          </div>

          <div style={{ display: 'flex', background: '#ffffff', padding: '0.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', gap: '0.2rem' }}>
            <button
              type="button"
              onClick={() => setChannel('WHATSAPP')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: channel === 'WHATSAPP' ? '#22c55e' : 'transparent',
                color: channel === 'WHATSAPP' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <MessageSquare size={14} /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel('TELEPHONE')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                background: channel === 'TELEPHONE' ? '#2563eb' : 'transparent',
                color: channel === 'TELEPHONE' ? '#ffffff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <PhoneCall size={14} /> Telephone IVR
            </button>
          </div>
        </div>

        <form onSubmit={handlePhoneWhatsappBooking} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                Farmer Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98450 12345"
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                Storage Squares Needed (1 Sq = 50kg)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={packagesCount}
                onChange={(e) => setPackagesCount(e.target.value)}
                style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              {channel === 'WHATSAPP' ? '💬 WhatsApp Text Command' : '🎙️ Toll-Free IVR Voice Command'}
            </label>
            <input
              type="text"
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              placeholder="e.g. BOOK 5 PACKAGES MANDYA 10:00AM"
              style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={bookingLoading || isFull}
            style={{
              padding: '0.75rem',
              borderRadius: '10px',
              border: 'none',
              background: isFull ? '#cbd5e1' : channel === 'WHATSAPP' ? '#22c55e' : '#2563eb',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: isFull ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {bookingLoading ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : channel === 'WHATSAPP' ? (
              <Send size={18} />
            ) : (
              <PhoneCall size={18} />
            )}
            {isFull
              ? 'ALL STORAGE BAY SQUARES FULL'
              : channel === 'WHATSAPP'
              ? 'SEND WHATSAPP BOOKING TEXT'
              : 'DIAL TOLL-FREE IVR HOTLINE BOOKING'}
          </button>
        </form>
      </div>

    </div>
  );
}
