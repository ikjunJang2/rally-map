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

interface Instr {
  label: string;
  pluck?: boolean;           // 가야금: Karplus-Strong 발현 모델
  partials?: number[];       // 배음 진폭 (index 1 = 기음) — 커스텀 파형용
  atk: number; dec: number; sus: number;
  filtFrom?: number; filtTo?: number; // 로우패스 스윕 (밝다 → 부드럽게)
  detune?: number;           // 센트 단위 2보이스 디튠 (두께감)
  vib?: number;              // 비브라토 Hz
  damp?: number; fb?: number; // pluck: 감쇠 필터/피드백
}
const INSTRUMENTS: Record<string, Instr> = {
  piano:    { label: '피아노', partials: [0, 1, .55, .4, .26, .16, .1, .07, .05, .034, .022, .014], atk: .006, dec: 1.8, sus: 0, filtFrom: 6500, filtTo: 1050, detune: 4 },
  gayageum: { label: '가야금', pluck: true, atk: .002, dec: 1.6, sus: 0, damp: 3.4, fb: .993 },
  sax:      { label: '색소폰', partials: [0, 1, .7, .5, .4, .3, .22, .16, .12, .09, .06], atk: .05, dec: .2, sus: .32, filtFrom: 2800, filtTo: 1500, vib: 5 },
  marimba:  { label: '실로폰', partials: [0, 1, 0, 0, .55, 0, 0, .18], atk: .002, dec: .5, sus: 0, filtFrom: 7000, filtTo: 2400 },
};

type Voice = { release: (t: number) => void };

function makeWave(c: AudioContext, partials: number[]): PeriodicWave {
  const real = new Float32Array(partials.length);
  const imag = Float32Array.from(partials);
  return c.createPeriodicWave(real, imag, { disableNormalization: false });
}

/** 배음 파형 + 시간에 따라 닫히는 로우패스 + 디튠 보이스 (피아노·색소폰·실로폰) */
function voiceWave(c: AudioContext, f: number, I: Instr, t: number, out: AudioNode): Voice {
  const wave = makeWave(c, I.partials ?? [0, 1]);
  const end = t + I.atk + I.dec;
  const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.Q.value = 0.7;
  filt.frequency.setValueAtTime(I.filtFrom ?? 5000, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(I.filtTo ?? 1200, 200), end);
  const amp = c.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(0.5, t + I.atk);
  amp.gain.exponentialRampToValueAtTime(Math.max(I.sus, 0.0006), end);
  filt.connect(amp); amp.connect(out);
  const oscs: OscillatorNode[] = [];
  for (const d of I.detune ? [-I.detune, I.detune] : [0]) {
    const o = c.createOscillator(); o.setPeriodicWave(wave); o.frequency.value = f; o.detune.value = d;
    o.connect(filt); o.start(t); oscs.push(o);
  }
  if (I.vib) {
    const lfo = c.createOscillator(); lfo.frequency.value = I.vib;
    const lg = c.createGain(); lg.gain.value = f * 0.007;
    lfo.connect(lg); for (const o of oscs) lg.connect(o.frequency); lfo.start(t); oscs.push(lfo);
  }
  if (I.sus <= 0.01) for (const o of oscs) { try { o.stop(end + 0.15); } catch { /* noop */ } }
  return {
    release(rt) {
      try {
        amp.gain.cancelScheduledValues(rt);
        amp.gain.setValueAtTime(Math.max(amp.gain.value, 0.0001), rt);
        amp.gain.exponentialRampToValueAtTime(0.0001, rt + 0.16);
      } catch { /* noop */ }
      for (const o of oscs) { try { o.stop(rt + 0.2); } catch { /* noop */ } }
    },
  };
}

/** Karplus-Strong 발현 현(撥絃) 모델 — 가야금 같은 뜯는 줄 소리 */
function voicePluck(c: AudioContext, f: number, I: Instr, t: number, out: AudioNode): Voice {
  const burst = 0.025;
  const buf = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * burst)), c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const src = c.createBufferSource(); src.buffer = buf;
  const exciteLP = c.createBiquadFilter(); exciteLP.type = 'lowpass'; exciteLP.frequency.value = Math.min(f * 7, 9000);
  const delay = c.createDelay(1); delay.delayTime.value = 1 / f;
  const damp = c.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = Math.min(f * (I.damp ?? 3), 10000);
  const fb = c.createGain(); fb.gain.value = I.fb ?? 0.99;
  const amp = c.createGain(); amp.gain.value = 0.7;
  src.connect(exciteLP); exciteLP.connect(delay);
  delay.connect(damp); damp.connect(fb); fb.connect(delay); // 피드백 루프 = 줄
  delay.connect(amp); amp.connect(out);
  src.start(t); src.stop(t + burst);
  try { fb.gain.setTargetAtTime(0, t + I.dec * 1.6, 0.2); } catch { /* noop */ } // 자연 감쇠 후 루프 정리
  return {
    release(rt) {
      try { fb.gain.setTargetAtTime(0, rt, 0.05); amp.gain.setTargetAtTime(0.0001, rt, 0.06); } catch { /* noop */ }
    },
  };
}
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
  const active = useRef<Map<number, Voice>>(new Map());
  const masterRef = useRef<AudioNode | null>(null);
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
      masterRef.current = null; // 새 컨텍스트 → 마스터 체인 재생성
    }
    if (acRef.current.state === 'suspended') void acRef.current.resume();
    return acRef.current;
  };

  /** 모든 음이 거치는 마스터 — 컴프레서로 뭉개짐·클리핑 방지(고급스러운 일관된 음량) */
  const master = (c: AudioContext): AudioNode => {
    if (!masterRef.current) {
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 22; comp.ratio.value = 3.2;
      comp.attack.value = 0.003; comp.release.value = 0.25;
      const g = c.createGain(); g.gain.value = 0.85;
      comp.connect(g); g.connect(c.destination);
      masterRef.current = comp;
    }
    return masterRef.current;
  };

  const noteOn = (keyIdx: number) => {
    const c = ac(); const t = c.currentTime; const f = NOTES[KEYS[keyIdx]];
    const I = INSTRUMENTS[instrRef.current];
    noteOff(keyIdx);
    const out = master(c);
    const v = I.pluck ? voicePluck(c, f, I, t, out) : voiceWave(c, f, I, t, out);
    active.current.set(keyIdx, v);
  };
  const noteOff = (keyIdx: number) => {
    const a = active.current.get(keyIdx); if (!a) return;
    active.current.delete(keyIdx);
    a.release(ac().currentTime);
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
