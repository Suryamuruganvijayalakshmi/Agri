// AGRIFlow Notification & Web Push Manager with Mobile Lockscreen Support
import { socket } from './socket';

let swRegistration = null;

// Initialize Service Worker
export async function initNotificationService() {
  if (typeof window === 'undefined') return null;

  if ('serviceWorker' in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('[AGRIFlow Push] Service Worker registered:', swRegistration.scope);

      // Wait for SW to be ready and active
      await navigator.serviceWorker.ready;
      return swRegistration;
    } catch (err) {
      console.warn('[AGRIFlow Push] Service Worker registration error:', err.message);
    }
  }

  // Setup Socket.IO listener for incoming real-time notifications
  setupSocketNotificationListeners();
  return null;
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
        'Live mobile lockscreen & background alerts enabled for bookings, weighment, quality checks, and DBT payments!',
        '🔔',
        'success'
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
    // AudioContext blocked by browser autoplay policy until user interacts
  }
}

// Trigger both Desktop/Mobile Browser Lockscreen Notification and In-App Toast
export function triggerPushNotification(title, message, icon = '🌾', type = 'info', targetUrl = '/') {
  // 1. Play chime
  playNotificationSound();

  // 2. In-App Floating Toast Notification event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agriflow:toast', {
      detail: { title, message, icon, type, timestamp: Date.now(), url: targetUrl }
    }));
  }

  // 3. Native Browser System / Mobile Lockscreen Push Notification
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const notificationPayload = {
      body: message,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `agriflow-alert-${Date.now()}`,
      vibrate: [300, 100, 300, 100, 400],
      requireInteraction: true,
      renotify: true,
      silent: false,
      url: targetUrl
    };

    try {
      // Primary: Send message to Service Worker controller (best for Android Mobile Lockscreen)
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title: title,
          options: notificationPayload
        });
      }

      // Secondary: Call swRegistration.showNotification directly if available
      if (swRegistration && 'showNotification' in swRegistration) {
        swRegistration.showNotification(title, notificationPayload);
      } else if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, notificationPayload);
        }).catch(() => {
          // Fallback to standard desktop Notification constructor
          try {
            new Notification(title, { body: message, icon: '/favicon.ico', tag: notificationPayload.tag });
          } catch {}
        });
      }
    } catch (err) {
      console.warn('[AGRIFlow Notification] Native show error:', err.message);
    }
  }
}

// Helper to trigger a delayed notification so the user can lock their mobile screen to verify!
export function testLockscreenNotification(seconds = 4) {
  if (typeof window === 'undefined') return;

  if (Notification.permission !== 'granted') {
    requestNotificationPermission().then((perm) => {
      if (perm === 'granted') {
        runLockscreenCountdown(seconds);
      } else {
        alert('Please enable notifications in your browser permissions to test mobile lockscreen alerts.');
      }
    });
  } else {
    runLockscreenCountdown(seconds);
  }
}

function runLockscreenCountdown(seconds) {
  // Toast prompting user to lock their phone
  window.dispatchEvent(new CustomEvent('agriflow:toast', {
    detail: {
      title: '📱 Testing Mobile Lockscreen Alert',
      message: `Lock your mobile phone right now! Your test lockscreen alert will ring in ${seconds} seconds...`,
      icon: '🔒',
      type: 'info',
      timestamp: Date.now()
    }
  }));

  setTimeout(() => {
    triggerPushNotification(
      '🌾 AGRIFlow Lockscreen Alert: Token #104 Called!',
      'Your token #104 has been called for Weighment Station #1. Proceed to weighbridge immediately.',
      '⚖️',
      'success',
      '/farmer/queue'
    );
  }, seconds * 1000);
}

// Listen to Socket.IO events and push alerts
function setupSocketNotificationListeners() {
  if (!socket) return;

  // Generic direct notification from server
  socket.on('notification_pushed', (data) => {
    if (!data) return;
    triggerPushNotification(
      data.title || 'AGRIFlow Alert',
      data.message || 'Operational update received.',
      data.icon || '🔔',
      data.type || 'info',
      data.url || '/'
    );
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
      'success',
      '/operator/queue'
    );
  });

  // When queue advances or farmer is called
  socket.on('queue_updated', (data) => {
    if (data?.status === 'CALLED' || data?.token_number) {
      triggerPushNotification(
        `📢 Token ${data.token_number || 'Next'} Called!`,
        `Your turn has arrived. Proceed to Weighbridge / Counter immediately.`,
        '⚖️',
        'info',
        '/farmer/queue'
      );
    }
  });

  // When weighment is recorded
  socket.on('weighment_completed', (data) => {
    triggerPushNotification(
      `⚖️ Weighment Recorded: ${data?.actual_weight_kg || 'Loaded'} kg`,
      `Token ${data?.token_number || ''} recorded actual gross weight. Moving to quality lab check.`,
      '⚖️',
      'info',
      '/farmer/procurement'
    );
  });

  // When DBT payment updates
  socket.on('payment_updated', (data) => {
    const p = data?.payment || data;
    if (p && p.status) {
      triggerPushNotification(
        `💳 DBT Payment: ${p.status}`,
        `Payment of ₹${Number(p.amount || 0).toLocaleString()} for ${p.farmer_name || 'Farmer'} is ${p.status}.`,
        p.status === 'PAID' ? '💰' : '💳',
        p.status === 'PAID' ? 'success' : 'info',
        '/farmer/payments'
      );
    }
  });

  // When centre status or capacity changes
  socket.on('centre_notification', (data) => {
    if (!data) return;
    triggerPushNotification(
      data.title || 'Centre Notice',
      data.message || '',
      '🏢',
      'info',
      '/farmer/centres'
    );
  });
}
