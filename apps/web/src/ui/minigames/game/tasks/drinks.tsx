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
    setLevel(phase === 'milk' ? 0 : milk);
    setHint([t('Lố vạch rồi! Rót lại bước này — gần vạch hãy rót từng chút.', 'Over the line! Retry this step — pour in small bursts near the mark.'), 'bad']);
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
  const start = () => { if (sent || pouring) return; setPouring(true); sfx.scrape(); };
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  return (
    <MgShell taskId={task.taskId} status={phase === 'milk' ? t('Sữa', 'Milk') : t('Cà phê', 'Coffee')} hint={hint[0] || t('Giữ nút hoặc phím Space để rót. Thả trong vùng vạch — gần vạch dòng rót sẽ chậm lại.', 'Hold the button or Space to pour. Release inside the marked band — the stream slows near the target.')} tone={hint[1]}>
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
      <div className="ck-coffee-readout">
        <b>{phase === 'milk' ? t('01 · SỮA ĐẶC', '01 · CONDENSED MILK') : t('02 · CÀ PHÊ PHIN', '02 · DRIP COFFEE')}</b>
        <span>{Math.round(level * 100)}% / {t('vạch', 'target')} {Math.round(band[0] * 100)}–{Math.round(band[1] * 100)}%</span>
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
  const previousDistance = useRef<number | null>(null);
  const [warmer, setWarmer] = useState<boolean | null>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const dist = Math.hypot(pos.x - task.spot.x, pos.y - task.spot.y);
  const bars = dist <= task.radius ? 4 : Math.max(0, 3 - Math.floor((dist - task.radius) / 0.12));
  const full = bars === 4;
  const progress = Math.min(1, held / HOLD_MS);

  useFrame(full && !sent, (dt) => {
    const h = held + dt;
    setHeld(h);
    if (h >= HOLD_MS) send(pos);
  });
  const locate = (next: { x: number; y: number }) => {
    if (sent) return;
    const distance = Math.hypot(next.x - task.spot.x, next.y - task.spot.y);
    if (previousDistance.current !== null && Math.abs(distance - previousDistance.current) > 0.008) {
      setWarmer(distance < previousDistance.current);
      previousDistance.current = distance;
    } else if (previousDistance.current === null) previousDistance.current = distance;
    setPos(next);
    // Ignore tiny finger jitter; deliberate movement restarts the connection hold.
    if (distance > task.radius) setHeld(0);
    if (Math.hypot(next.x - anchor.current.x, next.y - anchor.current.y) > 0.012) {
      setHeld(0);
      setTrail((p) => [...p.slice(-11), anchor.current]);
      anchor.current = next;
    }
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || sent) return;
    locate(rel(e, e.currentTarget));
  };

  return (
    <MgShell
      taskId={task.taskId}
      status={sent ? t('Đã kết nối', 'Connected') : `${bars}/4 ▂▄▆█`.slice(0, 4 + bars)}
      hint={full ? t(`Full vạch! Giữ yên… kết nối “${task.networks[0]}”`, `Full bars! Hold still… joining “${task.networks[0]}”`) : warmer === true ? t('Sóng mạnh hơn! Tiếp tục theo hướng này.', 'Signal is improving! Keep moving this way.') : warmer === false ? t('Sóng yếu đi. Thử đổi hướng.', 'Signal is weaker. Try another direction.') : t('Kéo điện thoại hoặc dùng phím mũi tên. Tìm đủ 4 vạch rồi giữ yên.', 'Drag the phone or use arrow keys. Find all 4 bars and hold still.')}
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
        onPointerDown={(e) => ((dragging.current = true), e.currentTarget.setPointerCapture(e.pointerId), move(e))}
        onPointerMove={move}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        {trail.map((point, index) => <span key={index} aria-hidden="true" style={{ position: 'absolute', left: `${point.x * 100}%`, top: `${point.y * 100}%`, width: 7, height: 7, borderRadius: '50%', background: '#fff3d2', opacity: .15 + index / 24, pointerEvents: 'none' }} />)}
        <div className="ck-scene-caption"><span>{t('DÒ SÓNG WI-FI', 'WI-FI SCANNER')}</span><small>{task.networks[0]}</small></div>
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
      <div className="ck-wifi-meter">
        <span>{full ? t('Đang kết nối', 'Connecting') : t('Giữ yên khi đủ 4 vạch', 'Hold still at 4 bars')}</span>
        <progress aria-label={t('Kết nối Wi-Fi', 'Wi-Fi connection')} max={1} value={full ? progress : 0} />
      </div>
    </MgShell>
  );
}
