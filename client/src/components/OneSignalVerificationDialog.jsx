import React, { useEffect, useState, useRef } from 'react';

/**
 * OneSignal SDK Push Subscription Verification Dialog
 * Compliant with OneSignal SDK AI Prompt Specification:
 * 1. Attaches a push subscription observer retained for the lifetime of the app
 * 2. Evaluates subscription ID immediately and on change
 * 3. Shows dialog exactly once only when ID is real (not empty, not starting with "local-")
 * 4. Requests push permission upon clicking "Got it"
 */
export default function OneSignalVerificationDialog() {
  const [showModal, setShowModal] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SHOWN_KEY = 'onesignal_verification_dialog_shown';
    if (localStorage.getItem(SHOWN_KEY)) return;

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal) {
      const checkSubscription = (subId) => {
        if (
          subId &&
          typeof subId === 'string' &&
          subId.trim().length > 0 &&
          !subId.startsWith('local-')
        ) {
          if (!localStorage.getItem(SHOWN_KEY)) {
            localStorage.setItem(SHOWN_KEY, 'true');
            setShowModal(true);
          }
        }
      };

      // 1. Immediate evaluation
      try {
        const currentId = OneSignal.User?.pushSubscription?.id;
        checkSubscription(currentId);
      } catch (e) {}

      // 2. Retained observer
      observerRef.current = (event) => {
        const newId = event?.current?.id || OneSignal.User?.pushSubscription?.id;
        checkSubscription(newId);
      };

      if (OneSignal.User?.pushSubscription?.addEventListener) {
        OneSignal.User.pushSubscription.addEventListener('change', observerRef.current);
      }
    });

    return () => {
      if (window.OneSignal && observerRef.current && window.OneSignal.User?.pushSubscription?.removeEventListener) {
        window.OneSignal.User.pushSubscription.removeEventListener('change', observerRef.current);
      }
    };
  }, []);

  const handleGotIt = async () => {
    setShowModal(false);
    if (window.OneSignal) {
      try {
        await window.OneSignal.Notifications.requestPermission();
      } catch (e) {
        console.warn('OneSignal permission request warning:', e);
      }
    }
  };

  if (!showModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        maxWidth: '440px',
        width: '100%',
        padding: '2rem 1.75rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        textAlign: 'center',
        color: '#f8fafc'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#e11d48',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          fontSize: '30px'
        }}>
          🔔
        </div>

        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: 700,
          marginBottom: '0.85rem',
          color: '#ffffff',
          lineHeight: '1.3'
        }}>
          Your OneSignal SDK integration is complete!
        </h3>

        <p style={{
          fontSize: '0.95rem',
          lineHeight: '1.5',
          color: '#94a3b8',
          marginBottom: '1.75rem'
        }}>
          You can now send Push Notifications &amp; In-App Messages through OneSignal. Tap below to enable push notifications.
        </p>

        <button
          id="onesignal-got-it-btn"
          onClick={handleGotIt}
          style={{
            width: '100%',
            padding: '0.85rem 1.25rem',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
