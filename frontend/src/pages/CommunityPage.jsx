import { useState } from 'react';
import { usePosts, useCreatePost, useDeletePostByAuthor, useAdminMutation } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export const CATEGORIES = {
  FREE: '💬 자유',
  INFO: '📢 정보공유',
  SHARE: '🎁 물품나눔',
  QUESTION: '❓ 질문',
  CHEER: '📣 응원',
};

function timeAgo(iso) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '방금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  return `${Math.floor(sec / 86400)}일 전`;
}

function PostForm({ category, onDone }) {
  const create = useCreatePost();
  const [form, setForm] = useState({ nickname: '', pin: '', title: '', body: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    await create.mutateAsync({ ...form, category: category || 'FREE' });
    setForm({ nickname: '', pin: '', title: '', body: '' });
    onDone();
  };

  return (
    <form className="card post-form" onSubmit={submit}>
      <div className="form-row">
        <input required maxLength={20} placeholder="닉네임" value={form.nickname} onChange={set('nickname')} />
        <input required minLength={4} maxLength={20} type="password" placeholder="삭제용 PIN (4자+)"
               value={form.pin} onChange={set('pin')} />
      </div>
      <input required maxLength={100} placeholder="제목" value={form.title} onChange={set('title')} />
      <textarea maxLength={2000} rows={4} placeholder="내용 (선택)" value={form.body} onChange={set('body')} />
      {create.isError && <p className="form-error">{create.error.message}</p>}
      <button type="submit" className="primary" disabled={create.isPending}>
        {create.isPending ? '등록 중…' : '글 등록'}
      </button>
      <p className="notice" style={{ margin: '8px 0 0' }}>
        익명 게시판이에요. PIN은 글 삭제할 때만 쓰이고 암호화 저장됩니다.
      </p>
    </form>
  );
}

function PostCard({ post }) {
  const { isAdmin } = useAuth();
  const delByAuthor = useDeletePostByAuthor();
  const adminDel = useAdminMutation(['posts']);
  const [deleting, setDeleting] = useState(false);
  const [pin, setPin] = useState('');

  const authorDelete = async (e) => {
    e.preventDefault();
    try {
      await delByAuthor.mutateAsync({ id: post.id, pin });
    } catch (err) {
      alert(err.status === 403 ? 'PIN이 일치하지 않아요' : err.message);
    }
  };

  return (
    <div className="card">
      <h3>
        <span className="badge">{CATEGORIES[post.category] ?? post.category}</span>
        {post.title}
      </h3>
      {post.body && <p className="meta post-body">{post.body}</p>}
      <p className="meta post-foot">
        {post.nickname} · {timeAgo(post.createdAt)}
        <button className="linklike" onClick={() => setDeleting(!deleting)}>삭제</button>
        {isAdmin && (
          <button
            className="linklike admin"
            onClick={() => adminDel.mutate({ path: `/admin/posts/${post.id}`, method: 'DELETE' })}
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
    </div>
  );
}

export default function CommunityPage() {
  const [category, setCategory] = useState(null); // null = 전체
  const [page, setPage] = useState(0);
  const [writing, setWriting] = useState(false);
  const { data, isLoading } = usePosts(category, page);

  const selectCategory = (c) => {
    setCategory(c);
    setPage(0);
  };

  return (
    <section>
      <h2 className="tab-title">💬 시민 소통</h2>

      <div className="chiprow">
        <button className={category === null ? 'on' : ''} onClick={() => selectCategory(null)}>전체</button>
        {Object.entries(CATEGORIES).map(([key, label]) => (
          <button key={key} className={category === key ? 'on' : ''} onClick={() => selectCategory(key)}>
            {label}
          </button>
        ))}
      </div>

      <button className="primary wide" onClick={() => setWriting(!writing)}>
        {writing ? '닫기' : '✏️ 글 쓰기'}
      </button>
      {writing && <PostForm category={category} onDone={() => setWriting(false)} />}

      {isLoading && <div className="card"><p className="meta">불러오는 중…</p></div>}
      {data?.content?.length === 0 && (
        <div className="card"><p className="meta">아직 글이 없어요. 첫 글을 남겨보세요!</p></div>
      )}
      {data?.content?.map((p) => <PostCard key={p.id} post={p} />)}

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
