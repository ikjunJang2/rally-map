import { useCallback, useEffect, useRef, useState } from 'react';
import { Music4, Play, Ear, RotateCcw } from 'lucide-react';

/**
 * 애국가 건반 — 위에서 음표가 내려와 건반에 닿을 때 누르면 피아노 소리가 나는 리듬 게임.
 * 멜로디는 데이터(MELODY)로 관리 — '들어보기'로 확인하고 틀린 음은 쉽게 교체 가능.
 */

// 게임에 쓰는 음(낮은音→높은音). 계이름 라벨은 SOLFEGE.
const NOTES = { G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25 } as const;
type NoteName = keyof typeof NOTES;
const SOLFEGE: Record<NoteName, string> = { G4: '솔', A4: '라', B4: '시', C5: '도', D5: '레', E5: '미' };
const KEYS = (Object.keys(NOTES) as NoteName[]).sort((a, b) => NOTES[a] - NOTES[b]);

// 애국가 1절 (베타 채보). 도입부 "동해물과 백두산이"는 확정, 이후는 검증 필요.
const MELODY: { s: string; n: NoteName }[] = [
  { s: '동', n: 'G4' }, { s: '해', n: 'G4' }, { s: '물', n: 'A4' }, { s: '과', n: 'G4' },
  { s: '백', n: 'C5' }, { s: '두', n: 'C5' }, { s: '산', n: 'B4' }, { s: '이', n: 'A4' },
  { s: '마', n: 'G4' }, { s: '르', n: 'A4' }, { s: '고', n: 'G4' }, { s: '닳', n: 'E5' }, { s: '도', n: 'D5' }, { s: '록', n: 'C5' },
  { s: '하', n: 'A4' }, { s: '느', n: 'B4' }, { s: '님', n: 'C5' }, { s: '이', n: 'C5' },
  { s: '보', n: 'B4' }, { s: '우', n: 'A4' }, { s: '하', n: 'B4' }, { s: '사', n: 'C5' },
  { s: '우', n: 'D5' }, { s: '리', n: 'C5' }, { s: '나', n: 'B4' }, { s: '라', n: 'A4' }, { s: '만', n: 'G4' }, { s: '세', n: 'G4' },
  { s: '무', n: 'E5' }, { s: '궁', n: 'E5' }, { s: '화', n: 'D5' }, { s: '삼', n: 'C5' }, { s: '천', n: 'D5' }, { s: '리', n: 'E5' },
  { s: '화', n: 'D5' }, { s: '려', n: 'C5' }, { s: '강', n: 'B4' }, { s: '산', n: 'A4' },
  { s: '대', n: 'C5' }, { s: '한', n: 'C5' }, { s: '사', n: 'D5' }, { s: '람', n: 'C5' },
  { s: '대', n: 'B4' }, { s: '한', n: 'A4' }, { s: '으', n: 'B4' }, { s: '로', n: 'C5' },
  { s: '길', n: 'A4' }, { s: '이', n: 'B4' }, { s: '보', n: 'C5' }, { s: '전', n: 'B4' }, { s: '하', n: 'A4' }, { s: '세', n: 'G4' },
];

const STEP_MS = 620;   // 음 간 간격(템포)
const FALL_MS = 2200;  // 음표가 내려오는 시간
const HIT_WINDOW = 230; // 판정 허용 오차(ms)

interface Tile { id: number; idx: number; keyIdx: number; spawn: number; hitAt: number; }

