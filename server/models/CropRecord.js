import mongoose from 'mongoose';

const cropRecordSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  parcel_id: { type: String, required: true, index: true },
  farmer_id: { type: String, required: true, index: true },
  farmer_name: { type: String, default: 'Surya.V.M' },
  farmer_phone: { type: String, default: '+91 98450 12345' },
  survey_number: { type: String },
  village: { type: String, default: 'Mandya' },
  district: { type: String, default: 'Mandya' },
  crop_name: { type: String, required: true },
  crop_variety: { type: String, default: 'Standard' },
  sowing_date: { type: String, required: true },
  cultivated_area_acres: { type: Number, required: true },
  irrigation_type: { type: String, enum: ['CANAL', 'BOREWELL', 'RAINFED', 'DRIP'], default: 'CANAL' },
  soil_type: { type: String, default: 'Clay Loam' },
  cultivation_method: { type: String, enum: ['CONVENTIONAL', 'ORGANIC', 'SRI'], default: 'CONVENTIONAL' },
  expected_harvest_start: { type: String },
  expected_harvest_end: { type: String },
  estimated_yield_kg: { type: Number },
  prediction_confidence: { type: Number, default: 87 },
  assigned_centre_id: { type: String, default: 'centre-1' },
  assigned_centre_name: { type: String, default: 'Mandya Central Procurement Yard' },
  assigned_centre_distance_km: { type: Number, default: 3.5 },
  eligible_slot_start_date: { type: String },
  eligible_slot_end_date: { type: String },
  slot_booking_opens_date: { type: String },
  status: { type: String, enum: ['CULTIVATING', 'HARVESTED', 'PROCURED'], default: 'CULTIVATING' },
  created_at: { type: Date, default: Date.now }
});

export const CropRecord = mongoose.models.CropRecord || mongoose.model('CropRecord', cropRecordSchema);

