import { useMemo, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
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
      <MapContainer center={CENTER} zoom={16} className="map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
