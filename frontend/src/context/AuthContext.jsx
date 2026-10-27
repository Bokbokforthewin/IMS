import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ simplified_encoding_workflow: true });

  const fetchMe = async () => {
    try {
      const res = await api.get('/v1/auth/me');
      setUser(res.data);
    } catch {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/v1/settings');
      setSettings(res.data);
    } catch {
      // leave default if it fails
    }
  };

  useEffect(() => {
    if (token) {
      fetchMe().then(fetchSettings);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/v1/auth/login', { email, password });
      const { token: newToken, user: userData } = res.data;

      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(userData);
      await fetchSettings();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.response?.data?.message || 'Login failed');
    }
  };

  const register = async (payload) => {
    try {
      const res = await api.post('/v1/auth/register', payload);
      const { token: newToken, user: userData } = res.data;

      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(userData);
      await fetchSettings();
      return res.data;
    } catch (err) {
      const serverMessage = err.response?.data?.error || err.response?.data?.message;
      throw new Error(serverMessage || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.post('/v1/auth/logout');
    } finally {
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    }
  };

  // Safe role check handling string arrays OR object arrays
  const hasRole = (role) => {
    if (!user || !user.roles) return false;
    return user.roles.some((r) => (typeof r === 'string' ? r : r.name) === role);
  };

  // Safe permission check with Super Admin override & normalization
  const hasPermission = (perm) => {
    if (!user) return false;

    // 1. Instant Super Admin Bypass
    if (hasRole('super_admin')) {
      return true;
    }

    // 2. Safe string/object extraction
    const rawPermissions = user.permissions || user.all_permissions || [];
    return rawPermissions.some((p) => (typeof p === 'string' ? p : p?.name) === perm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        settings,
        refetchSettings: fetchSettings,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);