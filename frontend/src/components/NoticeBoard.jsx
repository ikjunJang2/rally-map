/** 주최 측 실시간 공지 — 백엔드 /api/notices 에서 1분마다 갱신 */
export default function NoticeBoard({ notices }) {
  if (!notices.length) return null;
  return (
    <div className="noticeboard">
      {notices.map((n) => (
        <div key={n.id} className={`card ${n.pinned ? 'pinned' : ''}`}>
          <h3>{n.pinned ? '📌 ' : '📢 '}{n.title}</h3>
          <p className="meta">{n.body}</p>
        </div>
      ))}
    </div>
  );
}
