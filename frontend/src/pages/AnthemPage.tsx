import { useEffect, useRef, useState } from 'react';
import { Music4, Play, Ear, RotateCcw } from 'lucide-react';
import Taegeuk from '../components/Taegeuk';

/**
 * 애국가 건반 — 위에서 음표가 내려와 건반(아랫변)에 닿을 때 누르면 피아노 소리가 나는 리듬 게임.
 * 음마다 길이(d, 박)가 있어 긴 음표는 타일이 길고, 누르는 동안 소리가 이어진다(길게 누르기).
 */

// 건반은 도부터 — 도보다 아래의 솔·라·시를 위해 한 옥타브 낮은 도레미파를 더해 11건반.
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
} as const;
type NoteName = keyof typeof NOTES;
const SOLFEGE: Record<NoteName, string> = {
  C4: '도', D4: '레', E4: '미', F4: '파', G4: '솔', A4: '라', B4: '시', C5: '도', D5: '레', E5: '미', F5: '파',
};
const KEYS = (Object.keys(NOTES) as NoteName[]).sort((a, b) => NOTES[a] - NOTES[b]);

// 애국가 1절 — 계이름은 사용자 계이름표, d=박 길이(악보 리듬: 동~해 같은 점음표 1.5/0.5, 끝음 길게).
const MELODY: { s: string; n: NoteName; d?: number }[] = [
  // 동해물과 백두산이 마르고 닳도록
  { s: '동', n: 'G4', d: 1.5 }, { s: '해', n: 'C5', d: 0.5 }, { s: '물', n: 'B4' }, { s: '과', n: 'A4' },
  { s: '백', n: 'C5', d: 1.5 }, { s: '두', n: 'G4', d: 0.5 }, { s: '산', n: 'E5' }, { s: '이', n: 'G4', d: 2 },
  { s: '마', n: 'C5' }, { s: '르', n: 'D5' }, { s: '고', n: 'E5' },
  { s: '닳', n: 'F5' }, { s: '도', n: 'E5' }, { s: '록', n: 'D5', d: 2 },
  // 하느님이 보우하사 우리나라 만세
  { s: '하', n: 'G4', d: 1.5 }, { s: '느', n: 'F5', d: 0.5 }, { s: '님', n: 'E5' }, { s: '이', n: 'D5' },
  { s: '보', n: 'C5', d: 1.5 }, { s: '우', n: 'B4', d: 0.5 }, { s: '하', n: 'A4' }, { s: '사', n: 'G4', d: 2 },
  { s: '우', n: 'E5' }, { s: '리', n: 'G4' }, { s: '나', n: 'C5' }, { s: '라', n: 'D5' },
  { s: '만', n: 'D5' }, { s: '세', n: 'E5' }, { s: '~', n: 'C5', d: 2 },
  // 무궁화 삼천리 화려강산
  { s: '무', n: 'B4', d: 1.5 }, { s: '궁', n: 'C5', d: 0.5 }, { s: '화', n: 'D5' }, { s: '~', n: 'B4' },
  { s: '삼', n: 'E5', d: 1.5 }, { s: '천', n: 'F5', d: 0.5 }, { s: '리', n: 'G4' }, { s: '~', n: 'E5' },
  { s: '화', n: 'D5' }, { s: '려', n: 'C5' }, { s: '강', n: 'B4' }, { s: '산', n: 'C5' }, { s: '~', n: 'D5', d: 2 },
  // 대한사람 대한으로 길이 보전하세
  { s: '대', n: 'G4', d: 1.5 }, { s: '한', n: 'F5', d: 0.5 }, { s: '사', n: 'E5' }, { s: '람', n: 'D5' },
  { s: '대', n: 'C5', d: 1.5 }, { s: '한', n: 'B4', d: 0.5 }, { s: '으', n: 'A4' }, { s: '로', n: 'G4', d: 2 },
  { s: '길', n: 'E5' }, { s: '이', n: 'G4' },
  { s: '보', n: 'C5' }, { s: '전', n: 'D5' }, { s: '하', n: 'D5' }, { s: '세', n: 'E5' }, { s: '~', n: 'C5', d: 3 },
];

const BEAT_MS = 560;    // 한 박
const FALL_MS = 2000;   // 음표가 위에서 라인까지 내려오는 시간
const HIT_WINDOW = 220; // 판정 허용 오차(ms)
const COUNTIN = 1600;

interface Tile { id: number; idx: number; keyIdx: number; hitAt: number; h: number; }

