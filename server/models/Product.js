import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, unique: true },
  category: { type: String, default: 'Grain' },
  package_weight_kg: { type: Number, default: 50 },
  msp_price_per_kg: { type: Number, default: 22 },
  moisture_threshold_percent: { type: Number, default: 14 },
  status: { type: String, enum: ['APPROVED', 'PENDING', 'REJECTED'], default: 'APPROVED' },
  proposed_by: { type: String }
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);
