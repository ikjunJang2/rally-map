import { useState } from 'react';
import { MessageSquareHeart, Send } from 'lucide-react';
import { CONTACT_EMAIL } from '../config';

const MAX = 2000;

/**
 * 개발자에게 바란다 — 서버를 거치지 않고 사용자의 메일 앱을 열어
 * contact@63freedom.com 으로 보냄. (Cloudflare 라우팅으로 운영자 지메일에 수신)
 */
export default function FeedbackPage() {
  const [message, setMessage] = useState('');

  const mailto =
    `mailto:${CONTACT_EMAIL}` +
    `?subject=${encodeURIComponent('[주권자의 광장] 개발자에게 바란다')}` +
    `&body=${encodeURIComponent(message)}`;

  return (
    <section aria-label="개발자에게 바란다">
      <h2 className="tab-title">
        <MessageSquareHeart size={20} className="ic accent" aria-hidden="true" />개발자에게 바란다
      </h2>

      <div className="card">
        <p className="meta">
          이 페이지에 바라는 점, 불편했던 점, 추가했으면 하는 기능 — 무엇이든 적어주세요.
          아래 버튼을 누르면 메일 앱이 열리고, 받는사람이 자동으로 채워져요. 그대로 보내시면 운영진에게 전달됩니다.
        </p>
      </div>

      <div className="card post-form">
        <textarea maxLength={MAX} rows={6} placeholder="바라는 점을 자유롭게 적어주세요"
                  aria-label="바라는 점" value={message} onChange={(e) => setMessage(e.target.value)} />
        <p className="char-count">{message.length}/{MAX}</p>
        <a className={`primary ${message.trim() ? '' : 'disabled'}`}
           href={message.trim() ? mailto : undefined}
           aria-disabled={!message.trim()}>
          <Send size={16} aria-hidden="true" /> 메일로 보내기
        </a>
        <p className="notice" style={{ margin: '8px 0 0' }}>
          메일 앱이 없으면 <b>{CONTACT_EMAIL}</b> 으로 직접 보내주셔도 돼요.
          개인정보(실명·전화번호 등)는 꼭 필요할 때만 적어주세요.
        </p>
      </div>
    </section>
  );
}
