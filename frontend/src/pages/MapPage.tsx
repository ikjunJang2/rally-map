import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { Map as LeafletMap, CircleMarker as LeafletCircleMarker, TileEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Gift } from 'lucide-react';
import { TYPE_INFO, CENTER } from '../data/fallbackPois';
import { usePois, useShare, useCongestion, useStreams } from '../hooks/useApi';
import Skeleton from '../components/Skeleton';
import type { ItemStatus, Poi, PoiType, ShareCategory } from '../types';

/** 나눔 품목 재고 상태 표시 (관리자·시민 공용) */
export const SHARE_STATUS: Record<ItemStatus, { label: string; cls: string }> = {
  PLENTY: { label: '넉넉함', cls: 'plenty' },
  LOW: { label: '얼마 남음', cls: 'low' },
  OUT: { label: '소진', cls: 'out' },
};

/** 나눔 품목 분류 (관리자·시민 공용) */
export const SHARE_CATEGORY: Record<ShareCategory, { label: string; emoji: string }> = {
  WATER:   { label: '물',   emoji: '💧' },
  FOOD:    { label: '식품', emoji: '🍪' },
  WARM:    { label: '방한', emoji: '🧤' },
  MEDICAL: { label: '의료', emoji: '🩹' },
  RAIN:    { label: '우비', emoji: '☂️' },
  ETC:     { label: '기타', emoji: '📦' },
};

/** ISO 시각 → "방금 / N분 전 / N시간 전 / N일 전" (나눔 신선도) */
export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return '방금';
  const m = Math.floor(s / 60); if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 혼잡도 단계 → 색·이모지 (서울 도시데이터: 여유/보통/약간 붐빔/붐빔) */
const CONGEST: Record<string, { cls: string; emoji: string }> = {
  '여유': { cls: 'free', emoji: '🟢' },
  '보통': { cls: 'normal', emoji: '🔵' },
  '약간 붐빔': { cls: 'busy', emoji: '🟠' },
  '붐빔': { cls: 'crowd', emoji: '🔴' },
};

const hm = (t: string | null) => (t && t.length >= 16 ? t.slice(11, 16) : (t ?? ''));

/** 서울 공식 혼잡도(키 있을 때) */
function OfficialCongestion({ data }: { data: NonNullable<ReturnType<typeof useCongestion>['data']> }) {
  const c = CONGEST[data.level!] ?? { cls: '', emoji: 'ℹ️' };
  const ppl = data.min != null && data.max != null
    ? `약 ${data.min.toLocaleString('ko-KR')}~${data.max.toLocaleString('ko-KR')}명` : '';
  const fcst = (data.forecast ?? []).filter((f) => f.level).slice(0, 4);
  return (
    <div className={`congest-card ${c.cls}`} role="status" aria-label="실시간 혼잡도">
      <div className="congest-head">
        <span className="congest-lvl">{c.emoji} {data.level}</span>
        <span className="congest-area">{data.area} 실시간 혼잡도</span>
      </div>
      {ppl && <p className="congest-ppl">{ppl}{data.time ? ` · ${hm(data.time)} 기준` : ''}</p>}
      {data.message && <p className="congest-msg">{data.message}</p>}
      {fcst.length > 0 && (
        <div className="congest-fcst">
          {fcst.map((f, i) => {
            const fc = CONGEST[f.level] ?? { emoji: '·' };
            return <span key={i} className="fcst-chip">{hm(f.time)} {fc.emoji}{f.level}</span>;
          })}
        </div>
      )}
      <p className="congest-src">출처: 서울 실시간 도시데이터(추적 없는 공식 집계)</p>
    </div>
  );
}

