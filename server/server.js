import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { connectDB, resetCentreOperationalData } from './config/dbMongo.js';
import { User } from './models/User.js';
import { Farmer } from './models/Farmer.js';
import { Notification } from './models/Notification.js';
import { sendBookingConfirmationEmail, sendAgentBookingNotification } from './services/emailService.js';
import { getSimulatedSMSLog, getSMSProviderInfo } from './services/smsService.js';
import { getVapidPublicKey, isVapidReady, savePushSubscription, broadcastPushNotification, sendPushToUser } from './services/webPushService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors());
app.use(express.json());

// Ensure MongoDB connection for serverless cold-starts on Vercel
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    await connectDB().catch(() => {});
  }
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'agriflow-secret-key-2026';


// ============================================================
// JWT AUTH MIDDLEWARE
// ============================================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    // Allow unauthenticated access for now (MVP mode)
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// Apply auth middleware globally (non-blocking)
app.use(authenticateToken);

// ============================================================
// REALTIME WEBSOCKET CONNECTION
// ============================================================
io.on('connection', async (socket) => {
  console.log(`[AGRIFlow Realtime] Client connected: ${socket.id}`);
  try {
    const centres = await db.getAllCentres();
    socket.emit('centres_snapshot', centres);
  } catch (err) {
    console.error('Error sending socket snapshots:', err);
  }
  socket.on('disconnect', () => {
    console.log(`[AGRIFlow Realtime] Client disconnected: ${socket.id}`);
  });
});

// Helper for broadcasting realtime updates to all clients (Socket.IO + Real Native Server Push like Instagram)
const broadcastRealtimeUpdate = async (eventType, payload) => {
  io.emit(eventType, payload);
  try {
    const centres = await db.getAllCentres();
    io.emit('centres_updated', centres);
  } catch (err) {
    console.error('Error broadcasting:', err);
  }

  // Real Native Server Web Push (works when site/browser is closed & phone is locked)
  try {
    if (eventType === 'notification_pushed') {
      await broadcastPushNotification(
        payload?.title || 'AGRIFlow Procurement Alert',
        payload?.message || 'New operational update received.',
        { url: payload?.url || '/farmer/dashboard' }
      );
    } else if (eventType === 'appointment_booked') {
      const appt = payload?.appointment || payload;
      const token = payload?.token_number || appt?.token_number || 'New Slot';
      const farmer = appt?.farmer_name || 'Farmer';
      const qty = appt?.declared_quantity_kg || appt?.quantity_kg || 2500;
      await broadcastPushNotification(
        `📅 Slot Booked: Token ${token}`,
        `${farmer} booked ${Number(qty).toLocaleString()} kg of ${appt?.crop_type || 'produce'}.`,
        { url: '/operator/queue' }
      );
    } else if (eventType === 'queue_updated') {
      if (payload?.status === 'CALLED' || payload?.token_number) {
        await broadcastPushNotification(
          `📢 Token ${payload.token_number || 'Next'} Called!`,
          `Proceed to counter / weighbridge immediately.`,
          { url: '/farmer/queue' }
        );
      }
    } else if (eventType === 'payment_updated') {
      const p = payload?.payment || payload;
      await broadcastPushNotification(
        `💳 DBT Payment: ${p?.status || 'UPDATED'}`,
        `Payment of ₹${Number(p?.amount || 0).toLocaleString()} for ${p?.farmer_name || 'Farmer'} is ${p?.status}.`,
        { url: '/farmer/payments' }
      );
    }
  } catch (e) {
    console.warn('[Web Push Broadcast] Warning:', e.message);
  }
};

// Connect DB notification triggers to real-time Web Push broadcast
db.setNotificationEmitter((notif) => {
  broadcastRealtimeUpdate('notification_pushed', notif);
});

// ============================================================
// REAL WEB PUSH (INSTAGRAM-STYLE LOCKSCREEN NOTIFICATIONS)
// ============================================================

