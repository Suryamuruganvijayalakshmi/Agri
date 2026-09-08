import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  id:         { type: String, required: true, unique: true, index: true },
  farmer_id:  { type: String, index: true },   // legacy alias
  farmerId:   { type: String, index: true },   // standard identifier
  centre_id:  { type: String, default: null, index: true },
  type:       { type: String, required: true }, // SLOT_BOOKED | TOKEN_CALLED | WEIGHMENT_COMPLETED | QUALITY_COMPLETED | PAYMENT_COMPLETED
  title:      { type: String, required: true },
  message:    { type: String, required: true },
  icon:       { type: String, default: '🔔' },
  link:       { type: String, default: null },
  read:       { type: Boolean, default: false },
  relatedId:  { type: String, default: null },
  metadata:   { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Ensure farmerId and farmer_id are always kept in sync
notificationSchema.pre('save', function() {
  if (!this.farmer_id && this.farmerId) this.farmer_id = this.farmerId;
  if (!this.farmerId && this.farmer_id) this.farmerId = this.farmer_id;
});

export const Notification = mongoose.model('Notification', notificationSchema);
