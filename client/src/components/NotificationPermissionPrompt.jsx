import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, ShieldCheck, X } from 'lucide-react';
import { requestNotificationPermission } from '../services/notificationManager';

export default function NotificationPermissionPrompt() {
  const { user } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    // Only show if user is logged in and notification permission is not granted yet
    if (!user) {
      setShowPrompt(false);
      return;
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        // Dismissed previously in this session?
        const dismissed = sessionStorage.getItem('agriflow_notification_prompt_dismissed');
        if (!dismissed) {
          setShowPrompt(true);
        }
      } else {
        setShowPrompt(false);
      }
    }
  }, [user]);

  const handleEnable = async () => {
    setAsking(true);
    try {
      await requestNotificationPermission();
      setShowPrompt(false);
    } catch (e) {
      console.warn('Error enabling notifications:', e);
    } finally {
      setAsking(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('agriflow_notification_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.25rem',
      right: '1.25rem',
      maxWidth: '420px',
      width: 'calc(100% - 2.5rem)',
      zIndex: 99999,
      background: 'linear-gradient(135deg, #0b1329 0%, #0f172a 100%)',
      color: '#f8fafc',
      padding: '1.2rem',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(74, 222, 128, 0.3)',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'rgba(22, 163, 74, 0.2)',
          border: '1px solid #16a34a',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Bell size={22} className="bell-ring" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
              Turn On Live Notifications
            </h4>
            <button
              onClick={handleDismiss}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ margin: '0.35rem 0 0.85rem 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.4 }}>
            Get real-time push alerts on your lock screen for gate queue tokens, weighing turns, and DBT payouts!
          </p>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              onClick={handleEnable}
              disabled={asking}
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.4)'
              }}
            >
              <ShieldCheck size={14} />
              {asking ? 'Enabling...' : 'Allow Push Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              style={{
                fontSize: '0.8rem',
                padding: '0.45rem 0.75rem',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
