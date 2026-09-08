import mongoose from 'mongoose';

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  expirationTime: {
    type: Number,
    default: null
  },
  keys: {
    auth: { type: String, required: true },
    p256dh: { type: String, required: true }
  },
  userId: {
    type: String,
    default: 'anonymous',
    index: true  // for fast per-user lookups
  },
  role: {
    type: String,
    default: 'FARMER'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const PushSubscription = mongoose.models.PushSubscription || mongoose.model('PushSubscription', pushSubscriptionSchema);
