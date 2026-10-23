import { createQuietShutter, stepQuietShutter, isQuietShutterComplete, type QuietShutterSample } from '@hidden-truth/shared';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { asset } from '../../../common';
import { MgShell, sfx } from '../../common/kit';
import { useT } from '../art';
import { rel, useFrame, useOnce, type P } from './shared';

function Scene({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return <div className={`ck-errand ${className}`}><img className="ck-errand-art" src={asset(`maps/game/tasks/${id}.png`)} alt="" draggable={false} />{children}</div>;
}

export function UntangleCharger({ task, submit }: P<'untangle_charger'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [released, setReleased] = useState<string[]>([]);
  const [tip, setTip] = useState({ x: .16, y: .8 });
  const drag = useRef(false);
  const releasedRef = useRef<string[]>([]);
  const progress = (p: { x: number; y: number }) => {
    if (sent) return;
    setTip(p);
    const peg = task.pegs[releasedRef.current.length];
    if (peg && Math.hypot(p.x - peg.x, p.y - peg.y) < .115) {
      releasedRef.current = [...releasedRef.current, peg.id];
      setReleased(releasedRef.current);
      sfx.untangle();
    } else if (!peg && Math.hypot(p.x - task.phone.x, p.y - task.phone.y) < .13) {
      send({ released: releasedRef.current, plugged: true });
    }
  };
  const cablePath = `M 9 88 ${task.pegs.slice(released.length).map((p) => `L ${p.x * 100 - 7} ${p.y * 100} C ${p.x * 100 - 13} ${p.y * 100 - 17} ${p.x * 100 + 13} ${p.y * 100 - 17} ${p.x * 100 + 7} ${p.y * 100} C ${p.x * 100 + 4} ${p.y * 100 + 8} ${p.x * 100 - 4} ${p.y * 100 + 8} ${p.x * 100 - 7} ${p.y * 100}`).join(' ')} Q 55 96 ${tip.x * 100} ${tip.y * 100}`;
  return <MgShell bare taskId={task.taskId} status={`${released.length}/${task.pegs.length}`}>
    <Scene id={task.taskId} className="ck-charger">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ck-cable-layer" aria-hidden="true"><path d={cablePath} stroke="#173f3a" strokeWidth="2.4" fill="none" /><path d={cablePath} stroke="#fff3c6" strokeWidth="1.2" fill="none" /></svg>
      {task.pegs.map((p, i) => <span key={p.id} className={`ck-peg ${released.includes(p.id) ? 'freed' : ''} ${i === released.length ? 'next' : ''}`} style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}>{released.includes(p.id) ? '✓' : i + 1}</span>)}
      <div className={`ck-phone ${sent ? 'charging' : released.length === task.pegs.length ? 'ready' : ''}`} style={{ left: `${task.phone.x * 100}%`, top: `${task.phone.y * 100}%` }}><b className="ck-phone-tag">{t('Điện thoại', 'Phone')}</b><span>{sent ? '⚡' : '🔋1%'}</span><i /></div>
      <div className="ck-cable-hit" onPointerDown={(e) => { if (sent) return; drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); progress(rel(e, e.currentTarget)); }} onPointerMove={(e) => { if (drag.current) progress(rel(e, e.currentTarget)); }} onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}><span className="ck-plug" style={{ left: `${tip.x * 100}%`, top: `${tip.y * 100}%` }}>▰</span></div>
    </Scene>
    <div className="ck-errand-controls"><button data-testid="charger-step" disabled={sent} onClick={() => progress(task.pegs[released.length] ?? task.phone)}>{released.length < task.pegs.length ? t('Gỡ chốt tiếp theo', 'Free next peg') : t('Cắm sạc', 'Plug in')}</button></div>
  </MgShell>;
}

