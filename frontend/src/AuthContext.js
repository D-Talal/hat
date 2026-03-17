import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Set token on axios immediately when module loads
const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(savedToken);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get(`${API_URL}/auth/me`)
        .then(r => setUser(r.data))
        .catch(() => { logout(); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (accessToken, userData) => {
    localStorage.setItem('token', accessToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  const can = (action) => {
    const perms = {
      admin: ['create', 'read', 'update', 'delete', 'manage_users', 'view_audit', 'create_invoice', 'update_invoice', 'delete_invoice', 'view_financials'],
      manager: ['create', 'read', 'update', 'view_audit', 'create_invoice', 'update_invoice'],
      viewer: ['read'],
      accountant: ['read', 'create_invoice', 'update_invoice', 'delete_invoice', 'view_financials'],
    };
    return (perms[user?.role] || []).includes(action);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
