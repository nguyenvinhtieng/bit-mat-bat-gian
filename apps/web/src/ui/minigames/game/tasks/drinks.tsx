/** Quán Nước: iced milk coffee (hold to pour) · leech the Wi-Fi (drag the phone around). */
import { useEffect, useRef, useState } from 'react';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { rel, taskArt, useFrame, useOnce, type P } from './shared';

// ================================================================== Pha cà phê sữa đá
export function BrewCoffee({ task, submit }: P<'brew_coffee'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [phase, setPhase] = useState<'milk' | 'coffee'>('milk');
  const [milk, setMilk] = useState(0);
  const [level, setLevel] = useState(0); // total liquid height, 0..1
  const [pouring, setPouring] = useState(false);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const band = phase === 'milk' ? task.milk : task.coffee;

  const spill = () => {
    sfx.bad();
    doShake();
    setPouring(false);
    setLevel(phase === 'milk' ? 0 : milk);
    setHint([t('Lố vạch! Thử lại nhé.', 'Too much! Try again.'), 'bad']);
  };
  useFrame(pouring && !sent, (dt) => {
    // Ease the stream near the mark so touch and keyboard releases get the same reaction window.
    const precision = level >= band[0] - 0.08 ? 0.45 : 1;
    const v = level + (task.rate * precision * dt) / 1000;
    if (v > band[1]) return spill();
    setLevel(v);
  });
  const stop = () => {
    if (!pouring) return;
    setPouring(false);
    if (level < band[0]) return setHint([t('Rót thêm chút nữa.', 'Pour a little more.'), 'bad']);
    sfx.ok();
    if (phase === 'milk') {
      setMilk(level);
      setPhase('coffee');
      setHint([t('Tiếp theo: cà phê.', 'Next: coffee.'), 'ok']);
    } else {
      setHint([t('Chuẩn vị!', 'Perfect!'), 'ok']);
      send({ milk, coffee: level });
    }
  };
  const start = () => { if (sent || pouring) return; setPouring(true); sfx.pour(); };
  // keep the stream audible while the button is held
  useEffect(() => {
    if (!pouring || sent) return;
    const id = setInterval(sfx.pour, 480);
    return () => clearInterval(id);
  }, [pouring, sent]);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <MgShell bare taskId={task.taskId} status={phase === 'milk' ? t('Sữa', 'Milk') : t('Cà phê', 'Coffee')} hint={hint[0]} tone={hint[1]}>
      <div className="ck-coffee">
        <div className={`ck-glass ${shake}`} role="meter"
          aria-label={phase === 'milk' ? t('Mức sữa', 'Milk level') : t('Mức cà phê', 'Coffee level')}
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}
          aria-valuetext={`${Math.round(level * 100)}%, ${t('mục tiêu', 'target')} ${Math.round(band[0] * 100)}–${Math.round(band[1] * 100)}%`}>
          <div className="ck-liquid milk" style={{ height: pct(phase === 'milk' ? level : milk) }} />
          {phase === 'coffee' && <div className="ck-liquid coffee" style={{ bottom: pct(milk), height: pct(level - milk) }} />}
          <div className={`ck-band ${phase}`} style={{ bottom: pct(band[0]), height: pct(band[1] - band[0]) }} />
          {pouring && <div className={`ck-stream ${phase}`} />}
        </div>
        <img className="ck-pourer" src={taskArt(task.taskId, phase === 'milk' ? 'milk' : 'phin')} alt="" draggable={false} />
      </div>
      <button
        className={`ck-hold ${pouring ? 'on' : ''}`}
        disabled={sent}
        onPointerDown={(e) => { if (e.pointerType === 'mouse' && e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); start(); }}
        onPointerUp={stop}
        onPointerCancel={() => setPouring(false)}
        onLostPointerCapture={() => setPouring(false)}
        onBlur={() => setPouring(false)}
        onKeyDown={(e) => { if (e.key !== ' ' && e.key !== 'Enter') return; e.preventDefault(); if (!e.repeat) start(); }}
        onKeyUp={(e) => { if (e.key !== ' ' && e.key !== 'Enter') return; e.preventDefault(); stop(); }}
      >
        {phase === 'milk' ? t('Giữ để rót sữa', 'Hold to pour milk') : t('Giữ để rót cà phê', 'Hold to pour coffee')}
      </button>
    </MgShell>
  );
}

// ================================================================== Bắt wifi ké
const HOLD_MS = 1200;

