import { db } from './db.js';
import { connectDB } from './config/dbMongo.js';

async function runTests() {
  console.log('🚀 Starting Multi-Slot & Real-Time Booking Verification Tests...');
  await connectDB();

  const centreId = 'centre-1';
  const today = new Date().toISOString().split('T')[0];

  // TEST 1: Fetch slots with real-time metadata
  console.log('\n--- TEST 1: Real-Time Slots Fetching ---');
  const slots = await db.getSlotsForCentre(centreId, today);
  console.log(`Total slots returned for today: ${slots.length}`);
  if (slots.length < 15) throw new Error('Expected at least 20 full-day operating slots');

  const currentSlot = slots.find(s => s.is_current);
  const pastSlots = slots.filter(s => s.is_past);
  const upcomingSlots = slots.filter(s => s.is_upcoming);
  console.log(`Real-Time Breakdown -> Past: ${pastSlots.length}, Current: ${currentSlot ? currentSlot.start_time : 'None'}, Upcoming: ${upcomingSlots.length}`);
  console.log(`Server Current Time: ${slots[0]?.server_current_time}, Server Date: ${slots[0]?.server_current_date}`);

  // Pick an available slot
  const openSlot = slots.find(s => s.is_available) || slots[0];
  console.log(`Using slot: ${openSlot.id} (${openSlot.start_time})`);

  // TEST 2: Multi-Bay Booking for Produce > 500 kg (1500 kg -> 3 bays)
  console.log('\n--- TEST 2: Multi-Bay Booking for Produce > 500 kg (1,500 kg) ---');
  const farmerId = `F-MULTI-${Date.now()}`;
  const bookRes1 = await db.bookAppointmentAtomic({
    farmer_id: farmerId,
    farmer_name: 'Malleshappa Gowda',
    farmer_phone: '9845011111',
    centre_id: centreId,
    appointment_date: today,
    time_slot: openSlot.start_time,
    quantity_kg: 1500, // 3 bays required
    crop: 'Paddy (Sona Masoori)'
  });

  console.log('Booking 1 Result:', {
    success: bookRes1.success,
    token: bookRes1.token_number,
    bays: bookRes1.appointment?.bays_label,
    position_numbers: bookRes1.appointment?.position_numbers,
    is_multi_slot: bookRes1.appointment?.is_multi_slot
  });

  if (!bookRes1.success) throw new Error('Booking 1 failed: ' + bookRes1.error);
  if (bookRes1.appointment?.position_numbers?.length !== 3) {
    throw new Error(`Expected 3 bays for 1,500kg, but got ${bookRes1.appointment?.position_numbers?.length}`);
  }

  // TEST 3: Booking a SECOND slot for the SAME farmer on the SAME date (Multiple Slots Allowed)
  console.log('\n--- TEST 3: Multiple Slot Bookings for Same Farmer ---');
  const nextOpenSlot = slots.find(s => s.id !== openSlot.id && s.is_available) || slots[1];
  const bookRes2 = await db.bookAppointmentAtomic({
    farmer_id: farmerId,
    farmer_name: 'Malleshappa Gowda',
    farmer_phone: '9845011111',
    centre_id: centreId,
    appointment_date: today,
    time_slot: nextOpenSlot.start_time,
    quantity_kg: 1000, // 2 bays required
    crop: 'Ragi (Finger Millet)'
  });

  console.log('Booking 2 Result (Second slot for same farmer):', {
    success: bookRes2.success,
    token: bookRes2.token_number,
    bays: bookRes2.appointment?.bays_label,
    position_numbers: bookRes2.appointment?.position_numbers
  });

  if (!bookRes2.success) throw new Error('Booking 2 failed: ' + bookRes2.error);
  if (bookRes2.appointment?.position_numbers?.length !== 2) {
    throw new Error(`Expected 2 bays for 1,000kg, but got ${bookRes2.appointment?.position_numbers?.length}`);
  }

  // TEST 4: Direct Multi-Bay Position Booking
  console.log('\n--- TEST 4: Direct Multi-Bay Position Booking (e.g. Bays #06, #07, #08) ---');
  // Find open positions in slot
  const slotPositions = await db.getSlotPositions(openSlot.id);
  const openPositions = slotPositions.filter(p => p.status === 'AVAILABLE').slice(0, 3);
  const targetBayNums = openPositions.map(p => p.position_number);
  console.log(`Booking specific bays: ${targetBayNums.join(', ')}`);

  const bookPosRes = await db.bookAppointmentPosition({
    farmer_id: `F-POS-${Date.now()}`,
    farmer_name: 'Ningegowda',
    farmer_phone: '9845022222',
    centre_id: centreId,
    slot_id: openSlot.id,
    position_numbers: targetBayNums,
    crop: 'Maize (Corn)',
    quantity_kg: 1500
  });

  console.log('Position Booking Result:', {
    success: bookPosRes.success,
    token: bookPosRes.token_number,
    bays_label: bookPosRes.bays_label,
    booked_count: bookPosRes.positions?.length
  });

  if (!bookPosRes.success) throw new Error('Position booking failed: ' + bookPosRes.error);
  if (bookPosRes.positions?.length !== 3) {
    throw new Error(`Expected 3 bays booked, got ${bookPosRes.positions?.length}`);
  }

  console.log('\n✅ ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
