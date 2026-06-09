import { useState } from 'react';
import Header from './components/Header';
import StatusBanner from './components/StatusBanner';
import NoticeBoard from './components/NoticeBoard';
import MapTab from './components/MapTab';
import EmergencyTab from './components/EmergencyTab';
import GuideTab from './components/GuideTab';
import { usePois, useNotices } from './hooks/usePois';

const TABS = [
  { id: 'map', label: '🗺️ 지도' },
  { id: 'call', label: '📞 긴급연락' },
  { id: 'guide', label: '📋 안내' },
];

export default function App() {
  const [tab, setTab] = useState('map');
  const { pois, source } = usePois();
  const notices = useNotices();

  const toggleBig = () => document.body.classList.toggle('big');
  const toggleDark = () => document.body.classList.toggle('dark');

  return (
    <>
      <StatusBanner source={source} />
      <Header onToggleBig={toggleBig} onToggleDark={toggleDark} />
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main>
        <NoticeBoard notices={notices} />
        {tab === 'map' && <MapTab pois={pois} />}
        {tab === 'call' && <EmergencyTab />}
        {tab === 'guide' && <GuideTab />}
      </main>
      <footer>
        시민이 시민을 위해 만든 페이지 · 추적기 없음 · 오픈소스<br />
        정보 수정 제안 환영합니다
      </footer>
    </>
  );
}
