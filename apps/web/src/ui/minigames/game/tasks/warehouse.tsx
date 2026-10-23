/** Kho CRAB: pack and seal the box (drag each step) · stack the rear rack (tap-to-drop timing). */
import { useRef, useState } from 'react';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useFrame, useOnce, type P } from './shared';

// ================================================================== Quấn băng keo
export function TapeBox({ task, submit }: P<'tape_box'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const drag = useRef<{ id: number; step: number } | null>(null);
  const value = useRef(0);
  const paths = [
    { x: 45, y: 145, endX: 150, endY: 145 },
    { x: 315, y: 145, endX: 210, endY: 145 },
    { x: 180, y: 80, endX: 180, endY: 255 },
    { x: 80, y: 168, endX: 280, endY: 168 },
  ];
  const labels = [t('Gấp nắp trái', 'Fold left flap'), t('Gấp nắp phải', 'Fold right flap'), t('Dán đường ráp nắp', 'Seal the seam'), t('Dán dải ngang', 'Apply cross strip')];
  const finish = () => {
    if (sent || step >= 4) return;
    sfx.scrape();
    drag.current = null;
    value.current = 0;
    setProgress(0);
    setStep(step + 1);
    if (step === 3) send({ flaps: ['left', 'right'], strips: ['seam', 'cross'] });
  };
  const point = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * 360, y: (e.clientY - r.top) / r.height * 300 };
  };
  const target = paths[step];
  return <MgShell bare taskId={task.taskId} status={`${step}/4`} hint={sent ? t('Đã gói kín, sẵn sàng giao!', 'Sealed and ready to deliver!') : ''} tone={sent ? 'ok' : 'info'}>
    <svg className="ck-pack" viewBox="0 0 360 300" aria-label={t('Bàn gói thùng hàng', 'Packing workbench')}
      onPointerDown={e => {
        if (!target || sent) return;
        const p = point(e);
        if (Math.hypot(p.x - target.x, p.y - target.y) > 26) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, step };
      }}
      onPointerMove={e => {
        if (!target || drag.current?.id !== e.pointerId || drag.current.step !== step) return;
        const p = point(e), dx = target.endX - target.x, dy = target.endY - target.y;
        const ratio = ((p.x - target.x) * dx + (p.y - target.y) * dy) / (dx * dx + dy * dy);
        const distance = Math.abs((p.x - target.x) * dy - (p.y - target.y) * dx) / Math.hypot(dx, dy);
        if (distance > 30 || ratio < -.15) { drag.current = null; value.current = 0; setProgress(0); return; }
        value.current = Math.max(0, Math.min(1, ratio));
        setProgress(value.current);
      }}
      onPointerUp={e => {
        if (drag.current?.id === e.pointerId && value.current >= .92) finish();
        else { drag.current = null; value.current = 0; setProgress(0); }
      }}
      onPointerCancel={() => { drag.current = null; value.current = 0; setProgress(0); }}>
      <rect x="8" y="8" width="344" height="284" rx="22" fill="#264c43" />
      <path d="M24 272H336M24 28H336" stroke="#719083" strokeDasharray="4 7" />
      <rect x="80" y="76" width="200" height="180" rx="5" fill="#5e3d28" stroke="#372a22" strokeWidth="4" />
      <path d="M90 89H270V243H90Z" fill="#997349" />
      <path d="M100 110L150 96 180 119 237 100 258 146 228 220 120 231Z" fill="#c4b69b" />
      <path d={step > 0 ? 'M80 76H180V256H80Z' : `M80 76L${20 + progress * 60} 55V235L80 256Z`} fill="#c99a60" stroke="#765131" strokeWidth="3" />
      <path d={step > 1 ? 'M180 76H280V256H180Z' : `M280 76L${340 - (step === 1 ? progress : 0) * 60} 55V235L280 256Z`} fill="#d7ad72" stroke="#765131" strokeWidth="3" />
      {step >= 2 && <path d="M180 78V254" stroke="#785532" strokeWidth="3" />}
      {step >= 2 && <path d={`M180 80V${step > 2 ? 255 : 80 + progress * 175}`} stroke="#f6d58dcf" strokeWidth="24" />}
      {step >= 3 && <path d={`M80 168H${step > 3 ? 280 : 80 + progress * 200}`} stroke="#f6d58dcf" strokeWidth="24" />}
      {target && <g>
        <path d={`M${target.x} ${target.y}L${target.endX} ${target.endY}`} stroke="#fff3bd" strokeWidth="3" strokeDasharray="5 6" />
        <circle cx={target.endX} cy={target.endY} r="13" fill="#264c43" stroke="#fff3bd" /><text x={target.endX} y={target.endY + 5} textAnchor="middle" fill="#fff3bd">↓</text>
        <g transform={`translate(${target.x + (target.endX - target.x) * progress} ${target.y + (target.endY - target.y) * progress})`}>
          <circle r="22" fill={step >= 2 ? '#e9b54a' : '#fff0cb'} stroke="#6a492d" strokeWidth="3" />
          {step >= 2 ? <circle r="10" fill="#264c43" /> : <text textAnchor="middle" y="6" fill="#593c29">↔</text>}
        </g>
      </g>}
      <text x="180" y="282" textAnchor="middle" fill="#fff0cb" fontSize="12">CRAB · {t('ĐÓNG GÓI', 'PACKING')}</text>
    </svg>
    <progress value={step / 4} max={1} aria-label={t('Tiến độ gói hàng', 'Packing progress')} />
    <button className="ck-pack-key" disabled={sent} onClick={e => { if (e.detail === 0) finish(); }}>{sent ? t('Đã niêm phong', 'Sealed') : `${step + 1}. ${labels[step]} · ${t('kéo hoặc Enter', 'drag or Enter')}`}</button>
  </MgShell>;
}

