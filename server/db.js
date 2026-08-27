import { v4 as uuidv4 } from 'uuid';
import { REAL_COLD_STORAGES_TN } from './real_cold_storages.js';

// In-Memory Relational Transactional Store with Atomic RPC Lock Support
class AgriFlowDatabase {
  constructor() {
    this.initTables();
    this.seedData();
  }

  initTables() {
    this.centres = new Map();
    this.appointments = new Map();
    this.procurements = new Map();
    this.procurement_events = new Map();
    this.payments = new Map();
    this.exceptions = new Map();
    this.notifications = new Map();
    this.farmers = new Map();
    this.slots = new Map();
    this.slot_positions = new Map();
    this.system_config = new Map([
      ['green_threshold', 60],
      ['yellow_threshold', 85],
      ['red_threshold', 100],
      ['demo_region', 'Southern Agricultural Hub']
    ]);
  }

  seedData() {
    // 1. Initialize Procurement Centres with baseline capacities
    const initialCentres = [
      {
        id: 'centre-1',
        code: 'PROC-KA-01',
        name: 'Mandya Central Procurement Yard',
        latitude: 12.5224,
        longitude: 76.8974,
        address: 'APMC Market Yard, NH 275, Mandya, Karnataka',
        district: 'Mandya',
        state: 'Karnataka',
        status: 'OPEN',
        daily_capacity_kg: 50000,
        booked_capacity_kg: 0,
        active_counters: 4,
        avg_processing_minutes: 12,
        operational_start: '08:00 AM',
        operational_end: '06:00 PM',
        queue_count: 0,
        today_procured_kg: 0,
        contact_phone: '+91 98450 11223'
      },
      {
        id: 'centre-2',
        code: 'PROC-KA-02',
        name: 'Maddur Grain Storage & Procurement Centre',
        latitude: 12.5843,
        longitude: 77.0452,
        address: 'Old Bazaar Street, Maddur, Karnataka',
        district: 'Mandya',
        state: 'Karnataka',
        status: 'OPEN',
        daily_capacity_kg: 40000,
        booked_capacity_kg: 0,
        active_counters: 3,
        avg_processing_minutes: 15,
        operational_start: '08:30 AM',
        operational_end: '05:30 PM',
        queue_count: 0,
        today_procured_kg: 0,
        contact_phone: '+91 98450 44556'
      },
      {
        id: 'centre-3',
        code: 'PROC-KA-03',
        name: 'Srirangapatna Agri Warehousing Hub',
        latitude: 12.4215,
        longitude: 76.6932,
        address: 'Station Road, Near Railway Yard, Srirangapatna',
        district: 'Mandya',
        state: 'Karnataka',
        status: 'OPEN',
        daily_capacity_kg: 35000,
        booked_capacity_kg: 0,
        active_counters: 2,
        avg_processing_minutes: 18,
        operational_start: '08:00 AM',
        operational_end: '05:00 PM',
        queue_count: 0,
        today_procured_kg: 0,
        contact_phone: '+91 98450 77889'
      }
    ];

    initialCentres.forEach(c => {
      c.last_updated = new Date().toISOString();
      this.centres.set(c.id, c);
    });

    // Add 136 Tamil Nadu real storage facilities cleanly initialized at 0 booked kg
    REAL_COLD_STORAGES_TN.forEach(cs => {
      this.centres.set(cs.id, {
        ...cs,
        booked_capacity_kg: 0,
        queue_count: 0,
        today_procured_kg: 0,
        last_updated: new Date().toISOString()
      });
    });

    // 2. All transactional tables start 100% EMPTY for fresh user workflows
    this.farmers.clear();
    this.appointments.clear();
    this.procurements.clear();
    this.procurement_events.clear();
    this.payments.clear();
    this.exceptions.clear();
    this.notifications.clear();
    this.seedSlotsAndPositions();
  }

