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
import { sendSMS } from './services/smsService.js';

// ============================================================
// VALID QUEUE STATE TRANSITIONS
// ============================================================
const VALID_TRANSITIONS = {
    'BOOKED': ['WAITING', 'CANCELLED'],
    'WAITING': ['CALLED', 'CANCELLED'],
    'CALLED': ['PROCESSING', 'WEIGHMENT', 'WAITING', 'CANCELLED'],
    'PROCESSING': ['WEIGHMENT', 'CANCELLED'],
    'WEIGHMENT': ['QUALITY_CHECK'],
    'QUALITY_CHECK': ['COMPLETED'],
    'COMPLETED': [],
    'CANCELLED': []
};

function isValidTransition(from, to) {
    return Boolean(VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to));
}

// ============================================================
// AGRIFLOW MONGODB DATABASE ENGINE
// ============================================================
class AgriFlowMongoDatabase {
    constructor() {
        this.inMemory = false;
    }

    isMongoConnected() {
        return mongoose.connection && mongoose.connection.readyState === 1;
    }

    // ── CENTRE UTILIZATION ──────────────────────────────────
    getCentreUtilization(centre) {
        if (centre.status === 'CLOSED') return { percent: 0, statusCategory: 'CLOSED' };
        const percent = Math.min(100, Math.round(((centre.booked_capacity_kg || 0) / (centre.daily_capacity_kg || 1)) * 100));
        let statusCategory = 'GREEN';
        if (percent > 85 || centre.status === 'FULL') statusCategory = 'RED';
        else if (percent > 60 || centre.status === 'HIGH_LOAD') statusCategory = 'YELLOW';
        return { percent, statusCategory };
    }

    getCongestionLevel(percent) {
        if (percent >= 90) return 'CRITICAL';
        if (percent >= 70) return 'HIGH';
        if (percent >= 40) return 'MODERATE';
        return 'LOW';
    }

    // ── CENTRES ─────────────────────────────────────────────
    async getAllCentres() {
        if (!this.isMongoConnected()) return [];
        const centres = await Centre.find().lean();
        return centres.map(c => {
            const remaining_capacity_kg = Math.max(0, (c.daily_capacity_kg || 50000) - (c.booked_capacity_kg || 0));
            const est_wait_minutes = (c.active_counters || 1) > 0 ?
                Math.round(((c.queue_count || 0) * (c.avg_processing_minutes || 15)) / c.active_counters) :
                0;
            const utilization = this.getCentreUtilization(c);
            const congestion = this.getCongestionLevel(utilization.percent);

            return {
                ...c,
                remaining_capacity_kg,
                est_wait_minutes,
                utilization_percent: utilization.percent,
                color_status: c.status === 'CLOSED' ? 'GREY' : utilization.statusCategory,
                congestion_level: congestion
            };
        });
    }

    async getCentreById(id) {
        const centres = await this.getAllCentres();
        return centres.find(c => c.id === id) || null;
    }

    // ── ATOMIC TOKEN GENERATION (A001, B001 format) ─────────
    async generateToken(centreId) {
        const updated = await Centre.findOneAndUpdate({ id: centreId }, { $inc: { current_token_counter: 1 } }, { new: true });
        if (!updated) throw new Error('Centre not found for token generation');
        const prefix = updated.token_prefix || 'X';
        const num = String(updated.current_token_counter).padStart(3, '0');
        return `${prefix}${num}`;
    }

    // ── ATOMIC APPOINTMENT BOOKING ──────────────────────────
    async bookAppointmentAtomic({ farmer_id, farmer_name, farmer_phone, centre_id, appointment_date, time_slot, quantity_kg, crop }) {
        if (!this.isMongoConnected()) {
            return { success: false, error: 'Database connection offline.' };
        }

        const centre = await Centre.findOne({ id: centre_id });
        if (!centre) return { success: false, error: 'Target procurement centre not found.' };
        if (centre.status === 'CLOSED') return { success: false, error: 'Selected procurement centre is currently closed.' };

        // Check capacity
        const availableKg = (centre.daily_capacity_kg || 50000) - (centre.booked_capacity_kg || 0);
        if (quantity_kg > availableKg) {
            const recommendation = await this.getBestCentreRecommendation({ farmer_lat: centre.latitude, farmer_lng: centre.longitude, quantity_kg });
            return {
                success: false,
                error: `Insufficient capacity. Only ${availableKg.toLocaleString()} kg remaining, but ${quantity_kg.toLocaleString()} kg requested.`,
                remaining_capacity_kg: availableKg,
                suggested_alternative: recommendation
            };
        }

        const todayStr = appointment_date || new Date().toISOString().split('T')[0];

        // Ensure slots and slot positions exist for today
        await this.getSlotsForCentre(centre_id, todayStr);

        // Find the matching slot
        const slot = await Slot.findOne({
            centre_id,
            slot_date: todayStr,
            $or: [{ start_time: time_slot }, { id: time_slot }]
        }) || await Slot.findOne({ centre_id, slot_date: todayStr, is_available: true });

        if (!slot) {
            return { success: false, error: 'No available storage slots found for the requested date and centre.' };
        }

        // MULTI-SLOT / MULTI-BAY ALLOCATION (> 500kg)
        // Each storage bay holds 500 kg. If farmer has > 500kg, allocate multiple bays atomically.
        const baysNeeded = Math.max(1, Math.ceil(Number(quantity_kg) / 500));

        // Find available positions in this slot
        const availablePositions = await SlotPosition.find({
            slot_id: slot.id,
            status: 'AVAILABLE'
        }).sort({ position_number: 1 }).limit(baysNeeded);

        if (availablePositions.length < baysNeeded) {
            return {
                success: false,
                error: `Time slot (${time_slot || slot.start_time}) only has ${availablePositions.length} open bays, but declared ${Number(quantity_kg).toLocaleString()} kg requires ${baysNeeded} storage bays. Please choose another open time slot or split across slots.`
            };
        }

        const claimedIds = availablePositions.map(p => p.id);
        const claimedBayNumbers = availablePositions.map(p => p.position_number);
        const baysLabel = claimedBayNumbers.map(n => `Bay #${n < 10 ? '0' + n : n}`).join(', ');

        // Generate unique token
        const tokenNumber = await this.generateToken(centre_id);

        // Atomic centre capacity update
        let newStatus = centre.status;
        const newBookedKg = (centre.booked_capacity_kg || 0) + quantity_kg;
        if (newBookedKg >= centre.daily_capacity_kg) newStatus = 'FULL';
        else if (newBookedKg / centre.daily_capacity_kg > 0.6) newStatus = 'HIGH_LOAD';

        await Centre.findOneAndUpdate({ id: centre_id }, { $inc: { booked_capacity_kg: quantity_kg, queue_count: 1 }, $set: { status: newStatus, last_updated: new Date() } }, { new: true });

        const apptId = `APPT-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        const bookingId = `AGR-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`;

        // Create appointment with WAITING status (farmer immediately joins queue)
        const newAppt = await Appointment.create({
            id: apptId,
            booking_id: bookingId,
            token_number: tokenNumber,
            qr_token: `QR-${bookingId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            farmer_id,
            farmer_name: farmer_name || 'Farmer',
            farmer_phone: farmer_phone || '',
            centre_id,
            centre_name: centre.name,
            appointment_date: todayStr,
            time_slot: time_slot || (slot && slot.start_time) || '09:00 AM',
            slot_id: slot ? slot.id : null,
            position_number: claimedBayNumbers[0],
            position_numbers: claimedBayNumbers,
            bays_label: baysLabel,
            is_multi_slot: baysNeeded > 1,
            crop_type: crop || 'Paddy',
            quantity_kg: quantity_kg || 0,
            declared_quantity_kg: quantity_kg || 0,
            status: 'WAITING'
        });

        // Mark all claimed positions as BOOKED
        await SlotPosition.updateMany({ id: { $in: claimedIds } }, { $set: { status: 'BOOKED', booked_by: farmer_id || 'unknown', booked_at: new Date(), appointment_id: apptId } });

        slot.current_bookings = await SlotPosition.countDocuments({ slot_id: slot.id, status: 'BOOKED' });
        slot.is_available = slot.current_bookings < slot.maximum_bookings;
        await slot.save();

