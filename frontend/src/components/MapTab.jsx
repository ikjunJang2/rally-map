import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, LayersControl, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TYPE_INFO, CENTER } from '../data/fallbackPois';

function FilterChips({ active, onToggle }) {
  return (
    <div className="chiprow">
      {Object.entries(TYPE_INFO).map(([key, info]) => (
        <button
          key={key}
          className={active.has(key) ? 'on' : ''}
          onClick={() => onToggle(key)}
        >
          {info.label}
        </button>
      ))}
    </div>
  );
}

function PoiCard({ poi }) {
  const info = TYPE_INFO[poi.type] ?? { label: poi.type };
  const kakao = `https://map.kakao.com/link/map/${encodeURIComponent(poi.name)},${poi.lat},${poi.lng}`;
  return (
    <div className="card">
      <h3>{info.label} {poi.name}</h3>
      <p className="meta">{poi.memo}</p>
      <a className="navlink" href={kakao} target="_blank" rel="noreferrer">카카오맵에서 길찾기 →</a>
    </div>
  );
}

export default function MapTab({ pois }) {
  const [active, setActive] = useState(() => new Set(Object.keys(TYPE_INFO)));

  const toggle = (key) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const visible = useMemo(
    () => pois.filter((p) => active.has(p.type)),
    [pois, active]
  );

  return (
    <section>
      <MapContainer center={CENTER} zoom={17} className="map" scrollWheelZoom>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="🛰️ 위성 (실사)">
            <TileLayer
              attribution='&copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="🗺️ 일반 지도">
            <TileLayer
              attribution='&copy; OpenStreetMap &copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          {/* 위성사진 위에 도로명·장소명 라벨 오버레이 */}
          <LayersControl.Overlay checked name="장소 이름 표시">
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
              maxZoom={19}
            />
          </LayersControl.Overlay>
        </LayersControl>
        {visible.map((p) => {
          const info = TYPE_INFO[p.type] ?? { color: '#666', label: p.type };
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={11}
              pathOptions={{ color: info.color, fillColor: info.color, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup><b>{info.label} {p.name}</b><br />{p.memo}</Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <FilterChips active={active} onToggle={toggle} />

      <div>
        {visible.map((p) => <PoiCard key={p.id} poi={p} />)}
      </div>

      <p className="notice">
        ⚠️ 시설 위치·운영시간은 현장 사정에 따라 다를 수 있어요. 위치 데이터: OpenStreetMap.
        본 서비스는 위치 추적·로그인·광고가 전혀 없습니다.
      </p>
    </section>
  );
}