function QuietIcon({ kind }: { kind: 'ear' | 'moon' | 'up' | 'check' | 'pause' }) {
  return <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'ear' ? <><path d="M10 12a7 7 0 0 1 14 0c0 7-7 6-7 12a4 4 0 0 1-8 0M14 12a3 3 0 0 1 6 0c0 3-4 3-4 6" /><path d="M27 8q5 8 0 15" /></>
      : kind === 'moon' ? <path d="M24 21A11 11 0 0 1 11 6a11 11 0 1 0 13 15Z" />
      : kind === 'up' ? <><path d="M16 25V7m-7 7 7-7 7 7M7 27h18" /></>
      : kind === 'pause' ? <><path d="M12 8v16M21 8v16" /></>
      : <path d="m7 17 6 6L26 9" />}
  </svg>;
}

export function StuckShutter({ task, submit }: P<'stuck_shutter'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [state, setState] = useState(createQuietShutter);
  const sim = useRef(state);
  const samples = useRef<QuietShutterSample[]>([]);
  const input = useRef({ pending: 0, keyboard: false, active: false });
  const drag = useRef<{ y: number; h: number } | null>(null);
  const [started, setStarted] = useState(false);
  const soundAt = useRef(0);
  const clock = useRef(0);
  const stop = () => { input.current = { pending: 0, keyboard: false, active: false }; drag.current = null; };
  useEffect(() => {
    window.addEventListener('blur', stop);
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    return () => { window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', hidden); };
  }, []);
  useFrame(!sent, (dt) => {
    const i = input.current;
    if (!started && !i.active && !i.pending) return;
    clock.current += dt;
    if (clock.current < 50) return;
    const dtMs = Math.min(100, clock.current);
    clock.current -= dtMs;
    if (samples.current.length >= 5999 || sim.current.elapsedMs + dtMs > 299900) {
      stop(); samples.current = []; clock.current = 0; soundAt.current = 0;
      sim.current = createQuietShutter(); setState(sim.current); setStarted(false);
      return;
    }
    const rise = i.keyboard ? task.quietSpeed * .85 * dtMs / 1000 : Math.min(.8 * dtMs / 1000, i.pending);
    i.pending = Math.max(0, i.pending - rise);
    const sample = { dtMs, rise };
    const next = stepQuietShutter(sim.current, sample, task);
    samples.current.push(sample);
    if (next.alarms > sim.current.alarms) { sfx.bad(); stop(); }
    else if (rise > 0 && next.elapsedMs - soundAt.current > 220) { sfx.shutter(); soundAt.current = next.elapsedMs; }
    sim.current = next;
    setState(next);
    if (isQuietShutterComplete(next)) { stop(); send({ samples: samples.current }); }
  });
  const alarm = state.alarmMs > 0;
  const warning = state.noise >= .55;
  const status = sent ? t('Cửa đã mở', 'Door open') : alarm ? t('Hàng xóm thức giấc. Chờ yên rồi kéo tiếp.', 'Neighbor awake. Wait, then pull gently.') : t('Kéo chậm để giữ yên lặng', 'Pull slowly to stay quiet');
  return <MgShell bare taskId={task.taskId}>
    <div className={`ck-errand ck-quiet-scene ${alarm ? 'alarmed' : ''} ${warning ? 'warning' : ''} ${sent ? 'complete' : ''}`} data-noise={state.noise} data-alarm={alarm}>
      <img className="ck-errand-art" src={asset('maps/game/tasks/quiet-shutter-night-v1.png')} alt="" draggable={false} />
      <div className="ck-quiet-hud">
        <span className="ck-quiet-moon"><QuietIcon kind={sent ? 'check' : 'moon'} /></span>
        <div className="ck-quiet-meter" role="meter" aria-label={t('Tiếng ồn', 'Noise')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(state.noise * 100)}>
          <QuietIcon kind="ear" />
          <div className="ck-quiet-bars" aria-hidden="true">{Array.from({ length: 12 }, (_, n) => <i key={n} className={state.noise * 12 > n ? 'on' : ''} style={{ height: `${24 + n * 6}%` }} />)}</div>
          <QuietIcon kind={alarm ? 'pause' : sent ? 'check' : 'moon'} />
        </div>
      </div>
      <div className="ck-neighbor ck-neighbor-left" aria-hidden="true"><i /><span>{alarm ? '!' : '☾'}</span></div>
      <div className="ck-neighbor ck-neighbor-right" aria-hidden="true"><i /><span>{alarm ? '!' : '☾'}</span></div>
      <div className="ck-shutter-frame">
        <div className="ck-quiet-interior" aria-hidden="true"><QuietIcon kind="check" /></div>
        <div className="ck-shutter" style={{ height: `${100 - state.lift * 87}%` }}>
          <div className="ck-shutter-handle" role="slider" tabIndex={sent ? -1 : 0} aria-label={t('Tay nắm cửa cuốn', 'Shutter handle')} aria-valuenow={Math.round(state.lift * 100)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={status} aria-disabled={sent || alarm}
            onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); if (sent || alarm) return; input.current.keyboard = true; input.current.active = true; setStarted(true); } }}
            onKeyUp={(e) => { if (e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); stop(); } }} onBlur={stop}
            onPointerDown={(e) => { if (sent || alarm) return; setStarted(true); input.current.active = true; drag.current = { y: e.clientY, h: e.currentTarget.closest('.ck-shutter-frame')!.getBoundingClientRect().height * .87 }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { const d = drag.current; if (!d) return; input.current.pending += Math.max(0, (d.y - e.clientY) / d.h); d.y = e.clientY; }}
            onPointerUp={stop} onPointerCancel={stop}>
            <span className="ck-quiet-grip" aria-hidden="true" />
          </div>
        </div>
      </div>
      {!started && <div className="ck-quiet-cue" aria-hidden="true"><QuietIcon kind="up" /><QuietIcon kind="ear" /></div>}
      {(alarm || sent) && <div className="ck-quiet-feedback" aria-hidden="true"><QuietIcon kind={sent ? 'check' : 'pause'} /></div>}
      <span className="ck-quiet-sr" role="status" aria-live="polite">{status}</span>
    </div>
  </MgShell>;
}

