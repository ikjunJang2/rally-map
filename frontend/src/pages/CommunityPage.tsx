import { useState, useTransition, type FormEvent } from 'react';
import {
  MessagesSquare, MessageCircle, Megaphone, Gift, HelpCircle, Heart, PenLine,
  Flame, Flag, ShieldAlert, type LucideIcon,
} from 'lucide-react';
import {
  usePosts, usePopularPosts, useCreatePost, useDeletePostByAuthor, useAdminMutation,
  useToggleLike, useComments, useCreateComment, useDeleteCommentByAuthor, useCreateReport,
} from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import { ApiError } from '../api/client';
import { RETENTION_DAYS } from '../config';
import type { Post, PostCategory, ReportReason, ReportTargetType } from '../types';

export const REPORT_REASONS: Record<ReportReason, string> = {
  DEFAMATION: '명예훼손·사생활 침해',
  ABUSE: '욕설·혐오',
  SPAM: '스팸·광고',
  ELECTION: '선거법 위반',
  PRIVACY: '개인정보 노출',
  OTHER: '기타',
};

export const CATEGORIES: Record<PostCategory, { label: string; Icon: LucideIcon }> = {
  FREE: { label: '자유', Icon: MessageCircle },
  INFO: { label: '정보공유', Icon: Megaphone },
  SHARE: { label: '물품나눔', Icon: Gift },
  QUESTION: { label: '질문', Icon: HelpCircle },
  CHEER: { label: '응원', Icon: Heart },
};

const LIMITS = { title: 80, body: 1000, comment: 300 } as const;

function timeAgo(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** 신고 폼 — 글·댓글 공용 (망법 44조의2 신고 창구) */
function ReportForm({ targetType, targetId, onDone }: {
  targetType: ReportTargetType;
  targetId: number;
  onDone: () => void;
}) {
  const report = useCreateReport();
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason>('DEFAMATION');
  const [detail, setDetail] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await report.mutateAsync({ targetType, targetId, reason, detail: detail || undefined });
      toast('success', r.message);
      onDone();
    } catch (err) {
      toast('error', errorMessage(err, '신고 접수에 실패했어요'));
    }
  };

  return (
    <form className="report-form" onSubmit={submit}>
      <select value={reason} onChange={(e) => setReason(e.target.value as ReportReason)} aria-label="신고 사유">
        {(Object.entries(REPORT_REASONS) as [ReportReason, string][]).map(([k, label]) => (
          <option key={k} value={k}>{label}</option>
        ))}
      </select>
      <div className="form-row">
        <input maxLength={500} placeholder="상세 내용 (선택)" value={detail}
               onChange={(e) => setDetail(e.target.value)} />
        <button type="submit" className="primary danger" disabled={report.isPending}>신고</button>
      </div>
    </form>
  );
}

// ── 글쓰기 폼 ───────────────────────────────────────────

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
      toast('error', errorMessage(err, '등록에 실패했어요'));
    }
  };

  return (
    <form className="card post-form" onSubmit={submit}>
      <div className="form-row">
        <input required autoFocus minLength={2} maxLength={12} placeholder="닉네임 (2~12자)"
               aria-label="닉네임" value={form.nickname} onChange={set('nickname')} />
        <input required minLength={4} maxLength={20} type="password" placeholder="삭제용 PIN (4자+)"
               aria-label="삭제용 PIN, 4자 이상" value={form.pin} onChange={set('pin')} />
      </div>
      <input required maxLength={LIMITS.title} placeholder="제목" aria-label="제목"
             value={form.title} onChange={set('title')} />
      <textarea maxLength={LIMITS.body} rows={4} placeholder="내용 (선택)" aria-label="내용 (선택)"
                value={form.body} onChange={set('body')} />
      <p className="char-count">{form.body.length}/{LIMITS.body}</p>
      <button type="submit" className="primary" disabled={create.isPending}>
        {create.isPending ? '등록 중…' : '글 등록'}
      </button>
      <p className="notice" style={{ margin: '8px 0 0' }}>
        익명 게시판이에요. PIN은 삭제할 때만 쓰이고 암호화 저장됩니다.
        욕설·스팸은 자동 차단되며, 글은 1분에 1건씩 쓸 수 있어요.
      </p>
    </form>
  );
}

