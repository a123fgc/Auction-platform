import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  loginApi,
  logoutApi,
  meApi,
  signupApi,
} from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async () => {
    try {
      const { user } = await meApi();
      setUser(user);
    } catch {
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = async (creds) => {
    const data = await loginApi(creds);
    if (data.token) localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const data = await signupApi(payload);
    if (data.token) localStorage.setItem('token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      /* ignore */
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, logout, refresh: hydrate }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}