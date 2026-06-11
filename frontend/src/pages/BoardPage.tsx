import { useEffect, useRef, useState } from 'react';
import { Megaphone, Volume2, Square, Maximize } from 'lucide-react';

const COLORS = ['#ff3b30', '#ffd60a', '#34c759', '#0a84ff', '#ffffff', '#ff2d92', '#ff9f0a', '#00e5ff'];
const BGS = ['#000000', '#0a0a2a', '#1a0033', '#062a1e', '#2a0008'];
const EFFECTS = [
  { id: 'scroll', label: '흐르기' }, { id: 'blink', label: '깜빡임' },
  { id: 'pulse', label: '커지기' }, { id: 'static', label: '고정' },
];
const AGES = [
  { id: 'child', label: '어린이' }, { id: 'youth', label: '청년' },
  { id: 'adult', label: '어른' }, { id: 'senior', label: '어르신' },
];
// 음높이를 강하게 둬서 한 가지 목소리만 있는 기기에서도 남/여·연령 차이가 느껴지게.
const VOICE_PRESETS: Record<string, { pitch: number; rate: number }> = {
  'male-child': { pitch: 1.5, rate: 1.05 }, 'female-child': { pitch: 1.9, rate: 1.05 },
  'male-youth': { pitch: 0.78, rate: 1.0 }, 'female-youth': { pitch: 1.45, rate: 1.0 },
  'male-adult': { pitch: 0.6, rate: 0.98 }, 'female-adult': { pitch: 1.3, rate: 0.98 },
  'male-senior': { pitch: 0.55, rate: 0.85 }, 'female-senior': { pitch: 1.08, rate: 0.85 },
};

