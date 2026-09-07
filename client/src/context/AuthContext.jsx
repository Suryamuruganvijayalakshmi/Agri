import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check persisted local auth state on mount
  useEffect(() => {
    const savedUserStr = localStorage.getItem('agriflow_user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setUser(savedUser);
        setProfile(savedUser);
        setRole(savedUser.role || 'FARMER');
        setLoading(false);
        return;
      } catch (e) {
        console.warn('Invalid saved session');
      }
    }

    // Fallback check for Supabase auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          role: session.user.user_metadata?.role || 'FARMER'
        };
        setUser(u);
        setProfile(u);
        setRole(u.role);
      }
      setLoading(false);
    });
  }, []);

  // MongoDB & Supabase Unified Sign In
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      // 1. Attempt Backend MongoDB Auth first
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const u = resData.user;
        setUser(u);
        setProfile(u);
        setRole(u.role || 'FARMER');
        localStorage.setItem('agriflow_token', resData.token);
        localStorage.setItem('agriflow_user', JSON.stringify(u));
        setLoading(false);
        return { success: true, user: u, role: u.role };
      }

      // 2. Fallback to Supabase Auth if API user not found or error
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data.user) {
        const u = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          role: data.user.user_metadata?.role || 'FARMER'
        };
        setUser(u);
        setProfile(u);
        setRole(u.role);
        localStorage.setItem('agriflow_user', JSON.stringify(u));
        setLoading(false);
        return { success: true, user: u, role: u.role };
      }

      setLoading(false);
      return { success: false, error: resData.error || error?.message || 'Sign in failed.' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Sign in failed.' };
    }
  };

  // MongoDB & Supabase Farmer Registration
  const signUpFarmer = async (farmerData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...farmerData, role: 'FARMER' })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const u = resData.user;
        setUser(u);
        setProfile(u);
        setRole('FARMER');
        localStorage.setItem('agriflow_token', resData.token);
        localStorage.setItem('agriflow_user', JSON.stringify(u));
        setLoading(false);
        return { success: true, user: u };
      }

      // Supabase fallback
      const { email, password, full_name, fullName, phone, district } = farmerData;
      const nameToUse = full_name || fullName;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nameToUse, role: 'FARMER', phone, district } }
      });

      if (!error && data.user) {
        const u = { id: data.user.id, email, full_name: nameToUse, role: 'FARMER' };
        setUser(u);
        setProfile(u);
        setRole('FARMER');
        setLoading(false);
        return { success: true, user: u };
      }

      setLoading(false);
      return { success: false, error: resData.error || error?.message || 'Registration failed.' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  // MongoDB & Supabase Officer Registration
  const signUpOfficer = async (officerData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...officerData, role: officerData.role || 'CENTRE_OPERATOR' })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        const u = resData.user;
        setUser(u);
        setProfile(u);
        setRole(u.role);
        localStorage.setItem('agriflow_token', resData.token);
        localStorage.setItem('agriflow_user', JSON.stringify(u));
        setLoading(false);
        return { success: true, user: u };
      }

      setLoading(false);
      return { success: false, error: resData.error || 'Officer registration failed.' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Officer registration failed.' };
    }
  };

  const signUp = signUpOfficer;

  // Sign Out
  const signOut = async () => {
    setLoading(true);
    localStorage.removeItem('agriflow_token');
    localStorage.removeItem('agriflow_user');
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
