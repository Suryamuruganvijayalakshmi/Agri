// AGRIFlow Notification & Web Push Manager
import { socket } from './socket';

let swRegistration = null;

// Initialize Service Worker
export async function initNotificationService() {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('[AGRIFlow Push] Service Worker registered successfully:', swRegistration.scope);
    } catch (err) {
      console.warn('[AGRIFlow Push] Service Worker registration failed:', err.message);
    }
  }

  // Setup Socket.IO listener for incoming real-time notifications
  setupSocketNotificationListeners();
}

// Check notification permission state
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default', 'granted', 'denied'
}

// Request Browser Notification Permission
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      triggerPushNotification(
        '🔔 AGRIFlow Notifications Active',
        'You will now receive live alerts for booked slots, queue calls, quality checks, and DBT payments even when this window is in the background!',
        '🔔'
      );
    }
    return permission;
  } catch (e) {
    console.warn('[AGRIFlow Notification] Request failed:', e.message);
    return 'denied';
  }
}

// Synthesize pleasant notification chime sound using Web Audio API
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // AudioContext blocked by browser autoplay policy until interaction
  }
}

// Trigger both Desktop/Mobile Browser Notification and In-App Toast
export function triggerPushNotification(title, message, icon = '🌾', type = 'info') {
  playNotificationSound();

  // 1. In-App Floating Toast Notification event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agriflow:toast', {
      detail: { title, message, icon, type, timestamp: Date.now() }
    }));
  }

  // 2. Native Browser Desktop / Background Push Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if (swRegistration && 'showNotification' in swRegistration) {
        swRegistration.showNotification(title, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `agriflow-${Date.now()}`,
          vibrate: [200, 100, 200]
        });
      } else {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          tag: `agriflow-${Date.now()}`
        });
      }
    } catch (err) {
      console.warn('[AGRIFlow Notification] Native show failed:', err.message);
    }
  }
}

// Listen to Socket.IO events and push alerts
function setupSocketNotificationListeners() {
  if (!socket) return;

  // Generic direct notification from server
  socket.on('notification_pushed', (data) => {
    if (!data) return;
    triggerPushNotification(data.title || 'AGRIFlow Alert', data.message || 'Operational update received.', data.icon || '🔔', data.type || 'info');
  });

  // When a farmer books a slot
  socket.on('appointment_booked', (data) => {
    const appt = data?.appointment || data;
    const token = data?.token_number || appt?.token_number || 'New Slot';
    const farmer = appt?.farmer_name || 'Farmer';
    const qty = appt?.declared_quantity_kg || appt?.quantity_kg || 2500;
    triggerPushNotification(
      `📅 Slot Booked: Token ${token}`,
      `${farmer} booked ${Number(qty).toLocaleString()} kg of ${appt?.crop_type || 'Produce'}. Arrival queue updated!`,
      '🚜',
      'success'
    );
  });

  // When queue advances or farmer is called
  socket.on('queue_updated', (data) => {
    if (data?.status === 'CALLED' || data?.token_number) {
      triggerPushNotification(
        `📢 Token ${data.token_number || 'Next'} Called!`,
        `Proceed to Counter / Weighbridge immediately.`,
        '⚖️',
        'info'
      );
    }
  });

  // When DBT payment updates
  socket.on('payment_updated', (data) => {
    const p = data?.payment || data;
    if (p && p.status) {
      triggerPushNotification(
        `💳 DBT Payment: ${p.status}`,
        `Payment of ₹${Number(p.amount || 0).toLocaleString()} for ${p.farmer_name || 'Farmer'} is ${p.status}.`,
        p.status === 'PAID' ? '💰' : '💳',
        p.status === 'PAID' ? 'success' : 'info'
      );
    }
  });

  // When centre status or capacity changes
  socket.on('centre_notification', (data) => {
    if (!data) return;
    triggerPushNotification(data.title || 'Centre Notice', data.message || '', '🏢', 'info');
  });
}