export function TuneAntenna({ task, submit }: P<'tune_antenna'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [angles, setAngles] = useState<[number, number]>([10, 170]);
  const [heldMs, setHeldMs] = useState(0);
  const hold = useRef(0);
  const antennaDrag = useRef<number | null>(null);
  const error = Math.max(...angles.map((a, i) => Math.abs(a - task.target[i])));
  const clear = error <= task.tolerance;
  const signal = Math.max(0, 1 - error / 90);
  useFrame(!sent, (dt) => { hold.current = clear ? hold.current + dt : 0; setHeldMs(hold.current); if (hold.current >= task.holdMs) send({ angles, heldMs: Math.ceil(hold.current) }); });
  const rotate = (index: number, n: number) => { const next: [number, number] = [...angles]; next[index] = n; setAngles(next); sfx.click(); };
  useEffect(() => { if (clear && !sent) sfx.ping(1); }, [clear]);
  return <MgShell bare taskId={task.taskId} tone="ok" hint={sent ? t('Rõ rồi! Cả quán xem tiếp được rồi.', 'Crystal clear! The show can go on.') : ''}>
    <Scene id={task.taskId} className="ck-tv-scene"><div className="ck-antenna-arms">{angles.map((angle, i) => <i key={i} role="slider" aria-label={t(`Nhánh anten ${i + 1}`, `Antenna arm ${i + 1}`)} aria-valuenow={angle} aria-valuemin={0} aria-valuemax={180} tabIndex={0} style={{ transform: `rotate(${angle - 90}deg)` }} onKeyDown={(e) => { if (sent) return; if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); rotate(i, Math.max(0, Math.min(180, angle + (e.key === 'ArrowLeft' ? -1 : 1)))); } }} onPointerDown={(e) => { if (sent) return; antennaDrag.current = i; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { if (antennaDrag.current !== i || sent) return; const pivot = e.currentTarget.parentElement!.getBoundingClientRect(); rotate(i, Math.max(0, Math.min(180, Math.round(180 - Math.atan2(pivot.top - e.clientY, e.clientX - pivot.left) * 180 / Math.PI)))); }} onPointerUp={() => { antennaDrag.current = null; }} onPointerCancel={() => { antennaDrag.current = null; }} />)}</div><div className="ck-tv"><div className="ck-tv-screen"><div className="ck-tv-picture"><span>☀</span><i /><b>🛵</b></div><div className="ck-tv-static" style={{ opacity: clear ? .04 : .22 + (1 - signal) * .77 }} /><div className="ck-tv-scan" /><span className={`ck-tv-signal ${clear ? 'clear' : ''}`} role="meter" aria-label={t('Độ rõ sóng', 'Signal')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(signal * 100)}><small>{t('Độ nét', 'Clarity')}</small>{Math.round(signal * 100)}%</span></div><div className="ck-tv-knobs">◉<br />◉</div></div><div className="ck-signal-meter"><i style={{ width: `${Math.min(1, heldMs / task.holdMs) * 100}%` }} /></div></Scene>
    <div className="ck-antenna-controls">{angles.map((angle, i) => <label key={i}>{t(`Anten ${i + 1}`, `Antenna ${i + 1}`)}<input data-testid={`antenna-${i}`} aria-label={t(`Góc anten ${i + 1}`, `Antenna ${i + 1} angle`)} type="range" min="0" max="180" value={angle} disabled={sent} onChange={(e) => rotate(i, Number(e.target.value))} /><small>{angle}°</small></label>)}</div>
  </MgShell>;
}

