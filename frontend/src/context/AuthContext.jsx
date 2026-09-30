import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (token) {
      fetchMe();
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

  const hasRole = (role) => user?.roles?.some((r) => r.name === role) ?? false;
  const hasPermission = (perm) => user?.permissions?.some((p) => p.name === perm) ?? false;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);