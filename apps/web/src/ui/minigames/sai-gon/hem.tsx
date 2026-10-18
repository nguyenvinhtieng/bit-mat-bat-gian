/** Đầu hẻm + hẻm chính: chạy cuốc theo khách chỉ đường, nghe rao canh chừng. The server judges every answer. */
import { useEffect, useRef, useState } from 'react';
import type { SgTurn, TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useShake, type Submit } from '../common/kit';
import { useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

/** Reveal `text` one character at a time; returns how many characters are visible. */
function useTypewriter(text: string, msPerChar = 26) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 1)), msPerChar);
    return () => clearInterval(id);
  }, [text, msPerChar]);
  return n;
}

/** Read a line aloud when the device has a Vietnamese voice (silent otherwise). */
function speakVi(text: string) {
  try {
    const synth = window.speechSynthesis;
    const voice = synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'));
    if (!synth || !voice) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 1.05;
    synth.speak(u);
  } catch {
    /* no speech: the text is on screen anyway */
  }
}
const hush = () => {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
};

// ================================================================== Chạy cuốc theo khách chỉ đường
const TURNS: { id: SgTurn; vi: string; en: string; arrow: string }[] = [
  { id: 'trai', vi: 'Quẹo trái', en: 'Turn left', arrow: 'M14 8 L6 16 L14 24 M6 16 H26' },
  { id: 'thang', vi: 'Chạy thẳng', en: 'Straight on', arrow: 'M16 28 V6 M8 14 L16 6 L24 14' },
  { id: 'phai', vi: 'Quẹo phải', en: 'Turn right', arrow: 'M18 8 L26 16 L18 24 M26 16 H6' },
];
/** heading 0 = north, 1 = east, 2 = south, 3 = west */
const STEP = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** The route so far, as grid points (start at 0,0 heading north). */
function route(turns: SgTurn[]) {
  const pts = [{ x: 0, y: 0 }];
  let h = 0;
  for (const d of turns) {
    h = (h + (d === 'trai' ? 3 : d === 'phai' ? 1 : 0)) % 4;
    const p = pts[pts.length - 1];
    pts.push({ x: p.x + STEP[h][0], y: p.y + STEP[h][1] });
  }
  return { pts, heading: h };
}

