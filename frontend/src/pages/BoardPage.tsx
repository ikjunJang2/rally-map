import { useEffect, useRef, useState } from 'react';
import { Megaphone, Volume2, Square, Maximize } from 'lucide-react';

const COLORS = ['#ff3b30', '#ffd60a', '#34c759', '#0a84ff', '#ffffff', '#ff2d92', '#ff9f0a', '#00e5ff'];
const BGS = ['#000000', '#0a0a2a', '#1a0033', '#062a1e', '#2a0008'];
const EFFECTS = [
  { id: 'scroll', label: '흐르기' },
  { id: 'blink', label: '깜빡임' },
  { id: 'pulse', label: '커지기' },
  { id: 'static', label: '고정' },
];
const AGES = [
  { id: 'child', label: '어린이' }, { id: 'youth', label: '청년' },
  { id: 'adult', label: '어른' }, { id: 'senior', label: '어르신' },
];
const VOICE_PRESETS: Record<string, { pitch: number; rate: number }> = {
  'male-child': { pitch: 1.7, rate: 1.08 }, 'female-child': { pitch: 1.95, rate: 1.08 },
  'male-youth': { pitch: 0.95, rate: 1.04 }, 'female-youth': { pitch: 1.45, rate: 1.04 },
  'male-adult': { pitch: 0.8, rate: 1.0 }, 'female-adult': { pitch: 1.3, rate: 1.0 },
  'male-senior': { pitch: 0.72, rate: 0.9 }, 'female-senior': { pitch: 1.1, rate: 0.92 },
};

export default function BoardPage() {
  const [text, setText] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [bg, setBg] = useState(BGS[0]);
  const [effect, setEffect] = useState('scroll');
  const [gender, setGender] = useState<'male' | 'female'>('female');
  const [age, setAge] = useState('adult');
  const [repeat, setRepeat] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const repeatRef = useRef(repeat);
  const ttsOk = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => {
    if (!ttsOk) return;
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.cancel(); window.speechSynthesis.onvoiceschanged = null; };
  }, [ttsOk]);

  const display = text.trim() || '여기에 적은 문구가 전광판에 떠요';

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    const ko = voicesRef.current.filter((v) => v.lang.toLowerCase().startsWith('ko'));
    if (!ko.length) return undefined;
    const female = /female|여성|yuna|sora|heami|nara|sun-?hi/i;
    const male = /male|남성|minsu|injoon|jinho|gyu/i;
    const want = gender === 'female' ? female : male;
    return ko.find((v) => want.test(v.name)) ?? ko[0];
  };

  const speak = () => {
    if (!ttsOk || !text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'ko-KR';
    const p = VOICE_PRESETS[`${gender}-${age}`] ?? { pitch: 1, rate: 1 };
    u.pitch = p.pitch; u.rate = p.rate;
    const v = pickVoice(); if (v) u.voice = v;
    u.onend = () => { if (repeatRef.current) speak(); else setSpeaking(false); };
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };
  const stop = () => { setRepeat(false); repeatRef.current = false; window.speechSynthesis.cancel(); setSpeaking(false); };
  const fullscreen = () => { previewRef.current?.requestFullscreen?.().catch(() => {}); };

  return (
    <section aria-label="전광판과 소리내기">
      <h2 className="tab-title"><Megaphone size={20} className="ic accent" aria-hidden="true" />전광판 · 소리내기</h2>

      <div className={`board-preview eff-${effect}`} ref={previewRef} style={{ background: bg }} onClick={fullscreen}>
        <span className="board-text" style={{ color }}>{display}</span>
      </div>
      <p className="meta" style={{ textAlign: 'center', margin: '4px 0 10px' }}>전광판을 누르면 전체화면 — 폰을 들어 보여주세요.</p>

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
        <button type="button" className="primary" style={{ marginTop: 10 }} onClick={fullscreen}><Maximize size={16} aria-hidden="true" /> 전체화면으로 보여주기</button>
      </div>

      <div className="card post-form">
        <h3><Volume2 size={16} className="ic accent" aria-hidden="true" />대신 읽어주기 (목이 아플 때)</h3>
        {!ttsOk && <p className="form-error">이 브라우저는 음성 읽기를 지원하지 않아요.</p>}
        <span className="field-label">목소리</span>
        <div className="seg">
          <button type="button" className={gender === 'male' ? 'on' : ''} onClick={() => setGender('male')}>남성</button>
          <button type="button" className={gender === 'female' ? 'on' : ''} onClick={() => setGender('female')}>여성</button>
        </div>
        <div className="seg" style={{ marginTop: 6 }}>{AGES.map((a) => (
          <button key={a.id} type="button" className={age === a.id ? 'on' : ''} onClick={() => setAge(a.id)}>{a.label}</button>))}</div>
        <label className="check" style={{ marginTop: 10 }}>
          <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> 반복해서 읽기
        </label>
        <div className="form-row" style={{ marginTop: 8 }}>
          <button type="button" className="primary" disabled={!ttsOk || !text.trim()} onClick={speak}>
            <Volume2 size={16} aria-hidden="true" /> {speaking ? '다시 읽기' : '읽어주기'}
          </button>
          <button type="button" onClick={stop} disabled={!speaking}><Square size={16} aria-hidden="true" /> 멈춤</button>
        </div>
      </div>

      <p className="notice">
        전광판·음성은 모두 이 기기 안에서만 동작해요(서버 전송 없음). 현장에서 폰을 들어 구호를 보여주거나,
        목이 쉬었을 때 대신 외쳐줍니다 📢 (음성은 기기에 설치된 한국어 목소리를 사용해요.)
      </p>
    </section>
  );
}
