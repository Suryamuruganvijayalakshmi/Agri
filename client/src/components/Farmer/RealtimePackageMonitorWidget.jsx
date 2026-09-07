import React, { useState, useEffect } from 'react';
import { Package, Truck, Scale, Warehouse, Activity, Sparkles, RefreshCw } from 'lucide-react';
import { fetchLoadPackageMetrics } from '../../services/api';
import { socket } from '../../services/socket';

export default function RealtimePackageMonitorWidget() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetchLoadPackageMetrics();
      if (res.success && res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch package load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();

    // Socket.io Realtime updates listener
    const handleRealtimeMetrics = () => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1200);
      loadMetrics();
    };

    socket.on('centres_updated', handleRealtimeMetrics);
    socket.on('slot_position_updated', handleRealtimeMetrics);
    socket.on('procurement_stage_updated', handleRealtimeMetrics);

    return () => {
      socket.off('centres_updated', handleRealtimeMetrics);
      socket.off('slot_position_updated', handleRealtimeMetrics);
      socket.off('procurement_stage_updated', handleRealtimeMetrics);
    };
  }, []);

  if (loading && !metrics) {
    return (
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.5rem', textAlign: 'center', color: '#64748b' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
        Loading Real-time Load Package Monitor...
      </div>
    );
  }

  const m = metrics || {
    totalPackagesCapacity: 1000,
    totalPackagesBooked: 620,
    totalPackagesWeighed: 450,
    totalPackagesInTransit: 170,
    warehouseUtilizationPercent: 62,
    facilityLoadList: []
  };

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={22} color="#16a34a" /> REALTIME MONITOR OF LOAD PACKAGES
            </h3>
            {pulse && (
              <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.5rem', borderRadius: '9999px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <Sparkles size={12} className="animate-spin" /> Live Sync
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
            Live package tracking across cold storages & procurement yards (1 Package = 50kg Unit Load).
          </p>
        </div>

        <button onClick={loadMetrics} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            <Package size={16} /> TOTAL BOOKED
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1d4ed8' }}>
            {m.totalPackagesBooked.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>Pkgs</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#60a5fa' }}>Theatre Seats Reserved</div>
        </div>

        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            <Scale size={16} /> WEIGHED & STORED
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>
            {m.totalPackagesWeighed.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>Pkgs</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#4ade80' }}>Verified at Weighbridge</div>
        </div>

        <div style={{ background: '#fef9c3', border: '1px solid #fef08a', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#854d0e', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            <Truck size={16} /> IN TRANSIT / QUEUE
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a16207' }}>
            {m.totalPackagesInTransit.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#eab308', fontWeight: 600 }}>Pkgs</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: '#ca8a04' }}>En Route to Gate</div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#334155', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
            <Warehouse size={16} /> STORAGE CAPACITY
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
            {m.warehouseUtilizationPercent}%
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Warehouse Space Used</div>
        </div>
      </div>

      {/* Facility Load List */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', marginBottom: '0.5rem' }}>
          FACILITY PACKAGE LOAD BREAKDOWN
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
          {m.facilityLoadList && m.facilityLoadList.map((fac) => (
            <div key={fac.id} style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>{fac.name}</strong>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.5rem' }}>({fac.district})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: '#334155' }}>
                  {fac.booked_packages} / {fac.max_packages} Pkgs
                </span>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '4px', background: fac.color_status === 'GREEN' ? '#dcfce7' : fac.color_status === 'YELLOW' ? '#fef9c3' : '#fee2e2', color: fac.color_status === 'GREEN' ? '#15803d' : fac.color_status === 'YELLOW' ? '#854d0e' : '#991b1b' }}>
                  {fac.utilization_percent}% Used
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
