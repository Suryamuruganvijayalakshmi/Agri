// AGRIFlow Real Web Push Service (Google FCM / Apple APNs via VAPID)
// Works when phone screen is OFF, site is CLOSED - just like Instagram
import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';

let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@agriflow.gov.in';

let vapidReady = false;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  try {
    const generated = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = generated.publicKey;
    VAPID_PRIVATE_KEY = generated.privateKey;
    console.log('⚡ [Web Push] Auto-generated VAPID keypair. Background push ready (like Instagram).');
  } catch (genErr) {
    console.warn('⚠️ [Web Push] Failed to auto-generate VAPID keys:', genErr.message);
  }
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidReady = true;
    console.log('✅ [Web Push] VAPID initialized. Background push notifications ready (like Instagram).');
  } catch (err) {
    console.error('❌ [Web Push] VAPID initialization FAILED:', err.message);
  }
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY || null;
}

export function isVapidReady() {
  return vapidReady;
}

// Store or update a client push subscription in the database
export async function savePushSubscription(subscriptionData, userId = 'anonymous', role = 'FARMER') {
  if (!subscriptionData || !subscriptionData.endpoint) {
    throw new Error('Invalid subscription: endpoint is required');
  }
  if (!subscriptionData.keys || !subscriptionData.keys.p256dh || !subscriptionData.keys.auth) {
    throw new Error('Invalid subscription: keys.p256dh and keys.auth are required');
  }

  const saved = await PushSubscription.findOneAndUpdate(
    { endpoint: subscriptionData.endpoint },
    {
      endpoint: subscriptionData.endpoint,
      expirationTime: subscriptionData.expirationTime || null,
      keys: {
        p256dh: subscriptionData.keys.p256dh,
        auth: subscriptionData.keys.auth
      },
      userId: userId || 'anonymous',
      role: role || 'FARMER',
      updatedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log(`✅ [Web Push] Device registered for real push: userId=${userId}, role=${role}`);
  return saved;
}

// Remove a subscription (called when user unsubscribes or 410/404 from FCM)
export async function removePushSubscription(endpoint) {
  await PushSubscription.deleteOne({ endpoint });
}

// Send a push notification to ONE subscription object
async function sendToOne(sub, payload) {
  return webpush.sendNotification(
    { endpoint: sub.endpoint, keys: sub.keys },
    payload,
    { urgency: 'high', TTL: 86400 } // 24-hour TTL so offline phones get it when they reconnect
  );
}

// Broadcast real push to ALL subscribed devices (works with phone locked / site closed!)
export async function broadcastPushNotification(title, message, options = {}) {
  if (!vapidReady) {
    console.warn('[Web Push] Broadcast skipped — VAPID not configured. Add keys to .env');
    return { sent: 0, failed: 0, error: 'VAPID not configured' };
  }

  let subscriptions = [];
  try {
    subscriptions = await PushSubscription.find({});
  } catch (dbErr) {
    console.error('[Web Push] DB error fetching subscriptions:', dbErr.message);
    return { sent: 0, failed: 0, error: dbErr.message };
  }

  if (subscriptions.length === 0) {
    console.log('[Web Push] No registered devices. User must open site and allow notifications first.');
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title: title || 'AGRIFlow Live Alert',
    body: message || 'You have a new operational update.',
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    tag: options.tag || `agriflow-${Date.now()}`,
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: true,
    renotify: true,
    url: options.url || '/',
    timestamp: Date.now()
  });

  console.log(`[Web Push] Sending to ${subscriptions.length} device(s): "${title}"`);

  let sent = 0;
  let failed = 0;
  const toDelete = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await sendToOne(sub, payload);
        sent++;
      } catch (err) {
        failed++;
        const code = err.statusCode || err.status;
        if (code === 410 || code === 404) {
          // Subscription is no longer valid (user uninstalled, revoked permission, etc.)
          toDelete.push(sub._id);
          console.log(`[Web Push] Subscription expired (${code}), removing: ${sub.endpoint.slice(0, 60)}...`);
        } else {
          console.warn(`[Web Push] Push failed (${code}): ${err.message}`);
        }
      }
    })
  );

  // Cleanup expired subscriptions
  if (toDelete.length > 0) {
    await PushSubscription.deleteMany({ _id: { $in: toDelete } }).catch(() => {});
  }

  console.log(`[Web Push] Done: ${sent} delivered, ${failed} failed, ${toDelete.length} expired cleaned up.`);
  return { sent, failed, total: subscriptions.length };
}

// Send push notification to a specific userId (e.g. notify one farmer their token was called)
export async function sendPushToUser(userId, title, message, options = {}) {
  if (!vapidReady) return { sent: 0, failed: 0, error: 'VAPID not configured' };

  const subscriptions = await PushSubscription.find({ userId });
  if (!subscriptions.length) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title,
    body: message,
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    tag: options.tag || `agriflow-user-${Date.now()}`,
    vibrate: [300, 100, 300],
    requireInteraction: true,
    renotify: true,
    url: options.url || '/',
    timestamp: Date.now()
  });

  let sent = 0, failed = 0;
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try { await sendToOne(sub, payload); sent++; }
      catch (err) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    })
  );

  return { sent, failed };
}