export default function AnthemPage() {
  const [mode, setMode] = useState<'idle' | 'play' | 'listen' | 'done'>('idle');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [flash, setFlash] = useState<Record<number, boolean>>({});

  const acRef = useRef<AudioContext | null>(null);
  const active = useRef<Map<number, { osc: OscillatorNode[]; gains: GainNode[] }>>(new Map());
  const startRef = useRef(0);
  const hitRef = useRef<Set<number>>(new Set());
  const doneRef = useRef<Set<number>>(new Set());
  const tileEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const fallRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<Tile[]>([]);
  const rafRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
  useEffect(() => () => { clearTimers(); stopLoop(); }, []);

  const ac = () => {
    if (!acRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      acRef.current = new Ctx();
    }
    if (acRef.current.state === 'suspended') void acRef.current.resume();
    return acRef.current;
  };

  /** 누르는 동안 지속되는 피아노 음 (삼각파+배음). noteOff로 자연 감쇠. */
  const noteOn = (keyIdx: number) => {
    const c = ac(); const t = c.currentTime; const freq = NOTES[KEYS[keyIdx]];
    noteOff(keyIdx);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = freq;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * 2;
    const g = c.createGain(); const g2 = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42, t + 0.008); g.gain.exponentialRampToValueAtTime(0.26, t + 0.3);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.09, t + 0.008); g2.gain.exponentialRampToValueAtTime(0.04, t + 0.3);
    o.connect(g).connect(c.destination); o2.connect(g2).connect(c.destination);
    o.start(t); o2.start(t);
    active.current.set(keyIdx, { osc: [o, o2], gains: [g, g2] });
  };
  const noteOff = (keyIdx: number) => {
    const a = active.current.get(keyIdx); if (!a) return;
    active.current.delete(keyIdx);
    const c = ac(); const t = c.currentTime;
    a.gains.forEach((g) => { try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); } catch { /* noop */ } });
    a.osc.forEach((o) => { try { o.stop(t + 0.32); } catch { /* noop */ } });
  };

  const reset = () => {
    clearTimers(); stopLoop();
    active.current.forEach((_, k) => noteOff(k));
    hitRef.current = new Set(); doneRef.current = new Set(); tileEls.current = new Map();
    setTiles([]); tilesRef.current = []; setScore(0); setCombo(0); setHits(0); setFlash({});
  };

  const buildTiles = (): Tile[] => {
    const H = fallRef.current?.clientHeight ?? 320;
    const pxPerMs = H / FALL_MS;
    let beat = 0;
    return MELODY.map((m, idx) => {
      const hitAt = startRef.current + beat * BEAT_MS;
      const d = m.d ?? 1;
      beat += d;
      const h = Math.max(34, d * BEAT_MS * pxPerMs - 12);
      return { id: idx, idx, keyIdx: KEYS.indexOf(m.n), hitAt, h };
    });
  };

  const loop = () => {
    const now = performance.now();
    const H = fallRef.current?.clientHeight ?? 320;
    const pxPerMs = H / FALL_MS;
    for (const t of tilesRef.current) {
      const el = tileEls.current.get(t.id);
      if (!el) continue;
      // 아랫변이 라인(H)에 닿는 시각 = hitAt → translateY = (H - h) + (now-hitAt)*속도
      const y = (H - t.h) + (now - t.hitAt) * pxPerMs;
      el.style.transform = `translateY(${y}px)`;
      if (!hitRef.current.has(t.id) && !doneRef.current.has(t.id) && now > t.hitAt + HIT_WINDOW) {
        doneRef.current.add(t.id); // 놓침
        el.classList.add('miss');
        setCombo(0);
      }
      if (y > H + 8) el.style.display = 'none'; // 라인 통과 후 숨김
    }
    const last = tilesRef.current[tilesRef.current.length - 1];
    if (last && now < last.hitAt + FALL_MS) rafRef.current = requestAnimationFrame(loop);
  };

  const start = () => {
    reset();
    ac();
    setMode('play');
    startRef.current = performance.now() + COUNTIN;
    const list = buildTiles();
    tilesRef.current = list;
    setTiles(list);
    rafRef.current = requestAnimationFrame(loop);
    const last = list[list.length - 1];
    timers.current.push(setTimeout(() => setMode('done'), last.hitAt - performance.now() + 1800));
  };

  /** 들어보기 — 자동 연주(채점 없음), 멜로디·박자 확인용 */
  const listen = () => {
    reset();
    ac();
    setMode('listen');
    let beat = 0;
    MELODY.forEach((m) => {
      const at = beat * BEAT_MS + 300;
      const d = m.d ?? 1;
      beat += d;
      const ki = KEYS.indexOf(m.n);
      timers.current.push(setTimeout(() => {
        noteOn(ki);
        setFlash((f) => ({ ...f, [ki]: true }));
        timers.current.push(setTimeout(() => { noteOff(ki); setFlash((f) => ({ ...f, [ki]: false })); }, d * BEAT_MS * 0.92));
      }, at));
    });
    timers.current.push(setTimeout(() => setMode('idle'), beat * BEAT_MS + 900));
  };

  const press = (keyIdx: number) => {
    noteOn(keyIdx);
    setFlash((f) => ({ ...f, [keyIdx]: true }));
    if (mode !== 'play') return;
    const now = performance.now();
    let best: Tile | null = null; let bestDiff = HIT_WINDOW;
    for (const t of tilesRef.current) {
      if (t.keyIdx !== keyIdx || hitRef.current.has(t.id) || doneRef.current.has(t.id)) continue;
      const diff = Math.abs(now - t.hitAt);
      if (diff < bestDiff) { best = t; bestDiff = diff; }
    }
    if (best) {
      hitRef.current.add(best.id); doneRef.current.add(best.id);
      tileEls.current.get(best.id)?.classList.add('got');
      setHits((h) => h + 1);
      setCombo((c) => { const nc = c + 1; setScore((s) => s + 10 + nc); return nc; });
    } else {
      setCombo(0);
    }
  };
  const release = (keyIdx: number) => {
    noteOff(keyIdx);
    setFlash((f) => ({ ...f, [keyIdx]: false }));
  };

  const keyW = 100 / KEYS.length;

  return (
    <section aria-label="애국가 건반 게임">
      <h2 className="tab-title"><Music4 size={20} className="ic accent" aria-hidden="true" />애국가 건반</h2>

      <div className="anthem-hud">
        <span>점수 <b>{score}</b></span>
        <span>콤보 <b>{combo}</b></span>
        <span>맞춤 <b>{hits}</b>/{MELODY.length}</span>
      </div>

      <div className="anthem-track">
        <div className="anthem-fall" ref={fallRef}>
          <Taegeuk className="taegeuk-bg" />
          {tiles.map((t) => (
            <div
              key={t.id}
              ref={(el) => { if (el) tileEls.current.set(t.id, el); else tileEls.current.delete(t.id); }}
              className="anthem-tile"
              style={{ left: `${t.keyIdx * keyW}%`, width: `${keyW}%`, height: `${t.h}px`, transform: 'translateY(-9999px)' }}
            >
              {MELODY[t.idx].s}
            </div>
          ))}
          <div className="anthem-hitline" />
        </div>
        <div className="anthem-keys">
          {KEYS.map((n, i) => (
            <button
              key={n}
              className={`anthem-key ${flash[i] ? 'on' : ''}`}
              style={{ width: `${keyW}%` }}
              onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); press(i); }}
              onPointerUp={() => release(i)}
              onPointerCancel={() => release(i)}
              onPointerLeave={() => release(i)}
              aria-label={`${SOLFEGE[n]} 건반`}
            >
              <span>{SOLFEGE[n]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="anthem-controls">
        {mode === 'play'
          ? <button className="primary" onClick={() => { stopLoop(); setMode('done'); }}><RotateCcw size={16} aria-hidden="true" /> 그만</button>
          : <button className="primary" onClick={start}><Play size={16} aria-hidden="true" /> 시작</button>}
        <button onClick={listen} disabled={mode === 'play' || mode === 'listen'}>
          <Ear size={16} aria-hidden="true" /> 들어보기
        </button>
        {mode === 'done' && <button onClick={start}><RotateCcw size={16} aria-hidden="true" /> 다시</button>}
      </div>

      {mode === 'done' && (
        <div className="card"><p className="meta">끝났어요! 점수 <b>{score}</b> · {hits}/{MELODY.length} 맞춤 🎹</p></div>
      )}

      <p className="notice">
        🎵 음표 <b>아랫변이 라인에 닿을 때</b> 그 건반을 누르세요. <b>긴 음표는 길게</b> 누르면 소리가 이어져요.
        멜로디는 주신 1절 계이름표 그대로예요. <b>들어보기</b>로 박자까지 확인하시고, 더 다듬을 곳 있으면 알려주세요 🇰🇷
      </p>
    </section>
  );
}
