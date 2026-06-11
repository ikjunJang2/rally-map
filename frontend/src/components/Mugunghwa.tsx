/** 무궁화 — 축하 효과용 5장 꽃잎(연분홍) + 단심(붉은 중심). */
export default function Mugunghwa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="-50 -50 100 100" aria-hidden="true">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-27" rx="15" ry="24" fill="#e58fc4" transform={`rotate(${a})`} />
      ))}
      {/* 단심 — 중심에서 뻗는 붉은 줄 */}
      {[0, 72, 144, 216, 288].map((a) => (
        <rect key={a} x="-2" y="-20" width="4" height="20" rx="2" fill="#b3123f" transform={`rotate(${a})`} />
      ))}
      <circle r="11" fill="#c8174c" />
      <circle r="5" fill="#f4c542" />
    </svg>
  );
}