export function WaterPipes({ task, submit }: P<'water_pipes'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  // Quarter-turn count only ever grows so the CSS transition never spins backwards on 3 → 0.
  const [turns, setTurns] = useState(task.rotations);
  const rotations = turns.map((n) => n % 4);
  const [flow, setFlow] = useState(0);
  const opened = rotations.every((r, i) => r === task.solution[i]);
  useEffect(() => { if (opened) sfx.water(); }, [opened]);
  useFrame(opened && !sent, (dt) => { const n = flow + dt / 1200; setFlow(n); if (n >= 1) send({ rotations, opened: true }); });
  return <MgShell bare taskId={task.taskId} status={sent ? '✓' : `${rotations.filter((r, i) => r === task.solution[i]).length}/4`} tone="ok" hint={sent ? t('Nước chảy rồi! Rửa tay sạch trước khi giao.', 'Water is flowing! Clean hands for the delivery.') : ''}>
    <Scene id={task.taskId} className="ck-water-scene"><div className="ck-pipe-board"><svg className="ck-water-routes" viewBox="0 0 200 200" aria-hidden="true"><path d="M -23 20 V 40 Q -23 50 -13 50 H 0 M 200 50 H 216 Q 226 50 226 60 V 204 Q 226 224 206 224 H 172 V 237" className="ck-pipe-shadow" /><path d="M -23 20 V 40 Q -23 50 -13 50 H 0 M 200 50 H 216 Q 226 50 226 60 V 204 Q 226 224 206 224 H 172 V 237" className="ck-pipe-metal" />{opened && <path d="M -23 20 V 40 Q -23 50 -13 50 H 0 M 200 50 H 216 Q 226 50 226 60 V 204 Q 226 224 206 224 H 172 V 237" className="ck-pipe-water" />}</svg><span className="ck-pipe-in">↓</span><span className="ck-pipe-out">↓</span>{turns.map((n, i) => <button key={i} className={`ck-pipe ${opened ? 'flowing' : ''}`} data-testid={`pipe-${i}`} aria-label={t(`Xoay ống ${i + 1}`, `Rotate pipe ${i + 1}`)} disabled={opened || sent} onClick={() => { const next = [...turns]; next[i] = n + 1; setTurns(next); sfx.click(); }}><svg viewBox="0 0 100 100" style={{ transform: `rotate(${n * 90}deg)` }} aria-hidden="true"><path d="M50 0 V38 Q50 50 62 50 H100" className="ck-pipe-shadow" /><path d="M50 0 V38 Q50 50 62 50 H100" className="ck-pipe-metal" />{opened && <path d="M50 0 V38 Q50 50 62 50 H100" className="ck-pipe-water" />}</svg><span>{i + 1}</span></button>)}<div className="ck-water-basin"><i style={{ height: `${Math.min(1, flow) * 75}%` } as CSSProperties} />{opened ? '💧' : '· · ·'}</div></div></Scene>
  </MgShell>;
}
