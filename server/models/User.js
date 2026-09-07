import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, required: true },
  phone: { type: String },
  role: { type: String, enum: ['FARMER', 'CENTRE_OPERATOR', 'QUALITY_INSPECTOR', 'ADMIN'], default: 'FARMER' },
  district: { type: String, default: 'Mandya' },
  state: { type: String, default: 'Karnataka' },
  assigned_centre_id: { type: String },
  assigned_centre_name: { type: String }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
