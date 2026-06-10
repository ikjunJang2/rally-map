import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Settings, Lock, Plus, Pin, MapIcon, Megaphone, Tv } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAdminPois, useNotices, useStreams, useAdminMutation } from '../hooks/useApi';
import { TYPE_INFO } from '../data/fallbackPois';
import Skeleton from '../components/Skeleton';
import type { Poi, PoiType } from '../types';

function LoginForm() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했어요');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card post-form" onSubmit={submit}>
      <h3><Lock size={16} className="ic accent" aria-hidden="true" />관리자 로그인</h3>
      <input required autoComplete="username" placeholder="아이디" aria-label="관리자 아이디"
             value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
      <input required type="password" autoComplete="current-password" placeholder="비밀번호" aria-label="관리자 비밀번호"
             value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="primary" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button>
    </form>
  );
}

interface PoiFormState {
  type: PoiType;
  name: string;
  lat: string;
  lng: string;
  memo: string;
  active: boolean;
}

const EMPTY_POI: PoiFormState = { type: 'TOILET', name: '', lat: '', lng: '', memo: '', active: true };

function PoiForm({ form, set, submit, busy, onCancel }: {
  form: PoiFormState;
  set: (k: keyof PoiFormState) => (e: { target: { value: string } }) => void;
  submit: (e: FormEvent) => void;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <form className="post-form" onSubmit={submit}>
      <label className="field-label">
        시설 종류
        <select value={form.type} onChange={set('type')}>
          {(Object.entries(TYPE_INFO) as [PoiType, { label: string }][]).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>)}
        </select>
      </label>
      <input required placeholder="이름" value={form.name} onChange={set('name')} />
      <div className="form-row">
        <input required type="number" step="any" placeholder="위도" value={form.lat} onChange={set('lat')} />
        <input required type="number" step="any" placeholder="경도" value={form.lng} onChange={set('lng')} />
      </div>
      <input placeholder="메모" value={form.memo} onChange={set('memo')} />
      <div className="form-row">
        <button type="submit" className="primary" disabled={busy}>저장</button>
        <button type="button" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
}