// ================================================================== Chất hàng lên baga
const STAGE_W = 300;
const stagePct = (px: number) => `${px / STAGE_W * 100}%`;
/** stage units → CSS length; `--u` (px per unit) is sized to the play area in CSS */
const su = (n: number) => `calc(var(--u) * ${n})`;
/** height above the rack floor, offset by the baga line (`--base`, taller on portrait stages) */
const sb = (i: number) => `calc(var(--u) * (var(--base, 92) + var(--step, 46) * ${i}))`;

export function StackRack({ task, submit }: P<'stack_rack'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [stack, setStack] = useState<number[]>([]); // absolute x of each dropped box (0 = rack centre)
  const [time, setTime] = useState(0);
  const [started, setStarted] = useState(false);
  const dropAt = useRef(0);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const n = stack.length;
  const cur = task.boxes[n];
  const speed = 0.0022 + n * 0.0006;
  const x = Math.sin(time * speed) * task.swing;
  const belowX = n ? stack[n - 1] : 0;
  const belowW = n ? task.boxes[n - 1].w : task.base;
  const safe = !!cur && Math.abs(x - belowX) <= Math.min(belowW, cur.w) / 2;
  useFrame(started && !!cur && !sent, (dt) => setTime((v) => v + dt));

  const drop = () => {
    if (!cur || sent || !started || performance.now() - dropAt.current < 250) return;
    dropAt.current = performance.now();
    if (Math.abs(x - belowX) > Math.min(belowW, cur.w) / 2) {
      sfx.bad();
      doShake();
      setStack([]);
      setStarted(false);
      setTime(0);
      return setHint([n === 3 ? t('Sầu riêng rớt! Cả hẻm ngửi thấy luôn. Chất lại!', 'The durian fell! The whole alley can smell it. Again!') : t('Đổ hết rồi! Chất lại từ đầu.', 'It all toppled! Start over.'), 'bad']);
    }
    sfx.stamp();
    const next = [...stack, x];
    setStack(next);
    setTime(Math.PI / (2 * (0.0022 + next.length * 0.0006)));
    setHint([Math.abs(x - belowX) < 10 ? t('Chính giữa! Chồng hàng rất vững.', 'Perfect centre! A steady stack.') : t('Đã đặt! Canh theo thùng vừa thả.', 'Landed! Align with the box you just placed.'), 'ok']);
    if (next.length === task.boxes.length) {
      setHint([t('Vững như kiềng — kể cả thùng sầu riêng.', 'Rock solid — even the durian.'), 'ok']);
      send({ offsets: next.map((v, i) => v - (i ? next[i - 1] : 0)) });
    }
  };

  return (
    <MgShell bare taskId={task.taskId} status={`${n}/${task.boxes.length}`} hint={hint[0]} tone={hint[1]}>
      <div className={`ck-rack ${shake}`} onPointerDown={drop}>
        {cur && started && <div aria-hidden style={{ position: 'absolute', width: stagePct(cur.w), boxSizing: 'border-box', height: 'calc(var(--u) * (var(--step, 46) - 2))', left: stagePct(STAGE_W / 2 + x - cur.w / 2), bottom: sb(n), border: `2px dashed ${safe ? '#327e59' : '#b75a3c'}`, borderRadius: 4, background: safe ? '#5da67830' : '#b75a3c20' }} />}
        {cur && (
          <div className="ck-crate swing" style={{ width: stagePct(cur.w), boxSizing: 'border-box', left: stagePct(STAGE_W / 2 + x - cur.w / 2), top: su(8) }}>
            <img src={taskArt(task.taskId, cur.kind)} alt="" draggable={false} />
            <span>{cur.name}</span>
          </div>
        )}
        {stack.map((sx, i) => (
          <div key={i} className="ck-crate" style={{ width: stagePct(task.boxes[i].w), boxSizing: 'border-box', left: stagePct(STAGE_W / 2 + sx - task.boxes[i].w / 2), bottom: sb(i) }}>
            <img src={taskArt(task.taskId, task.boxes[i].kind)} alt="" draggable={false} />
            <span>{task.boxes[i].name}</span>
          </div>
        ))}
        <div className="ck-baga" style={{ width: stagePct(task.base), left: stagePct(STAGE_W / 2 - task.base / 2) }} />
        <img className="ck-bike" src={taskArt(task.taskId, 'bike')} alt="" draggable={false} />
      </div>
      <div className="ck-swipe-row">
        {!started ? <button className="go" disabled={sent} onClick={() => { setTime(Math.PI / (2 * speed)); setStarted(true); }}>{t('Bắt đầu chất hàng', 'Start stacking')}</button> : <button className="go" disabled={sent || !cur} onClick={drop}>{t('Thả thùng', 'Drop box')} ↓</button>}
      </div>
    </MgShell>
  );
}