export function ChiDuong({ task, submit }: { task: T<'task_chi_duong'>; submit: Submit }) {
  const t = useT();
  const [turns, setTurns] = useState<SgTurn[]>([]);
  const done = turns.length >= task.steps.length;
  const step = task.steps[Math.min(turns.length, task.steps.length - 1)];
  const shown = useTypewriter(done ? '' : step.say);
  const ready = !done && shown >= step.say.length;
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const choose = (d: SgTurn) => {
    if (!ready) return;
    sfx.scrape();
    const next = [...turns, d];
    setTurns(next);
    if (next.length === task.steps.length) {
      sfx.ok();
      timer.current = window.setTimeout(() => submit(next), 900);
    }
  };

  // fit the route into the map; one grid unit = 40 svg px
  const { pts, heading } = route(turns);
  const U = 40;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const pad = 1.2;
  const minX = Math.min(...xs, -1) - pad, maxX = Math.max(...xs, 1) + pad;
  const minY = Math.min(...ys, -2) - pad, maxY = Math.max(...ys, 0) + pad;
  const vb = `${minX * U} ${minY * U} ${(maxX - minX) * U} ${(maxY - minY) * U}`;
  const end = pts[pts.length - 1];
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x * U} ${p.y * U}`).join(' ');
  // the junction ahead, so the player sees where they are about to turn
  const ahead = { x: end.x + STEP[heading][0], y: end.y + STEP[heading][1] };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      vars={{ passenger: task.passenger }}
      status={`${turns.length}/${task.steps.length}`}
      tone={done ? 'ok' : 'info'}
      hint={done ? t('Tới nơi rồi! Khách khen: “Chạy rành hẻm dữ ha!”', 'Arrived! “You really know these alleys!”') : ready ? t('Khách chốt hướng nào?', 'Which way did they finally say?') : t('Nghe khách nói hết câu đã…', 'Let them finish the sentence…')}
    >
      <div className="sg-cd">
        <svg className="sg-cd-map" viewBox={vb} aria-hidden>
          <defs>
            <pattern id="sgcd-grid" width={U} height={U} patternUnits="userSpaceOnUse" x={-U / 2} y={-U / 2}>
              <rect width={U} height={U} fill="#2a2d33" />
              <rect x="3" y="3" width={U - 6} height={U - 6} rx="3" fill="#3b3530" />
              <rect x="7" y="7" width={U / 2 - 9} height={U / 2 - 9} fill="#f2b84a" opacity="0.18" />
            </pattern>
          </defs>
          <rect x={minX * U} y={minY * U} width={(maxX - minX) * U} height={(maxY - minY) * U} fill="url(#sgcd-grid)" />
          {/* lit alley behind the bike */}
          <path d={path} fill="none" stroke="#4a4a4f" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path} fill="none" stroke="#ffd27a" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" opacity="0.9" />
          {!done && (
            <g className="sg-cd-ahead">
              <circle cx={ahead.x * U} cy={ahead.y * U} r="13" fill="none" stroke="#ffe7a8" strokeWidth="2" strokeDasharray="4 4" />
              <text x={ahead.x * U} y={ahead.y * U + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffe7a8">
                ?
              </text>
            </g>
          )}
          {/* start + the CRAB bike, pointing where it rides */}
          <circle cx="0" cy="0" r="5" fill="#9fdc6b" />
          <g className="sg-cd-bike" style={{ transform: `translate(${end.x * U}px, ${end.y * U}px) rotate(${heading * 90}deg)` }}>
            <ellipse cx="0" cy="2" rx="9" ry="13" fill="#000" opacity="0.25" />
            <rect x="-4" y="-13" width="8" height="26" rx="4" fill="#1d1d1f" />
            <rect x="-7" y="-6" width="14" height="13" rx="4" fill="#00b14f" />
            <circle cx="0" cy="-1" r="5.5" fill="#00b14f" stroke="#e8fff1" strokeWidth="1.5" />
            <path d="M-6 -12 H6" stroke="#cfd3d8" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="0" cy="-14" r="2" fill="#fff6c4" />
          </g>
        </svg>
        <div className="sg-bubble">
          <b>{task.passenger}</b>
          <p>
            {done ? t('Tới rồi đó em, cảm ơn nha!', 'This is it, thanks!') : step.say.slice(0, shown)}
            {!ready && !done && <i className="sg-caret" />}
          </p>
        </div>
        <div className="sg-turns">
          {TURNS.map((d) => (
            <button key={d.id} className="sg-turn" disabled={!ready} onClick={() => choose(d.id)}>
              <svg viewBox="0 0 32 32" aria-hidden>
                <path d={d.arrow} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t(d.vi, d.en)}
            </button>
          ))}
        </div>
      </div>
    </MgShell>
  );
}

// ================================================================== Nghe rao canh chừng
type Verdict = 'safe' | 'stranger';

export function TiengRao({ task, submit }: { task: T<'task_tieng_rao'>; submit: Submit }) {
  const t = useT();
  const [phase, setPhase] = useState<'learn' | 'listen' | 'done'>('learn');
  const [idx, setIdx] = useState(0);
  const [got, setGot] = useState<Record<string, Verdict>>({});
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const timer = useRef(0);
  useEffect(() => () => (clearTimeout(timer.current), hush()), []);
  const call = task.calls[idx];

  // each call lasts callMs; missing one sends you back to the code sheet
  useEffect(() => {
    if (phase !== 'listen' || !call) return;
    speakVi(call.text);
    timer.current = window.setTimeout(() => {
      sfx.bad();
      doShake();
      hush();
      setMsg(t('Lỡ mất một tiếng rao — xem lại ám hiệu rồi nghe lại nhé.', 'You missed a call — check the code and listen again.'));
      setPhase('learn');
    }, task.callMs);
    return () => clearTimeout(timer.current);
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    sfx.scrape();
    setMsg('');
    setGot({});
    setIdx(0);
    setPhase('listen');
  };
  const answer = (v: Verdict) => {
    if (phase !== 'listen' || !call) return;
    clearTimeout(timer.current);
    v === 'safe' ? sfx.ok() : sfx.senh();
    const next = { ...got, [call.id]: v };
    setGot(next);
    if (idx + 1 < task.calls.length) return setIdx(idx + 1);
    hush();
    setPhase('done');
    timer.current = window.setTimeout(() => submit(next), 700);
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={phase === 'learn' ? '📜' : `${Object.keys(got).length}/${task.calls.length}`}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Báo hiệu xong — cả hội yên tâm khui hụi.', 'Signals sent — the crew can carry on.')
          : msg || (phase === 'learn' ? t('Thuộc ám hiệu rồi bấm Bắt đầu nghe.', 'Learn the code, then press Start listening.') : t('Tiếng rao này nghĩa là gì?', 'What does this call mean?'))
      }
    >
      <div className={`sg-tr ${shake}`}>
        {phase === 'learn' ? (
          <>
            <ul className="sg-tr-legend">
              {task.legend.map((l) => (
                <li key={l.text} className={l.means}>
                  <span>“{l.text}”</span>
                  <b>{l.means === 'safe' ? t('An toàn', 'Safe') : t('Có người lạ', 'Stranger')}</b>
                </li>
              ))}
            </ul>
            <button className="btn primary" onClick={start}>
              {t('Bắt đầu nghe', 'Start listening')}
            </button>
          </>
        ) : (
          <>
            <div className="sg-tr-street">
              <svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMax slice" aria-hidden>
                <rect width="320" height="120" fill="#1b1f2b" />
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <g key={i} transform={`translate(${i * 56 - 6} 0)`}>
                    <rect y={22 + (i % 3) * 8} width="50" height={98 - (i % 3) * 8} fill={['#3a3340', '#2f3542', '#433a35'][i % 3]} />
                    <rect x="9" y={40 + (i % 3) * 8} width="12" height="14" fill="#f2b84a" opacity={i % 2 ? 0.75 : 0.25} />
                    <rect x="29" y={40 + (i % 3) * 8} width="12" height="14" fill="#f2b84a" opacity={i % 2 ? 0.2 : 0.7} />
                  </g>
                ))}
                <path d="M0 18 Q80 34 160 20 T320 22" fill="none" stroke="#111" strokeWidth="1.5" />
                <path d="M0 26 Q90 40 170 28 T320 30" fill="none" stroke="#111" strokeWidth="1.2" />
                <rect y="104" width="320" height="16" fill="#3d3f45" />
              </svg>
              {call && (
                <div key={call.id} className="sg-tr-call" style={{ animationDuration: `${task.callMs}ms` }}>
                  <span>📣</span> {call.text}
                </div>
              )}
              <i key={`bar-${idx}`} className="sg-tr-timer" style={{ animationDuration: `${task.callMs}ms` }} />
            </div>
            <div className="sg-row">
              <button className="btn sg-safe" disabled={phase !== 'listen'} onClick={() => answer('safe')}>
                {t('An toàn', 'Safe')}
              </button>
              <button className="btn sg-stranger" disabled={phase !== 'listen'} onClick={() => answer('stranger')}>
                {t('Có người lạ', 'Stranger')}
              </button>
            </div>
          </>
        )}
      </div>
    </MgShell>
  );
}
