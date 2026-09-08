import mongoose from 'mongoose';

const centreSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  token_prefix: { type: String, default: 'A' },
  current_token_counter: { type: Number, default: 0 },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  address: { type: String },
  district: { type: String, default: 'Mandya' },
  state: { type: String, default: 'Karnataka' },
  status: { type: String, enum: ['OPEN', 'HIGH_LOAD', 'FULL', 'CLOSED'], default: 'OPEN' },
  daily_capacity_kg: { type: Number, default: 50000 },
  booked_capacity_kg: { type: Number, default: 0 },
  active_counters: { type: Number, default: 4 },
  avg_processing_minutes: { type: Number, default: 15 },
  operational_start: { type: String, default: '08:00 AM' },
  operational_end: { type: String, default: '06:00 PM' },
  queue_count: { type: Number, default: 0 },
  today_procured_kg: { type: Number, default: 0 },
  contact_phone: { type: String },
  last_updated: { type: Date, default: Date.now }
}, { timestamps: true });

export const Centre = mongoose.model('Centre', centreSchema);
