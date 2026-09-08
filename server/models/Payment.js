import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  procurement_id: { type: String, required: true, index: true },
  appointment_id: { type: String, index: true },
  farmer_id: { type: String, required: true, index: true },
  farmer_name: { type: String },
  centre_id: { type: String, index: true },
  crop: { type: String, default: 'Paddy' },
  quantity_kg: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'PROCESSING', 'APPROVED', 'PAID', 'FAILED'], default: 'PENDING', index: true },
  reference_number: { type: String },
  owner: { type: String },
  reason: { type: String },
  next_action: { type: String },
  bank_account_mask: { type: String, default: 'State Bank of India (A/C ending *4902)' },
  initiated_at: { type: Date, default: null },
  completed_at: { type: Date, default: null }
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
