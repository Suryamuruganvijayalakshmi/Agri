import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, Marker, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Helper function to calculate polygon area in Acres
export function calculatePolygonAreaAcres(coords) {
  if (!coords || coords.length < 3) return 0;
  const R = 6378137; // Earth radius in meters
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % coords.length];
    const lat1 = (p1[0] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
    area += dLng * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2);
  const acres = area / 4046.86;
  return Math.round(acres * 100) / 100;
}

function MapClickHandler({ isDrawing, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (isDrawing) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    }
  });
  return null;
}

function FlyToLocation({ targetCenter }) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter && targetCenter.length === 2) {
      map.flyTo(targetCenter, 16, { duration: 1.5 });
    }
  }, [targetCenter, map]);
  return null;
}

export const POPULAR_AREAS = [
  { label: 'Mandya Central (Town)', village: 'Mandya Town', district: 'Mandya', state: 'Karnataka', coords: [12.5255, 76.8940] },
  { label: 'Maddur APMC & Canal Zone', village: 'Maddur APMC', district: 'Mandya', state: 'Karnataka', coords: [12.5870, 77.0420] },
  { label: 'Srirangapatna River Basin', village: 'Srirangapatna', district: 'Mandya', state: 'Karnataka', coords: [12.4215, 76.6932] },
  { label: 'Pandavapura Agri Belt', village: 'Pandavapura', district: 'Mandya', state: 'Karnataka', coords: [12.4930, 76.6710] },
  { label: 'Malavalli Farm Region', village: 'Malavalli', district: 'Mandya', state: 'Karnataka', coords: [12.3860, 77.0560] },
  { label: 'KR Pet Sugarcane Zone', village: 'KR Pet', district: 'Mandya', state: 'Karnataka', coords: [12.6640, 76.4850] },
  { label: 'Nagamangala Rural Hub', village: 'Nagamangala', district: 'Mandya', state: 'Karnataka', coords: [12.8190, 76.7560] },
  { label: 'Mysuru Rural & Chamundi', village: 'Mysuru Rural', district: 'Mysuru', state: 'Karnataka', coords: [12.2958, 76.6394] },
  { label: 'Ramanagara Sericulture Belt', village: 'Ramanagara', district: 'Ramanagara', state: 'Karnataka', coords: [12.7200, 77.2800] },
  { label: 'Channapatna Farm Hub', village: 'Channapatna', district: 'Ramanagara', state: 'Karnataka', coords: [12.6520, 77.2060] },
  { label: 'Hassan Paddy & Coffee Zone', village: 'Hassan Rural', district: 'Hassan', state: 'Karnataka', coords: [13.0070, 76.1030] },
  { label: 'Davanagere Cotton Region', village: 'Davanagere', district: 'Davanagere', state: 'Karnataka', coords: [14.4673, 75.9242] },
  { label: 'Erode Turmeric Region (TN)', village: 'Erode Central', district: 'Erode', state: 'Tamil Nadu', coords: [11.3430, 77.7180] },
  { label: 'Salem Tapioca Belt (TN)', village: 'Salem Zone', district: 'Salem', state: 'Tamil Nadu', coords: [11.6643, 78.1460] },
  { label: 'Coimbatore Agri Hub (TN)', village: 'Coimbatore Agri', district: 'Coimbatore', state: 'Tamil Nadu', coords: [11.0168, 76.9558] },
  { label: 'Thanjavur Delta Rice Bowl (TN)', village: 'Thanjavur Delta', district: 'Thanjavur', state: 'Tamil Nadu', coords: [10.7870, 79.1378] }
];

