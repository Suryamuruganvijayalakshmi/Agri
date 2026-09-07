import mongoose from 'mongoose';

const weighmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  declared_quantity_kg: { type: Number, required: true },
  measured_quantity_kg: { type: Number, required: true },
  difference_kg: { type: Number, required: true },
  machine_id: { type: String, default: 'WEIGHBRIDGE-01' },
  operator_name: { type: String, default: 'Yard Weighmaster' }
}, { timestamps: true });

export const Weighment = mongoose.model('Weighment', weighmentSchema);
