import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const DARK_KEY = 'rally-theme-dark';
const BIG_KEY = 'rally-theme-big';

interface ThemeValue {
  dark: boolean;
  big: boolean;
  toggleDark: () => void;
  toggleBig: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

function initialDark(): boolean {
  const saved = localStorage.getItem(DARK_KEY);
  if (saved !== null) return saved === '1';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(initialDark);
  const [big, setBig] = useState(() => localStorage.getItem(BIG_KEY) === '1');

  useEffect(() => {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem(DARK_KEY, dark ? '1' : '0');
  }, [dark]);

  useEffect(() => {
    document.body.classList.toggle('big', big);
    localStorage.setItem(BIG_KEY, big ? '1' : '0');
  }, [big]);

  const toggleDark = useCallback(() => setDark((d) => !d), []);
  const toggleBig = useCallback(() => setBig((b) => !b), []);

  return (
    <ThemeContext.Provider value={{ dark, big, toggleDark, toggleBig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme는 ThemeProvider 안에서만 사용할 수 있습니다');
  return ctx;
}
