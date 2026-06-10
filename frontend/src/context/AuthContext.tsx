import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { api } from '../api/client';

const STORAGE_KEY = 'rally-admin-token';

interface AuthValue {
  token: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  const login = useCallback(async (username: string, password: string) => {
    const { token } = await api<{ token: string }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
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

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
