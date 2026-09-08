// AGRIFlow Service Worker for Background & Lockscreen Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Helper to show lockscreen-compatible notification
function displayLockscreenNotification(title, data) {
  const options = {
    body: data.body || data.message || 'Operational update received.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `agriflow-alert-${Date.now()}`,
    // Strong vibration pattern ensures phone screen wakes up and buzzes on lockscreen
    vibrate: [300, 100, 300, 100, 400],
    // requireInteraction keeps notification persistent on mobile lockscreen until user opens/swipes
    requireInteraction: true,
    // renotify alerts with sound/vibration even if tag is replaced
    renotify: true,
    silent: false,
    data: {
      url: data.url || (data.data && data.data.url) || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: '👁️ Open AGRIFlow' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  return self.registration.showNotification(title || 'AGRIFlow Live Alert', options);
}

// 1. Web Push event from push server
self.addEventListener('push', (event) => {
  let data = { title: 'AGRIFlow Alert', body: 'New operational procurement update received.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(displayLockscreenNotification(data.title, data));
});

// 2. Message event from client app (handles live socket events even when phone is locked/screen dimmed)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(displayLockscreenNotification(title, options || {}));
  }
});

// 3. Notification click from mobile lockscreen or system tray
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
