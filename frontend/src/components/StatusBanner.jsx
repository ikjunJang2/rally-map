import { useEffect, useState } from 'react';

/** 오프라인이거나 서버 폴백 데이터를 쓰고 있을 때 상태를 알려주는 배너 */
export default function StatusBanner({ source }) {
  const [online, setOnline] = useState(navigator.onLine);

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

  if (!online) return <div className="banner warn">📴 오프라인 — 저장된 정보를 보여드리고 있어요</div>;
  if (source === 'fallback') return <div className="banner info">🔌 서버 연결 대기 중 — 기본 정보로 표시 중</div>;
  return null;
}
