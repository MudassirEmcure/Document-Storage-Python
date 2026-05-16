import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse token and set user
  const parseToken = useCallback((token) => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 > Date.now()) {
        setUser({ id: payload.sub, email: payload.email, name: payload.name || payload.email, role: payload.role });
        return true;
      }
    } catch {}
    return false;
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      if (!parseToken(token)) {
        localStorage.removeItem('access_token');
      }
    }
    setLoading(false);
  }, [parseToken]);

  // Prevent logged-in user from seeing login page (back button fix)
  useEffect(() => {
    if (!loading && user && location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { access_token } = response.data;
    localStorage.setItem('access_token', access_token);
    parseToken(access_token);
    return response.data;
  };

  const loginWithSSO = () => {
    window.location.href = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'}/auth/sso/login`;
  };

  const handleSSOCallback = (accessToken) => {
    localStorage.setItem('access_token', accessToken);
    parseToken(accessToken);
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('access_token');
    setUser(null);
    setLoggingOut(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loggingOut, login, loginWithSSO, handleSSOCallback, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
