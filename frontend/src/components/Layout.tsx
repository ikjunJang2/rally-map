import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Landmark, Moon, Sun, ALargeSmall, Settings,
  Map, Tv, MessagesSquare, Phone, BookOpen,
  WifiOff, PlugZap, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePois, useNotices } from '../hooks/useApi';
import NoticeBoard from './NoticeBoard';
import ErrorBoundary from './ErrorBoundary';

const NAV: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/', label: '지도', Icon: Map },
  { to: '/live', label: '현장', Icon: Tv },
  { to: '/community', label: '소통', Icon: MessagesSquare },
  { to: '/call', label: '긴급', Icon: Phone },
  { to: '/guide', label: '안내', Icon: BookOpen },
];

function StatusBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const { data } = usePois();

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (!online) {
    return (
      <div className="banner warn" role="alert">
        <WifiOff size={15} aria-hidden="true" /> 오프라인 — 저장된 정보 표시 중
      </div>
    );
  }
  if (data?.source === 'fallback') {
    return (
      <div className="banner info" role="status">
        <PlugZap size={15} aria-hidden="true" /> 서버 연결 대기 중 — 기본 정보 표시 중
      </div>
    );
  }
  return null;
}

/** 헌법 제1조 2항 — 메인 타이틀 */
function Hero() {
  return (
    <div className="hero" role="banner">
      <p className="hero-quote">
        대한민국의 주권은 <b>국민</b>에게 있고,<br />
        모든 권력은 <b>국민</b>으로부터 나온다.
      </p>
      <p className="hero-source">대한민국 헌법 제1조 2항</p>
    </div>
  );
}

export default function Layout() {
  const { isAdmin } = useAuth();
  const { dark, toggleBig, toggleDark } = useTheme();
  const { data: notices } = useNotices();
  const { pathname } = useLocation();

  // 페이지 이동 시 스크롤 맨 위로
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">본문 바로가기</a>
      <StatusBanner />
      <header className="app-header">
        <h1>
          <Landmark size={22} className="logo" aria-hidden="true" />
          주권자의 광장
          <span className="venue">핸드볼경기장</span>
        </h1>
        <div className="toggles">
          <button onClick={toggleBig} aria-label="글자 크기 바꾸기">
            <ALargeSmall size={20} aria-hidden="true" />
          </button>
          <button onClick={toggleDark} aria-label="어두운 화면 전환">
            {dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <Link to="/admin" className={`admin-link ${isAdmin ? 'on' : ''}`} aria-label="관리자 페이지">
            <Settings size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {pathname === '/' && <Hero />}

      <main id="main" tabIndex={-1}>
        <NoticeBoard notices={notices ?? []} />
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      <footer>
        시민이 시민을 위해 만든 페이지 · 추적기 없음 · 오픈소스
      </footer>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            <Icon size={23} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