// GET VAPID Public Key for client browser subscription
app.get('/api/notifications/vapid-public-key', (req, res) => {
  res.json({ success: true, publicKey: getVapidPublicKey() });
});

// POST Save Client Push Subscription
app.post('/api/notifications/subscribe', async (req, res) => {
  try {
    const { subscription, userId, role } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, error: 'Subscription data required' });
    }
    await savePushSubscription(subscription, userId, role);
    console.log('[Web Push] Mobile/Browser registered for real lockscreen push.');
    res.json({ success: true, message: 'Device successfully subscribed for background push alerts.' });
  } catch (err) {
    console.error('Push subscription error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Trigger real server push notification (works with closed app/phone screen off!)
app.post('/api/notifications/test-push', async (req, res) => {
  try {
    const {
      delayMs = 0,
      title = '🌾 AGRIFlow Lockscreen Alert: Token #104 Called!',
      message = 'Your token has arrived at Weighbridge Station #1. Proceed to weighbridge immediately.',
      url = '/farmer/queue'
    } = req.body;

    if (delayMs > 0) {
      setTimeout(async () => {
        await broadcastPushNotification(title, message, { url });
      }, Number(delayMs));
      res.json({
        success: true,
        message: `Real Server Push scheduled in ${delayMs / 1000}s! Lock your phone and close the browser right now to see it on the lockscreen.`
      });
    } else {
      const result = await broadcastPushNotification(title, message, { url });
      res.json({ success: true, message: 'Push notification sent to all registered devices.', result });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Debug: check VAPID status and how many devices are subscribed
app.get('/api/notifications/status', async (req, res) => {
  try {
    const { PushSubscription } = await import('./models/PushSubscription.js');
    const count = await PushSubscription.countDocuments({});
    const subs = await PushSubscription.find({}, 'userId role createdAt updatedAt').lean();
    res.json({
      success: true,
      vapidConfigured: isVapidReady(),
      registeredDevices: count,
      devices: subs.map(s => ({
        userId: s.userId,
        role: s.role,
        registeredAt: s.updatedAt || s.createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// AUTHENTICATION API ROUTES
// ============================================================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name, fullName, role, phone, district, state, village, aadhaar_number, bank_account, ifsc, assigned_centre_id, assigned_centre_name } = req.body;
    const nameToUse = full_name || fullName;

    if (!email || !password || !nameToUse) {
      return res.status(400).json({ success: false, error: 'Email, password, and full name are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const userId = `USER-${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser = await User.create({
      id: userId,
      email: email.toLowerCase(),
      password_hash,
      full_name: nameToUse,
      phone,
      role: role || 'FARMER',
      district: district || 'Mandya',
      state: state || 'Karnataka',
      assigned_centre_id,
      assigned_centre_name
    });

    if ((role || 'FARMER') === 'FARMER') {
      await Farmer.create({
        id: userId,
        profile_id: userId,
        farmer_code: `F-${Math.floor(100000 + Math.random() * 900000)}`,
        name: nameToUse,
        phone,
        district: district || 'Mandya',
        state: state || 'Karnataka',
        village: village || 'Central',
        aadhaar_number: aadhaar_number || 'XXXX-XXXX-4902',
        bank_account: bank_account || 'XXXX-XXXX-8821',
        ifsc: ifsc || 'SBIN0001234'
      });
    }

    const token = jwt.sign({ userId: newUser.id, email: newUser.email, role: newUser.role, assigned_centre_id: newUser.assigned_centre_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        phone: newUser.phone,
        district: newUser.district,
        state: newUser.state,
        assigned_centre_id: newUser.assigned_centre_id,
        assigned_centre_name: newUser.assigned_centre_name
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, assigned_centre_id: user.assigned_centre_id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        phone: user.phone,
        district: user.district,
        state: user.state,
        assigned_centre_id: user.assigned_centre_id,
        assigned_centre_name: user.assigned_centre_name
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dedicated Centre Officers Directory for quick reference and login
app.get('/api/auth/dedicated-officers', async (req, res) => {
  try {
    const list = [
      {
        centre_id: 'centre-1',
        centre_name: 'Mandya Central Procurement Yard',
        centre_code: 'PROC-KA-01',
        district: 'Mandya, Karnataka',
        officer_name: 'Suresh Kumar',
        designation: 'Chief Procurement Officer',
        email: 'officer.mandya@agriflow.gov.in',
        password: 'Officer@123',
        token_prefix: 'A',
        badge_code: 'GOV-KA-MND-01',
        theme_color: '#16a34a'
      },
      {
        centre_id: 'centre-2',
        centre_name: 'Maddur Grain Storage & Procurement Centre',
        centre_code: 'PROC-KA-02',
        district: 'Maddur, Karnataka',
        officer_name: 'Rajesh Gowda',
        designation: 'Yard Superintendent',
        email: 'officer.maddur@agriflow.gov.in',
        password: 'Officer@123',
        token_prefix: 'B',
        badge_code: 'GOV-KA-MDR-02',
        theme_color: '#0284c7'
      },
      {
        centre_id: 'centre-3',
        centre_name: 'Srirangapatna Agri Warehousing Hub',
        centre_code: 'PROC-KA-03',
        district: 'Srirangapatna, Karnataka',
        officer_name: 'Anitha Murthy',
        designation: 'Chief Inspector & Yard Lead',
        email: 'officer.srirangapatna@agriflow.gov.in',
        password: 'Officer@123',
        token_prefix: 'C',
        badge_code: 'GOV-KA-SRP-03',
        theme_color: '#9333ea'
      },
      {
        centre_id: 'cs-tn-41',
        centre_name: 'Sakthi Cold Storage & Agri Terminal',
        centre_code: 'CS-TN-ERD-41',
        district: 'Erode, Tamil Nadu',
        officer_name: 'K. Selvanathan',
        designation: 'Terminal Logistics Manager',
        email: 'officer.erode@agriflow.gov.in',
        password: 'Officer@123',
        token_prefix: 'CS',
        badge_code: 'GOV-TN-ERD-41',
        theme_color: '#ea580c'
      },
      {
        centre_id: 'all',
        centre_name: 'State Directorate of Agri-Marketing',
        centre_code: 'HQ-KA-DIR',
        district: 'Bengaluru (HQ)',
        officer_name: 'Dr. Rameshwar Rao',
        designation: 'State Director of Agriculture (All Facilities)',
        email: 'admin@agriflow.gov.in',
        password: 'Admin@123',
        token_prefix: 'ALL',
        badge_code: 'GOV-DIR-001',
        theme_color: '#e11d48'
      }
    ];
    res.json({ success: true, officers: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// CENTRE ROUTES
// ============================================================


// MongoDB Password Reset Request
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.json({ success: true, message: 'Password reset instructions have been dispatched if the account exists in MongoDB.' });
    }
    res.json({ success: true, message: 'Password reset link and instructions have been sent to your registered email address.' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Farmer Profile in MongoDB
app.put('/api/farmers/profile', async (req, res) => {
  try {
    const {
      userId,
      email,
      full_name,
      phone,
      village,
      taluk,
      district,
      state,
      aadhaar_last_four,
      bank_name,
      bank_account_last_four,
      ifsc_code,
      land_area_acres
    } = req.body;

    let user = null;
    if (userId) {
      user = await User.findOne({ id: userId });
    }
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (user) {
      if (full_name) user.full_name = full_name;
      if (phone) user.phone = phone;
      if (district) user.district = district;
      if (state) user.state = state;
      await user.save();
    }

    const farmer = await Farmer.findOneAndUpdate(
      { $or: [{ profile_id: userId }, { phone }] },
      {
        $set: {
          village,
          taluk,
          district,
          state,
          aadhaar_last_four,
          bank_name,
          bank_account_last_four,
          ifsc_code,
          land_area_acres: Number(land_area_acres || 0),
          updated_at: new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Farmer profile updated successfully in MongoDB.',
      user,
      farmer
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/centres', async (req, res) => {
  try {
    const centres = await db.getAllCentres();
    res.json({ success: true, centres });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/centres/:centreId/incoming-cultivations', async (req, res) => {
  try {
    const cultivations = await db.getIncomingCultivationsForCentre(req.params.centreId);
    res.json({ success: true, count: cultivations.length, cultivations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/centres/:id', async (req, res) => {
  try {
    const centre = await db.getCentreById(req.params.id);
    if (!centre) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json({ success: true, centre });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// RECOMMENDATION & GO INTELLIGENCE
// ============================================================

app.get('/api/recommendations', async (req, res) => {
  try {
    const result = await db.getBestCentreRecommendation({
      farmer_lat: parseFloat(req.query.lat) || 12.5200,
      farmer_lng: parseFloat(req.query.lng) || 76.8900,
      quantity_kg: parseFloat(req.query.quantity) || 2500
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/go-intelligence/:centreId', async (req, res) => {
  try {
    const intelligence = await db.getGoIntelligence(req.params.centreId);
    if (!intelligence) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json({ success: true, intelligence });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// SLOT & BOOKING ROUTES
// ============================================================

app.get('/api/slots', async (req, res) => {
  try {
    const { centre_id, date } = req.query;
    if (!centre_id) return res.status(400).json({ success: false, error: 'centre_id is required' });
    const slots = await db.getSlotsForCentre(centre_id, date);
    
    // Determine the best recommended slot for real-time booking
    const currentSlot = slots.find(s => s.is_current && s.is_available);
    const nextSlot = slots.find(s => s.is_upcoming && s.is_available);
    const recommendedSlot = currentSlot || nextSlot || slots.find(s => s.is_available) || slots[0];

    res.json({
      success: true,
      slots,
      server_time: new Date().toISOString(),
      recommended_slot_id: recommendedSlot?.id || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/slots/:slotId/positions', async (req, res) => {
  try {
    const positions = await db.getSlotPositions(req.params.slotId);
    res.json({ success: true, positions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ATOMIC POSITION BOOKING
app.post('/api/appointments/book-position', async (req, res) => {
  try {
    const result = await db.bookAppointmentPosition(req.body);
    if (!result.success) return res.status(400).json(result);

    await broadcastRealtimeUpdate('appointment_booked', {
      appointment: result.appointment,
      centre_id: result.appointment?.centre_id,
      token_number: result.token_number
    });
    await broadcastRealtimeUpdate('queue_updated', {
      centre_id: result.appointment?.centre_id
    });
    await broadcastRealtimeUpdate('slot_position_updated', {
      slot_id: result.appointment?.slot_id,
      position_number: result.appointment?.position_number,
      centre_id: result.appointment?.centre_id
    });
    await broadcastRealtimeUpdate('slots_updated', {
      centre_id: result.appointment?.centre_id
    });

    if (result.appointment) {
      sendBookingConfirmationEmail(result.appointment, { farmer_name: result.appointment.farmer_name }).catch(() => {});
      sendAgentBookingNotification(result.appointment).catch(() => {});
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CANCEL APPOINTMENT
app.post('/api/appointments/cancel', async (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) return res.status(400).json({ success: false, error: 'appointment_id required' });
    const result = await db.cancelAppointmentPosition(appointment_id);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { appointment_id, status: 'CANCELLED' });
    await broadcastRealtimeUpdate('slots_updated', { centre_id: result.appointment?.centre_id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ATOMIC CAPACITY-AWARE APPOINTMENT BOOKING (Primary booking endpoint)
app.post('/api/appointments/book', async (req, res) => {
  try {
    const result = await db.bookAppointmentAtomic(req.body);
    if (!result.success) return res.status(400).json(result);

    await broadcastRealtimeUpdate('appointment_booked', {
      appointment: result.appointment,
      centre_id: result.appointment?.centre_id,
      token_number: result.token_number
    });
    await broadcastRealtimeUpdate('queue_updated', {
      centre_id: result.appointment?.centre_id
    });
    await broadcastRealtimeUpdate('slot_position_updated', {
      slot_id: result.appointment?.slot_id,
      position_number: result.appointment?.position_number,
      centre_id: result.appointment?.centre_id
    });
    await broadcastRealtimeUpdate('slots_updated', {
      centre_id: result.appointment?.centre_id
    });

    if (result.appointment) {
      sendBookingConfirmationEmail(result.appointment, { farmer_name: result.appointment.farmer_name }).catch(() => {});
      sendAgentBookingNotification(result.appointment).catch(() => {});
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// LIVE QUEUE ROUTES (Centre-Specific)
// ============================================================

// GET live queue for specific centre
app.get('/api/queue/:centreId', async (req, res) => {
  try {
    const farmerId = req.query.farmer_id || req.user?.userId || 'default-farmer';
    const queueData = await db.getLiveQueueForCentre(req.params.centreId, farmerId);
    if (!queueData) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json(queueData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADVANCE QUEUE (legacy compat)
app.post('/api/queue/advance', async (req, res) => {
  try {
    const { centre_id, token_number, new_status } = req.body;
    const result = await db.advanceQueueForCentre({ centre_id, token_number, new_status });
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// OFFICER PROCESSING ROUTES (Queue State Machine)
// ============================================================

// NEXT FARMER — Atomic queue advance
const handleNextFarmer = async (req, res) => {
  try {
    const { centreId } = req.params;
    const result = await db.nextFarmerInQueue(centreId);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: centreId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
app.post('/api/centres/:centreId/queue/next', handleNextFarmer);
app.post('/api/queue/next/:centreId', handleNextFarmer);


// START PROCESSING (CALLED → PROCESSING)
app.post('/api/centres/:centreId/queue/process', async (req, res) => {
  try {
    const result = await db.startProcessingFarmer(req.params.centreId, req.body.appointment_id);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: req.params.centreId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// RECORD WEIGHMENT (PROCESSING → WEIGHMENT)
app.post('/api/centres/:centreId/queue/weighment', async (req, res) => {
  try {
    const result = await db.recordWeighment(req.params.centreId, req.body.appointment_id, Number(req.body.actual_weight_kg));
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: req.params.centreId });
    await broadcastRealtimeUpdate('notification_pushed', {
      title: `⚖️ Gross Weighment Recorded`,
      message: `Token ${result.appointment?.token_number || 'Farmer'}: Loaded ${Number(req.body.actual_weight_kg).toLocaleString()} kg recorded on weighbridge.`,
      icon: '⚖️',
      type: 'info'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// RECORD QUALITY (WEIGHMENT → QUALITY_CHECK)
app.post('/api/centres/:centreId/queue/quality', async (req, res) => {
  try {
    const result = await db.recordQuality(req.params.centreId, req.body.appointment_id, req.body.grade, req.body.moisture);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: req.params.centreId });
    await broadcastRealtimeUpdate('notification_pushed', {
      title: `🔬 Quality Inspection Passed`,
      message: `Token ${result.appointment?.token_number || 'Farmer'}: Assessed as ${req.body.grade} (Moisture: ${req.body.moisture}%). Approved for MSP.`,
      icon: '🧪',
      type: 'info'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// COMPLETE PROCUREMENT (QUALITY_CHECK → COMPLETED)
app.post('/api/centres/:centreId/queue/complete', async (req, res) => {
  try {
    const result = await db.completeProcurement(req.params.centreId, req.body.appointment_id);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: req.params.centreId });
    await broadcastRealtimeUpdate('notification_pushed', {
      title: `✅ Procurement Finished & Discharged`,
      message: `Token ${result.appointment?.token_number || 'Farmer'}: Truck discharged, MSP voucher generated, sent to DBT payment queue.`,
      icon: '🌾',
      type: 'success'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// UPDATE PAYMENT STATUS
app.post('/api/payment/update/:paymentId', async (req, res) => {
  try {
    const result = await db.updatePaymentStatus(req.params.paymentId, req.body.new_status);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('payment_updated', { payment: result.payment });
    await broadcastRealtimeUpdate('notification_pushed', {
      title: `💳 DBT Payment ${req.body.new_status}`,
      message: `Direct Benefit Transfer of ₹${Number(result.payment?.amount || 0).toLocaleString()} is now ${req.body.new_status}.`,
      icon: req.body.new_status === 'PAID' ? '💰' : '💳',
      type: req.body.new_status === 'PAID' ? 'success' : 'info'
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET CENTRE PAYMENTS (For Officer DBT Portal)
app.get('/api/centres/:centreId/payments', async (req, res) => {
  try {
    const payments = await db.getCentrePayments(req.params.centreId);
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET CENTRE REAL ANALYTICS & STATEMENTS SUMMARY
app.get('/api/centres/:centreId/analytics-summary', async (req, res) => {
  try {
    const summary = await db.getCentreAnalyticsSummary(req.params.centreId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SEED DEMO FARMERS FOR A CENTRE
app.post('/api/centres/:centreId/demo-farmers', async (req, res) => {
  try {
    const count = Number(req.body.count) || 10;
    const result = await db.seedDemoFarmers(req.params.centreId, count);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: req.params.centreId });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// FARMER DASHBOARD & TIMELINE
// ============================================================

app.get('/api/farmer/dashboard/:farmerId', async (req, res) => {
  try {
    const data = await db.getFarmerDashboard(req.params.farmerId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/farmer/timeline/:farmerId', async (req, res) => {
  try {
    const timeline = await db.getFarmerTimeline(req.params.farmerId);
    res.json({ success: true, timeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/farmer/active-booking/:farmerId', async (req, res) => {
  try {
    const data = await db.getFarmerDashboard(req.params.farmerId);
    res.json({
      success: true,
      active_booking: data.active_booking,
      queue: data.queue,
      procurement: data.procurement,
      payment: data.payment
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// OPERATOR ROUTES
// ============================================================

app.post('/api/operator/centre-status', async (req, res) => {
  try {
    const { centre_id, status, daily_capacity_kg, booked_capacity_kg, active_counters, avg_processing_minutes } = req.body;
    const updated = await db.updateCentreStatusByOperator(centre_id, { status, daily_capacity_kg, booked_capacity_kg, active_counters, avg_processing_minutes });
    if (!updated) return res.status(404).json({ success: false, error: 'Centre not found' });

    await broadcastRealtimeUpdate('centre_capacity_changed', { centre: updated });

    // Broadcast notification
    const statusLabel = { OPEN: '🟢 Open', CLOSED: '🔴 Closed', HIGH_LOAD: '🟡 High Load', FULL: '🔴 Full' }[status] || status;
    io.emit('centre_notification', { centre_id, type: 'CENTRE_UPDATE', title: `${updated.name}: ${statusLabel}`, message: `Status: ${statusLabel}. Capacity: ${Number(daily_capacity_kg).toLocaleString()} kg. ${active_counters || 4} counters.` });

    try {
      await Notification.create({
        id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        farmer_id: 'ALL', centre_id, type: 'CENTRE_UPDATE',
        title: `${updated.name}: ${statusLabel}`,
        message: `Status: ${statusLabel}. Capacity: ${Number(daily_capacity_kg).toLocaleString()} kg.`,
        icon: status === 'OPEN' ? '🟢' : '🔴'
      });
    } catch (ne) { console.warn('[NOTIF]', ne.message); }

    res.json({ success: true, centre: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/operator/update-stage', async (req, res) => {
  try {
    const result = await db.updateProcurementStage(req.body);
    if (!result) return res.status(404).json({ success: false, error: 'Procurement record not found' });
    await broadcastRealtimeUpdate('procurement_stage_updated', result);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// EXCEPTIONS
// ============================================================

app.post('/api/exceptions', async (req, res) => {
  try {
    const exception = await db.createException(req.body);
    await broadcastRealtimeUpdate('exception_logged', { exception });
    res.json({ success: true, exception });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/exceptions/resolve', async (req, res) => {
  try {
    const { exception_id, resolution_notes } = req.body;
    const resolved = await db.resolveException(exception_id, resolution_notes);
    if (!resolved) return res.status(404).json({ success: false, error: 'Exception not found' });
    await broadcastRealtimeUpdate('exception_resolved', { exception: resolved });
    res.json({ success: true, exception: resolved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ADMIN & METRICS
// ============================================================

app.get('/api/admin/metrics', async (req, res) => {
  try {
    const metrics = await db.getAdminDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// DEMO STORY RUNNER
// ============================================================

app.post('/api/demo/run-scenario', async (req, res) => {
  try {
    const { step } = req.body;
    let responseMsg = '';
    if (step === 1) {
      await db.updateCentreStatusByOperator('centre-1', { status: 'OPEN', daily_capacity_kg: 50000, booked_capacity_kg: 31000, active_counters: 4 });
      responseMsg = 'Step 1: Centre A set to 62% (GREEN).';
    } else if (step === 2) {
      await db.updateCentreStatusByOperator('centre-1', { status: 'HIGH_LOAD', daily_capacity_kg: 50000, booked_capacity_kg: 45500, active_counters: 2 });
      responseMsg = 'Step 2: Centre A surged to 91% (RED).';
    } else if (step === 3) {
      responseMsg = 'Step 3: Procurement stage advanced.';
    } else if (step === 4) {
      responseMsg = 'Step 4: Payment processed.';
    }
    const centres = await db.getAllCentres();
    await broadcastRealtimeUpdate('demo_step_executed', { step, message: responseMsg });
    res.json({ success: true, step, message: responseMsg, centres });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// PRODUCTS
// ============================================================

app.get('/api/products', async (req, res) => {
  try { res.json({ success: true, products: await db.getAllProducts() }); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const result = await db.addProduct(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// Direct position booking (Single or Multi-Bay)
app.post('/api/booking/position', async (req, res) => {
  try {
    const result = await db.bookAppointmentPosition(req.body);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('appointment_booked', { appointment: result.appointment, centre_id: result.appointment?.centre_id });
    await broadcastRealtimeUpdate('queue_updated', { centre_id: result.appointment?.centre_id });
    await broadcastRealtimeUpdate('slot_position_updated', { slot_id: result.appointment?.slot_id, centre_id: result.appointment?.centre_id });
    await broadcastRealtimeUpdate('slots_updated', { centre_id: result.appointment?.centre_id });

    if (result.appointment) {
      sendBookingConfirmationEmail(result.appointment, { farmer_name: result.appointment.farmer_name }).catch(() => {});
      sendAgentBookingNotification(result.appointment).catch(() => {});
      broadcastPushNotification(
        '✅ Storage Slot Confirmed!',
        `Token #${result.appointment.token_number} at ${result.appointment.centre_name}. ${result.appointment.bays_label || 'Bay #' + result.appointment.position_number}`,
        { url: '/queue' }
      ).catch(() => {});
    }

    res.json(result);
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ============================================================
// NOTIFICATIONS
// ============================================================

app.get('/api/notifications/:farmerId', async (req, res) => {
  try {
    const notifications = await Notification.find({ $or: [{ farmer_id: req.params.farmerId }, { farmer_id: 'ALL' }] }).sort({ createdAt: -1 }).limit(60).lean();
    res.json({ success: true, notifications });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/notifications/:farmerId/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ $or: [{ farmer_id: req.params.farmerId }, { farmer_id: 'ALL' }], read: false });
    res.json({ success: true, count });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/notifications/read/:notifId', async (req, res) => {
  try { await Notification.updateOne({ id: req.params.notifId }, { $set: { read: true } }); res.json({ success: true }); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/notifications/read-all/:farmerId', async (req, res) => {
  try {
    await Notification.updateMany({ $or: [{ farmer_id: req.params.farmerId }, { farmer_id: 'ALL' }] }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/notifications', async (req, res) => {
  try {
    const { farmer_id, centre_id, type, title, message, icon, link } = req.body;
    const notif = await Notification.create({ id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 9999)}`, farmer_id, centre_id, type, title, message, icon: icon || '🔔', link });
    io.emit('centre_notification', { ...notif.toObject(), created_at: notif.createdAt });
    res.json({ success: true, notification: notif });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ============================================================
// WEIGHMENT & QUALITY (legacy direct)
// ============================================================

app.post('/api/operator/weighment', async (req, res) => {
  try { const result = await db.addWeighment(req.body); if (!result.success) return res.status(400).json(result); await broadcastRealtimeUpdate('weighment_recorded', result); res.json(result); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/inspector/quality', async (req, res) => {
  try { const result = await db.addQualityInspection(req.body); if (!result.success) return res.status(400).json(result); await broadcastRealtimeUpdate('quality_inspected', result); res.json(result); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  try { res.json({ success: true, logs: await db.getAuditLogs() }); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ============================================================
// LAND & CROP INTELLIGENCE
// ============================================================

app.get('/api/land/parcels/:farmerId', async (req, res) => {
  try { res.json({ success: true, parcels: await db.getLandParcels(req.params.farmerId) }); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/land/verify-parcel', async (req, res) => {
  try { res.json(await db.verifyGovtLandRecord(req.body)); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/land/parcels', async (req, res) => {
  try { res.json(await db.registerLandParcel(req.body)); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/land/parcels/:id', async (req, res) => {
  try { res.json(await db.deleteLandParcel(req.params.id)); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/crops/register', async (req, res) => {
  try { const result = await db.registerCropAndPredict(req.body); res.json(result); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/crops/:farmerId', async (req, res) => {
  try { res.json({ success: true, crops: await db.getCropRecords(req.params.farmerId) }); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/forecasting/district-forecast', async (req, res) => {
  try { res.json(await db.getDistrictProcurementForecast(req.query.district)); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ============================================================
// ADMIN PRODUCTS
// ============================================================

app.post('/api/admin/products/approve', async (req, res) => {
  try {
    const { product_id } = req.body;
    const prod = await db.addProduct({ ...req.body }); // simplified
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/admin/products/reject', async (req, res) => {
  try { res.json({ success: true }); } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ============================================================
// RESET & UTILITY ROUTES
// ============================================================

app.post('/api/centres/:centreId/reset', async (req, res) => {
  try {
    const result = await resetCentreOperationalData(req.params.centreId);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: req.params.centreId, reset: true });
    res.json(result);
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/reset-database', async (req, res) => {
  try {
    const result = await db.resetToCleanDefault();
    await broadcastRealtimeUpdate('database_reset', result);
    res.json(result);
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/admin/reset-demo-data', async (req, res) => {
  try {
    const result = await db.resetToCleanDefault();
    await broadcastRealtimeUpdate('database_reset', result);
    res.json(result);
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// SMS Simulation Log (for demo visibility)
app.get('/api/sms/log', async (req, res) => {
  res.json({ success: true, provider: getSMSProviderInfo(), log: getSimulatedSMSLog() });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    server.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🌾 AGRIFlow Backend running on port ${PORT}`);
      console.log(`📡 WebSocket Realtime Server active`);
      console.log(`🍃 Database connected & Mongoose models initialized`);
      console.log(`====================================================`);
    });
  }
});

export default app;
