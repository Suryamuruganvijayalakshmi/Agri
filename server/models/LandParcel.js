import mongoose from 'mongoose';

const landParcelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  farmer_id: { type: String, required: true, index: true },
  survey_number: { type: String, required: true },
  parcel_id: { type: String, required: true },
  owner_name: { type: String, required: true },
  state: { type: String, default: 'Karnataka' },
  district: { type: String, default: 'Mandya' },
  village: { type: String, default: 'Mandya Rural' },
  total_area_acres: { type: Number, required: true },
  cultivable_area_acres: { type: Number, required: true },
  polygon_coordinates: { type: [[Number]], required: true }, // Array of [lat, lng]
  verification_status: { type: String, enum: ['VERIFIED', 'PENDING', 'REJECTED'], default: 'VERIFIED' },
  govt_source: { type: String, default: 'Bhoomi RTC Govt Database (Simulated)' },
  created_at: { type: Date, default: Date.now }
});

export const LandParcel = mongoose.models.LandParcel || mongoose.model('LandParcel', landParcelSchema);
