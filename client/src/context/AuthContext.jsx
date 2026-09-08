import React, { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToRealWebPush } from '../services/notificationManager';

const AuthContext = createContext({});

// Save user session and critical push notification keys to localStorage
function persistSession(u, token) {
  localStorage.setItem('agriflow_token', token);
  localStorage.setItem('agriflow_user', JSON.stringify(u));
  // These are read by notificationManager to tag push subscriptions with the correct user
  localStorage.setItem('agriflow_user_id', u.id || u._id || u.email || 'anonymous');
  localStorage.setItem('agriflow_role', u.role || 'FARMER');
}

function clearSession() {
  localStorage.removeItem('agriflow_token');
  localStorage.removeItem('agriflow_user');
  localStorage.removeItem('agriflow_user_id');
  localStorage.removeItem('agriflow_role');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore persisted auth on page load
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

  // After login/signup, ask for push notification permission and re-register push subscription with the real userId
  // so the server can target this specific user for real-time and lockscreen notifications
  async function afterAuthSuccess(u) {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            await subscribeToRealWebPush();
          }
        } else if (Notification.permission === 'granted') {
          await subscribeToRealWebPush();
        }
      }
    } catch (err) {
      console.warn('[Auth] Push notification permission request error:', err);
    }
  }

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
        persistSession(u, resData.token);
        setLoading(false);
        afterAuthSuccess(u); // re-subscribe push with real userId
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
        persistSession(u, resData.token);
        setLoading(false);
        afterAuthSuccess(u);
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
        persistSession(u, resData.token);
        setLoading(false);
        afterAuthSuccess(u);
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
    clearSession();
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
