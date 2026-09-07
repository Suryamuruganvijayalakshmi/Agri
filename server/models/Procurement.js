import mongoose from 'mongoose';

const procurementSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  farmer_id: { type: String, required: true, index: true },
  farmer_name: { type: String },
  centre_id: { type: String, required: true, index: true },
  centre_name: { type: String },
  crop: { type: String, default: 'Paddy' },
  quantity_kg: { type: Number, required: true },
  actual_weighed_kg: { type: Number, default: 0 },
  quality_grade: { type: String, default: 'Pending Verification' },
  quality_moisture: { type: String, default: 'Pending Measurement' },
  status: { type: String, default: 'BOOKED', index: true }
}, { timestamps: true });

export const Procurement = mongoose.model('Procurement', procurementSchema);
