import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Settings, Lock, Plus, Pin, MapIcon, Megaphone, Tv, Trash2, Flag, Gift, KeyRound, UserCog } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdminPois, useAdminDeletedPosts, useAdminReports, useAdminShare, useAdminSettings, useNotices, useStreams, useAdminMutation } from '../hooks/useApi';
import { REPORT_REASONS } from './CommunityPage';
import { SHARE_STATUS } from './MapPage';
import { TYPE_INFO, CENTER } from '../data/fallbackPois';
import Skeleton from '../components/Skeleton';
import type { ItemStatus, Poi, PoiType } from '../types';

/** 지도 클릭 → 좌표 콜백. CircleMarker로 선택 위치 표시 (아이콘 에셋 불필요) */
function LocationPicker({ lat, lng, onPick }: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return lat != null && lng != null
    ? <CircleMarker center={[lat, lng]} radius={9}
        pathOptions={{ color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.9, weight: 2 }} />
    : null;
}

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

function PoiForm({ form, set, onPick, submit, busy, onCancel }: {
  form: PoiFormState;
  set: (k: keyof PoiFormState) => (e: { target: { value: string } }) => void;
  onPick: (lat: number, lng: number) => void;
  submit: (e: FormEvent) => void;
  busy: boolean;
  onCancel: () => void;
}) {
  const latNum = parseFloat(form.lat);
  const lngNum = parseFloat(form.lng);
  const valid = !Number.isNaN(latNum) && !Number.isNaN(lngNum);
  const center: [number, number] = valid ? [latNum, lngNum] : CENTER;

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
      {/* 지도 클릭으로 좌표 자동 입력 */}
      <MapContainer center={center} zoom={16} className="pick-map" scrollWheelZoom>
        <TileLayer
          attribution='&copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
        <LocationPicker lat={valid ? latNum : null} lng={valid ? lngNum : null} onPick={onPick} />
      </MapContainer>
      <p className="meta" style={{ margin: '-4px 0 4px' }}>📍 지도를 클릭하면 위도·경도가 자동으로 채워져요.</p>
      <div className="form-row">
        <input required type="number" step="any" placeholder="위도(Y)" value={form.lat} onChange={set('lat')} />
        <input required type="number" step="any" placeholder="경도(X)" value={form.lng} onChange={set('lng')} />
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
  // 지도 클릭 시 위도·경도 자동 입력 (소수점 6자리)
  const pick = (la: number, ln: number) =>
    setForm((f) => ({ ...f, lat: la.toFixed(6), lng: ln.toFixed(6) }));

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
            <PoiForm form={form} set={set} onPick={pick} submit={submit} busy={mutate.isPending} onCancel={() => setEditing(null)} />
          )}
        </div>
      ))}
      {editing === 'new' && (
        <div className="card">
          <PoiForm form={form} set={set} onPick={pick} submit={submit} busy={mutate.isPending} onCancel={() => setEditing(null)} />
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

/** 신고 대기열 — 망법 44조의2 '지체 없이' 처리 의무 이행용 */
function ReportQueue() {
  const { data: reports = [], isLoading } = useAdminReports();
  const toast = useToast();
  const mutate = useAdminMutation(['admin-reports', 'posts', 'comments']);

  if (isLoading) return <Skeleton lines={3} />;
  if (reports.length === 0) {
    return <div className="card"><p className="meta">대기 중인 신고가 없어요.</p></div>;
  }

  const resolve = (id: number) =>
    mutate.mutate({ path: `/admin/reports/${id}/resolve`, method: 'PATCH' },
      { onSuccess: () => toast('success', '처리 완료로 표시했어요') });

  return (
    <div>
      <p className="notice" style={{ marginTop: 0 }}>
        권리침해 신고는 법적으로 '지체 없이' 처리해야 해요. 판단이 어려우면
        [임시조치]로 30일간 가린 뒤 검토하세요.
      </p>
      {reports.map((r) => (
        <div key={r.id} className="card">
          <h3>
            <span className="badge hot">{REPORT_REASONS[r.reason] ?? r.reason}</span>
            {r.targetType === 'POST' ? '글' : '댓글'} #{r.targetId}
            {r.targetBlocked && <span className="ended">임시조치 중</span>}
            {r.targetDeleted && <span className="ended">삭제됨</span>}
          </h3>
          {r.targetTitle && <p className="meta"><b>{r.targetTitle}</b></p>}
          {r.targetBody && <p className="meta post-body">{r.targetBody}</p>}
          {r.detail && <p className="meta">신고 내용: {r.detail}</p>}
          <p className="meta">
            접수 {new Date(r.createdAt).toLocaleString('ko-KR')}
            <span className="post-actions">
              {r.targetType === 'POST' && !r.targetBlocked && !r.targetDeleted && (
                <button className="linklike" onClick={() =>
                  mutate.mutate({ path: `/admin/posts/${r.targetId}/block`, method: 'POST' },
                    { onSuccess: () => toast('success', '30일 임시조치했어요') })}>
                  임시조치
                </button>
              )}
              {!r.targetDeleted && (
                <button className="linklike admin" onClick={() =>
                  mutate.mutate({
                    path: r.targetType === 'POST'
                      ? `/admin/posts/${r.targetId}` : `/admin/comments/${r.targetId}`,
                    method: 'DELETE',
                  }, { onSuccess: () => toast('success', '삭제했어요') })}>
                  삭제
                </button>
              )}
              <button className="linklike" onClick={() => resolve(r.id)}>처리 완료</button>
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}

function DeletedHistory() {
  const { data: deleted = [], isLoading } = useAdminDeletedPosts();

  if (isLoading) return <Skeleton lines={3} />;
  if (deleted.length === 0) {
    return <div className="card"><p className="meta">삭제된 글이 없어요.</p></div>;
  }

  return (
    <div>
      <p className="notice" style={{ marginTop: 0 }}>
        삭제된 글도 DB에 이력으로 영구 보존됩니다 — 분쟁·신고 대응 근거 자료.
      </p>
      {deleted.map((p) => (
        <div key={p.id} className="card inactive">
          <h3>
            <span className={`badge ${p.deletedBy === 'ADMIN' ? 'hot' : ''}`}>
              {p.deletedBy === 'ADMIN' ? '관리자 삭제' : '작성자 삭제'}
            </span>
            {p.title}
          </h3>
          {p.body && <p className="meta post-body">{p.body}</p>}
          <p className="meta">
            {p.nickname} · 작성 {new Date(p.createdAt).toLocaleString('ko-KR')}
            {p.deletedAt && <> · 삭제 {new Date(p.deletedAt).toLocaleString('ko-KR')}</>}
          </p>
        </div>
      ))}
    </div>
  );
}

function ShareManager() {
  const { data: pois = [] } = useAdminPois();
  const { data: items = [], isLoading } = useAdminShare();
  const toast = useToast();
  const mutate = useAdminMutation(['share', 'admin-share']);
  const [poiId, setPoiId] = useState<number | ''>('');
  const [name, setName] = useState('');

  if (isLoading) return <Skeleton lines={3} />;

  const poiLabel = (id: number) => {
    const p = pois.find((x) => x.id === id);
    return p ? `${TYPE_INFO[p.type]?.label ?? p.type} ${p.name}` : `#${id}`;
  };

  const groups = new Map<number, typeof items>();
  for (const it of items) {
    if (!groups.has(it.poiId)) groups.set(it.poiId, []);
    groups.get(it.poiId)!.push(it);
  }

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (poiId === '' || !name.trim()) return;
    mutate.mutate(
      { path: '/admin/share', method: 'POST', body: { poiId, name: name.trim() } },
      { onSuccess: () => { setName(''); toast('success', '품목을 추가했어요'); } });
  };

  return (
    <div>
      <form className="card post-form" onSubmit={add}>
        <label className="field-label">
          나눔처
          <select value={poiId} onChange={(e) => setPoiId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">나눔처 선택…</option>
            {pois.map((p) => (
              <option key={p.id} value={p.id}>{TYPE_INFO[p.type]?.label ?? p.type} {p.name}</option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <input maxLength={40} placeholder="품목명 (예: 생수, 핫팩)" value={name}
                 onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="primary" disabled={poiId === '' || !name.trim()}>추가</button>
        </div>
        <p className="notice" style={{ margin: '4px 0 0' }}>
          나눔처가 없으면 먼저 🗺️ 시설 탭에서 나눔 위치(POI)를 추가하세요.
        </p>
      </form>

      {items.length === 0 && (
        <div className="card"><p className="meta">등록된 나눔 품목이 없어요.</p></div>
      )}
      {[...groups.entries()].map(([pid, list]) => (
        <div key={pid} className="card">
          <h3><Gift size={15} className="ic accent" aria-hidden="true" />{poiLabel(pid)}</h3>
          {list.map((it) => (
            <div key={it.id} className="share-admin-row">
              <span className="share-admin-name">{it.name}</span>
              <select value={it.status} onChange={(e) =>
                mutate.mutate(
                  { path: `/admin/share/${it.id}`, method: 'PATCH', body: { status: e.target.value } },
                  { onSuccess: () => toast('success', '상태를 바꿨어요') })}>
                {(Object.entries(SHARE_STATUS) as [ItemStatus, { label: string }][]).map(([k, v]) =>
                  <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button className="linklike admin" onClick={() =>
                mutate.mutate({ path: `/admin/share/${it.id}`, method: 'DELETE' },
                  { onSuccess: () => toast('success', '삭제했어요') })}>삭제</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 외부 연동 키 등록 — 저장하면 서버 재배포 없이 즉시 적용 */
function SettingsManager() {
  const { data: settings = [], isLoading } = useAdminSettings();
  const toast = useToast();
  const mutate = useAdminMutation(['admin-settings']);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const LINKS: Record<string, { url: string; label: string }> = {
    'law.oc': { url: 'https://open.law.go.kr', label: 'open.law.go.kr' },
    'youtube.api-key': { url: 'https://console.cloud.google.com/apis/credentials', label: 'console.cloud.google.com' },
    'its.api-key': { url: 'https://www.its.go.kr/opendata/opendataList', label: 'its.go.kr 오픈데이터' },
  };

  if (isLoading) return <Skeleton lines={3} />;

  const valueOf = (key: string, fallback: string) => drafts[key] ?? fallback;
  const save = (key: string, value: string) =>
    mutate.mutate(
      { path: '/admin/settings', method: 'PUT', body: { key, value: value.trim() } },
      { onSuccess: () => {
          setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
          toast('success', value.trim() ? '저장했어요. 바로 적용됩니다' : '키를 삭제했어요');
        } });

  return (
    <div>
      <p className="notice" style={{ marginTop: 0 }}>
        외부 서비스 연동 키를 여기서 등록하면 서버 재배포 없이 바로 적용돼요.
      </p>
      {settings.map((s) => (
        <div key={s.key} className="card post-form">
          <h3>
            <KeyRound size={15} className="ic accent" aria-hidden="true" />{s.label}
            {s.set ? <span className="badge hot">등록됨</span> : <span className="ended">미등록</span>}
          </h3>
          <p className="meta">{s.help}</p>
          <div className="form-row">
            <input placeholder={s.secret && s.set ? '등록됨 — 바꾸려면 새 키 입력' : '키 입력'}
                   type={s.secret ? 'password' : 'text'} autoComplete="off"
                   value={valueOf(s.key, s.value)}
                   onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))} />
            <button type="button" className="primary"
                    disabled={mutate.isPending || (s.secret && !(drafts[s.key] ?? '').trim())}
                    onClick={() => save(s.key, valueOf(s.key, s.value))}>저장</button>
          </div>
          {LINKS[s.key] && (
            <p className="notice" style={{ margin: '4px 0 0' }}>
              <a href={LINKS[s.key].url} target="_blank" rel="noreferrer">{LINKS[s.key].label}</a>
              {' '}에서 발급할 수 있어요.
            </p>
          )}
          {s.set && (
            <button className="linklike admin" style={{ marginTop: 6 }}
                    onClick={() => { if (confirm('이 키를 삭제할까요?')) save(s.key, ''); }}>
              키 삭제
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** 관리자 비밀번호 변경 — 현재 비번 + 새 비번 확인 후 교체, 성공 시 재로그인 */
function AccountManager() {
  const toast = useToast();
  const { logout } = useAuth();
  const mutate = useAdminMutation([]);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const set = (k: keyof typeof form) =>
    (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const tooShort = form.next.length > 0 && form.next.length < 8;
  const mismatch = form.confirm.length > 0 && form.next !== form.confirm;
  const canSubmit = !!form.current && form.next.length >= 8 && form.next === form.confirm;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    mutate.mutate(
      { path: '/admin/account/password', method: 'POST', body: { current: form.current, next: form.next } },
      {
        onSuccess: () => { toast('success', '비밀번호를 바꿨어요. 새 비밀번호로 다시 로그인해주세요'); logout(); },
        onError: (err) => toast('error', err instanceof Error ? err.message : '변경에 실패했어요'),
      });
  };

  return (
    <form className="card post-form" onSubmit={submit}>
      <h3><Lock size={16} className="ic accent" aria-hidden="true" />비밀번호 변경</h3>
      <input required type="password" autoComplete="current-password" placeholder="현재 비밀번호"
             value={form.current} onChange={set('current')} />
      <input required type="password" autoComplete="new-password" placeholder="새 비밀번호 (8자 이상)"
             value={form.next} onChange={set('next')} />
      <input required type="password" autoComplete="new-password" placeholder="새 비밀번호 확인"
             value={form.confirm} onChange={set('confirm')} />
      {tooShort && <p className="form-error">새 비밀번호는 8자 이상이어야 해요</p>}
      {mismatch && <p className="form-error">새 비밀번호가 서로 달라요</p>}
      <button type="submit" className="primary" disabled={!canSubmit || mutate.isPending}>
        비밀번호 바꾸기
      </button>
      <p className="notice" style={{ margin: '8px 0 0' }}>
        바꾸면 바로 적용돼요. 이 기기 외 다른 로그인 세션은 최대 2시간 뒤 자동 만료됩니다.
      </p>
    </form>
  );
}

const SECTIONS: { id: string; label: string; icon: ReactNode; el: ReactNode }[] = [
  { id: 'poi', label: '시설', icon: <MapIcon size={15} aria-hidden="true" />, el: <PoiManager /> },
  { id: 'notice', label: '공지', icon: <Megaphone size={15} aria-hidden="true" />, el: <NoticeManager /> },
  { id: 'stream', label: '라이브', icon: <Tv size={15} aria-hidden="true" />, el: <StreamManager /> },
  { id: 'share', label: '나눔', icon: <Gift size={15} aria-hidden="true" />, el: <ShareManager /> },
  { id: 'reports', label: '신고', icon: <Flag size={15} aria-hidden="true" />, el: <ReportQueue /> },
  { id: 'deleted', label: '삭제 이력', icon: <Trash2 size={15} aria-hidden="true" />, el: <DeletedHistory /> },
  { id: 'settings', label: '연동키', icon: <KeyRound size={15} aria-hidden="true" />, el: <SettingsManager /> },
  { id: 'account', label: '계정', icon: <UserCog size={15} aria-hidden="true" />, el: <AccountManager /> },
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
