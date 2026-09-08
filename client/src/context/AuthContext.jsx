import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check persisted auth state on mount
  useEffect(() => {
    const savedUserStr = localStorage.getItem('agriflow_user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        setUser(savedUser);
        setProfile(savedUser);
        setRole(savedUser.role || 'FARMER');
      } catch (e) {
        console.warn('Invalid saved session');
      }
    }
    setLoading(false);
  }, []);

  // MongoDB Sign In
  const signIn = async (email, password) => {
    setLoading(true);
    try {
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

      setLoading(false);
      return { success: false, error: resData.error || 'Sign in failed.' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Sign in failed.' };
    }
  };

  // MongoDB Farmer Registration
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

      setLoading(false);
      return { success: false, error: resData.error || 'Registration failed.' };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message || 'Registration failed.' };
    }
  };

  // MongoDB Officer Registration
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
