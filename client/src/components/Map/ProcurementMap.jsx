import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Clock, Users, Weight, MapPin, ChevronRight } from 'lucide-react';

// Custom SVG Icon Generator based on Centre Color Status
const createCustomIcon = (colorStatus, percent, name) => {
  let bgColor = '#16a34a'; // Green
  let border = '#14532d';
  let label = `${percent}%`;

  if (colorStatus === 'YELLOW') {
    bgColor = '#d97706';
    border = '#78350f';
  } else if (colorStatus === 'RED') {
    bgColor = '#dc2626';
    border = '#7f1d1d';
  } else if (colorStatus === 'GREY') {
    bgColor = '#475569';
    border = '#1e293b';
    label = 'OFF';
  }

  const svgHtml = `
    <div style="
      background-color: ${bgColor};
      border: 3px solid white;
      outline: 2px solid ${border};
      border-radius: 50%;
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 11px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      font-family: Outfit, sans-serif;
      transition: transform 0.2s ease;
    ">
      ${label}
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-leaflet-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22]
  });
};

function ChangeView({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [bounds, map]);
  return null;
}

export default function ProcurementMap({ centres, onSelectCentre, onBookCentre, selectedCentreId }) {
  const defaultCenter = [12.5224, 76.8974]; // Mandya Central

  const bounds = centres.map(c => [c.latitude, c.longitude]);

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', height: '520px', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={10}
        style={{ height: '100%', width: '100%', borderRadius: '16px' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {centres.length > 0 && <ChangeView bounds={bounds} />}

        {centres.map((centre) => {
          const icon = createCustomIcon(centre.color_status, centre.utilization_percent, centre.name);

          return (
            <Marker
              key={centre.id}
              position={[centre.latitude, centre.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectCentre(centre)
              }}
            >
              <Popup width={300}>
                <div style={{ padding: '0.2rem', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${centre.color_status.toLowerCase()}`}>
                      {centre.color_status === 'GREEN' && '🟢 Good Availability'}
                      {centre.color_status === 'YELLOW' && '🟡 Limited / Getting Busy'}
                      {centre.color_status === 'RED' && '🔴 High Load / Full'}
                      {centre.color_status === 'GREY' && '⚫ Centre Closed'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                      {centre.code}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.3rem 0', color: '#0f172a' }}>
                    {centre.name}
                  </h3>

                  <p style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}>
                    <MapPin size={12} /> {centre.address}
                  </p>

                  <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', marginBottom: '0.75rem', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Capacity:</span>
                      <strong style={{ color: '#0f172a' }}>{centre.daily_capacity_kg.toLocaleString()} kg</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Remaining:</span>
                      <strong style={{ color: centre.remaining_capacity_kg > 5000 ? '#16a34a' : '#dc2626' }}>
                        {centre.remaining_capacity_kg.toLocaleString()} kg
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Package Seats:</span>
                      <strong style={{ color: '#2563eb' }}>{Math.round(centre.remaining_capacity_kg / 50)} Available Seats</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block' }}>Est. Wait:</span>
                      <strong style={{ color: '#0f172a' }}>{centre.est_wait_minutes} minutes</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => onBookCentre(centre)}
                    disabled={centre.status === 'CLOSED' || centre.remaining_capacity_kg <= 0}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    {centre.status === 'CLOSED' ? 'Centre Closed' : centre.remaining_capacity_kg <= 0 ? 'No Slots Available' : 'Book Appointment'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
