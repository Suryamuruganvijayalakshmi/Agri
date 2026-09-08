import mongoose from 'mongoose';
import { Centre } from '../models/Centre.js';
import { Slot } from '../models/Slot.js';
import { SlotPosition } from '../models/SlotPosition.js';
import { Product } from '../models/Product.js';
import { LandParcel } from '../models/LandParcel.js';
import { CropRecord } from '../models/CropRecord.js';
import { HarvestPrediction } from '../models/HarvestPrediction.js';
import { Appointment } from '../models/Appointment.js';
import { Procurement } from '../models/Procurement.js';
import { ProcurementEvent } from '../models/ProcurementEvent.js';
import { Weighment } from '../models/Weighment.js';
import { QualityInspection } from '../models/QualityInspection.js';
import { Payment } from '../models/Payment.js';
import { ExceptionModel } from '../models/Exception.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import { REAL_COLD_STORAGES_TN } from '../real_cold_storages.js';
import dns from 'dns';

// Fix Windows DNS SRV resolution for MongoDB Atlas cloud clusters
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // Ignored in restricted environments
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agriflow';

let cachedPromise = null;

export const connectDB = async() => {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        return true;
    }

    if (cachedPromise) {
        return await cachedPromise;
    }

    const primaryUri = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || 'mongodb://127.0.0.1:27017/agriflow';
    const fallbackUri = 'mongodb://127.0.0.1:27017/agriflow';

    const tryConnect = async(uri) => {
        mongoose.set('strictQuery', false);
        return await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
    };

    try {
        cachedPromise = (async() => {
            let conn;
            try {
                conn = await tryConnect(primaryUri);
            } catch (primaryErr) {
                if (primaryUri !== fallbackUri) {
                    console.warn(`⚠️ Primary MongoDB failed (${primaryErr.message}). Reconnecting via local MongoDB...`);
                    try {
                        conn = await tryConnect(fallbackUri);
                    } catch (fallbackErr) {
                        throw primaryErr;
                    }
                } else {
                    throw primaryErr;
                }
            }

            console.log(`🍃 MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
            await seedMongoBaselineData().catch(() => {});
            return true;
        })().catch((error) => {
            cachedPromise = null;
            console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
            return false;
        });

        return await cachedPromise;
    } catch (error) {
        cachedPromise = null;
        console.warn(`⚠️ MongoDB connection error: ${error.message}`);
        return false;
    }
};


export const seedMongoBaselineData = async() => {
    try {
        const centreCount = await Centre.countDocuments();
        if (centreCount === 0) {
            console.log(`🌱 Seeding initial procurement centres into MongoDB...`);
            const initialCentres = [{
                    id: 'centre-1',
                    code: 'PROC-KA-01',
                    name: 'Mandya Central Procurement Yard',
                    token_prefix: 'A',
                    current_token_counter: 0,
                    latitude: 12.5224,
                    longitude: 76.8974,
                    address: 'APMC Market Yard, NH 275, Mandya, Karnataka',
                    district: 'Mandya',
                    state: 'Karnataka',
                    status: 'OPEN',
                    daily_capacity_kg: 50000,
                    booked_capacity_kg: 0,
                    active_counters: 4,
                    avg_processing_minutes: 12,
                    operational_start: '08:00 AM',
                    operational_end: '06:00 PM',
                    queue_count: 0,
                    today_procured_kg: 0,
                    contact_phone: '+91 98450 11223'
                },
                {
                    id: 'centre-2',
                    code: 'PROC-KA-02',
                    name: 'Maddur Grain Storage & Procurement Centre',
                    token_prefix: 'B',
                    current_token_counter: 0,
                    latitude: 12.5843,
                    longitude: 77.0452,
                    address: 'Old Bazaar Street, Maddur, Karnataka',
                    district: 'Mandya',
                    state: 'Karnataka',
                    status: 'OPEN',
                    daily_capacity_kg: 40000,
                    booked_capacity_kg: 0,
                    active_counters: 3,
                    avg_processing_minutes: 15,
                    operational_start: '08:30 AM',
                    operational_end: '05:30 PM',
                    queue_count: 0,
                    today_procured_kg: 0,
                    contact_phone: '+91 98450 44556'
                },
                {
                    id: 'centre-3',
                    code: 'PROC-KA-03',
                    name: 'Srirangapatna Agri Warehousing Hub',
                    token_prefix: 'C',
                    current_token_counter: 0,
                    latitude: 12.4215,
                    longitude: 76.6932,
                    address: 'Station Road, Near Railway Yard, Srirangapatna',
                    district: 'Mandya',
                    state: 'Karnataka',
                    status: 'OPEN',
                    daily_capacity_kg: 35000,
                    booked_capacity_kg: 0,
                    active_counters: 2,
                    avg_processing_minutes: 18,
                    operational_start: '08:00 AM',
                    operational_end: '05:00 PM',
                    queue_count: 0,
                    today_procured_kg: 0,
                    contact_phone: '+91 98450 77889'
                }
            ];

            for (const c of initialCentres) {
                await Centre.updateOne({ id: c.id }, { $setOnInsert: c }, { upsert: true });
            }

            // Seed Tamil Nadu Cold Storages
            for (const cs of REAL_COLD_STORAGES_TN) {
                await Centre.updateOne({ id: cs.id }, {
                    $setOnInsert: {
                        ...cs,
                        booked_capacity_kg: 0,
                        queue_count: 0,
                        today_procured_kg: 0
                    }
                }, { upsert: true });
            }
            console.log(`✅ Procurement centres seeded.`);
        }

        // Seed Slots & Slot Positions
        const slotCount = await Slot.countDocuments();
        if (slotCount === 0) {
            console.log(`🌱 Seeding initial slots & slot positions into MongoDB...`);
            const todayStr = new Date().toISOString().split('T')[0];
            const centres = await Centre.find({ id: { $in: ['centre-1', 'centre-2', 'centre-3'] } }).lean();

            const defaultTimeSlots = [
                { idSuffix: '0800', time: '08:00 - 08:30 AM', start_time: '08:00', end_time: '08:30', max: 20 },
                { idSuffix: '0830', time: '08:30 - 09:00 AM', start_time: '08:30', end_time: '09:00', max: 20 },
                { idSuffix: '0900', time: '09:00 - 09:30 AM', start_time: '09:00', end_time: '09:30', max: 20 },
                { idSuffix: '0930', time: '09:30 - 10:00 AM', start_time: '09:30', end_time: '10:00', max: 20 },
                { idSuffix: '1000', time: '10:00 - 10:30 AM', start_time: '10:00', end_time: '10:30', max: 20 },
                { idSuffix: '1030', time: '10:30 - 11:00 AM', start_time: '10:30', end_time: '11:00', max: 20 },
                { idSuffix: '1100', time: '11:00 - 11:30 AM', start_time: '11:00', end_time: '11:30', max: 20 }
            ];

            const allSlots = [];
            const allPositions = [];

            for (const centre of centres) {
                for (const ts of defaultTimeSlots) {
                    const slotId = `slot-${centre.id}-${ts.idSuffix}`;
                    allSlots.push({
                        id: slotId,
                        centre_id: centre.id,
                        slot_date: todayStr,
                        start_time: ts.time,
                        end_time: ts.time,
                        maximum_bookings: ts.max,
                        current_bookings: 0,
                        is_available: true
                    });

                    for (let pos = 1; pos <= ts.max; pos++) {
                        allPositions.push({
                            id: `${slotId}-pos-${pos}`,
                            slot_id: slotId,
                            position_number: pos,
                            status: 'AVAILABLE',
                            appointment_id: null,
                            booked_by: null,
                            booked_at: null
                        });
                    }
                }
            }

            await Slot.insertMany(allSlots, { ordered: false }).catch(() => {});
            await SlotPosition.insertMany(allPositions, { ordered: false }).catch(() => {});
            console.log(`✅ Slots and 20-position grids seeded into MongoDB.`);
        }

        // Seed default crop products used by farmer estimates and officer MSP control.
        const productCount = await Product.countDocuments();
        if (productCount === 0) {
            await Product.insertMany([
                { id: 'prod-paddy', name: 'Paddy (Sona Masoori)', category: 'Grain', package_weight_kg: 50, msp_price_per_kg: 22, moisture_threshold_percent: 14, status: 'APPROVED' },
                { id: 'prod-groundnut', name: 'Groundnut', category: 'Oilseed', package_weight_kg: 50, msp_price_per_kg: 68, moisture_threshold_percent: 10, status: 'APPROVED' },
                { id: 'prod-maize', name: 'Maize', category: 'Grain', package_weight_kg: 50, msp_price_per_kg: 22, moisture_threshold_percent: 14, status: 'APPROVED' },
                { id: 'prod-sugarcane', name: 'Sugarcane', category: 'Cash Crop', package_weight_kg: 100, msp_price_per_kg: 3.4, moisture_threshold_percent: 18, status: 'APPROVED' }
            ]);
        }

        // Seed Sample Government Land Parcels (Simulated Bhoomi / RTC Integration)
        const landCount = await LandParcel.countDocuments();
        if (landCount === 0) {
            console.log(`🌱 Seeding sample government land record parcels...`);
            const sampleParcels = [{
                    id: 'parcel-101',
                    farmer_id: 'default-farmer',
                    survey_number: '142/2B',
                    parcel_id: 'KA-MND-2026-8819',
                    owner_name: 'Surya.V.M',
                    state: 'Karnataka',
                    district: 'Mandya',
                    village: 'Mandya Rural',
                    total_area_acres: 4.5,
                    cultivable_area_acres: 4.5,
                    polygon_coordinates: [
                        [12.5255, 76.8940],
                        [12.5270, 76.8970],
                        [12.5245, 76.8990],
                        [12.5230, 76.8955]
                    ],
                    verification_status: 'VERIFIED',
                    govt_source: 'Bhoomi RTC Database (Simulated API)'
                },
                {
                    id: 'parcel-102',
                    farmer_id: 'default-farmer',
                    survey_number: '89/1A',
                    parcel_id: 'KA-MDR-2026-4402',
                    owner_name: 'Surya.V.M',
                    state: 'Karnataka',
                    district: 'Mandya',
                    village: 'Maddur Village',
                    total_area_acres: 3.2,
                    cultivable_area_acres: 3.0,
                    polygon_coordinates: [
                        [12.5870, 77.0420],
                        [12.5890, 77.0450],
                        [12.5860, 77.0470],
                        [12.5840, 77.0435]
                    ],
                    verification_status: 'VERIFIED',
                    govt_source: 'Bhoomi RTC Database (Simulated API)'
                },
                {
                    id: 'parcel-103',
                    farmer_id: 'default-farmer',
                    survey_number: '210/4C',
                    parcel_id: 'TN-ERD-2026-9931',
                    owner_name: 'Surya.V.M',
                    state: 'Tamil Nadu',
                    district: 'Erode',
                    village: 'Erode North',
                    total_area_acres: 5.0,
                    cultivable_area_acres: 4.8,
                    polygon_coordinates: [
                        [11.3430, 77.7180],
                        [11.3460, 77.7220],
                        [11.3420, 77.7250],
                        [11.3390, 77.7200]
                    ],
                    verification_status: 'VERIFIED',
                    govt_source: 'Tamil Nadu e-Patta Govt Portal (Simulated API)'
                }
            ];

            for (const p of sampleParcels) {
                await LandParcel.updateOne({ id: p.id }, { $setOnInsert: p }, { upsert: true });
            }
            console.log(`✅ Sample government land record parcels seeded into MongoDB.`);
        }

        // Seed Dedicated Government Officers for each centre
        await seedDedicatedOfficers();

    } catch (err) {
        console.error('Error seeding MongoDB baseline data:', err);
    }
};

export const DEDICATED_OFFICERS = [{
        id: 'user-officer-mandya',
        email: 'officer.mandya@agriflow.gov.in',
        full_name: 'Suresh Kumar',
        phone: '+91 98450 11223',
        role: 'CENTRE_OPERATOR',
        district: 'Mandya',
        state: 'Karnataka',
        assigned_centre_id: 'centre-1',
        assigned_centre_name: 'Mandya Central Procurement Yard',
        designation: 'Chief Procurement Officer',
        badge_code: 'GOV-KA-MND-01'
    },
    {
        id: 'user-officer-maddur',
        email: 'officer.maddur@agriflow.gov.in',
        full_name: 'Rajesh Gowda',
        phone: '+91 98450 44556',
        role: 'CENTRE_OPERATOR',
        district: 'Mandya',
        state: 'Karnataka',
        assigned_centre_id: 'centre-2',
        assigned_centre_name: 'Maddur Grain Storage & Procurement Centre',
        designation: 'Yard Superintendent',
        badge_code: 'GOV-KA-MDR-02'
    },
    {
        id: 'user-officer-srirangapatna',
        email: 'officer.srirangapatna@agriflow.gov.in',
        full_name: 'Anitha Murthy',
        phone: '+91 98450 77889',
        role: 'CENTRE_OPERATOR',
        district: 'Mandya',
        state: 'Karnataka',
        assigned_centre_id: 'centre-3',
        assigned_centre_name: 'Srirangapatna Agri Warehousing Hub',
        designation: 'Chief Inspector & Yard Lead',
        badge_code: 'GOV-KA-SRP-03'
    },
    {
        id: 'user-officer-erode',
        email: 'officer.erode@agriflow.gov.in',
        full_name: 'K. Selvanathan',
        phone: '+91 94432 55678',
        role: 'CENTRE_OPERATOR',
        district: 'Erode',
        state: 'Tamil Nadu',
        assigned_centre_id: 'cs-tn-41',
        assigned_centre_name: 'Sakthi Cold Storage & Agri Terminal',
        designation: 'Terminal Logistics Manager',
        badge_code: 'GOV-TN-ERD-41'
    },
    {
        id: 'user-admin-state',
        email: 'admin@agriflow.gov.in',
        full_name: 'Dr. Rameshwar Rao',
        phone: '+91 98000 99999',
        role: 'ADMIN',
        district: 'Bengaluru',
        state: 'Karnataka',
        assigned_centre_id: null,
        assigned_centre_name: 'Karnataka State Directorate of Agri-Marketing',
        designation: 'State Director of Agriculture',
        badge_code: 'GOV-DIR-001'
    }
];

export const seedDedicatedOfficers = async() => {
    try {
        const defaultOfficerHash = await bcrypt.hash('Officer@123', 10);
        const defaultAdminHash = await bcrypt.hash('Admin@123', 10);

        for (const off of DEDICATED_OFFICERS) {
            const passHash = off.role === 'ADMIN' ? defaultAdminHash : defaultOfficerHash;
            await User.updateOne({ email: off.email.toLowerCase() }, {
                $set: {
                    id: off.id,
                    email: off.email.toLowerCase(),
                    password_hash: passHash,
                    full_name: off.full_name,
                    phone: off.phone,
                    role: off.role,
                    district: off.district,
                    state: off.state,
                    assigned_centre_id: off.assigned_centre_id,
                    assigned_centre_name: off.assigned_centre_name
                }
            }, { upsert: true });
        }
        console.log(`✅ Dedicated Centre Officer accounts seeded into MongoDB.`);
    } catch (err) {
        console.error('Error seeding dedicated officers:', err);
    }
};

export const resetMongoToCleanState = async() => {
    try {
        console.log(`🧹 Clearing all bookings and resetting site to clean default state...`);

        // 1. Delete all transactional records & custom crop/land entries
        await Appointment.deleteMany({});
        await Procurement.deleteMany({});
        await ProcurementEvent.deleteMany({});
        await Weighment.deleteMany({});
        await QualityInspection.deleteMany({});
        await Payment.deleteMany({});
        await ExceptionModel.deleteMany({});
        await Notification.deleteMany({});
        await CropRecord.deleteMany({});
        await HarvestPrediction.deleteMany({});
        await Slot.deleteMany({});
        await SlotPosition.deleteMany({});

        // Reset land parcels to clean baseline
        await LandParcel.deleteMany({});
        const sampleParcels = [{
                id: 'parcel-101',
                farmer_id: 'default-farmer',
                survey_number: '142/2B',
                parcel_id: 'KA-MND-2026-8819',
                owner_name: 'Surya.V.M',
                state: 'Karnataka',
                district: 'Mandya',
                village: 'Mandya Rural',
                total_area_acres: 4.5,
                cultivable_area_acres: 4.5,
                polygon_coordinates: [
                    [12.5255, 76.8940],
                    [12.5270, 76.8970],
                    [12.5245, 76.8990],
                    [12.5230, 76.8955]
                ],
                verification_status: 'VERIFIED',
                govt_source: 'Bhoomi RTC Database (Simulated API)'
            },
            {
                id: 'parcel-102',
                farmer_id: 'default-farmer',
                survey_number: '89/1A',
                parcel_id: 'KA-MDR-2026-4402',
                owner_name: 'Surya.V.M',
                state: 'Karnataka',
                district: 'Mandya',
                village: 'Maddur Village',
                total_area_acres: 3.2,
                cultivable_area_acres: 3.0,
                polygon_coordinates: [
                    [12.5870, 77.0420],
                    [12.5890, 77.0450],
                    [12.5860, 77.0470],
                    [12.5840, 77.0435]
                ],
                verification_status: 'VERIFIED',
                govt_source: 'Bhoomi RTC Database (Simulated API)'
            },
            {
                id: 'parcel-103',
                farmer_id: 'default-farmer',
                survey_number: '210/4C',
                parcel_id: 'TN-ERD-2026-9931',
                owner_name: 'Surya.V.M',
                state: 'Tamil Nadu',
                district: 'Erode',
                village: 'Erode North',
                total_area_acres: 5.0,
                cultivable_area_acres: 4.8,
                polygon_coordinates: [
                    [11.3430, 77.7180],
                    [11.3460, 77.7220],
                    [11.3420, 77.7250],
                    [11.3390, 77.7200]
                ],
                verification_status: 'VERIFIED',
                govt_source: 'Tamil Nadu e-Patta Govt Portal (Simulated API)'
            }
        ];
        for (const p of sampleParcels) {
            await LandParcel.create(p);
        }

        // 2. Reset Centre capacities and stats
        await Centre.updateMany({}, {
            $set: {
                booked_capacity_kg: 0,
                queue_count: 0,
                today_procured_kg: 0,
                current_token_counter: 0,
                status: 'OPEN'
            }

        });

        // 3. Re-seed clean default time slots & 20-position grids
        const todayStr = new Date().toISOString().split('T')[0];
        const centres = await Centre.find({ id: { $in: ['centre-1', 'centre-2', 'centre-3'] } }).lean();

        const defaultTimeSlots = [
            { idSuffix: '0800', time: '08:00 - 08:30 AM', start_time: '08:00', end_time: '08:30', max: 20 },
            { idSuffix: '0830', time: '08:30 - 09:00 AM', start_time: '08:30', end_time: '09:00', max: 20 },
            { idSuffix: '0900', time: '09:00 - 09:30 AM', start_time: '09:00', end_time: '09:30', max: 20 },
            { idSuffix: '0930', time: '09:30 - 10:00 AM', start_time: '09:30', end_time: '10:00', max: 20 },
            { idSuffix: '1000', time: '10:00 - 10:30 AM', start_time: '10:00', end_time: '10:30', max: 20 },
            { idSuffix: '1030', time: '10:30 - 11:00 AM', start_time: '10:30', end_time: '11:00', max: 20 },
            { idSuffix: '1100', time: '11:00 - 11:30 AM', start_time: '11:00', end_time: '11:30', max: 20 }
        ];

        const allSlots = [];
        const allPositions = [];

        for (const centre of centres) {
            for (const ts of defaultTimeSlots) {
                const slotId = `slot-${centre.id}-${ts.idSuffix}`;
                allSlots.push({
                    id: slotId,
                    centre_id: centre.id,
                    slot_date: todayStr,
                    start_time: ts.time,
                    end_time: ts.time,
                    maximum_bookings: ts.max,
                    current_bookings: 0,
                    is_available: true
                });

                for (let pos = 1; pos <= ts.max; pos++) {
                    allPositions.push({
                        id: `${slotId}-pos-${pos}`,
                        slot_id: slotId,
                        position_number: pos,
                        status: 'AVAILABLE',
                        appointment_id: null,
                        booked_by: null,
                        booked_at: null
                    });
                }
            }
        }

        await Slot.insertMany(allSlots, { ordered: false });
        await SlotPosition.insertMany(allPositions, { ordered: false });

        // Ensure dedicated officer accounts exist
        await seedDedicatedOfficers();

        // Re-seed default crops for default farmer
        const defaultCrops = [{
                id: 'crop-rec-101',
                parcel_id: 'parcel-101',
                farmer_id: 'default-farmer',
                farmer_name: 'Surya.V.M',
                farmer_phone: '+91 98450 12345',
                survey_number: '142/2B',
                village: 'Mandya Rural',
                district: 'Mandya',
                crop_name: 'Paddy',
                crop_variety: 'Sona Masoori (IR-64)',
                sowing_date: '2026-05-15',
                cultivated_area_acres: 3.5,
                irrigation_type: 'CANAL',
                soil_type: 'Clay Loam (Rich Alluvial)',
                cultivation_method: 'CONVENTIONAL',
                expected_harvest_start: '2026-09-10',
                expected_harvest_end: '2026-09-25',
                estimated_yield_kg: 4200,
                prediction_confidence: 94,
                assigned_centre_id: 'centre-1',
                assigned_centre_name: 'Mandya Central Procurement Yard',
                assigned_centre_distance_km: 3.8,
                status: 'CULTIVATING'
            },
            {
                id: 'crop-rec-102',
                parcel_id: 'parcel-102',
                farmer_id: 'default-farmer',
                farmer_name: 'Surya.V.M',
                farmer_phone: '+91 98450 12345',
                survey_number: '89/1A',
                village: 'Maddur Village',
                district: 'Mandya',
                crop_name: 'Ragi',
                crop_variety: 'GPU-28 (High Yield)',
                sowing_date: '2026-06-01',
                cultivated_area_acres: 2.0,
                irrigation_type: 'BOREWELL',
                soil_type: 'Red Sandy Loam',
                cultivation_method: 'ORGANIC',
                expected_harvest_start: '2026-09-15',
                expected_harvest_end: '2026-09-30',
                estimated_yield_kg: 2600,
                prediction_confidence: 91,
                assigned_centre_id: 'centre-2',
                assigned_centre_name: 'Maddur Grain Storage & Procurement Centre',
                assigned_centre_distance_km: 4.2,
                status: 'CULTIVATING'
            }
        ];
        for (const c of defaultCrops) {
            await CropRecord.create(c);
        }

        console.log(`✅ System successfully reset to clean default state.`);
        return { success: true, message: 'All bookings cleared and system reset to clean default state.' };
    } catch (err) {
        console.error('Error resetting database to clean state:', err);
        return { success: false, error: err.message };
    }
};

// RESET A SINGLE CENTRE'S OPERATIONAL DATA ONLY (Requirement 19 & 20)
// Preserves permanent farmer accounts, land parcels, and crop records!
export const resetCentreOperationalData = async(centreId = 'centre-1') => {
    try {
        console.log(`🧹 Resetting operational queue and temporary load for Centre: ${centreId}...`);

        // 1. Clear appointments and procurement activity for this specific centre
        await Appointment.deleteMany({ centre_id: centreId });
        await Procurement.deleteMany({ centre_id: centreId });

        // 2. Reset centre operational metrics (booked capacity, queue count, today procured)
        await Centre.updateOne({ id: centreId }, {
            $set: {
                booked_capacity_kg: 0,
                queue_count: 0,
                today_procured_kg: 0,
                status: 'OPEN'
            }
        });

        // 3. Reset slot positions for this centre back to AVAILABLE
        const slots = await Slot.find({ centre_id: centreId }).lean();
        const slotIds = slots.map(s => s.id);
        if (slotIds.length > 0) {
            await SlotPosition.updateMany({ slot_id: { $in: slotIds } }, {
                $set: {
                    status: 'AVAILABLE',
                    appointment_id: null,
                    booked_by: null,
                    booked_at: null
                }
            });
            await Slot.updateMany({ centre_id: centreId }, {
                $set: {
                    current_bookings: 0,
                    is_available: true
                }
            });
        }

        console.log(`✅ Centre ${centreId} operational data reset successfully. Permanent land/crop records preserved.`);
        return {
            success: true,
            message: `Centre ${centreId} queue and temporary load reset. Permanent farmer/land/crop records preserved.`,
            centre_id: centreId
        };
    } catch (err) {
        console.error(`Error resetting centre ${centreId}:`, err);
        return { success: false, error: err.message };
    }
};