import { Megaphone, Pin } from 'lucide-react';
import type { Notice } from '../types';

/** 운영진 실시간 공지 — 1분마다 자동 갱신 */
export default function NoticeBoard({ notices }: { notices: Notice[] }) {
  if (!notices.length) return null;
  return (
    <div className="noticeboard">
      {notices.map((n) => (
        <div key={n.id} className={`card notice-card ${n.pinned ? 'pinned' : ''}`}>
          <h3>
            {n.pinned
              ? <Pin size={16} className="ic accent" aria-label="고정 공지" />
              : <Megaphone size={16} className="ic accent" aria-label="공지" />}
            {n.title}
          </h3>
          {n.body && <p className="meta">{n.body}</p>}
        </div>
      ))}
    </div>
  );
}
