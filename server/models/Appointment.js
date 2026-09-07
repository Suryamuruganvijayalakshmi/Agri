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
  appointment_date: { type: String },
  time_slot: { type: String },
  crop_type: { type: String, default: 'Paddy' },
  declared_quantity_kg: { type: Number, required: true },
  status: { type: String, enum: ['BOOKED', 'CHECKED_IN', 'IN_TRANSIT', 'WEIGHED', 'APPROVED', 'PAID', 'CANCELLED'], default: 'BOOKED', index: true }
}, { timestamps: true });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
