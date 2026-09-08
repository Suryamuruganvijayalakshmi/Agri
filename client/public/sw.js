// AGRIFlow Service Worker
// Handles real background push notifications (like Instagram)
// Runs 24/7 even when the phone is locked and the site/app is completely closed

const CACHE_NAME = 'agriflow-v1';
const OFFLINE_URL = '/';

// ─── Install ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing AGRIFlow Service Worker...');
  self.skipWaiting(); // Activate immediately, don't wait for old SW to finish
});

// ─── Activate ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] AGRIFlow Service Worker activated. Ready for background push.');
  event.waitUntil(self.clients.claim()); // Take control of all pages immediately
});

// ─── Push Event (fired by Google FCM / Apple APNs) ──────────
// This fires even when:
//   • The browser is completely closed
//   • The phone screen is OFF / locked
//   • The user hasn't opened the site in days
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Real background push received from server!');

  let data = {
    title: 'AGRIFlow Alert',
    body: 'You have a new operational update. Tap to open.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    url: '/',
    tag: `agriflow-push-${Date.now()}`
  };

  // Parse push payload from server
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      // Support both 'body' and 'message' keys from server payload
      if (!data.body && data.message) data.body = data.message;
    } catch {
      // If not JSON, treat as plain text body
      data.body = event.data.text() || data.body;
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `agriflow-${Date.now()}`,
    // Vibration pattern: buzz 300ms, pause 100ms, buzz 300ms, pause 100ms, buzz 400ms
    vibrate: [300, 100, 300, 100, 400],
    // Keep notification on lockscreen until user explicitly dismisses or opens it
    requireInteraction: true,
    // Ring/vibrate again even if notification with same tag already exists
    renotify: true,
    // NOT silent — ensure OS plays notification sound
    silent: false,
    // Store URL so we can open the right page when user taps notification
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    // Action buttons on the notification
    actions: [
      { action: 'open', title: '📱 Open AGRIFlow', icon: '/favicon.ico' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// ─── Message from Client Tab ─────────────────────────────────
// When app is open, it can ask the SW to show a lockscreen-compatible notification
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options = {} } = event.data;
    const notifOptions = {
      body: options.body || options.message || 'AGRIFlow update.',
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || `agriflow-msg-${Date.now()}`,
      vibrate: options.vibrate || [300, 100, 300],
      requireInteraction: options.requireInteraction !== false,
      renotify: true,
      silent: false,
      data: { url: options.url || '/', timestamp: Date.now() }
    };

    event.waitUntil(
      self.registration.showNotification(title || 'AGRIFlow Alert', notifOptions)
    );
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Notification Click ──────────────────────────────────────
// Fires when user taps notification in lockscreen / notification drawer
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If AGRIFlow is already open, focus it and navigate
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client && targetUrl !== '/') client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Notification Close ──────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed by user:', event.notification.tag);
});

// ─── Push Subscription Change ────────────────────────────────
// Fires when browser invalidates subscription (e.g. user cleared cache)
// We re-subscribe automatically and save the new subscription to server
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed — re-subscribing...');

  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription && event.oldSubscription.options.applicationServerKey
    }).then((newSub) => {
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: newSub.toJSON(),
          userId: 'anonymous',
          role: 'FARMER'
        })
      });
    }).catch((err) => {
      console.error('[SW] Re-subscription failed:', err);
    })
  );
});
