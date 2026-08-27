import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, CheckCircle2, Clock, CreditCard, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';

export default function FarmerNotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: 'n1',
      title: 'Position Booked & Confirmed',
      message: 'Position #07 for 2,500 kg Paddy at Mandya Central Yard confirmed for 10:00 - 10:30 AM.',
      type: 'BOOKING_CONFIRMED',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      read: false
    },
    {
      id: 'n2',
      title: 'Appointment Reminder',
      message: 'Your procurement slot at Mandya Central begins at 10:00 AM today. Gate token T-07-014 active.',
      type: 'REMINDER',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      read: true
    },
    {
      id: 'n3',
      title: 'Quality Inspection Passed (Grade A)',
      message: 'Moisture level 13.2% verified. Produce certified Grade A for MSP ₹23.2/kg payout.',
      type: 'QUALITY_ACCEPTED',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      read: true
    },
    {
      id: 'n4',
      title: 'DBT Payment Credited ₹58,000',
      message: 'Direct Benefit Transfer completed to State Bank of India A/C *8821 (Ref PAY-2026-004821).',
      type: 'PAYMENT_CREDITED',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      read: true
    }
  ]);

  useEffect(() => {
    // Supabase Realtime subscription on notifications
    const channel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new) {
          setNotifications(prev => [payload.new, ...prev]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
            <Bell size={24} color="#16a34a" /> Notification Center
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Realtime operational updates for booking, queue status, quality checks, and DBT disbursements.
          </p>
        </div>

        <button onClick={markAllRead} className="btn btn-secondary btn-sm">
          Mark All as Read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {notifications.map((n) => (
          <div
            key={n.id}
            className="card"
            style={{
              padding: '1.15rem',
              borderLeft: n.read ? '4px solid #cbd5e1' : '4px solid #16a34a',
              background: n.read ? 'white' : '#f0fdf4'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {n.title}
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#475569', margin: '0.2rem 0 0 0' }}>
              {n.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
