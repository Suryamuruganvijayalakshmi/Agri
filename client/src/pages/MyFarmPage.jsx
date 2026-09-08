import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  fetchLandParcels, 
  verifyGovtLandRecord, 
  registerLandParcel,
  deleteLandParcelAPI,
  registerCrop, 
  fetchFarmerCrops 
} from '../services/api';
import LandPolygonMap from '../components/Map/LandPolygonMap';
import { 
  Sprout, MapPin, Search, ShieldCheck, Sparkles, Calendar, 
  TrendingUp, Layers, CheckCircle2, ArrowRight, Droplets, Sun, Info, PlusCircle, RefreshCw, PenTool, Trash2
} from 'lucide-react';

export default function MyFarmPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOfficerOrAdmin = user?.role === 'CENTRE_OPERATOR' || user?.role === 'QUALITY_INSPECTOR' || user?.role === 'ADMIN';
  const farmerId = (user && user.role === 'FARMER' && user.id) ? user.id : null;

  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  // Land Verification Search State
  const [searchSurvey, setSearchSurvey] = useState('');
  const [searching, setSearching] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  // Crop Registration Form State
  const [cropCategory, setCropCategory] = useState('Paddy (Sona Masoori)');
  const [customCropName, setCustomCropName] = useState('');
  const [cropVariety, setCropVariety] = useState('Standard Fine Grade');
  const [sowingDate, setSowingDate] = useState('2026-07-15');
  const [cultivatedAcres, setCultivatedAcres] = useState(2.5);
  const [irrigationType, setIrrigationType] = useState('CANAL');
  const [soilType, setSoilType] = useState('Clay Loam');
  const [cultivationMethod, setCultivationMethod] = useState('CONVENTIONAL');
  
  const [submittingCrop, setSubmittingCrop] = useState(false);
  const [aiPredictionResult, setAiPredictionResult] = useState(null);

  useEffect(() => {
    loadFarmData();
  }, [farmerId]);

  const loadFarmData = async () => {
    setLoading(true);
    try {
      const [landRes, cropRes] = await Promise.all([
        fetchLandParcels(farmerId),
        fetchFarmerCrops(farmerId)
      ]);

      if (landRes.success && landRes.parcels && landRes.parcels.length > 0) {
        setParcels(landRes.parcels);
        setSelectedParcel(landRes.parcels[0]);
        setCultivatedAcres(landRes.parcels[0].cultivable_area_acres || 2.5);
      }
      // No fallback to 'default-farmer' — new accounts start with a clean empty farm

      if (cropRes.success && cropRes.crops && cropRes.crops.length > 0) {
        setCrops(cropRes.crops);
      }
      // No fallback to 'default-farmer' crops either
    } catch (err) {
      console.error('Error loading farm data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLandSearch = async (e) => {
    e.preventDefault();
    if (!searchSurvey.trim()) return;
    setSearching(true);
    try {
      const res = await verifyGovtLandRecord({
        survey_number: searchSurvey,
        state: user?.state || 'Karnataka',
        district: user?.district || 'Mandya'
      });
      if (res.success && res.parcel) {
        setParcels(prev => {
          const exists = prev.find(p => p.id === res.parcel.id);
          return exists ? prev : [res.parcel, ...prev];
        });
        setSelectedParcel(res.parcel);
        setCultivatedAcres(res.parcel.cultivable_area_acres || 2.5);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSaveMarkedLand = async (drawnData) => {
    const newParcel = {
      id: `parcel-${Math.floor(1000 + Math.random() * 9000)}`,
      farmer_id: farmerId,
      survey_number: `FIELD-${Math.floor(100 + Math.random() * 900)}/A`,
      parcel_id: `PARCEL-MARK-${Math.floor(1000 + Math.random() * 9000)}`,
      owner_name: user?.full_name || 'Surya.V.M',
      state: drawnData.state || user?.state || 'Karnataka',
      district: drawnData.district || user?.district || 'Mandya',
      village: drawnData.village || 'Marked Farm Field',
      total_area_acres: drawnData.total_area_acres,
      cultivable_area_acres: drawnData.cultivable_area_acres,
      polygon_coordinates: drawnData.polygon_coordinates,
      verification_status: 'VERIFIED',
      govt_source: 'Farmer Marked Map Boundary'
    };

    try {
      await registerLandParcel(newParcel);
      setParcels(prev => [newParcel, ...prev]);
      setSelectedParcel(newParcel);
      setCultivatedAcres(drawnData.cultivable_area_acres);
      alert(`✅ Marked land boundary saved! Area: ${drawnData.total_area_acres} Acres in ${newParcel.village}, ${newParcel.district}.`);
    } catch (err) {
      console.error('Error saving marked land:', err);
    }
  };

  const handleDeleteParcel = async (parcelId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this marked land parcel?')) return;
    try {
      await deleteLandParcelAPI(parcelId);
      const updated = parcels.filter(p => p.id !== parcelId);
      setParcels(updated);
      if (selectedParcel?.id === parcelId) {
        const nextParcel = updated[0] || null;
        setSelectedParcel(nextParcel);
        setCultivatedAcres(nextParcel ? (nextParcel.cultivable_area_acres || 2.5) : 0);
      }
    } catch (err) {
      console.error('Error deleting parcel:', err);
    }
  };

  // Determine actual crop name (dropdown or custom)
  const actualCropName = cropCategory === 'CUSTOM_CROP'
    ? (customCropName.trim() || 'Custom Crop')
    : cropCategory;

  // Dynamic Live Yield Estimator Calculation
  const calculateLiveEstimate = () => {
    const acres = Number(cultivatedAcres) || 1;
    let maturityDays = 115;
    let baseYieldPerAcreKg = 1800;

    const lower = actualCropName.toLowerCase();
    if (lower.includes('paddy') || lower.includes('rice')) { maturityDays = 115; baseYieldPerAcreKg = 1800; }
    else if (lower.includes('groundnut') || lower.includes('peanut')) { maturityDays = 110; baseYieldPerAcreKg = 1000; }
    else if (lower.includes('maize') || lower.includes('corn')) { maturityDays = 100; baseYieldPerAcreKg = 2200; }
    else if (lower.includes('sugarcane')) { maturityDays = 300; baseYieldPerAcreKg = 35000; }
    else if (lower.includes('vegetables') || lower.includes('tomato')) { maturityDays = 65; baseYieldPerAcreKg = 1400; }
    else if (lower.includes('wheat')) { maturityDays = 120; baseYieldPerAcreKg = 1600; }
    else if (lower.includes('cotton')) { maturityDays = 160; baseYieldPerAcreKg = 900; }
    else if (lower.includes('ragi')) { maturityDays = 105; baseYieldPerAcreKg = 1100; }
    else if (lower.includes('pulses') || lower.includes('gram')) { maturityDays = 85; baseYieldPerAcreKg = 800; }
    else { maturityDays = 90; baseYieldPerAcreKg = 1200; }

    let irrMult = 1.0;
    if (irrigationType === 'CANAL') irrMult = 1.15;
    else if (irrigationType === 'DRIP') irrMult = 1.25;
    else if (irrigationType === 'BOREWELL') irrMult = 1.10;
    else if (irrigationType === 'RAINFED') irrMult = 0.85;

    const estimatedKg = Math.round(acres * baseYieldPerAcreKg * irrMult);
    const estimatedTonnes = (estimatedKg / 1000).toFixed(2);

    const sowingMs = new Date(sowingDate || new Date()).getTime();
    const harvestMs = sowingMs + (maturityDays * 24 * 60 * 60 * 1000);
    const harvestStartStr = new Date(harvestMs).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const harvestEndStr = new Date(harvestMs + (7 * 24 * 60 * 60 * 1000)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return {
      maturityDays,
      estimatedTonnes,
      estimatedKg,
      harvestStartStr,
      harvestEndStr
    };
  };

  const liveEstimate = calculateLiveEstimate();

  const handleRegisterCrop = async (e) => {
    e.preventDefault();
    if (!selectedParcel) {
      alert('Please select or mark a land parcel first.');
      return;
    }
    setSubmittingCrop(true);
    setAiPredictionResult(null);

    try {
      const payload = {
        farmer_id: farmerId,
        parcel_id: selectedParcel.id,
        crop_name: actualCropName,
        crop_variety: cropVariety,
        sowing_date: sowingDate,
        cultivated_area_acres: Number(cultivatedAcres),
        irrigation_type: irrigationType,
        soil_type: soilType,
        cultivation_method: cultivationMethod
      };

      const res = await registerCrop(payload);
      if (res.success) {
        setAiPredictionResult(res.prediction);
        setCrops(prev => [res.crop, ...prev]);
      }
    } catch (err) {
      console.error('Crop registration failed:', err);
    } finally {
      setSubmittingCrop(false);
    }
  };

  const totalRegisteredAcres = parcels.reduce((acc, p) => acc + (p.total_area_acres || 0), 0);

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Officer Preview Banner */}
      {isOfficerOrAdmin && (
        <div style={{
          background: 'rgba(2, 132, 199, 0.15)',
          border: '1.5px solid #0284c7',
          padding: '0.75rem 1.25rem',
          borderRadius: '12px',
          color: '#38bdf8',
          fontSize: '0.88rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.15)'
        }}>
          <ShieldCheck size={20} color="#38bdf8" style={{ flexShrink: 0 }} />
          <div>
            <strong>Officer Inspection Terminal:</strong> Reviewing regional farmer land boundaries, verified GIS satellite parcels, and AI crop harvest forecasts.
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #166534 50%, #15803d 100%)', color: 'white', padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              <Sparkles size={14} color="#fde047" /> AI LAND MARKING & HARVEST ESTIMATION ENGINE
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.4rem 0', fontFamily: 'Outfit, sans-serif' }}>
              MY FARM — Mark Land, Cultivate Crops & AI Predictions
            </h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#a7f3d0' }}>
              Interactively mark your farm area on the map, choose or enter any crop name, and get instant AI estimates for harvest dates and yield.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem 1.25rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#86efac', textTransform: 'uppercase', fontWeight: 700 }}>Total Farm Area</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalRegisteredAcres.toFixed(1)} Acres</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.75rem 1.25rem', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#86efac', textTransform: 'uppercase', fontWeight: 700 }}>Active Cultivations</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{crops.length} Crops</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* SECTION 1: Government Land Records & Parcel Selector */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={20} color="#16a34a" /> 1. Select or Add Land Parcels
            </h2>
            
            <button
              onClick={() => {
                setIsDrawingMode(true);
                setSelectedParcel(null);
                setCultivatedAcres(0);
              }}
              className="btn btn-secondary btn-sm"
              style={{ background: '#f59e0b', color: '#78350f', border: 'none', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
            >
              <PlusCircle size={14} /> + Add / Mark New Land
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleVerifyLandSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input 
              type="text"
              placeholder="Search Survey No. (e.g. 142/2B or 89/1A)"
              value={searchSurvey}
              onChange={(e) => setSearchSurvey(e.target.value)}
              style={{ flex: 1, padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <button 
              type="submit" 
              disabled={searching}
              className="btn btn-primary"
              style={{ padding: '0.6rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
            >
              <Search size={16} /> {searching ? 'Searching...' : 'Lookup Land'}
            </button>
          </form>

          {/* Parcel Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
            {parcels.map(p => {
              const isSelected = selectedParcel && selectedParcel.id === p.id;
              return (
                <div 
                  key={p.id}
                  onClick={() => {
                    setSelectedParcel(p);
                    setCultivatedAcres(p.cultivable_area_acres || 2.5);
                  }}
                  style={{ 
                    padding: '0.85rem 1rem', 
                    borderRadius: '10px', 
                    border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0', 
                    background: isSelected ? '#f0fdf4' : '#fafafa', 
                    cursor: 'pointer', 
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>
                      Survey No: {p.survey_number}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#16a34a', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                        <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '3px' }} /> {p.verification_status}
                      </span>
                      <button
                        onClick={(e) => handleDeleteParcel(p.id, e)}
                        title="Remove / Delete Parcel"
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.2rem 0.4rem', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <div><strong>Parcel ID:</strong> {p.parcel_id}</div>
                    <div><strong>Owner:</strong> {p.owner_name}</div>
                    <div><strong>Total Area:</strong> {p.total_area_acres} Acres</div>
                    <div><strong>Location:</strong> {p.village}, {p.district}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Interactive Polygon Drawing & Marking Map */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PenTool size={20} color="#2563eb" /> 2. Mark & Select Land Boundary on Map
            </h2>
            <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700 }}>
              {selectedParcel ? `${selectedParcel.total_area_acres} Acres Selected` : 'Click Map to Mark'}
            </span>
          </div>

          <LandPolygonMap 
            selectedParcel={selectedParcel} 
            parcels={parcels} 
            crops={crops}
            onSaveMarkedLand={handleSaveMarkedLand}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
          />
        </div>

      </div>

      {/* SECTION 3 & 4: Crop Cultivation Input & AI Estimation Engine */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Crop Selection & Registration Form */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sprout size={20} color="#16a34a" /> 3. Crop Cultivation Registration
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Choose a crop or type a custom crop name to calculate estimated harvest date & yield.
            </p>
          </div>

          <form onSubmit={handleRegisterCrop} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            
            {/* Crop Dropdown + Custom Crop Option */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                Select Crop or Enter Custom Crop Name
              </label>
              <select 
                value={cropCategory}
                onChange={(e) => setCropCategory(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: cropCategory === 'CUSTOM_CROP' ? '0.5rem' : '0' }}
              >
                <option value="Paddy (Sona Masoori)">🌾 Paddy (Sona Masoori Grain)</option>
                <option value="Groundnut (TMV 7)">🥜 Groundnut (Oilseed)</option>
                <option value="Maize (Yellow Corn)">🌽 Maize (Yellow Grain)</option>
                <option value="Organic Vegetables (Tomato & Beans)">🥬 Organic Vegetables (Tomato & Beans)</option>
                <option value="Sugarcane">🎋 Sugarcane (Commercial)</option>
                <option value="Wheat (Golden Grain)">🌾 Wheat (Golden Grain)</option>
                <option value="Cotton (Long Staple)">☁️ Cotton (Long Staple)</option>
                <option value="Ragi (Finger Millet)">🌾 Ragi (Finger Millet)</option>
                <option value="Pulses / Gram (Tur/Chana)">🫘 Pulses / Gram (Tur / Chana)</option>
                <option value="Mustard / Soyabean">🌻 Mustard / Soyabean</option>
                <option value="CUSTOM_CROP">✍️ Other / Enter Custom Crop Name...</option>
              </select>

              {/* Text Input if Custom Crop selected */}
              {cropCategory === 'CUSTOM_CROP' && (
                <input 
                  type="text"
                  placeholder="Type your crop name (e.g. Turmeric, Sunflower, Barley)"
                  value={customCropName}
                  onChange={(e) => setCustomCropName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '0.85rem', background: '#f0fdf4' }}
                  required
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  Crop Variety
                </label>
                <input 
                  type="text"
                  value={cropVariety}
                  onChange={(e) => setCropVariety(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  Sowing / Transplanting Date
                </label>
                <input 
                  type="date"
                  value={sowingDate}
                  onChange={(e) => setSowingDate(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  Cultivated Area (Acres)
                </label>
                <input 
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={cultivatedAcres}
                  onChange={(e) => setCultivatedAcres(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800 }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.2rem' }}>
                  Irrigation Source
                </label>
                <select 
                  value={irrigationType}
                  onChange={(e) => setIrrigationType(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="CANAL">Canal Irrigation (Reservoir)</option>
                  <option value="DRIP">Micro Drip System (+25% Yield)</option>
                  <option value="BOREWELL">Borewell Groundwater</option>
                  <option value="RAINFED">Rainfed Monsoon</option>
                </select>
              </div>
            </div>

            {/* LIVE ESTIMATION PREVIEW CARD */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.85rem 1rem', borderRadius: '10px', marginTop: '0.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
                ⚡ Real-Time Live Estimator Preview:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Expected Harvest:</span><br />
                  <strong style={{ color: '#0f172a' }}>{liveEstimate.harvestStartStr}</strong> ({liveEstimate.maturityDays} days)
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Estimated Yield:</span><br />
                  <strong style={{ color: '#15803d' }}>{liveEstimate.estimatedTonnes} Tonnes</strong> ({liveEstimate.estimatedKg.toLocaleString()} kg)
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submittingCrop}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Sparkles size={18} /> {submittingCrop ? 'Generating AI Predictions...' : `Register ${actualCropName} & Run AI Engine`}
            </button>
          </form>
        </div>

        {/* AI Harvest Prediction Results Card */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={20} color="#f59e0b" /> 4. AI Harvest Prediction Engine
            </h2>
            <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '9999px', fontWeight: 800 }}>
              AI MODEL v3.2 ACTIVE
            </span>
          </div>

          {aiPredictionResult ? (
            <div>
              {/* Main Prediction Banner */}
              <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', border: '1px solid #a7f3d0', padding: '1.25rem', borderRadius: '12px', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#065f46' }}>
                    {aiPredictionResult.crop_name} — {aiPredictionResult.cultivated_area_acres} Acres
                  </span>
                  <span style={{ background: '#10b981', color: 'white', fontSize: '0.8rem', padding: '0.25rem 0.65rem', borderRadius: '9999px', fontWeight: 800 }}>
                    🎯 {aiPredictionResult.confidence_percent}% Confidence
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.85rem' }}>
                  <div style={{ background: 'white', padding: '0.85rem', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Expected Harvest Window</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#047857', marginTop: '0.2rem' }}>
                      <Calendar size={16} style={{ display: 'inline', marginRight: '4px' }} />
                      {aiPredictionResult.expected_harvest_start} – {aiPredictionResult.expected_harvest_end}
                    </div>
                  </div>

                  <div style={{ background: 'white', padding: '0.85rem', borderRadius: '10px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Estimated Harvest Yield</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#047857', marginTop: '0.2rem' }}>
                      <TrendingUp size={16} style={{ display: 'inline', marginRight: '4px' }} />
                      {(aiPredictionResult.estimated_yield_min_kg / 1000).toFixed(2)} – {(aiPredictionResult.estimated_yield_max_kg / 1000).toFixed(2)} Tonnes
                    </div>
                  </div>
                </div>

                {/* Nearby Procurement Centre Details & Notification Status Banner */}
                <div style={{ background: '#ffffff', border: '1.5px solid #10b981', padding: '0.85rem 1rem', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#065f46', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      🏢 Assigned Nearby Procurement Centre:
                    </span>
                    <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 800 }}>
                      ⚡ Details Dispatched to Centre
                    </span>
                  </div>

                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {aiPredictionResult.assigned_centre_name || 'Mandya Central Procurement Yard'} ({aiPredictionResult.assigned_centre_distance_km || 3.2} km away)
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: '0.25rem' }}>
                    📅 <strong>Eligible Slot Booking Window:</strong> {aiPredictionResult.eligible_slot_start_date || aiPredictionResult.expected_harvest_start} to {aiPredictionResult.eligible_slot_end_date || aiPredictionResult.expected_harvest_end}
                  </div>
                </div>
              </div>

              {/* Drivers */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
                  📊 Key AI Prediction Driver Factors:
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {aiPredictionResult.influencing_factors?.map((factor, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                      <span><strong>{factor.factor_name}:</strong> {factor.description}</span>
                      <span style={{ fontWeight: 800, color: factor.impact.startsWith('+') ? '#16a34a' : '#2563eb' }}>
                        {factor.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Direct Slot Booking Link */}
              <button 
                onClick={() => navigate(`/farmer/appointments?centre_id=${aiPredictionResult.assigned_centre_id || 'centre-1'}&crop=${encodeURIComponent(aiPredictionResult.crop_name)}&date=${encodeURIComponent(aiPredictionResult.expected_harvest_start)}&quantity=${aiPredictionResult.estimated_yield_min_kg}`)}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 800 }}
              >
                📅 Pre-Book Procurement Slot at {aiPredictionResult.assigned_centre_name ? aiPredictionResult.assigned_centre_name.split(' ')[0] : 'Nearby'} Centre ({aiPredictionResult.expected_harvest_start}) <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#fafafa', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
              <Sparkles size={40} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1rem', color: '#475569', margin: '0 0 0.4rem 0' }}>Ready to Calculate AI Harvest Estimates</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: '360px', margin: '0 auto 1rem auto' }}>
                Fill out the Crop Registration form or type a custom crop name to calculate harvest time and yield according to your marked land area!
              </p>
            </div>
          )}

          {/* AI Disclaimer */}
          <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', fontSize: '0.75rem', color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Info size={16} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span>
              <strong>AI Model Disclaimer:</strong> Predictions are statistical estimates based on historical crop agronomy models, local weather patterns, and satellite NDVI indices. Estimates update dynamically as new satellite/weather data becomes available.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
