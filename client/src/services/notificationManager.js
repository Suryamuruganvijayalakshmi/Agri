// AGRIFlow Push Notification Manager
// Provides REAL background push notifications (like Instagram)
// Works when phone is locked, browser is closed, screen is off
import { socket } from './socket';

let swRegistration = null;
let _isSubscribed = false;

// ─── Utility ────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getUserInfo() {
  return {
    userId: localStorage.getItem('agriflow_user_id') || localStorage.getItem('userId') || 'anonymous',
    role: localStorage.getItem('agriflow_role') || localStorage.getItem('userRole') || 'FARMER'
  };
}

// ─── Service Worker Registration ────────────────────────────

export async function initNotificationService() {
  if (typeof window === 'undefined') return null;

  if (!('serviceWorker' in navigator)) {
    console.warn('[AGRIFlow Push] Service Workers not supported in this browser.');
    setupSocketNotificationListeners();
    return null;
  }

  try {
    // Register the service worker
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[AGRIFlow Push] Service Worker registered. Scope:', swRegistration.scope);

    // Wait for the SW to fully activate (critical for push!)
    await navigator.serviceWorker.ready;
    console.log('[AGRIFlow Push] Service Worker is active and ready.');

    // Auto-resubscribe if permission was previously granted
    if (Notification.permission === 'granted') {
      await subscribeToRealWebPush();
    }
  } catch (err) {
    console.warn('[AGRIFlow Push] SW registration failed:', err.message);
  }

  // Setup in-app socket notifications (works when site is open)
  setupSocketNotificationListeners();
  return swRegistration;
}

// ─── Web Push Subscription (the Instagram magic) ─────────────

export async function subscribeToRealWebPush() {
  if (typeof window === 'undefined') return null;

  if (!swRegistration) {
    try {
      swRegistration = await navigator.serviceWorker.ready;
    } catch (e) {
      console.warn('[AGRIFlow Push] No SW registration available.');
      return null;
    }
  }

  if (!('pushManager' in swRegistration)) {
    console.warn('[AGRIFlow Push] PushManager not available — browser does not support Web Push.');
    return null;
  }

  try {
    // Check if already subscribed
    let sub = await swRegistration.pushManager.getSubscription();

    if (!sub) {
      // Fetch VAPID public key from our server
      const res = await fetch('/api/notifications/vapid-public-key');
      if (!res.ok) throw new Error(`VAPID key fetch failed: ${res.status}`);

      const data = await res.json();
      if (!data.publicKey) throw new Error('Server returned no VAPID public key');

      console.log('[AGRIFlow Push] Got VAPID key, subscribing with Google FCM / Apple APNs...');

      sub = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,  // Required — tells browser this will only show visible notifications
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });

      console.log('[AGRIFlow Push] ✅ PushSubscription created! Device registered with push service.');
    } else {
      console.log('[AGRIFlow Push] Already have a valid PushSubscription, reusing.');
    }

    // Save subscription to our server DB (so server can push even when site is closed)
    const { userId, role } = getUserInfo();
    const saveRes = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), userId, role })
    });

    if (!saveRes.ok) {
      throw new Error(`Failed to save subscription on server: ${saveRes.status}`);
    }

    _isSubscribed = true;
    console.log(`✅ [AGRIFlow Push] Device saved on server for user=${userId}, role=${role}. Background push active!`);
    return sub;
  } catch (err) {
    console.error('[AGRIFlow Push] Subscription failed:', err.message);
    return null;
  }
}

export function isSubscribed() {
  return _isSubscribed;
}

// ─── Permission Request ──────────────────────────────────────

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // Prompt OneSignal to register mobile push token
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function(OneSignal) {
          try {
            await OneSignal.Notifications.requestPermission();
          } catch (e) {}
        });
      }

      // Immediately subscribe to real background push
      const sub = await subscribeToRealWebPush();

      // Show a welcome notification through the SW (shows on lockscreen too!)
      await showServiceWorkerNotification(
        '🔔 AGRIFlow Alerts Active!',
        'You will now receive notifications even when your phone is locked and this app is closed.',
        { tag: 'agriflow-welcome', url: '/' }
      );

      if (sub) {
        console.log('✅ [AGRIFlow Push] Notifications fully enabled — background push active like Instagram!');
      }
    }

    return permission;
  } catch (e) {
    console.warn('[AGRIFlow Push] Permission request error:', e.message);
    return 'denied';
  }
}

// ─── Show Notification via Service Worker (appears on lockscreen!) ──────

