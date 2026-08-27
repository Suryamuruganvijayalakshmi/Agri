import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { socket } from '../services/socket';
import { Users, Clock, ShieldCheck, RefreshCw, Bell, AlertCircle, ArrowRight } from 'lucide-react';

export default function FarmerQueuePage() {
  const [nowServing, setNowServing] = useState(null);
  const [yourToken, setYourToken] = useState(null);
  const [peopleAhead, setPeopleAhead] = useState(0);
  const [estWaitMinutes, setEstWaitMinutes] = useState(0);
  const [activeCounter, setActiveCounter] = useState(1);
  const [queueStatus, setQueueStatus] = useState('IDLE');
  const [realtimePulse, setRealtimePulse] = useState(false);

  const fetchQueueState = async () => {
    try {
      const { data, error } = await supabase
        .from('queue_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data && data.length > 0) {
        const serving = data.find(q => q.status === 'CALLED' || q.status === 'PROCESSING') || data[0];
        setNowServing(serving.token_number || null);
        if (serving.counter_number) setActiveCounter(serving.counter_number);
      }
    } catch (e) {
      console.warn('Supabase queue fetch error:', e);
    }
  };

  useEffect(() => {
    fetchQueueState();

    // Supabase Realtime subscription on queue_entries
    const channel = supabase
      .channel('realtime_queue_entries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries' },
        (payload) => {
          console.log('⚡ Realtime queue update:', payload);
          setRealtimePulse(true);
          setTimeout(() => setRealtimePulse(false), 1200);
          fetchQueueState();
        }
      )
      .subscribe();

    // Socket.io WebSocket fallback
    const handleSocketQueue = (data) => {
      setRealtimePulse(true);
      setTimeout(() => setRealtimePulse(false), 1200);
      if (data.nowServing) setNowServing(data.nowServing);
      if (data.peopleAhead !== undefined) setPeopleAhead(data.peopleAhead);
      if (data.estWaitMinutes !== undefined) setEstWaitMinutes(data.estWaitMinutes);
    };
    socket.on('queue_updated', handleSocketQueue);

    return () => {
      supabase.removeChannel(channel);
      socket.off('queue_updated', handleSocketQueue);
    };
  }, []);

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', border: 'none', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📡 Live Yard Queue Monitoring
              </span>
              {realtimePulse && (
                <span style={{ background: '#22c55e', color: 'white', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 800 }}>
                  LIVE SYNC
                </span>
              )}
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0 0 0', fontFamily: 'Outfit, sans-serif' }}>
              Mandya Central Procurement Yard Queue
            </h1>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '0.15rem 0 0 0' }}>
              Real-time gate token & weighbridge queue updates powered by Supabase Realtime WebSocket.
            </p>
          </div>
          <button onClick={fetchQueueState} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Refresh Queue
          </button>
        </div>
      </div>

      {/* Main 4 Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        
        {/* Card 1: Now Serving */}
        <div className="card" style={{ background: '#f0fdf4', border: '2px solid #22c55e', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>
            NOW SERVING
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#14532d', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {nowServing}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>
            Counter #{activeCounter} Open
          </div>
        </div>

        {/* Card 2: Your Token */}
        <div className="card" style={{ background: '#eff6ff', border: '2px solid #3b82f6', textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase' }}>
            YOUR TOKEN
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1d4ed8', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {yourToken}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>
            Mandya Gate Entry
          </div>
        </div>

        {/* Card 3: People Ahead */}
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            PEOPLE AHEAD
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {peopleAhead} Farmers
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Moving Smoothly
          </div>
        </div>

        {/* Card 4: Estimated Wait */}
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
            ESTIMATED WAIT
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#d97706', margin: '0.3rem 0', fontFamily: 'Outfit, sans-serif' }}>
            {estWaitMinutes} mins
          </div>
          <div style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
            Approx 2.5 mins / farmer
          </div>
        </div>

      </div>

      {/* Queue Status Detail Card */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.85rem' }}>
          📋 Live Yard Processing Pipeline
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { token: 'TK-MND-042', farmer: 'Siddappa Gowda', status: 'WEIGHING', counter: 'Counter #1', time: '10:28 AM' },
            { token: 'TK-MND-043', farmer: 'Kumar S.', status: 'QUALITY_TEST', counter: 'Lab #2', time: '10:30 AM' },
            { token: 'TK-MND-044', farmer: 'Basavaraj M.', status: 'CHECKED_IN', counter: 'Gate #1', time: '10:32 AM' },
            { token: 'TK-MND-045', farmer: 'Ninge Gowda', status: 'WAITING', counter: 'Queue Yard', time: 'Est 10:36 AM' },
            { token: 'TK-MND-048', farmer: 'Ramesh Gowda (YOU)', status: 'YOUR_TURN_SOON', counter: 'Queue Yard', time: 'Est 10:44 AM' }
          ].map((item, idx) => {
            const isYou = item.token === yourToken;
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: isYou ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isYou ? '#eff6ff' : '#ffffff'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 900, color: isYou ? '#1d4ed8' : '#0f172a', fontFamily: 'monospace' }}>
                    {item.token}
                  </span>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                      {item.farmer}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {item.counter} • {item.time}
                    </div>
                  </div>
                </div>

                <span className={`badge badge-${item.status === 'WEIGHING' || item.status === 'QUALITY_TEST' ? 'yellow' : isYou ? 'green' : 'grey'}`}>
                  {item.status.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
