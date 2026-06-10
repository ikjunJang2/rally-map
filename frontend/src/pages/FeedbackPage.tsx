import { useState, type FormEvent } from 'react';
import { MessageSquareHeart, Send } from 'lucide-react';
import { useCreateFeedback } from '../hooks/useApi';
import { useToast } from '../context/ToastContext';

const MAX = 2000;

export default function FeedbackPage() {
  const create = useCreateFeedback();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await create.mutateAsync({ message, contact: contact || undefined });
      toast('success', r.message);
      setMessage('');
      setContact('');
      setDone(true);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '전송에 실패했어요');
    }
  };

  return (
    <section aria-label="개발자에게 바란다">
      <h2 className="tab-title">
        <MessageSquareHeart size={20} className="ic accent" aria-hidden="true" />개발자에게 바란다
      </h2>

      <div className="card">
        <p className="meta">
          이 페이지에 바라는 점, 불편했던 점, 추가했으면 하는 기능 — 무엇이든 적어주세요.
          시민 여러분의 의견이 이 광장을 더 낫게 만들어요.
        </p>
      </div>

      <form className="card post-form" onSubmit={submit}>
        <textarea required maxLength={MAX} rows={6} placeholder="바라는 점을 자유롭게 적어주세요"
                  aria-label="바라는 점" value={message} onChange={(e) => setMessage(e.target.value)} />
        <p className="char-count">{message.length}/{MAX}</p>
        <input maxLength={120} placeholder="회신 받을 연락처 (선택 — 이메일 등)"
               aria-label="회신 연락처 (선택)" value={contact} onChange={(e) => setContact(e.target.value)} />
        <button type="submit" className="primary" disabled={create.isPending || !message.trim()}>
          <Send size={16} aria-hidden="true" /> {create.isPending ? '보내는 중…' : '보내기'}
        </button>
        <p className="notice" style={{ margin: '8px 0 0' }}>
          연락처는 회신이 필요할 때만 쓰이고, 적지 않아도 됩니다. 욕설·스팸은 자동 차단돼요.
        </p>
      </form>

      {done && (
        <div className="card">
          <p className="meta">✅ 보내주셔서 고맙습니다. 운영진이 확인하고 반영하도록 할게요.</p>
        </div>
      )}
    </section>
  );
}