        // Create procurement record
        const procId = `PROC-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        await Procurement.create({
            id: procId,
            appointment_id: apptId,
            farmer_id,
            farmer_name: farmer_name || 'Farmer',
            centre_id,
            centre_name: centre.name,
            crop: crop || 'Paddy',
            quantity_kg: quantity_kg || 0,
            actual_weighed_kg: 0,
            quality_grade: 'Pending',
            quality_moisture: 'Pending',
            status: 'WAITING'
        });

        // Create procurement event
        await ProcurementEvent.create({
            id: uuidv4(),
            procurement_id: procId,
            previous_status: 'NONE',
            new_status: 'WAITING',
            actor_id: 'SYSTEM',
            actor_name: 'Booking Engine',
            actor_role: 'SYSTEM',
            reason: `Slot booked. Token ${tokenNumber} issued. Farmer joined queue.`,
            owner: centre.name,
            next_action: 'Travel to centre and check in'
        });

        // Create payment record
        const payId = `PAY-${Date.now()}-${Math.floor(Math.random() * 900000 + 100000)}`;
        await Payment.create({
            id: payId,
            procurement_id: procId,
            appointment_id: apptId,
            farmer_id,
            farmer_name: farmer_name || 'Farmer',
            centre_id,
            crop: crop || 'Paddy',
            quantity_kg: quantity_kg || 0,
            amount: (quantity_kg || 0) * 22,
            status: 'PENDING',
            reference_number: payId,
            owner: 'Procurement Gate Counter',
            reason: 'Appointment booked. Awaiting farmer arrival and weighing.',
            next_action: 'Weighbridge and Quality Approval'
        });

        // Create notifications
        await this.createNotification(
            farmer_id,
            centre_id,
            'SLOT_BOOKED',
            'Slot Booked',
            `Token ${tokenNumber} confirmed for ${Number(quantity_kg || 0).toLocaleString()} kg ${crop_type || 'produce'}.`,
            '📅',
            '/farmer/queue',
            apptId, { appointmentId: apptId, tokenNumber, quantity_kg, crop: crop_type }
        );

        // SMS notification (simulation mode by default)
        if (farmer_phone) {
            sendSMS(farmer_phone, `AGRIFlow: Slot confirmed at ${centre.name}. Token: ${tokenNumber}. Slot: ${time_slot || '09:00 AM'}. Check app for live queue position.`)
                .catch(e => console.warn('[SMS Error]', e.message));
        }

        const refreshedCentre = await this.getCentreById(centre_id);

        return {
            success: true,
            appointment: newAppt.toObject(),
            token_number: tokenNumber,
            procurement_id: procId,
            payment_id: payId,
            updated_centre: refreshedCentre
        };
    }

    // ── CENTRE-SPECIFIC LIVE QUEUE ENGINE ───────────────────
    async getLiveQueueForCentre(centreId, targetFarmerId = null) {
        const centre = await this.getCentreById(centreId);
        if (!centre) return null;

        // Get all non-cancelled appointments for this centre, sorted by creation
        const appts = await Appointment.find({
            centre_id: centreId,
            status: { $nin: ['CANCELLED', 'COMPLETED'] }
        }).sort({ createdAt: 1 }).lean();

        // Currently processing (CALLED, PROCESSING, WEIGHMENT, QUALITY_CHECK)
        const processingStatuses = ['CALLED', 'PROCESSING', 'WEIGHMENT', 'QUALITY_CHECK'];
        const currentlyProcessing = appts.find(a => processingStatuses.includes(a.status)) || null;

        // Waiting queue
        const waitingQueue = appts.filter(a => a.status === 'WAITING');

        // Build queue entries with positions
        const queueEntries = waitingQueue.map((a, idx) => ({
            ...a,
            queue_position: idx + 1,
            estimated_wait_minutes: Math.max(0, Math.round(((idx + 1) * (centre.avg_processing_minutes || 15)) / (centre.active_counters || 1)))
        }));

        // Find the target farmer's entry
        const farmerEntry = targetFarmerId ? queueEntries.find(q => q.farmer_id === targetFarmerId) : null;
        const farmerProcessing = targetFarmerId && currentlyProcessing && currentlyProcessing.farmer_id === targetFarmerId ? currentlyProcessing : null;

        // Also check if farmer has a completed appointment today
        let farmerCompleted = null;
        if (targetFarmerId && !farmerEntry && !farmerProcessing) {
            farmerCompleted = await Appointment.findOne({
                centre_id: centreId,
                farmer_id: targetFarmerId,
                status: 'COMPLETED'
            }).sort({ updatedAt: -1 }).lean();
        }

        // Get completed count today
        const completedToday = await Appointment.countDocuments({
            centre_id: centreId,
            status: 'COMPLETED'
        });

        return {
            success: true,
            centre_id: centre.id,
            centre_name: centre.name,
            centre_code: centre.code,
            total_in_queue: waitingQueue.length,
            completed_today: completedToday,
            active_counters: centre.active_counters || 1,
            avg_processing_minutes: centre.avg_processing_minutes || 15,
            utilization_percent: centre.utilization_percent || 0,
            congestion_level: centre.congestion_level || 'LOW',

            // Currently processing farmer with full measurement and payment details
            currently_processing: currentlyProcessing ? {
                token_number: currentlyProcessing.token_number,
                farmer_name: currentlyProcessing.farmer_name,
                farmer_id: currentlyProcessing.farmer_id,
                farmer_phone: currentlyProcessing.farmer_phone,
                status: currentlyProcessing.status,
                crop_type: currentlyProcessing.crop_type,
                declared_quantity_kg: currentlyProcessing.declared_quantity_kg,
                actual_weight_kg: currentlyProcessing.actual_weight_kg || null,
                quality_grade: currentlyProcessing.quality_grade || null,
                quality_moisture: currentlyProcessing.quality_moisture || null,
                quantity_kg: currentlyProcessing.actual_weight_kg || currentlyProcessing.declared_quantity_kg || currentlyProcessing.quantity_kg,
                appointment_id: currentlyProcessing.id,
                payment: await Payment.findOne({ appointment_id: currentlyProcessing.id }).lean()
            } : null,

            // Waiting queue list
            queue_entries: queueEntries.map(q => ({
                token_number: q.token_number,
                farmer_name: q.farmer_name,
                farmer_id: q.farmer_id,
                crop_type: q.crop_type,
                quantity_kg: q.declared_quantity_kg || q.quantity_kg,
                queue_position: q.queue_position,
                estimated_wait_minutes: q.estimated_wait_minutes,
                status: q.status,
                appointment_id: q.id,
                booked_at: q.createdAt
            })),

            // This farmer's specific info
            your_token: (farmerProcessing && farmerProcessing.token_number) || (farmerEntry && farmerEntry.token_number) || (farmerCompleted && farmerCompleted.token_number) || 'NOT_BOOKED',
            your_position: (farmerEntry && farmerEntry.queue_position) || 0,
            your_status: (farmerProcessing && farmerProcessing.status) || (farmerEntry && farmerEntry.status) || (farmerCompleted ? 'COMPLETED' : 'NOT_BOOKED'),
            your_estimated_wait: (farmerEntry && farmerEntry.estimated_wait_minutes) || 0,
            your_appointment_id: (farmerProcessing && farmerProcessing.id) || (farmerEntry && farmerEntry.id) || (farmerCompleted && farmerCompleted.id) || null
        };
    }

    // ── NEXT FARMER (Atomic Queue Advance) ──────────────────
    async nextFarmerInQueue(centreId) {
        if (!this.isMongoConnected()) return { success: false, error: 'Database offline' };

        const centre = await Centre.findOne({ id: centreId });
        if (!centre) return { success: false, error: 'Centre not found' };

        // 1. Complete any currently processing farmer
        const processingStatuses = ['CALLED', 'PROCESSING', 'WEIGHMENT', 'QUALITY_CHECK'];
        const currentProcessing = await Appointment.findOne({
            centre_id: centreId,
            status: { $in: processingStatuses }
        }).sort({ createdAt: 1 });

        if (currentProcessing) {
            currentProcessing.status = 'COMPLETED';
            await currentProcessing.save();

            // Update matching procurement
            await Procurement.updateOne({ appointment_id: currentProcessing.id }, { $set: { status: 'COMPLETED' } });

            // Notify completed farmer
            await this.createNotification(
                currentProcessing.farmer_id, centreId,
                'PAYMENT_COMPLETED', 'Payment Processed',
                `Your procurement payment has been processed.`,
                '💰', '/farmer/payments'
            );

            // Update centre procured count
            await Centre.updateOne({ id: centreId }, {
                $inc: { today_procured_kg: currentProcessing.declared_quantity_kg || 0 }
            });
        }

        // 2. Find next WAITING farmer (atomic update to prevent double-calling)
        const nextFarmer = await Appointment.findOneAndUpdate({ centre_id: centreId, status: 'WAITING' }, { $set: { status: 'CALLED' } }, { new: true, sort: { createdAt: 1 } });

        if (!nextFarmer) {
            // Queue is empty
            await Centre.updateOne({ id: centreId }, { $set: { queue_count: 0 } });
            return {
                success: true,
                message: 'No more farmers in queue. Queue is empty.',
                queue_empty: true,
                completed_farmer: (currentProcessing && currentProcessing.toObject()) || null,
                queue: await this.getLiveQueueForCentre(centreId)
            };
        }

        // Update procurement status
        await Procurement.updateOne({ appointment_id: nextFarmer.id }, { $set: { status: 'CALLED' } });

        // Create event
        await ProcurementEvent.create({
            id: uuidv4(),
            procurement_id: ((await Procurement.findOne({ appointment_id: nextFarmer.id })) || {}).id || 'unknown',
            previous_status: 'WAITING',
            new_status: 'CALLED',
            actor_id: 'OFFICER',
            actor_name: 'Centre Officer',
            actor_role: 'CENTRE_OPERATOR',
            reason: `Token ${nextFarmer.token_number} called. Please proceed to counter.`,
            owner: centre.name,
            next_action: 'Farmer to arrive at counter for processing'
        });

        // Notify the called farmer
        const counterIndex = (await Appointment.countDocuments({ centre_id: centreId, status: { $in: ['CALLED', 'PROCESSING'] } })) || 1;
        await this.createNotification(
            nextFarmer.farmer_id, centreId,
            'TOKEN_CALLED', 'Token Called',
            `Token ${nextFarmer.token_number} called. Proceed to Weighbridge Counter #${counterIndex}.`,
            '📢', '/farmer/queue',
            nextFarmer.id, { appointmentId: nextFarmer.id, tokenNumber: nextFarmer.token_number, counter: counterIndex }
        );

        // SMS to called farmer
        if (nextFarmer.farmer_phone) {
            sendSMS(nextFarmer.farmer_phone, `AGRIFlow: Token ${nextFarmer.token_number} CALLED at ${centre.name}. Please proceed to counter NOW.`)
                .catch(e => console.warn('[SMS]', e.message));
        }

        // Notify next 2 waiting farmers they're approaching
        const upcomingWaiting = await Appointment.find({
            centre_id: centreId,
            status: 'WAITING'
        }).sort({ createdAt: 1 }).limit(2).lean();

        for (const upcoming of upcomingWaiting) {
            await this.createNotification(
                upcoming.farmer_id, centreId,
                'APPROACHING', '⏰ Your Turn is Approaching!',
                `You are close to being called at ${centre.name}. Token: ${upcoming.token_number}. Please be ready.`,
                '⏰'
            );
        }

        // Update queue count
        const remainingWaiting = await Appointment.countDocuments({ centre_id: centreId, status: 'WAITING' });
        await Centre.updateOne({ id: centreId }, { $set: { queue_count: remainingWaiting } });

        const updatedQueue = await this.getLiveQueueForCentre(centreId);

        return {
            success: true,
            message: `Token ${nextFarmer.token_number} (${nextFarmer.farmer_name}) has been CALLED.`,
            called_farmer: nextFarmer.toObject(),
            completed_farmer: (currentProcessing && currentProcessing.toObject()) || null,
            queue: updatedQueue
        };
    }

    // ── START PROCESSING (CALLED → PROCESSING) ─────────────
    async startProcessingFarmer(centreId, appointmentId) {
        const appt = appointmentId ?
            await Appointment.findOne({ id: appointmentId, centre_id: centreId }) :
            await Appointment.findOne({ centre_id: centreId, status: 'CALLED' }).sort({ createdAt: 1 });

        if (!appt) return { success: false, error: 'No called farmer found to process.' };
        if (!isValidTransition(appt.status, 'PROCESSING')) {
            return { success: false, error: `Cannot transition from ${appt.status} to PROCESSING.` };
        }

        appt.status = 'PROCESSING';
        await appt.save();
        await Procurement.updateOne({ appointment_id: appt.id }, { $set: { status: 'PROCESSING' } });

        await this.createNotification(appt.farmer_id, centreId, 'PROCESSING_STARTED', '🔄 Processing Started',
            `Your procurement process has started at the counter. Token: ${appt.token_number}`, '🔄', '/farmer/procurement');

        return { success: true, message: `Processing started for ${appt.token_number}`, appointment: appt.toObject() };
    }

    // ── RECORD WEIGHMENT (PROCESSING/CALLED → WEIGHMENT) ──
    async recordWeighment(centreId, appointmentId, actualWeightKg) {
        const appt = appointmentId ?
            await Appointment.findOne({ id: appointmentId, centre_id: centreId }) :
            await Appointment.findOne({ centre_id: centreId, status: { $in: ['PROCESSING', 'CALLED'] } }).sort({ createdAt: 1 });

        if (!appt) return { success: false, error: 'No active farmer found for weighment.' };
        if (appt.status === 'CALLED') {
            appt.status = 'PROCESSING';
            await appt.save();
            await Procurement.updateOne({ appointment_id: appt.id }, { $set: { status: 'PROCESSING' } });
        }
        if (!isValidTransition(appt.status, 'WEIGHMENT')) {
            return { success: false, error: `Cannot transition from ${appt.status} to WEIGHMENT.` };
        }

        appt.status = 'WEIGHMENT';
        appt.actual_weight_kg = actualWeightKg;
        await appt.save();

        // Update procurement
        await Procurement.updateOne({ appointment_id: appt.id }, {
            $set: { status: 'WEIGHMENT', actual_weighed_kg: actualWeightKg }
        });

        // Create weighment record
        await Weighment.create({
            id: uuidv4(),
            appointment_id: appt.id,
            declared_quantity_kg: appt.declared_quantity_kg,
            measured_quantity_kg: actualWeightKg,
            difference_kg: actualWeightKg - appt.declared_quantity_kg,
            machine_id: 'WEIGHBRIDGE-01',
            operator_name: 'Yard Weighmaster'
        });

        // Update payment amount based on actual weight
        await Payment.updateOne({ appointment_id: appt.id }, {
            $set: { amount: actualWeightKg * 22, quantity_kg: actualWeightKg }
        });

        await this.createNotification(
            appt.farmer_id, centreId, 'WEIGHMENT_COMPLETED', 'Weighment Completed',
            `Weight certificate recorded: ${Number(actualWeightKg).toLocaleString()} kg net produce.`, '⚖️', '/farmer/procurement',
            appt.id, { appointmentId: appt.id, tokenNumber: appt.token_number, weight_kg: actualWeightKg }
        );

        return {
            success: true,
            message: `Weighment recorded: ${actualWeightKg} kg for ${appt.token_number}`,
            appointment: appt.toObject()
        };
    }

    // ── RECORD QUALITY (WEIGHMENT → QUALITY_CHECK) ─────────
    async recordQuality(centreId, appointmentId, grade, moisture) {
        const appt = appointmentId ?
            await Appointment.findOne({ id: appointmentId, centre_id: centreId }) :
            await Appointment.findOne({ centre_id: centreId, status: 'WEIGHMENT' }).sort({ createdAt: 1 });

        if (!appt) return { success: false, error: 'No farmer at weighment stage found.' };
        if (!isValidTransition(appt.status, 'QUALITY_CHECK')) {
            return { success: false, error: `Cannot transition from ${appt.status} to QUALITY_CHECK.` };
        }

        appt.status = 'QUALITY_CHECK';
        appt.quality_grade = grade || 'Grade A';
        appt.quality_moisture = moisture || '13%';
        await appt.save();

        await Procurement.updateOne({ appointment_id: appt.id }, {
            $set: { status: 'QUALITY_CHECK', quality_grade: grade || 'Grade A', quality_moisture: moisture || '13%' }
        });

        await QualityInspection.create({
            id: uuidv4(),
            appointment_id: appt.id,
            moisture_percent: parseFloat(moisture) || 13,
            foreign_matter_percent: 0.5,
            damaged_percent: 0.2,
            grade: grade || 'Grade A',
            remarks: 'Quality verified at counter',
            status: 'ACCEPTED',
            inspector_name: 'Quality Inspector'
        });

        await this.createNotification(
            appt.farmer_id, centreId, 'QUALITY_COMPLETED', 'Quality Verification Completed',
            `Quality verification completed for Token ${appt.token_number}.`, '🔬', '/farmer/procurement',
            appt.id, { appointmentId: appt.id, tokenNumber: appt.token_number, grade: grade || 'Grade A', moisture: moisture || '13%' }
        );

        return { success: true, message: `Quality recorded for ${appt.token_number}: ${grade}`, appointment: appt.toObject() };
    }

    // ── COMPLETE PROCUREMENT (QUALITY_CHECK → COMPLETED) ────
    async completeProcurement(centreId, appointmentId) {
        const appt = appointmentId ?
            await Appointment.findOne({ id: appointmentId, centre_id: centreId }) :
            await Appointment.findOne({ centre_id: centreId, status: 'QUALITY_CHECK' }).sort({ createdAt: 1 });

        if (!appt) return { success: false, error: 'No farmer at quality check stage found.' };
        if (!isValidTransition(appt.status, 'COMPLETED')) {
            return { success: false, error: `Cannot transition from ${appt.status} to COMPLETED.` };
        }

        appt.status = 'COMPLETED';
        await appt.save();

        await Procurement.updateOne({ appointment_id: appt.id }, { $set: { status: 'COMPLETED' } });

        // Update payment to PROCESSING
        await Payment.updateOne({ appointment_id: appt.id }, {
            $set: { status: 'PROCESSING', reason: 'Procurement complete. Payment being processed.', next_action: 'Payment approval pending.' }
        });

        // Update centre stats
        await Centre.updateOne({ id: centreId }, {
            $inc: { today_procured_kg: appt.actual_weight_kg || appt.declared_quantity_kg || 0, queue_count: -1 }
        });

        await ProcurementEvent.create({
            id: uuidv4(),
            procurement_id: ((await Procurement.findOne({ appointment_id: appt.id })) || {}).id || 'unknown',
            previous_status: 'QUALITY_CHECK',
            new_status: 'COMPLETED',
            actor_id: 'OFFICER',
            actor_name: 'Centre Officer',
            actor_role: 'CENTRE_OPERATOR',
            reason: `Procurement completed. ${appt.actual_weight_kg || appt.declared_quantity_kg} kg accepted at ${appt.quality_grade || 'Grade A'}.`,
            owner: 'Payment Processing Cell',
            next_action: 'Payment approval and DBT transfer'
        });

        await this.createNotification(
            appt.farmer_id, centreId, 'PAYMENT_COMPLETED', 'Payment Processed',
            `Your procurement payment has been processed.`, '💰', '/farmer/payments',
            appt.id, { appointmentId: appt.id, tokenNumber: appt.token_number }
        );

        if (appt.farmer_phone) {
            sendSMS(appt.farmer_phone, `AGRIFlow: Procurement COMPLETE! ${appt.actual_weight_kg || appt.declared_quantity_kg} kg accepted. Token: ${appt.token_number}. Payment processing.`)
                .catch(e => console.warn('[SMS]', e.message));
        }

        const payment = await Payment.findOne({ appointment_id: appt.id }).lean();

        return {
            success: true,
            message: `Procurement completed for ${appt.token_number}`,
            appointment: appt.toObject(),
            payment
        };
    }

    // ── UPDATE PAYMENT STATUS ───────────────────────────────
    async updatePaymentStatus(paymentId, newStatus) {
        const validPayTransitions = {
            'PENDING': ['PROCESSING', 'APPROVED'],
            'PROCESSING': ['APPROVED', 'PAID'],
            'APPROVED': ['PAID']
        };
        const payment = await Payment.findOne({ id: paymentId });
        if (!payment) return { success: false, error: 'Payment not found.' };

        if (!validPayTransitions[payment.status] || !validPayTransitions[payment.status].includes(newStatus)) {
            return { success: false, error: `Cannot transition payment from ${payment.status} to ${newStatus}.` };
        }

        payment.status = newStatus;
        if (newStatus === 'APPROVED') {
            payment.reason = 'Payment approved. DBT transfer initiated.';
            payment.next_action = 'Bank credit transfer in progress.';
            payment.owner = 'State Agriculture Treasury Cell';
        } else if (newStatus === 'PAID') {
            payment.reason = 'Funds credited to bank account via Direct Benefit Transfer.';
            payment.next_action = 'Transaction completed. Digital receipt issued.';
            payment.owner = 'State Bank of India DBT System';
            payment.completed_at = new Date();
        }
        await payment.save();

        await this.createNotification(
            payment.farmer_id, payment.centre_id,
            newStatus === 'PAID' ? 'PAYMENT_COMPLETED' : 'PAYMENT_UPDATE',
            newStatus === 'PAID' ? 'Payment Processed' : `Payment ${newStatus}`,
            newStatus === 'PAID' ? `Your procurement payment has been processed.` : `Your payment of ₹${payment.amount?.toLocaleString()} is now ${newStatus}. ${payment.reason}`,
            '💰', '/farmer/payments',
            payment.id, { paymentId: payment.id, amount: payment.amount, status: newStatus }
        );

        if (newStatus === 'PAID') {
            // Get farmer phone for SMS
            const appt = await Appointment.findOne({ id: payment.appointment_id }).lean();
            if (appt && appt.farmer_phone) {
                sendSMS(appt.farmer_phone, `AGRIFlow: Payment of ₹${payment.amount?.toLocaleString()} CREDITED to your bank account! Ref: ${payment.reference_number}`)
                    .catch(e => console.warn('[SMS]', e.message));
            }
        }

        return { success: true, message: `Payment updated to ${newStatus}`, payment: payment.toObject() };
    }

    // ── GET CENTRE PAYMENTS (For Officer DBT Portal) ───────────
    async getCentrePayments(centreId) {
        if (!this.isMongoConnected()) return [];
        return Payment.find({ centre_id: centreId }).sort({ createdAt: -1 }).lean();
    }

    // ── FARMER DASHBOARD AGGREGATED DATA ────────────────────
    async getFarmerDashboard(farmerId) {
        if (!this.isMongoConnected()) return { success: false, error: 'Database offline' };

        // Active booking (non-completed, non-cancelled)
        const activeBooking = await Appointment.findOne({
            farmer_id: farmerId,
            status: { $nin: ['COMPLETED', 'CANCELLED'] }
        }).sort({ createdAt: -1 }).lean();

        // Queue data for the active booking's centre
        let queueData = null;
        if (activeBooking) {
            queueData = await this.getLiveQueueForCentre(activeBooking.centre_id, farmerId);
        }

        // Active procurement
        const activeProcurement = activeBooking ?
            await Procurement.findOne({ appointment_id: activeBooking.id }).lean() :
            null;

        // Payment for active procurement
        const activePayment = activeBooking ?
            await Payment.findOne({ appointment_id: activeBooking.id }).lean() :
            null;

        // Last completed (for showing results if no active booking)
        const lastCompleted = !activeBooking ?
            await Appointment.findOne({ farmer_id: farmerId, status: 'COMPLETED' }).sort({ updatedAt: -1 }).lean() :
            null;

        const lastPayment = lastCompleted ?
            await Payment.findOne({ appointment_id: lastCompleted.id }).lean() :
            null;

        // Unread notifications
        const unreadCount = await Notification.countDocuments({
            $or: [{ farmer_id: farmerId }, { farmer_id: 'ALL' }],
            read: false
        });

        // History
        const history = await Appointment.find({ farmer_id: farmerId }).sort({ createdAt: -1 }).limit(20).lean();

        return {
            success: true,
            farmer_id: farmerId,
            active_booking: activeBooking,
            queue: queueData,
            procurement: activeProcurement,
            payment: activePayment,
            last_completed: lastCompleted,
            last_payment: lastPayment,
            unread_notifications: unreadCount,
            history
        };
    }

    // ── ADVANCE QUEUE (Legacy compat) ───────────────────────
    async advanceQueueForCentre({ centre_id, token_number, new_status }) {
        if (!this.isMongoConnected()) return { success: false, error: 'Database offline' };

        if (token_number) {
            const appt = await Appointment.findOne({ centre_id, token_number });
            if (!appt) return { success: false, error: 'Token not found.' };
            if (!isValidTransition(appt.status, new_status)) {
                return { success: false, error: `Invalid transition: ${appt.status} → ${new_status}` };
            }
            appt.status = new_status;
            await appt.save();
            await Procurement.updateOne({ appointment_id: appt.id }, { $set: { status: new_status } });

            const updatedQueue = await this.getLiveQueueForCentre(centre_id);
            return { success: true, message: `Token ${token_number} → ${new_status}`, appointment: appt.toObject(), queue: updatedQueue };
        }

        // No token specified — call next farmer
        return await this.nextFarmerInQueue(centre_id);
    }

    // ── DEMO FARMER SEEDING ─────────────────────────────────
    async seedDemoFarmers(centreId, count = 10) {
        const centre = await Centre.findOne({ id: centreId });
        if (!centre) return { success: false, error: 'Centre not found' };

        const demoNames = ['Ramesh Gowda', 'Kumar Swamy', 'Lakshmi Devi', 'Manjunath H', 'Siddappa N',
            'Kavitha R', 'Nagaraju K', 'Padma S', 'Venkatesh M', 'Shivamma B',
            'Ravi Kumar', 'Anitha D', 'Basavaraju T', 'Chamundi L', 'Devaraju P'
        ];

        const crops = ['Paddy (Sona Masoori)', 'Groundnut', 'Maize', 'Paddy', 'Sugarcane'];
        const slots = ['08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM'];
        const todayStr = new Date().toISOString().split('T')[0];

        const created = [];

        for (let i = 0; i < Math.min(count, 15); i++) {
            const demoFarmerId = `DEMO-F-${centreId}-${i + 1}`;
            const farmerName = demoNames[i] || `Demo Farmer ${i + 1}`;
            const quantity = Math.floor(1500 + Math.random() * 3500);

            // Create or find demo user
            await User.updateOne({ id: demoFarmerId }, { $setOnInsert: { id: demoFarmerId, email: `demo${i + 1}@${centreId}.test`, password_hash: 'demo', full_name: farmerName, role: 'FARMER', phone: `+91 98450 ${String(10000 + i).slice(-5)}` } }, { upsert: true });

            const result = await this.bookAppointmentAtomic({
                farmer_id: demoFarmerId,
                farmer_name: farmerName,
                farmer_phone: `+91 98450 ${String(10000 + i).slice(-5)}`,
                centre_id: centreId,
                appointment_date: todayStr,
                time_slot: slots[i % slots.length],
                quantity_kg: quantity,
                crop: crops[i % crops.length]
            });

            if (result.success) {
                created.push({ token: result.token_number, farmer: farmerName, quantity });
            }
        }

        return { success: true, message: `${created.length} demo farmers added to ${centre.name}`, farmers: created };
    }

    // ── REALTIME CENTRE ANALYTICS & STATEMENTS SUMMARY ────────
    async getCentreAnalyticsSummary(centreId) {
        if (!this.isMongoConnected()) {
            return { success: false, error: 'Database offline' };
        }

        const centre = await Centre.findOne({ id: centreId }).lean();
        if (!centre) {
            return { success: false, error: 'Centre not found' };
        }

        // 1. Fetch all real appointments for this centre
        const appointments = await Appointment.find({
            centre_id: centreId,
            status: { $ne: 'CANCELLED' }
        }).sort({ createdAt: -1 }).lean();

        // 2. Fetch all real payments for this centre
        const payments = await Payment.find({
            centre_id: centreId
        }).sort({ createdAt: -1 }).lean();

        // Real Metrics
        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
        const waitingQueue = appointments.filter(a => ['WAITING', 'CALLED', 'PROCESSING', 'WEIGHMENT', 'QUALITY_CHECK'].includes(a.status));

        // Real weights
        const totalDeclaredKg = appointments.reduce((sum, a) => sum + (Number(a.declared_quantity_kg) || Number(a.quantity_kg) || 0), 0);
        const totalWeighedKg = appointments.reduce((sum, a) => {
            const w = Number(a.actual_weight_kg) > 0 ? Number(a.actual_weight_kg) : (Number(a.declared_quantity_kg) || Number(a.quantity_kg) || 0);
            return sum + w;
        }, 0);

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // ── A. Real Daily Breakdown (Hourly) ──────────────────────
        const todayAppts = appointments.filter(a => {
            const d = a.appointment_date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
            return d === todayStr;
        });

        const hourlySlots = [
            { slot: '08:00', label: '08:00 - 10:00', minHour: 8, maxHour: 9 },
            { slot: '10:00', label: '10:00 - 12:00', minHour: 10, maxHour: 11 },
            { slot: '12:00', label: '12:00 - 14:00', minHour: 12, maxHour: 13 },
            { slot: '14:00', label: '14:00 - 16:00', minHour: 14, maxHour: 15 },
            { slot: '16:00', label: '16:00 - 18:00', minHour: 16, maxHour: 17 },
            { slot: '18:00', label: '18:00+', minHour: 18, maxHour: 23 }
        ];

        const dailyBars = hourlySlots.map(h => {
            const matches = todayAppts.filter(a => {
                if (a.time_slot && typeof a.time_slot === 'string') {
                    const slotHour = parseInt(a.time_slot.split(':')[0], 10);
                    const isPM = a.time_slot.includes('PM') && slotHour < 12;
                    const hr24 = isPM ? slotHour + 12 : slotHour;
                    if (hr24 >= h.minHour && hr24 <= h.maxHour) return true;
                }
                if (a.createdAt) {
                    const crHour = new Date(a.createdAt).getHours();
                    if (crHour >= h.minHour && crHour <= h.maxHour) return true;
                }
                return false;
            });

            const kg = matches.reduce((sum, a) => sum + (Number(a.actual_weight_kg) || Number(a.declared_quantity_kg) || 0), 0);
            const mt = Number((kg / 1000).toFixed(2));
            return {
                label: h.slot,
                val: kg,
                mt: mt,
                farmers: matches.length,
                wait_mins: matches.length > 0 ? Math.min(30, Math.max(8, matches.length * 4)) : 0
            };
        });

        const maxDailyVal = Math.max(...dailyBars.map(b => b.val), 5000);
        const dailyVolumeKg = todayAppts.reduce((sum, a) => sum + (Number(a.actual_weight_kg) || Number(a.declared_quantity_kg) || 0), 0);
        const dailyVolumeMT = Number((dailyVolumeKg / 1000).toFixed(2));

        // ── B. Real Weekly Breakdown (Last 7 Days) ────────────────
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyBars = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const dayLabel = dayNames[d.getDay()];

            const matches = appointments.filter(a => {
                const apptD = a.appointment_date || (a.createdAt ? new Date(a.createdAt).toISOString().split('T')[0] : '');
                return apptD === dStr;
            });

            const kg = matches.reduce((sum, a) => sum + (Number(a.actual_weight_kg) || Number(a.declared_quantity_kg) || 0), 0);
            const mt = Number((kg / 1000).toFixed(2));
            weeklyBars.push({
                label: dayLabel,
                date: dStr,
                val: kg,
                mt: mt,
                farmers: matches.length,
                wait_mins: matches.length > 0 ? Math.min(30, Math.max(10, matches.length * 3)) : 0
            });
        }

        const weeklyVolumeKg = weeklyBars.reduce((sum, b) => sum + b.val, 0);
        const weeklyVolumeMT = Number((weeklyVolumeKg / 1000).toFixed(2));

        // ── C. Real Monthly Breakdown (4 Weeks) ───────────────────
        const monthlyBars = [
            { label: 'Week 1', daysBackStart: 28, daysBackEnd: 22 },
            { label: 'Week 2', daysBackStart: 21, daysBackEnd: 15 },
            { label: 'Week 3', daysBackStart: 14, daysBackEnd: 8 },
            { label: 'Week 4', daysBackStart: 7, daysBackEnd: 0 }
        ].map(w => {
            const startD = new Date();
            startD.setDate(startD.getDate() - w.daysBackStart);
            const endD = new Date();
            endD.setDate(endD.getDate() - w.daysBackEnd);

            const matches = appointments.filter(a => {
                const cDate = a.createdAt ? new Date(a.createdAt) : new Date(a.appointment_date || Date.now());
                return cDate >= startD && cDate <= endD;
            });

            const kg = matches.reduce((sum, a) => sum + (Number(a.actual_weight_kg) || Number(a.declared_quantity_kg) || 0), 0);
            const mt = Number((kg / 1000).toFixed(2));
            return {
                label: w.label,
                val: kg,
                mt: mt,
                farmers: matches.length,
                wait_mins: matches.length > 0 ? 15 : 0
            };
        });

        const monthlyVolumeKg = appointments.reduce((sum, a) => sum + (Number(a.actual_weight_kg) || Number(a.declared_quantity_kg) || 0), 0);
        const monthlyVolumeMT = Number((monthlyVolumeKg / 1000).toFixed(2));

        // ── D. Real Quality & Moisture Grade Breakdown ────────────
        let gradeACount = 0,
            gradeBCount = 0,
            gradeCCount = 0,
            rejectedCount = 0;
        let moistureSum = 0,
            moistureCount = 0;

        appointments.forEach(a => {
            const g = (a.quality_grade || '').toUpperCase();
            if (g.includes('A') || g === 'GRADE A' || g === 'FAQ') gradeACount++;
            else if (g.includes('B') || g === 'GRADE B') gradeBCount++;
            else if (g.includes('C') || g === 'GRADE C') gradeCCount++;
            else if (g.includes('REJECT')) rejectedCount++;
            else if (a.status === 'COMPLETED' || a.actual_weight_kg > 0) gradeACount++;

            if (a.quality_moisture) {
                const mVal = parseFloat(String(a.quality_moisture).replace('%', ''));
                if (!isNaN(mVal) && mVal > 0) {
                    moistureSum += mVal;
                    moistureCount++;
                }
            }
        });

        const totalGraded = (gradeACount + gradeBCount + gradeCCount + rejectedCount) || 1;
        const gradeAPct = Number(((gradeACount / totalGraded) * 100).toFixed(1));
        const gradeBPct = Number(((gradeBCount / totalGraded) * 100).toFixed(1));
        const gradeCPct = Number(((gradeCCount / totalGraded) * 100).toFixed(1));
        const rejectedPct = Number(((rejectedCount / totalGraded) * 100).toFixed(1));
        const avgMoisture = moistureCount > 0 ? Number((moistureSum / moistureCount).toFixed(1)) : 13.5;

        // ── E. Real Payment DBT Totals ────────────────────────────
        const paidPayments = payments.filter(p => p.status === 'PAID');
        const approvedPayments = payments.filter(p => p.status === 'APPROVED');
        const processingPayments = payments.filter(p => p.status === 'PROCESSING' || p.status === 'PENDING');

        const totalPaidAmount = paidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalApprovedAmount = approvedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const totalProcessingAmount = processingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const grossPaymentValue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // ── F. Real Itemized Statements Ledger ────────────────────
        const realStatements = payments.map((p) => {
            const relatedAppt = appointments.find(a => a.id === p.appointment_id);
            return {
                id: p.reference_number || `VCH-2026-${p.id.slice(-6).toUpperCase()}`,
                date: p.createdAt ? new Date(p.createdAt).toLocaleDateString() + ' ' + new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
                farmer_name: p.farmer_name || (relatedAppt && relatedAppt.farmer_name) || 'Farmer',
                aadhaar: relatedAppt && relatedAppt.farmer_phone ? `XXXX-XXXX-${relatedAppt.farmer_phone.slice(-4)}` : 'XXXX-XXXX-4819',
                crop: p.crop || (relatedAppt && relatedAppt.crop_type) || 'Paddy',
                grade: (relatedAppt && relatedAppt.quality_grade) || 'Grade A',
                quantity_kg: Number(p.quantity_kg) || Number(relatedAppt && relatedAppt.actual_weight_kg) || 2500,
                rate: 22.00,
                amount: Number(p.amount) || ((Number(p.quantity_kg) || 2500) * 22),
                bank_name: p.bank_account_mask || 'State Bank of India',
                utr: p.reference_number || `PFMS${p.id.slice(-9).toUpperCase()}`,
                status: p.status || 'PAID'
            };
        });

        return {
            success: true,
            centre: {
                id: centre.id,
                name: centre.name,
                code: centre.code,
                daily_capacity_kg: centre.daily_capacity_kg,
                active_counters: centre.active_counters
            },
            counts: {
                total_appointments: totalAppointments,
                completed_today: completedAppointments.length,
                in_queue: waitingQueue.length,
                total_declared_kg: totalDeclaredKg,
                total_weighed_kg: totalWeighedKg
            },
            daily: {
                volume_kg: dailyVolumeKg,
                volume_mt: dailyVolumeMT,
                bars: dailyBars,
                max_val: maxDailyVal,
                avg_wait_mins: Math.round(centre.est_wait_minutes || (waitingQueue.length * 4) || 12),
                dbt_total: totalPaidAmount
            },
            weekly: {
                volume_kg: weeklyVolumeKg,
                volume_mt: weeklyVolumeMT,
                bars: weeklyBars,
                avg_wait_mins: 14,
                dbt_total: totalPaidAmount
            },
            monthly: {
                volume_kg: monthlyVolumeKg,
                volume_mt: monthlyVolumeMT,
                bars: monthlyBars,
                avg_wait_mins: 16,
                dbt_total: totalPaidAmount
            },
            quality: {
                grade_a_pct: gradeAPct,
                grade_b_pct: gradeBPct,
                grade_c_pct: gradeCPct,
                rejected_pct: rejectedPct,
                avg_moisture: avgMoisture,
                total_graded: totalGraded
            },
            payments: {
                gross_value: grossPaymentValue,
                paid_value: totalPaidAmount,
                approved_value: totalApprovedAmount,
                processing_value: totalProcessingAmount,
                vouchers_count: payments.length,
                statements: realStatements
            }
        };
    }

    // ── NOTIFICATION HELPER ─────────────────────────────────
    setNotificationEmitter(fn) {
        this.notificationEmitter = fn;
    }

    async createNotification(farmerId, centreId, type, title, message, icon = '🔔', link = null, relatedId = null, metadata = {}) {
        try {
            const notif = await Notification.create({
                id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
                farmer_id: farmerId,
                farmerId: farmerId,
                centre_id: centreId || null,
                type,
                title,
                message,
                icon: icon || '🔔',
                link: link || null,
                relatedId: relatedId || null,
                metadata: metadata || {},
                read: false
            });
            if (this.notificationEmitter) {
                this.notificationEmitter(notif.toObject ? notif.toObject() : notif);
            }
            return notif;
        } catch (e) {
            console.warn('[NOTIF] Failed to create notification:', e.message);
            return null;
        }
    }

    // ── BEST CENTRE RECOMMENDATION ──────────────────────────
    async getBestCentreRecommendation({ farmer_lat = 12.5200, farmer_lng = 76.8900, quantity_kg = 2500 }) {
        const centres = (await this.getAllCentres()).filter(c => c.status !== 'CLOSED');
        if (centres.length === 0) return null;

        const calcDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
            return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
        };

        const scored = centres.map(c => {
            const dist = calcDistance(farmer_lat, farmer_lng, c.latitude, c.longitude);
            const hasCap = c.remaining_capacity_kg >= quantity_kg;
            let score = 100 - (dist * 4) - (c.est_wait_minutes * 2) + (hasCap ? 30 : -50);
            if (c.color_status === 'GREEN') score += 20;
            if (c.color_status === 'RED') score -= 30;
            return {...c, distance_km: dist, has_sufficient_capacity: hasCap, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const best = scored[0];

        return {
            recommended_centre: best,
            reasons: [
                `Short wait time of ${best.est_wait_minutes} minutes`,
                `${best.remaining_capacity_kg.toLocaleString()} kg remaining capacity`,
                `Located ${best.distance_km} km away`,
                `${best.active_counters} active counters`
            ],
            score: Math.round(best.score),
            alternatives: scored.slice(1, 3)
        };
    }

    // ── GO INTELLIGENCE ─────────────────────────────────────
    async getGoIntelligence(centreId) {
        const centre = await this.getCentreById(centreId);
        if (!centre) return null;

        let decision = 'GO',
            title = 'GO AHEAD',
            summary = 'Yard operating normally.';
        let recommendation_notes = [];

        if (centre.status === 'CLOSED') {
            decision = 'WAIT';
            title = 'DO NOT GO - CENTRE CLOSED';
            summary = 'This centre is currently closed.';
        } else if (centre.color_status === 'RED' || centre.est_wait_minutes > 30) {
            decision = 'WAIT';
            title = 'HEAVY CONGESTION';
            summary = `High queue density (~${centre.est_wait_minutes} min wait).`;
            recommendation_notes.push('Consider rescheduling to nearby depot');
        } else if (centre.color_status === 'YELLOW' || centre.est_wait_minutes > 15) {
            decision = 'CAUTION';
            title = 'MODERATE LOAD';
            summary = `Estimated wait: ${centre.est_wait_minutes} mins.`;
        }

        return { centre_id: centre.id, centre_name: centre.name, decision, title, summary, queue_count: centre.queue_count, est_wait_minutes: centre.est_wait_minutes, color_status: centre.color_status, recommendation_notes };
    }

    // ── OPERATOR CENTRE UPDATE ──────────────────────────────
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

    // ── PROCUREMENT STAGE UPDATE (Legacy) ───────────────────
    async updateProcurementStage({ procurement_id, new_status, actual_weighed_kg, quality_grade, quality_moisture, actor_name, reason, owner, next_action }) {
        if (!this.isMongoConnected()) return null;
        const proc = await Procurement.findOne({ id: procurement_id });
        if (!proc) return null;

        const previous_status = proc.status;
        proc.status = new_status;
        if (actual_weighed_kg) proc.actual_weighed_kg = actual_weighed_kg;
        if (quality_grade) proc.quality_grade = quality_grade;
        if (quality_moisture) proc.quality_moisture = quality_moisture;
        await proc.save();

        await ProcurementEvent.create({
            id: uuidv4(),
            procurement_id,
            previous_status,
            new_status,
            actor_id: 'OP-101',
            actor_name: actor_name || 'Centre Operator',
            actor_role: 'CENTRE_OPERATOR',
            reason: reason || `Status updated: ${previous_status} → ${new_status}`,
            owner: owner || 'Operations',
            next_action: next_action || 'Proceeding'
        });

        let paymentDoc = await Payment.findOne({ procurement_id });
        if (paymentDoc) {
            if (new_status === 'APPROVED') {
                paymentDoc.status = 'PROCESSING';
                paymentDoc.amount = (proc.actual_weighed_kg || proc.quantity_kg) * 22;
                await paymentDoc.save();
            } else if (new_status === 'PAID') {
                paymentDoc.status = 'PAID';
                paymentDoc.completed_at = new Date();
                await paymentDoc.save();
            }
        }

        await this.createNotification(proc.farmer_id, proc.centre_id, 'STATUS_UPDATE',
            `Procurement: ${new_status.replace('_', ' ')}`, `Your procurement is now ${new_status.replace('_', ' ')}. ${next_action || ''}`, '📋');

        return { procurement: proc.toObject(), payment: (paymentDoc && paymentDoc.toObject()) || null };
    }

    // ── FARMER TIMELINE ─────────────────────────────────────
    async getFarmerTimeline(farmerId) {
        if (!this.isMongoConnected()) return { farmer_id: farmerId, appointments: [], procurements: [], active_procurement: null, events: [], payments: [], notifications: [] };

        const appointments = await Appointment.find({ farmer_id: farmerId }).sort({ createdAt: -1 }).lean();
        const procurements = await Procurement.find({ farmer_id: farmerId }).lean();
        const payments = await Payment.find({ farmer_id: farmerId }).lean();
        const notifications = await Notification.find({ $or: [{ farmer_id: farmerId }, { farmer_id: 'ALL' }] }).sort({ createdAt: -1 }).limit(30).lean();

        const activeProc = procurements.find(p => !['COMPLETED', 'PAID'].includes(p.status)) || procurements[0];
        let events = [];
        if (activeProc) events = await ProcurementEvent.find({ procurement_id: activeProc.id }).sort({ createdAt: 1 }).lean();

        return { farmer_id: farmerId, appointments, procurements, active_procurement: activeProc || null, events, payments, notifications };
    }

    // ── EXCEPTIONS ──────────────────────────────────────────
    async createException({ farmer_id, farmer_name, centre_id, centre_name, procurement_id, type, severity, reason, owner, next_action }) {
        if (!this.isMongoConnected()) return null;
        const ex = await ExceptionModel.create({
            id: `EXC-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
            farmer_id: farmer_id || 'unknown',
            farmer_name: farmer_name || 'Unknown',
            centre_id,
            centre_name: centre_name || 'Centre',
            procurement_id: procurement_id || 'unknown',
            type: type || 'OPERATIONAL_DELAY',
            severity: severity || 'MEDIUM',
            reason: reason || 'Manual verification requested',
            owner: owner || 'District Nodal Officer',
            status: 'OPEN',
            next_action: next_action || 'Review required'
        });
        return ex.toObject();
    }

    async resolveException(exceptionId, resolutionNotes) {
        if (!this.isMongoConnected()) return null;
        const ex = await ExceptionModel.findOne({ id: exceptionId });
        if (!ex) return null;
        ex.status = 'RESOLVED';
        ex.resolved_at = new Date();
        ex.next_action = `Resolved: ${resolutionNotes || 'Cleared'}`;
        await ex.save();
        return ex.toObject();
    }

    // ── ADMIN METRICS ───────────────────────────────────────
    async getAdminDashboardMetrics() {
        const centres = await this.getAllCentres();
        const totalCentres = centres.length;
        const operationalCount = centres.filter(c => c.status === 'OPEN').length;
        const highLoadCount = centres.filter(c => c.color_status === 'YELLOW').length;
        const fullCount = centres.filter(c => c.color_status === 'RED').length;
        const closedCount = centres.filter(c => c.status === 'CLOSED').length;
        const totalCapacityKg = centres.reduce((s, c) => s + (c.daily_capacity_kg || 0), 0);
        const totalBookedKg = centres.reduce((s, c) => s + (c.booked_capacity_kg || 0), 0);
        const totalProcuredKg = centres.reduce((s, c) => s + (c.today_procured_kg || 0), 0);
        const totalQueueCount = centres.reduce((s, c) => s + (c.queue_count || 0), 0);
        const avgWaitMinutes = Math.round(centres.reduce((s, c) => s + (c.est_wait_minutes || 0), 0) / (totalCentres || 1));
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
            centres,
            recentEvents,
            exceptions
        };
    }

    // ── SLOTS WITH REAL-TIME DATE & TIME FETCHING ─────────
    async getSlotsForCentre(centreId, dateStr, clientTimeStr) {
        if (!this.isMongoConnected()) return [];

        // Compute current real-time date and time in local / IST
        const now = new Date();
        const localYear = now.getFullYear();
        const localMonth = String(now.getMonth() + 1).padStart(2, '0');
        const localDay = String(now.getDate()).padStart(2, '0');
        const serverTodayStr = `${localYear}-${localMonth}-${localDay}`;
        const targetDateStr = dateStr || serverTodayStr;
        const [clientHours, clientMinutes] = String(clientTimeStr || '').split(':').map(Number);
        const currentMinutesNow = Number.isFinite(clientHours) && Number.isFinite(clientMinutes) ?
            clientHours * 60 + clientMinutes :
            now.getHours() * 60 + now.getMinutes();

        // 24 half-hour operating slots from 08:00 AM to 08:00 PM
        const FULL_DAY_SLOT_DEFS = [
            { suffix: '0800', time: '08:00 - 08:30 AM', startMin: 8 * 60, endMin: 8 * 60 + 30 },
            { suffix: '0830', time: '08:30 - 09:00 AM', startMin: 8 * 60 + 30, endMin: 9 * 60 },
            { suffix: '0900', time: '09:00 - 09:30 AM', startMin: 9 * 60, endMin: 9 * 60 + 30 },
            { suffix: '0930', time: '09:30 - 10:00 AM', startMin: 9 * 60 + 30, endMin: 10 * 60 },
            { suffix: '1000', time: '10:00 - 10:30 AM', startMin: 10 * 60, endMin: 10 * 60 + 30 },
            { suffix: '1030', time: '10:30 - 11:00 AM', startMin: 10 * 60 + 30, endMin: 11 * 60 },
            { suffix: '1100', time: '11:00 - 11:30 AM', startMin: 11 * 60, endMin: 11 * 60 + 30 },
            { suffix: '1130', time: '11:30 - 12:00 PM', startMin: 11 * 60 + 30, endMin: 12 * 60 },
            { suffix: '1200', time: '12:00 - 12:30 PM', startMin: 12 * 60, endMin: 12 * 60 + 30 },
            { suffix: '1230', time: '12:30 - 01:00 PM', startMin: 12 * 60 + 30, endMin: 13 * 60 },
            { suffix: '1300', time: '01:00 - 01:30 PM', startMin: 13 * 60, endMin: 13 * 60 + 30 },
            { suffix: '1330', time: '01:30 - 02:00 PM', startMin: 13 * 60 + 30, endMin: 14 * 60 },
            { suffix: '1400', time: '02:00 - 02:30 PM', startMin: 14 * 60, endMin: 14 * 60 + 30 },
            { suffix: '1430', time: '02:30 - 03:00 PM', startMin: 14 * 60 + 30, endMin: 15 * 60 },
            { suffix: '1500', time: '03:00 - 03:30 PM', startMin: 15 * 60, endMin: 15 * 60 + 30 },
            { suffix: '1530', time: '03:30 - 04:00 PM', startMin: 15 * 60 + 30, endMin: 16 * 60 },
            { suffix: '1600', time: '04:00 - 04:30 PM', startMin: 16 * 60, endMin: 16 * 60 + 30 },
            { suffix: '1630', time: '04:30 - 05:00 PM', startMin: 16 * 60 + 30, endMin: 17 * 60 },
            { suffix: '1700', time: '05:00 - 05:30 PM', startMin: 17 * 60, endMin: 17 * 60 + 30 },
            { suffix: '1730', time: '05:30 - 06:00 PM', startMin: 17 * 60 + 30, endMin: 18 * 60 },
            { suffix: '1800', time: '06:00 - 06:30 PM', startMin: 18 * 60, endMin: 18 * 60 + 30 },
            { suffix: '1830', time: '06:30 - 07:00 PM', startMin: 18 * 60 + 30, endMin: 19 * 60 },
            { suffix: '1900', time: '07:00 - 07:30 PM', startMin: 19 * 60, endMin: 19 * 60 + 30 },
            { suffix: '1930', time: '07:30 - 08:00 PM', startMin: 19 * 60 + 30, endMin: 20 * 60 }
        ];

        let existingSlots = await Slot.find({ centre_id: centreId, slot_date: targetDateStr }).lean();
        const existingSlotSuffixes = new Set(existingSlots.map(s => {
            const parts = s.id.split('-');
            return parts[parts.length - 1];
        }));

        // Generate any missing slots
        for (const def of FULL_DAY_SLOT_DEFS) {
            if (!existingSlotSuffixes.has(def.suffix)) {
                const slotId = `slot-${centreId}-${targetDateStr}-${def.suffix}`;
                try {
                    await Slot.create({
                        id: slotId,
                        centre_id: centreId,
                        slot_date: targetDateStr,
                        start_time: def.time,
                        end_time: def.time,
                        maximum_bookings: 20,
                        current_bookings: 0,
                        is_available: true
                    });

                    // Create 20 positions for this slot
                    const newPosDocs = [];
                    for (let p = 1; p <= 20; p++) {
                        newPosDocs.push({
                            id: `${slotId}-pos-${p}`,
                            slot_id: slotId,
                            position_number: p,
                            status: 'AVAILABLE',
                            appointment_id: null,
                            booked_by: null,
                            booked_at: null
                        });
                    }
                    await SlotPosition.insertMany(newPosDocs);
                } catch (createErr) {
                    // Ignore duplicate key if concurrently created
                }
            }
        }

        // Refresh slot list from Mongo
        existingSlots = await Slot.find({ centre_id: centreId, slot_date: targetDateStr }).lean();

        // Helper: parse minutes from slot time string
        const parseSlotMinutes = (timeStr) => {
            const m = (timeStr || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (!m) return 0;
            let hr = parseInt(m[1], 10);
            const mn = parseInt(m[2], 10);
            const ampm = m[3].toUpperCase();
            if (ampm === 'PM' && hr < 12) hr += 12;
            if (ampm === 'AM' && hr === 12) hr = 0;
            return hr * 60 + mn;
        };

        const comparisonDateStr = dateStr || serverTodayStr;
        const isTargetToday = targetDateStr === comparisonDateStr;
        const isTargetFuture = targetDateStr > comparisonDateStr;
        const isTargetPast = targetDateStr < comparisonDateStr;

        const result = [];
        for (const s of existingSlots) {
            const positions = await SlotPosition.find({ slot_id: s.id }).lean();
            const bookedCount = positions.filter(p => p.status === 'BOOKED').length;
            const availCount = positions.filter(p => p.status === 'AVAILABLE').length;

            const slotStartMinutes = parseSlotMinutes(s.start_time);
            const slotEndMinutes = slotStartMinutes + 30;

            let isPast = false;
            let isCurrent = false;
            let isUpcoming = false;

            if (isTargetPast) {
                isPast = true;
            } else if (isTargetFuture) {
                isUpcoming = true;
            } else {
                // Today: real-time check against current clock
                if (currentMinutesNow >= slotEndMinutes) {
                    isPast = true;
                } else if (currentMinutesNow >= slotStartMinutes && currentMinutesNow < slotEndMinutes) {
                    isCurrent = true;
                } else {
                    isUpcoming = true;
                }
            }

            result.push({
                ...s,
                current_bookings: bookedCount,
                available_positions_count: availCount,
                is_available: availCount > 0 && !isPast,
                is_past: isPast,
                is_current: isCurrent,
                is_upcoming: isUpcoming,
                time_status: isCurrent ? 'CURRENT' : isPast ? 'PAST' : 'UPCOMING',
                start_minutes: slotStartMinutes,
                server_current_time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
                server_current_date: serverTodayStr
            });
        }

        // Sort chronologically by start time
        result.sort((a, b) => (a.start_minutes || 0) - (b.start_minutes || 0));
        return result;
    }

    async getSlotPositions(slotId) {
        if (!this.isMongoConnected()) return [];
        let positions = await SlotPosition.find({ slot_id: slotId }).sort({ position_number: 1 }).lean();
        if (positions.length === 0) {
            for (let p = 1; p <= 20; p++) {
                await SlotPosition.create({
                    id: `${slotId}-pos-${p}`,
                    slot_id: slotId,
                    position_number: p,
                    status: 'AVAILABLE',
                    appointment_id: null,
                    booked_by: null,
                    booked_at: null
                });
            }
            positions = await SlotPosition.find({ slot_id: slotId }).sort({ position_number: 1 }).lean();
        }
        return positions;
    }


    // ── PRODUCTS ────────────────────────────────────────────
    async getAllProducts() { return this.isMongoConnected() ? await Product.find().lean() : []; }
    async addProduct(data) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        const product = await Product.create({ id: `PROD-${Date.now()}`, name: data.name, category: data.category || 'Grain', package_weight_kg: Number(data.package_weight_kg) || 50, msp_price_per_kg: Number(data.msp_price_per_kg) || 22, moisture_threshold_percent: Number(data.moisture_threshold_percent) || 14, status: 'APPROVED' });
        return { success: true, product: product.toObject() };
    }

    async updateProductMSP(productId, newPrice) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        await Product.updateOne({ id: productId }, { $set: { msp_price_per_kg: Number(newPrice) } });
        return { success: true };
    }

    // ── WEIGHMENT & QUALITY (legacy direct) ─────────────────
    async addWeighment(data) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        const weighment = await Weighment.create({ id: uuidv4(), appointment_id: data.appointment_id, declared_quantity_kg: Number(data.declared_quantity_kg), measured_quantity_kg: Number(data.measured_quantity_kg), difference_kg: Number(data.measured_quantity_kg) - Number(data.declared_quantity_kg), machine_id: data.machine_id || 'WEIGHBRIDGE-01', operator_name: data.operator_name || 'Weighmaster' });
        return { success: true, weighment: weighment.toObject() };
    }

    async addQualityInspection(data) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        const inspection = await QualityInspection.create({ id: uuidv4(), appointment_id: data.appointment_id, moisture_percent: Number(data.moisture_percent), foreign_matter_percent: Number(data.foreign_matter_percent) || 0.5, damaged_percent: Number(data.damaged_percent) || 0.2, grade: data.grade || 'Grade A', remarks: data.remarks || 'Verified', status: data.status || 'ACCEPTED', inspector_name: data.inspector_name || 'Inspector' });
        return { success: true, inspection: inspection.toObject() };
    }

    // ── AUDIT LOGS ──────────────────────────────────────────
    async getAuditLogs() { return this.isMongoConnected() ? await AuditLog.find().sort({ createdAt: -1 }).limit(50).lean() : []; }

    // ── LAND & CROP INTELLIGENCE ────────────────────────────
    async getLandParcels(farmerId) {
        if (!this.isMongoConnected()) return [];
        if (!farmerId || farmerId === 'all') return [];
        return await LandParcel.find({ farmer_id: farmerId }).lean();
    }

    async verifyGovtLandRecord({ survey_number, state, district }) {
        const surveyClean = (survey_number || '142/2B').trim();
        if (this.isMongoConnected()) {
            const existing = await LandParcel.findOne({ survey_number: surveyClean }).lean();
            if (existing) return { success: true, parcel: existing };
        }
        const stateToUse = state || 'Karnataka';
        const isKA = stateToUse.toLowerCase().includes('karnataka');
        const mockParcel = { id: `parcel-${Math.floor(1000 + Math.random() * 9000)}`, farmer_id: 'default-farmer', survey_number: surveyClean, parcel_id: `${isKA ? 'KA-MND' : 'TN-ERD'}-${Date.now()}`, owner_name: 'Verified Owner', state: stateToUse, district: district || 'Mandya', village: isKA ? 'Mandya Rural' : 'Erode North', total_area_acres: 4.5, cultivable_area_acres: 4.2, verification_status: 'VERIFIED', govt_source: isKA ? 'Bhoomi RTC (Simulated)' : 'TN e-Patta (Simulated)' };
        return { success: true, parcel: mockParcel };
    }

    async registerLandParcel(data) {
        if (!this.isMongoConnected()) return { success: true, parcel: data };
        const parcel = await LandParcel.create({ id: data.id || `parcel-${uuidv4().substring(0, 8)}`, farmer_id: data.farmer_id || 'default-farmer', survey_number: data.survey_number, parcel_id: data.parcel_id || `PARCEL-${Date.now()}`, owner_name: data.owner_name || 'Owner', state: data.state || 'Karnataka', district: data.district || 'Mandya', village: data.village || 'Rural', total_area_acres: Number(data.total_area_acres) || 4.5, cultivable_area_acres: Number(data.cultivable_area_acres) || 4.5, verification_status: 'VERIFIED', govt_source: data.govt_source || 'Bhoomi RTC (Simulated)' });
        return { success: true, parcel: parcel.toObject() };
    }

    async deleteLandParcel(parcelId) {
        if (this.isMongoConnected()) {
            await LandParcel.deleteOne({ id: parcelId });
            await CropRecord.deleteMany({ parcel_id: parcelId });
        }
        return { success: true, message: 'Land parcel removed.' };
    }

    async registerCropAndPredict(data) {
        const cId = `crop-${uuidv4().substring(0, 8)}`;
        const cropName = data.crop_name || 'Paddy';
        const acres = Number(data.cultivated_area_acres) || 2.5;
        const sowingDate = data.sowing_date || new Date().toISOString().split('T')[0];
        let maturityDays = 115,
            yieldFactor = 1800;
        const cl = cropName.toLowerCase();
        if (cl.includes('groundnut')) {
            maturityDays = 110;
            yieldFactor = 1000;
        } else if (cl.includes('maize')) {
            maturityDays = 100;
            yieldFactor = 2200;
        } else if (cl.includes('sugarcane')) {
            maturityDays = 300;
            yieldFactor = 35000;
        }
        const est = Math.round(acres * yieldFactor * 1.1);
        const harvestMs = new Date(sowingDate).getTime() + maturityDays * 86400000;
        const harvestStr = new Date(harvestMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        const cropObj = { id: cId, parcel_id: data.parcel_id || 'parcel-101', farmer_id: data.farmer_id || 'default-farmer', crop_name: cropName, sowing_date: sowingDate, cultivated_area_acres: acres, irrigation_type: data.irrigation_type || 'CANAL', expected_harvest_start: harvestStr, estimated_yield_kg: est, status: 'CULTIVATING' };
        if (this.isMongoConnected()) await CropRecord.create(cropObj);
        return { success: true, crop: cropObj };
    }

    async getCropRecords(farmerId) {
        if (!this.isMongoConnected()) return [];
        const query = (farmerId && farmerId !== 'all') ? { farmer_id: farmerId } : {};
        return await CropRecord.find(query).lean();
    }

    async getIncomingCultivationsForCentre(centreId) {
        if (!this.isMongoConnected()) return [];
        const query = (centreId && centreId !== 'all') ? { assigned_centre_id: centreId } : {};
        return await CropRecord.find(query).sort({ created_at: -1 }).lean();
    }

    async getDistrictProcurementForecast(district) {
        const crops = await this.getCropRecords('all');
        const centres = await this.getAllCentres();
        let totalAcres = 0,
            totalTonnes = 0;
        crops.forEach(c => {
            totalAcres += Number(c.cultivated_area_acres || 0);
            totalTonnes += Number(c.estimated_yield_kg || 0) / 1000;
        });
        return { success: true, district: district || 'Mandya', total_registered_acres: Math.max(1420, totalAcres), total_expected_tonnes: Math.max(1240, Math.round(totalTonnes)), centres };
    }

    // ── MULTI-BAY & POSITION BOOKING ──────────────────────
    async bookAppointmentPosition({ farmer_id, farmer_name, farmer_phone, centre_id, slot_id, position_id, position_number, position_numbers, crop, crop_type, quantity_kg, declared_quantity_kg }) {
        if (!this.isMongoConnected()) return { success: false, error: 'Database disconnected.' };

        let targetNumbers = [];
        if (Array.isArray(position_numbers) && position_numbers.length > 0) {
            targetNumbers = position_numbers.map(Number);
        } else if (position_number) {
            targetNumbers = [Number(position_number)];
        }

        let positionsToBook = [];
        let effectiveSlotId = slot_id;

        if (targetNumbers.length > 0) {
            if (!effectiveSlotId) return { success: false, error: 'slot_id required for bay selection.' };

            // Find all target positions
            positionsToBook = await SlotPosition.find({
                slot_id: effectiveSlotId,
                position_number: { $in: targetNumbers }
            }).sort({ position_number: 1 });

            const unavailable = positionsToBook.filter(p => p.status !== 'AVAILABLE');
            if (unavailable.length > 0) {
                const unavailStr = unavailable.map(p => `#${p.position_number}`).join(', ');
                return { success: false, error: `Storage Bay(s) ${unavailStr} was just booked by another farmer. Please choose open green squares.` };
            }
            if (positionsToBook.length !== targetNumbers.length) {
                return { success: false, error: 'One or more selected bays could not be found.' };
            }
        } else if (position_id) {
            const pos = await SlotPosition.findOne({ id: position_id, status: 'AVAILABLE' });
            if (!pos) return { success: false, error: 'Selected bay is no longer available. Please select an open green square.' };
            positionsToBook = [pos];
            effectiveSlotId = pos.slot_id;
        } else {
            return { success: false, error: 'No storage bay positions provided.' };
        }

        const slot = await Slot.findOne({ id: effectiveSlotId });
        if (!slot) return { success: false, error: 'Slot not found.' };

        const effectiveCentreId = centre_id || slot.centre_id;
        const centre = await Centre.findOne({ id: effectiveCentreId });
        const tokenNumber = await this.generateToken(effectiveCentreId);
        const apptId = `APPT-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

        const finalCrop = crop || crop_type || 'Paddy (Sona Masoori)';
        const finalQty = Number(quantity_kg || declared_quantity_kg) || (positionsToBook.length * 500);
        const todayStr = slot.slot_date || new Date().toISOString().split('T')[0];

        const bookedNumbers = positionsToBook.map(p => p.position_number);
        const baysLabel = bookedNumbers.map(n => `Bay #${n < 10 ? '0' + n : n}`).join(', ');

        const newAppt = await Appointment.create({
            id: apptId,
            booking_id: `AGR-${Date.now()}-${Math.floor(Math.random() * 90000 + 10000)}`,
            token_number: tokenNumber,
            qr_token: `QR-${apptId}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            farmer_id: farmer_id || 'unknown',
            farmer_name: farmer_name || 'Farmer',
            farmer_phone: farmer_phone || '',
            centre_id: effectiveCentreId,
            centre_name: (centre && centre.name) || 'Procurement Centre',
            appointment_date: todayStr,
            time_slot: slot.start_time,
            slot_id: slot.id,
            position_number: bookedNumbers[0],
            position_numbers: bookedNumbers,
            bays_label: baysLabel,
            is_multi_slot: bookedNumbers.length > 1,
            crop_type: finalCrop,
            quantity_kg: finalQty,
            declared_quantity_kg: finalQty,
            status: 'WAITING'
        });

        // Mark all positions as booked
        const posIds = positionsToBook.map(p => p.id);
        await SlotPosition.updateMany({ id: { $in: posIds } }, { $set: { status: 'BOOKED', booked_by: farmer_id || 'unknown', booked_at: new Date(), appointment_id: apptId } });

        slot.current_bookings = await SlotPosition.countDocuments({ slot_id: slot.id, status: 'BOOKED' });
        slot.is_available = slot.current_bookings < slot.maximum_bookings;
        await slot.save();

        if (centre) {
            await Centre.updateOne({ id: centre.id }, { $inc: { booked_capacity_kg: finalQty, queue_count: 1 } });
        }

        // Create procurement + payment + notification
        const procId = `PROC-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        await Procurement.create({ id: procId, appointment_id: apptId, farmer_id: farmer_id || 'unknown', farmer_name: farmer_name || 'Farmer', centre_id: effectiveCentreId, centre_name: (centre && centre.name) || 'Centre', crop: finalCrop, quantity_kg: finalQty, status: 'WAITING' });

        await Payment.create({ id: `PAY-${Date.now()}`, procurement_id: procId, appointment_id: apptId, farmer_id: farmer_id || 'unknown', centre_id: effectiveCentreId, amount: finalQty * 22, status: 'PENDING', reference_number: `PAY-${Date.now()}` });

        await this.createNotification(
            farmer_id || 'unknown',
            effectiveCentreId,
            'SLOT_BOOKED',
            'Slot Booked',
            `Token ${tokenNumber} confirmed for ${Number(finalQty).toLocaleString()} kg ${finalCrop}.`,
            '📅',
            '/farmer/queue',
            apptId, { appointmentId: apptId, tokenNumber, quantity_kg: finalQty, crop: finalCrop }
        );

        if (farmer_phone) {
            sendSMS(farmer_phone, `AGRIFlow: Slot confirmed at ${centre?.name || 'Centre'}. Token: ${tokenNumber}. Bays: ${baysLabel}.`).catch(() => {});
        }

        return {
            success: true,
            appointment: newAppt.toObject(),
            position: positionsToBook[0].toObject(),
            positions: positionsToBook.map(p => p.toObject()),
            slot: slot.toObject(),
            token_number: tokenNumber,
            bays_label: baysLabel
        };
    }

    async cancelAppointmentPosition(appointmentId) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        const appt = await Appointment.findOne({ id: appointmentId });
        if (!appt) return { success: false, error: 'Appointment not found.' };
        if (appt.status === 'CANCELLED') return { success: false, error: 'Already cancelled.' };
        appt.status = 'CANCELLED';
        await appt.save();

        // Free all associated slot positions
        await SlotPosition.updateMany({ appointment_id: appointmentId }, { $set: { status: 'AVAILABLE', appointment_id: null, booked_by: null, booked_at: null } });

        const slot = await Slot.findOne({ id: appt.slot_id });
        if (slot) {
            slot.current_bookings = await SlotPosition.countDocuments({ slot_id: slot.id, status: 'BOOKED' });
            slot.is_available = slot.current_bookings < slot.maximum_bookings;
            await slot.save();
        }
        await Centre.updateOne({ id: appt.centre_id }, { $inc: { queue_count: -1 } });
        return { success: true, message: 'Appointment cancelled.' };
    }

    // ── RESET ───────────────────────────────────────────────
    async resetToCleanDefault() {
        if (this.isMongoConnected()) return await resetMongoToCleanState();
        return { success: true, message: 'Reset complete.' };
    }

    // ── PRODUCT / CROP MSP RATE MANAGEMENT ──────────────────
    async getAllProducts() {
        if (!this.isMongoConnected()) return [];
        const products = await Product.find({}).sort({ name: 1 }).lean();
        return products.map(p => ({
            id: p.id || (p._id && p._id.toString()),
            name: p.name,
            category: p.category || 'Grain',
            msp_price_per_kg: p.msp_price_per_kg || p.base_price_per_kg || 22,
            moisture_threshold_percent: p.moisture_threshold_percent || 14,
            status: p.status || 'APPROVED',
            updated_at: p.updated_at || p.updatedAt
        }));
    }

    async addProduct(productData) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        try {
            const product = new Product({
                id: uuidv4(),
                name: productData.name,
                category: productData.category || 'Grain',
                msp_price_per_kg: productData.msp_price_per_kg || productData.base_price_per_kg || 22,
                moisture_threshold_percent: productData.moisture_threshold_percent || 14,
                status: 'APPROVED',
                created_at: new Date(),
                updated_at: new Date()
            });
            await product.save();
            return { success: true, product: product.toObject() };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    async updateProductMSP(productId, newPricePerKg) {
        if (!this.isMongoConnected()) return { success: false, error: 'DB offline' };
        let product = await Product.findOne({ id: String(productId) });
        if (!product && mongoose.isValidObjectId(productId)) {
            product = await Product.findById(productId);
        }
        if (!product) return { success: false, error: 'Product not found.' };
        const oldPrice = product.msp_price_per_kg;
        product.msp_price_per_kg = Number(newPricePerKg);
        product.updated_at = new Date();
        await product.save();
        console.log(`[DB] MSP updated: ${product.name} ₹${oldPrice} → ₹${newPricePerKg}/kg`);
        return { success: true, product: product.toObject(), old_price: oldPrice, new_price: Number(newPricePerKg) };
    }
}

export const db = new AgriFlowMongoDatabase();