export default function BoardPage() {
  const [text, setText] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [bg, setBg] = useState(BGS[0]);
  const [effect, setEffect] = useState('static'); // 기본은 또렷이 보이는 고정 (흐르기는 선택)
  const [spaceOut, setSpaceOut] = useState(false); // 전광판 글자 띄우기(구호 느낌) — 시각 전용
  const [chant, setChant] = useState(true); // TTS: 한 글자씩 또박또박 외치기 — 기본 켜짐
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('adult');
  const [voiceURI, setVoiceURI] = useState(''); // '' = 성별 자동추천
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [repeat, setRepeat] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [rot, setRot] = useState<'none' | 'left' | 'right'>('left'); // 전체화면 회전 방향
  const [isFs, setIsFs] = useState(false);
  const [overlay, setOverlay] = useState(false); // Fullscreen API 미지원(iOS Safari) 시 CSS 오버레이 폴백
  const [speed, setSpeed] = useState(1); // 구호 읽는 속도 배율

  const previewRef = useRef<HTMLDivElement>(null);
  const repeatRef = useRef(repeat);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const genRef = useRef(0); // 발화 세대 — 늦게 도착한 onend/워치독이 새 발화를 건드리지 않게
  const ttsOk = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => {
    if (!ttsOk) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
      if (watchdogRef.current) clearInterval(watchdogRef.current);
    };
  }, [ttsOk]);

  const koVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ko'));
  const otherVoices = voices.filter((v) => !v.lang.toLowerCase().startsWith('ko'));

  const display = text.trim() || '여기에 적은 문구가 전광판에 떠요';
  // 전광판 시각 텍스트는 TTS(chant)와 무관 — 별도 '글자 띄우기' 옵션으로만 띄운다
  const shownText = spaceOut ? [...display].filter((c) => c !== ' ').join(' ') : display;

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    if (voiceURI) { const v = voices.find((x) => x.voiceURI === voiceURI); if (v) return v; }
    if (!koVoices.length) return undefined;
    const female = /female|여성|yuna|sora|heami|nara|sun-?hi|kyuri|hyejin|여자/i;
    const male = /male|남성|minsu|injoon|jinho|gyu|siwoo|hoon|남자/i;
    const want = gender === 'female' ? female : male;
    return koVoices.find((v) => want.test(v.name)) ?? koVoices[0];
  };

  const clearWatchdog = () => { if (watchdogRef.current) { clearInterval(watchdogRef.current); watchdogRef.current = null; } };

  // 한 번의 발화가 끝났을 때 — 반복이면 다시, 아니면 멈춤. gen으로 옛 콜백 무시.
  const finish = (gen: number) => {
    if (gen !== genRef.current) return;
    clearWatchdog();
    if (repeatRef.current) speak();
    else setSpeaking(false);
  };

  // Chrome은 큐가 길거나 시간이 길면 마지막 utterance의 onend를 누락해 반복이 멈춘다.
  // 워치독: 발화가 시작됐다가 끝난 걸 직접 감지해(onend 없이도) 마무리한다.
  const startWatchdog = (gen: number) => {
    clearWatchdog();
    let started = false;
    const id = setInterval(() => {
      if (gen !== genRef.current) { clearInterval(id); return; } // 자기 세대만 정리
      const s = window.speechSynthesis;
      if (s.speaking || s.pending) { started = true; return; }
      if (started) finish(gen); // 끝났는데 onend가 안 옴 → 직접 마무리
    }, 1500);
    watchdogRef.current = id;
  };

  const speak = () => {
    if (!ttsOk || !text.trim()) return;
    window.speechSynthesis.cancel();
    const gen = ++genRef.current;
    const preset = VOICE_PRESETS[`${gender}-${age}`] ?? { pitch: 1, rate: 1 };
    const voice = pickVoice();
    const make = (s: string) => {
      const u = new SpeechSynthesisUtterance(s);
      const base = chant ? preset.rate * 0.9 : preset.rate;
      u.lang = 'ko-KR'; u.pitch = preset.pitch; u.rate = Math.min(2, Math.max(0.5, base * speed));
      if (voice) u.voice = voice;
      return u;
    };
    setSpeaking(true);
    if (chant) {
      const chars = [...text.trim()].filter((c) => c.trim()); // 글자만(공백 제외)
      chars.forEach((c, i) => {
        const u = make(c);
        if (i === chars.length - 1) { u.onend = () => finish(gen); u.onerror = () => finish(gen); }
        window.speechSynthesis.speak(u);
      });
    } else {
      const u = make(text.trim());
      u.onend = () => finish(gen); u.onerror = () => finish(gen);
      window.speechSynthesis.speak(u);
    }
    startWatchdog(gen);
  };
  const stop = () => {
    genRef.current++; // 진행 중 발화의 onend·워치독 무효화
    clearWatchdog();
    setRepeat(false); repeatRef.current = false;
    window.speechSynthesis.cancel(); setSpeaking(false);
  };
  // 전체화면 진입 시 가로 방향으로 — 안드로이드는 OS 방향 잠금이 먹고(성공 시 CSS 회전은
  // orientation:portrait 미디어쿼리가 자동 해제), iOS·데스크톱은 실패해 CSS 회전으로 폴백.
  const lockLandscape = () => {
    if (rot === 'none') return;
    const o = window.screen?.orientation as (ScreenOrientation & { lock?: (s: string) => Promise<void> }) | undefined;
    if (!o?.lock) return;
    const want = rot === 'right' ? 'landscape-primary' : 'landscape-secondary';
    o.lock(want).catch(() => o.lock?.('landscape').catch(() => {}));
  };

  const toggleFullscreen = () => {
    const el = previewRef.current;
    if (!el) return;
    if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}); return; }
    if (overlay) { setOverlay(false); return; } // 오버레이 모드면 닫기
    const req = el.requestFullscreen?.();
    if (req && typeof req.then === 'function') {
      req.then(lockLandscape).catch(() => setOverlay(true)); // 실패 시 CSS 오버레이로
    } else {
      // requestFullscreen 미지원(iOS Safari의 div 등) → CSS 고정 오버레이로 대체
      setOverlay(true);
    }
  };

  useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      if (!fs) (window.screen?.orientation as (ScreenOrientation & { unlock?: () => void }) | undefined)?.unlock?.();
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  return (
    <section aria-label="전광판과 소리내기">
      <h2 className="tab-title"><Megaphone size={20} className="ic accent" aria-hidden="true" />전광판 · 소리내기</h2>

      <div className={`board-preview eff-${effect} rot-${rot}${overlay ? ' board-overlay' : ''}`}
           ref={previewRef} style={{ background: bg }} onClick={toggleFullscreen}>
        <div className="board-stage">
          <span className="board-text" style={{ color }}>{shownText}</span>
          {(isFs || overlay) && <span className="board-exit-hint">화면을 누르면 닫혀요</span>}
        </div>
      </div>
      <p className="meta" style={{ textAlign: 'center', margin: '4px 0 10px' }}>
        전광판을 누르면 전체화면 · 다시 누르면 닫힘 — {rot === 'none' ? '폰을 세워서' : '폰을 가로로 돌려'} 보여주세요.
      </p>

      <div className="card post-form">
        <input maxLength={60} placeholder="전광판에 띄울 문구 (예: 부정선거 재선거!)" value={text}
               onChange={(e) => setText(e.target.value)} aria-label="전광판 문구" />
        <span className="field-label">글자색</span>
        <div className="swatches">{COLORS.map((c) => (
          <button key={c} type="button" className={`swatch ${color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={`글자색 ${c}`} />))}</div>
        <span className="field-label">배경</span>
        <div className="swatches">{BGS.map((c) => (
          <button key={c} type="button" className={`swatch ${bg === c ? 'on' : ''}`} style={{ background: c }} onClick={() => setBg(c)} aria-label={`배경 ${c}`} />))}</div>
        <span className="field-label">효과</span>
        <div className="seg">{EFFECTS.map((e) => (
          <button key={e.id} type="button" className={effect === e.id ? 'on' : ''} onClick={() => setEffect(e.id)}>{e.label}</button>))}</div>
        <label className="check" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={spaceOut} onChange={(e) => setSpaceOut(e.target.checked)} /> 글자 띄우기 (부·정·선·거)
        </label>
        <span className="field-label">전체화면 방향</span>
        <div className="seg">
          <button type="button" className={rot === 'left' ? 'on' : ''} onClick={() => setRot('left')}>↺ 가로(왼쪽)</button>
          <button type="button" className={rot === 'right' ? 'on' : ''} onClick={() => setRot('right')}>가로(오른쪽) ↻</button>
          <button type="button" className={rot === 'none' ? 'on' : ''} onClick={() => setRot('none')}>세로</button>
        </div>
        <button type="button" className="primary" style={{ marginTop: 10 }} onClick={toggleFullscreen}><Maximize size={16} aria-hidden="true" /> 전체화면으로 보여주기</button>
      </div>

      <div className="card post-form">
        <h3><Volume2 size={16} className="ic accent" aria-hidden="true" />대신 외쳐주기 (목이 아플 때)</h3>
        {!ttsOk && <p className="form-error">이 브라우저는 음성 읽기를 지원하지 않아요.</p>}

        <label className="check"><input type="checkbox" checked={chant} onChange={(e) => setChant(e.target.checked)} /> <b>한 글자씩 또박또박 (구호)</b> — 부·정·선·거</label>

        <span className="field-label" style={{ marginTop: 8 }}>목소리</span>
        <div className="seg">
          <button type="button" className={gender === 'male' ? 'on' : ''} onClick={() => { setGender('male'); setVoiceURI(''); }}>남성</button>
          <button type="button" className={gender === 'female' ? 'on' : ''} onClick={() => { setGender('female'); setVoiceURI(''); }}>여성</button>
        </div>
        <div className="seg" style={{ marginTop: 6 }}>{AGES.map((a) => (
          <button key={a.id} type="button" className={age === a.id ? 'on' : ''} onClick={() => setAge(a.id)}>{a.label}</button>))}</div>

        {koVoices.length + otherVoices.length > 0 && (
          <>
            <span className="field-label" style={{ marginTop: 8 }}>목소리 직접 고르기 (기기에 설치된 음성)</span>
            <select value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)} aria-label="목소리 선택">
              <option value="">자동 (성별 추천)</option>
              {koVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>🇰🇷 {v.name}</option>)}
              {otherVoices.length > 0 && otherVoices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select>
            <p className="notice" style={{ margin: '4px 0 0' }}>
              한국어 목소리 {koVoices.length}개 감지됨. 남성 목소리가 없으면 휴대폰 <b>설정 → 음성(TTS)</b>에서 한국어 남성 음성을 추가하면 여기 떠요.
            </p>
          </>
        )}

        <label className="check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> 반복해서 외치기
        </label>
        <span className="field-label" style={{ marginTop: 10 }}>
          구호 속도 — {speed < 0.85 ? '느리게' : speed > 1.25 ? '빠르게' : '보통'} ({speed.toFixed(1)}×)
        </span>
        <input className="speed-range" type="range" min={0.6} max={1.8} step={0.1} value={speed}
               onChange={(e) => setSpeed(Number(e.target.value))} aria-label="구호 읽는 속도" />
        <div className="form-row" style={{ marginTop: 10 }}>
          <button type="button" className="primary" disabled={!ttsOk || !text.trim()} onClick={speak}>
            <Volume2 size={16} aria-hidden="true" /> {speaking ? '다시' : '외쳐주기'}
          </button>
          <button type="button" onClick={stop} disabled={!speaking}><Square size={16} aria-hidden="true" /> 멈춤</button>
        </div>
      </div>

      <p className="notice">
        전광판·음성은 모두 이 기기 안에서만 동작해요(서버 전송 없음). 음성은 휴대폰에 설치된 한국어 목소리를 사용하므로,
        기기마다 들리는 목소리가 달라요. 더 다양한 목소리는 휴대폰의 음성(TTS) 설정에서 받을 수 있어요 📢
      </p>
    </section>
  );
}