  seedSlotsAndPositions() {
    const todayStr = new Date().toISOString().split('T')[0];
    const centres = Array.from(this.centres.values());

    const defaultTimeSlots = [
      { idSuffix: '0800', time: '08:00 - 08:30 AM', start_time: '08:00', end_time: '08:30', max: 20, booked: 0 },
      { idSuffix: '0830', time: '08:30 - 09:00 AM', start_time: '08:30', end_time: '09:00', max: 20, booked: 0 },
      { idSuffix: '0900', time: '09:00 - 09:30 AM', start_time: '09:00', end_time: '09:30', max: 20, booked: 0 },
      { idSuffix: '0930', time: '09:30 - 10:00 AM', start_time: '09:30', end_time: '10:00', max: 20, booked: 0 },
      { idSuffix: '1000', time: '10:00 - 10:30 AM', start_time: '10:00', end_time: '10:30', max: 20, booked: 0 },
      { idSuffix: '1030', time: '10:30 - 11:00 AM', start_time: '10:30', end_time: '11:00', max: 20, booked: 0 },
      { idSuffix: '1100', time: '11:00 - 11:30 AM', start_time: '11:00', end_time: '11:30', max: 20, booked: 0 }
    ];

    centres.forEach(centre => {
      defaultTimeSlots.forEach((ts) => {
        const slotId = `slot-${centre.id}-${ts.idSuffix}`;

        const slotObj = {
          id: slotId,
          centre_id: centre.id,
          slot_date: todayStr,
          start_time: ts.time,
          end_time: ts.time,
          maximum_bookings: ts.max,
          current_bookings: 0,
          is_available: true,
          created_at: new Date().toISOString()
        };
        this.slots.set(slotId, slotObj);

        // All 20 individual positions start 100% AVAILABLE
        for (let pos = 1; pos <= ts.max; pos++) {
          const posId = `${slotId}-pos-${pos}`;
          this.slot_positions.set(posId, {
            id: posId,
            slot_id: slotId,
            position_number: pos,
            status: 'AVAILABLE',
            appointment_id: null,
            booked_by: null,
            booked_at: null,
            created_at: new Date().toISOString()
          });
        }
      });
    });
  }

  // --- Helper Methods ---

  getCentreUtilization(centre) {
    if (centre.status === 'CLOSED') return { percent: 0, statusCategory: 'CLOSED' };
    const percent = Math.min(100, Math.round((centre.booked_capacity_kg / centre.daily_capacity_kg) * 100));
    
    let statusCategory = 'GREEN';
    if (percent > 85 || centre.status === 'FULL') {
      statusCategory = 'RED';
    } else if (percent > 60 || centre.status === 'HIGH_LOAD') {
      statusCategory = 'YELLOW';
    }
    
    return { percent, statusCategory };
  }

  getAllCentres() {
    return Array.from(this.centres.values()).map(c => {
      const remaining_capacity_kg = Math.max(0, c.daily_capacity_kg - c.booked_capacity_kg);
      const est_wait_minutes = c.active_counters > 0 
        ? Math.round((c.queue_count * c.avg_processing_minutes) / c.active_counters) 
        : 0;
      const utilization = this.getCentreUtilization(c);

      return {
        ...c,
        remaining_capacity_kg,
        est_wait_minutes,
        utilization_percent: utilization.percent,
        color_status: c.status === 'CLOSED' ? 'GREY' : utilization.statusCategory
      };
    });
  }

  getCentreById(id) {
    const centres = this.getAllCentres();
    return centres.find(c => c.id === id) || null;
  }

