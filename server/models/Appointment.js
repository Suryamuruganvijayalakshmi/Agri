import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  booking_id: { type: String, required: true, unique: true },
  token_number: { type: String, required: true },
  qr_token: { type: String, required: true },
  farmer_id: { type: String, required: true, index: true },
  farmer_name: { type: String, default: 'Farmer' },
  farmer_phone: { type: String },
  centre_id: { type: String, required: true, index: true },
  centre_name: { type: String },
  slot_id: { type: String, index: true },
  position_number: { type: Number },
  position_numbers: { type: [Number], default: [] },
  bays_label: { type: String, default: '' },
  is_multi_slot: { type: Boolean, default: false },
  appointment_date: { type: String },
  time_slot: { type: String },
  crop_type: { type: String, default: 'Paddy' },
  quantity_kg: { type: Number, default: 0 },
  declared_quantity_kg: { type: Number, required: true },
  actual_weight_kg: { type: Number, default: 0 },
  quality_grade: { type: String, default: '' },
  quality_moisture: { type: String, default: '' },
  status: {
    type: String,
    enum: ['BOOKED', 'WAITING', 'CALLED', 'PROCESSING', 'WEIGHMENT', 'QUALITY_CHECK', 'COMPLETED', 'CANCELLED'],
    default: 'BOOKED',
    index: true
  }
}, { timestamps: true });

// Compound index for unique tokens per centre per date
appointmentSchema.index({ centre_id: 1, token_number: 1, appointment_date: 1 }, { unique: true });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
