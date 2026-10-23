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
      sfx.ok();
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

// door frame inside the scene (matches .ck-shutter-frame), so bolts given in frame space land on the door
const FRAME = { x: .17, w: .66, y: .1, h: .85 };
const OIL_HOME = { x: .085, y: .78 };
const FALL_PER_S = .28, GRACE_MS = 700;

export function StuckShutter({ task, submit }: P<'stuck_shutter'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [lift, setLift] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [turn, setTurn] = useState(0); // degrees the current bolt has been twisted
  const [oil, setOil] = useState<{ x: number; y: number } | null>(null); // oil can while dragged (scene 0..1)
  const [hint, setHint] = useState<[string, 'info' | 'ok' | 'bad']>(['', 'info']);
  const m = useRef({ lift: 0, holding: false, grace: 0, freed: [] as ('oil' | number)[] });
  const scene = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; lift: number; h: number } | null>(null);
  const twist = useRef<{ cx: number; cy: number; a: number; deg: number } | null>(null);
  const jam = task.jams[cleared.length];
  const stuck = jam !== undefined && lift >= jam - .001;
  const bolt = jam !== undefined ? task.bolts[cleared.length] : undefined;
  const boltAt = bolt && { x: FRAME.x + bolt.x * FRAME.w, y: FRAME.y + bolt.y * FRAME.h };

  const setL = (v: number) => { m.current.lift = v; setLift(v); };
  const liftTo = (n: number) => {
    if (sent) return;
    const cap = jam ?? 1;
    const next = Math.max(0, Math.min(cap, n >= .995 ? 1 : n));
    if (next >= cap - .001 && jam !== undefined && m.current.lift < cap - .001) { sfx.bad(); setHint([t('Kẹt chốt rỉ! Nhỏ dầu hoặc vặn ốc một vòng.', 'A rusty bolt! Oil it or twist it one full turn.'), 'bad']); }
    if (Math.abs(next - m.current.lift) > .01) sfx.scrape();
    setL(next);
    if (next >= 1) send({ cleared, lift: 1, freed: m.current.freed });
  };
  const free = (how: 'oil' | number) => {
    if (!stuck || sent || m.current.freed.length !== cleared.length) return;
    m.current.freed = [...m.current.freed, how];
    m.current.grace = GRACE_MS;
    twist.current = null;
    setTurn(0);
    setCleared((c) => [...c, c.length]);
    sfx.ok();
    setHint([how === 'oil' ? t('Trơn rồi! Kéo tiếp nhanh lên.', 'Oiled! Keep pulling, quick.') : t('Lỏng rồi! Kéo tiếp nhanh lên.', 'Loose! Keep pulling, quick.'), 'ok']);
  };
  const twistBy = (deg: number) => {
    const next = turn + deg;
    setTurn(next);
    if (Math.abs(next) >= task.turnDeg) free(Math.round(Math.abs(next)));
  };

  // let go and the door slides back down (a jammed bolt holds it where it is)
  useFrame(!sent, (dt) => {
    const s = m.current;
    if (s.holding || stuck || s.lift <= 0) return;
    if (s.grace > 0) { s.grace -= dt; return; }
    setL(Math.max(0, s.lift - FALL_PER_S * dt / 1000));
  });

  const toScene = (e: { clientX: number; clientY: number }) => rel(e, scene.current!);
  const nearBolt = (p: { x: number; y: number }) => !!boltAt && Math.hypot(p.x - boltAt.x, (p.y - boltAt.y) * .7) < .09;

  return <MgShell bare taskId={task.taskId} tone={sent ? 'ok' : hint[1]} hint={sent ? t('Cửa thông rồi, mời anh giao hàng!', 'The door is open! Delivery coming through.') : hint[0]}>
    <div ref={scene} className="ck-errand ck-shutter-scene">
      <img className="ck-errand-art" src={asset(`maps/game/tasks/${task.taskId}.png`)} alt="" draggable={false} />
      <div className="ck-shutter-frame">
        <div className={`ck-shutter ${stuck ? 'jammed' : ''}`} style={{ height: `${100 - lift * 87}%` }}>
          <div className="ck-shutter-handle" role="slider" tabIndex={0} aria-label={t('Tay nắm cửa cuốn', 'Shutter handle')} aria-valuenow={Math.round(lift * 100)} aria-valuemin={0} aria-valuemax={100}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); m.current.grace = GRACE_MS; liftTo(lift + .08); } }}
            onPointerDown={(e) => { if (sent) return; m.current.holding = true; drag.current = { y: e.clientY, lift, h: e.currentTarget.closest('.ck-shutter-frame')!.getBoundingClientRect().height * .87 }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { const d = drag.current; if (d) liftTo(d.lift + (d.y - e.clientY) / d.h); }}
            onPointerUp={() => { drag.current = null; m.current.holding = false; }}
            onPointerCancel={() => { drag.current = null; m.current.holding = false; }}>━</div>
        </div>
        <span className="ck-shutter-light">{sent ? '✓' : '↑'}</span>
      </div>
      {stuck && boltAt && <button type="button" className={`ck-bolt ${oil && nearBolt(oil) ? 'target' : ''}`} style={{ left: `${boltAt.x * 100}%`, top: `${boltAt.y * 100}%`, '--turn': `${turn}deg` } as CSSProperties}
        aria-label={t('Chốt rỉ: vặn bằng phím mũi tên, Enter để nhỏ dầu', 'Rusty bolt: arrows to twist, Enter to oil')}
        onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); twistBy(e.key === 'ArrowRight' ? 45 : -45); } if (e.key === 'Enter') { e.preventDefault(); free('oil'); } }}
        onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2; twist.current = { cx, cy, a: Math.atan2(e.clientY - cy, e.clientX - cx), deg: 0 }; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => {
          const tw = twist.current; if (!tw) return;
          const a = Math.atan2(e.clientY - tw.cy, e.clientX - tw.cx);
          let d = (a - tw.a) * 180 / Math.PI; if (d > 180) d -= 360; if (d < -180) d += 360;
          tw.a = a; if (Math.abs(d) > .5) { sfx.scrape(); twistBy(d); }
        }}
        onPointerUp={() => { twist.current = null; }} onPointerCancel={() => { twist.current = null; }}>
        <i aria-hidden="true" /><span className="ck-bolt-ring" aria-hidden="true" style={{ '--p': Math.min(1, Math.abs(turn) / task.turnDeg) } as CSSProperties} />
      </button>}
      <div className={`ck-oilcan ${oil ? 'held' : ''} ${stuck ? 'ready' : ''}`} role="button" tabIndex={-1} aria-label={t('Bình dầu', 'Oil can')} style={{ left: `${(oil ?? OIL_HOME).x * 100}%`, top: `${(oil ?? OIL_HOME).y * 100}%` }}
        onPointerDown={(e) => { if (sent) return; e.currentTarget.setPointerCapture(e.pointerId); setOil(toScene(e)); }}
        onPointerMove={(e) => { if (oil) setOil(toScene(e)); }}
        onPointerUp={(e) => { const p = toScene(e); setOil(null); if (stuck && nearBolt(p)) free('oil'); else if (stuck) setHint([t('Đưa bình dầu chạm vào con ốc rỉ.', 'Bring the oil can onto the rusty bolt.'), 'bad']); }}
        onPointerCancel={() => setOil(null)}>
        <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 30h26l6 22H8z" fill="#c9443a" stroke="#173f3a" strokeWidth="3" strokeLinejoin="round" /><path d="M40 34l18-14 2 4-16 16" fill="#e0b25c" stroke="#173f3a" strokeWidth="3" strokeLinejoin="round" /><rect x="20" y="22" width="14" height="9" rx="2" fill="#e0b25c" stroke="#173f3a" strokeWidth="3" /><circle cx="60" cy="27" r="3" fill="#3b2a16" className="ck-oil-drop" /></svg>
      </div>
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
  const rotate = (index: number, n: number) => { const next: [number, number] = [...angles]; next[index] = n; setAngles(next); sfx.scrape(); };
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
  useEffect(() => { if (opened) sfx.ok(); }, [opened]);
  useFrame(opened && !sent, (dt) => { const n = flow + dt / 1200; setFlow(n); if (n >= 1) send({ rotations, opened: true }); });
  return <MgShell bare taskId={task.taskId} status={sent ? '✓' : `${rotations.filter((r, i) => r === task.solution[i]).length}/4`} tone="ok" hint={sent ? t('Nước chảy rồi! Rửa tay sạch trước khi giao.', 'Water is flowing! Clean hands for the delivery.') : ''}>
    <Scene id={task.taskId} className="ck-water-scene"><div className="ck-pipe-board"><svg className="ck-water-routes" viewBox="0 0 200 200" aria-hidden="true"><path d="M -23 20 V 40 Q -23 50 -13 50 H 0 M 200 50 H 216 Q 226 50 226 60 V 204 Q 226 224 206 224 H 172 V 237" className="ck-pipe-shadow" /><path d="M -23 20 V 40 Q -23 50 -13 50 H 0 M 200 50 H 216 Q 226 50 226 60 V 204 Q 226 224 206 224 H 172 V 237" className="ck-pipe-metal" />{opened && <path d="M -23 20 V 40 Q -23 50 -13 50 H 0 M 200 50 H 216 Q 226 50 226 60 V 204 Q 226 224 206 224 H 172 V 237" className="ck-pipe-water" />}</svg><span className="ck-pipe-in">↓</span><span className="ck-pipe-out">↓</span>{turns.map((n, i) => <button key={i} className={`ck-pipe ${opened ? 'flowing' : ''}`} data-testid={`pipe-${i}`} aria-label={t(`Xoay ống ${i + 1}`, `Rotate pipe ${i + 1}`)} disabled={opened || sent} onClick={() => { const next = [...turns]; next[i] = n + 1; setTurns(next); sfx.scrape(); }}><svg viewBox="0 0 100 100" style={{ transform: `rotate(${n * 90}deg)` }} aria-hidden="true"><path d="M50 0 V38 Q50 50 62 50 H100" className="ck-pipe-shadow" /><path d="M50 0 V38 Q50 50 62 50 H100" className="ck-pipe-metal" />{opened && <path d="M50 0 V38 Q50 50 62 50 H100" className="ck-pipe-water" />}</svg><span>{i + 1}</span></button>)}<div className="ck-water-basin"><i style={{ height: `${Math.min(1, flow) * 75}%` } as CSSProperties} />{opened ? '💧' : '· · ·'}</div></div></Scene>
  </MgShell>;
}
