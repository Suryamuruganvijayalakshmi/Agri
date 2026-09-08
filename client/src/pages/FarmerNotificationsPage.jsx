import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import {
  Bell, CheckCircle2, Clock, CreditCard, ShieldCheck,
  AlertTriangle, Building2, RefreshCw, Trash2, Check, X
} from 'lucide-react';

const TYPE_CONFIG = {
  SLOT_BOOKED:          { icon: '📅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'Slot Booked' },
  TOKEN_CALLED:         { icon: '📢', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Token Called' },
  WEIGHMENT_COMPLETED:  { icon: '⚖️', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Weighment Completed' },
  QUALITY_COMPLETED:    { icon: '🔬', color: '#7c3aed', bg: '#faf5ff', border: '#d8b4fe', label: 'Quality Verified' },
  PAYMENT_COMPLETED:    { icon: '💰', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: 'Payment Processed' },
  PAYMENT_UPDATE:       { icon: '💳', color: '#9333ea', bg: '#faf5ff', border: '#d8b4fe', label: 'Payment Update' },
  PROCESSING_STARTED:   { icon: '🔄', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Processing' },
  APPROACHING:          { icon: '⏰', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa', label: 'Approaching' },
  CENTRE_UPDATE:        { icon: '🏢', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: 'Centre Update' },
  BOOKING_CONFIRMED:    { icon: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'Booking Confirmed' },
  PROCUREMENT_COMPLETED:{ icon: '✅', color: '#16a34a', bg: '#f0fdf4', border: '#86efac', label: 'Procurement Complete' },
  PAYMENT_CREDITED:     { icon: '💰', color: '#9333ea', bg: '#faf5ff', border: '#d8b4fe', label: 'Payment' },
  QUALITY_ACCEPTED:     { icon: '🔬', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Quality Check' },
  REMINDER:             { icon: '⏰', color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: 'Reminder' },
  QUEUE_UPDATE:         { icon: '📋', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Queue' },
  DEFAULT:              { icon: '🔔', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', label: 'Notification' }
};

const API = '/api';

export default function FarmerNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const farmerId = user?.id || localStorage.getItem('agriflow_user')
    ? JSON.parse(localStorage.getItem('agriflow_user') || '{}').id
    : 'F-1042';

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveToast, setLiveToast] = useState(null);   // live popup

  // ── fetch from MongoDB ────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!farmerId) return;
    try {
      const res = await fetch(`${API}/notifications/${farmerId}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (e) {
      console.warn('Could not load notifications:', e.message);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  useEffect(() => {
    loadNotifications();

    // ── Socket: live notification_pushed from the pipeline ──────────
    const handleLiveNotif = (notif) => {
      // Only care about notifications for this farmer or ALL
      if (notif.farmer_id && notif.farmer_id !== farmerId && notif.farmer_id !== 'ALL') return;
      setNotifications(prev => {
        const exists = prev.find(n => n.id === notif.id);
        if (exists) return prev;
        return [{ ...notif, read: false }, ...prev];
      });
      // Show a toast popup for 5s
      setLiveToast(notif);
      setTimeout(() => setLiveToast(null), 5000);
    };

    const handleUpdated = (data) => {
      if (data?.farmer_id === farmerId || data?.farmer_id === 'ALL') {
        loadNotifications();
      }
    };

    socket.on('notification_pushed', handleLiveNotif);
    socket.on('centre_notification', handleLiveNotif);
    socket.on('notifications_updated', handleUpdated);
    socket.on('appointment_booked', () => loadNotifications());

    return () => {
      socket.off('notification_pushed', handleLiveNotif);
      socket.off('centre_notification', handleLiveNotif);
      socket.off('notifications_updated', handleUpdated);
      socket.off('appointment_booked');
    };
  }, [farmerId, loadNotifications]);

  const getHeaders = () => {
    const token = localStorage.getItem('agriflow_token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (farmerId) h['x-farmer-id'] = farmerId;
    return h;
  };

  // ── mark one read ─────────────────────────────────────────────────────────
  const markRead = async (nid) => {
    setNotifications(prev => prev.map(n => n.id === nid ? { ...n, read: true } : n));
    try { await fetch(`${API}/notifications/${nid}/read`, { method: 'PATCH', headers: getHeaders() }); } catch {}
  };

  // ── mark all read ─────────────────────────────────────────────────────────
  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await fetch(`${API}/notifications/read-all`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify({ farmerId }) }); } catch {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const cfg = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.DEFAULT;

  const timeAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Live Toast Popup ── */}
      {liveToast && (
        <div
          style={{
            position: 'fixed', top: '80px', right: '20px', zIndex: 99999,
            background: '#1e293b', color: 'white',
            border: '2px solid #16a34a', borderRadius: '14px',
            padding: '1rem 1.25rem', maxWidth: '360px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
            animation: 'slideIn 0.3s ease'
          }}
        >
          <div style={{ fontSize: '1.6rem' }}>{liveToast.icon || '🔔'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.2rem' }}>{liveToast.title}</div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{liveToast.message}</div>
          </div>
          <button
            onClick={() => setLiveToast(null)}
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{
            fontSize: '1.6rem', fontWeight: 800, margin: 0,
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            fontFamily: 'Outfit, sans-serif', color: '#0f172a'
          }}>
            <div style={{
              background: unreadCount > 0 ? '#16a34a' : '#e2e8f0',
              color: unreadCount > 0 ? 'white' : '#64748b',
              width: '44px', height: '44px', borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative'
            }}>
              <Bell size={22} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-6px',
                  background: '#dc2626', color: 'white',
                  fontSize: '0.65rem', fontWeight: 900,
                  borderRadius: '9999px', minWidth: '18px', height: '18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px'
                }}>{unreadCount}</span>
              )}
            </div>
            Notifications
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
            Real-time updates from your procurement centres, bookings, and payments
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={loadNotifications} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Check size={14} /> Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Notifications List ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem auto' }} />
          Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
          <Bell size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto', display: 'block' }} />
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#334155', marginBottom: '0.5rem' }}>No notifications yet</div>
          <div style={{ fontSize: '0.85rem' }}>You'll receive notifications when officers update centre status, your booking is confirmed, or payments are processed.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.map((n) => {
            const c = cfg(n.type);
            const createdAt = n.created_at || n.createdAt;
            return (
              <div
                key={n.id}
                onClick={() => {
                  markRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                style={{
                  background: n.read ? '#ffffff' : c.bg,
                  border: `1px solid ${n.read ? '#e2e8f0' : c.border}`,
                  borderLeft: `5px solid ${n.read ? '#cbd5e1' : c.color}`,
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  cursor: n.link ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  boxShadow: n.read ? 'none' : '0 2px 8px rgba(0,0,0,0.06)'
                }}
                onMouseEnter={e => { if (n.link) e.currentTarget.style.transform = 'translateX(4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; }}
              >
                {/* Icon */}
                <div style={{
                  fontSize: '1.6rem', flexShrink: 0, width: '40px', height: '40px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: c.bg, borderRadius: '10px', border: `1px solid ${c.border}`
                }}>
                  {n.icon || c.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>{n.title}</h3>
                      {!n.read && (
                        <span style={{ background: c.color, color: 'white', fontSize: '0.6rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '9999px', textTransform: 'uppercase' }}>NEW</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>{createdAt ? timeAgo(createdAt) : ''}</span>
                      <span style={{ fontSize: '0.68rem', background: '#f1f5f9', color: '#64748b', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>{c.label}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>{n.message}</p>
                  {n.link && (
                    <div style={{ fontSize: '0.75rem', color: c.color, fontWeight: 700, marginTop: '0.4rem' }}>Tap to view →</div>
                  )}
                </div>

                {/* Mark read button */}
                {!n.read && (
                  <button
                    onClick={e => { e.stopPropagation(); markRead(n.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                    title="Mark as read"
                  >
                    <Check size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
