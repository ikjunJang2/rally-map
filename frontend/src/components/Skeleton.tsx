/** 로딩 스켈레톤 — 콘텐츠 자리를 미리 잡아 화면 덜컹임 방지 */
export default function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card skeleton" aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${90 - i * 18}%` }} />
      ))}
    </div>
  );
}