// ── 댓글 ───────────────────────────────────────────────

function CommentSection({ postId }: { postId: number }) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { data: comments = [], isLoading } = useComments(postId, true);
  const create = useCreateComment(postId);
  const delByAuthor = useDeleteCommentByAuthor(postId);
  const adminDel = useAdminMutation(['comments', 'posts']);
  const [form, setForm] = useState({ nickname: '', pin: '', body: '' });
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [delPin, setDelPin] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync(form);
      setForm({ nickname: '', pin: '', body: '' });
      toast('success', '댓글이 달렸어요');
    } catch (err) {
      toast('error', errorMessage(err, '댓글 등록에 실패했어요'));
    }
  };

  const authorDelete = async (e: FormEvent, id: number) => {
    e.preventDefault();
    try {
      await delByAuthor.mutateAsync({ id, pin: delPin });
      setDeletingId(null);
      setDelPin('');
      toast('success', '댓글을 삭제했어요');
    } catch (err) {
      toast('error', err instanceof ApiError && err.status === 403
        ? 'PIN이 일치하지 않아요' : '삭제에 실패했어요');
    }
  };

  return (
    <div className="comment-section">
      {isLoading && <p className="meta">댓글 불러오는 중…</p>}
      {comments.map((c) => (
        <div key={c.id} className="comment">
          <p className="comment-body">{c.body}</p>
          <p className="meta comment-foot">
            {c.nickname} · {timeAgo(c.createdAt)}
            <button className="linklike" onClick={() => setReportingId(reportingId === c.id ? null : c.id)}>신고</button>
            <button className="linklike" onClick={() => setDeletingId(deletingId === c.id ? null : c.id)}>삭제</button>
            {isAdmin && (
              <button className="linklike admin"
                      onClick={() => adminDel.mutate(
                        { path: `/admin/comments/${c.id}`, method: 'DELETE' },
                        { onSuccess: () => toast('success', '관리자 권한으로 삭제했어요') })}>
                관리자 삭제
              </button>
            )}
          </p>
          {reportingId === c.id && (
            <ReportForm targetType="COMMENT" targetId={c.id} onDone={() => setReportingId(null)} />
          )}
          {deletingId === c.id && (
            <form className="form-row" onSubmit={(e) => authorDelete(e, c.id)}>
              <input type="password" placeholder="작성 시 PIN" value={delPin}
                     onChange={(e) => setDelPin(e.target.value)} />
              <button type="submit" className="primary danger">확인</button>
            </form>
          )}
        </div>
      ))}

      <form className="comment-form" onSubmit={submit}>
        <div className="form-row">
          <input required minLength={2} maxLength={12} placeholder="닉네임"
                 value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} />
          <input required minLength={4} maxLength={20} type="password" placeholder="PIN"
                 value={form.pin} onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))} />
        </div>
        <div className="form-row">
          <input required maxLength={LIMITS.comment} placeholder="댓글 (300자까지)"
                 value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <button type="submit" className="primary" disabled={create.isPending}>등록</button>
        </div>
      </form>
    </div>
  );
}

// ── 글 카드 ─────────────────────────────────────────────

