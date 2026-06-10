import { Link, NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePois, useNotices } from '../hooks/useApi';
import NoticeBoard from './NoticeBoard';

const NAV = [
  { to: '/', label: '지도', icon: '🗺️' },
  { to: '/live', label: '현장', icon: '📺' },
  { to: '/community', label: '소통', icon: '💬' },
  { to: '/call', label: '긴급', icon: '📞' },
  { to: '/guide', label: '안내', icon: '📋' },
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

  if (!online) return <div className="banner warn">📴 오프라인 — 저장된 정보 표시 중</div>;
  if (data?.source === 'fallback') return <div className="banner info">🔌 서버 연결 대기 중 — 기본 정보 표시 중</div>;
  return null;
}

export default function Layout() {
  const { isAdmin } = useAuth();
  const { data: notices } = useNotices();

  const toggleBig = () => document.body.classList.toggle('big');
  const toggleDark = () => document.body.classList.toggle('dark');

  return (
    <div className="app-frame">
      <StatusBanner />
      <header className="app-header">
        <h1>🕊️ 집회 한 장 지도 <span className="venue">핸드볼경기장</span></h1>
        <div className="toggles">
          <button onClick={toggleBig} aria-label="글자 크게">가나</button>
          <button onClick={toggleDark} aria-label="어두운 화면">🌙</button>
          <Link to="/admin" className={`admin-link ${isAdmin ? 'on' : ''}`} aria-label="관리자">⚙️</Link>
        </div>
      </header>

      <main>
        <NoticeBoard notices={notices ?? []} />
        <Outlet />
      </main>

      <footer>
        시민이 시민을 위해 만든 페이지 · 추적기 없음 · 오픈소스
      </footer>

      <nav className="bottom-nav" role="navigation">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'}>
            <span className="icon">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
