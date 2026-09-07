import mongoose from 'mongoose';

const procurementEventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  procurement_id: { type: String, required: true, index: true },
  previous_status: { type: String },
  new_status: { type: String, required: true },
  actor_id: { type: String, default: 'SYSTEM' },
  actor_name: { type: String, default: 'System Operator' },
  actor_role: { type: String, default: 'SYSTEM' },
  reason: { type: String },
  owner: { type: String },
  next_action: { type: String },
  notes: { type: String }
}, { timestamps: true });

export const ProcurementEvent = mongoose.model('ProcurementEvent', procurementEventSchema);
