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
  const [effect, setEffect] = useState('scroll');
  const [chant, setChant] = useState(true); // 한 글자씩(구호) — 기본 켜짐
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState('adult');
  const [voiceURI, setVoiceURI] = useState(''); // '' = 성별 자동추천
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [repeat, setRepeat] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const previewRef = useRef<HTMLDivElement>(null);
  const repeatRef = useRef(repeat);
  const ttsOk = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => {
    if (!ttsOk) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.cancel(); window.speechSynthesis.onvoiceschanged = null; };
  }, [ttsOk]);

  const koVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('ko'));
  const otherVoices = voices.filter((v) => !v.lang.toLowerCase().startsWith('ko'));

  const display = text.trim() || '여기에 적은 문구가 전광판에 떠요';
  const shownText = chant ? [...display].filter((c) => c !== ' ').join(' ') : display;

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    if (voiceURI) { const v = voices.find((x) => x.voiceURI === voiceURI); if (v) return v; }
    if (!koVoices.length) return undefined;
    const female = /female|여성|yuna|sora|heami|nara|sun-?hi|kyuri|hyejin|여자/i;
    const male = /male|남성|minsu|injoon|jinho|gyu|siwoo|hoon|남자/i;
    const want = gender === 'female' ? female : male;
    return koVoices.find((v) => want.test(v.name)) ?? koVoices[0];
  };

  const speak = () => {
    if (!ttsOk || !text.trim()) return;
    window.speechSynthesis.cancel();
    const preset = VOICE_PRESETS[`${gender}-${age}`] ?? { pitch: 1, rate: 1 };
    const voice = pickVoice();
    const make = (s: string) => {
      const u = new SpeechSynthesisUtterance(s);
      u.lang = 'ko-KR'; u.pitch = preset.pitch; u.rate = chant ? Math.max(0.6, preset.rate * 0.88) : preset.rate;
      if (voice) u.voice = voice;
      return u;
    };
    setSpeaking(true);
    if (chant) {
      const chars = [...text.trim()].filter((c) => c.trim()); // 글자만(공백 제외)
      chars.forEach((c, i) => {
        const u = make(c);
        if (i === chars.length - 1) { u.onend = onDone; u.onerror = () => setSpeaking(false); }
        window.speechSynthesis.speak(u);
      });
    } else {
      const u = make(text.trim());
      u.onend = onDone; u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    }
  };
  const onDone = () => { if (repeatRef.current) speak(); else setSpeaking(false); };
  const stop = () => { setRepeat(false); repeatRef.current = false; window.speechSynthesis.cancel(); setSpeaking(false); };
  const fullscreen = () => { previewRef.current?.requestFullscreen?.().catch(() => {}); };

  return (
    <section aria-label="전광판과 소리내기">
      <h2 className="tab-title"><Megaphone size={20} className="ic accent" aria-hidden="true" />전광판 · 소리내기</h2>

      <div className={`board-preview eff-${effect}`} ref={previewRef} style={{ background: bg }} onClick={fullscreen}>
        <span className="board-text" style={{ color }}>{shownText}</span>
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
        <div className="form-row" style={{ marginTop: 8 }}>
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
