import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, CircleMarker, Popup } from 'react-leaflet';
import type { Map as LeafletMap, CircleMarker as LeafletCircleMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TYPE_INFO, CENTER } from '../data/fallbackPois';
import { usePois } from '../hooks/useApi';
import Skeleton from '../components/Skeleton';
import type { Poi, PoiType } from '../types';

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

export default function MapPage() {
  const { data, isLoading } = usePois();
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
  const focusPoi = (poi: Poi) => {
    mapBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([poi.lat, poi.lng], 18, { duration: 0.8 });
    if (popupTimer.current) clearTimeout(popupTimer.current);
    popupTimer.current = setTimeout(() => markerRefs.current[poi.id]?.openPopup(), 900);
  };

  return (
    <section aria-label="현장 지도">
      <div ref={mapBoxRef} style={{ scrollMarginTop: '110px' }} role="region" aria-label="현장 지도 — 화살표 키로 이동, +/- 키로 확대·축소">
        <MapContainer ref={mapRef} center={CENTER} zoom={17} className="map" scrollWheelZoom>
          {/* 타일 약관 준수: 기본은 OSM 표준(무료 공개 허용·라벨 내장),
              위성은 보조 레이어. CARTO는 그랜트 전용이라 제거함 */}
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="위성 (실사)">
              <TileLayer
                attribution='&copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="일반 지도">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
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
