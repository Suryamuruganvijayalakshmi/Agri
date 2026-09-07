import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  centre_id: { type: String, required: true, index: true },
  slot_date: { type: String, required: true, index: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  maximum_bookings: { type: Number, default: 20 },
  current_bookings: { type: Number, default: 0 },
  is_available: { type: Boolean, default: true }
}, { timestamps: true });

export const Slot = mongoose.model('Slot', slotSchema);
