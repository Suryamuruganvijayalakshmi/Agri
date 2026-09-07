import React, { useState, useMemo } from 'react';
import ProcurementMap from '../components/Map/ProcurementMap';
import BookingModal from '../components/Farmer/BookingModal';
import GoIntelligenceWidget from '../components/Farmer/GoIntelligenceWidget';
import { MapPin, Search, Filter, Warehouse, Layers } from 'lucide-react';

export default function FarmerMapPage({ centres = [], onRefreshData }) {
  const [selectedCentre, setSelectedCentre] = useState(null);
  const [bookingCentre, setBookingCentre] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedItemType, setSelectedItemType] = useState('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');

  // Extract unique districts
  const districts = useMemo(() => {
    const list = Array.from(new Set(centres.map(c => c.district).filter(Boolean))).sort();
    return ['ALL', ...list];
  }, [centres]);

  // Extract unique item types
  const itemTypes = useMemo(() => {
    const list = Array.from(new Set(centres.map(c => c.item_type).filter(Boolean))).sort();
    return ['ALL', ...list];
  }, [centres]);

  // Filtered centres list
  const filteredCentres = useMemo(() => {
    return centres.filter(c => {
      const matchSearch = !searchTerm || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDistrict = selectedDistrict === 'ALL' || c.district === selectedDistrict;
      const matchItem = selectedItemType === 'ALL' || c.item_type === selectedItemType;
      const matchSector = selectedSector === 'ALL' || c.sector === selectedSector;

      return matchSearch && matchDistrict && matchItem && matchSector;
    });
  }, [centres, searchTerm, selectedDistrict, selectedItemType, selectedSector]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Banner */}
      <div className="card-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
            <MapPin size={24} color="#16a34a" /> Real Cold Storage & Procurement Map ({filteredCentres.length} Facilities)
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Live interactive mapping of real Cold Storage units & APMC Procurement Depots across Tamil Nadu & Mandya.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', flexWrap: 'wrap' }}>
          <span className="badge badge-green">🟢 Available</span>
          <span className="badge badge-yellow">🟡 Limited</span>
          <span className="badge badge-red">🔴 Full / High Load</span>
          <span className="badge badge-grey">⚫ Closed</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              placeholder="Search facility name / address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          {/* District Filter */}
          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="ALL">📍 All Districts ({districts.length - 1} Districts)</option>
              {districts.filter(d => d !== 'ALL').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Item Type Filter */}
          <div>
            <select
              value={selectedItemType}
              onChange={(e) => setSelectedItemType(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="ALL">📦 All Item Types</option>
              {itemTypes.filter(i => i !== 'ALL').map(i => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Sector Filter */}
          <div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <option value="ALL">🏛️ All Sectors (Private / Public / Coop)</option>
              <option value="Pvt">Private (Pvt)</option>
              <option value="Pub">Public (Pub)</option>
              <option value="Coop">Cooperative (Coop)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map & Detail Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <ProcurementMap
            centres={filteredCentres}
            selectedCentreId={selectedCentre?.id}
            onSelectCentre={(c) => setSelectedCentre(c)}
            onBookCentre={(c) => setBookingCentre(c)}
          />

          <GoIntelligenceWidget
            centreId={selectedCentre?.id || 'centre-1'}
            onSelectAlternative={() => {
              const alt = centres.find(c => c.id === 'centre-4');
              if (alt) setSelectedCentre(alt);
            }}
          />
        </div>

        {/* Selected Centre Details Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {selectedCentre ? (
            <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={`badge badge-${selectedCentre.color_status ? selectedCentre.color_status.toLowerCase() : 'green'}`}>
                  {selectedCentre.color_status || 'OPEN'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{selectedCentre.code}</span>
              </div>

              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
                {selectedCentre.name}
              </h2>

              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.85rem' }}>
                📍 {selectedCentre.address}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '10px', fontSize: '0.8rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                <div>District: <strong>{selectedCentre.district}</strong></div>
                <div>Sector: <strong>{selectedCentre.sector || 'Pvt'}</strong></div>
                <div>Storage Item: <strong style={{ color: '#2563eb' }}>{selectedCentre.item_type || 'Multipurpose'}</strong></div>
                <div>Capacity: <strong>{(selectedCentre.capacity_mt || Math.round(selectedCentre.daily_capacity_kg / 1000)).toLocaleString()} MT</strong></div>
                <div>Remaining: <strong style={{ color: '#16a34a' }}>{selectedCentre.remaining_capacity_kg.toLocaleString()} kg</strong></div>
                <div>Est Wait: <strong>{selectedCentre.est_wait_minutes} mins</strong></div>
              </div>

              <button
                onClick={() => setBookingCentre(selectedCentre)}
                disabled={selectedCentre.status === 'CLOSED' || selectedCentre.remaining_capacity_kg <= 0}
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
              >
                {selectedCentre.status === 'CLOSED' ? 'Facility Closed' : 'Book Position Here'}
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              <Warehouse size={32} color="#94a3b8" style={{ margin: '0 auto 0.5rem auto' }} />
              <div>Select any of the <strong>{filteredCentres.length}</strong> cold storage markers on the map to inspect capacity, item stored, and queue metrics.</div>
            </div>
          )}
        </div>
      </div>

      {bookingCentre && (
        <BookingModal
          centre={bookingCentre}
          farmerId="F-1042"
          onClose={() => setBookingCentre(null)}
          onBookingSuccess={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
}
