import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch Supabase user profile from database
  const fetchUserProfile = async (authUser) => {
    if (!authUser) {
      setUser(null);
      setProfile(null);
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setUser(authUser);
      
      // Query profiles table in Supabase database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setRole(data.role || authUser.user_metadata?.role || 'FARMER');
      } else {
        // Fallback user metadata if profile row pending
        const metaRole = authUser.user_metadata?.role || 'FARMER';
        setProfile({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
          role: metaRole
        });
        setRole(metaRole);
      }
    } catch (err) {
      console.error('Error fetching Supabase profile:', err);
      setRole(authUser.user_metadata?.role || 'FARMER');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get initial Supabase auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserProfile(session?.user || null);
    });

    // 2. Listen for realtime Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchUserProfile(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase Password Authentication
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      await fetchUserProfile(data.user);
      const userRole = data.user?.user_metadata?.role || 'FARMER';
      return { success: true, user: data.user, role: userRole };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Sign in failed.' };
    }
  };

  // Supabase Farmer Registration
  const signUpFarmer = async (farmerData) => {
    setLoading(true);
    try {
      const { email, password, full_name, phone, state, district, village, aadhaar_number, bank_account, ifsc } = farmerData;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role: 'FARMER',
            phone,
            district
          }
        }
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Insert into Supabase profiles table
        await supabase.from('profiles').upsert([{
          id: data.user.id,
          full_name,
          email,
          phone,
          role: 'FARMER',
          state: state || 'Karnataka',
          district: district || 'Mandya'
        }]);

        // Insert into Supabase farmers table
        await supabase.from('farmers').upsert([{
          id: data.user.id,
          profile_id: data.user.id,
          farmer_code: `F-${Math.floor(100000 + Math.random() * 900000)}`,
          village: village || 'Central',
          aadhaar_number: aadhaar_number || 'XXXX-XXXX-4902',
          bank_account: bank_account || 'XXXX-XXXX-8821',
          ifsc: ifsc || 'SBIN0001234'
        }]);

        await fetchUserProfile(data.user);
      }

      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  // Supabase Officer Registration
  const signUpOfficer = async (officerData) => {
    setLoading(true);
    try {
      const { email, password, full_name, phone, role, assigned_centre_id, assigned_centre_name, district } = officerData;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name,
            role: role || 'CENTRE_OPERATOR',
            phone,
            assigned_centre_id: assigned_centre_id || 'centre-1',
            assigned_centre_name: assigned_centre_name || 'Mandya Central Procurement Yard',
            district: district || 'Mandya'
          }
        }
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Upsert into profiles table
        await supabase.from('profiles').upsert([{
          id: data.user.id,
          full_name,
          email,
          phone,
          role: role || 'CENTRE_OPERATOR',
          district: district || 'Mandya'
        }]);

        // Upsert into officer_profiles table
        try {
          await supabase.from('officer_profiles').upsert([{
            id: data.user.id,
            email,
            full_name,
            role: role || 'CENTRE_OPERATOR',
            assigned_centre_id: assigned_centre_id || 'centre-1',
            assigned_centre_name: assigned_centre_name || 'Mandya Central Procurement Yard',
            district: district || 'Mandya',
            phone
          }]);
        } catch (e) {
          console.warn('Officer profile upsert note:', e);
        }

        await fetchUserProfile(data.user);
      }

      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Officer registration failed.' };
    }
  };

  // Generic signUp alias
  const signUp = signUpOfficer;

  // Supabase Sign Out
  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setRole(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        signIn,
        signUp,
        signUpFarmer,
        signUpOfficer,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
