/**
 * 태극기 — 대한민국 국기법 규격 SVG (공식 지오메트리 그대로).
 * badge: 헤더 아이콘용으로 태극(적청)만, 정사각 뷰박스.
 */
export default function Taegeuk({ className, badge = false }: { className?: string; badge?: boolean }) {
  if (badge) {
    return (
      <svg className={className} viewBox="-27 -27 54 54" aria-hidden="true">
        <g transform="rotate(33.69006752598)">
          <path fill="#cd2e3a" d="M12 0a18 18 0 11-36 0 24 24 0 1148 0" />
          <path fill="#0047a0" d="M-24 0a24 24 0 1048 0A12 12 0 100 0a12 12 0 11-24 0" />
        </g>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="-72 -48 144 96" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* 4괘 (건·곤·감·리) — 국기법 규격 인코딩 */}
      <g stroke="#16213e" strokeWidth="4">
        <path transform="rotate(33.69006752598)" d="M-50-12v24m6 0v-24m6 0v24m76 0V1m0-2v-11m6 0v11m0 2v11m6 0V1m0-2v-11" />
        <path transform="rotate(-33.69006752598)" d="M-50-12v24m6 0V1m0-2v-11m6 0v24m76 0V1m0-2v-11m6 0v24m6 0V1m0-2v-11" />
      </g>
      {/* 태극 — 적(양) 위, 청(음) 아래 */}
      <g transform="rotate(33.69006752598)">
        <path fill="#cd2e3a" d="M12 0a18 18 0 11-36 0 24 24 0 1148 0" />
        <path fill="#0047a0" d="M-24 0a24 24 0 1048 0A12 12 0 100 0a12 12 0 11-24 0" />
      </g>
    </svg>
  );
}
