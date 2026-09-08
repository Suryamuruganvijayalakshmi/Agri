import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { socket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

const TYPE_CONFIG = {
  SLOT_BOOKED:          { icon: '📅', color: '#16a34a', label: 'Slot Booked' },
  TOKEN_CALLED:         { icon: '📢', color: '#dc2626', label: 'Token Called' },
  WEIGHMENT_COMPLETED:  { icon: '⚖️', color: '#0891b2', label: 'Weighment' },
  QUALITY_COMPLETED:    { icon: '🔬', color: '#7c3aed', label: 'Quality' },
  PAYMENT_COMPLETED:    { icon: '💰', color: '#d97706', label: 'Payment' },
  PAYMENT_UPDATE:       { icon: '💳', color: '#9333ea', label: 'Payment' },
  PROCESSING_STARTED:   { icon: '🔄', color: '#2563eb', label: 'Processing' },
  APPROACHING:          { icon: '⏰', color: '#ea580c', label: 'Approaching' },
  CENTRE_UPDATE:        { icon: '🏢', color: '#2563eb', label: 'Centre' },
  BOOKING_CONFIRMED:    { icon: '✅', color: '#16a34a', label: 'Booked' },
  DEFAULT:              { icon: '🔔', color: '#475569', label: 'Notification' }
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function NotificationBellDropdown() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const farmerId = user?.id || user?._id || user?.farmer_id;

  const getHeaders = () => {
    const token = localStorage.getItem('agriflow_token');
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    if (farmerId) h['x-farmer-id'] = farmerId;
    return h;
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const loadNotifications = useCallback(async () => {
    if (!farmerId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/notifications?farmerId=${farmerId}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter(n => !n.read).length);
      }
    } catch (e) {
      console.warn('NotificationBell: fetch error', e.message);
    } finally {
      setLoading(false);
    }
  }, [farmerId]);

  // Fetch unread count only
  const fetchUnreadCount = useCallback(async () => {
    if (!farmerId) return;
    try {
      const res = await fetch(`/api/notifications/unread-count?farmerId=${farmerId}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setUnreadCount(data.count || 0);
    } catch {}
  }, [farmerId]);

  // Initial load + socket listeners
  useEffect(() => {
    if (role !== 'FARMER' || !farmerId) return;

    fetchUnreadCount();

    const handleNewNotif = (notif) => {
      // Only care about notifications for this farmer or ALL
      const nFarmer = notif.farmerId || notif.farmer_id;
      if (nFarmer && nFarmer !== farmerId && nFarmer !== 'ALL') return;
      setUnreadCount(c => c + 1);
      // If dropdown is open, prepend the notification
      setNotifications(prev => {
        if (prev.find(n => n.id === notif.id)) return prev;
        return [{ ...notif, read: false }, ...prev];
      });
    };

    const handleUpdated = (data) => {
      const uFarmer = data?.farmerId || data?.farmer_id;
      if (!uFarmer || uFarmer === farmerId || uFarmer === 'ALL') {
        fetchUnreadCount();
        if (open) loadNotifications();
      }
    };

    socket.on('notification_pushed', handleNewNotif);
    socket.on('centre_notification', handleNewNotif);
    socket.on('notifications_updated', handleUpdated);

    // Fallback polling every 30s
    const poll = setInterval(fetchUnreadCount, 30000);

    return () => {
      socket.off('notification_pushed', handleNewNotif);
      socket.off('centre_notification', handleNewNotif);
      socket.off('notifications_updated', handleUpdated);
      clearInterval(poll);
    };
  }, [role, farmerId, fetchUnreadCount, open, loadNotifications]);

  // Load full list when dropdown opens
  useEffect(() => {
    if (open && farmerId) loadNotifications();
  }, [open, farmerId, loadNotifications]);

  // Mark one as read
  const markRead = async (nid, e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.map(n => n.id === nid ? { ...n, read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
    try {
      await fetch(`/api/notifications/${nid}/read`, {
        method: 'PATCH',
        headers: getHeaders()
      });
    } catch {}
  };

  // Mark all as read
  const markAllRead = async (e) => {
    if (e) e.stopPropagation();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch(`/api/notifications/read-all`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ farmerId })
      });
    } catch {}
  };

  const handleNotifClick = (n) => {
    markRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const cfg = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.DEFAULT;

  if (role !== 'FARMER' || !user) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          background: open ? 'rgba(22, 163, 74, 0.2)' : 'transparent',
          border: open ? '1px solid #16a34a' : '1px solid transparent',
          color: open ? '#4ade80' : '#cbd5e1',
          cursor: 'pointer',
          padding: '0.4rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'all 0.2s'
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#dc2626', color: 'white',
            fontSize: '0.58rem', fontWeight: 900, borderRadius: '9999px',
            minWidth: '16px', height: '16px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            border: '2px solid #0f172a',
            animation: 'notifPulse 2s ease-in-out infinite'
          }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: '0',
          width: '380px',
          maxWidth: '95vw',
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          zIndex: 10000,
          overflow: 'hidden',
          animation: 'notifDropIn 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.85rem 1rem',
            borderBottom: '1px solid #1e293b',
            background: '#0f172a'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#16a34a', color: 'white', fontSize: '0.65rem', fontWeight: 800,
                  padding: '0.1rem 0.45rem', borderRadius: '9999px'
                }}>{unreadCount} new</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: 'rgba(22, 163, 74, 0.15)', color: '#4ade80',
                    border: '1px solid rgba(22, 163, 74, 0.3)',
                    padding: '0.25rem 0.55rem', borderRadius: '6px',
                    fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.25rem'
                  }}
                >
                  <Check size={12} /> Read all
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                style={{
                  background: 'transparent', border: 'none', color: '#64748b',
                  cursor: 'pointer', padding: '0.2rem', display: 'flex'
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div style={{
            maxHeight: '420px', overflowY: 'auto',
            scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent'
          }}>
            {loading && notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid #334155', borderTop: '2px solid #16a34a', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem auto' }} />
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: '#64748b' }}>
                <Bell size={36} color="#334155" style={{ display: 'block', margin: '0 auto 0.75rem auto' }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.3rem' }}>No notifications yet</div>
                <div style={{ fontSize: '0.78rem' }}>You'll get updates on bookings, tokens, weighment, quality checks, and payments.</div>
              </div>
            ) : (
              notifications.slice(0, 30).map((n) => {
                const c = cfg(n.type);
                const createdAt = n.created_at || n.createdAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #1e293b',
                      cursor: n.link ? 'pointer' : 'default',
                      background: n.read ? 'transparent' : 'rgba(22, 163, 74, 0.06)',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
                    onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(22, 163, 74, 0.06)'}
                  >
                    {/* Icon */}
                    <div style={{
                      fontSize: '1.2rem', flexShrink: 0,
                      width: '34px', height: '34px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${c.color}18`, borderRadius: '8px',
                      border: `1px solid ${c.color}30`
                    }}>
                      {n.icon || c.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: n.read ? '#94a3b8' : '#f8fafc' }}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span style={{
                            width: '7px', height: '7px', borderRadius: '50%',
                            background: '#16a34a', flexShrink: 0
                          }} />
                        )}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {n.message}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{timeAgo(createdAt)}</span>
                        <span style={{ fontSize: '0.6rem', color: c.color, background: `${c.color}15`, padding: '0.05rem 0.35rem', borderRadius: '9999px', fontWeight: 700 }}>{c.label}</span>
                      </div>
                    </div>

                    {/* Mark read button */}
                    {!n.read && (
                      <button
                        onClick={(e) => markRead(n.id, e)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#64748b', padding: '4px', flexShrink: 0,
                          display: 'flex', alignItems: 'center'
                        }}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              onClick={() => { navigate('/farmer/notifications'); setOpen(false); }}
              style={{
                textAlign: 'center', padding: '0.7rem',
                borderTop: '1px solid #1e293b',
                color: '#38bdf8', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1e293b'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              View all notifications →
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes notifDropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notifPulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.15); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