export async function showServiceWorkerNotification(title, body, options = {}) {
  const reg = swRegistration || (await navigator.serviceWorker.ready.catch(() => null));
  if (!reg) return;

  const notifOptions = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: options.tag || `agriflow-${Date.now()}`,
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: options.requireInteraction !== false, // keep on lockscreen
    renotify: true,
    silent: false,
    data: { url: options.url || '/' }
  };

  try {
    await reg.showNotification(title, notifOptions);
  } catch (err) {
    // Fallback to Notification API if SW notification fails
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body, icon: '/favicon.ico', tag: notifOptions.tag }); } catch {}
    }
  }
}

// ─── Audio Chime ─────────────────────────────────────────────

export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// ─── Main Notification Trigger ───────────────────────────────

export async function triggerPushNotification(title, message, icon = '🌾', type = 'info', targetUrl = '/') {
  // 1. Play sound
  playNotificationSound();

  // 2. In-app toast (when site is open)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agriflow:toast', {
      detail: { title, message, icon, type, timestamp: Date.now(), url: targetUrl }
    }));
  }

  // 3. Native lockscreen notification via Service Worker
  if (Notification.permission === 'granted') {
    await showServiceWorkerNotification(
      `${icon} ${title}`,
      message,
      { tag: `agriflow-${Date.now()}`, url: targetUrl }
    );
  }
}

// ─── Test: Lock phone, close site, and get a push ────────────

export async function testLockscreenNotification(seconds = 5) {
  if (typeof window === 'undefined') return;

  // Ensure permission
  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') {
      alert('Please allow notifications first to test lockscreen push.');
      return;
    }
  }

  // Ensure push subscription is saved on server
  await subscribeToRealWebPush();

  // Show countdown toast
  window.dispatchEvent(new CustomEvent('agriflow:toast', {
    detail: {
      title: '📱 Real Server Push Test',
      message: `Lock your phone or close this app NOW! In ${seconds}s, Google FCM will push to your lockscreen — even with the app completely closed!`,
      icon: '🔒',
      type: 'info',
      timestamp: Date.now()
    }
  }));

  try {
    const res = await fetch('/api/notifications/test-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delayMs: seconds * 1000,
        title: '🌾 AGRIFlow: Token #104 Called!',
        message: 'Your farming token is ready. Proceed to Weighbridge Station #1 immediately.',
        url: '/farmer/queue'
      })
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    console.log('[AGRIFlow Push] Test push scheduled:', data.message);
  } catch (err) {
    console.error('[AGRIFlow Push] Test push failed:', err.message);
    alert('Could not schedule test push. Make sure the server is running on port 5000.');
  }
}

// ─── Socket.IO Live Event Listeners ─────────────────────────

function setupSocketNotificationListeners() {
  if (!socket) return;

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

  socket.on('appointment_booked', (data) => {
    const appt = data?.appointment || data;
    const token = data?.token_number || appt?.token_number || 'New';
    const farmer = appt?.farmer_name || 'A farmer';
    const qty = appt?.declared_quantity_kg || appt?.quantity_kg || 0;
    triggerPushNotification(
      `📅 Slot Booked: Token ${token}`,
      `${farmer} booked ${Number(qty).toLocaleString()} kg of ${appt?.crop_type || 'produce'}.`,
      '🚜', 'success', '/operator/queue'
    );
  });

  socket.on('queue_updated', (data) => {
    if (data?.status === 'CALLED' || data?.token_number) {
      triggerPushNotification(
        `📢 Token ${data.token_number || 'Next'} Called!`,
        'Proceed to counter/weighbridge immediately.',
        '⚖️', 'info', '/farmer/queue'
      );
    }
  });

  socket.on('weighment_completed', (data) => {
    triggerPushNotification(
      `⚖️ Weighment: ${data?.actual_weight_kg || ''} kg Recorded`,
      `Token ${data?.token_number || ''} weighed. Moving to quality check.`,
      '⚖️', 'info', '/farmer/procurement'
    );
  });

  socket.on('payment_updated', (data) => {
    const p = data?.payment || data;
    if (p?.status) {
      triggerPushNotification(
        `💳 Payment ${p.status}`,
        `₹${Number(p.amount || 0).toLocaleString()} for ${p.farmer_name || 'Farmer'}.`,
        p.status === 'PAID' ? '💰' : '💳',
        p.status === 'PAID' ? 'success' : 'info',
        '/farmer/payments'
      );
    }
  });

  socket.on('centre_notification', (data) => {
    if (!data) return;
    triggerPushNotification(
      data.title || 'Centre Notice',
      data.message || '',
      '🏢', 'info', '/farmer/centres'
    );
  });
}
