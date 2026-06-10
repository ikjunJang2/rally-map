import { useState, useTransition, type FormEvent } from 'react';
import {
  MessagesSquare, MessageCircle, Megaphone, Gift, HelpCircle, Heart, PenLine,
  type LucideIcon,
} from 'lucide-react';
import { usePosts, useCreatePost, useDeletePostByAuthor, useAdminMutation } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import { ApiError } from '../api/client';
import type { Post, PostCategory } from '../types';

export const CATEGORIES: Record<PostCategory, { label: string; Icon: LucideIcon }> = {
  FREE: { label: '자유', Icon: MessageCircle },
  INFO: { label: '정보공유', Icon: Megaphone },
  SHARE: { label: '물품나눔', Icon: Gift },
  QUESTION: { label: '질문', Icon: HelpCircle },
  CHEER: { label: '응원', Icon: Heart },
};

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

function PostForm({ category, onDone }: { category: PostCategory | null; onDone: () => void }) {
  const create = useCreatePost();
  const toast = useToast();
  const [form, setForm] = useState({ nickname: '', pin: '', title: '', body: '' });
  const set = (k: keyof typeof form) =>
    (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ ...form, category: category ?? 'FREE' });
      setForm({ nickname: '', pin: '', title: '', body: '' });
      toast('success', '글이 등록됐어요');
      onDone();
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '등록에 실패했어요');
    }
  };

  return (
    <form className="card post-form" onSubmit={submit}>
      <div className="form-row">
        {/* autoFocus: 폼이 열리면 키보드 포커스를 첫 입력으로 */}
        <input required autoFocus maxLength={20} placeholder="닉네임" aria-label="닉네임"
               value={form.nickname} onChange={set('nickname')} />
        <input required minLength={4} maxLength={20} type="password" placeholder="삭제용 PIN (4자+)"
               aria-label="삭제용 PIN, 4자 이상" value={form.pin} onChange={set('pin')} />
      </div>
      <input required maxLength={100} placeholder="제목" aria-label="제목" value={form.title} onChange={set('title')} />
      <textarea maxLength={2000} rows={4} placeholder="내용 (선택)" aria-label="내용 (선택)"
                value={form.body} onChange={set('body')} />
      <button type="submit" className="primary" disabled={create.isPending}>
        {create.isPending ? '등록 중…' : '글 등록'}
      </button>
      <p className="notice" style={{ margin: '8px 0 0' }}>
        익명 게시판이에요. PIN은 글 삭제할 때만 쓰이고 암호화 저장됩니다.
      </p>
    </form>
  );
}

function PostCard({ post }: { post: Post }) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const delByAuthor = useDeletePostByAuthor();
  const adminDel = useAdminMutation(['posts']);
  const [deleting, setDeleting] = useState(false);
  const [pin, setPin] = useState('');

  const authorDelete = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await delByAuthor.mutateAsync({ id: post.id, pin });
      toast('success', '글을 삭제했어요');
    } catch (err) {
      toast('error', err instanceof ApiError && err.status === 403
        ? 'PIN이 일치하지 않아요'
        : '삭제에 실패했어요');
    }
  };

  const cat = CATEGORIES[post.category];
  return (
    <article className="card">
      <h3>
        <span className="badge">
          {cat ? <><cat.Icon size={12} aria-hidden="true" /> {cat.label}</> : post.category}
        </span>
        {post.title}
      </h3>
      {post.body && <p className="meta post-body">{post.body}</p>}
      <p className="meta post-foot">
        {post.nickname} · {timeAgo(post.createdAt)}
        <button className="linklike" onClick={() => setDeleting(!deleting)}>삭제</button>
        {isAdmin && (
          <button
            className="linklike admin"
            onClick={() => adminDel.mutate(
              { path: `/admin/posts/${post.id}`, method: 'DELETE' },
              { onSuccess: () => toast('success', '관리자 권한으로 삭제했어요') },
            )}
          >
            관리자 삭제
          </button>
        )}
      </p>
      {deleting && (
        <form className="form-row" onSubmit={authorDelete}>
          <input type="password" placeholder="작성 시 PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button type="submit" className="primary danger">확인</button>
        </form>
      )}
    </article>
  );
}

export default function CommunityPage() {
  const [category, setCategory] = useState<PostCategory | null>(null); // null = 전체
  const [page, setPage] = useState(0);
  const [writing, setWriting] = useState(false);
  const [, startTransition] = useTransition();
  const { data, isLoading } = usePosts(category, page);

  const selectCategory = (c: PostCategory | null) => {
    // 목록 전환은 트랜지션으로 — 입력 반응성 유지
    startTransition(() => {
      setCategory(c);
      setPage(0);
    });
  };

  return (
    <section aria-label="시민 소통 게시판">
      <h2 className="tab-title"><MessagesSquare size={20} className="ic accent" aria-hidden="true" />시민 소통</h2>

      <div className="chiprow" role="group" aria-label="카테고리 필터">
        <button className={category === null ? 'on' : ''} aria-pressed={category === null}
                onClick={() => selectCategory(null)}>전체</button>
        {(Object.entries(CATEGORIES) as [PostCategory, (typeof CATEGORIES)[PostCategory]][]).map(([key, cat]) => (
          <button key={key} className={category === key ? 'on' : ''} aria-pressed={category === key}
                  onClick={() => selectCategory(key)}>
            <cat.Icon size={15} aria-hidden="true" />
            {cat.label}
          </button>
        ))}
      </div>

      <button className="primary wide" aria-expanded={writing} aria-controls="post-form-area"
              onClick={() => setWriting(!writing)}>
        {writing ? '닫기' : <><PenLine size={17} aria-hidden="true" /> 글 쓰기</>}
      </button>
      <div id="post-form-area" aria-live="polite">
        {writing && <PostForm category={category} onDone={() => setWriting(false)} />}
      </div>

      {isLoading && <Skeleton lines={3} />}
      {data?.content.length === 0 && (
        <div className="card"><p className="meta">아직 글이 없어요. 첫 글을 남겨보세요!</p></div>
      )}
      {data?.content.map((p) => <PostCard key={p.id} post={p} />)}

      {data && data.totalPages > 1 && (
        <div className="pager">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>← 이전</button>
          <span>{page + 1} / {data.totalPages}</span>
          <button disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>다음 →</button>
        </div>
      )}

      <p className="notice">
        서로를 지켜주는 공간이에요. 개인정보(실명·연락처·얼굴 사진 링크)는 올리지 말아주세요.
      </p>
    </section>
  );
}
