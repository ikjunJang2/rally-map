import { useMemo, useState } from 'react';
import { Tv, Play, Cctv, ExternalLink, MapPin, RefreshCw, Eye, ChevronDown } from 'lucide-react';
import { useStreams, useCctvs } from '../hooks/useApi';
import CctvPlayer from '../components/CctvPlayer';
import type { Stream } from '../types';

// 외부 CCTV 지도 (보조 링크)
const CCTV_LINKS = [
  { label: '서울시 교통 CCTV 지도 (TOPIS)', url: 'https://topis.seoul.go.kr/map/openCctvMap.do' },
  { label: '국가교통정보센터 CCTV 지도', url: 'https://www.its.go.kr/map/cctv' },
];

/** 12345 → "1.2만", 987 → "987" */
function formatViewers(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
  if (n >= 1_000) return n.toLocaleString('ko-KR');
  return String(n);
}

function StreamCard({ s }: { s: Stream }) {
  // 채널의 '현재 라이브'로 바로 가는 링크 → 처음(녹화 시작점)이 아니라 지금 실시간(라이브 엣지)으로 열림.
  // 채널ID 없는 수동 등록분은 원래 URL 사용.
  const href = s.channelId
    ? `https://www.youtube.com/channel/${s.channelId}/live`
    : s.url;
  return (
    <a className="card streamcard yt" href={href} target="_blank" rel="noreferrer"
       aria-label={`${s.title} — 유튜브에서 보기`}>
      {s.thumbnail && (
        <img className="yt-thumb" src={s.thumbnail} alt="" loading="lazy" />
      )}
      <div className="yt-body">
        <h3>
          {s.live
            ? <span className="live-dot">LIVE</span>
            : <span className="ended">종료</span>}
          {/* 출처 표기 — YouTube API 약관(III.F) attribution, 수동 등록과 시각 구분 */}
          {s.source === 'YOUTUBE'
            ? <span className="src-badge yt-badge">▶ YouTube</span>
            : <span className="src-badge">운영진 등록</span>}
          {s.title}
        </h3>
        {s.channel && (
          <p className="yt-channel">
            {s.channelThumbnail && (
              <img className="ch-avatar" src={s.channelThumbnail} alt="" loading="lazy" />
            )}
            <span className="ch-name">{s.channel}</span>
            {s.live && s.viewers != null && (
              <span className="viewers">
                <Eye size={13} aria-hidden="true" /> {formatViewers(s.viewers)}명 시청
              </span>
            )}
          </p>
        )}
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
        <p className="meta">주변 5km 안에서 공개된 실시간 CCTV를 찾지 못했어요.
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
            {open && <CctvPlayer src={`/api/cctv/stream?u=${encodeURIComponent(c.streamUrl)}`} title={c.name} />}
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

const PAGE_SIZE = 5;

function LiveSection() {
  const { data: streams = [] } = useStreams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // 라이브 우선 → 시청자수 많은 순 (시청자수 비공개는 뒤로)
  const sorted = useMemo(() =>
    [...streams].sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1;
      return (b.viewers ?? -1) - (a.viewers ?? -1);
    }), [streams]);

  const shown = sorted.slice(0, visibleCount);
  const remaining = sorted.length - visibleCount;

  return (
    <>
      {streams.length === 0 && (
        <div className="card">
          <p className="meta">
            지금 진행 중인 라이브를 찾지 못했어요. 1분마다 자동으로 다시 확인해요.
          </p>
        </div>
      )}
      {shown.map((s) => <StreamCard key={s.id} s={s} />)}
      {remaining > 0 && (
        <button className="ghost wide" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
          <ChevronDown size={17} aria-hidden="true" /> 더보기 ({remaining}개)
        </button>
      )}
      <p className="notice">
        라이브 목록은 YouTube API Services에서 제공되며 1분마다 자동 갱신됩니다.
        검색 노이즈 제거를 위해 일부 채널은 자동 수집에서 제외될 수 있어요
        (유튜브에서 직접 검색하면 모두 볼 수 있습니다). 종료된 방송은 곧 목록에서 사라집니다.
        이용 시 <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube
        이용약관</a>이 적용됩니다.
      </p>
    </>
  );
}

export default function LivePage() {
  const [tab, setTab] = useState<'live' | 'cctv'>('live');
  const { data: streams = [] } = useStreams();
  const auto = streams.some((s) => s.source === 'YOUTUBE');

  return (
    <section aria-label="현장 라이브와 CCTV">
      <h2 className="tab-title">
        <Tv size={20} className="ic accent" aria-hidden="true" />현장
        {tab === 'live' && auto && (
          <span className="auto-badge"><RefreshCw size={11} aria-hidden="true" /> 1분마다 자동 갱신</span>
        )}
      </h2>

      <div className="seg" role="tablist" aria-label="현장 정보 종류">
        <button role="tab" aria-selected={tab === 'live'} className={tab === 'live' ? 'on' : ''}
                onClick={() => setTab('live')}>
          <Tv size={16} aria-hidden="true" /> 라이브
        </button>
        <button role="tab" aria-selected={tab === 'cctv'} className={tab === 'cctv' ? 'on' : ''}
                onClick={() => setTab('cctv')}>
          <Cctv size={16} aria-hidden="true" /> CCTV
        </button>
      </div>

      {tab === 'live' ? <LiveSection /> : <CctvSection />}
    </section>
  );
}
