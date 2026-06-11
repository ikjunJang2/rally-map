import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, AUTH_EXPIRED_EVENT, TOKEN_STORAGE_KEY } from '../api/client';

const STORAGE_KEY = TOKEN_STORAGE_KEY;

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

  // 토큰이 만료/무효(401)라고 api 레이어가 알리면 로그인 상태를 해제한다.
  // 그래야 isAdmin이 false가 되어 죽은 토큰으로 도는 관리자 쿼리들이 멈춘다.
  useEffect(() => {
    const onExpired = () => setToken(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
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
