import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePois, useNotices } from '../hooks/useApi';
import NoticeBoard from './NoticeBoard';
import ErrorBoundary from './ErrorBoundary';

const NAV = [
  { to: '/', label: '지도', icon: '🗺️' },
  { to: '/live', label: '현장', icon: '📺' },
  { to: '/community', label: '소통', icon: '💬' },
  { to: '/call', label: '긴급', icon: '📞' },
  { to: '/guide', label: '안내', icon: '📋' },
] as const;

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

  if (!online) return <div className="banner warn" role="alert">📴 오프라인 — 저장된 정보 표시 중</div>;
  if (data?.source === 'fallback') return <div className="banner info" role="status">🔌 서버 연결 대기 중 — 기본 정보 표시 중</div>;
  return null;
}

/** 헌법 제1조 2항 — 메인 타이틀 */
function Hero() {
  return (
    <div className="hero" role="banner">
      <p className="hero-quote">
        "대한민국의 주권은 <b>국민</b>에게 있고,<br />
        모든 권력은 <b>국민</b>으로부터 나온다."
      </p>
      <p className="hero-source">— 대한민국 헌법 제1조 2항</p>
    </div>
  );
}

export default function Layout() {
  const { isAdmin } = useAuth();
  const { toggleBig, toggleDark } = useTheme();
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
        <h1>🕊️ 주권자의 광장 <span className="venue">핸드볼경기장</span></h1>
        <div className="toggles">
          <button onClick={toggleBig} aria-label="글자 크기 바꾸기">가나</button>
          <button onClick={toggleDark} aria-label="어두운 화면 전환">🌙</button>
          <Link to="/admin" className={`admin-link ${isAdmin ? 'on' : ''}`} aria-label="관리자 페이지">⚙️</Link>
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
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <span className="icon" aria-hidden="true">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
