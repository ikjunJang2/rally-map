import { useEffect, useState } from 'react';
import { fetchStreams } from '../api/client';

const REFRESH_MS = 60_000;

// 유튜브 검색 — sp=EgJAAQ%3D%3D 는 "라이브만" 필터
const ytLiveSearch = (q) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgJAAQ%3D%3D`;

const SEARCH_SHORTCUTS = [
  { label: '🔴 "핸드볼경기장 집회" 라이브 검색', q: '핸드볼경기장 집회' },
  { label: '🔴 "재선거 집회" 라이브 검색', q: '재선거 집회' },
  { label: '🔴 "올림픽공원 집회" 라이브 검색', q: '올림픽공원 집회' },
];

// 서울시 TOPIS — 무료 공개 교통 CCTV (올림픽공원 주변 도로 확인용)
const CCTV_LINKS = [
  { label: '서울시 교통 CCTV 지도 (TOPIS)', url: 'https://topis.seoul.go.kr/map/openMapPage.do' },
  { label: '국가교통정보센터 CCTV', url: 'https://www.its.go.kr/map/cctv' },
];

export default function LiveTab() {
  const [streams, setStreams] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const data = await fetchStreams();
      if (alive) setStreams(data);
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <section>
      <h2 className="tab-title">📺 현장 라이브</h2>

      {streams.length === 0 && (
        <div className="card">
          <p className="meta">아직 등록된 라이브가 없어요. 아래 버튼으로 유튜브에서 직접 찾아보세요.</p>
        </div>
      )}
      {streams.map((s) => (
        <a key={s.id} className="card streamcard" href={s.url} target="_blank" rel="noreferrer">
          <h3>
            {s.live
              ? <span className="live-dot">● LIVE</span>
              : <span className="ended">종료</span>} {s.title}
          </h3>
          {s.channel && <p className="meta">{s.channel}</p>}
          <span className="navlink">유튜브에서 보기 →</span>
        </a>
      ))}

      <h2 className="tab-title" style={{ marginTop: 24 }}>🔍 유튜브 라이브 바로 검색</h2>
      {SEARCH_SHORTCUTS.map((s) => (
        <a key={s.q} className="card streamcard" href={ytLiveSearch(s.q)} target="_blank" rel="noreferrer">
          <h3>{s.label}</h3>
          <span className="navlink">유튜브 라이브 검색 결과 →</span>
        </a>
      ))}

      <h2 className="tab-title" style={{ marginTop: 24 }}>📹 주변 도로 CCTV (무료 공개)</h2>
      <div className="card">
        <p className="meta">
          서울시·국가교통정보센터가 무료 공개하는 교통 CCTV로 올림픽공원 주변
          도로 상황(양재대로·올림픽로)을 실시간 확인할 수 있어요.
          지도에서 올림픽공원 근처 카메라 아이콘을 누르면 됩니다.
        </p>
      </div>
      {CCTV_LINKS.map((c) => (
        <a key={c.url} className="card streamcard" href={c.url} target="_blank" rel="noreferrer">
          <h3>📹 {c.label}</h3>
          <span className="navlink">새 창에서 열기 →</span>
        </a>
      ))}

      <p className="notice">
        라이브 목록은 주최 측이 등록하며 1분마다 자동 갱신됩니다.
        링크는 모두 외부 서비스(유튜브·서울시)로 연결돼요.
      </p>
    </section>
  );
}
