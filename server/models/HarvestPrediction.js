import mongoose from 'mongoose';

const harvestPredictionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  crop_record_id: { type: String, required: true, index: true },
  farmer_id: { type: String, required: true, index: true },
  farmer_name: { type: String, default: 'Surya.V.M' },
  farmer_phone: { type: String, default: '+91 98450 12345' },
  survey_number: { type: String },
  village: { type: String, default: 'Mandya' },
  district: { type: String, default: 'Mandya' },
  crop_name: { type: String, required: true },
  cultivated_area_acres: { type: Number, required: true },
  expected_harvest_start: { type: String, required: true },
  expected_harvest_end: { type: String, required: true },
  estimated_yield_min_kg: { type: Number, required: true },
  estimated_yield_max_kg: { type: Number, required: true },
  confidence_percent: { type: Number, required: true, default: 87 },
  ndvi_index: { type: Number, default: 0.82 },
  assigned_centre_id: { type: String, default: 'centre-1' },
  assigned_centre_name: { type: String, default: 'Mandya Central Procurement Yard' },
  assigned_centre_distance_km: { type: Number, default: 3.5 },
  eligible_slot_start_date: { type: String },
  eligible_slot_end_date: { type: String },
  slot_booking_opens_date: { type: String },
  influencing_factors: [
    {
      factor_name: String,
      impact: String, // e.g. "+8%", "-3%"
      description: String
    }
  ],
  created_at: { type: Date, default: Date.now }
});

export const HarvestPrediction = mongoose.models.HarvestPrediction || mongoose.model('HarvestPrediction', harvestPredictionSchema);

