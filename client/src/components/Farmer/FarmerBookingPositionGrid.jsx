import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { socket } from '../../services/socket';
import { fetchSlotPositions, bookAppointmentPositionAPI } from '../../services/api';
import { CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw, Sparkles, QrCode, Box, Layers, Ticket } from 'lucide-react';

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
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successAppt, setSuccessAppt] = useState(null);
  const [realtimePulse, setRealtimePulse] = useState(false);

  const slotId = slot?.id || 'slot-centre-1-1000';
  const totalPositions = slot?.maximum_bookings || 20;
  const packageWeight = 50; // 1 seat = 1 package (50kg)

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

      // 2. Fallback to Express backend database
      const res = await fetchSlotPositions(slotId);
      if (res.success && res.positions) {
        setPositions(res.positions);
      } else {
        // Fresh initial positions
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
      console.error('Failed to load slot positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();
    setSelectedPosition(null);

    // Supabase Realtime
    const channelName = `realtime_slot_positions_${slotId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slot_positions', filter: `slot_id=eq.${slotId}` },
        (payload) => {
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 1200);

          if (payload.eventType === 'UPDATE' && payload.new) {
            setPositions(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
            if (selectedPosition && selectedPosition.id === payload.new.id && payload.new.status === 'BOOKED') {
              setSelectedPosition(null);
              setErrorMsg('The seat position you selected was just booked by another farmer in real time. Please pick another seat.');
            }
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
      supabase.removeChannel(channel);
      socket.off('slot_position_updated', handleSocketUpdate);
    };
  }, [slotId]);

  // Derived counts & Theatre metrics
  const bookedCount = positions.filter(p => p.status === 'BOOKED').length;
  const availableCount = positions.filter(p => p.status === 'AVAILABLE').length;
  const isFull = availableCount === 0 || bookedCount >= totalPositions;
  const bookedPercent = Math.round((bookedCount / (totalPositions || 1)) * 100);

  // 1 Seat = 1 Package (Total Capacity)
  const totalSlotCapacityKg = totalPositions * packageWeight; // e.g. 1000 kg per slot
  const filledCapacityKg = bookedCount * packageWeight;

  // Group 20 positions into Theatre Rows (Row A, Row B, Row C, Row D - 5 seats each)
  const rows = [
    { label: 'ROW A (FRONT GATE)', positions: positions.slice(0, 5) },
    { label: 'ROW B (WEIGHBRIDGE BAY 1)', positions: positions.slice(5, 10) },
    { label: 'ROW C (WEIGHBRIDGE BAY 2)', positions: positions.slice(10, 15) },
    { label: 'ROW D (STORAGE DOCK)', positions: positions.slice(15, 20) }
  ];

  const handleSelectPosition = (pos) => {
    if (pos.status !== 'AVAILABLE') return;
    setErrorMsg(null);
    setSelectedPosition(pos);
  };

  const handleConfirmBooking = async () => {
    if (!selectedPosition) return;
    setBookingLoading(true);
    setErrorMsg(null);

    try {
      // Supabase RPC
      const { data: supaRpcData, error: supaRpcErr } = await supabase.rpc('book_appointment_position', {
        p_farmer_id: farmerId.startsWith('F-') ? 'f1f2f3f4-e5f6-7890-abcd-999999999999' : farmerId,
        p_slot_id: slotId.startsWith('slot-') ? 's1s2s3s4-e5f6-7890-abcd-000000001000' : slotId,
        p_crop_id: crop,
        p_declared_quantity_kg: Number(quantityKg),
        p_position_id: selectedPosition.id
      });

      if (!supaRpcErr && supaRpcData?.success) {
        setSuccessAppt(supaRpcData.appointment);
        if (onBookingSuccess) onBookingSuccess(supaRpcData.appointment);
        loadPositions();
        setBookingLoading(false);
        return;
      }

      if (supaRpcData?.error) {
        setErrorMsg(supaRpcData.error);
        loadPositions();
        setBookingLoading(false);
        return;
      }

      // Express API Fallback
      const res = await bookAppointmentPositionAPI({
        farmer_id: farmerId,
        farmer_name: farmerName,
        slot_id: slotId,
        position_id: selectedPosition.id,
        position_number: selectedPosition.position_number,
        crop,
        quantity_kg: Number(quantityKg)
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Seat position already booked. Please select another seat.');
        setSelectedPosition(null);
        loadPositions();
      } else {
        setSuccessAppt(res.appointment);
        if (onBookingSuccess) onBookingSuccess(res.appointment);
        loadPositions();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (successAppt) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem', border: '2px solid #16a34a', borderRadius: '16px', background: '#ffffff' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <CheckCircle2 size={42} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.2rem' }}>
          🎬 Theatre Seat #{successAppt.position_number} Booked & Reserved!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          1 Package Seat (50kg load capacity) locked in database with Supabase Realtime synchronization.
        </p>

        {/* Ticket Confirmation Card */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#ffffff', borderRadius: '16px', padding: '1.5rem', textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem', marginBottom: '1.5rem', border: '2px dashed #3b82f6', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}>
          <div><span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>BOOKING REF</span> <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{successAppt.booking_id || 'AGR-2026-9042'}</strong></div>
          <div><span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>TOKEN CODE</span> <strong style={{ color: '#4ade80', fontSize: '1.2rem', fontFamily: 'monospace' }}>{successAppt.token_number}</strong></div>
          <div><span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>THEATRE SEAT</span> <strong style={{ color: '#fbbf24', fontSize: '1.1rem' }}>Seat Position #{successAppt.position_number}</strong></div>
          <div><span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>PROCUREMENT YARD</span> <strong style={{ color: '#ffffff' }}>{centre?.name || 'Mandya Central Yard'}</strong></div>
          <div><span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>TIME SLOT</span> <strong>{slot?.start_time || '10:00 - 10:30 AM'}</strong></div>
          <div><span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block' }}>PACKAGE LOAD</span> <strong>1 Package Seat ({packageWeight} kg)</strong></div>
        </div>

        {/* Secure QR Code Pass */}
        <div style={{ background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <div style={{ background: 'white', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <QrCode size={64} color="#0f172a" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SECURE GATE PASS QR CODE</div>
            <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', margin: '0.2rem 0' }}>
              {successAppt.qr_token || 'QR-AGR-2026-REF8841'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
              ✓ Scan at Weighbridge Gate for Instant Entry
            </div>
          </div>
        </div>

        <button onClick={() => { setSuccessAppt(null); setSelectedPosition(null); }} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          Book Another Seat / Package
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.08)' }}>
      
      {/* Header & Realtime Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={22} color="#2563eb" /> 🎬 THEATRE-STYLE SLOT & SEAT BOOKING
            </h2>
            {realtimePulse && (
              <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.3s' }}>
                <Sparkles size={12} className="animate-spin" /> Live Sync
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
            <strong>1 Seat = 1 Package ({packageWeight} kg total capacity)</strong>. Select an available theatre seat for slot <strong>{slot?.start_time || 'Selected Slot'}</strong>
          </p>
        </div>

        <button onClick={loadPositions} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Seats
        </button>
      </div>

      {/* Package Filling Capacity Bar (1 Seat = 1 Package Model) */}
      <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>
          <span style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Box size={16} color="#2563eb" /> PACKAGE CAPACITY FILLING (1 SEAT = 1 PACKAGE / 50KG)
          </span>
          <span style={{ color: isFull ? '#dc2626' : '#16a34a' }}>
            {bookedCount} / {totalPositions} PACKAGES FILLED ({availableCount} SEATS AVAILABLE)
          </span>
        </div>

        {/* Visual Progress Bar */}
        <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ width: `${bookedPercent}%`, background: isFull ? '#ef4444' : '#f59e0b', transition: 'width 0.4s ease' }} />
          <div style={{ width: `${100 - bookedPercent}%`, background: '#22c55e', transition: 'width 0.4s ease' }} />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.78rem', fontWeight: 700, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#22c55e', border: '1px solid #16a34a', display: 'inline-block' }} />
            <span>🟢 AVAILABLE SEAT ({availableCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444', border: '1px solid #dc2626', display: 'inline-block' }} />
            <span>🔴 BOOKED PACKAGE ({bookedCount})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6', border: '1px solid #1d4ed8', display: 'inline-block' }} />
            <span>🔵 YOUR SELECTION ({selectedPosition ? `Seat #${selectedPosition.position_number}` : 'None'})</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* THEATRE STAGE / WEIGHBRIDGE COUNTER SCREEN BAR */}
      <div style={{
        background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
        color: '#f8fafc',
        textAlign: 'center',
        padding: '0.5rem 1rem',
        borderRadius: '8px 8px 30px 30px',
        fontSize: '0.75rem',
        fontWeight: 800,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: '1.5rem',
        borderBottom: '3px solid #3b82f6',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        ━━━━ SCREEN / WEIGHBRIDGE GATE COUNTER DOCK ━━━━
      </div>

      {/* Visual Theatre Layout by Rows */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
          Loading Theatre Seat Grid...
        </div>
      ) : (
        <div>
          {rows.map((row, rIdx) => (
            <div key={rIdx} style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', letterSpacing: '0.05em', marginBottom: '0.4rem', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.2rem' }}>
                {row.label}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                {row.positions.map((pos) => {
                  if (!pos) return null;
                  const isBooked = pos.status === 'BOOKED';
                  const isSelected = selectedPosition?.id === pos.id;
                  const posNumStr = pos.position_number < 10 ? `0${pos.position_number}` : `${pos.position_number}`;

                  return (
                    <button
                      type="button"
                      key={pos.id}
                      disabled={isBooked}
                      onClick={() => handleSelectPosition(pos)}
                      style={{
                        padding: '0.85rem 0.5rem',
                        borderRadius: '12px 12px 6px 6px',
                        border: isSelected
                          ? '3px solid #2563eb'
                          : isBooked
                          ? '1px solid #fca5a5'
                          : '2px solid #86efac',
                        background: isSelected
                          ? 'linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%)'
                          : isBooked
                          ? 'linear-gradient(180deg, #fee2e2 0%, #fca5a5 100%)'
                          : 'linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)',
                        color: isBooked ? '#991b1b' : isSelected ? '#1e40af' : '#14532d',
                        cursor: isBooked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.2rem',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 0 4px rgba(37, 99, 235, 0.25), 0 4px 10px rgba(0,0,0,0.1)' : '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'relative'
                      }}
                    >
                      {/* Seat Top Curve Cushion */}
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, fontFamily: 'monospace' }}>SEAT #{posNumStr}</span>
                      <span style={{ fontSize: '1.2rem' }}>
                        {isBooked ? '📦' : isSelected ? '🎟️' : '💺'}
                      </span>
                      <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        {isBooked ? 'FILLED' : isSelected ? 'CHOSEN' : 'OPEN'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Selection Banner & Confirmation Button */}
          {selectedPosition ? (
            <div style={{ background: '#eff6ff', border: '2px solid #3b82f6', borderRadius: '12px', padding: '1rem', textAlign: 'center', marginTop: '1rem', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e40af', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Ticket size={20} /> Theatre Seat #{selectedPosition.position_number} Selected
              </div>
              <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: '0 0 0.85rem 0' }}>
                Reserves 1 package load slot (50kg) with atomic locks and Supabase Realtime synchronization.
              </p>
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={bookingLoading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', background: '#2563eb', borderColor: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                {bookingLoading ? 'Reserving Seat in PostgreSQL Database...' : '[ CONFIRM THEATRE SEAT BOOKING ]'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '0.85rem', background: '#f8fafc', borderRadius: '10px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, border: '1px dashed #cbd5e1' }}>
              👇 Click any 💺 OPEN theatre seat above to pick your position.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