// Four circuits in a weathered alley junction box; labels also distinguish colours.
export function ConnectWires({ task, submit }: P<'connect_wires'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [connected, setConnected] = useState<string[]>([]);
  const [selected, setSelected] = useState<{ color: string; side: 'left' | 'right' } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [bad, setBad] = useState(false);
  const dragging = useRef<{ id: number; color: string; side: 'left' | 'right' } | null>(null);
  const colors: Record<string, string> = { red: '#f3786c', blue: '#70b7ed', amber: '#f6ce68', mint: '#83d6b1' };
  const names: Record<string, string> = { red: t('Đỏ', 'Red'), blue: t('Lam', 'Blue'), amber: t('Vàng', 'Amber'), mint: t('Lục', 'Mint') };
  const symbols: Record<string, string> = { red: 'A', blue: 'B', amber: 'C', mint: 'D' };
  const y = (index: number) => 86 + index * 58;
  const join = (from: string, to: string) => {
    if (sent || connected.includes(from)) return;
    if (from !== to) { sfx.bad(); setBad(true); setSelected(null); setCursor(null); return; }
    const next = [...connected, from];
    sfx.scrape(); setBad(false); setConnected(next); setSelected(null); setCursor(null);
    if (next.length === 4) send({ connections: next.map(color => ({ from: color, to: color })) });
  };
  const position = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * 400, y: (e.clientY - r.top) / r.height * 320 };
  };
  const terminal = (color: string, side: 'left' | 'right', index: number) => {
    const done = connected.includes(color), x = side === 'left' ? 74 : 326;
    return <g key={`${side}-${color}`} className="ck-wire-terminal" role="button" tabIndex={done || sent ? -1 : 0} aria-disabled={done || sent} aria-label={`${side === 'left' ? t('Dây', 'Wire') : t('Cọc', 'Socket')} ${names[color]} ${symbols[color]}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!done && !sent) { if (selected && selected.side !== side) join(selected.color, color); else { setSelected({ color, side }); setBad(false); } } } }}
      onPointerDown={e => {
        if (done || sent || dragging.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const svg = e.currentTarget.ownerSVGElement!;
        svg.setPointerCapture(e.pointerId);
        dragging.current = { id: e.pointerId, color, side }; setSelected({ color, side }); setCursor({ x, y: y(index) }); setBad(false);
      }}>
      <rect x={side === 'left' ? 22 : 300} y={y(index) - 27} width="78" height="54" rx="10" fill="#193e38" stroke={done ? '#83d6b1' : '#758a78'} />
      <text x={side === 'left' ? 38 : 364} y={y(index) + 5} textAnchor="middle" fill={colors[color]} fontSize="14" fontWeight="bold">{symbols[color]}</text>
      <circle className="ck-wire-end" data-side={side} data-color={color} cx={x} cy={y(index)} r="25" fill={colors[color]} stroke={selected?.color === color && selected.side === side ? '#fff9df' : '#102d28'} strokeWidth="4" />
      <circle cx={x} cy={y(index)} r="7" fill="#193e38" pointerEvents="none" />
      {done && <text x={x} y={y(index) + 5} textAnchor="middle" fill="#fff" pointerEvents="none">✓</text>}
    </g>;
  };
  return <MgShell bare taskId={task.taskId} status={`${connected.length}/4`} hint={bad ? t('Sai cọc rồi! Tìm dây cùng màu và cùng chữ.', 'Wrong socket! Match the colour and letter.') : sent ? t('Bốn mạch đã thông!', 'All four circuits connected!') : ''} tone={bad ? 'bad' : sent ? 'ok' : 'info'}>
    <svg className="ck-wires" viewBox="0 0 400 320" aria-label={t('Hộp nối điện hẻm 42', 'Alley 42 junction box')}
      onPointerMove={e => { if (dragging.current?.id === e.pointerId) setCursor(position(e)); }}
      onPointerUp={e => {
        const active = dragging.current;
        if (!active || active.id !== e.pointerId) return;
        const p = position(e);
        const targets = active.side === 'left' ? task.right : task.left;
        const targetX = active.side === 'left' ? 326 : 74;
        const index = targets.findIndex((_, i) => Math.hypot(p.x - targetX, p.y - y(i)) <= 32);
        dragging.current = null; setCursor(null);
        if (index >= 0) join(active.color, targets[index]); else { setSelected(null); setBad(true); }
      }}
      onPointerCancel={() => { dragging.current = null; setSelected(null); setCursor(null); }}>
      <rect x="4" y="4" width="392" height="312" rx="22" fill="#2c5148" stroke="#8b9e87" strokeWidth="4" />
      {[20, 380].flatMap(x => [20, 300].map(yy => <g key={`${x}-${yy}`}><circle cx={x} cy={yy} r="5" fill="#a1af96" /><path d={`M${x - 3} ${yy}h6`} stroke="#304a3e" /></g>))}
      <text x="200" y="30" textAnchor="middle" fill="#f6df9e" fontSize="13" fontWeight="bold">CRAB / {t('HỘP NỐI 04', 'JUNCTION 04')}</text>
      <rect x="113" y="48" width="174" height="244" rx="12" fill="#173b34" />
      {[140, 200, 260].map(x => <path key={x} d={`M${x} 60V280`} stroke="#274d42" strokeWidth="8" />)}
      {connected.map(color => {
        const sy = y(task.left.indexOf(color)), ey = y(task.right.indexOf(color));
        return <g key={color} fill="none" strokeLinecap="round"><path d={`M74 ${sy}C170 ${sy} 230 ${ey} 326 ${ey}`} stroke="#102c28" strokeWidth="13" /><path d={`M74 ${sy}C170 ${sy} 230 ${ey} 326 ${ey}`} stroke={colors[color]} strokeWidth="8" /></g>;
      })}
      {selected && cursor && <path d={`M${selected.side === 'left' ? 74 : 326} ${y((selected.side === 'left' ? task.left : task.right).indexOf(selected.color))}Q200 ${cursor.y} ${cursor.x} ${cursor.y}`} stroke={colors[selected.color]} strokeWidth="8" fill="none" strokeLinecap="round" pointerEvents="none" />}
      {task.left.map((color, i) => terminal(color, 'left', i))}
      {task.right.map((color, i) => terminal(color, 'right', i))}
    </svg>
  </MgShell>;
}