function PostCard({ post, popular = false }: { post: Post; popular?: boolean }) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const delByAuthor = useDeletePostByAuthor();
  const adminDel = useAdminMutation(['posts']);
  const like = useToggleLike();
  const [liked, setLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [pin, setPin] = useState('');

  const cat = CATEGORIES[post.category];

  // 임시조치된 글 — 서버가 내용을 가려서 보냄, 조치 사실만 표시
  if (post.blocked) {
    return (
      <article className="card blocked">
        <h3><ShieldAlert size={16} className="ic" aria-hidden="true" />{post.title}</h3>
        <p className="meta">{post.body}</p>
        {isAdmin && (
          <button className="linklike" onClick={() => adminDel.mutate(
            { path: `/admin/posts/${post.id}/block`, method: 'DELETE' },
            { onSuccess: () => toast('success', '임시조치를 해제했어요') })}>
            임시조치 해제
          </button>
        )}
      </article>
    );
  }

  const toggleLike = async () => {
    try {
      const r = await like.mutateAsync(post.id);
      setLiked(r.liked);
    } catch {
      toast('error', '잠시 후 다시 시도해주세요');
    }
  };

  const authorDelete = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await delByAuthor.mutateAsync({ id: post.id, pin });
      toast('success', '글을 삭제했어요');
    } catch (err) {
      toast('error', err instanceof ApiError && err.status === 403
        ? 'PIN이 일치하지 않아요' : '삭제에 실패했어요');
    }
  };

  return (
    <article className={`card ${popular ? 'popular' : ''}`}>
      <h3>
        {popular && <span className="badge hot"><Flame size={12} aria-hidden="true" /> 인기</span>}
        <span className="badge">
          {cat ? <><cat.Icon size={12} aria-hidden="true" /> {cat.label}</> : post.category}
        </span>
        {post.title}
      </h3>
      {post.body && <p className="meta post-body">{post.body}</p>}
      <p className="meta post-foot">
        {post.nickname} · {timeAgo(post.createdAt)}
        <span className="post-actions">
          <button className={`heart-btn ${liked ? 'on' : ''}`} onClick={toggleLike}
                  aria-label={`하트 ${post.hearts}개${liked ? ', 내가 누름' : ''}`}>
            <Heart size={15} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} /> {post.hearts}
          </button>
          <button className="heart-btn" onClick={() => setShowComments(!showComments)}
                  aria-expanded={showComments} aria-label={`댓글 ${post.comments}개 보기`}>
            <MessageCircle size={15} aria-hidden="true" /> {post.comments}
          </button>
          <button className="linklike" onClick={() => setReporting(!reporting)}
                  aria-expanded={reporting}>
            <Flag size={12} aria-hidden="true" /> 신고
          </button>
          <button className="linklike" onClick={() => setDeleting(!deleting)}>삭제</button>
          {isAdmin && (
            <button className="linklike admin"
                    onClick={() => adminDel.mutate(
                      { path: `/admin/posts/${post.id}`, method: 'DELETE' },
                      { onSuccess: () => toast('success', '관리자 권한으로 삭제했어요') })}>
              관리자 삭제
            </button>
          )}
        </span>
      </p>
      {reporting && (
        <ReportForm targetType="POST" targetId={post.id} onDone={() => setReporting(false)} />
      )}
      {deleting && (
        <form className="form-row" onSubmit={authorDelete}>
          <input type="password" placeholder="작성 시 PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button type="submit" className="primary danger">확인</button>
        </form>
      )}
      {deleting && (
        <p className="notice" style={{ margin: '6px 0 0' }}>
          삭제하면 화면에서 사라지며, 분쟁 대응을 위해 이력이 {RETENTION_DAYS}일 보존 후 완전 파기됩니다.
        </p>
      )}
      {showComments && <CommentSection postId={post.id} />}
    </article>
  );
}

// ── 페이지 ─────────────────────────────────────────────

export default function CommunityPage() {
  const [category, setCategory] = useState<PostCategory | null>(null); // null = 전체
  const [page, setPage] = useState(0);
  const [writing, setWriting] = useState(false);
  const [, startTransition] = useTransition();
  const { data, isLoading } = usePosts(category, page);
  const { data: popular = [] } = usePopularPosts();

  const selectCategory = (c: PostCategory | null) => {
    startTransition(() => {
      setCategory(c);
      setPage(0);
    });
  };

  // 인기글은 전체 탭 첫 페이지에서만, 목록과 중복돼도 따로 노출
  const showPopular = category === null && page === 0 && popular.length > 0;

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

      {showPopular && (
        <>
          <h3 className="sub-title"><Flame size={17} className="ic red" aria-hidden="true" />지금 인기글</h3>
          {popular.map((p) => <PostCard key={`pop-${p.id}`} post={p} popular />)}
          <h3 className="sub-title">최신글</h3>
        </>
      )}

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
        욕설·스팸·도배는 자동으로 차단됩니다.
      </p>
    </section>
  );
}
