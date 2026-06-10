import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminPois, useNotices, useStreams, useAdminMutation } from '../hooks/useApi';
import { TYPE_INFO } from '../data/fallbackPois';

function LoginForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card post-form" onSubmit={submit}>
      <h3>🔐 관리자 로그인</h3>
      <input required autoComplete="username" placeholder="아이디"
             value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
      <input required type="password" autoComplete="current-password" placeholder="비밀번호"
             value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
      {error && <p className="form-error">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button>
    </form>
  );
}

const EMPTY_POI = { type: 'TOILET', name: '', lat: '', lng: '', memo: '', active: true };

function PoiManager() {
  const { data: pois = [], isLoading } = useAdminPois();
  const mutate = useAdminMutation(['pois', 'admin-pois']);
  const [editing, setEditing] = useState(null); // null | 'new' | poi.id
  const [form, setForm] = useState(EMPTY_POI);

  const startEdit = (poi) => {
    setEditing(poi?.id ?? 'new');
    setForm(poi ? { ...poi } : EMPTY_POI);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const body = { ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
    if (editing === 'new') {
      await mutate.mutateAsync({ path: '/admin/pois', method: 'POST', body });
    } else {
      await mutate.mutateAsync({ path: `/admin/pois/${editing}`, method: 'PUT', body });
    }
    setEditing(null);
  };

  if (isLoading) return <p className="meta">불러오는 중…</p>;

  return (
    <div>
      <button className="primary wide" onClick={() => startEdit(null)}>＋ 시설 추가</button>
      {pois.map((p) => (
        <div key={p.id} className={`card ${p.active ? '' : 'inactive'}`}>
          <h3>{TYPE_INFO[p.type]?.label ?? p.type} {p.name} {!p.active && <span className="ended">숨김</span>}</h3>
          <p className="meta">{p.lat.toFixed(5)}, {p.lng.toFixed(5)} · {p.memo}</p>
          <p className="meta">
            <button className="linklike" onClick={() => startEdit(p)}>수정</button>
            <button className="linklike" onClick={() =>
              mutate.mutate({ path: `/admin/pois/${p.id}`, method: 'PUT',
                body: { ...p, active: !p.active } })}>
              {p.active ? '숨기기' : '보이기'}
            </button>
            <button className="linklike admin" onClick={() =>
              confirm(`'${p.name}' 삭제할까요?`) &&
              mutate.mutate({ path: `/admin/pois/${p.id}`, method: 'DELETE' })}>
              삭제
            </button>
          </p>
          {editing === p.id && (
            <PoiForm form={form} set={set} submit={submit} busy={mutate.isPending} onCancel={() => setEditing(null)} />
          )}
        </div>
      ))}
      {editing === 'new' && (
        <div className="card">
          <PoiForm form={form} set={set} submit={submit} busy={mutate.isPending} onCancel={() => setEditing(null)} />
        </div>
      )}
    </div>
  );
}

function PoiForm({ form, set, submit, busy, onCancel }) {
  return (
    <form className="post-form" onSubmit={submit}>
      <select value={form.type} onChange={set('type')}>
        {Object.entries(TYPE_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <input required placeholder="이름" value={form.name} onChange={set('name')} />
      <div className="form-row">
        <input required type="number" step="any" placeholder="위도" value={form.lat} onChange={set('lat')} />
        <input required type="number" step="any" placeholder="경도" value={form.lng} onChange={set('lng')} />
      </div>
      <input placeholder="메모" value={form.memo ?? ''} onChange={set('memo')} />
      <div className="form-row">
        <button type="submit" className="primary" disabled={busy}>저장</button>
        <button type="button" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}

function NoticeManager() {
  const { data: notices = [] } = useNotices();
  const mutate = useAdminMutation(['notices']);
  const [form, setForm] = useState({ title: '', body: '', pinned: false });

  const submit = async (e) => {
    e.preventDefault();
    await mutate.mutateAsync({ path: '/admin/notices', method: 'POST', body: form });
    setForm({ title: '', body: '', pinned: false });
  };

  return (
    <div>
      <form className="card post-form" onSubmit={submit}>
        <input required placeholder="공지 제목" value={form.title}
               onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <textarea rows={3} placeholder="내용" value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
        <label className="check">
          <input type="checkbox" checked={form.pinned}
                 onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
          📌 상단 고정
        </label>
        <button type="submit" className="primary" disabled={mutate.isPending}>공지 등록</button>
      </form>
      {notices.map((n) => (
        <div key={n.id} className="card">
          <h3>{n.pinned ? '📌 ' : ''}{n.title}</h3>
          <p className="meta">{n.body}</p>
          <button className="linklike admin" onClick={() =>
            mutate.mutate({ path: `/admin/notices/${n.id}`, method: 'DELETE' })}>삭제</button>
        </div>
      ))}
    </div>
  );
}

function StreamManager() {
  const { data: streams = [] } = useStreams();
  const mutate = useAdminMutation(['streams']);
  const [form, setForm] = useState({ title: '', url: '', channel: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    await mutate.mutateAsync({ path: '/admin/streams', method: 'POST', body: form });
    setForm({ title: '', url: '', channel: '' });
  };

  return (
    <div>
      <form className="card post-form" onSubmit={submit}>
        <input required placeholder="방송 제목" value={form.title} onChange={set('title')} />
        <input required type="url" placeholder="https://youtube.com/…" value={form.url} onChange={set('url')} />
        <input placeholder="채널명 (선택)" value={form.channel} onChange={set('channel')} />
        {mutate.isError && <p className="form-error">{mutate.error.message}</p>}
        <button type="submit" className="primary" disabled={mutate.isPending}>라이브 등록</button>
      </form>
      {streams.map((s) => (
        <div key={s.id} className="card">
          <h3>{s.live ? <span className="live-dot">● LIVE</span> : <span className="ended">종료</span>} {s.title}</h3>
          <p className="meta">{s.channel} · {s.url}</p>
          <p className="meta">
            {s.live && (
              <button className="linklike" onClick={() =>
                mutate.mutate({ path: `/admin/streams/${s.id}/ended`, method: 'PATCH' })}>종료 표시</button>
            )}
            <button className="linklike admin" onClick={() =>
              mutate.mutate({ path: `/admin/streams/${s.id}`, method: 'DELETE' })}>삭제</button>
          </p>
        </div>
      ))}
    </div>
  );
}

const SECTIONS = [
  { id: 'poi', label: '🗺️ 시설', el: <PoiManager /> },
  { id: 'notice', label: '📢 공지', el: <NoticeManager /> },
  { id: 'stream', label: '📺 라이브', el: <StreamManager /> },
];

export default function AdminPage() {
  const { isAdmin, logout } = useAuth();
  const [section, setSection] = useState('poi');

  if (!isAdmin) {
    return (
      <section>
        <h2 className="tab-title">⚙️ 관리자</h2>
        <LoginForm />
      </section>
    );
  }

  return (
    <section>
      <h2 className="tab-title">
        ⚙️ 관리자
        <button className="linklike" onClick={logout} style={{ float: 'right' }}>로그아웃</button>
      </h2>
      <div className="chiprow">
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'on' : ''} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {SECTIONS.find((s) => s.id === section)?.el}
      <p className="notice">
        커뮤니티 글의 관리자 삭제는 💬 소통 탭에서 글마다 표시되는 [관리자 삭제] 버튼으로 할 수 있어요.
      </p>
    </section>
  );
}
