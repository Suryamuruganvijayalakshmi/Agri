import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uqqjerxvcggwfatweyyk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_mwwIuhEFXxSaJcWSEEuI6Q_FSlYAqL9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper to compute utilization category according to AGRIFlow rules
export const getCentreStatusCategory = (centre) => {
  if (centre.status === 'CLOSED') return 'GREY';
  const bookedKg = centre.current_booked_kg || centre.booked_capacity_kg || 0;
  const dailyKg = centre.daily_capacity_kg || 1;
  const percent = Math.min(100, Math.round((bookedKg / dailyKg) * 100));
  if (percent > 85 || centre.status === 'FULL') return 'RED';
  if (percent > 60 || centre.status === 'HIGH_LOAD') return 'YELLOW';
  return 'GREEN';
};
