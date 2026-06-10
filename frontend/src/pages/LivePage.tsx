import { useState } from 'react';
import { Tv, Radio, Play, Cctv, ExternalLink, SearchIcon, MapPin, RefreshCw } from 'lucide-react';
import { useStreams, useCctvs } from '../hooks/useApi';
import CctvPlayer from '../components/CctvPlayer';
import type { Stream } from '../types';

// 유튜브 검색 — sp=EgJAAQ%3D%3D 는 "라이브만" 필터
const ytLiveSearch = (q: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgJAAQ%3D%3D`;

const SEARCH_SHORTCUTS = [
  { label: '"핸드볼경기장 집회" 라이브 검색', q: '핸드볼경기장 집회' },
  { label: '"재선거 집회" 라이브 검색', q: '재선거 집회' },
  { label: '"올림픽공원 집회" 라이브 검색', q: '올림픽공원 집회' },
];

// 외부 CCTV 지도 (보조 링크)
const CCTV_LINKS = [
  { label: '서울시 교통 CCTV 지도 (TOPIS)', url: 'https://topis.seoul.go.kr/map/openCctvMap.do' },
  { label: '국가교통정보센터 CCTV 지도', url: 'https://www.its.go.kr/map/cctv' },
];

function StreamCard({ s }: { s: Stream }) {
  return (
    <a className="card streamcard yt" href={s.url} target="_blank" rel="noreferrer">
      {s.thumbnail && (
        <img className="yt-thumb" src={s.thumbnail} alt="" loading="lazy" />
      )}
      <div className="yt-body">
        <h3>
          {s.live
            ? <span className="live-dot">LIVE</span>
            : <span className="ended">종료</span>}
          {s.title}
        </h3>
        {s.channel && <p className="meta">{s.channel}</p>}
        <span className="navlink"><Play size={15} aria-hidden="true" /> 유튜브에서 보기</span>
      </div>
    </a>
  );
}

function CctvSection() {
  const { data, isLoading } = useCctvs();
  const [openUrl, setOpenUrl] = useState<string | null>(null);

  if (isLoading) return null;

  // API 키 미설정 — 외부 지도 링크로 안내
  if (!data?.enabled) {
    return (
      <>
        <div className="card">
          <p className="meta">
            서버에 ITS 오픈API 키를 설정하면 경기장 주변 교통 CCTV를 이 화면에서
            바로 볼 수 있어요. 지금은 아래 공식 지도에서 확인해주세요.
          </p>
        </div>
        {CCTV_LINKS.map((c) => (
          <a key={c.url} className="card streamcard" href={c.url} target="_blank" rel="noreferrer">
            <h3><Cctv size={17} className="ic" aria-hidden="true" />{c.label}</h3>
            <span className="navlink"><ExternalLink size={14} aria-hidden="true" /> 새 창에서 열기</span>
          </a>
        ))}
      </>
    );
  }

  if (data.cameras.length === 0) {
    return (
      <div className="card">
        <p className="meta">주변 2km 안에서 공개된 실시간 CCTV를 찾지 못했어요.
          교통 CCTV는 주요 간선도로 위주로 설치돼 있어요.</p>
      </div>
    );
  }

  return (
    <>
      {data.cameras.map((c) => {
        const open = openUrl === c.streamUrl;
        return (
          <div key={c.streamUrl} className="card">
            <h3><Cctv size={17} className="ic accent" aria-hidden="true" />{c.name}</h3>
            <p className="meta">
              <MapPin size={13} className="ic" aria-hidden="true" />
              경기장에서 약 {c.distanceM >= 1000 ? `${(c.distanceM / 1000).toFixed(1)}km` : `${c.distanceM}m`}
            </p>
            {open && <CctvPlayer src={c.streamUrl} title={c.name} />}
            <button className="primary" style={{ marginTop: 10 }} onClick={() => setOpenUrl(open ? null : c.streamUrl)}>
              {open ? '닫기' : <><Play size={16} aria-hidden="true" /> 실시간 보기</>}
            </button>
          </div>
        );
      })}
      <p className="notice">
        영상 출처: 국가교통정보센터(ITS) 공공데이터. 교통 모니터링 목적의 공개 CCTV로,
        사람 얼굴을 식별할 수 없는 도로 화면입니다.
      </p>
    </>
  );
}

export default function LivePage() {
  const { data: streams = [] } = useStreams();
  const auto = streams.filter((s) => s.source === 'YOUTUBE');

  return (
    <section aria-label="현장 라이브와 CCTV">
      <h2 className="tab-title">
        <Tv size={20} className="ic accent" aria-hidden="true" />현장 라이브
        {auto.length > 0 && (
          <span className="auto-badge"><RefreshCw size={11} aria-hidden="true" /> 1분마다 자동 갱신</span>
        )}
      </h2>

      {streams.length === 0 && (
        <div className="card">
          <p className="meta">
            지금 진행 중인 라이브를 찾지 못했어요. 잠시 후 자동으로 다시 확인하고,
            아래 버튼으로 유튜브에서 직접 찾아볼 수도 있어요.
          </p>
        </div>
      )}
      {streams.map((s) => <StreamCard key={s.id} s={s} />)}

      <h2 className="tab-title" style={{ marginTop: 24 }}>
        <SearchIcon size={20} className="ic accent" aria-hidden="true" />유튜브 라이브 직접 검색
      </h2>
      {SEARCH_SHORTCUTS.map((s) => (
        <a key={s.q} className="card streamcard" href={ytLiveSearch(s.q)} target="_blank" rel="noreferrer">
          <h3><Radio size={17} className="ic red" aria-hidden="true" />{s.label}</h3>
          <span className="navlink"><ExternalLink size={14} aria-hidden="true" /> 라이브 검색 결과 열기</span>
        </a>
      ))}

      <h2 className="tab-title" style={{ marginTop: 24 }}>
        <Cctv size={20} className="ic accent" aria-hidden="true" />경기장 주변 CCTV
      </h2>
      <CctvSection />
    </section>
  );
}