/** 폴백: 수집 중인 유튜브 라이브 시청자로 "현장 라이브 열기" 자동 추정 (키 불필요·실측 밀집도 아님) */
function LiveHeat() {
  const { data: streams = [] } = useStreams();
  const live = streams.filter((s) => s.live);
  if (live.length === 0) return null;
  const viewers = live.reduce((sum, s) => sum + (s.viewers ?? 0), 0);
  const heat = viewers >= 80000 ? { lvl: '매우 뜨거움', cls: 'crowd', emoji: '🔥' }
    : viewers >= 20000 ? { lvl: '뜨거움', cls: 'busy', emoji: '🔥' }
    : viewers >= 3000 ? { lvl: '활발', cls: 'normal', emoji: '🟠' }
    : { lvl: '잔잔', cls: 'free', emoji: '🟢' };
  return (
    <div className={`congest-card ${viewers > 0 ? heat.cls : ''}`} role="status" aria-label="현장 라이브 열기">
      <div className="congest-head">
        <span className="congest-lvl">{viewers > 0 ? `${heat.emoji} ${heat.lvl}` : '🔴 LIVE'}</span>
        <span className="congest-area">현장 라이브 열기</span>
      </div>
      <p className="congest-ppl">
        지금 라이브 {live.length}개
        {viewers > 0 && ` · 총 ${viewers.toLocaleString('ko-KR')}명 시청 중`}
      </p>
      <p className="congest-src">
        ※ 유튜브 라이브 시청자 기준 추정(온라인 관심·규모) — 실측 현장 밀집도는 아니에요.
        정확한 혼잡도는 서울 도시데이터 키 등록 시 표시됩니다.
      </p>
    </div>
  );
}

/** 실시간 혼잡도 배너 — 서울 공식 데이터(키 있을 때) → 없으면 유튜브 라이브 열기로 자동 폴백 */
function CongestionBanner() {
  const { data } = useCongestion();
  if (data?.enabled && !data.error && data.level) return <OfficialCongestion data={data} />;
  return <LiveHeat />;
}

function FilterChecks({ active, onToggle }: {
  active: Set<PoiType>;
  onToggle: (key: PoiType) => void;
}) {
  return (
    <div className="filter-checks" role="group" aria-label="시설 종류 필터">
      {(Object.entries(TYPE_INFO) as [PoiType, (typeof TYPE_INFO)[PoiType]][]).map(([key, info]) => (
        <label key={key} className="check">
          <input
            type="checkbox"
            checked={active.has(key)}
            onChange={() => onToggle(key)}
          />
          <info.Icon size={15} aria-hidden="true" style={{ color: info.color }} />
          {info.label}
        </label>
      ))}
    </div>
  );
}

function PoiCard({ poi, onFocus }: { poi: Poi; onFocus: (poi: Poi) => void }) {
  const info = TYPE_INFO[poi.type];
  return (
    <button className="card poi-card" onClick={() => onFocus(poi)}>
      <h3>
        {info && <span className="poi-ic" style={{ color: info.color }}><info.Icon size={18} aria-hidden="true" /></span>}
        {poi.name}
      </h3>
      {poi.memo && <p className="meta">{poi.memo}</p>}
      <span className="navlink">지도에서 보기 ↑</span>
    </button>
  );
}

/** 모바일 콜드로드·탭 전환 시 컨테이너 크기가 늦게 잡혀 회색이 되는 것 방지 */
function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    fix();
    const t1 = setTimeout(fix, 250);
    const t2 = setTimeout(fix, 1200);
    window.addEventListener('resize', fix);
    window.addEventListener('orientationchange', fix);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('resize', fix);
      window.removeEventListener('orientationchange', fix);
    };
  }, [map]);
  return null;
}

/** 타일 로드 실패(특히 위성 Esri의 간헐적 쓰로틀) 시 짧게 재시도 — 회색 패치 감소 */
function retryTile(e: TileEvent) {
  const tile = e.tile as HTMLImageElement;
  const n = Number(tile.dataset.retry ?? 0);
  if (n >= 2) return;
  tile.dataset.retry = String(n + 1);
  const src = tile.src;
  setTimeout(() => { tile.src = src; }, 500 * (n + 1));
}

