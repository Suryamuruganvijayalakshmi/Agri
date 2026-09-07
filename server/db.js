import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Centre } from './models/Centre.js';
import { Farmer } from './models/Farmer.js';
import { Slot } from './models/Slot.js';
import { SlotPosition } from './models/SlotPosition.js';
import { Appointment } from './models/Appointment.js';
import { Procurement } from './models/Procurement.js';
import { ProcurementEvent } from './models/ProcurementEvent.js';
import { Payment } from './models/Payment.js';
import { ExceptionModel } from './models/Exception.js';
import { Notification } from './models/Notification.js';
import { Product } from './models/Product.js';
import { Weighment } from './models/Weighment.js';
import { QualityInspection } from './models/QualityInspection.js';
import { AuditLog } from './models/AuditLog.js';
import { User } from './models/User.js';
import { LandParcel } from './models/LandParcel.js';
import { CropRecord } from './models/CropRecord.js';
import { HarvestPrediction } from './models/HarvestPrediction.js';
import { resetMongoToCleanState } from './config/dbMongo.js';
import { REAL_COLD_STORAGES_TN } from './real_cold_storages.js';

class AgriFlowMongoDatabase {
  constructor() {
    this.inMemory = false;
  }

  isMongoConnected() {
    return mongoose.connection && mongoose.connection.readyState === 1;
  }

  // Helper method to compute centre utilization
  getCentreUtilization(centre) {
    if (centre.status === 'CLOSED') return { percent: 0, statusCategory: 'CLOSED' };
    const percent = Math.min(100, Math.round(((centre.booked_capacity_kg || 0) / (centre.daily_capacity_kg || 1)) * 100));
    
    let statusCategory = 'GREEN';
    if (percent > 85 || centre.status === 'FULL') {
      statusCategory = 'RED';
    } else if (percent > 60 || centre.status === 'HIGH_LOAD') {
      statusCategory = 'YELLOW';
    }
    
    return { percent, statusCategory };
  }

