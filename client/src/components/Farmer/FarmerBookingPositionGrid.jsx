import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { socket } from '../../services/socket';
import { fetchSlotPositions, bookPhoneWhatsappAPI } from '../../services/api';
import { CheckCircle2, AlertTriangle, RefreshCw, Sparkles, QrCode, Warehouse, Box, PhoneCall, MessageSquare, Send, Smartphone } from 'lucide-react';

export default function FarmerBookingPositionGrid({
  slot,
  centre,
  farmerId = 'F-1042',
  farmerName = 'Ramesh Gowda',
  crop = 'Paddy (Sona Masoori)',
  quantityKg = 2500,
  onBookingSuccess
}) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [realtimePulse, setRealtimePulse] = useState(false);

  // Phone / WhatsApp Booking State
  const [channel, setChannel] = useState('WHATSAPP'); // 'WHATSAPP' | 'TELEPHONE'
  const [phone, setPhone] = useState('+91 98450 12345');
  const [packagesCount, setPackagesCount] = useState(5);
  const [textCommand, setTextCommand] = useState('BOOK 5 PACKAGES MANDYA 10:00AM');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const slotId = slot?.id || 'slot-centre-1-1000';
  const totalPositions = slot?.maximum_bookings || 20;
  const packageWeight = 50; // 1 square = 1 storage package area (50kg)

  // Load positions for the slot
  const loadPositions = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Try Supabase database
      const { data: supaData, error: supaErr } = await supabase
        .from('slot_positions')
        .select('*')
        .eq('slot_id', slotId)
        .order('position_number', { ascending: true });

      if (!supaErr && supaData && supaData.length > 0) {
        setPositions(supaData);
        setLoading(false);
        return;
      }

      // 2. Fallback Express backend API
      const res = await fetchSlotPositions(slotId);
      if (res.success && res.positions) {
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

    // Supabase Realtime
    const channelName = `realtime_slot_positions_${slotId}`;
    const channelSub = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_positions', filter: `slot_id=eq.${slotId}` },
        (payload) => {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 1200);
          if (payload.eventType === 'UPDATE' && payload.new) {
            setPositions(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
          } else {
            loadPositions();
          }
        }
      )
      .subscribe();

    // Socket.io Realtime
    const handleSocketUpdate = (data) => {
      if (data.slot_id === slotId || !data.slot_id) {
        setRealtimePulse(true);
        setTimeout(() => setRealtimePulse(false), 1200);
        loadPositions();
      }
    };
    socket.on('slot_position_updated', handleSocketUpdate);

    return () => {
      supabase.removeChannel(channelSub);
      socket.off('slot_position_updated', handleSocketUpdate);
    };
  }, [slotId]);

  // Derived counts & Storage Area Square metrics
  const bookedCount = positions.filter(p => p.status === 'BOOKED').length;
  const availableCount = positions.filter(p => p.status === 'AVAILABLE').length;
  const isFull = availableCount === 0 || bookedCount >= totalPositions;
  const bookedPercent = Math.round((bookedCount / (totalPositions || 1)) * 100);

  // Group 20 positions into 4 Storage Zones (Zone A, B, C, D - 5 squares each)
  const zones = [
    { name: 'STORAGE ZONE A (NORTH BAY)', squares: positions.slice(0, 5) },
    { name: 'STORAGE ZONE B (EAST BAY)', squares: positions.slice(5, 10) },
    { name: 'STORAGE ZONE C (SOUTH BAY)', squares: positions.slice(10, 15) },
    { name: 'STORAGE ZONE D (WEST BAY)', squares: positions.slice(15, 20) }
  ];

  const handlePhoneWhatsappBooking = async (e) => {
    if (e) e.preventDefault();
    setBookingLoading(true);
    setErrorMsg(null);
    setBookingSuccessMsg(null);

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
            Each square represents 1 Storage Area Unit (50kg load capacity). <strong>Appointments are booked ONLY via WhatsApp or Telephone.</strong>
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
            <span>🟩 AVAILABLE STORAGE SQUARE ({availableCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#fee2e2', border: '2px solid #ef4444', display: 'inline-block' }} />
            <span>🟥 OCCUPIED VIA PHONE / WHATSAPP ({bookedCount})</span>
          </div>
        </div>
      </div>

      {/* STORAGE FLOOR LAYOUT: GRID OF SQUARES */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
          Loading Storage Floor Layout...
        </div>
      ) : (
        <div style={{ marginBottom: '1.5rem' }}>
          {zones.map((zone, zIdx) => (
            <div key={zIdx} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', marginBottom: '0.4rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.2rem' }}>
                {zone.name}
              </div>

              {/* GRID OF SQUARES */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.85rem' }}>
                {zone.squares.map((sq) => {
                  if (!sq) return null;
                  const isOccupied = sq.status === 'BOOKED';
                  const sqNumStr = sq.position_number < 10 ? `0${sq.position_number}` : `${sq.position_number}`;

                  return (
                    <div
                      key={sq.id}
                      style={{
                        aspectRatio: '1 / 1', // Perfect Square
                        borderRadius: '12px',
                        border: isOccupied ? '3px solid #ef4444' : '3px solid #22c55e',
                        background: isOccupied
                          ? 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)'
                          : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        color: isOccupied ? '#991b1b' : '#14532d',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.5rem',
                        gap: '0.2rem',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.05em', color: isOccupied ? '#991b1b' : '#166534' }}>
                        BAY #{sqNumStr}
                      </span>
                      <span style={{ fontSize: '1.6rem' }}>
                        {isOccupied ? '📦' : '🟩'}
                      </span>
                      <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        {isOccupied ? 'OCCUPIED' : 'OPEN AREA'}
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

      {/* WHATSAPP & TELEPHONE BOOKING SIMULATOR FORM */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', border: '2px solid #2563eb', borderRadius: '16px', padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Smartphone size={20} color="#2563eb" /> 📞 BOOK STORAGE AREA VIA WHATSAPP & TELEPHONE
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
              Web self-booking is disabled. Enter details below to trigger an automated Phone or WhatsApp booking!
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
              {channel === 'WHATSAPP' ? '💬 WhatsApp Command Message' : '🎙️ Telephone Speech Command'}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={textCommand}
                onChange={(e) => setTextCommand(e.target.value)}
                placeholder="BOOK 5 PACKAGES MANDYA 10AM"
                style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace' }}
                required
              />
              <button
                type="submit"
                disabled={bookingLoading}
                style={{
                  background: channel === 'WHATSAPP' ? '#16a34a' : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: bookingLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {bookingLoading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                {channel === 'WHATSAPP' ? 'Send WhatsApp' : 'Dial IVR'}
              </button>
            </div>
          </div>
        </form>

        {errorMsg && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.82rem', marginTop: '0.85rem' }}>
            <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} /> {errorMsg}
          </div>
        )}

        {bookingSuccessMsg && (
          <div style={{ marginTop: '0.85rem', background: '#f0fdf4', border: '1px solid #86efac', color: '#14532d', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={20} color="#16a34a" /> {bookingSuccessMsg}
          </div>
        )}
      </div>
    </div>
  );
}
