import { useEffect, useRef, useState } from 'react';
import { Music4, Play, Ear, RotateCcw } from 'lucide-react';
import Taegeuk from '../components/Taegeuk';
import Mugunghwa from '../components/Mugunghwa';

/**
 * 애국가 건반 — 음표가 내려와 건반(아랫변)에 닿을 때 누르면 소리가 나는 리듬 게임.
 * 악기 선택(피아노·가야금·색소폰·실로폰), 점수 갱신 시 축하 + 무궁화 꽃 효과.
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

// 애국가 1절 — 계이름은 사용자 계이름표, d=박 길이(악보 점음표 1.5/0.5, 끝음 길게).
const MELODY: { s: string; n: NoteName; d?: number }[] = [
  { s: '동', n: 'G4', d: 1.5 }, { s: '해', n: 'C5', d: 0.5 }, { s: '물', n: 'B4' }, { s: '과', n: 'A4' },
  { s: '백', n: 'C5', d: 1.5 }, { s: '두', n: 'G4', d: 0.5 }, { s: '산', n: 'E5' }, { s: '이', n: 'G4', d: 2 },
  { s: '마', n: 'C5' }, { s: '르', n: 'D5' }, { s: '고', n: 'E5' },
  { s: '닳', n: 'F5' }, { s: '도', n: 'E5' }, { s: '록', n: 'D5', d: 2 },
  { s: '하', n: 'G4', d: 1.5 }, { s: '느', n: 'F5', d: 0.5 }, { s: '님', n: 'E5' }, { s: '이', n: 'D5' },
  { s: '보', n: 'C5', d: 1.5 }, { s: '우', n: 'B4', d: 0.5 }, { s: '하', n: 'A4' }, { s: '사', n: 'G4', d: 2 },
  { s: '우', n: 'E5' }, { s: '리', n: 'G4' }, { s: '나', n: 'C5' }, { s: '라', n: 'D5' },
  { s: '만', n: 'D5' }, { s: '세', n: 'E5' }, { s: '~', n: 'C5', d: 2 },
  { s: '무', n: 'B4', d: 1.5 }, { s: '궁', n: 'C5', d: 0.5 }, { s: '화', n: 'D5' }, { s: '~', n: 'B4' },
  { s: '삼', n: 'E5', d: 1.5 }, { s: '천', n: 'F5', d: 0.5 }, { s: '리', n: 'G4' }, { s: '~', n: 'E5' },
  { s: '화', n: 'D5' }, { s: '려', n: 'C5' }, { s: '강', n: 'B4' }, { s: '산', n: 'C5' }, { s: '~', n: 'D5', d: 2 },
  { s: '대', n: 'G4', d: 1.5 }, { s: '한', n: 'F5', d: 0.5 }, { s: '사', n: 'E5' }, { s: '람', n: 'D5' },
  { s: '대', n: 'C5', d: 1.5 }, { s: '한', n: 'B4', d: 0.5 }, { s: '으', n: 'A4' }, { s: '로', n: 'G4', d: 2 },
  { s: '길', n: 'E5' }, { s: '이', n: 'G4' },
  { s: '보', n: 'C5' }, { s: '전', n: 'D5' }, { s: '하', n: 'D5' }, { s: '세', n: 'E5' }, { s: '~', n: 'C5', d: 3 },
];

interface Instr { label: string; w1: OscillatorType; w2: OscillatorType; ratio2: number; g2: number; atk: number; dec: number; sus: number; vib?: number; plucky?: boolean; }
const INSTRUMENTS: Record<string, Instr> = {
  piano: { label: '피아노', w1: 'triangle', w2: 'sine', ratio2: 2, g2: 0.09, atk: 0.008, dec: 0.34, sus: 0.24 },
  gayageum: { label: '가야금', w1: 'triangle', w2: 'triangle', ratio2: 3, g2: 0.16, atk: 0.004, dec: 1.1, sus: 0, plucky: true },
  sax: { label: '색소폰', w1: 'sawtooth', w2: 'sine', ratio2: 2, g2: 0.12, atk: 0.05, dec: 0.18, sus: 0.3, vib: 5 },
  marimba: { label: '실로폰', w1: 'sine', w2: 'sine', ratio2: 4, g2: 0.5, atk: 0.002, dec: 0.45, sus: 0, plucky: true },
};
const INSTR_KEYS = Object.keys(INSTRUMENTS);

const BEAT_MS = 560;
const FALL_MS = 2000;
const HIT_WINDOW = 230;
const COUNTIN = 1600;
const BEST_KEY = 'anthem-best';

interface Tile { id: number; idx: number; keyIdx: number; hitAt: number; h: number; }
interface Flower { id: number; left: number; dur: number; rot: number; size: number; }

export default function AnthemPage() {
  const [mode, setMode] = useState<'idle' | 'play' | 'listen' | 'done'>('idle');
  const [instr, setInstr] = useState('piano');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [best, setBest] = useState(0);
  const [flash, setFlash] = useState<Record<number, boolean>>({});
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [banner, setBanner] = useState('');

  const acRef = useRef<AudioContext | null>(null);
  const active = useRef<Map<number, { osc: OscillatorNode[]; gains: GainNode[] }>>(new Map());
  const instrRef = useRef(instr);
  const startRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestRef = useRef(0);
  const recordHit = useRef(false);
  const flowerId = useRef(0);
  const hitRef = useRef<Set<number>>(new Set());
  const doneRef = useRef<Set<number>>(new Set());
  const tileEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const fallRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<Tile[]>([]);
  const rafRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { instrRef.current = instr; }, [instr]);
  useEffect(() => {
    const b = Number(localStorage.getItem(BEST_KEY) || 0);
    bestRef.current = b; setBest(b);
  }, []);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
  useEffect(() => () => {
    clearTimers();
    stopLoop();
    // AudioContext는 브라우저당 동시 개수 한도(~6)가 있어 탭을 떠날 때 반드시 닫는다.
    // 안 닫으면 재방문마다 누수돼 결국 "maximum contexts" 예외가 난다.
    acRef.current?.close().catch(() => {});
    acRef.current = null;
  }, []);

  const ac = () => {
    if (!acRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      acRef.current = new Ctx();
    }
    if (acRef.current.state === 'suspended') void acRef.current.resume();
    return acRef.current;
  };

  const noteOn = (keyIdx: number) => {
    const c = ac(); const t = c.currentTime; const f = NOTES[KEYS[keyIdx]];
    const I = INSTRUMENTS[instrRef.current];
    noteOff(keyIdx);
    const o1 = c.createOscillator(); o1.type = I.w1; o1.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = I.w2; o2.frequency.value = f * I.ratio2;
    const g1 = c.createGain(); const g2 = c.createGain();
    const end = t + I.atk + I.dec;
    g1.gain.setValueAtTime(0.0001, t); g1.gain.exponentialRampToValueAtTime(0.42, t + I.atk);
    g1.gain.exponentialRampToValueAtTime(I.plucky ? 0.0008 : Math.max(I.sus, 0.0008), end);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(I.g2, t + I.atk);
    g2.gain.exponentialRampToValueAtTime(I.plucky ? 0.0004 : Math.max(I.sus * 0.3, 0.0004), end);
    o1.connect(g1).connect(c.destination); o2.connect(g2).connect(c.destination);
    const osc: OscillatorNode[] = [o1, o2];
    if (I.vib) {
      const lfo = c.createOscillator(); lfo.frequency.value = I.vib;
      const lg = c.createGain(); lg.gain.value = f * 0.012;
      lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency); lfo.start(t); osc.push(lfo);
    }
    o1.start(t); o2.start(t);
    if (I.plucky) osc.forEach((o) => { try { o.stop(end + 0.12); } catch { /* noop */ } });
    active.current.set(keyIdx, { osc, gains: [g1, g2] });
  };
  const noteOff = (keyIdx: number) => {
    const a = active.current.get(keyIdx); if (!a) return;
    active.current.delete(keyIdx);
    const c = ac(); const t = c.currentTime;
    a.gains.forEach((g) => { try { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); } catch { /* noop */ } });
    a.osc.forEach((o) => { try { o.stop(t + 0.26); } catch { /* noop */ } });
  };

  const addFlowers = (n: number, centerLeft?: number) => {
    const add: Flower[] = [];
    for (let i = 0; i < n; i++) {
      add.push({
        id: flowerId.current++,
        left: centerLeft != null ? Math.max(2, Math.min(94, centerLeft + (Math.random() * 16 - 8))) : Math.random() * 92 + 2,
        dur: 1.6 + Math.random() * 1.2,
        rot: (Math.random() * 2 - 1) * 540,
        size: 22 + Math.random() * 18,
      });
    }
    setFlowers((fs) => [...fs, ...add].slice(-40));
  };
  const showBanner = (text: string) => {
    setBanner(text);
    timers.current.push(setTimeout(() => setBanner((b) => (b === text ? '' : b)), 2600));
  };

  const reset = () => {
    clearTimers(); stopLoop();
    active.current.forEach((_, k) => noteOff(k));
    hitRef.current = new Set(); doneRef.current = new Set(); tileEls.current = new Map();
    scoreRef.current = 0; comboRef.current = 0; recordHit.current = false;
    setTiles([]); tilesRef.current = []; setScore(0); setCombo(0); setHits(0); setFlash({}); setFlowers([]); setBanner('');
  };

  const persistBest = () => {
    if (scoreRef.current > bestRef.current) {
      bestRef.current = scoreRef.current; setBest(scoreRef.current);
      localStorage.setItem(BEST_KEY, String(scoreRef.current));
    }
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
      const y = (H - t.h) + (now - t.hitAt) * pxPerMs;
      el.style.transform = `translateY(${y}px)`;
      if (!hitRef.current.has(t.id) && !doneRef.current.has(t.id) && now > t.hitAt + HIT_WINDOW) {
        doneRef.current.add(t.id); el.classList.add('miss'); comboRef.current = 0; setCombo(0);
      }
      if (y > H + 8) el.style.display = 'none';
    }
    const last = tilesRef.current[tilesRef.current.length - 1];
    if (last && now < last.hitAt + FALL_MS) rafRef.current = requestAnimationFrame(loop);
  };

  const start = () => {
    reset(); ac(); setMode('play');
    startRef.current = performance.now() + COUNTIN;
    const list = buildTiles();
    tilesRef.current = list; setTiles(list);
    rafRef.current = requestAnimationFrame(loop);
    const last = list[list.length - 1];
    timers.current.push(setTimeout(() => { persistBest(); setMode('done'); }, last.hitAt - performance.now() + 1800));
  };

  const listen = () => {
    reset(); ac(); setMode('listen');
    let beat = 0;
    MELODY.forEach((m) => {
      const at = beat * BEAT_MS + 300; const d = m.d ?? 1; beat += d; const ki = KEYS.indexOf(m.n);
      timers.current.push(setTimeout(() => {
        noteOn(ki); setFlash((f) => ({ ...f, [ki]: true }));
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
    let bestTile: Tile | null = null; let bestDiff = HIT_WINDOW;
    for (const t of tilesRef.current) {
      if (t.keyIdx !== keyIdx || hitRef.current.has(t.id) || doneRef.current.has(t.id)) continue;
      const diff = Math.abs(now - t.hitAt);
      if (diff < bestDiff) { bestTile = t; bestDiff = diff; }
    }
    if (bestTile) {
      hitRef.current.add(bestTile.id); doneRef.current.add(bestTile.id);
      tileEls.current.get(bestTile.id)?.classList.add('got');
      comboRef.current += 1; scoreRef.current += 10 + comboRef.current;
      setCombo(comboRef.current); setScore(scoreRef.current); setHits((h) => h + 1);
      addFlowers(1, keyIdx * (100 / KEYS.length) + 100 / KEYS.length / 2); // 점수마다 무궁화 한 송이
      if (comboRef.current > 0 && comboRef.current % 10 === 0) { showBanner(`콤보 ${comboRef.current} 🌸 잘한다!`); addFlowers(5); }
      if (!recordHit.current && bestRef.current > 0 && scoreRef.current > bestRef.current) {
        recordHit.current = true; showBanner('🌸 신기록 돌파! 축하합니다!'); addFlowers(10);
      }
    } else { comboRef.current = 0; setCombo(0); }
  };
  const release = (keyIdx: number) => { noteOff(keyIdx); setFlash((f) => ({ ...f, [keyIdx]: false })); };

  const keyW = 100 / KEYS.length;

  return (
    <section aria-label="애국가 건반 게임">
      <h2 className="tab-title"><Music4 size={20} className="ic accent" aria-hidden="true" />애국가 건반</h2>

      <div className="anthem-instr" role="group" aria-label="악기 선택">
        {INSTR_KEYS.map((k) => (
          <button key={k} className={instr === k ? 'on' : ''} aria-pressed={instr === k} onClick={() => setInstr(k)}>
            {INSTRUMENTS[k].label}
          </button>
        ))}
      </div>

      <div className="anthem-hud">
        <span>점수 <b>{score}</b></span>
        <span>콤보 <b>{combo}</b></span>
        <span>최고 <b>{best}</b></span>
        <span>맞춤 <b>{hits}</b>/{MELODY.length}</span>
      </div>

      <div className="anthem-track">
        {banner && <div className="anthem-banner" role="status">{banner}</div>}
        <div className="anthem-flowers" aria-hidden="true">
          {flowers.map((fl) => (
            <span key={fl.id} className="flower"
                  style={{ left: `${fl.left}%`, width: fl.size, height: fl.size, ['--dur' as string]: `${fl.dur}s`, ['--rot' as string]: `${fl.rot}deg` }}
                  onAnimationEnd={() => setFlowers((fs) => fs.filter((x) => x.id !== fl.id))}>
              <Mugunghwa />
            </span>
          ))}
        </div>
        <div className="anthem-fall" ref={fallRef}>
          <Taegeuk className="taegeuk-bg" />
          {tiles.map((t) => (
            <div key={t.id}
                 ref={(el) => { if (el) tileEls.current.set(t.id, el); else tileEls.current.delete(t.id); }}
                 className="anthem-tile"
                 style={{ left: `${t.keyIdx * keyW}%`, width: `${keyW}%`, height: `${t.h}px`, transform: 'translateY(-9999px)' }}>
              {MELODY[t.idx].s}
            </div>
          ))}
          <div className="anthem-hitline" />
        </div>
        <div className="anthem-keys">
          {KEYS.map((n, i) => (
            <button key={n} className={`anthem-key ${flash[i] ? 'on' : ''}`} style={{ width: `${keyW}%` }}
                    onPointerDown={(e) => { e.preventDefault(); (e.target as HTMLElement).setPointerCapture?.(e.pointerId); press(i); }}
                    onPointerUp={() => release(i)} onPointerCancel={() => release(i)} onPointerLeave={() => release(i)}
                    aria-label={`${SOLFEGE[n]} 건반`}>
              <span>{SOLFEGE[n]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="anthem-controls">
        {mode === 'play'
          ? <button className="primary" onClick={() => { stopLoop(); persistBest(); setMode('done'); }}><RotateCcw size={16} aria-hidden="true" /> 그만</button>
          : <button className="primary" onClick={start}><Play size={16} aria-hidden="true" /> 시작</button>}
        <button onClick={listen} disabled={mode === 'play' || mode === 'listen'}><Ear size={16} aria-hidden="true" /> 들어보기</button>
        {mode === 'done' && <button onClick={start}><RotateCcw size={16} aria-hidden="true" /> 다시</button>}
      </div>

      {mode === 'done' && (
        <div className="card"><p className="meta">끝났어요! 점수 <b>{score}</b> · 최고 <b>{best}</b> · {hits}/{MELODY.length} 맞춤 🎹</p></div>
      )}

      <p className="notice">
        🎵 음표 <b>아랫변이 라인에 닿을 때</b> 그 건반을 누르세요. <b>긴 음표는 길게</b> 누르면 소리가 이어져요(가야금·실로폰은 뜯는 소리라 짧게 울려요).
        악기를 골라 연주하고, 점수를 갱신하면 무궁화 꽃이 펴요 🌸
      </p>
    </section>
  );
}
