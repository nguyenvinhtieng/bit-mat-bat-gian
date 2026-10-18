/** Dãy quán ăn + quán cà phê cóc: giao cơm tấm, pha cà phê sữa đá. The server judges every answer. */
import { useEffect, useRef, useState } from 'react';
import type { TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useShake, type Submit } from '../common/kit';
import { useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== Giao cơm tấm
/** Top-down dish art, drawn around (0,0) at ~28px. Unknown kinds fall back to a labelled dot. */
const DISH: Record<string, React.ReactNode> = {
  suon: (
    <g>
      <path d="M-15 -7 Q-4 -13 14 -8 Q18 0 13 8 Q-2 13 -15 7 Q-18 0 -15 -7Z" fill="#a2522a" stroke="#6e3215" strokeWidth="1.5" />
      <path d="M-9 -8 L-4 9 M-1 -9 L4 9 M7 -8 L11 7" stroke="#4f2109" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="12" y="-3" width="9" height="5" rx="2.5" fill="#f3e2c4" />
    </g>
  ),
  bi: (
    <g stroke="#e9cf94" strokeWidth="2" strokeLinecap="round">
      <ellipse rx="14" ry="10" fill="#f6e3b0" stroke="none" />
      <path d="M-11 -4 Q-2 -8 9 -3 M-12 2 Q0 -2 11 3 M-8 7 Q2 3 10 8" fill="none" stroke="#d1aa62" />
      <circle cx="-4" cy="-1" r="1" fill="#8a6a2a" stroke="none" />
      <circle cx="5" cy="4" r="1" fill="#8a6a2a" stroke="none" />
    </g>
  ),
  cha: (
    <g>
      <rect x="-13" y="-10" width="26" height="20" rx="3" fill="#f0b43c" stroke="#b77a13" strokeWidth="1.5" />
      <rect x="-13" y="-10" width="26" height="6" rx="3" fill="#d28a1c" />
      <circle cx="-5" cy="3" r="1.6" fill="#7a4a0c" />
      <circle cx="4" cy="5" r="1.4" fill="#7a4a0c" />
      <circle cx="6" cy="-1" r="1.2" fill="#3e7a2a" />
    </g>
  ),
  trung: (
    <g>
      <path d="M-14 -3 Q-12 -13 0 -12 Q13 -12 14 -1 Q15 10 2 12 Q-12 12 -14 -3Z" fill="#fffaf0" stroke="#e8dcc0" strokeWidth="1.5" />
      <circle cx="1" cy="0" r="6.5" fill="#f7a81b" />
      <circle cx="-1" cy="-2" r="2" fill="#ffd775" />
    </g>
  ),
  lap_xuong: (
    <g>
      {[-9, 0, 9].map((x) => (
        <g key={x} transform={`translate(${x} ${x / 3})`}>
          <ellipse rx="5" ry="6" fill="#b3263a" stroke="#7a1022" strokeWidth="1.2" />
          <circle cx="-1.5" cy="-1" r="1.2" fill="#f4c4b8" />
          <circle cx="1.6" cy="1.8" r="1" fill="#f4c4b8" />
        </g>
      ))}
    </g>
  ),
  mo_hanh: (
    <g>
      <ellipse rx="13" ry="8" fill="#fff3c6" opacity="0.8" />
      {[
        [-7, -2],
        [-2, 3],
        [3, -3],
        [7, 2],
        [0, -1],
        [-5, 4],
      ].map(([x, y], i) => (
        <rect key={i} x={x - 2} y={y - 1} width="4.5" height="2.6" rx="1.2" fill="#3f9a3a" transform={`rotate(${i * 40} ${x} ${y})`} />
      ))}
    </g>
  ),
  do_chua: (
    <g strokeLinecap="round" strokeWidth="3">
      <path d="M-11 -6 L-3 6 M-6 -8 L3 4 M1 -7 L9 5" stroke="#f08a2a" />
      <path d="M-9 -1 L-1 9 M4 -9 L11 1 M-2 -9 L5 -1" stroke="#fbf3e1" />
    </g>
  ),
  nuoc_mam: (
    <g>
      <circle r="12" fill="#e8eef2" stroke="#9fb1bd" strokeWidth="1.5" />
      <circle r="8.5" fill="#c9762a" />
      <circle cx="-2" cy="-1" r="1.6" fill="#e33b2a" />
      <circle cx="3" cy="2" r="1.3" fill="#e33b2a" />
      <ellipse cx="-3" cy="-4" rx="3" ry="1.4" fill="#fff" opacity="0.45" />
    </g>
  ),
};
/** where each plated kind sits on the plate (around the rice) */
const SPOT: Record<string, [number, number]> = {
  suon: [-26, -14],
  bi: [26, -16],
  cha: [24, 16],
  trung: [-24, 18],
  lap_xuong: [0, -30],
  mo_hanh: [0, -4],
  do_chua: [2, 30],
  nuoc_mam: [56, 30],
};
const dish = (kind: string, name: string) => DISH[kind] ?? (
  <g>
    <circle r="11" fill="#d9a441" />
    <text y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">
      {name[0]}
    </text>
  </g>
);

export function ComTam({ task, submit }: { task: T<'task_com_tam'>; submit: Submit }) {
  const t = useT();
  const [phase, setPhase] = useState<'memo' | 'pick' | 'done'>('memo');
  const [plate, setPlate] = useState<string[]>([]);
  const timer = useRef(0);
  useEffect(() => {
    timer.current = window.setTimeout(() => (sfx.scrape(), setPhase('pick')), task.memoMs);
    return () => clearTimeout(timer.current);
  }, [task.memoMs]);

  const toggle = (kind: string) => {
    if (phase !== 'pick') return;
    sfx.scrape();
    const next = plate.includes(kind) ? plate.filter((k) => k !== kind) : [...plate, kind];
    setPlate(next);
    // served as soon as the plate holds as many items as the order
    if (next.length === task.want) {
      sfx.ok();
      setPhase('done');
      timer.current = window.setTimeout(() => submit(next), 800);
    }
  };
  const name = (k: string) => task.tray.find((x) => x.kind === k)?.name ?? k;

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      vars={{ customer: task.customer }}
      status={phase === 'memo' ? '📝' : `${plate.length}/${task.want} ${t('món', 'items')}`}
      tone={phase === 'done' ? 'ok' : 'info'}
      hint={
        phase === 'memo'
          ? t('Nhớ kỹ nha — gió sắp thổi bay tờ order!', 'Memorise it — the wind is about to take the slip!')
          : phase === 'done'
            ? t('Dĩa cơm nóng hổi, giao liền!', 'Piping hot, out it goes!')
            : t(`Order của ${task.customer} gồm những gì?`, `What did ${task.customer} order?`)
      }
    >
      <div className="sg-ct">
        {phase === 'memo' && (
          <div className="sg-ct-slip" style={{ animationDuration: `${task.memoMs}ms` }}>
            <b>{task.customer}</b>
            <ul>
              {task.order.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <i className="sg-ct-wind" style={{ animationDuration: `${task.memoMs}ms` }} />
          </div>
        )}
        {phase !== 'memo' && (
          <>
            <svg className={`sg-ct-plate ${phase === 'done' ? 'done' : ''}`} viewBox="-80 -56 160 112" aria-hidden>
              <ellipse cy="5" rx="64" ry="48" fill="#000" opacity="0.25" />
              <ellipse rx="62" ry="46" fill="#f5f7f7" stroke="#cdd6da" strokeWidth="2" />
              <ellipse rx="52" ry="37" fill="none" stroke="#3d8fc2" strokeWidth="2" strokeDasharray="5 4" opacity="0.6" />
              {/* the broken-rice mound */}
              <g fill="#fffdf6" stroke="#ebe3cf" strokeWidth="0.8">
                <ellipse rx="24" ry="17" />
                {Array.from({ length: 22 }, (_, i) => (
                  <ellipse key={i} cx={Math.cos(i * 2.4) * (6 + (i % 4) * 4)} cy={Math.sin(i * 2.4) * (4 + (i % 4) * 3)} rx="2.2" ry="1.3" transform={`rotate(${i * 33})`} />
                ))}
              </g>
              {plate.map((k) => {
                const [x, y] = SPOT[k] ?? [0, 0];
                return (
                  <g key={k} className="sg-ct-food" transform={`translate(${x} ${y})`}>
                    {dish(k, name(k))}
                  </g>
                );
              })}
            </svg>
            <div className="sg-tray">
              {task.tray.map((it) => (
                <button key={it.kind} className={`sg-chip ${plate.includes(it.kind) ? 'sel' : ''}`} disabled={phase !== 'pick'} onClick={() => toggle(it.kind)}>
                  <svg viewBox="-17 -17 34 34" aria-hidden>
                    {dish(it.kind, it.name)}
                  </svg>
                  {it.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </MgShell>
  );
}

// ================================================================== Pha cà phê sữa đá
const MILK_RATE = 0.16; // glass fraction per second while pouring
/** the glass interior in svg units (bottom at GLASS_Y + GLASS_H) */
const GLASS_Y = 70;
const GLASS_H = 120;

export function CaPhePhin({ task, submit }: { task: T<'task_ca_phe_phin'>; submit: Submit }) {
  const t = useT();
  const [drops, setDrops] = useState(0);
  const [milk, setMilk] = useState(0);
  const milkRef = useRef(0);
  const [pouring, setPouring] = useState(false);
  const [phase, setPhase] = useState<'drip' | 'milk' | 'done'>('drip');
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const raf = useRef(0);
  const timer = useRef(0);

  // the phin drips at its own pace — no hurrying it
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      setDrops(n);
      sfx.scrape();
      if (n >= task.drips) clearInterval(id), setPhase('milk');
    }, task.dripMs);
    return () => clearInterval(id);
  }, [task.drips, task.dripMs]);
  useEffect(() => () => (cancelAnimationFrame(raf.current), clearTimeout(timer.current)), []);

  const press = () => {
    if (phase !== 'milk' || pouring) return;
    setMsg('');
    setPouring(true);
    let last = performance.now();
    const loop = (now: number) => {
      milkRef.current = Math.min(1, milkRef.current + ((now - last) / 1000) * MILK_RATE);
      last = now;
      setMilk(milkRef.current);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };
  const release = () => {
    if (!pouring) return;
    cancelAnimationFrame(raf.current);
    setPouring(false);
    const m = milkRef.current;
    if (m < task.line - task.tolerance) return setMsg(t('Còn thiếu sữa — nhấn giữ rót thêm chút nữa.', 'Not enough milk — hold to pour a little more.'));
    if (m > task.line + task.tolerance) {
      sfx.bad();
      doShake();
      milkRef.current = 0;
      setMilk(0);
      return setMsg(t('Ngọt khé cổ! Đổ ra pha lại ly khác nhé.', 'Way too sweet! Pour it out and try again.'));
    }
    sfx.ok();
    setPhase('done');
    timer.current = window.setTimeout(() => submit({ milk: m }), 900);
  };

  const milkH = milk * GLASS_H;
  const coffeeH = (drops / task.drips) * GLASS_H * 0.42;
  const lineY = GLASS_Y + GLASS_H * (1 - task.line);
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={phase === 'drip' ? `${drops}/${task.drips}` : `${Math.round(milk * 100)}%`}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Khuấy đều, thêm đá — ly này đúng điệu quán cóc!', 'Stir, add ice — a proper street-side coffee!')
          : msg || (phase === 'drip' ? t('Phin đang nhỏ giọt… chờ chút.', 'The phin is dripping… hang on.') : t('Nhấn giữ để rót sữa, thả tay ở vạch đỏ.', 'Hold to pour milk, let go at the red line.'))
      }
    >
      <div className="sg-cf">
        <svg className={`sg-cf-glass ${shake}`} viewBox="0 0 160 220" aria-hidden>
          {/* phin on top while it drips */}
          <g className={phase === 'drip' ? '' : 'sg-cf-phin-off'}>
            <rect x="50" y="18" width="60" height="38" rx="4" fill="#b9c0c6" stroke="#7d868d" strokeWidth="2" />
            <rect x="44" y="14" width="72" height="6" rx="3" fill="#d6dbdf" stroke="#7d868d" strokeWidth="1.5" />
            <rect x="38" y="54" width="84" height="6" rx="3" fill="#a8b0b6" stroke="#7d868d" strokeWidth="1.5" />
            <rect x="56" y="22" width="48" height="30" fill="#3a2010" opacity="0.65" />
            {phase === 'drip' && <circle key={drops} className="sg-cf-drop" cx="80" cy="64" r="3" fill="#3a1d0b" style={{ animationDuration: `${task.dripMs}ms` }} />}
          </g>
          {/* glass */}
          <defs>
            <clipPath id="sgcf-in">
              <path d={`M38 ${GLASS_Y} L46 ${GLASS_Y + GLASS_H} H114 L122 ${GLASS_Y}Z`} />
            </clipPath>
          </defs>
          <g clipPath="url(#sgcf-in)">
            <rect x="30" y={GLASS_Y} width="100" height={GLASS_H} fill="#fff" opacity="0.08" />
            <rect x="30" y={GLASS_Y + GLASS_H - milkH} width="100" height={milkH} fill="#f3e6c4" />
            <rect x="30" y={GLASS_Y + GLASS_H - milkH - coffeeH} width="100" height={coffeeH} fill="#4a240e" />
            {phase === 'done' && <rect x="30" y={GLASS_Y + GLASS_H - milkH - coffeeH} width="100" height={milkH + coffeeH} fill="#9b6337" className="sg-cf-mix" />}
          </g>
          <path d={`M38 ${GLASS_Y} L46 ${GLASS_Y + GLASS_H} H114 L122 ${GLASS_Y}`} fill="none" stroke="#dfe9ee" strokeWidth="3" strokeLinejoin="round" />
          <path d={`M44 ${GLASS_Y + 8} L50 ${GLASS_Y + GLASS_H - 10}`} stroke="#fff" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
          {/* the target line */}
          <line x1="32" x2="128" y1={lineY} y2={lineY} stroke="#e53935" strokeWidth="2.5" strokeDasharray="6 4" />
          <text x="134" y={lineY + 4} fontSize="11" fontWeight="800" fill="#e53935">
            ◀
          </text>
          {/* the condensed-milk can, tipping while pouring */}
          <g className={`sg-cf-can ${pouring ? 'on' : ''}`}>
            <rect x="118" y="20" width="30" height="36" rx="3" fill="#2f6fb5" stroke="#1d4a7c" strokeWidth="1.5" />
            <rect x="118" y="30" width="30" height="12" fill="#fbf3dc" />
            <circle cx="133" cy="36" r="4" fill="#e53935" />
            {pouring && <path d="M118 22 Q100 26 82 66 L82 190" stroke="#f3e6c4" strokeWidth="4" fill="none" strokeLinecap="round" />}
          </g>
        </svg>
        <button
          className={`btn primary tl-big ${pouring ? 'sg-hold' : ''}`}
          disabled={phase !== 'milk'}
          onPointerDown={press}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
        >
          {t('Giữ để rót sữa', 'Hold to pour')}
        </button>
      </div>
    </MgShell>
  );
}