export default function LandPolygonMap({ 
  selectedParcel, 
  parcels = [], 
  crops = [],
  onSaveMarkedLand,
  isDrawingMode,
  setIsDrawingMode
}) {
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  const [activeArea, setActiveArea] = useState(POPULAR_AREAS[0]); // Default Mandya
  const [targetCenter, setTargetCenter] = useState(null);
  const [isSearchingArea, setIsSearchingArea] = useState(false);

  // Default center
  const defaultCenter = selectedParcel && selectedParcel.polygon_coordinates && selectedParcel.polygon_coordinates[0]
    ? selectedParcel.polygon_coordinates[0]
    : [12.5255, 76.8940];

  const greenOptions = { color: '#16a34a', fillColor: '#22c55e', fillOpacity: 0.35, weight: 3 };
  const activeOptions = { color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.5, weight: 4 };
  const drawOptions = { color: '#f59e0b', fillColor: '#fbbf24', fillOpacity: 0.6, weight: 4, dashArray: '6, 6' };

  const drawnAreaAcres = calculatePolygonAreaAcres(drawnPoints);

  const handleSelectArea = (areaObj) => {
    setActiveArea(areaObj);
    setTargetCenter(areaObj.coords);
    setIsDrawingMode(true);
    setDrawnPoints([]);
  };

  const handleAddPoint = (pt) => {
    setDrawnPoints(prev => [...prev, pt]);
  };

  const handleClearDrawing = () => {
    setDrawnPoints([]);
  };

  const handleFinishDrawing = () => {
    if (drawnPoints.length < 3) {
      alert('Please click at least 3 points on the map to define your land boundary.');
      return;
    }
    const finalAcres = drawnAreaAcres || 2.5;
    if (onSaveMarkedLand) {
      onSaveMarkedLand({
        polygon_coordinates: drawnPoints,
        total_area_acres: finalAcres,
        cultivable_area_acres: finalAcres,
        village: activeArea ? activeArea.village : 'Marked Farm Field',
        district: activeArea ? activeArea.district : 'Mandya',
        state: activeArea ? activeArea.state : 'Karnataka'
      });
    }
    setIsDrawingMode(false);
    setDrawnPoints([]);
  };

  // OpenStreetMap Nominatim Area Geocoding Search
  const handleAreaSearch = async (e) => {
    e.preventDefault();
    if (!areaSearchQuery.trim()) return;
    setIsSearchingArea(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(areaSearchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const searchAreaObj = {
          label: areaSearchQuery,
          village: areaSearchQuery,
          district: 'Searched Area',
          state: 'Karnataka',
          coords: [lat, lon]
        };
        setActiveArea(searchAreaObj);
        setTargetCenter([lat, lon]);
        setIsDrawingMode(true);
        setDrawnPoints([]);
      } else {
        alert('Area location not found. Try entering a nearby town or village name (e.g. Mandya, Maddur, Mysuru).');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsSearchingArea(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      
      {/* AREA SELECTION HEADER BAR */}
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.75rem 1rem', boxShadow: 'var(--shadow-sm)' }}>
        
        {/* Step 1 Label & Area Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              📍 Step 1: Choose Area Name:
            </span>

            <select
              value={activeArea ? JSON.stringify(activeArea.coords) : ''}
              onChange={(e) => {
                if (e.target.value) {
                  const coords = JSON.parse(e.target.value);
                  const matched = POPULAR_AREAS.find(a => JSON.stringify(a.coords) === e.target.value);
                  if (matched) {
                    handleSelectArea(matched);
                  }
                }
              }}
              style={{ 
                background: 'white', 
                border: '2px solid #2563eb', 
                color: '#1e3a8a',
                padding: '0.4rem 0.75rem', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                fontWeight: 800, 
                cursor: 'pointer',
                flex: 1,
                minWidth: '240px'
              }}
            >
              <option value="">-- Click to Select Area Name --</option>
              {POPULAR_AREAS.map((a, i) => (
                <option key={i} value={JSON.stringify(a.coords)}>
                  {a.label} ({a.district})
                </option>
              ))}
            </select>
          </div>

          {/* Location Search Box */}
          <form onSubmit={handleAreaSearch} style={{ display: 'flex', gap: '0.35rem', maxWidth: '320px', width: '100%' }}>
            <input 
              type="text"
              placeholder="Or type any Village / City name..."
              value={areaSearchQuery}
              onChange={(e) => setAreaSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
            />
            <button 
              type="submit"
              disabled={isSearchingArea}
              style={{ background: '#2563eb', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {isSearchingArea ? 'Searching...' : 'Show Area'}
            </button>
          </form>
        </div>

        {/* Step 2: Quick Area Selection Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>Quick Area Chips:</span>
          {POPULAR_AREAS.slice(0, 8).map((area, idx) => {
            const isSelected = activeArea && activeArea.label === area.label;
            return (
              <button
                key={idx}
                onClick={() => handleSelectArea(area)}
                style={{
                  background: isSelected ? '#2563eb' : '#white',
                  color: isSelected ? 'white' : '#1e293b',
                  border: isSelected ? '1px solid #1d4ed8' : '1px solid #cbd5e1',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                📍 {area.village}
              </button>
            );
          })}
        </div>

      </div>

      {/* MAP CONTAINER & CONTROLS */}
      <div style={{ position: 'relative', width: '100%', height: '430px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Map Top Overlay: Drawing Action & Active Area Status Banner */}
        <div style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 255, 255, 0.96)', backdropFilter: 'blur(8px)', padding: '0.65rem 1rem', borderRadius: '10px', border: '1px solid #cbd5e1', boxShadow: '0 4px 14px rgba(0,0,0,0.12)', flexWrap: 'wrap', gap: '0.5rem' }}>
          
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
              🎯 Selected Area: <strong>{activeArea ? activeArea.label : 'Mandya Region'}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isDrawingMode ? '#b45309' : '#1e293b', marginTop: '0.1rem' }}>
              {isDrawingMode ? (
                <span>🖊️ Click on map inside area to mark land boundary points ({drawnPoints.length} points | <strong>{drawnAreaAcres} Acres</strong>)</span>
              ) : (
                <span>Click "🖊️ Mark Land Boundary" button to begin marking your field</span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {!isDrawingMode ? (
              <button
                onClick={() => { setIsDrawingMode(true); setDrawnPoints([]); }}
                style={{ background: '#f59e0b', color: '#78350f', border: 'none', padding: '0.35rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
              >
                🖊️ Mark Land Boundary
              </button>
            ) : (
              <>
                <button
                  onClick={handleFinishDrawing}
                  disabled={drawnPoints.length < 3}
                  style={{ background: drawnPoints.length >= 3 ? '#16a34a' : '#94a3b8', color: 'white', border: 'none', padding: '0.35rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: drawnPoints.length >= 3 ? 'pointer' : 'not-allowed', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                  ✅ Save Marked Land ({drawnAreaAcres} Acres)
                </button>
                <button
                  onClick={handleClearDrawing}
                  style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Clear Points
                </button>
                <button
                  onClick={() => { setIsDrawingMode(false); setDrawnPoints([]); }}
                  style={{ background: '#fee2e2', color: '#991b1b', border: 'none', padding: '0.35rem 0.6rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>

        </div>

        <MapContainer
          center={defaultCenter}
          zoom={14}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%' }}
        >
          <FlyToLocation targetCenter={targetCenter} />
          <MapClickHandler isDrawing={isDrawingMode} onAddPoint={handleAddPoint} />
          
          {/* Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Visual Target Area Focus Ring/Marker */}
          {activeArea && activeArea.coords && (
            <React.Fragment>
              <Circle 
                center={activeArea.coords} 
                radius={450} 
                pathOptions={{ color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.12, dashArray: '6, 6', weight: 2 }} 
              />
              <Marker position={activeArea.coords}>
                <Popup>
                  <div style={{ padding: '0.2rem', textAlign: 'center' }}>
                    <span style={{ background: '#2563eb', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, display: 'inline-block', marginBottom: '0.3rem' }}>
                      📍 Focused Area: {activeArea.village || activeArea.label}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                      Click around this area on the map to mark your land boundary!
                    </span>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          )}

          {/* Render Saved Parcels */}
          {parcels.map((parcel) => {
            const isSelected = selectedParcel && selectedParcel.id === parcel.id;
            const coords = parcel.polygon_coordinates || [[12.5255, 76.8940], [12.5270, 76.8970], [12.5245, 76.8990], [12.5230, 76.8955]];
            const parcelCrops = crops.filter(c => c.parcel_id === parcel.id);

            return (
              <React.Fragment key={parcel.id}>
                <Polygon
                  positions={coords}
                  pathOptions={isSelected ? activeOptions : greenOptions}
                >
                  <Popup>
                    <div style={{ fontFamily: 'Inter, sans-serif', padding: '0.2rem' }}>
                      <div style={{ background: '#16a34a', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                        Govt Verified Land Parcel
                      </div>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                        Survey No: {parcel.survey_number}
                      </strong>
                      <div style={{ fontSize: '0.8rem', color: '#475569', margin: '0.25rem 0' }}>
                        <strong>Parcel ID:</strong> {parcel.parcel_id}<br />
                        <strong>Owner:</strong> {parcel.owner_name}<br />
                        <strong>Total Area:</strong> {parcel.total_area_acres} Acres ({parcel.cultivable_area_acres} Cultivable)<br />
                        <strong>Location:</strong> {parcel.village}, {parcel.district}
                      </div>

                      {parcelCrops.length > 0 && (
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d' }}>🌾 Active Cultivated Crops:</span>
                          <ul style={{ margin: '0.2rem 0 0 0', paddingLeft: '1.2rem', fontSize: '0.75rem', color: '#334155' }}>
                            {parcelCrops.map(c => (
                              <li key={c.id}>
                                <strong>{c.crop_name}</strong>: {c.cultivated_area_acres} Acres ({c.irrigation_type})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Polygon>

                <Marker position={coords[0]}>
                  <Popup>
                    <span style={{ fontWeight: 700 }}>Survey No: {parcel.survey_number}</span>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Render Live Drawing Polygon */}
          {drawnPoints.length > 0 && (
            <Polygon positions={drawnPoints} pathOptions={drawOptions}>
              <Popup>
                <span style={{ fontWeight: 700 }}>Marked Boundary: {drawnAreaAcres} Acres</span>
              </Popup>
            </Polygon>
          )}

          {/* Render Live Drawing Vertices Markers */}
          {drawnPoints.map((pt, idx) => (
            <Marker key={idx} position={pt}>
              <Popup>Boundary Point {idx + 1}</Popup>
            </Marker>
          ))}

        </MapContainer>

        {/* Map Legend Overlay */}
        <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(4px)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.75rem', zIndex: 1000, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#0f172a' }}>🗺️ Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#22c55e', border: '2px solid #16a34a', borderRadius: '2px' }}></span>
            <span>Verified Land Parcel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#3b82f6', border: '2px solid #2563eb', borderRadius: '2px' }}></span>
            <span>Active Selected Parcel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#fbbf24', border: '2px dashed #f59e0b', borderRadius: '2px' }}></span>
            <span>Drawing New Boundary</span>
          </div>
        </div>
      </div>

    </div>
  );
}

