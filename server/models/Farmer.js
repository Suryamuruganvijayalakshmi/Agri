import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    profile_id: { type: String, index: true },
    farmer_code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String },
    state: { type: String, default: 'Karnataka' },
    district: { type: String, default: 'Mandya' },
    village: { type: String, default: 'Central' },
    landholding_acres: { type: Number, default: 4.5 },
    primary_crop: { type: String, default: 'Paddy (Sona Masoori)' },
    aadhaar_number: { type: String, default: 'XXXX-XXXX-4902' },
    bank_name: { type: String, default: '' },
    bank_account: { type: String, default: 'XXXX-XXXX-8821' },
    ifsc: { type: String, default: 'SBIN0001234' }
}, { timestamps: true });

export const Farmer = mongoose.model('Farmer', farmerSchema);