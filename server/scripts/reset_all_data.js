import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB } from '../config/dbMongo.js';
import { Appointment } from '../models/Appointment.js';
import { Procurement } from '../models/Procurement.js';
import { Payment } from '../models/Payment.js';
import { ProcurementEvent } from '../models/ProcurementEvent.js';
import { Weighment } from '../models/Weighment.js';
import { QualityInspection } from '../models/QualityInspection.js';
import { Notification } from '../models/Notification.js';
import { Centre } from '../models/Centre.js';
import { Slot } from '../models/Slot.js';
import { SlotPosition } from '../models/SlotPosition.js';

async function resetAllData() {
  console.log('🔄 Starting Fast Complete Fresh Reset of AgriFlow Data...');
  await connectDB();

  // 1. Delete all appointments, transactions, events, and notifications
  console.log('Clearing Appointments, Procurements, Payments, Events, Notifications...');
  await Appointment.deleteMany({});
  await Procurement.deleteMany({});
  await Payment.deleteMany({});
  await ProcurementEvent.deleteMany({});
  await Weighment.deleteMany({});
  await QualityInspection.deleteMany({});
  await Notification.deleteMany({});

  // 2. Reset Centre metrics
  console.log('Resetting Centre capacity, token counters, and queue counts...');
  await Centre.updateMany({}, {
    $set: {
      booked_capacity_kg: 0,
      queue_count: 0,
      today_procured_kg: 0,
      current_token_counter: 0,
      status: 'OPEN',
      last_updated: new Date()
    }
  });

  // 3. Clear existing Slots and SlotPositions
  console.log('Clearing old Slots and SlotPositions...');
  await Slot.deleteMany({});
  await SlotPosition.deleteMany({});

  const primaryCentres = ['centre-1', 'centre-2', 'centre-3'];
  const todayStr = new Date().toISOString().split('T')[0];

  const defaultTimeSlots = [
    { idSuffix: '0800', time: '08:00 - 08:30 AM', max: 20 },
    { idSuffix: '0830', time: '08:30 - 09:00 AM', max: 20 },
    { idSuffix: '0900', time: '09:00 - 09:30 AM', max: 20 },
    { idSuffix: '0930', time: '09:30 - 10:00 AM', max: 20 },
    { idSuffix: '1000', time: '10:00 - 10:30 AM', max: 20 },
    { idSuffix: '1030', time: '10:30 - 11:00 AM', max: 20 },
    { idSuffix: '1100', time: '11:00 - 11:30 AM', max: 20 },
    { idSuffix: '1200', time: '12:00 - 12:30 PM', max: 20 },
    { idSuffix: '1400', time: '02:00 - 02:30 PM', max: 20 }
  ];

  const slotsToInsert = [];
  const positionsToInsert = [];

  for (const centreId of primaryCentres) {
    for (const ts of defaultTimeSlots) {
      const slotId = `slot-${centreId}-${ts.idSuffix}`;
      slotsToInsert.push({
        id: slotId,
        centre_id: centreId,
        slot_date: todayStr,
        start_time: ts.time,
        end_time: ts.time,
        maximum_bookings: ts.max,
        current_bookings: 0,
        is_available: true
      });

      for (let pos = 1; pos <= ts.max; pos++) {
        positionsToInsert.push({
          id: `${slotId}-pos-${pos}`,
          slot_id: slotId,
          position_number: pos,
          status: 'AVAILABLE',
          appointment_id: null,
          booked_by: null,
          booked_at: null
        });
      }
    }
  }

  console.log(`Bulk inserting ${slotsToInsert.length} slots and ${positionsToInsert.length} positions...`);
  await Slot.insertMany(slotsToInsert);
  await SlotPosition.insertMany(positionsToInsert);

  console.log(`\n======================================================`);
  console.log(`✅ COMPLETE FRESH RESET SUCCESSFUL!`);
  console.log(`   - Appointments: 0`);
  console.log(`   - Procurements: 0`);
  console.log(`   - Payments: 0`);
  console.log(`   - Slots: ${slotsToInsert.length} (all 0% booked, 100% AVAILABLE)`);
  console.log(`   - Positions: ${positionsToInsert.length} (all AVAILABLE)`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

resetAllData().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
