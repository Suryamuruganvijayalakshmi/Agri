const API_BASE = '/api';

export const fetchCentres = async () => {
  const res = await fetch(`${API_BASE}/centres`);
  return res.json();
};

export const fetchCentreById = async (id) => {
  const res = await fetch(`${API_BASE}/centres/${id}`);
  return res.json();
};

export const fetchRecommendations = async (lat = 12.5200, lng = 76.8900, quantity = 2500) => {
  const res = await fetch(`${API_BASE}/recommendations?lat=${lat}&lng=${lng}&quantity=${quantity}`);
  return res.json();
};

export const fetchGoIntelligence = async (centreId) => {
  const res = await fetch(`${API_BASE}/go-intelligence/${centreId}`);
  return res.json();
};

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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  return res.json();
};

export const cancelAppointmentAPI = async (appointmentId) => {
  const res = await fetch(`${API_BASE}/appointments/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointment_id: appointmentId })
  });
  return res.json();
};

export const bookAppointmentAtomic = async (bookingData) => {
  const res = await fetch(`${API_BASE}/appointments/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  return res.json();
};

export const fetchFarmerTimeline = async (farmerId) => {
  const res = await fetch(`${API_BASE}/farmer/timeline/${farmerId}`);
  return res.json();
};

export const updateOperatorCentreStatus = async (updateData) => {
  const res = await fetch(`${API_BASE}/operator/centre-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  return res.json();
};

export const updateProcurementStage = async (stageData) => {
  const res = await fetch(`${API_BASE}/operator/update-stage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stageData)
  });
  return res.json();
};

export const createException = async (exData) => {
  const res = await fetch(`${API_BASE}/exceptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exData)
  });
  return res.json();
};

export const resolveException = async (exId, notes) => {
  const res = await fetch(`${API_BASE}/exceptions/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ exception_id: exId, resolution_notes: notes })
  });
  return res.json();
};

export const fetchAdminMetrics = async () => {
  const res = await fetch(`${API_BASE}/admin/metrics`);
  return res.json();
};

export const runDemoStep = async (step) => {
  const res = await fetch(`${API_BASE}/demo/run-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step })
  });
  return res.json();
};

export const fetchProducts = async () => {
  const res = await fetch(`${API_BASE}/products`);
  return res.json();
};

export const addProductAPI = async (productData) => {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData)
  });
  return res.json();
};

export const bookPhoneWhatsappAPI = async (bookingData) => {
  const res = await fetch(`${API_BASE}/booking/phone-whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  return res.json();
};

export const reallocateStorageAPI = async (reallocData) => {
  const res = await fetch(`${API_BASE}/reallocate-storage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reallocData)
  });
  return res.json();
};

export const fetchLoadPackageMetrics = async () => {
  const res = await fetch(`${API_BASE}/metrics/load-packages`);
  return res.json();
};

export const recordWeighmentAPI = async (weighData) => {
  const res = await fetch(`${API_BASE}/operator/weighment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weighData)
  });
  return res.json();
};

export const submitQualityInspectionAPI = async (qualData) => {
  const res = await fetch(`${API_BASE}/inspector/quality`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(qualData)
  });
  return res.json();
};

export const approveProductAPI = async (productId) => {
  const res = await fetch(`${API_BASE}/admin/products/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId })
  });
  return res.json();
};

export const rejectProductAPI = async (productId) => {
  const res = await fetch(`${API_BASE}/admin/products/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId })
  });
  return res.json();
};

export const fetchAuditLogs = async () => {
  const res = await fetch(`${API_BASE}/admin/audit-logs`);
  return res.json();
};


