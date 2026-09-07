import mongoose from 'mongoose';

const exceptionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  farmer_id: { type: String, required: true, index: true },
  farmer_name: { type: String },
  centre_id: { type: String, required: true, index: true },
  centre_name: { type: String },
  procurement_id: { type: String, index: true },
  type: { type: String, default: 'OPERATIONAL_DELAY' },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  reason: { type: String },
  owner: { type: String },
  status: { type: String, enum: ['OPEN', 'IN_REVIEW', 'RESOLVED'], default: 'OPEN', index: true },
  next_action: { type: String },
  resolved_at: { type: Date, default: null }
}, { timestamps: true });

export const ExceptionModel = mongoose.model('Exception', exceptionSchema);