export default function MapPage() {
  const { data, isLoading } = usePois();
  const { data: share = [] } = useShare();
  const pois = useMemo(() => data?.pois ?? [], [data]);

  const [active, setActive] = useState<Set<PoiType>>(
    () => new Set(Object.keys(TYPE_INFO) as PoiType[]),
  );
  const mapRef = useRef<LeafletMap | null>(null);
  const mapBoxRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<number, LeafletCircleMarker>>({});
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 언마운트 시 팝업 타이머 정리
  useEffect(() => () => {
    if (popupTimer.current) clearTimeout(popupTimer.current);
  }, []);

  const toggle = (key: PoiType) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const visible = useMemo(
    () => pois.filter((p) => active.has(p.type)),
    [pois, active],
  );

  /** 카드 클릭 → 지도 위치로 부드럽게 이동 + 팝업 열기 */
  const focusPoi = (poi: { id: number; lat: number; lng: number }) => {
    mapBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([poi.lat, poi.lng], 18, { duration: 0.8 });
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => markerRefs.current[poi.id]?.openPopup(), 900);
  };

  return (
    <section aria-label="현장 지도">
      <CongestionBanner />
      <div ref={mapBoxRef} style={{ scrollMarginTop: '110px' }} role="region" aria-label="현장 지도 — 화살표 키로 이동, +/- 키로 확대·축소">
        <MapContainer ref={mapRef} center={CENTER} zoom={17} className="map" scrollWheelZoom>
          <MapResizeFix />
          {/* 타일 약관 준수: 기본은 OSM 표준(무료 공개 허용·라벨 내장),
              위성은 보조 레이어. CARTO는 그랜트 전용이라 제거함 */}
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="일반 지도">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                url="/tiles/osm/{z}/{x}/{y}.png"
                maxZoom={19}
                eventHandlers={{ tileerror: retryTile }}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="위성 (실사)">
              <TileLayer
                attribution='&copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
                url="/tiles/esri/{z}/{y}/{x}"
                maxZoom={19}
                eventHandlers={{ tileerror: retryTile }}
              />
            </LayersControl.BaseLayer>
          </LayersControl>
          {visible.map((p) => {
            const info = TYPE_INFO[p.type] ?? { color: '#666', label: p.type };
            return (
              <CircleMarker
                key={p.id}
                ref={(m) => {
                  // 언마운트 시 키를 지워 참조 누적 방지
                  if (m) markerRefs.current[p.id] = m;
                  else delete markerRefs.current[p.id];
                }}
                center={[p.lat, p.lng]}
                radius={11}
                pathOptions={{ color: info.color, fillColor: info.color, fillOpacity: 0.85, weight: 2 }}
              >
                {/* autoPanPadding: 좁은 화면에서 팝업이 헤더·탭바에 가리지 않게 */}
                <Popup autoPanPadding={[24, 96]} maxWidth={280}>
                  <b>{p.name}</b><br />{p.memo}
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {share.length > 0 && (
        <div className="share-status">
          <h3 className="sub-title"><Gift size={17} className="ic accent" aria-hidden="true" />지금 나눔 현황</h3>
          {share.map((loc) => (
            <button key={loc.poiId} className="card share-loc"
                    onClick={() => focusPoi({ id: loc.poiId, lat: loc.lat, lng: loc.lng })}>
              <h3>{loc.name}</h3>
              <div className="share-items">
                {[...loc.items].sort((a, b) => a.category.localeCompare(b.category)).map((it) => {
                  // 서버가 예상 밖 값이어도 크래시하지 않게 폴백
                  const st = SHARE_STATUS[it.status] ?? { label: it.status, cls: '' };
                  const cat = SHARE_CATEGORY[it.category] ?? { emoji: '📦' };
                  return (
                    <span key={it.id} className={`share-chip ${st.cls}`}>
                      <span aria-hidden="true">{cat.emoji} </span>{it.name}{it.quantity ? ` ${it.quantity}` : ''} · {st.label}
                    </span>
                  );
                })}
              </div>
              {loc.items.length > 0 && (
                <span className="share-fresh">갱신 {timeAgo(loc.items.reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), loc.items[0].updatedAt))}</span>
              )}
              <span className="navlink">지도에서 위치 보기 ↑</span>
            </button>
          ))}
        </div>
      )}

      <FilterChecks active={active} onToggle={toggle} />

      {isLoading
        ? <Skeleton lines={3} />
        : visible.map((p) => <PoiCard key={p.id} poi={p} onFocus={focusPoi} />)}

      <p className="notice">
        시설 위치·운영시간은 현장 사정에 따라 다를 수 있어요. 위치 데이터: OpenStreetMap.
        본 서비스는 위치 추적·로그인·광고가 전혀 없습니다.
      </p>
    </section>
  );
}