export default function AnthemPage() {
  const [mode, setMode] = useState<'idle' | 'play' | 'listen' | 'done'>('idle');
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [flashKey, setFlashKey] = useState<number | null>(null);

  const acRef = useRef<AudioContext | null>(null);
  const startRef = useRef(0);   // 첫 음표가 건반에 닿는 절대시각(performance.now 기준)
  const renderT0 = useRef(0);    // 게임 시작(렌더) 시각 — 애니메이션 지연 계산 기준
  const hitRef = useRef<Set<number>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);

  const ac = () => {
    if (!acRef.current) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      acRef.current = new Ctx();
    }
    if (acRef.current.state === 'suspended') void acRef.current.resume();
    return acRef.current;
  };

  /** 간단한 피아노 톤 — 삼각파 + 배음, 빠른 어택·감쇠 엔벨로프 */
  const playFreq = useCallback((freq: number) => {
    const c = ac();
    const t = c.currentTime;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    const o2 = c.createOscillator(); const g2 = c.createGain();
    o2.type = 'sine'; o2.frequency.value = freq * 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.1, t + 0.008); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(c.destination); o2.connect(g2).connect(c.destination);
    o.start(t); o2.start(t); o.stop(t + 0.95); o2.stop(t + 0.55);
  }, []);

  const reset = () => {
    clearTimers();
    setTiles([]); setScore(0); setCombo(0); setHits(0); hitRef.current = new Set();
  };

  const start = () => {
    reset();
    ac(); // 사용자 제스처에서 오디오 활성화
    setMode('play');
    const t0 = performance.now();
    renderT0.current = t0;
    startRef.current = t0 + FALL_MS + 400; // 카운트인 — 첫 음표가 위에서부터 내려옴
    const list: Tile[] = MELODY.map((m, idx) => {
      const hitAt = startRef.current + idx * STEP_MS;
      return { id: idx, idx, keyIdx: KEYS.indexOf(m.n), spawn: hitAt - FALL_MS, hitAt };
    });
    setTiles(list);
    // 종료 타이머
    timers.current.push(setTimeout(() => setMode('done'), FALL_MS + 400 + MELODY.length * STEP_MS + 1400));
  };

  /** 들어보기 — 자동 연주(채점 없음), 멜로디 검증용 */
  const listen = () => {
    reset();
    ac();
    setMode('listen');
    MELODY.forEach((m, idx) => {
      timers.current.push(setTimeout(() => {
        playFreq(NOTES[m.n]);
        setFlashKey(KEYS.indexOf(m.n));
        timers.current.push(setTimeout(() => setFlashKey(null), 220));
      }, idx * STEP_MS + 300));
    });
    timers.current.push(setTimeout(() => setMode('idle'), MELODY.length * STEP_MS + 800));
  };

  /** 건반 누름 — 항상 소리 + (게임 중이면) 타이밍 판정 */
  const pressKey = (keyIdx: number) => {
    playFreq(NOTES[KEYS[keyIdx]]);
    setFlashKey(keyIdx);
    setTimeout(() => setFlashKey((k) => (k === keyIdx ? null : k)), 160);
    if (mode !== 'play') return;
    const now = performance.now();
    // 해당 건반 레인에서 판정창 안의, 아직 안 친 음표 중 가장 가까운 것
    let best: Tile | null = null; let bestDiff = HIT_WINDOW;
    for (const t of tiles) {
      if (t.keyIdx !== keyIdx || hitRef.current.has(t.id)) continue;
      const diff = Math.abs(now - t.hitAt);
      if (diff < bestDiff) { best = t; bestDiff = diff; }
    }
    if (best) {
      hitRef.current.add(best.id);
      setTiles((ts) => ts.filter((x) => x.id !== best!.id));
      setHits((h) => h + 1);
      setCombo((c) => { const nc = c + 1; setScore((s) => s + 10 + nc); return nc; });
    } else {
      setCombo(0);
    }
  };

  const onTileEnd = (t: Tile) => {
    setTiles((ts) => ts.filter((x) => x.id !== t.id));
    if (mode === 'play' && !hitRef.current.has(t.id)) setCombo(0); // 놓침
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

      <div className="anthem-track" aria-hidden={mode === 'idle'}>
        <div className="anthem-fall">
          {tiles.map((t) => {
            const offset = t.spawn - renderT0.current;
            return (
              <div
                key={t.id}
                className="anthem-tile"
                style={{
                  left: `${t.keyIdx * keyW}%`,
                  width: `${keyW}%`,
                  animationDelay: `${offset}ms`,
                  animationDuration: `${FALL_MS}ms`,
                }}
                onAnimationEnd={() => onTileEnd(t)}
              >
                {MELODY[t.idx].s}
              </div>
            );
          })}
          <div className="anthem-hitline" />
        </div>
        <div className="anthem-keys" style={{ ['--keyw' as string]: `${keyW}%` }}>
          {KEYS.map((n, i) => (
            <button
              key={n}
              className={`anthem-key ${flashKey === i ? 'on' : ''}`}
              style={{ width: `${keyW}%` }}
              onPointerDown={(e) => { e.preventDefault(); pressKey(i); }}
              aria-label={`${SOLFEGE[n]} 건반`}
            >
              <span>{SOLFEGE[n]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="anthem-controls">
        {mode === 'play'
          ? <button className="primary" onClick={() => setMode('done')}><RotateCcw size={16} aria-hidden="true" /> 그만</button>
          : <button className="primary" onClick={start}><Play size={16} aria-hidden="true" /> 시작</button>}
        <button onClick={listen} disabled={mode === 'play' || mode === 'listen'}>
          <Ear size={16} aria-hidden="true" /> 들어보기
        </button>
        {mode === 'done' && <button onClick={start}><RotateCcw size={16} aria-hidden="true" /> 다시</button>}
      </div>

      {mode === 'done' && (
        <div className="card"><p className="meta">끝났어요! 점수 <b>{score}</b> · {hits}/{MELODY.length} 맞춤. 다시 도전해보세요 🎹</p></div>
      )}

      <p className="notice">
        🎵 음표가 건반에 닿을 때 그 건반을 누르면 피아노 소리가 나요. (건반은 아무 때나 눌러도 소리 나요)
        멜로디는 <b>베타 채보</b>라 — <b>들어보기</b>로 들어보시고 틀린 음이 있으면 가사로 알려주시면 바로 고칠게요.
        잠시 쉬어가며 함께 부르는 애국가 한 소절 🇰🇷
      </p>
    </section>
  );
}
