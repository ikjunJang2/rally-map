/** 태극기 — 게임 배경용 SVG (워터마크). 건곤감리 4괘 + 태극(적청). */
function Bars({ pattern }: { pattern: ('s' | 'b')[] }) {
  const BW = 40, BH = 6, VG = 6, BRK = 8; // 막대 너비/높이, 세로 간격, 끊김 간격
  const half = (BW - BRK) / 2;
  return (
    <g fill="#16213e">
      {pattern.map((p, i) => {
        const y = (i - 1) * (BH + VG) - BH / 2;
        return p === 's'
          ? <rect key={i} x={-BW / 2} y={y} width={BW} height={BH} rx={1} />
          : (
            <g key={i}>
              <rect x={-BW / 2} y={y} width={half} height={BH} rx={1} />
              <rect x={BRK / 2} y={y} width={half} height={BH} rx={1} />
            </g>
          );
      })}
    </g>
  );
}

export default function Taegeuk({ className, badge = false }: { className?: string; badge?: boolean }) {
  if (badge) {
    // 헤더 아이콘용 — 태극(적청)만, 정사각 뷰박스
    return (
      <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
        <g transform="translate(50 50) rotate(-33.69)">
          <path d="M-30,0 A30,30 0 0,1 30,0 A15,15 0 0,1 0,0 A15,15 0 0,0 -30,0 Z" fill="#CD2E3A" />
          <path d="M-30,0 A30,30 0 0,0 30,0 A15,15 0 0,0 0,0 A15,15 0 0,1 -30,0 Z" fill="#0047A0" />
        </g>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 360 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* 태극 — 적(양)이 위, 청(음)이 아래, 33.69° 기울임 */}
      <g transform="translate(180 120) rotate(-33.69)">
        <path d="M-54,0 A54,54 0 0,1 54,0 A27,27 0 0,1 0,0 A27,27 0 0,0 -54,0 Z" fill="#CD2E3A" />
        <path d="M-54,0 A54,54 0 0,0 54,0 A27,27 0 0,0 0,0 A27,27 0 0,1 -54,0 Z" fill="#0047A0" />
      </g>
      {/* 4괘 — 건(좌상) 감(우상) 리(좌하) 곤(우하) */}
      <g transform="translate(74 56) rotate(-33.69)"><Bars pattern={['s', 's', 's']} /></g>
      <g transform="translate(286 56) rotate(33.69)"><Bars pattern={['b', 's', 'b']} /></g>
      <g transform="translate(74 184) rotate(33.69)"><Bars pattern={['s', 'b', 's']} /></g>
      <g transform="translate(286 184) rotate(-33.69)"><Bars pattern={['b', 'b', 'b']} /></g>
    </svg>
  );
}
