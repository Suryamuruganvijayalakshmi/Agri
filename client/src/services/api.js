const API_BASE = '/api';

// Helper to include auth token in requests
const authHeaders = () => {
  const token = localStorage.getItem('agriflow_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

// ============================================================
// CENTRES
// ============================================================

export const fetchCentres = async () => {
  const res = await fetch(`${API_BASE}/centres`);
  return res.json();
};

export const fetchCentreById = async (id) => {
  const res = await fetch(`${API_BASE}/centres/${id}`);
  return res.json();
};

// ============================================================
// RECOMMENDATIONS & INTELLIGENCE
// ============================================================

export const fetchRecommendations = async (lat = 12.5200, lng = 76.8900, quantity = 2500) => {
  const res = await fetch(`${API_BASE}/recommendations?lat=${lat}&lng=${lng}&quantity=${quantity}`);
  return res.json();
};

export const fetchGoIntelligence = async (centreId) => {
  const res = await fetch(`${API_BASE}/go-intelligence/${centreId}`);
  return res.json();
};

// ============================================================
// SLOTS & BOOKING
// ============================================================

export const fetchSlots = async (centreId, dateStr) => {
  const query = dateStr ? `?centre_id=${centreId}&date=${dateStr}` : `?centre_id=${centreId}`;
  const res = await fetch(`${API_BASE}/slots${query}`);
  return res.json();
};

export const fetchSlotPositions = async (slotId) => {
  const res = await fetch(`${API_BASE}/slots/${slotId}/positions`);
  return res.json();
};

export const bookAppointmentPositionAPI = async (bookingData) => {
  const res = await fetch(`${API_BASE}/appointments/book-position`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(bookingData)
  });
  return res.json();
};

export const cancelAppointmentAPI = async (appointmentId) => {
  const res = await fetch(`${API_BASE}/appointments/cancel`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ appointment_id: appointmentId })
  });
  return res.json();
};

export const bookAppointmentAtomic = async (bookingData) => {
  const res = await fetch(`${API_BASE}/appointments/book`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(bookingData)
  });
  return res.json();
};

export const bookAppointmentPosition = async (bookingData) => {
  const res = await fetch(`${API_BASE}/booking/position`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(bookingData)
  });
  return res.json();
};

// ============================================================
// LIVE QUEUE
// ============================================================

export const fetchLiveQueueForCentre = async (centreId = 'centre-1', farmerId = 'default-farmer') => {
  const res = await fetch(`${API_BASE}/queue/${centreId}?farmer_id=${farmerId}`);
  return res.json();
};

export const advanceCentreQueue = async (data) => {
  const res = await fetch(`${API_BASE}/queue/advance`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(data)
  });
  return res.json();
};

// ============================================================
// OFFICER PROCESSING ROUTES (NEW — Queue State Machine)
// ============================================================

export const nextFarmerInQueue = async (centreId = 'centre-1') => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/queue/next`, {
    method: 'POST', headers: authHeaders()
  });
  return res.json();
};

export const startProcessingFarmer = async (centreId, appointmentId) => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/queue/process`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ appointment_id: appointmentId })
  });
  return res.json();
};

export const recordWeighmentAPI = async (centreId, appointmentId, actualWeightKg) => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/queue/weighment`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ appointment_id: appointmentId, actual_weight_kg: actualWeightKg })
  });
  return res.json();
};

export const recordQualityAPI = async (centreId, appointmentId, grade, moisture) => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/queue/quality`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ appointment_id: appointmentId, grade, moisture })
  });
  return res.json();
};

export const completeProcurementAPI = async (centreId, appointmentId) => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/queue/complete`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ appointment_id: appointmentId })
  });
  return res.json();
};

export const updatePaymentStatusAPI = async (paymentId, newStatus) => {
  const res = await fetch(`${API_BASE}/payment/update/${paymentId}`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ new_status: newStatus })
  });
  return res.json();
};

export const fetchCentrePaymentsAPI = async (centreId = 'centre-1') => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/payments`);
  return res.json();
};

