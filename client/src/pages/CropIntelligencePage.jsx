import React, { useState, useEffect } from 'react';
import { fetchDistrictForecast, applyCapacityRecommendations, fetchIncomingCultivationsForCentre, fetchCentres } from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  AreaChart, Area, Legend, Cell 
} from 'recharts';
import { 
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2, ShieldCheck, 
  Building2, Users, Calendar, ArrowUpRight, Zap, RefreshCw, Sprout, MapPin, Check
} from 'lucide-react';

export default function CropIntelligencePage() {
  const [district, setDistrict] = useState('Mandya');
  const [forecast, setForecast] = useState(null);
  const [centres, setCentres] = useState([]);
  const [selectedCentreFilter, setSelectedCentreFilter] = useState('all');
  const [incomingCultivations, setIncomingCultivations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingRec, setApplyingRec] = useState(false);
  const [recApplied, setRecApplied] = useState(false);

  useEffect(() => {
    loadForecastData();
    loadMasterCentres();
  }, [district]);

  useEffect(() => {
    loadIncomingCultivations();
  }, [selectedCentreFilter]);

  const loadForecastData = async () => {
    setLoading(true);
    try {
      const res = await fetchDistrictForecast(district);
      if (res.success) {
        setForecast(res);
      }
    } catch (err) {
      console.error('Error fetching district forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMasterCentres = async () => {
    try {
      const res = await fetchCentres();
      if (res.success) {
        setCentres(res.centres);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadIncomingCultivations = async () => {
    try {
      const res = await fetchIncomingCultivationsForCentre(selectedCentreFilter);
      if (res.success) {
        setIncomingCultivations(res.cultivations || []);
      }
    } catch (err) {
      console.error('Error loading incoming cultivations:', err);
    }
  };

  const handleApplyRecommendations = async (centreId) => {
    setApplyingRec(true);
    try {
      const res = await applyCapacityRecommendations({
        centre_id: centreId || 'centre-1',
        extra_counters: 2,
        slot_expansion_percent: '+25%'
      });
      if (res.success) {
        setRecApplied(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApplyingRec(false);
    }
  };

  if (loading || !forecast) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1rem', textAlign: 'center' }}>
        <RefreshCw size={32} className="spin" color="#16a34a" style={{ marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.2rem', color: '#0f172a' }}>Loading AI Regional Procurement Forecast...</h3>
      </div>
    );
  }

  const CROP_COLORS = ['#16a34a', '#d97706', '#2563eb', '#dc2626', '#9333ea'];

  return (
    <div style={{ maxWidth: '1350px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      
      {/* Top Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              <Sparkles size={14} color="#f59e0b" /> GOVERNMENT & AUTHORITY PLANNING DASHBOARD
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 0.4rem 0', fontFamily: 'Outfit, sans-serif' }}>
              CROP FORECAST & AI PROCUREMENT INTELLIGENCE
            </h1>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>
              Predict upcoming crop supply before harvest reaches procurement yards to allocate staff, weighing capacity, and slots in advance.
            </p>
          </div>

          {/* Region Selector */}
          <div style={{ background: '#334155', padding: '0.5rem 1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>District / Region:</span>
            <select 
              value={district} 
              onChange={(e) => setDistrict(e.target.value)}
              style={{ background: '#0f172a', color: 'white', border: '1px solid #475569', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700 }}
            >
              <option value="Mandya">Mandya District (Karnataka)</option>
              <option value="Erode">Erode Region (Tamil Nadu)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.1rem', borderRadius: '12px', background: 'white', borderLeft: '4px solid #16a34a', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Cultivated Area</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {forecast.total_registered_acres.toLocaleString()} Acres
          </div>
          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>Verified Govt Records</span>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderRadius: '12px', background: 'white', borderLeft: '4px solid #2563eb', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Predicted Harvest Tonnage</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>
            {forecast.total_expected_tonnes.toLocaleString()} Tonnes
          </div>
          <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>AI Predicted Crop Supply</span>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderRadius: '12px', background: 'white', borderLeft: '4px solid #f59e0b', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Predicted Peak Harvest</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706', margin: '0.3rem 0' }}>
            {forecast.peak_harvest_period}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 700 }}>Peak Congestion Expected</span>
        </div>

        <div className="card" style={{ padding: '1.1rem', borderRadius: '12px', background: 'white', borderLeft: '4px solid #9333ea', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Recommended Capacity</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7e22ce', margin: '0.2rem 0' }}>
            {forecast.recommended_procurement_capacity_tonnes.toLocaleString()} Tonnes
          </div>
          <span style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: 700 }}>+25% Extra Slots Required</span>
        </div>
      </div>

      {/* INCOMING FARMER CULTIVATIONS & NEARBY CENTRE FEED */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sprout size={22} color="#16a34a" /> Incoming Farmer Cultivations & AI Slot Predictions
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              Real-time feed of farmer cultivations dispatched to nearby procurement centres with predicted harvest dates and pre-allocated slot windows.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Filter by Centre:</span>
            <select
              value={selectedCentreFilter}
              onChange={(e) => setSelectedCentreFilter(e.target.value)}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              <option value="all">🏢 All Regional Procurement Centres ({centres.length})</option>
              {centres.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {incomingCultivations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {incomingCultivations.map(c => (
              <div 
                key={c.id} 
                style={{ 
                  background: '#f8fafc', 
                  border: '1px solid #cbd5e1', 
                  borderRadius: '12px', 
                  padding: '1rem 1.25rem',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr',
                  gap: '1rem',
                  alignItems: 'center'
                }}
              >
                {/* Col 1: Farmer & Land Info */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Farmer & Land Parcel
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                    {c.farmer_name || 'Surya.V.M'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Survey No: <strong>{c.survey_number || 'FIELD-142/2B'}</strong><br />
                    Village: {c.village || 'Mandya Rural'}, {c.district || 'Mandya'}
                  </div>
                </div>

                {/* Col 2: Cultivation & Crop */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    Cultivated Crop
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e3a8a' }}>
                    {c.crop_name} ({c.cultivated_area_acres} Acres)
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Variety: {c.crop_variety || 'Standard Fine'}<br />
                    Irrigation: {c.irrigation_type || 'CANAL'}
                  </div>
                </div>

                {/* Col 3: AI Predicted Harvest Window */}
                <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 800, textTransform: 'uppercase' }}>
                    AI Predicted Harvest
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', margin: '0.15rem 0' }}>
                    📅 {c.expected_harvest_start || '18 Nov 2026'} – {c.expected_harvest_end || '24 Nov 2026'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
                    Est. Yield: <strong>{((c.estimated_yield_kg || 4350) / 1000).toFixed(2)} Tonnes</strong> ({c.prediction_confidence || 87}% confidence)
                  </div>
                </div>

                {/* Col 4: Assigned Centre & Slot Window */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '9999px', fontWeight: 800, display: 'inline-block', marginBottom: '0.3rem' }}>
                    🏢 {c.assigned_centre_name ? c.assigned_centre_name.split(' ')[0] : 'Nearby'} Centre Notified
                  </span>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                    Slot Opens: {c.eligible_slot_start_date || c.expected_harvest_start || '18 Nov 2026'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {c.assigned_centre_distance_km || 3.2} km distance
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#fafafa', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
            <Sprout size={36} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
            <h4 style={{ fontSize: '0.95rem', color: '#475569', margin: '0 0 0.25rem 0' }}>No Cultivations Registered Yet for Selected Centre</h4>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
              When farmers register crops in "My Farm", their predicted harvest dates and slot booking details will automatically appear here!
            </p>
          </div>
        )}
      </div>

      {/* CHARTS GRID SECTION 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        
        {/* Chart 1: Crop-wise Tonnage Forecast */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="#16a34a" /> Crop-wise Harvest Tonnage Forecast
            </h3>
          </div>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecast.crop_wise_forecast}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="crop_name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Tonnes', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(val) => [`${val} Tonnes`, 'Expected Tonnage']} />
                <Bar dataKey="tonnage" radius={[6, 6, 0, 0]}>
                  {forecast.crop_wise_forecast.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CROP_COLORS[index % CROP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Weekly Harvest Arrival Timeline */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="#2563eb" /> Weekly Harvest Arrival Timeline (Next 4 Weeks)
            </h3>
          </div>
          <div style={{ width: '100%', height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.weekly_forecast}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => [`${val} Tonnes`, 'Harvest Volume']} />
                <Area type="monotone" dataKey="expected_tonnage" stroke="#2563eb" fill="#bfdbfe" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* INTELLIGENT PROCUREMENT CAPACITY PLANNING PANEL */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '16px', background: 'white', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={22} color="#16a34a" /> Centre Capacity Planning & Congestion Recommendations
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
              AI automated capacity recommendations to prevent yard congestion during peak harvest dates.
            </p>
          </div>

          <button 
            onClick={() => handleApplyRecommendations('all')}
            disabled={applyingRec || recApplied}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Zap size={16} /> {recApplied ? 'AI Recommendations Applied ✅' : (applyingRec ? 'Applying...' : 'Apply AI Recommendations & Allocate Slots')}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {forecast.centre_demands?.map(c => (
            <div 
              key={c.centre_id}
              style={{ 
                padding: '1rem', 
                borderRadius: '12px', 
                border: c.congestion_risk === 'HIGH' ? '2px solid #fca5a5' : '1px solid #e2e8f0', 
                background: c.congestion_risk === 'HIGH' ? '#fff5f5' : '#fafafa' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{c.name}</strong>
                <span style={{ 
                  fontSize: '0.7rem', 
                  background: c.congestion_risk === 'HIGH' ? '#fee2e2' : '#fef3c7', 
                  color: c.congestion_risk === 'HIGH' ? '#991b1b' : '#92400e', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '4px', 
                  fontWeight: 800 
                }}>
                  {c.congestion_risk === 'HIGH' ? '⚠️ HIGH CONGESTION RISK' : 'MODERATE'}
                </span>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#475569', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.75rem' }}>
                <div>Current Cap: <strong>{c.current_daily_capacity_tonnes} T/day</strong></div>
                <div>Predicted Demand: <strong>{c.predicted_peak_demand_tonnes} T/day</strong></div>
              </div>

              <div style={{ background: 'white', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700, color: '#15803d', marginBottom: '0.2rem' }}>💡 System Recommendation:</div>
                <div style={{ color: '#334155' }}>
                  • Add <strong>+{c.recommended_extra_counters} Extra Counter(s)</strong> & Weighing Machines<br />
                  • Expand appointment slots by <strong>{c.recommended_slot_expansion}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

