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

const JWT_SECRET = process.env.JWT_SECRET || 'agriflow-secret-key-2026';

// Realtime WebSocket Connection Handler
io.on('connection', async (socket) => {
  console.log(`[AGRIFlow Realtime] Client connected: ${socket.id}`);

  try {
    const centres = await db.getAllCentres();
    const metrics = await db.getAdminDashboardMetrics();
    socket.emit('centres_snapshot', centres);
    socket.emit('admin_snapshot', metrics);
  } catch (err) {
    console.error('Error sending socket snapshots:', err);
  }

  socket.on('disconnect', () => {
    console.log(`[AGRIFlow Realtime] Client disconnected: ${socket.id}`);
  });
});

// Helper for broadcasting realtime updates to all clients
const broadcastRealtimeUpdate = async (eventType, payload) => {
  io.emit(eventType, payload);
  try {
    const centres = await db.getAllCentres();
    const metrics = await db.getAdminDashboardMetrics();
    io.emit('centres_updated', centres);
    io.emit('admin_metrics_updated', metrics);
  } catch (err) {
    console.error('Error broadcasting realtime updates:', err);
  }
};

// ============================================================
// AUTHENTICATION API ROUTES (MONGODB + JWT)
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

    const token = jwt.sign({ userId: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        district: newUser.district,
        state: newUser.state
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

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
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

// ============================================================
// REST API ROUTES
// ============================================================

// 1. Get all procurement centres with live utilization
app.get('/api/centres', async (req, res) => {
  try {
    const centres = await db.getAllCentres();
    res.json({ success: true, centres });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2a. Get Incoming Farmer Cultivations & AI Harvest Predictions for a Centre
app.get('/api/centres/:centreId/incoming-cultivations', async (req, res) => {
  try {
    const cultivations = await db.getIncomingCultivationsForCentre(req.params.centreId);
    res.json({ success: true, count: cultivations.length, cultivations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2b. Get single centre details
app.get('/api/centres/:id', async (req, res) => {
  try {
    const centre = await db.getCentreById(req.params.id);
    if (!centre) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json({ success: true, centre });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Best Centre Recommendation Engine
app.get('/api/recommendations', async (req, res) => {
  try {
    const farmer_lat = parseFloat(req.query.lat) || 12.5200;
    const farmer_lng = parseFloat(req.query.lng) || 76.8900;
    const quantity_kg = parseFloat(req.query.quantity) || 2500;

    const recommendation = await db.getBestCentreRecommendation({ farmer_lat, farmer_lng, quantity_kg });
    res.json({ success: true, ...recommendation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Go / Don't-Go Intelligence Engine
app.get('/api/go-intelligence/:centreId', async (req, res) => {
  try {
    const intelligence = await db.getGoIntelligence(req.params.centreId);
    if (!intelligence) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json({ success: true, intelligence });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET SLOTS FOR CENTRE
app.get('/api/slots', async (req, res) => {
  try {
    const { centre_id, date } = req.query;
    if (!centre_id) return res.status(400).json({ success: false, error: 'centre_id is required' });
    const slots = await db.getSlotsForCentre(centre_id, date);
    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5b. GET POSITIONS FOR A SLOT
app.get('/api/slots/:slotId/positions', async (req, res) => {
  try {
    const positions = await db.getSlotPositions(req.params.slotId);
    res.json({ success: true, positions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5c. ATOMIC POSITION BOOKING RPC
app.post('/api/appointments/book-position', async (req, res) => {
  try {
    const result = await db.bookAppointmentPosition(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }

    await broadcastRealtimeUpdate('slot_position_updated', {
      slot_id: result.position.slot_id,
      position_id: result.position.id,
      position_number: result.position.position_number,
      status: result.position.status,
      appointment: result.appointment
    });

    // Fire-and-forget: send booking confirmation to farmer + notification to assigned agent
    if (result.appointment) {
      sendBookingConfirmationEmail(result.appointment, {
        farmer_name: result.appointment.farmer_name
      }).catch(e => console.warn('[EMAIL] Farmer confirmation error:', e.message));

      sendAgentBookingNotification(result.appointment)
        .catch(e => console.warn('[EMAIL] Agent notification error:', e.message));
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5d. CANCEL APPOINTMENT RPC
app.post('/api/appointments/cancel', async (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) return res.status(400).json({ success: false, error: 'appointment_id required' });

    const result = await db.cancelAppointmentPosition(appointment_id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    await broadcastRealtimeUpdate('slot_position_updated', {
      appointment_id,
      status: 'CANCELLED'
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5e. ATOMIC CAPACITY-AWARE APPOINTMENT BOOKING
app.post('/api/appointments/book', async (req, res) => {
  try {
    const result = await db.bookAppointmentAtomic(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }

    await broadcastRealtimeUpdate('appointment_booked', {
      appointment: result.appointment,
      updated_centre: result.updated_centre
    });

    await broadcastRealtimeUpdate('queue_updated', {
      centre_id: result.appointment.centre_id,
      appointment: result.appointment
    });

    // Fire-and-forget: send booking confirmation to farmer + notification to assigned agent
    if (result.appointment) {
      sendBookingConfirmationEmail(result.appointment, {
        farmer_name: result.appointment.farmer_name
      }).catch(e => console.warn('[EMAIL] Farmer confirmation error:', e.message));

      sendAgentBookingNotification(result.appointment)
        .catch(e => console.warn('[EMAIL] Agent notification error:', e.message));
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5f. GET LIVE QUEUE FOR SPECIFIC CENTRE
app.get('/api/queue/:centreId', async (req, res) => {
  try {
    const farmerId = req.query.farmer_id || 'default-farmer';
    const queueData = await db.getLiveQueueForCentre(req.params.centreId, farmerId);
    if (!queueData) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json(queueData);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5g. ADVANCE QUEUE FOR CENTRE (OPERATOR QUEUE MANAGEMENT RPC)
app.post('/api/queue/advance', async (req, res) => {
  try {
    const { centre_id, token_number, new_status } = req.body;
    const result = await db.advanceQueueForCentre({ centre_id, token_number, new_status });
    if (!result.success) {
      return res.status(400).json(result);
    }

    await broadcastRealtimeUpdate('queue_updated', {
      centre_id,
      updated_appointment: result.appointment
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get Farmer Timeline
app.get('/api/farmer/timeline/:farmerId', async (req, res) => {
  try {
    const timeline = await db.getFarmerTimeline(req.params.farmerId);
    res.json({ success: true, timeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Operator: Update Centre Status & Capacity
app.post('/api/operator/centre-status', async (req, res) => {
  try {
    const { centre_id, status, daily_capacity_kg, booked_capacity_kg, active_counters, avg_processing_minutes } = req.body;

    const updated = await db.updateCentreStatusByOperator(centre_id, {
      status,
      daily_capacity_kg,
      booked_capacity_kg,
      active_counters,
      avg_processing_minutes
    });

    if (!updated) return res.status(404).json({ success: false, error: 'Centre not found' });

    await broadcastRealtimeUpdate('centre_capacity_changed', {
      centre: updated,
      message: `Centre ${updated.name} operational status updated to ${updated.status} (${updated.utilization_percent}% load)`
    });

    // ── AUTO-NOTIFY ALL FARMERS ─────────────────────────────────────────────
    // Build a human-readable summary of what changed
    const statusLabel = { OPEN: '🟢 Open', CLOSED: '🔴 Closed', HIGH_LOAD: '🟡 High Load', FULL: '🔴 Full' }[status] || status;
    const notifTitle = `${updated.name || 'Procurement Centre'}: Status Updated`;
    const notifMsg   = `Centre status is now ${statusLabel}. Daily intake capacity: ${Number(daily_capacity_kg).toLocaleString()} kg. ${Number(active_counters || 4)} counters active.`;
    const notifIcon  = status === 'OPEN' ? '🟢' : status === 'CLOSED' ? '🔴' : status === 'HIGH_LOAD' ? '🟡' : '🔴';

    // Save a broadcast notification (farmer_id = 'ALL', centre_id = this centre)
    try {
      const nid = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      await Notification.create({
        id: nid,
        farmer_id: 'ALL',
        centre_id,
        type: 'CENTRE_UPDATE',
        title: notifTitle,
        message: notifMsg,
        icon: notifIcon,
        link: '/farmer/map'
      });
    } catch (ne) {
      console.warn('[NOTIF] Could not save broadcast notification:', ne.message);
    }

    // Emit live notification event to ALL connected farmer clients
    io.emit('centre_notification', {
      centre_id,
      type: 'CENTRE_UPDATE',
      title: notifTitle,
      message: notifMsg,
      icon: notifIcon,
      link: '/farmer/map',
      created_at: new Date().toISOString()
    });
    // ── END AUTO-NOTIFY ─────────────────────────────────────────────────────

    res.json({ success: true, centre: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Operator: Update Procurement Stage
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

// 9. Exception Engine Routes
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

// 10. Admin Command Centre & Digital Twin Metrics
app.get('/api/admin/metrics', async (req, res) => {
  try {
    const metrics = await db.getAdminDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. DEMO STORY EXECUTION ENDPOINT
app.post('/api/demo/run-scenario', async (req, res) => {
  try {
    const { step } = req.body;
    let responseMsg = '';

    if (step === 1) {
      await db.updateCentreStatusByOperator('centre-1', {
        status: 'OPEN',
        daily_capacity_kg: 50000,
        booked_capacity_kg: 31000,
        active_counters: 4
      });
      responseMsg = 'Demo Step 1: Centre A set to 62% Green (Good Availability).';
    } else if (step === 2) {
      await db.updateCentreStatusByOperator('centre-1', {
        status: 'HIGH_LOAD',
        daily_capacity_kg: 50000,
        booked_capacity_kg: 45500,
        active_counters: 2
      });

      await db.createException({
        farmer_id: 'F-1042',
        farmer_name: 'Ramesh Gowda',
        centre_id: 'centre-1',
        centre_name: 'Mandya Central Procurement Yard',
        procurement_id: 'PROC-2026-9042',
        type: 'CAPACITY_CONGESTION',
        severity: 'HIGH',
        reason: 'Surge in afternoon un-registered arrivals at Gate Counter #1.',
        owner: 'Yard Traffic Marshal',
        next_action: 'Advise affected farmers to switch to Pandavapura Depot'
      });

      responseMsg = 'Demo Step 2: Centre A capacity surged to 91% (RED Marker!). Notification & alternative recommendation triggered for Ramesh Gowda.';
    } else if (step === 3) {
      await db.updateProcurementStage({
        procurement_id: 'PROC-2026-9042',
        new_status: 'APPROVED',
        actual_weighed_kg: 2520,
        quality_grade: 'Grade A',
        quality_moisture: '13.2%',
        actor_name: 'Director of Procurement (Mandya)',
        reason: 'Grade A MSP compliance verified. MSP rate ₹22/kg applied.',
        owner: 'State Treasury DBT Disbursement Cell',
        next_action: 'DBT Voucher generation & Bank credit execution'
      });
      responseMsg = 'Demo Step 3: Procurement APPROVED. Payment status advanced to PROCESSING with explainable details.';
    } else if (step === 4) {
      await db.updateProcurementStage({
        procurement_id: 'PROC-2026-9042',
        new_status: 'PAID',
        actual_weighed_kg: 2520,
        actor_name: 'State Bank of India Payment Gateway',
        reason: 'Direct Benefit Transfer completed to Aadhaar A/C *4902.',
        owner: 'State Bank of India DBT System',
        next_action: 'Transaction Settled (Ref PAY-2026-004821)'
      });
      responseMsg = 'Demo Step 4: Payment ₹55,440 PAID! Digital transaction voucher generated.';
    }

    const centres = await db.getAllCentres();
    await broadcastRealtimeUpdate('demo_step_executed', { step, message: responseMsg });
    res.json({ success: true, step, message: responseMsg, centres });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. PRODUCTS API
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const result = await db.addProduct(req.body);
    if (!result.success) return res.status(400).json(result);
    await broadcastRealtimeUpdate('product_added', { product: result.product });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. DIRECT WEB POSITION BOOKING API
app.post('/api/booking/position', async (req, res) => {
  try {
    const result = await db.bookAppointmentPosition(req.body);
    if (!result.success) return res.status(400).json(result);

    await broadcastRealtimeUpdate('slot_position_updated', {
      slot_id: result.appointment?.slot_id,
      position_number: result.appointment?.position_number,
      status: 'BOOKED',
      appointment: result.appointment
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ============================================================
// FARMER NOTIFICATION ROUTES
// ============================================================

// Fetch notifications for a farmer (broadcast 'ALL' + farmer-specific)
app.get('/api/notifications/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const notifications = await Notification
      .find({ $or: [{ farmer_id: farmerId }, { farmer_id: 'ALL' }] })
      .sort({ createdAt: -1 })
      .limit(60)
      .lean();
    res.json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unread count for bell badge
app.get('/api/notifications/:farmerId/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      $or: [{ farmer_id: req.params.farmerId }, { farmer_id: 'ALL' }],
      read: false
    });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark a single notification read
app.post('/api/notifications/read/:notifId', async (req, res) => {
  try {
    await Notification.updateOne({ id: req.params.notifId }, { $set: { read: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Mark all as read for a farmer
app.post('/api/notifications/read-all/:farmerId', async (req, res) => {
  try {
    await Notification.updateMany(
      { $or: [{ farmer_id: req.params.farmerId }, { farmer_id: 'ALL' }] },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create a custom notification (booking confirmed, etc.)
app.post('/api/notifications', async (req, res) => {
  try {
    const { farmer_id, centre_id, type, title, message, icon, link } = req.body;
    const nid = `NOTIF-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    const notif = await Notification.create({
      id: nid, farmer_id, centre_id, type,
      title, message, icon: icon || '🔔', link
    });
    io.emit('centre_notification', { ...notif.toObject(), created_at: notif.createdAt });
    res.json({ success: true, notification: notif });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. WEIGHMENT API
app.post('/api/operator/weighment', async (req, res) => {
  try {
    const result = await db.addWeighment(req.body);
    if (!result.success) return res.status(400).json(result);

    await broadcastRealtimeUpdate('weighment_recorded', result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// 15. QUALITY INSPECTION API
app.post('/api/inspector/quality', async (req, res) => {
  try {
    const result = await db.addQualityInspection(req.body);
    if (!result.success) return res.status(400).json(result);

    await broadcastRealtimeUpdate('quality_inspected', result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. AUDIT LOGS API
app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const logs = await db.getAuditLogs();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// 17. AI LAND & CROP INTELLIGENCE API ROUTES
// ============================================================

// Fetch Farmer's Land Parcels
app.get('/api/land/parcels/:farmerId', async (req, res) => {
  try {
    const parcels = await db.getLandParcels(req.params.farmerId);
    res.json({ success: true, parcels });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify Government Land Record (Simulated Bhoomi / RTC API)
app.post('/api/land/verify-parcel', async (req, res) => {
  try {
    const result = await db.verifyGovtLandRecord(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register / Save Land Parcel
app.post('/api/land/parcels', async (req, res) => {
  try {
    const result = await db.registerLandParcel(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Land Parcel
app.delete('/api/land/parcels/:id', async (req, res) => {
  try {
    const result = await db.deleteLandParcel(req.params.id);
    await broadcastRealtimeUpdate('land_parcel_deleted', { id: req.params.id });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Register Crop & Trigger AI Harvest Prediction Engine
app.post('/api/crops/register', async (req, res) => {
  try {
    const result = await db.registerCropAndPredict(req.body);
    await broadcastRealtimeUpdate('crop_registered', result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Farmer's Crops & Predictions
app.get('/api/crops/:farmerId', async (req, res) => {
  try {
    const crops = await db.getCropRecords(req.params.farmerId);
    res.json({ success: true, crops });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch Regional / District Procurement Forecast (Authority View)
app.get('/api/forecasting/district-forecast', async (req, res) => {
  try {
    const forecast = await db.getDistrictProcurementForecast(req.query.district);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset Centre Specific Operational Data (Requirement 19 & 20)
// Clears queue & load for centreId while preserving permanent farmer/land/crop records
app.post('/api/centres/:centreId/reset', async (req, res) => {
  try {
    const { centreId } = req.params;
    const result = await resetCentreOperationalData(centreId);
    await broadcastRealtimeUpdate('queue_updated', { centre_id: centreId, reset: true });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Alias for Centre Operator NEXT FARMER (Requirement 9)
app.post('/api/centres/:centreId/queue/next', async (req, res) => {
  try {
    const { centreId } = req.params;
    const { token_number, new_status } = req.body;
    const result = await db.advanceQueueForCentre({ centre_id: centreId, token_number, new_status: new_status || 'CHECKED_IN' });
    if (!result.success) {
      return res.status(400).json(result);
    }
    await broadcastRealtimeUpdate('queue_updated', { centre_id: centreId, updated_appointment: result.appointment });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin Reset Demo Data (Requirement 21)
app.post('/api/admin/reset-demo-data', async (req, res) => {
  try {
    const result = await db.resetToCleanDefault();
    await broadcastRealtimeUpdate('database_reset', result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset Database & Clear All Bookings Endpoint
app.post('/api/reset-database', async (req, res) => {
  try {
    const result = await db.resetToCleanDefault();
    await broadcastRealtimeUpdate('database_reset', result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

// Initialize Database & Start Server
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
