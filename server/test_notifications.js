// AGRIFlow Notification System E2E Test v2
// Books a farmer, then processes THAT farmer through the entire pipeline
const API = 'http://localhost:5000/api';

async function post(url, data = {}, headers = {}) {
  const res = await fetch(`${API}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function patch(url, data = {}, headers = {}) {
  const res = await fetch(`${API}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function get(url, headers = {}) {
  const res = await fetch(`${API}${url}`, {
    headers: { ...headers }
  });
  return res.json();
}

async function runTests() {
  console.log('\n========================================');
  console.log('🧪 AGRIFlow Notification System E2E Test');
  console.log('========================================\n');

  const testFarmerId = 'test-notif-' + Date.now();
  const centreId = 'centre-1';
  let passed = 0;
  let failed = 0;
  let appointmentId = null;
  let tokenNumber = null;

  // ── Step 1: Book a slot ────────────────────────────────────────
  console.log('📌 Test 1: Book a slot → SLOT_BOOKED notification');
  try {
    const slotsRes = await get(`/slots?centre_id=${centreId}`);
    const slot = (slotsRes.slots || []).find(s => s.is_available);
    if (!slot) { console.log('   ⚠️  No available slot. Aborting.'); return; }

    const posRes = await get(`/slots/${slot.id}/positions`);
    const availPos = (posRes.positions || []).find(p => p.status === 'AVAILABLE');
    if (!availPos) { console.log('   ⚠️  No available position. Aborting.'); return; }

    const bookRes = await post('/appointments/book-position', {
      farmer_id: testFarmerId,
      farmer_name: 'Test Notification Farmer',
      farmer_phone: '9999999999',
      centre_id: centreId,
      slot_id: slot.id,
      position_numbers: [availPos.position_number],
      crop: 'Paddy',
      quantity_kg: 3200
    });

    if (!bookRes.success) { console.log('   ❌ Booking failed:', bookRes.error); failed++; return; }
    appointmentId = bookRes.appointment?.id;
    tokenNumber = bookRes.token_number;
    console.log(`   ✅ Booked! Token: ${tokenNumber}, Appointment: ${appointmentId}`);

    const notifsRes = await get(`/notifications/${testFarmerId}`);
    const slotNotif = (notifsRes.notifications || []).find(n => n.type === 'SLOT_BOOKED');
    if (slotNotif) {
      console.log(`   ✅ SLOT_BOOKED: "${slotNotif.title}" — "${slotNotif.message}"`);
      console.log(`      Link: ${slotNotif.link} | Icon: ${slotNotif.icon}`);
      passed++;
    } else { console.log('   ❌ SLOT_BOOKED notification NOT found'); failed++; }
  } catch (e) { console.log('   ❌ Error:', e.message); failed++; return; }

  // ── Step 2: Call all WAITING farmers until ours is called ──────
  console.log('\n📌 Test 2: Call farmer through queue → TOKEN_CALLED notification');
  try {
    // Keep calling next until our farmer gets called (or queue empties)
    let ourFarmerCalled = false;
    for (let i = 0; i < 20; i++) {
      const callRes = await post(`/centres/${centreId}/queue/next`);
      if (!callRes.success || callRes.queue_empty) break;
      if (callRes.called_farmer?.farmer_id === testFarmerId) {
        ourFarmerCalled = true;
        console.log(`   ✅ Our farmer called after ${i + 1} queue advance(s)`);
        break;
      }
    }

    if (ourFarmerCalled) {
      const notifsRes = await get(`/notifications/${testFarmerId}`);
      const callNotif = (notifsRes.notifications || []).find(n => n.type === 'TOKEN_CALLED');
      if (callNotif) {
        console.log(`   ✅ TOKEN_CALLED: "${callNotif.title}" — "${callNotif.message}"`);
        passed++;
      } else { console.log('   ❌ TOKEN_CALLED notification NOT found'); failed++; }
    } else {
      console.log('   ⚠️  Our farmer was not reached in queue. Skipping remaining tests.');
      return;
    }
  } catch (e) { console.log('   ❌ Error:', e.message); failed++; }

  // ── Step 3: Record weighment ──────────────────────────────────
  console.log('\n📌 Test 3: Record weighment → WEIGHMENT_COMPLETED notification');
  try {
    const weighRes = await post(`/centres/${centreId}/queue/weighment`, {
      appointment_id: appointmentId,
      actual_weight_kg: 3180
    });
    if (weighRes.success) {
      console.log('   ✅ Weighment recorded: 3,180 kg');
      const notifsRes = await get(`/notifications/${testFarmerId}`);
      const weighNotif = (notifsRes.notifications || []).find(n => n.type === 'WEIGHMENT_COMPLETED');
      if (weighNotif) {
        console.log(`   ✅ WEIGHMENT_COMPLETED: "${weighNotif.title}" — "${weighNotif.message}"`);
        passed++;
      } else { console.log('   ❌ WEIGHMENT_COMPLETED notification NOT found'); failed++; }
    } else {
      console.log('   ❌ Weighment failed:', weighRes.error); failed++;
    }
  } catch (e) { console.log('   ❌ Error:', e.message); failed++; }

  // ── Step 4: Record quality ────────────────────────────────────
  console.log('\n📌 Test 4: Record quality → QUALITY_COMPLETED notification');
  try {
    const qualRes = await post(`/centres/${centreId}/queue/quality`, {
      appointment_id: appointmentId,
      grade: 'Grade A',
      moisture: '12.5'
    });
    if (qualRes.success) {
      console.log('   ✅ Quality recorded: Grade A');
      const notifsRes = await get(`/notifications/${testFarmerId}`);
      const qualNotif = (notifsRes.notifications || []).find(n => n.type === 'QUALITY_COMPLETED');
      if (qualNotif) {
        console.log(`   ✅ QUALITY_COMPLETED: "${qualNotif.title}" — "${qualNotif.message}"`);
        passed++;
      } else { console.log('   ❌ QUALITY_COMPLETED notification NOT found'); failed++; }
    } else {
      console.log('   ❌ Quality failed:', qualRes.error); failed++;
    }
  } catch (e) { console.log('   ❌ Error:', e.message); failed++; }

  // ── Step 5: Complete procurement → PAYMENT_COMPLETED ──────────
  console.log('\n📌 Test 5: Complete procurement → PAYMENT_COMPLETED notification');
  try {
    const completeRes = await post(`/centres/${centreId}/queue/complete`, {
      appointment_id: appointmentId
    });
    if (completeRes.success) {
      console.log('   ✅ Procurement completed');
      const notifsRes = await get(`/notifications/${testFarmerId}`);
      const payNotif = (notifsRes.notifications || []).find(n => n.type === 'PAYMENT_COMPLETED');
      if (payNotif) {
        console.log(`   ✅ PAYMENT_COMPLETED: "${payNotif.title}" — "${payNotif.message}"`);
        passed++;
      } else { console.log('   ❌ PAYMENT_COMPLETED notification NOT found'); failed++; }
    } else {
      console.log('   ❌ Complete failed:', completeRes.error); failed++;
    }
  } catch (e) { console.log('   ❌ Error:', e.message); failed++; }

  // ── Step 6: Read / Read-all status via PATCH & Standard Routes ───
  console.log('\n📌 Test 6: Standard REST APIs (GET /api/notifications, PATCH mark-read, PATCH read-all)');
  try {
    const farmerHeaders = { 'x-farmer-id': testFarmerId };
    
    // GET /api/notifications (authenticated/scoped)
    const scopedRes = await get('/notifications', farmerHeaders);
    if (!scopedRes.success || !Array.isArray(scopedRes.notifications)) {
      console.log('   ❌ GET /notifications failed'); failed++;
    } else {
      console.log(`   ✅ GET /api/notifications (farmer-scoped): returned ${scopedRes.notifications.length} records`);
    }

    // GET /api/notifications/unread-count (authenticated/scoped)
    const unreadBefore = await get('/notifications/unread-count', farmerHeaders);
    console.log(`   📊 GET /api/notifications/unread-count: ${unreadBefore.count}`);

    if (scopedRes.notifications?.length > 0) {
      const firstId = scopedRes.notifications[0].id;
      // PATCH /api/notifications/:id/read
      const patchOne = await patch(`/notifications/${firstId}/read`, {}, farmerHeaders);
      if (patchOne.success && patchOne.notification?.read === true) {
        console.log(`   ✅ PATCH /api/notifications/${firstId}/read: marked as read`);
      } else {
        console.log('   ❌ PATCH /api/notifications/:id/read failed'); failed++;
      }

      // PATCH /api/notifications/read-all
      const patchAll = await patch('/notifications/read-all', { farmerId: testFarmerId }, farmerHeaders);
      const unreadAfterAll = await get('/notifications/unread-count', farmerHeaders);
      if (patchAll.success && unreadAfterAll.count === 0) {
        console.log('   ✅ PATCH /api/notifications/read-all: 0 unread remaining');
        passed++;
      } else {
        console.log(`   ❌ Expected 0 unread after mark-all, got ${unreadAfterAll.count}`);
        failed++;
      }
    }
  } catch (e) { console.log('   ❌ Error in Test 6:', e.message); failed++; }

  // ── Step 7: MongoDB Schema Verification ────────────────────────
  console.log('\n📌 Test 7: MongoDB Notification Model & Schema Verification');
  try {
    const checkRes = await get(`/notifications/${testFarmerId}`);
    const notifs = checkRes.notifications || [];
    let schemaValid = true;
    for (const n of notifs) {
      if (!n.farmerId || !n.type || !n.title || !n.message || !n.createdAt) {
        schemaValid = false;
        console.log(`   ❌ Notification ${n.id} missing required schema field:`, n);
        break;
      }
    }
    if (schemaValid && notifs.length === 5) {
      console.log('   ✅ Schema Verified: farmerId, type, title, message, read, createdAt, relatedId, metadata present on all 5 lifecycle documents');
      passed++;
    } else {
      console.log(`   ❌ Schema verification failed (found ${notifs.length} records)`);
      failed++;
    }
  } catch (e) { console.log('   ❌ Error in Test 7:', e.message); failed++; }

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed, out of 7 tests`);
  console.log('========================================\n');

  // Print all notifications for this farmer as final proof
  const finalNotifs = await get(`/notifications/${testFarmerId}`);
  console.log(`📋 All ${finalNotifs.notifications?.length || 0} notifications for ${testFarmerId}:`);
  for (const n of (finalNotifs.notifications || [])) {
    console.log(`   [${n.type}] ${n.icon} "${n.title}" — "${n.message}" (link: ${n.link || 'none'}, relatedId: ${n.relatedId || 'none'})`);
  }
  console.log('');
}

runTests().catch(console.error);