export function WifiHunt({ task, submit }: P<'wifi_hunt'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [held, setHeld] = useState(0);
  const dragging = useRef(false);
  const anchor = useRef(pos);
  const roomBounds = useRef<DOMRect | null>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const grab = useRef({ x: 0, y: 0 });
  const pending = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const dist = Math.hypot(pos.x - task.spot.x, pos.y - task.spot.y);
  const bars = dist <= task.radius ? 4 : Math.max(0, 3 - Math.floor((dist - task.radius) / 0.12));
  const full = bars === 4;
  const progress = Math.min(1, held / HOLD_MS);
  // one probe ping per signal-bar change, brighter as it gets stronger
  useEffect(() => { if (!sent && bars > 0) sfx.ping(bars / 4); }, [bars]);

  useFrame(full && !sent, (dt) => {
    const h = held + dt;
    setHeld(h);
    if (h >= HOLD_MS) send(pos);
  });
  const locate = (next: { x: number; y: number }) => {
    if (sent) return;
    const distance = Math.hypot(next.x - task.spot.x, next.y - task.spot.y);
    setPos(next);
    // Ignore tiny finger jitter; deliberate movement restarts the connection hold.
    if (distance > task.radius) setHeld(0);
    if (Math.hypot(next.x - anchor.current.x, next.y - anchor.current.y) > 0.012) {
      setHeld(0);
      setTrail((p) => [...p.slice(-11), anchor.current]);
      anchor.current = next;
    }
  };
  // Pointer → room fraction, measured against the padding box the phone's % offsets use.
  const toRoom = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const room = roomBounds.current ?? el.getBoundingClientRect();
    return {
      x: (e.clientX - room.left - el.clientLeft) / el.clientWidth,
      y: (e.clientY - room.top - el.clientTop) / el.clientHeight,
    };
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || sent) return;
    const p = toRoom(e);
    pending.current = {
      x: Math.max(0, Math.min(1, p.x + grab.current.x)),
      y: Math.max(0, Math.min(1, p.y + grab.current.y)),
    };
    if (!frame.current) frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      if (pending.current) locate(pending.current);
      pending.current = null;
    });
  };

  return (
    <MgShell
      bare="head"
      taskId={task.taskId}
      status={<span className="ck-bars" aria-label={`${bars}/4`}>{[1, 2, 3, 4].map((b) => <i key={b} className={b <= bars ? 'on' : ''} style={{ height: 4 + b * 4 }} />)}</span>}
      hint={t('Di chuyển điện thoại tìm nơi có sóng tốt nhất', 'Move the phone to find the strongest signal')}
      tone={full ? 'ok' : 'info'}
    >
      <div
        className={`ck-room ${full ? 'has-signal' : ''}`}
        role="application"
        tabIndex={0}
        aria-label={t('Dò Wi-Fi: kéo điện thoại hoặc dùng phím mũi tên, tìm đủ 4 vạch rồi giữ yên.', 'Find Wi-Fi: drag the phone or use arrow keys, find 4 bars and hold still.')}
        onKeyDown={(e) => {
          const delta = { ArrowLeft: [-0.025, 0], ArrowRight: [0.025, 0], ArrowUp: [0, -0.025], ArrowDown: [0, 0.025] }[e.key];
          if (!delta || sent) return;
          e.preventDefault();
          locate({ x: Math.max(0, Math.min(1, pos.x + delta[0])), y: Math.max(0, Math.min(1, pos.y + delta[1])) });
        }}
        onPointerDown={(e) => {
          if (sent || (e.pointerType === 'mouse' && e.button !== 0)) return;
          roomBounds.current = e.currentTarget.getBoundingClientRect();
          // Grabbing the phone keeps the finger on the same spot of it; tapping elsewhere jumps it there.
          const phone = phoneRef.current?.getBoundingClientRect();
          const onPhone = phone && e.clientX >= phone.left && e.clientX <= phone.right && e.clientY >= phone.top && e.clientY <= phone.bottom;
          const p = toRoom(e);
          grab.current = onPhone ? { x: pos.x - p.x, y: pos.y - p.y } : { x: 0, y: 0 };
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          dragging.current = false;
          cancelAnimationFrame(frame.current);
          frame.current = 0;
          if (pending.current) locate(pending.current);
          pending.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = false;
          cancelAnimationFrame(frame.current);
          frame.current = 0;
          pending.current = null;
        }}
      >
        <div className="ck-scene-caption"><small>{t('Di chuyển điện thoại đến nơi có sóng Wi-Fi mạnh nhất', 'Move the phone to where the Wi-Fi is strongest')}</small></div>
        {trail.map((point, index) => <span key={index} aria-hidden="true" style={{ position: 'absolute', left: `${point.x * 100}%`, top: `${point.y * 100}%`, width: 7, height: 7, borderRadius: '50%', background: '#fff3d2', opacity: .15 + index / 24, pointerEvents: 'none' }} />)}
        <div ref={phoneRef} className={`ck-phone ${full ? 'full' : ''}`} style={{ left: `clamp(36px, ${pos.x * 100}%, calc(100% - 36px))`, top: `clamp(56px, ${pos.y * 100}%, calc(100% - 60px))` }}>
          <span className="ck-phone-shadow" />
          <div className="ck-phone-device">
            <div className="ck-phone-screen">
              <span className="ck-phone-time">16:20</span>
              <svg className="ck-wifi-symbol" viewBox="0 0 32 24" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path className={bars >= 4 ? '' : 'off'} d="M3 7Q16 -3 29 7" /><path className={bars >= 3 ? '' : 'off'} d="M8 12Q16 5 24 12" /><path className={bars >= 2 ? '' : 'off'} d="M12 17Q16 13 20 17" /></g><circle className={bars >= 1 ? '' : 'off'} cx="16" cy="21" r="2" fill="currentColor" /></svg>
              <span className="ck-bars">{[1, 2, 3, 4].map((b) => <i key={b} className={b <= bars ? 'on' : ''} style={{ height: 4 + b * 4 }} />)}</span>
              <span className="ck-phone-label">{sent ? 'OK!' : `${bars}/4`}</span>
            </div>
          </div>
          <span className="ck-signal-tag">{sent ? '✓' : full ? `${Math.round(progress * 100)}%` : `${bars}/4`}</span>
          {full && <span className="ck-ring" style={{ ['--p' as string]: progress }} />}
        </div>
      </div>
      <div className="ck-wifi-meter">
        <progress aria-label={t('Kết nối Wi-Fi', 'Wi-Fi connection')} max={1} value={full ? progress : 0} />
      </div>
    </MgShell>
  );
}
