import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true, index: true },
  farmer_id:  { type: String, required: true, index: true },   // 'ALL' = broadcast to all farmers
  centre_id:  { type: String, default: null, index: true },
  type:       { type: String, required: true },                 // CENTRE_UPDATE | BOOKING_CONFIRMED | REMINDER | etc.
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  icon:       { type: String, default: '🔔' },
  link:       { type: String, default: null },
  read:       { type: Boolean, default: false }
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);
