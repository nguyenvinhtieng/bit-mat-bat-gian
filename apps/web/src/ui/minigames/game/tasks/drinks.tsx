/** Quán Nước: iced milk coffee (hold to pour) · leech the Wi-Fi (drag the phone around). */
import { useRef, useState } from 'react';
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
    setPhase('milk');
    setMilk(0);
    setLevel(0);
    setHint([t('Lố rồi! “Ly này của tui, làm ly khác đi.”', 'Too much! “I’ll drink this one, make another.”'), 'bad']);
  };
  useFrame(pouring && !sent, (dt) => {
    const v = level + (task.rate * dt) / 1000;
    if (v > band[1]) return spill();
    setLevel(v);
  });
  const stop = () => {
    if (!pouring) return;
    setPouring(false);
    if (level < band[0]) return setHint([t('Chưa tới vạch, giữ rót thêm.', 'Not at the line yet, keep pouring.'), 'info']);
    sfx.ok();
    if (phase === 'milk') {
      setMilk(level);
      setPhase('coffee');
      setHint([t('Sữa vừa đủ. Giờ tới cà phê phin!', 'Milk’s right. Now the drip coffee!'), 'ok']);
    } else {
      setHint([t('Khuấy khuấy… chuẩn vị quán cóc!', 'Stir stir… just like the street stall!'), 'ok']);
      send({ milk, coffee: level });
    }
  };
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <MgShell taskId={task.taskId} status={phase === 'milk' ? t('Sữa', 'Milk') : t('Cà phê', 'Coffee')} hint={hint[0]} tone={hint[1]}>
      <div className="ck-coffee">
        <div className={`ck-glass ${shake}`}>
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
        onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), setPouring(true), sfx.scrape())}
        onPointerUp={stop}
        onPointerCancel={stop}
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
  const dist = Math.hypot(pos.x - task.spot.x, pos.y - task.spot.y);
  const bars = dist <= task.radius ? 4 : Math.max(0, 3 - Math.floor((dist - task.radius) / 0.12));
  const full = bars === 4;
  const progress = Math.min(1, held / HOLD_MS);

  useFrame(full && !sent, (dt) => {
    const h = held + dt;
    setHeld(h);
    if (h >= HOLD_MS) send(pos);
  });
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || sent) return;
    setPos(rel(e, e.currentTarget));
    setHeld(0);
  };

  return (
    <MgShell
      taskId={task.taskId}
     
      status={'▂▄▆█'.slice(0, bars) || '✕'}
      hint={full ? t(`Full vạch! Giữ yên… kết nối “${task.networks[0]}”`, `Full bars! Hold still… joining “${task.networks[0]}”`) : bars ? t('Có sóng… đi tiếp chút nữa.', 'Some signal… keep moving.') : t('Mất sóng. Thử góc khác.', 'No signal. Try another corner.')}
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
          setPos((p) => ({ x: Math.max(0, Math.min(1, p.x + delta[0])), y: Math.max(0, Math.min(1, p.y + delta[1])) }));
          setHeld(0);
        }}
        onPointerDown={(e) => ((dragging.current = true), e.currentTarget.setPointerCapture(e.pointerId), move(e))}
        onPointerMove={move}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div className={`ck-phone ${full ? 'full' : ''}`} style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}>
          <span className="ck-phone-shadow" />
          <div className="ck-phone-device">
            <div className="ck-phone-screen">
              <span className="ck-phone-time">16:20</span>
              <span className="ck-wifi-symbol" aria-hidden="true">◔</span>
              <span className="ck-bars">{[1, 2, 3, 4].map((b) => <i key={b} className={b <= bars ? 'on' : ''} style={{ height: 4 + b * 4 }} />)}</span>
              <span className="ck-phone-label">{sent ? 'OK!' : `${bars}/4`}</span>
            </div>
          </div>
          <span className="ck-signal-tag">{sent ? t('Đã kết nối', 'Connected') : full ? `${Math.round(progress * 100)}%` : t('Đang dò…', 'Searching…')}</span>
          {full && <span className="ck-ring" style={{ ['--p' as string]: progress }} />}
        </div>
      </div>
    </MgShell>
  );
}
