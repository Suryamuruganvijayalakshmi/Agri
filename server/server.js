import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db } from './db.js';

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

// Realtime WebSocket Connection Handler
io.on('connection', (socket) => {
  console.log(`[AGRIFlow Realtime] Client connected: ${socket.id}`);

  // Send initial snapshot on connect
  socket.emit('centres_snapshot', db.getAllCentres());
  socket.emit('admin_snapshot', db.getAdminDashboardMetrics());

  socket.on('disconnect', () => {
    console.log(`[AGRIFlow Realtime] Client disconnected: ${socket.id}`);
  });
});

// Helper for broadcasting realtime updates to all clients
const broadcastRealtimeUpdate = (eventType, payload) => {
  io.emit(eventType, payload);
  // Also emit refreshed master datasets for global sync
  io.emit('centres_updated', db.getAllCentres());
  io.emit('admin_metrics_updated', db.getAdminDashboardMetrics());
};

// ============================================================
// REST API ROUTES
// ============================================================

// 1. Get all procurement centres with live utilization
app.get('/api/centres', (req, res) => {
  try {
    const centres = db.getAllCentres();
    res.json({ success: true, centres });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Get single centre details
app.get('/api/centres/:id', (req, res) => {
  try {
    const centre = db.getCentreById(req.params.id);
    if (!centre) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json({ success: true, centre });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Best Centre Recommendation Engine
app.get('/api/recommendations', (req, res) => {
  try {
    const farmer_lat = parseFloat(req.query.lat) || 12.5200;
    const farmer_lng = parseFloat(req.query.lng) || 76.8900;
    const quantity_kg = parseFloat(req.query.quantity) || 2500;

    const recommendation = db.getBestCentreRecommendation({ farmer_lat, farmer_lng, quantity_kg });
    res.json({ success: true, ...recommendation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Go / Don't-Go Intelligence Engine
app.get('/api/go-intelligence/:centreId', (req, res) => {
  try {
    const intelligence = db.getGoIntelligence(req.params.centreId);
    if (!intelligence) return res.status(404).json({ success: false, error: 'Centre not found' });
    res.json({ success: true, intelligence });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. GET SLOTS FOR CENTRE
app.get('/api/slots', (req, res) => {
  try {
    const { centre_id, date } = req.query;
    if (!centre_id) return res.status(400).json({ success: false, error: 'centre_id is required' });
    const slots = db.getSlotsForCentre(centre_id, date);
    res.json({ success: true, slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5b. GET POSITIONS FOR A SLOT
app.get('/api/slots/:slotId/positions', (req, res) => {
  try {
    const positions = db.getSlotPositions(req.params.slotId);
    res.json({ success: true, positions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5c. ATOMIC POSITION BOOKING RPC
app.post('/api/appointments/book-position', (req, res) => {
  try {
    const result = db.bookAppointmentPosition(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Broadcast Realtime updates via Socket.io
    broadcastRealtimeUpdate('slot_position_updated', {
      slot_id: result.position.slot_id,
      position_id: result.position.id,
      position_number: result.position.position_number,
      status: result.position.status,
      appointment: result.appointment
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5d. CANCEL APPOINTMENT RPC
app.post('/api/appointments/cancel', (req, res) => {
  try {
    const { appointment_id } = req.body;
    if (!appointment_id) return res.status(400).json({ success: false, error: 'appointment_id required' });

    const result = db.cancelAppointmentPosition(appointment_id);
    if (!result.success) {
      return res.status(400).json(result);
    }

    broadcastRealtimeUpdate('slot_position_updated', {
      appointment_id,
      status: 'CANCELLED'
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5e. ATOMIC CAPACITY-AWARE APPOINTMENT BOOKING
app.post('/api/appointments/book', (req, res) => {
  try {
    const result = db.bookAppointmentAtomic(req.body);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Broadcast realtime capacity shift to all connected clients & map
    broadcastRealtimeUpdate('appointment_booked', {
      appointment: result.appointment,
      updated_centre: result.updated_centre
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Get Farmer Timeline (Explainable Status)
app.get('/api/farmer/timeline/:farmerId', (req, res) => {
  try {
    const timeline = db.getFarmerTimeline(req.params.farmerId);
    res.json({ success: true, timeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Operator: Update Centre Status & Capacity
app.post('/api/operator/centre-status', (req, res) => {
  try {
    const { centre_id, status, daily_capacity_kg, booked_capacity_kg, active_counters, avg_processing_minutes } = req.body;

    const updated = db.updateCentreStatusByOperator(centre_id, {
      status,
      daily_capacity_kg,
      booked_capacity_kg,
      active_counters,
      avg_processing_minutes
    });

    if (!updated) return res.status(404).json({ success: false, error: 'Centre not found' });

    // Broadcast immediately to map & farmer screens
    broadcastRealtimeUpdate('centre_capacity_changed', {
      centre: updated,
      message: `Centre ${updated.name} operational status updated to ${updated.status} (${updated.utilization_percent}% load)`
    });

    res.json({ success: true, centre: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 8. Operator: Update Procurement Stage (Explainable Lifecycle Transition)
app.post('/api/operator/update-stage', (req, res) => {
  try {
    const result = db.updateProcurementStage(req.body);
    if (!result) return res.status(404).json({ success: false, error: 'Procurement record not found' });

    // Broadcast stage update to farmer & admin digital twin
    broadcastRealtimeUpdate('procurement_stage_updated', result);

    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Exception Engine Routes
app.post('/api/exceptions', (req, res) => {
  try {
    const exception = db.createException(req.body);
    broadcastRealtimeUpdate('exception_logged', { exception });
    res.json({ success: true, exception });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/exceptions/resolve', (req, res) => {
  try {
    const { exception_id, resolution_notes } = req.body;
    const resolved = db.resolveException(exception_id, resolution_notes);
    if (!resolved) return res.status(404).json({ success: false, error: 'Exception not found' });

    broadcastRealtimeUpdate('exception_resolved', { exception: resolved });
    res.json({ success: true, exception: resolved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 10. Admin Command Centre & Digital Twin Metrics
app.get('/api/admin/metrics', (req, res) => {
  try {
    const metrics = db.getAdminDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 11. DEMO STORY EXECUTION ENDPOINT (Automates Pitch Demo Flow)
app.post('/api/demo/run-scenario', (req, res) => {
  try {
    const { step } = req.body; // Step 1, 2, 3, 4

    let responseMsg = '';

    if (step === 1) {
      // Step 1: Initial state - Centre A 62% Green
      db.updateCentreStatusByOperator('centre-1', {
        status: 'OPEN',
        daily_capacity_kg: 50000,
        booked_capacity_kg: 31000,
        active_counters: 4
      });
      responseMsg = 'Demo Step 1: Centre A set to 62% Green (Good Availability).';
    } else if (step === 2) {
      // Step 2: Operator triggers congestion on Centre A (62% -> 91% Red)
      const updated = db.updateCentreStatusByOperator('centre-1', {
        status: 'HIGH_LOAD',
        daily_capacity_kg: 50000,
        booked_capacity_kg: 45500, // 91%
        active_counters: 2
      });

      // Create Exception and Notification
      db.createException({
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
      // Step 3: Advance Ramesh Gowda's Procurement to APPROVED
      db.updateProcurementStage({
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
      // Step 4: Complete Payment (PAID)
      db.updateProcurementStage({
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

    // Broadcast step change to all clients
    broadcastRealtimeUpdate('demo_step_executed', { step, message: responseMsg });

    res.json({ success: true, step, message: responseMsg, centres: db.getAllCentres() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. PRODUCTS API (GET & ADD NEW CROP/PRODUCT)
app.get('/api/products', (req, res) => {
  try {
    const products = db.getAllProducts();
    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const result = db.addProduct(req.body);
    if (!result.success) return res.status(400).json(result);
    broadcastRealtimeUpdate('product_added', { product: result.product });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. TELEPHONE & WHATSAPP ENHANCEMENT BOOKING
app.post('/api/booking/phone-whatsapp', (req, res) => {
  try {
    const result = db.bookAppointmentPhoneWhatsapp(req.body);
    if (!result.success) return res.status(400).json(result);

    broadcastRealtimeUpdate('slot_position_updated', {
      slot_id: result.slot.id,
      position_id: result.position.id,
      position_number: result.position.position_number,
      status: 'BOOKED',
      appointment: result.appointment
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. DYNAMIC DEVIATION STORAGE RE-ALLOCATION API
app.post('/api/reallocate-storage', (req, res) => {
  try {
    const { appointment_id, target_centre_id } = req.body;
    if (!appointment_id || !target_centre_id) {
      return res.status(400).json({ success: false, error: 'appointment_id and target_centre_id are required' });
    }

    const result = db.reallocateBookingStorage({ appointment_id, target_centre_id });
    if (!result.success) return res.status(400).json(result);

    broadcastRealtimeUpdate('storage_reallocated', result);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 15. REALTIME LOAD PACKAGE METRICS MONITOR API
app.get('/api/metrics/load-packages', (req, res) => {
  try {
    const metrics = db.getLoadPackageMetrics();
    res.json({ success: true, metrics });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🌾 AGRIFlow Backend running on port ${PORT}`);
  console.log(`📡 WebSocket Realtime Server active`);
  console.log(`====================================================`);
});
