// AGRIFlow Real Web Push Service (Google FCM / Apple APNs via VAPID)
// Works when phone screen is OFF, site is CLOSED - just like Instagram
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';

// This module reads VAPID settings during initialization. Load .env here because
// ESM imports execute before server.js can call dotenv.config().
dotenv.config({ path: fileURLToPath(new URL('../.env',
        import.meta.url)) });

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

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || '67abcb09-7a13-4c19-85d3-223a44d887c0';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export function getOneSignalAppId() {
    return ONESIGNAL_APP_ID;
}

export async function sendOneSignalPush(title, message, options = {}) {
    const appId = process.env.ONESIGNAL_APP_ID || ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY || ONESIGNAL_REST_API_KEY;

    if (!appId) {
        console.warn('⚠️ [OneSignal Push] Aborted: ONESIGNAL_APP_ID not configured.');
        return { success: false, reason: 'ONESIGNAL_APP_ID not configured' };
    }

    const targetFarmerId = options.farmerId || options.targetFarmerId || options.userId;

    try {
        const payload = {
            app_id: appId,
            headings: { en: title || 'AGRIFlow Alert' },
            contents: { en: message || 'Operational Update' },
            url: options.url || '/',
            data: {
                farmerId: targetFarmerId ? String(targetFarmerId) : 'ALL',
                notificationId: options.notificationId || options.id || null,
                type: options.type || 'NOTIFICATION',
                ...(options.data || {})
            }
        };

        // Target ONLY the specific farmer associated with the event
        if (targetFarmerId && targetFarmerId !== 'ALL') {
            const strFarmerId = String(targetFarmerId);
            // OneSignal v5 aliases + legacy external user IDs
            payload.include_aliases = { external_id: [strFarmerId] };
            payload.include_external_user_ids = [strFarmerId];
            payload.target_channel = 'push';
        } else {
            payload.included_segments = ['Subscribed Users', 'Total Subscriptions'];
        }

        if (!apiKey) {
            console.log(`ℹ️ [OneSignal Push] Notification recorded in MongoDB. OneSignal push skipped: ONESIGNAL_REST_API_KEY is not set in .env (Add it to deliver native mobile push to farmer ${targetFarmerId || 'ALL'}).`);
            return { success: false, reason: 'ONESIGNAL_REST_API_KEY missing' };
        }

        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Basic ${apiKey}`
        };

        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.errors) {
            console.warn(`⚠️ [OneSignal Push] Delivery warning for farmer [${targetFarmerId || 'ALL'}]:`, result.errors);
        } else {
            console.log(`⚡ [OneSignal Push] Successfully delivered push to farmer [${targetFarmerId || 'ALL'}]. ID: ${result.id}`);
        }
        return result;
    } catch (err) {
        console.warn(`⚠️ [OneSignal Push] Network or API error for farmer [${targetFarmerId || 'ALL'}]:`, err.message);
        return { success: false, error: err.message };
    }
}

// Target a specific farmer by their farmerId / externalId
export async function sendOneSignalPushToFarmer(farmerId, title, message, options = {}) {
    return sendOneSignalPush(title, message, {...options, farmerId });
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

    const saved = await PushSubscription.findOneAndUpdate({ endpoint: subscriptionData.endpoint }, {
        endpoint: subscriptionData.endpoint,
        expirationTime: subscriptionData.expirationTime || null,
        keys: {
            p256dh: subscriptionData.keys.p256dh,
            auth: subscriptionData.keys.auth
        },
        userId: userId || 'anonymous',
        role: role || 'FARMER',
        updatedAt: new Date()
    }, { upsert: true, new: true });

    console.log(`✅ [Web Push] Device registered for real push: userId=${userId}, role=${role}`);
    return saved;
}

// Remove a subscription (called when user unsubscribes or 410/404 from FCM)
export async function removePushSubscription(endpoint) {
    await PushSubscription.deleteOne({ endpoint });
}

// Send a push notification to ONE subscription object
async function sendToOne(sub, payload) {
    return webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys },
        payload, { urgency: 'high', TTL: 86400 } // 24-hour TTL so offline phones get it when they reconnect
    );
}

// Broadcast real push to ALL subscribed devices (works with phone locked / site closed!)
export async function broadcastPushNotification(title, message, options = {}) {
    // Dispatch via OneSignal for mobile lock screens and native push
    sendOneSignalPush(title, message, options).catch(() => {});

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
        subscriptions.map(async(sub) => {
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
    if (!vapidReady) {
        console.warn('[Web Push] Targeted push skipped — VAPID is not configured.');
        return { sent: 0, failed: 0, error: 'VAPID not configured' };
    }

    const subscriptions = await PushSubscription.find({
        userId: String(userId)
    });
    if (!subscriptions.length) return { sent: 0, failed: 0 };

    const payload = JSON.stringify({
        title,
        body: message,
        icon: options.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || `agriflow-user-${Date.now()}`,
        vibrate: [300, 100, 300],
        requireInteraction: true,
        renotify: true,
        url: options.url || options.link || '/',
        timestamp: Date.now()
    });

    let sent = 0,
        failed = 0;
    await Promise.allSettled(
        subscriptions.map(async(sub) => {
            try {
                await sendToOne(sub, payload);
                sent++;
            } catch (err) {
                failed++;
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
                }
            }
        })
    );

    return { sent, failed };
}