function PoiManager() {
  const { data: pois = [], isLoading } = useAdminPois();
  const toast = useToast();
  const mutate = useAdminMutation(['pois', 'admin-pois']);
  const [editing, setEditing] = useState<'new' | number | null>(null);
  const [form, setForm] = useState<PoiFormState>(EMPTY_POI);

  const startEdit = (poi: Poi | null) => {
    setEditing(poi?.id ?? 'new');
    setForm(poi
      ? { type: poi.type, name: poi.name, lat: String(poi.lat), lng: String(poi.lng), memo: poi.memo ?? '', active: poi.active }
      : EMPTY_POI);
  };
  const set = (k: keyof PoiFormState) =>
    (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = { ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
    try {
      if (editing === 'new') {
        await mutate.mutateAsync({ path: '/admin/pois', method: 'POST', body });
      } else {
        await mutate.mutateAsync({ path: `/admin/pois/${editing}`, method: 'PUT', body });
      }
      toast('success', '저장했어요');
      setEditing(null);
    } catch {
      toast('error', '저장에 실패했어요');
    }
  };

  if (isLoading) return <Skeleton lines={4} />;

  return (
    <div>
      <button className="primary wide" onClick={() => startEdit(null)}>
        <Plus size={17} aria-hidden="true" /> 시설 추가
      </button>
      {pois.map((p) => (
        <div key={p.id} className={`card ${p.active ? '' : 'inactive'}`}>
          <h3>{TYPE_INFO[p.type]?.label ?? p.type} {p.name} {!p.active && <span className="ended">숨김</span>}</h3>
          <p className="meta">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}{p.memo ? ` · ${p.memo}` : ''}</p>
          <p className="meta">
            <button className="linklike" onClick={() => startEdit(p)}>수정</button>
            <button className="linklike" onClick={() =>
              mutate.mutate({ path: `/admin/pois/${p.id}`, method: 'PUT',
                body: { ...p, active: !p.active } },
                { onSuccess: () => toast('success', p.active ? '지도에서 숨겼어요' : '지도에 표시해요') })}>
              {p.active ? '숨기기' : '보이기'}
            </button>
            <button className="linklike admin" onClick={() => {
              if (confirm(`'${p.name}' 삭제할까요?`)) {
                mutate.mutate({ path: `/admin/pois/${p.id}`, method: 'DELETE' },
                  { onSuccess: () => toast('success', '삭제했어요') });
              }
            }}>
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

function NoticeManager() {
  const { data: notices = [] } = useNotices();
  const toast = useToast();
  const mutate = useAdminMutation(['notices']);
  const [form, setForm] = useState({ title: '', body: '', pinned: false });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await mutate.mutateAsync({ path: '/admin/notices', method: 'POST', body: form });
      setForm({ title: '', body: '', pinned: false });
      toast('success', '공지를 올렸어요');
    } catch {
      toast('error', '등록에 실패했어요');
    }
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
          <Pin size={14} aria-hidden="true" /> 상단 고정
        </label>
        <button type="submit" className="primary" disabled={mutate.isPending}>공지 등록</button>
      </form>
      {notices.map((n) => (
        <div key={n.id} className="card">
          <h3>{n.pinned && <Pin size={14} className="ic accent" aria-label="고정됨" />}{n.title}</h3>
          <p className="meta">{n.body}</p>
          <button className="linklike admin" onClick={() =>
            mutate.mutate({ path: `/admin/notices/${n.id}`, method: 'DELETE' },
              { onSuccess: () => toast('success', '공지를 내렸어요') })}>삭제</button>
        </div>
      ))}
    </div>
  );
}

function StreamManager() {
  const { data: streams = [] } = useStreams();
  const toast = useToast();
  const mutate = useAdminMutation(['streams']);
  const [form, setForm] = useState({ title: '', url: '', channel: '' });
  const set = (k: keyof typeof form) =>
    (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await mutate.mutateAsync({ path: '/admin/streams', method: 'POST', body: form });
      setForm({ title: '', url: '', channel: '' });
      toast('success', '라이브를 등록했어요');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : '등록에 실패했어요');
    }
  };

  return (
    <div>
      <form className="card post-form" onSubmit={submit}>
        <input required placeholder="방송 제목" value={form.title} onChange={set('title')} />
        <input required type="url" placeholder="https://youtube.com/…" value={form.url} onChange={set('url')} />
        <input placeholder="채널명 (선택)" value={form.channel} onChange={set('channel')} />
        <button type="submit" className="primary" disabled={mutate.isPending}>라이브 등록</button>
      </form>
      {streams.map((s) => (
        <div key={s.id} className="card">
          <h3>{s.live ? <span className="live-dot">LIVE</span> : <span className="ended">종료</span>} {s.title}</h3>
          <p className="meta">{s.channel ? `${s.channel} · ` : ''}{s.url}</p>
          <p className="meta">
            {s.live && (
              <button className="linklike" onClick={() =>
                mutate.mutate({ path: `/admin/streams/${s.id}/ended`, method: 'PATCH' },
                  { onSuccess: () => toast('success', '종료로 표시했어요') })}>종료 표시</button>
            )}
            <button className="linklike admin" onClick={() =>
              mutate.mutate({ path: `/admin/streams/${s.id}`, method: 'DELETE' },
                { onSuccess: () => toast('success', '삭제했어요') })}>삭제</button>
          </p>
        </div>
      ))}
    </div>
  );
}

const SECTIONS: { id: string; label: string; icon: ReactNode; el: ReactNode }[] = [
  { id: 'poi', label: '시설', icon: <MapIcon size={15} aria-hidden="true" />, el: <PoiManager /> },
  { id: 'notice', label: '공지', icon: <Megaphone size={15} aria-hidden="true" />, el: <NoticeManager /> },
  { id: 'stream', label: '라이브', icon: <Tv size={15} aria-hidden="true" />, el: <StreamManager /> },
];

export default function AdminPage() {
  const { isAdmin, logout } = useAuth();
  const [section, setSection] = useState('poi');
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const mounted = useRef(false);

  // 섹션 전환 시 키보드 포커스를 새 영역으로 이동 (첫 렌더 제외)
  useEffect(() => {
    if (mounted.current) sectionRef.current?.focus();
    else mounted.current = true;
  }, [section]);

  if (!isAdmin) {
    return (
      <section aria-label="관리자 로그인">
        <h2 className="tab-title"><Settings size={20} className="ic accent" aria-hidden="true" />관리자</h2>
        <LoginForm />
      </section>
    );
  }

  return (
    <section aria-label="관리자 콘솔">
      <h2 className="tab-title">
        <Settings size={20} className="ic accent" aria-hidden="true" />관리자
        <button className="linklike" onClick={logout} style={{ marginLeft: 'auto' }}>로그아웃</button>
      </h2>
      <div className="chiprow" role="group" aria-label="관리 영역">
        {SECTIONS.map((s) => (
          <button key={s.id} className={section === s.id ? 'on' : ''} aria-pressed={section === s.id}
                  onClick={() => setSection(s.id)}>
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>
      <div ref={sectionRef} tabIndex={-1} aria-label={SECTIONS.find((s) => s.id === section)?.label}>
        {SECTIONS.find((s) => s.id === section)?.el}
      </div>
      <p className="notice">
        커뮤니티 글의 관리자 삭제는 💬 소통 탭에서 글마다 표시되는 [관리자 삭제] 버튼으로 할 수 있어요.
      </p>
    </section>
  );
}
