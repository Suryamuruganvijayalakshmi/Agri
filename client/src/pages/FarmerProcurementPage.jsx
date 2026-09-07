import React, { useState, useEffect } from 'react';
import ProcurementTimeline from '../components/Farmer/ProcurementTimeline';
import { fetchFarmerTimeline } from '../services/api';

export default function FarmerProcurementPage() {
  const [timeline, setTimeline] = useState(null);

  useEffect(() => {
    fetchFarmerTimeline('F-1042').then(res => {
      if (res.success) setTimeline(res.timeline);
    });
  }, []);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <ProcurementTimeline timeline={timeline} />
    </div>
  );
}
