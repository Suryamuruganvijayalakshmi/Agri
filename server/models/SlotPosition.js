import mongoose from 'mongoose';

const slotPositionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  slot_id: { type: String, required: true, index: true },
  position_number: { type: Number, required: true },
  status: { type: String, enum: ['AVAILABLE', 'BOOKED', 'BLOCKED'], default: 'AVAILABLE', index: true },
  appointment_id: { type: String, default: null },
  booked_by: { type: String, default: null },
  booked_at: { type: Date, default: null }
}, { timestamps: true });

slotPositionSchema.index({ slot_id: 1, position_number: 1 }, { unique: true });

export const SlotPosition = mongoose.model('SlotPosition', slotPositionSchema);