export const seedDemoFarmersAPI = async (centreId, count = 10) => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/demo-farmers`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ count })
  });
  return res.json();
};

// ============================================================
// FARMER DASHBOARD
// ============================================================

export const fetchFarmerDashboard = async (farmerId) => {
  const res = await fetch(`${API_BASE}/farmer/dashboard/${farmerId}`);
  return res.json();
};

export const fetchFarmerTimeline = async (farmerId) => {
  const res = await fetch(`${API_BASE}/farmer/timeline/${farmerId}`);
  return res.json();
};

export const fetchFarmerActiveBooking = async (farmerId) => {
  const res = await fetch(`${API_BASE}/farmer/active-booking/${farmerId}`);
  return res.json();
};


// ============================================================
// OPERATOR ROUTES
// ============================================================

export const updateOperatorCentreStatus = async (updateData) => {
  const res = await fetch(`${API_BASE}/operator/centre-status`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(updateData)
  });
  return res.json();
};

export const updateProcurementStage = async (stageData) => {
  const res = await fetch(`${API_BASE}/operator/update-stage`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(stageData)
  });
  return res.json();
};

export const createException = async (exData) => {
  const res = await fetch(`${API_BASE}/exceptions`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(exData)
  });
  return res.json();
};

export const resolveException = async (exId, notes) => {
  const res = await fetch(`${API_BASE}/exceptions/resolve`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ exception_id: exId, resolution_notes: notes })
  });
  return res.json();
};

// ============================================================
// ADMIN
// ============================================================

export const fetchAdminMetrics = async () => {
  const res = await fetch(`${API_BASE}/admin/metrics`);
  return res.json();
};

export const fetchAuditLogs = async () => {
  const res = await fetch(`${API_BASE}/admin/audit-logs`);
  return res.json();
};

export const runDemoStep = async (step) => {
  const res = await fetch(`${API_BASE}/demo/run-scenario`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ step })
  });
  return res.json();
};

// ============================================================
// PRODUCTS
// ============================================================

export const fetchProducts = async () => {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
};

export const addProductAPI = async (productData) => {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(productData)
  });
  return res.json();
};

export const approveProductAPI = async (productId) => {
  const res = await fetch(`${API_BASE}/admin/products/approve`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ product_id: productId })
  });
  return res.json();
};

export const rejectProductAPI = async (productId) => {
  const res = await fetch(`${API_BASE}/admin/products/reject`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify({ product_id: productId })
  });
  return res.json();
};

// ============================================================
// LAND & CROP INTELLIGENCE
// ============================================================

export const fetchLandParcels = async (farmerId = 'default-farmer') => {
  const res = await fetch(`${API_BASE}/land/parcels/${farmerId}`);
  return res.json();
};

export const verifyGovtLandRecord = async (searchData) => {
  const res = await fetch(`${API_BASE}/land/verify-parcel`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(searchData)
  });
  return res.json();
};

export const registerLandParcel = async (parcelData) => {
  const res = await fetch(`${API_BASE}/land/parcels`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(parcelData)
  });
  return res.json();
};

export const deleteLandParcelAPI = async (id) => {
  const res = await fetch(`${API_BASE}/land/parcels/${id}`, { method: 'DELETE' });
  return res.json();
};

export const registerCrop = async (cropData) => {
  const res = await fetch(`${API_BASE}/crops/register`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(cropData)
  });
  return res.json();
};

export const fetchFarmerCrops = async (farmerId = 'default-farmer') => {
  const res = await fetch(`${API_BASE}/crops/${farmerId}`);
  return res.json();
};

export const fetchDistrictForecast = async (district = 'Mandya') => {
  const res = await fetch(`${API_BASE}/forecasting/district-forecast?district=${encodeURIComponent(district)}`);
  return res.json();
};

export const applyCapacityRecommendations = async (recData) => {
  const res = await fetch(`${API_BASE}/forecasting/apply-recommendations`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(recData)
  });
  return res.json();
};

export const fetchIncomingCultivationsForCentre = async (centreId = 'all') => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/incoming-cultivations`);
  return res.json();
};

// ============================================================
// RESET & UTILITY
// ============================================================

export const resetDatabaseAPI = async () => {
  const res = await fetch(`${API_BASE}/reset-database`, {
    method: 'POST', headers: authHeaders()
  });
  return res.json();
};

export const resetCentreAPI = async (centreId = 'centre-1') => {
  const res = await fetch(`${API_BASE}/centres/${centreId}/reset`, {
    method: 'POST', headers: authHeaders()
  });
  return res.json();
};

// Legacy compat aliases
export const bookPhoneWhatsappAPI = async (bookingData) => bookAppointmentAtomic(bookingData);
export const reallocateStorageAPI = async () => ({ success: true });
export const fetchLoadPackageMetrics = async () => ({ success: true, packages: [] });
export const submitQualityInspectionAPI = async (qualData) => {
  const res = await fetch(`${API_BASE}/inspector/quality`, {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(qualData)
  });
  return res.json();
};
