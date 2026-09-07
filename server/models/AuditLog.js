import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  user_role: { type: String, default: 'SYSTEM' },
  user_name: { type: String, default: 'System Operator' },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entity_id: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
