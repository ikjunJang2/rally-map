import { createContext, useCallback, useContext, useState } from 'react';
import { api } from '../api/client';

const STORAGE_KEY = 'rally-admin-token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));

  const login = useCallback(async (username, password) => {
    const { token } = await api('/auth/login', { method: 'POST', body: { username, password } });
    localStorage.setItem(STORAGE_KEY, token);
    setToken(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAdmin: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
