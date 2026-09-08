// ============================================================
// SMS NOTIFICATION SERVICE — Provider-Agnostic Architecture
// ============================================================
// Supports: Twilio, MSG91, AWS SNS, or Simulation mode
// Configure via environment variables. Falls back to simulation safely.

const SMS_PROVIDER = process.env.SMS_PROVIDER || 'simulation';
const SMS_API_KEY = process.env.SMS_API_KEY || '';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'AGRFLW';

// Track simulated SMS for demo visibility
const simulatedSMSLog = [];

/**
 * Send an SMS message to a phone number.
 * Returns { success, provider, simulated, message }
 */
export const sendSMS = async (phoneNumber, message) => {
  if (!phoneNumber || !message) {
    return { success: false, error: 'Phone number and message are required.' };
  }

  const provider = SMS_PROVIDER.toLowerCase();

  switch (provider) {
    case 'twilio':
      return await sendViaTwilio(phoneNumber, message);
    case 'msg91':
      return await sendViaMsg91(phoneNumber, message);
    case 'aws_sns':
      return await sendViaAWSSNS(phoneNumber, message);
    case 'simulation':
    default:
      return simulateSMS(phoneNumber, message);
  }
};

// ── SIMULATION MODE (Default for MVP/Demo) ──────────────────
function simulateSMS(phoneNumber, message) {
  const entry = {
    to: phoneNumber,
    message,
    timestamp: new Date().toISOString(),
    provider: 'SIMULATION',
    simulated: true
  };
  simulatedSMSLog.push(entry);

  // Keep last 100 entries
  if (simulatedSMSLog.length > 100) simulatedSMSLog.shift();

  console.log(`📱 [SMS SIMULATION] To: ${phoneNumber}`);
  console.log(`   Message: ${message}`);
  console.log(`   ⚠️  This is a SIMULATED SMS. No real message was sent.`);

  return {
    success: true,
    provider: 'SIMULATION',
    simulated: true,
    message: 'SMS simulated (no real message sent). Configure SMS_PROVIDER env var for production.'
  };
}

// ── TWILIO PROVIDER ─────────────────────────────────────────
async function sendViaTwilio(phoneNumber, message) {
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_KEY_SID = process.env.TWILIO_API_KEY_SID;
  const TWILIO_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  const authUser = TWILIO_KEY_SID || TWILIO_SID;
  const authPass = TWILIO_KEY_SECRET || TWILIO_TOKEN;

  if (!TWILIO_SID || !authPass || !TWILIO_FROM) {
    console.warn(`[SMS] Twilio credentials incomplete (SID: ${TWILIO_SID ? 'set' : 'missing'}, Auth: ${authPass ? 'set' : 'missing'}, From: ${TWILIO_FROM ? 'set' : 'missing'}). Falling back to simulation.`);
    return simulateSMS(phoneNumber, message);
  }

  // Format recipient to E.164 standard (Twilio requirement)
  let cleanPhone = String(phoneNumber).replace(/[\s\-\(\)]/g, '');
  if (!cleanPhone.startsWith('+')) {
    if (cleanPhone.length === 10) {
      cleanPhone = `+91${cleanPhone}`;
    } else {
      cleanPhone = `+${cleanPhone}`;
    }
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const auth = Buffer.from(`${authUser}:${authPass}`).toString('base64');
    const body = new URLSearchParams({ To: cleanPhone, From: TWILIO_FROM, Body: message });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`📱 [Twilio SMS Sent] To: ${cleanPhone} | SID: ${data.sid}`);
      return { success: true, provider: 'twilio', simulated: false, sid: data.sid };
    }
    console.warn(`[SMS Twilio Warning] Status ${res.status} (${data.code}): ${data.message}`);
    // If trial account template restriction or delivery issue, ensure simulation log catches it so app workflow never blocks
    simulateSMS(cleanPhone, message);
    return { success: false, provider: 'twilio', error: data.message, fallback: 'simulated' };
  } catch (err) {
    console.error('[SMS Twilio Exception]', err.message);
    simulateSMS(cleanPhone, message);
    return { success: false, provider: 'twilio', error: err.message, fallback: 'simulated' };
  }
}

// ── MSG91 PROVIDER ──────────────────────────────────────────
async function sendViaMsg91(phoneNumber, message) {
  if (!SMS_API_KEY) {
    console.warn('[SMS] MSG91 API key missing. Falling back to simulation.');
    return simulateSMS(phoneNumber, message);
  }

  try {
    const res = await fetch('https://api.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'authkey': SMS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: SMS_SENDER_ID,
        route: '4',
        country: '91',
        sms: [{ message, to: [phoneNumber.replace('+91', '').replace(/\s/g, '')] }]
      })
    });

    const data = await res.json();
    return { success: true, provider: 'msg91', simulated: false, response: data };
  } catch (err) {
    console.error('[SMS MSG91 Exception]', err.message);
    return { success: false, provider: 'msg91', error: err.message };
  }
}

// ── AWS SNS PROVIDER ────────────────────────────────────────
async function sendViaAWSSNS(phoneNumber, message) {
  // AWS SNS requires aws-sdk. If not available, simulate.
  console.warn('[SMS] AWS SNS provider selected but aws-sdk not bundled. Falling back to simulation.');
  return simulateSMS(phoneNumber, message);
}

/**
 * Get the log of simulated SMS messages (for demo/debug UI).
 */
export const getSimulatedSMSLog = () => [...simulatedSMSLog];

/**
 * Get current SMS provider info.
 */
export const getSMSProviderInfo = () => ({
  provider: SMS_PROVIDER,
  isSimulation: SMS_PROVIDER.toLowerCase() === 'simulation' || !SMS_API_KEY,
  senderID: SMS_SENDER_ID
});