  async getAllCentres() {
    if (this.isMongoConnected()) {
      const centres = await Centre.find().lean();
      return centres.map(c => {
        const remaining_capacity_kg = Math.max(0, (c.daily_capacity_kg || 50000) - (c.booked_capacity_kg || 0));
        const est_wait_minutes = (c.active_counters || 1) > 0 
          ? Math.round(((c.queue_count || 0) * (c.avg_processing_minutes || 15)) / c.active_counters) 
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
    return [];
  }

  async getCentreById(id) {
    const centres = await this.getAllCentres();
    return centres.find(c => c.id === id) || null;
  }

  // ATOMIC APPOINTMENT BOOKING WITH MONGODB ATOMIC UPDATES
  async bookAppointmentAtomic({ farmer_id, farmer_name, farmer_phone, centre_id, appointment_date, time_slot, quantity_kg, crop }) {
    if (!this.isMongoConnected()) {
      return { success: false, error: 'Database connection offline.' };
    }

    const centre = await Centre.findOne({ id: centre_id });
    if (!centre) {
      return { success: false, error: 'Target procurement centre not found.' };
    }

    if (centre.status === 'CLOSED') {
      return { success: false, error: 'Selected procurement centre is currently closed.' };
    }

    const availableKg = centre.daily_capacity_kg - centre.booked_capacity_kg;
    if (quantity_kg > availableKg) {
      const recommendation = await this.getBestCentreRecommendation({ farmer_lat: centre.latitude, farmer_lng: centre.longitude, quantity_kg });
      return {
        success: false,
        error: `Insufficient remaining capacity. Selected centre has only ${availableKg.toLocaleString()} kg remaining today, but ${quantity_kg.toLocaleString()} kg was requested.`,
        remaining_capacity_kg: availableKg,
        suggested_alternative: recommendation
      };
    }

    // Atomic update on centre capacity
    const newBookedKg = centre.booked_capacity_kg + quantity_kg;
    let newStatus = centre.status;
    if (newBookedKg >= centre.daily_capacity_kg) {
      newStatus = 'FULL';
    } else if (newBookedKg / centre.daily_capacity_kg > 0.6) {
      newStatus = 'HIGH_LOAD';
    }

    const updatedCentreDoc = await Centre.findOneAndUpdate(
      { id: centre_id },
      {
        $inc: { booked_capacity_kg: quantity_kg, queue_count: 1 },
        $set: { status: newStatus, last_updated: new Date() }
      },
      { new: true }
    ).lean();

    const apptId = `APPT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const existingCount = this.isMongoConnected() ? await Appointment.countDocuments({ centre_id }) : 0;
    const codeSuffix = (centre.code || 'PROC-01').split('-')[1] || centre.id.replace('centre-', '0');
    const tokenNumber = `TK-${codeSuffix}-${101 + existingCount}`;

    const newAppt = await Appointment.create({
      id: apptId,
      booking_id: `AGR-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      token_number: tokenNumber,
      qr_token: `QR-${apptId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      farmer_id: farmer_id || 'F-1042',
      farmer_name: farmer_name || 'Farmer',
      farmer_phone: farmer_phone || '+91 98000 00000',
      centre_id,
      centre_name: centre.name,
      appointment_date: appointment_date || new Date().toISOString().split('T')[0],
      time_slot: time_slot || '09:00 AM',
      quantity_kg,
      crop_type: crop || 'Paddy',
      declared_quantity_kg: quantity_kg,
      status: 'BOOKED'
    });

    const procId = `PROC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newProc = await Procurement.create({
      id: procId,
      appointment_id: apptId,
      farmer_id: farmer_id || 'F-1042',
      farmer_name: farmer_name || 'Farmer',
      centre_id,
      centre_name: centre.name,
      crop: crop || 'Paddy',
      quantity_kg,
      actual_weighed_kg: 0,
      quality_grade: 'Pending Verification',
      quality_moisture: 'Pending Measurement',
      status: 'BOOKED'
    });

    const eventId = uuidv4();
    const eventDoc = await ProcurementEvent.create({
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
      notes: `Atomic MongoDB capacity lock succeeded.`
    });

    const payId = `PAY-2026-${Math.floor(100000 + Math.random() * 900000)}`;
    await Payment.create({
      id: payId,
      procurement_id: procId,
      farmer_id: farmer_id || 'F-1042',
      farmer_name: farmer_name || 'Farmer',
      amount: quantity_kg * 22,
      status: 'PENDING',
      reference_number: payId,
      owner: 'Procurement Gate Counter',
      reason: 'Appointment booked. Awaiting farmer arrival and weighing.',
      next_action: 'Weighbridge and Quality Approval',
      bank_account_mask: 'State Bank of India (A/C ending *4902)'
    });

    const notifId = uuidv4();
    await Notification.create({
      id: notifId,
      farmer_id: farmer_id || 'F-1042',
      type: 'APPOINTMENT_CONFIRMED',
      title: `Token ${tokenNumber} Confirmed`,
      message: `Your slot at ${centre.name} for ${quantity_kg.toLocaleString()} kg on ${appointment_date} (${time_slot}) is reserved!`,
      read: false
    });

    const refreshedCentre = await this.getCentreById(centre_id);

    return {
      success: true,
      appointment: newAppt.toObject(),
      procurement: newProc.toObject(),
      updated_centre: refreshedCentre
    };
  }

  // CENTRE-SPECIFIC UNIQUE LIVE QUEUE ENGINE
  async getLiveQueueForCentre(centreId = 'centre-1', targetFarmerId = 'default-farmer') {
    const centre = await this.getCentreById(centreId);
    if (!centre) return null;

    let appts = [];
    if (this.isMongoConnected()) {
      appts = await Appointment.find({ centre_id: centreId, status: { $ne: 'CANCELLED' } })
        .sort({ createdAt: 1 })
        .lean();
    }

    // Number queue positions sequentially (1, 2, 3...) unique to this centre
    const queueEntries = appts.map((a, idx) => {
      const position = idx + 1;
      const waitMins = Math.max(0, Math.round(((position - 1) * (centre.avg_processing_minutes || 15)) / (centre.active_counters || 4)));
      return {
        ...a,
        queue_position: position,
        counter_number: (position % (centre.active_counters || 4)) + 1,
        estimated_wait_minutes: waitMins
      };
    });

    const nowServingEntry = queueEntries.find(q => q.status === 'CHECKED_IN' || q.status === 'WEIGHED' || q.status === 'APPROVED' || q.status === 'IN_TRANSIT') || queueEntries.find(q => q.status === 'BOOKED');
    const farmerEntry = queueEntries.find(q => q.farmer_id === targetFarmerId);

    const peopleAheadCount = farmerEntry ? Math.max(0, farmerEntry.queue_position - (nowServingEntry ? nowServingEntry.queue_position : 1)) : 0;
    const estWait = farmerEntry ? Math.round((peopleAheadCount * (centre.avg_processing_minutes || 15)) / (centre.active_counters || 4)) : 0;

    return {
      success: true,
      centre_id: centre.id,
      centre_name: centre.name,
      centre_code: centre.code,
      total_queue_count: queueEntries.length,
      active_counters: centre.active_counters || 4,
      avg_processing_minutes: centre.avg_processing_minutes || 15,
      now_serving: nowServingEntry ? nowServingEntry.token_number : 'NONE',
      now_serving_farmer: nowServingEntry ? nowServingEntry.farmer_name : 'None',
      now_serving_status: nowServingEntry ? nowServingEntry.status : 'NO_ACTIVE_TOKEN',
      your_token: farmerEntry ? farmerEntry.token_number : 'NOT_BOOKED',
      your_position: farmerEntry ? farmerEntry.queue_position : 0,
      people_ahead: peopleAheadCount,
      estimated_wait_minutes: estWait,
      queue_entries: queueEntries
    };
  }

  // ADVANCE LIVE QUEUE FOR A CENTRE (Yard Operator Controls)
  async advanceQueueForCentre({ centre_id = 'centre-1', token_number, new_status = 'CHECKED_IN' }) {
    if (!this.isMongoConnected()) {
      return { success: false, error: 'Database connection offline' };
    }

    let appt;
    if (token_number) {
      appt = await Appointment.findOne({ centre_id, token_number });
    } else {
      // Find earliest active appointment that is still BOOKED or CHECKED_IN
      appt = await Appointment.findOne({ centre_id, status: { $in: ['BOOKED', 'CHECKED_IN'] } }).sort({ createdAt: 1 });
    }

    if (!appt) {
      const centre = await this.getCentreById(centre_id);
      const codeSuffix = (centre?.code || 'PROC-01').split('-')[1] || '01';
      const seeded = await Appointment.create([
        {
          id: `APPT-BASE-${centre_id}-1`,
          booking_id: `AGR-2026-${Math.floor(10000 + Math.random() * 89999)}`,
          token_number: `TK-${codeSuffix}-101`,
          farmer_id: 'F-101',
          farmer_name: 'Siddappa Gowda',
          farmer_phone: '+91 98450 11111',
          centre_id,
          centre_name: centre ? centre.name : 'Procurement Yard',
          appointment_date: new Date().toISOString().split('T')[0],
          time_slot: '08:30 AM',
          crop_type: 'Paddy (Sona Masoori)',
          declared_quantity_kg: 3500,
          quantity_kg: 3500,
          status: 'BOOKED'
        },
        {
          id: `APPT-BASE-${centre_id}-2`,
          booking_id: `AGR-2026-${Math.floor(10000 + Math.random() * 89999)}`,
          token_number: `TK-${codeSuffix}-102`,
          farmer_id: 'F-102',
          farmer_name: 'Kumar Swamy',
          farmer_phone: '+91 98450 22222',
          centre_id,
          centre_name: centre ? centre.name : 'Procurement Yard',
          appointment_date: new Date().toISOString().split('T')[0],
          time_slot: '09:00 AM',
          crop_type: 'Groundnut',
          declared_quantity_kg: 2200,
          quantity_kg: 2200,
          status: 'BOOKED'
        }
      ]);
      appt = seeded[0];
    }

    appt.status = new_status;
    await appt.save();

    // Also update matching Procurement document if present
    const proc = await Procurement.findOne({ appointment_id: appt.id });
    if (proc) {
      proc.status = new_status;
      await proc.save();
    }

    const updatedQueue = await this.getLiveQueueForCentre(centre_id);
    return {
      success: true,
      message: `Token ${appt.token_number} status updated to ${new_status}`,
      appointment: appt.toObject(),
      queue: updatedQueue
    };
  }

  async getBestCentreRecommendation({ farmer_lat = 12.5200, farmer_lng = 76.8900, quantity_kg = 2500 }) {
    const centres = (await this.getAllCentres()).filter(c => c.status !== 'CLOSED');
    if (centres.length === 0) return null;

    const calcDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
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

  async getGoIntelligence(centreId) {
    const centre = await this.getCentreById(centreId);
    if (!centre) return null;

    let decision = 'GO';
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
      recommendation_notes.push(`Consider rescheduling to nearby available depot`);
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

  async updateCentreStatusByOperator(centreId, updateFields) {
    if (!this.isMongoConnected()) return null;

    const fieldsToUpdate = { last_updated: new Date() };
    if (updateFields.status !== undefined) fieldsToUpdate.status = updateFields.status;
    if (updateFields.daily_capacity_kg !== undefined) fieldsToUpdate.daily_capacity_kg = Number(updateFields.daily_capacity_kg);
    if (updateFields.booked_capacity_kg !== undefined) fieldsToUpdate.booked_capacity_kg = Number(updateFields.booked_capacity_kg);
    if (updateFields.active_counters !== undefined) fieldsToUpdate.active_counters = Number(updateFields.active_counters);
    if (updateFields.avg_processing_minutes !== undefined) fieldsToUpdate.avg_processing_minutes = Number(updateFields.avg_processing_minutes);

    await Centre.updateOne({ id: centreId }, { $set: fieldsToUpdate });
    return await this.getCentreById(centreId);
  }

  async updateProcurementStage({ procurement_id, new_status, actual_weighed_kg, quality_grade, quality_moisture, actor_id, actor_name, actor_role, reason, owner, next_action, notes }) {
    if (!this.isMongoConnected()) return null;

    const proc = await Procurement.findOne({ id: procurement_id });
    if (!proc) return null;

    const previous_status = proc.status;
    proc.status = new_status;
    if (actual_weighed_kg) proc.actual_weighed_kg = actual_weighed_kg;
    if (quality_grade) proc.quality_grade = quality_grade;
    if (quality_moisture) proc.quality_moisture = quality_moisture;
    await proc.save();

    const eventId = uuidv4();
    const eventDoc = await ProcurementEvent.create({
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
      notes: notes || ''
    });

    let paymentDoc = await Payment.findOne({ procurement_id });
    if (paymentDoc) {
      if (new_status === 'APPROVED') {
        paymentDoc.status = 'PROCESSING';
        paymentDoc.owner = 'State Agriculture Treasury Cell';
        paymentDoc.reason = 'Procurement administrative approval complete. DBT voucher dispatched.';
        paymentDoc.next_action = 'Bank account credit transfer';
        paymentDoc.amount = (proc.actual_weighed_kg || proc.quantity_kg) * 22;
        await paymentDoc.save();
      } else if (new_status === 'PAID') {
        paymentDoc.status = 'PAID';
        paymentDoc.owner = 'State Bank of India Direct Benefit Transfer';
        paymentDoc.reason = 'Funds credited to Aadhaar-seeded bank account successfully.';
        paymentDoc.next_action = 'Transaction completed. Digital receipt issued.';
        paymentDoc.completed_at = new Date();
        await paymentDoc.save();
      }
    }

    const notifId = uuidv4();
    await Notification.create({
      id: notifId,
      farmer_id: proc.farmer_id,
      type: 'STATUS_UPDATE',
      title: `Procurement Update: ${new_status.replace('_', ' ')}`,
      message: `Your procurement at ${proc.centre_name} is now ${new_status.replace('_', ' ')}. ${next_action ? 'Next step: ' + next_action : ''}`,
      read: false
    });

    return {
      procurement: proc.toObject(),
      event: eventDoc.toObject(),
      payment: paymentDoc ? paymentDoc.toObject() : null
    };
  }

  async createException({ farmer_id, farmer_name, centre_id, centre_name, procurement_id, type, severity, reason, owner, next_action }) {
    if (!this.isMongoConnected()) return null;

    const exId = `EXC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newEx = await ExceptionModel.create({
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
      next_action: next_action || 'Field inspection & override review'
    });

    const notifId = uuidv4();
    await Notification.create({
      id: notifId,
      farmer_id: newEx.farmer_id,
      type: 'EXCEPTION_ALERT',
      title: `Action Required: Exception Logged`,
      message: `Issue logged for your procurement: ${reason}. Managed by: ${owner}.`,
      read: false
    });

    return newEx.toObject();
  }

  async resolveException(exceptionId, resolutionNotes) {
    if (!this.isMongoConnected()) return null;

    const ex = await ExceptionModel.findOne({ id: exceptionId });
    if (!ex) return null;

    ex.status = 'RESOLVED';
    ex.resolved_at = new Date();
    ex.next_action = `Resolved: ${resolutionNotes || 'Operational clearance granted'}`;
    await ex.save();

    return ex.toObject();
  }

  async getFarmerTimeline(farmerId) {
    if (!this.isMongoConnected()) {
      return { farmer_id: farmerId, appointments: [], procurements: [], active_procurement: null, events: [], payments: [], exceptions: [], notifications: [] };
    }

    const appointments = await Appointment.find({ farmer_id: farmerId }).lean();
    const procurements = await Procurement.find({ farmer_id: farmerId }).lean();
    const payments = await Payment.find({ farmer_id: farmerId }).lean();
    const exceptions = await ExceptionModel.find({ farmer_id: farmerId }).lean();
    const notifications = await Notification.find({ farmer_id: farmerId }).sort({ createdAt: -1 }).lean();

    const activeProc = procurements.find(p => p.status !== 'PAID') || procurements[0];
    let events = [];
    if (activeProc) {
      events = await ProcurementEvent.find({ procurement_id: activeProc.id }).sort({ createdAt: 1 }).lean();
    }

    return {
      farmer_id: farmerId,
      appointments,
      procurements,
      active_procurement: activeProc || null,
      events,
      payments,
      exceptions,
      notifications
    };
  }

  async getAdminDashboardMetrics() {
    const centres = await this.getAllCentres();
    const totalCentres = centres.length;
    const operationalCount = centres.filter(c => c.status === 'OPEN').length;
    const highLoadCount = centres.filter(c => c.color_status === 'YELLOW').length;
    const fullCount = centres.filter(c => c.color_status === 'RED').length;
    const closedCount = centres.filter(c => c.status === 'CLOSED').length;

    const totalCapacityKg = centres.reduce((sum, c) => sum + (c.daily_capacity_kg || 0), 0);
    const totalBookedKg = centres.reduce((sum, c) => sum + (c.booked_capacity_kg || 0), 0);
    const totalProcuredKg = centres.reduce((sum, c) => sum + (c.today_procured_kg || 0), 0);
    const totalQueueCount = centres.reduce((sum, c) => sum + (c.queue_count || 0), 0);

    const avgWaitMinutes = Math.round(
      centres.reduce((sum, c) => sum + (c.est_wait_minutes || 0), 0) / (totalCentres || 1)
    );

    const pendingApprovals = await Procurement.countDocuments({ status: { $in: ['APPROVAL_PENDING', 'QUALITY_VERIFICATION'] } });
    const pendingPayments = await Payment.countDocuments({ status: { $in: ['PROCESSING', 'PENDING'] } });
    const unresolvedExceptions = await ExceptionModel.countDocuments({ status: { $ne: 'RESOLVED' } });
    const recentEvents = await ProcurementEvent.find().sort({ createdAt: -1 }).limit(10).lean();
    const exceptions = await ExceptionModel.find().lean();

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
      exceptions
    };
  }

  // --- SLOT & 20-POSITION GRID MONGODB METHODS ---

  async getSlotsForCentre(centreId, dateStr) {
    if (!this.isMongoConnected()) return [];

    const todayStr = dateStr || new Date().toISOString().split('T')[0];
    const slots = await Slot.find({ centre_id: centreId, slot_date: todayStr }).lean();

    const result = [];
    for (const s of slots) {
      const positions = await SlotPosition.find({ slot_id: s.id }).lean();
      const bookedCount = positions.filter(p => p.status === 'BOOKED').length;
      const availCount = positions.filter(p => p.status === 'AVAILABLE').length;

      result.push({
        ...s,
        current_bookings: bookedCount,
        available_positions_count: availCount,
        is_available: availCount > 0 && bookedCount < s.maximum_bookings
      });
    }
    return result;
  }

  async getSlotPositions(slotId) {
    if (!this.isMongoConnected()) return [];
    return await SlotPosition.find({ slot_id: slotId }).sort({ position_number: 1 }).lean();
  }

  // ATOMIC POSITION BOOKING RPC IN MONGODB
  async bookAppointmentPosition({ farmer_id, farmer_name, slot_id, position_id, position_number, crop, quantity_kg }) {
    if (!this.isMongoConnected()) {
      return { success: false, error: 'Database disconnected.' };
    }

    let posFilter = {};
    if (position_id) {
      posFilter = { id: position_id };
    } else if (slot_id && position_number) {
      posFilter = { slot_id, position_number: Number(position_number) };
    } else {
      return { success: false, error: 'Invalid position identifier.' };
    }

    // Atomic update on SlotPosition to lock AVAILABLE status
    const updatedPos = await SlotPosition.findOneAndUpdate(
      { ...posFilter, status: 'AVAILABLE' },
      {
        $set: {
          status: 'BOOKED',
          booked_by: farmer_id || 'F-1042',
          booked_at: new Date()
        }
      },
      { new: true }
    );

    if (!updatedPos) {
      return { success: false, error: 'Position already booked or invalid. Please select another position.' };
    }

    const slot = await Slot.findOne({ id: updatedPos.slot_id });
    if (!slot) {
      return { success: false, error: 'Target slot does not exist.' };
    }

    const centre = await Centre.findOne({ id: slot.centre_id });
    const apptId = `APPT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookingId = `AGR-2026-${Math.floor(10000 + Math.random() * 89999)}`;
    const tokenNumber = `T-${updatedPos.position_number < 10 ? '0' + updatedPos.position_number : updatedPos.position_number}-${(slot.current_bookings || 0) + 1}`;
    const qrToken = `QR-${bookingId}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const newAppt = await Appointment.create({
      id: apptId,
      booking_id: bookingId,
      token_number: tokenNumber,
      qr_token: qrToken,
      farmer_id: farmer_id || 'F-1042',
      farmer_name: farmer_name || 'Ramesh Gowda',
      centre_id: slot.centre_id,
      centre_name: centre?.name || 'Procurement Centre',
      slot_id: slot.id,
      position_number: updatedPos.position_number,
      crop_type: crop || 'Paddy (Sona Masoori)',
      declared_quantity_kg: Number(quantity_kg) || 2500,
      status: 'BOOKED'
    });

    // Link position to appointment
    updatedPos.appointment_id = apptId;
    await updatedPos.save();

    // Update slot counts
    slot.current_bookings += 1;
    slot.is_available = slot.current_bookings < slot.maximum_bookings;
    await slot.save();

    // Update centre capacity
    if (centre) {
      centre.booked_capacity_kg += Number(quantity_kg) || 2500;
      await centre.save();
    }

    return {
      success: true,
      appointment: newAppt.toObject(),
      position: updatedPos.toObject(),
      slot: slot.toObject()
    };
  }

  async cancelAppointmentPosition(appointmentId) {
    if (!this.isMongoConnected()) return { success: false, error: 'Database offline' };

    const appt = await Appointment.findOne({ id: appointmentId });
    if (!appt) return { success: false, error: 'Appointment not found.' };

    if (appt.status === 'CANCELLED') return { success: false, error: 'Appointment is already cancelled.' };

    appt.status = 'CANCELLED';
    await appt.save();

    const pos = await SlotPosition.findOne({ appointment_id: appointmentId });
    if (pos) {
      pos.status = 'AVAILABLE';
      pos.appointment_id = null;
      pos.booked_by = null;
      pos.booked_at = null;
      await pos.save();
    }

    const slot = await Slot.findOne({ id: appt.slot_id });
    if (slot) {
      slot.current_bookings = Math.max(0, slot.current_bookings - 1);
      slot.is_available = true;
      await slot.save();
    }

    return { success: true, message: 'Appointment cancelled and slot position released.' };
  }

  async getAllProducts() {
    if (!this.isMongoConnected()) return [];
    return await Product.find().lean();
  }

  async addProduct(data) {
    if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };

    const prodId = `PROD-2026-${Math.floor(100 + Math.random() * 900)}`;
    const product = await Product.create({
      id: prodId,
      name: data.name,
      category: data.category || 'Grain',
      package_weight_kg: Number(data.package_weight_kg) || 50,
      msp_price_per_kg: Number(data.msp_price_per_kg) || 22,
      moisture_threshold_percent: Number(data.moisture_threshold_percent) || 14,
      status: 'APPROVED',
      proposed_by: data.proposed_by || 'Admin'
    });

    return { success: true, product: product.toObject() };
  }

  async approveProduct(productId) {
    if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
    const prod = await Product.findOneAndUpdate({ id: productId }, { status: 'APPROVED' }, { new: true });
    return { success: true, product: prod ? prod.toObject() : null };
  }

  async rejectProduct(productId) {
    if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
    const prod = await Product.findOneAndUpdate({ id: productId }, { status: 'REJECTED' }, { new: true });
    return { success: true, product: prod ? prod.toObject() : null };
  }

  async addWeighment(data) {
    if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
    const weighId = uuidv4();
    const diff = Number(data.measured_quantity_kg) - Number(data.declared_quantity_kg);
    const weighment = await Weighment.create({
      id: weighId,
      appointment_id: data.appointment_id,
      declared_quantity_kg: Number(data.declared_quantity_kg),
      measured_quantity_kg: Number(data.measured_quantity_kg),
      difference_kg: diff,
      machine_id: data.machine_id || 'WEIGHBRIDGE-01',
      operator_name: data.operator_name || 'Yard Weighmaster'
    });
    return { success: true, weighment: weighment.toObject() };
  }

  async addQualityInspection(data) {
    if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
    const qId = uuidv4();
    const inspection = await QualityInspection.create({
      id: qId,
      appointment_id: data.appointment_id,
      moisture_percent: Number(data.moisture_percent),
      foreign_matter_percent: Number(data.foreign_matter_percent) || 0.5,
      damaged_percent: Number(data.damaged_percent) || 0.2,
      grade: data.grade || 'Grade A',
      remarks: data.remarks || 'Standard MSP Quality Verified',
      status: data.status || 'ACCEPTED',
      inspector_name: data.inspector_name || 'Senior Quality Inspector'
    });
    return { success: true, inspection: inspection.toObject() };
  }

  async getAuditLogs() {
    if (!this.isMongoConnected()) return [];
    return await AuditLog.find().sort({ createdAt: -1 }).limit(50).lean();
  }

  // ============================================================
  // AI-POWERED DIGITAL LAND & CROP INTELLIGENCE METHODS
  // ============================================================

  async getLandParcels(farmerId) {
    if (!this.isMongoConnected()) {
      return this.getSampleLandParcels(farmerId);
    }
    const query = (farmerId && farmerId !== 'all') 
      ? { $or: [{ farmer_id: farmerId }, { farmer_id: 'default-farmer' }] } 
      : {};
    let parcels = await LandParcel.find(query).lean();
    if (!parcels || parcels.length === 0) {
      parcels = this.getSampleLandParcels(farmerId);
    }
    return parcels;
  }

  getSampleLandParcels(farmerId) {
    return [
      {
        id: 'parcel-101',
        farmer_id: farmerId || 'default-farmer',
        survey_number: '142/2B',
        parcel_id: 'KA-MND-2026-8819',
        owner_name: 'Surya.V.M',
        state: 'Karnataka',
        district: 'Mandya',
        village: 'Mandya Rural',
        total_area_acres: 4.5,
        cultivable_area_acres: 4.5,
        polygon_coordinates: [
          [12.5255, 76.8940],
          [12.5270, 76.8970],
          [12.5245, 76.8990],
          [12.5230, 76.8955]
        ],
        verification_status: 'VERIFIED',
        govt_source: 'Bhoomi RTC Database (Simulated API)'
      },
      {
        id: 'parcel-102',
        farmer_id: farmerId || 'default-farmer',
        survey_number: '89/1A',
        parcel_id: 'KA-MDR-2026-4402',
        owner_name: 'Surya.V.M',
        state: 'Karnataka',
        district: 'Mandya',
        village: 'Maddur Village',
        total_area_acres: 3.2,
        cultivable_area_acres: 3.0,
        polygon_coordinates: [
          [12.5870, 77.0420],
          [12.5890, 77.0450],
          [12.5860, 77.0470],
          [12.5840, 77.0435]
        ],
        verification_status: 'VERIFIED',
        govt_source: 'Bhoomi RTC Database (Simulated API)'
      },
      {
        id: 'parcel-103',
        farmer_id: farmerId || 'default-farmer',
        survey_number: '210/4C',
        parcel_id: 'TN-ERD-2026-9931',
        owner_name: 'Surya.V.M',
        state: 'Tamil Nadu',
        district: 'Erode',
        village: 'Erode North',
        total_area_acres: 5.0,
        cultivable_area_acres: 4.8,
        polygon_coordinates: [
          [11.3430, 77.7180],
          [11.3460, 77.7220],
          [11.3420, 77.7250],
          [11.3390, 77.7200]
        ],
        verification_status: 'VERIFIED',
        govt_source: 'Tamil Nadu e-Patta Govt Portal (Simulated API)'
      }
    ];
  }

  async verifyGovtLandRecord({ survey_number, state, district }) {
    // Simulated Government Land Record Search (Bhoomi / RTC / Patta)
    const surveyClean = (survey_number || '142/2B').trim();
    
    if (this.isMongoConnected()) {
      const existing = await LandParcel.findOne({ survey_number: surveyClean }).lean();
      if (existing) {
        return { success: true, parcel: existing, message: 'Government land record verified successfully.' };
      }
    }

    const stateToUse = state || 'Karnataka';
    const distToUse = district || 'Mandya';
    const isKA = stateToUse.toLowerCase().includes('karnataka');
    
    const centerLat = isKA ? 12.5230 : 11.3410;
    const centerLng = isKA ? 76.8950 : 77.7210;

    const mockParcel = {
      id: `parcel-${Math.floor(1000 + Math.random() * 9000)}`,
      farmer_id: 'default-farmer',
      survey_number: surveyClean,
      parcel_id: `${isKA ? 'KA-MND' : 'TN-ERD'}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      owner_name: 'Verified Land Owner',
      state: stateToUse,
      district: distToUse,
      village: isKA ? 'Mandya Rural' : 'Erode North',
      total_area_acres: 4.5,
      cultivable_area_acres: 4.2,
      polygon_coordinates: [
        [centerLat, centerLng],
        [centerLat + 0.003, centerLng + 0.003],
        [centerLat - 0.001, centerLng + 0.005],
        [centerLat - 0.002, centerLng + 0.001]
      ],
      verification_status: 'VERIFIED',
      govt_source: isKA ? 'Bhoomi RTC Database (Simulated API)' : 'Tamil Nadu e-Patta Govt Portal (Simulated API)'
    };

    return { success: true, parcel: mockParcel, message: 'Government land record fetched and verified successfully.' };
  }

  async registerLandParcel(data) {
    if (!this.isMongoConnected()) {
      return { success: true, parcel: data };
    }
    const pId = data.id || `parcel-${uuidv4().substring(0, 8)}`;
    const parcel = await LandParcel.create({
      id: pId,
      farmer_id: data.farmer_id || 'default-farmer',
      survey_number: data.survey_number,
      parcel_id: data.parcel_id || `PARCEL-${Math.floor(100000 + Math.random() * 900000)}`,
      owner_name: data.owner_name || 'Surya.V.M',
      state: data.state || 'Karnataka',
      district: data.district || 'Mandya',
      village: data.village || 'Mandya Rural',
      total_area_acres: Number(data.total_area_acres) || 4.5,
      cultivable_area_acres: Number(data.cultivable_area_acres) || 4.5,
      polygon_coordinates: data.polygon_coordinates || [[12.5255, 76.8940], [12.5270, 76.8970], [12.5245, 76.8990], [12.5230, 76.8955]],
      verification_status: 'VERIFIED',
      govt_source: data.govt_source || 'Bhoomi RTC Database (Simulated API)'
    });
    return { success: true, parcel: parcel.toObject() };
  }

  async deleteLandParcel(parcelId) {
    if (this.isMongoConnected()) {
      await LandParcel.deleteOne({ id: parcelId });
      await CropRecord.deleteMany({ parcel_id: parcelId });
    }
    return { success: true, message: 'Land parcel removed successfully.' };
  }

  // AI HARVEST PREDICTION ENGINE LOGIC
  async registerCropAndPredict(data) {
    const cId = `crop-${uuidv4().substring(0, 8)}`;
    const pId = `pred-${uuidv4().substring(0, 8)}`;

    const cropName = data.crop_name || 'Paddy (Sona Masoori)';
    const acres = Number(data.cultivated_area_acres) || 2.5;
    const sowingDate = data.sowing_date || new Date().toISOString().split('T')[0];
    const irrigation = data.irrigation_type || 'CANAL';

    // Look up land parcel details to find exact location (village, district, coordinates)
    let parcel = null;
    if (this.isMongoConnected() && data.parcel_id) {
      parcel = await LandParcel.findOne({ id: data.parcel_id }).lean();
    }
    const village = parcel?.village || 'Mandya Rural';
    const district = parcel?.district || 'Mandya';
    const surveyNumber = parcel?.survey_number || 'FIELD-142/2B';
    const ownerName = parcel?.owner_name || 'Surya.V.M';
    const parcelCoords = (parcel && parcel.polygon_coordinates && parcel.polygon_coordinates[0])
      ? parcel.polygon_coordinates[0]
      : [12.5255, 76.8940];

    // Find Nearest Procurement Centre
    const centres = await this.getAllCentres();
    let assignedCentre = centres[0] || { id: 'centre-1', name: 'Mandya Central Procurement Yard', latitude: 12.5224, longitude: 76.8974 };
    let minDistance = 999;

    const calcDist = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 10) / 10;
    };

    if (centres && centres.length > 0) {
      for (const c of centres) {
        const d = calcDist(parcelCoords[0], parcelCoords[1], c.latitude || 12.5255, c.longitude || 76.8940);
        if (d < minDistance) {
          minDistance = d;
          assignedCentre = c;
        }
      }
    }
    if (minDistance === 999) minDistance = 3.2;

    // 1. Calculate Days to Harvest Maturity based on agronomy models
    let maturityDays = 115; // default Paddy
    let yieldFactorPerAcreKg = 1800; // 1.8 tonnes/acre baseline

    const cropLower = cropName.toLowerCase();
    if (cropLower.includes('paddy') || cropLower.includes('rice')) {
      maturityDays = 115;
      yieldFactorPerAcreKg = 1800;
    } else if (cropLower.includes('groundnut') || cropLower.includes('peanut')) {
      maturityDays = 110;
      yieldFactorPerAcreKg = 1000;
    } else if (cropLower.includes('maize') || cropLower.includes('corn')) {
      maturityDays = 100;
      yieldFactorPerAcreKg = 2200;
    } else if (cropLower.includes('sugarcane')) {
      maturityDays = 300;
      yieldFactorPerAcreKg = 35000;
    } else { // Vegetables / Pulses
      maturityDays = 65;
      yieldFactorPerAcreKg = 1200;
    }

    // Irrigation Multiplier
    let irrMult = 1.0;
    if (irrigation === 'CANAL') irrMult = 1.15;
    else if (irrigation === 'DRIP') irrMult = 1.25;
    else if (irrigation === 'BOREWELL') irrMult = 1.10;
    else if (irrigation === 'RAINFED') irrMult = 0.85;

    // Soil Quality Multiplier
    const soilMult = 1.05;

    // Estimated Yield in Kg
    const baseEstimatedKg = Math.round(acres * yieldFactorPerAcreKg * irrMult * soilMult);
    const minYieldKg = Math.round(baseEstimatedKg * 0.92);
    const maxYieldKg = Math.round(baseEstimatedKg * 1.08);

    // Compute expected harvest start and end dates
    const sowingTime = new Date(sowingDate).getTime();
    const harvestStartMs = sowingTime + (maturityDays * 24 * 60 * 60 * 1000);
    const harvestEndMs = harvestStartMs + (7 * 24 * 60 * 60 * 1000);

    const harvestStartStr = new Date(harvestStartMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const harvestEndStr = new Date(harvestEndMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // Influencing Factors Breakdown
    const influencingFactors = [
      { factor_name: 'Optimal Sowing Window', impact: '+5%', description: 'Sowing date matches seasonal climate recommendation' },
      { factor_name: `${irrigation} Irrigation`, impact: `${irrMult > 1 ? '+' : ''}${Math.round((irrMult - 1) * 100)}%`, description: 'Water availability index for target crop' },
      { factor_name: 'NDVI Vegetation Index', impact: '+6%', description: 'Remote-sensing satellite indicator rating 0.82 (Healthy Canopy)' },
      { factor_name: 'Soil Organic Matter', impact: '+4%', description: 'Clay Loam soil profile supports high moisture retention' },
      { factor_name: 'Nearby Centre Assigned', impact: 'Pre-Book', description: `${assignedCentre.name} (${minDistance} km away) pre-allocated capacity for harvest window` }
    ];

    const cropObj = {
      id: cId,
      parcel_id: data.parcel_id || 'parcel-101',
      farmer_id: data.farmer_id || 'default-farmer',
      farmer_name: ownerName,
      farmer_phone: '+91 98450 12345',
      survey_number: surveyNumber,
      village,
      district,
      crop_name: cropName,
      crop_variety: data.crop_variety || 'Sona Masoori (Super Fine)',
      sowing_date: sowingDate,
      cultivated_area_acres: acres,
      irrigation_type: irrigation,
      soil_type: data.soil_type || 'Clay Loam',
      cultivation_method: data.cultivation_method || 'CONVENTIONAL',
      expected_harvest_start: harvestStartStr,
      expected_harvest_end: harvestEndStr,
      estimated_yield_kg: baseEstimatedKg,
      prediction_confidence: 87,
      assigned_centre_id: assignedCentre.id,
      assigned_centre_name: assignedCentre.name,
      assigned_centre_distance_km: minDistance,
      eligible_slot_start_date: harvestStartStr,
      eligible_slot_end_date: harvestEndStr,
      slot_booking_opens_date: harvestStartStr,
      status: 'CULTIVATING'
    };

    const predictionObj = {
      id: pId,
      crop_record_id: cId,
      farmer_id: data.farmer_id || 'default-farmer',
      farmer_name: ownerName,
      farmer_phone: '+91 98450 12345',
      survey_number: surveyNumber,
      village,
      district,
      crop_name: cropName,
      cultivated_area_acres: acres,
      expected_harvest_start: harvestStartStr,
      expected_harvest_end: harvestEndStr,
      estimated_yield_min_kg: minYieldKg,
      estimated_yield_max_kg: maxYieldKg,
      confidence_percent: 87,
      ndvi_index: 0.82,
      assigned_centre_id: assignedCentre.id,
      assigned_centre_name: assignedCentre.name,
      assigned_centre_distance_km: minDistance,
      eligible_slot_start_date: harvestStartStr,
      eligible_slot_end_date: harvestEndStr,
      slot_booking_opens_date: harvestStartStr,
      influencing_factors: influencingFactors
    };

    if (this.isMongoConnected()) {
      await CropRecord.create(cropObj);
      await HarvestPrediction.create(predictionObj);

      // Create notification for Nearby Centre & Farmer
      await Notification.create({
        id: uuidv4(),
        farmer_id: data.farmer_id || 'default-farmer',
        type: 'CROP_CULTIVATED_CENTRE_NOTIFIED',
        title: `🌾 Cultivation Details Sent to ${assignedCentre.name}`,
        message: `Your cultivation of ${acres} Acres of ${cropName} in ${village} has been registered! ${assignedCentre.name} (${minDistance} km away) has received your predicted harvest window (${harvestStartStr} - ${harvestEndStr}) and estimated yield of ${(baseEstimatedKg/1000).toFixed(2)} Tonnes for slot booking.`,
        read: false
      });
    }

    return {
      success: true,
      crop: cropObj,
      prediction: predictionObj
    };
  }

  async getIncomingCultivationsForCentre(centreId) {
    if (this.isMongoConnected()) {
      const query = (centreId && centreId !== 'all') 
        ? { assigned_centre_id: centreId } 
        : {};
      const crops = await CropRecord.find(query).sort({ created_at: -1 }).lean();
      return crops;
    }
    return [];
  }

  async getCropRecords(farmerId) {
    if (this.isMongoConnected()) {
      const query = (farmerId && farmerId !== 'all')
        ? { $or: [{ farmer_id: farmerId }, { farmer_id: 'default-farmer' }] }
        : {};
      const crops = await CropRecord.find(query).lean();
      if (crops && crops.length > 0) {
        return crops;
      }
    }
    // Return sample baseline crops for rich UI demo
    return [
      {
        id: 'crop-1',
        parcel_id: 'parcel-101',
        farmer_id: farmerId || 'default-farmer',
        crop_name: 'Paddy (Sona Masoori)',
        crop_variety: 'Super Fine Grade A',
        sowing_date: '2026-07-15',
        cultivated_area_acres: 2.5,
        irrigation_type: 'CANAL',
        soil_type: 'Clay Loam',
        cultivation_method: 'CONVENTIONAL',
        expected_harvest_start: '18 Nov 2026',
        expected_harvest_end: '24 Nov 2026',
        estimated_yield_kg: 4350,
        prediction_confidence: 87,
        status: 'CULTIVATING'
      },
      {
        id: 'crop-2',
        parcel_id: 'parcel-101',
        farmer_id: farmerId || 'default-farmer',
        crop_name: 'Groundnut (TMV 7)',
        crop_variety: 'High Oil Content',
        sowing_date: '2026-08-01',
        cultivated_area_acres: 1.0,
        irrigation_type: 'BOREWELL',
        soil_type: 'Red Sandy Loam',
        cultivation_method: 'ORGANIC',
        expected_harvest_start: '20 Nov 2026',
        expected_harvest_end: '27 Nov 2026',
        estimated_yield_kg: 1100,
        prediction_confidence: 89,
        status: 'CULTIVATING'
      },
      {
        id: 'crop-3',
        parcel_id: 'parcel-101',
        farmer_id: farmerId || 'default-farmer',
        crop_name: 'Organic Vegetables',
        crop_variety: 'Tomato & Beans',
        sowing_date: '2026-09-01',
        cultivated_area_acres: 1.0,
        irrigation_type: 'DRIP',
        soil_type: 'Loamy Soil',
        cultivation_method: 'ORGANIC',
        expected_harvest_start: '05 Nov 2026',
        expected_harvest_end: '12 Nov 2026',
        estimated_yield_kg: 1400,
        prediction_confidence: 92,
        status: 'CULTIVATING'
      }
    ];
  }

  // REGIONAL PROCUREMENT FORECASTING & CAPACITY PLANNING
  async getDistrictProcurementForecast(district = 'Mandya') {
    let crops = await this.getCropRecords('all');
    let centres = await this.getAllCentres();

    // Aggregate crop statistics
    let totalCultivatedAcres = 0;
    let totalExpectedTonnes = 0;
    const cropWiseMap = {};

    crops.forEach(c => {
      totalCultivatedAcres += Number(c.cultivated_area_acres || 0);
      const tonnage = (Number(c.estimated_yield_kg || 0) / 1000);
      totalExpectedTonnes += tonnage;

      const name = c.crop_name || 'Other';
      if (!cropWiseMap[name]) {
        cropWiseMap[name] = { crop_name: name, acres: 0, tonnage: 0, farmers: 0 };
      }
      cropWiseMap[name].acres += Number(c.cultivated_area_acres || 0);
      cropWiseMap[name].tonnage += tonnage;
      cropWiseMap[name].farmers += 1;
    });

    // Ensure baseline demo figures for state/district level forecast view
    const cropWiseForecast = Object.values(cropWiseMap);
    if (cropWiseForecast.length < 3) {
      cropWiseForecast.push(
        { crop_name: 'Paddy (Sona Masoori)', acres: 680, tonnage: 1240, farmers: 420 },
        { crop_name: 'Groundnut (TMV 7)', acres: 240, tonnage: 260, farmers: 180 },
        { crop_name: 'Organic Vegetables', acres: 190, tonnage: 210, farmers: 150 },
        { crop_name: 'Sugarcane', acres: 310, tonnage: 10850, farmers: 210 }
      );
    }

    // Weekly harvest arrival timeline (Next 4 Weeks)
    const weeklyForecast = [
      { week: 'Week 1 (Nov 01 - Nov 07)', expected_tonnage: 280, expected_farmers: 95 },
      { week: 'Week 2 (Nov 08 - Nov 14)', expected_tonnage: 420, expected_farmers: 140 },
      { week: 'Week 3 (Nov 15 - Nov 21)', expected_tonnage: 690, expected_farmers: 230 }, // Peak
      { week: 'Week 4 (Nov 22 - Nov 28)', expected_tonnage: 350, expected_farmers: 110 }
    ];

    // Centre-wise demand & capacity forecast
    const centreDemands = centres.map(c => {
      const dailyCapTonnes = Math.round((c.daily_capacity_kg || 50000) / 1000);
      const predictedDemandTonnes = Math.round(dailyCapTonnes * 1.35); // 135% peak congestion predicted
      return {
        centre_id: c.id,
        name: c.name,
        district: c.district,
        current_daily_capacity_tonnes: dailyCapTonnes,
        predicted_peak_demand_tonnes: predictedDemandTonnes,
        congestion_risk: predictedDemandTonnes > dailyCapTonnes ? 'HIGH' : 'MODERATE',
        recommended_extra_counters: predictedDemandTonnes > dailyCapTonnes ? 2 : 1,
        recommended_slot_expansion: '+25%'
      };
    });

    // Hourly arrival distribution recommendation
    const hourlyArrivals = [
      { time: '08:00 AM - 10:00 AM', arrival_share: '25%', status: 'Normal' },
      { time: '10:00 AM - 01:00 PM', arrival_share: '55%', status: 'Predicted Congestion Peak' },
      { time: '01:00 PM - 04:00 PM', arrival_share: '15%', status: 'Moderate' },
      { time: '04:00 PM - 06:00 PM', arrival_share: '5%', status: 'Light' }
    ];

    return {
      success: true,
      district: district || 'Mandya / Erode Region',
      total_registered_acres: Math.max(1420, totalCultivatedAcres),
      total_expected_tonnes: Math.max(1240, Math.round(totalExpectedTonnes)),
      total_farmers_count: 420,
      peak_harvest_period: '18 Nov – 24 Nov 2026',
      recommended_procurement_capacity_tonnes: 1350,
      crop_wise_forecast: cropWiseForecast,
      weekly_forecast: weeklyForecast,
      centre_demands: centreDemands,
      hourly_arrivals: hourlyArrivals
    };
  }

  async resetToCleanDefault() {
    if (this.isMongoConnected()) {
      return await resetMongoToCleanState();
    }
    return { success: true, message: 'In-memory data reset to clean state.' };
  }
}

export const db = new AgriFlowMongoDatabase();

