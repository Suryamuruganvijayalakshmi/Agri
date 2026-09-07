import mongoose from 'mongoose';

const qualityInspectionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  appointment_id: { type: String, required: true, index: true },
  moisture_percent: { type: Number, required: true },
  foreign_matter_percent: { type: Number, default: 0.5 },
  damaged_percent: { type: Number, default: 0.2 },
  grade: { type: String, default: 'Grade A' },
  remarks: { type: String },
  status: { type: String, enum: ['ACCEPTED', 'REJECTED', 'RECHECK'], default: 'ACCEPTED' },
  inspector_name: { type: String, default: 'Senior Quality Inspector' }
}, { timestamps: true });

export const QualityInspection = mongoose.model('QualityInspection', qualityInspectionSchema);