  // ATOMIC APPOINTMENT BOOKING RPC - PREVENTS OVERBOOKING
  bookAppointmentAtomic({ farmer_id, farmer_name, farmer_phone, centre_id, appointment_date, time_slot, quantity_kg, crop }) {
    const centre = this.centres.get(centre_id);

    if (!centre) {
      return { success: false, error: 'Target procurement centre not found.' };
    }

    if (centre.status === 'CLOSED') {
      return { success: false, error: 'Selected procurement centre is currently closed.' };
    }

    const availableKg = centre.daily_capacity_kg - centre.booked_capacity_kg;
    if (quantity_kg > availableKg) {
      return {
        success: false,
        error: `Insufficient remaining capacity. Selected centre has only ${availableKg.toLocaleString()} kg remaining today, but ${quantity_kg.toLocaleString()} kg was requested.`,
        remaining_capacity_kg: availableKg,
        suggested_alternative: this.getBestCentreRecommendation({ farmer_lat: centre.latitude, farmer_lng: centre.longitude, quantity_kg })
      };
    }

    // ATOMIC COMMIT: Update booked capacity synchronously
    centre.booked_capacity_kg += quantity_kg;
    if (centre.booked_capacity_kg >= centre.daily_capacity_kg) {
      centre.status = 'FULL';
    } else if (centre.booked_capacity_kg / centre.daily_capacity_kg > 0.6) {
      centre.status = 'HIGH_LOAD';
    }
    centre.queue_count += 1;
    centre.last_updated = new Date().toISOString();
    this.centres.set(centre.id, centre);

    const apptId = `APPT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const tokenNumber = `TK-${centre.code.split('-')[1]}-${Math.floor(100 + Math.random() * 900)}`;

    const newAppt = {
      id: apptId,
      farmer_id,
      farmer_name: farmer_name || 'Farmer',
      farmer_phone: farmer_phone || '+91 98000 00000',
      centre_id,
      centre_name: centre.name,
      appointment_date,
      time_slot,
      quantity_kg,
      crop: crop || 'Paddy',
      token_number: tokenNumber,
      status: 'BOOKED',
      created_at: new Date().toISOString()
    };
    this.appointments.set(apptId, newAppt);

    // Create Procurement Lifecycle Record
    const procId = `PROC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProc = {
      id: procId,
      appointment_id: apptId,
      farmer_id,
      farmer_name: farmer_name || 'Farmer',
      centre_id,
      centre_name: centre.name,
      crop: crop || 'Paddy',
      quantity_kg,
      actual_weighed_kg: 0,
      quality_grade: 'Pending Verification',
      quality_moisture: 'Pending Measurement',
      status: 'BOOKED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.procurements.set(procId, newProc);

    // Create Initial Event
    const eventId = uuidv4();
    this.procurement_events.set(eventId, {
      id: eventId,
      procurement_id: procId,
      previous_status: 'NONE',
      new_status: 'BOOKED',
      actor_id: 'SYSTEM',
      actor_name: 'Capacity Booking Engine',
      actor_role: 'SYSTEM',
      reason: `Capacity commitment reserved: ${quantity_kg.toLocaleString()} kg confirmed. Token ${tokenNumber} issued.`,
      owner: centre.name,
      next_action: 'Travel to centre and check in at entry gate',
      notes: `Atomic capacity lock succeeded.`,
      created_at: new Date().toISOString()
    });

    // Create Payment Record (Pending)
    const payId = `PAY-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    this.payments.set(payId, {
      id: payId,
      procurement_id: procId,
      farmer_id,
      farmer_name: farmer_name || 'Farmer',
      amount: quantity_kg * 22, // Estimated MSP at Rs 22/kg
      status: 'PENDING',
      reference_number: payId,
      owner: 'Procurement Gate Counter',
      reason: 'Appointment booked. Awaiting farmer arrival and weighing.',
      next_action: 'Weighbridge and Quality Approval',
      bank_account_mask: 'State Bank of India (A/C ending *4902)',
      initiated_at: null,
      completed_at: null,
      updated_at: new Date().toISOString()
    });

    // Notification
    const notifId = uuidv4();
    this.notifications.set(notifId, {
      id: notifId,
      farmer_id,
      type: 'APPOINTMENT_CONFIRMED',
      title: `Token ${tokenNumber} Confirmed`,
      message: `Your slot at ${centre.name} for ${quantity_kg.toLocaleString()} kg on ${appointment_date} (${time_slot}) is reserved!`,
      read: false,
      created_at: new Date().toISOString()
    });

    return {
      success: true,
      appointment: newAppt,
      procurement: newProc,
      updated_centre: this.getCentreById(centre_id)
    };
  }

  // BEST CENTRE RECOMMENDATION ENGINE WITH EXPLAINABLE REASONS
  getBestCentreRecommendation({ farmer_lat = 12.5200, farmer_lng = 76.8900, quantity_kg = 2500 }) {
    const centres = this.getAllCentres().filter(c => c.status !== 'CLOSED');

    if (centres.length === 0) return null;

    // Haversine distance calculator
    const calcDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    };

    const scored = centres.map(c => {
      const dist = calcDistance(farmer_lat, farmer_lng, c.latitude, c.longitude);
      const hasCap = c.remaining_capacity_kg >= quantity_kg;
      
      // Score formulation: Lower wait + shorter dist + higher available cap = higher score
      let score = 100 - (dist * 4) - (c.est_wait_minutes * 2) + (hasCap ? 30 : -50);
      if (c.color_status === 'GREEN') score += 20;
      if (c.color_status === 'RED') score -= 30;

      return {
        ...c,
        distance_km: dist,
        has_sufficient_capacity: hasCap,
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    const reasons = [
      `Short wait time of ${best.est_wait_minutes} minutes (${best.queue_count} farmers in queue)`,
      `${best.remaining_capacity_kg.toLocaleString()} kg remaining capacity available`,
      `Located ${best.distance_km} km from your registered area`,
      `Operating smoothly with ${best.active_counters} active processing counters`
    ];

    return {
      recommended_centre: best,
      reasons,
      score: Math.round(best.score),
      alternatives: scored.slice(1, 3)
    };
  }

  // GO / DON'T-GO INTELLIGENCE ENGINE
  getGoIntelligence(centreId) {
    const centre = this.getCentreById(centreId);
    if (!centre) return null;

    let decision = 'GO'; // 'GO', 'CAUTION', 'WAIT'
    let title = 'GO AHEAD';
    let summary = 'Procurement yard operating normally. Excellent time to arrive.';
    let recommendation_notes = [];

    if (centre.status === 'CLOSED') {
      decision = 'WAIT';
      title = 'DO NOT GO - CENTRE CLOSED';
      summary = 'This centre is currently closed for intake. Please reschedule.';
      recommendation_notes.push('Centre operational hours: 8:00 AM - 6:00 PM');
    } else if (centre.color_status === 'RED' || centre.est_wait_minutes > 30) {
      decision = 'WAIT';
      title = 'HEAVY CONGESTION - WAIT OR RESCHEDULE';
      summary = `High queue density (${centre.queue_count} farmers waiting, ~${centre.est_wait_minutes} min wait).`;
      recommendation_notes.push(`Consider rescheduling to Pandavapura Paddy Depot (10 min wait)`);
      recommendation_notes.push(`If traveling now, expect extended yard holding time.`);
    } else if (centre.color_status === 'YELLOW' || centre.est_wait_minutes > 15) {
      decision = 'CAUTION';
      title = 'MODERATE LOAD - PROCEED WITH PREPARATION';
      summary = `Moderate traffic at yard. Estimated wait is ${centre.est_wait_minutes} mins.`;
      recommendation_notes.push('Ensure produce moisture testing sample is ready on top layer');
      recommendation_notes.push('Have token digital code or printout handy');
    } else {
      decision = 'GO';
      title = 'GO AHEAD - LOW WAIT TIME';
      summary = `Fast throughput! Est wait is only ${centre.est_wait_minutes} mins across ${centre.active_counters} counters.`;
      recommendation_notes.push('Yard capacity is green with smooth check-in flow.');
    }

    return {
      centre_id: centre.id,
      centre_name: centre.name,
      decision,
      title,
      summary,
      queue_count: centre.queue_count,
      est_wait_minutes: centre.est_wait_minutes,
      active_counters: centre.active_counters,
      color_status: centre.color_status,
      recommendation_notes
    };
  }

  // OPERATOR CAPACITY & STATUS UPDATER WITH REALTIME BROADCASTING PREPARATION
  updateCentreStatusByOperator(centreId, { status, daily_capacity_kg, booked_capacity_kg, active_counters, avg_processing_minutes }) {
    const centre = this.centres.get(centreId);
    if (!centre) return null;

    if (status !== undefined) centre.status = status;
    if (daily_capacity_kg !== undefined) centre.daily_capacity_kg = Number(daily_capacity_kg);
    if (booked_capacity_kg !== undefined) centre.booked_capacity_kg = Number(booked_capacity_kg);
    if (active_counters !== undefined) centre.active_counters = Number(active_counters);
    if (avg_processing_minutes !== undefined) centre.avg_processing_minutes = Number(avg_processing_minutes);
    centre.last_updated = new Date().toISOString();

    this.centres.set(centreId, centre);
    return this.getCentreById(centreId);
  }

  // PROCUREMENT STAGE UPDATE (EXPLAINABLE STATUS LOGIC)
  updateProcurementStage({ procurement_id, new_status, actual_weighed_kg, quality_grade, quality_moisture, actor_id, actor_name, actor_role, reason, owner, next_action, notes }) {
    const proc = this.procurements.get(procurement_id);
    if (!proc) return null;

    const previous_status = proc.status;
    proc.status = new_status;
    if (actual_weighed_kg) proc.actual_weighed_kg = actual_weighed_kg;
    if (quality_grade) proc.quality_grade = quality_grade;
    if (quality_moisture) proc.quality_moisture = quality_moisture;
    proc.updated_at = new Date().toISOString();
    this.procurements.set(procurement_id, proc);

    // Record explainable event log
    const eventId = uuidv4();
    const event = {
      id: eventId,
      procurement_id,
      previous_status,
      new_status,
      actor_id: actor_id || 'OP-101',
      actor_name: actor_name || 'Centre Operator',
      actor_role: actor_role || 'CENTRE_OPERATOR',
      reason: reason || `Procurement status updated from ${previous_status} to ${new_status}`,
      owner: owner || 'Procurement Operations Team',
      next_action: next_action || 'Proceeding to next verification milestone',
      notes: notes || '',
      created_at: new Date().toISOString()
    };
    this.procurement_events.set(eventId, event);

    // Update associated payment record when approval or payment stage occurs
    let payment = Array.from(this.payments.values()).find(p => p.procurement_id === procurement_id);
    if (payment) {
      if (new_status === 'APPROVED') {
        payment.status = 'PROCESSING';
        payment.owner = 'State Agriculture Treasury Cell';
        payment.reason = 'Procurement administrative approval complete. DBT voucher dispatched.';
        payment.next_action = 'Bank account credit transfer';
        payment.amount = (proc.actual_weighed_kg || proc.quantity_kg) * 22;
        payment.updated_at = new Date().toISOString();
        this.payments.set(payment.id, payment);
      } else if (new_status === 'PAID') {
        payment.status = 'PAID';
        payment.owner = 'State Bank of India Direct Benefit Transfer';
        payment.reason = 'Funds credited to Aadhaar-seeded bank account successfully.';
        payment.next_action = 'Transaction completed. Digital receipt issued.';
        payment.completed_at = new Date().toISOString();
        payment.updated_at = new Date().toISOString();
        this.payments.set(payment.id, payment);
      }
    }

    // Trigger Farmer Notification
    const notifId = uuidv4();
    this.notifications.set(notifId, {
      id: notifId,
      farmer_id: proc.farmer_id,
      type: 'STATUS_UPDATE',
      title: `Procurement Update: ${new_status.replace('_', ' ')}`,
      message: `Your procurement at ${proc.centre_name} is now ${new_status.replace('_', ' ')}. ${next_action ? 'Next step: ' + next_action : ''}`,
      read: false,
      created_at: new Date().toISOString()
    });

    return {
      procurement: proc,
      event,
      payment
    };
  }

  // EXCEPTION MANAGEMENT ENGINE
  createException({ farmer_id, farmer_name, centre_id, centre_name, procurement_id, type, severity, reason, owner, next_action }) {
    const exId = `EXC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newEx = {
      id: exId,
      farmer_id: farmer_id || 'F-1042',
      farmer_name: farmer_name || 'Ramesh Gowda',
      centre_id,
      centre_name: centre_name || 'Procurement Yard',
      procurement_id: procurement_id || 'PROC-2026-9042',
      type: type || 'OPERATIONAL_DELAY',
      severity: severity || 'MEDIUM',
      reason: reason || 'Manual verification requested',
      owner: owner || 'District Nodal Officer',
      status: 'OPEN',
      next_action: next_action || 'Field inspection & override review',
      created_at: new Date().toISOString(),
      resolved_at: null
    };

    this.exceptions.set(exId, newEx);

    // Notify farmer of exception created
    const notifId = uuidv4();
    this.notifications.set(notifId, {
      id: notifId,
      farmer_id: newEx.farmer_id,
      type: 'EXCEPTION_ALERT',
      title: `Action Required: Exception Logged`,
      message: `Issue logged for your procurement: ${reason}. Managed by: ${owner}.`,
      read: false,
      created_at: new Date().toISOString()
    });

    return newEx;
  }

  resolveException(exceptionId, resolutionNotes) {
    const ex = this.exceptions.get(exceptionId);
    if (!ex) return null;

    ex.status = 'RESOLVED';
    ex.resolved_at = new Date().toISOString();
    ex.next_action = `Resolved: ${resolutionNotes || 'Operational clearance granted'}`;
    this.exceptions.set(exceptionId, ex);

    return ex;
  }

  // EXPLAINABLE TIMELINE RETRIEVAL
  getFarmerTimeline(farmerId) {
    const farmerAppointments = Array.from(this.appointments.values()).filter(a => a.farmer_id === farmerId);
    const farmerProcurements = Array.from(this.procurements.values()).filter(p => p.farmer_id === farmerId);
    const farmerPayments = Array.from(this.payments.values()).filter(p => p.farmer_id === farmerId);
    const farmerExceptions = Array.from(this.exceptions.values()).filter(e => e.farmer_id === farmerId);
    const farmerNotifications = Array.from(this.notifications.values())
      .filter(n => n.farmer_id === farmerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Detailed events map
    const activeProc = farmerProcurements.find(p => p.status !== 'PAID') || farmerProcurements[0];
    let events = [];
    if (activeProc) {
      events = Array.from(this.procurement_events.values())
        .filter(e => e.procurement_id === activeProc.id)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return {
      farmer_id: farmerId,
      appointments: farmerAppointments,
      procurements: farmerProcurements,
      active_procurement: activeProc || null,
      events,
      payments: farmerPayments,
      exceptions: farmerExceptions,
      notifications: farmerNotifications
    };
  }

  // ADMIN COMMAND CENTRE METRICS & DIGITAL TWIN
  getAdminDashboardMetrics() {
    const centres = this.getAllCentres();
    const totalCentres = centres.length;
    const operationalCount = centres.filter(c => c.status === 'OPEN').length;
    const highLoadCount = centres.filter(c => c.color_status === 'YELLOW').length;
    const fullCount = centres.filter(c => c.color_status === 'RED').length;
    const closedCount = centres.filter(c => c.status === 'CLOSED').length;

    const totalCapacityKg = centres.reduce((sum, c) => sum + c.daily_capacity_kg, 0);
    const totalBookedKg = centres.reduce((sum, c) => sum + c.booked_capacity_kg, 0);
    const totalProcuredKg = centres.reduce((sum, c) => sum + c.today_procured_kg, 0);
    const totalQueueCount = centres.reduce((sum, c) => sum + c.queue_count, 0);

    const avgWaitMinutes = Math.round(
      centres.reduce((sum, c) => sum + c.est_wait_minutes, 0) / (totalCentres || 1)
    );

    const pendingApprovals = Array.from(this.procurements.values()).filter(p => p.status === 'APPROVAL_PENDING' || p.status === 'QUALITY_VERIFICATION').length;
    const pendingPayments = Array.from(this.payments.values()).filter(p => p.status === 'PROCESSING' || p.status === 'PENDING').length;
    const unresolvedExceptions = Array.from(this.exceptions.values()).filter(e => e.status !== 'RESOLVED').length;

    // Digital twin activity logs
    const recentEvents = Array.from(this.procurement_events.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    return {
      totalCentres,
      operationalCount,
      highLoadCount,
      fullCount,
      closedCount,
      totalCapacityKg,
      totalBookedKg,
      totalProcuredKg,
      capacityUtilizationPercent: Math.round((totalBookedKg / (totalCapacityKg || 1)) * 100),
      totalQueueCount,
      avgWaitMinutes,
      pendingApprovals,
      pendingPayments,
      unresolvedExceptions,
      centres,
      recentEvents,
      exceptions: Array.from(this.exceptions.values())
    };
  }

  // --- REAL-TIME SLOT POSITIONS METHODS ---

  getSlotsForCentre(centreId, dateStr) {
    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const slots = Array.from(this.slots.values()).filter(
      s => s.centre_id === centreId && (!dateStr || s.slot_date === todayStr)
    );

    return slots.map(s => {
      const positions = Array.from(this.slot_positions.values()).filter(p => p.slot_id === s.id);
      const bookedCount = positions.filter(p => p.status === 'BOOKED').length;
      const availCount = positions.filter(p => p.status === 'AVAILABLE').length;

      return {
        ...s,
        current_bookings: bookedCount,
        available_positions_count: availCount,
        is_available: availCount > 0 && bookedCount < s.maximum_bookings
      };
    });
  }

  getSlotPositions(slotId) {
    const positions = Array.from(this.slot_positions.values())
      .filter(p => p.slot_id === slotId)
      .sort((a, b) => a.position_number - b.position_number);
    
    return positions;
  }

  bookAppointmentPosition({ farmer_id, farmer_name, slot_id, position_id, position_number, crop, quantity_kg }) {
    // 1. Locate position
    let pos = null;
    if (position_id) {
      pos = this.slot_positions.get(position_id);
    } else if (slot_id && position_number) {
      pos = Array.from(this.slot_positions.values()).find(
        p => p.slot_id === slot_id && p.position_number === Number(position_number)
      );
    }

    if (!pos) {
      return { success: false, error: 'Selected position does not exist in database.' };
    }

    // 2. ATOMIC LOCK CHECK: verify status is AVAILABLE
    if (pos.status !== 'AVAILABLE') {
      return { success: false, error: 'Position already booked. Please select another position.' };
    }

    // 3. Verify slot capacity
    const slot = this.slots.get(pos.slot_id);
    if (!slot) {
      return { success: false, error: 'Target slot does not exist.' };
    }

    if (slot.current_bookings >= slot.maximum_bookings || !slot.is_available) {
      return { success: false, error: 'Slot capacity reached. Please select another time slot.' };
    }

    const centre = this.centres.get(slot.centre_id);
    const apptId = `APPT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookingId = `AGR-2026-${Math.floor(10000 + Math.random() * 89999)}`;
    const tokenNumber = `T-${pos.position_number < 10 ? '0' + pos.position_number : pos.position_number}-${slot.current_bookings + 1}`;
    const qrToken = `QR-${bookingId}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // 4. Create Appointment
    const newAppt = {
      id: apptId,
      booking_id: bookingId,
      token_number: tokenNumber,
      qr_token: qrToken,
      farmer_id: farmer_id || 'F-1042',
      farmer_name: farmer_name || 'Ramesh Gowda',
      centre_id: slot.centre_id,
      centre_name: centre?.name || 'Procurement Centre',
      slot_id: slot.id,
      position_number: pos.position_number,
      crop_type: crop || 'Paddy (Sona Masoori)',
      declared_quantity_kg: Number(quantity_kg) || 2500,
      status: 'BOOKED',
      created_at: new Date().toISOString()
    };
    this.appointments.set(apptId, newAppt);

    // 5. Update slot position
    pos.status = 'BOOKED';
    pos.appointment_id = apptId;
    pos.booked_by = farmer_id || 'F-1042';
    pos.booked_at = new Date().toISOString();
    this.slot_positions.set(pos.id, pos);

    // 6. Update slot current_bookings and capacity
    slot.current_bookings += 1;
    slot.is_available = slot.current_bookings < slot.maximum_bookings;
    this.slots.set(slot.id, slot);

    // 7. Update centre capacity
    if (centre) {
      centre.booked_capacity_kg += Number(quantity_kg) || 2500;
      this.centres.set(centre.id, centre);
    }

    return {
      success: true,
      appointment: newAppt,
      position: pos,
      slot
    };
  }

  cancelAppointmentPosition(appointmentId) {
    const appt = this.appointments.get(appointmentId);
    if (!appt) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (appt.status === 'CANCELLED') {
      return { success: false, error: 'Appointment is already cancelled.' };
    }

    appt.status = 'CANCELLED';
    this.appointments.set(appointmentId, appt);

    // Find position linked to appointment
    const pos = Array.from(this.slot_positions.values()).find(p => p.appointment_id === appointmentId);
    if (pos) {
      pos.status = 'AVAILABLE';
      pos.appointment_id = null;
      pos.booked_by = null;
      pos.booked_at = null;
      this.slot_positions.set(pos.id, pos);
    }

    // Update slot
    const slot = this.slots.get(appt.slot_id);
    if (slot) {
      slot.current_bookings = Math.max(0, slot.current_bookings - 1);
      slot.is_available = true;
      this.slots.set(slot.id, slot);
    }

    return { success: true, message: 'Appointment cancelled and position freed to AVAILABLE.' };
  }
}

export const db = new AgriFlowDatabase();
