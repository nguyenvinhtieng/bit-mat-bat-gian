/** Hẻm Cuối: dodge the potholes (lane runner) · hand off the package (ring, snap, slide). */
import { useEffect, useRef, useState } from 'react';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useFrame, useOnce, type P } from './shared';

// ================================================================== Né ổ gà trong hẻm
/** how long an obstacle is on screen before it reaches the bike */
const LEAD_MS = 1500;
const RIDER_Y = 80;
const alleyArt = (name: string) => taskArt('dodge_potholes', name).replace(/\.svg$/, '-v2.webp');

export function DodgePotholes({ task, submit }: P<'dodge_potholes'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [running, setRunning] = useState(false);
  const [, setTick] = useState(0);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const run = useRef({ t: 0, lane: 1, moves: [] as { at: number; lane: number }[] });
  const box = useRef<HTMLDivElement>(null);

  const restart = () => (run.current = { t: 0, lane: 1, moves: [] });
  const steer = (d: number) => {
    const r = run.current;
    if (!running || sent) return;
    const lane = Math.max(0, Math.min(task.lanes - 1, r.lane + d));
    if (lane === r.lane) return;
    r.lane = lane;
    r.moves.push({ at: r.t, lane });
    sfx.scrape();
    setTick((v) => v + 1);
  };

  useFrame(running && !sent, (dt) => {
    const r = run.current;
    const prev = r.t;
    r.t += dt;
    const hit = task.obstacles.find((o) => o.at > prev && o.at <= r.t && o.lane === r.lane);
    if (hit) {
      sfx.bump();
      doShake();
      restart();
      setRunning(false);
      setHint([hit.kind === 'cho' ? t('Gâu! Chó nhà bà Tư rượt. Chạy lại!', 'Woof! Mrs Tư’s dog chased you. Again!') : hit.kind === 'tat-nuoc' ? t('Ướt nhẹp! Ai tạt nước vậy trời. Chạy lại!', 'Soaked! Who threw that water? Again!') : t('Sụp ổ gà! Chạy lại từ đầu hẻm.', 'Into the pothole! Back to the start.'), 'bad']);
    } else if (r.t >= task.duration) {
      setRunning(false);
      setHint([t('Vô tới cuối hẻm, áo vẫn khô!', 'Made it down the alley, still dry!'), 'ok']);
      send({ moves: r.moves });
    }
    setTick((v) => v + 1);
  });

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) e.preventDefault();
      if (e.key === 'ArrowLeft' || e.key === 'a') steer(-1);
      if (e.key === 'ArrowRight' || e.key === 'd') steer(1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });

  const r = run.current;
  const swipe = useRef<number | null>(null);
  const laneX = (l: number) => `${((l + 0.5) / task.lanes) * 100}%`;
  return (
    <MgShell bare taskId={task.taskId} hint={hint[0]} tone={hint[1]}>
      <div
        ref={box}
        className={`ck-alley ${running ? 'is-running' : ''} ${shake}`}
        style={{ backgroundPositionY: `${r.t / 5}px` }}
        role="group"
        aria-label={t('Đường hẻm ba làn', 'Three-lane alley')}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); swipe.current = e.clientX; }}
        onPointerCancel={() => { swipe.current = null; }}
        onPointerUp={(e) => {
          const x0 = swipe.current;
          swipe.current = null;
          if (x0 == null || !box.current) return;
          const dx = e.clientX - x0;
          if (Math.abs(dx) > 30) return steer(Math.sign(dx));
          const rc = box.current.getBoundingClientRect();
          steer(e.clientX < rc.left + rc.width / 2 ? -1 : 1);
        }}
      >
        <div className="ck-alley-distance" aria-hidden="true"><span>{t('HẺM CUỐI', 'THE ALLEY')}</span><b>{Math.min(100, Math.round(r.t / task.duration * 100))}<small>%</small></b></div>
        <div className="ck-alley-progress" aria-hidden="true"><i style={{ height: `${Math.min(100, r.t / task.duration * 100)}%` }} /></div>
        {Array.from({ length: task.lanes - 1 }, (_, i) => (
          <i key={i} className="ck-lane-line" style={{ left: `${((i + 1) / task.lanes) * 100}%`, backgroundPositionY: `${r.t / 4}px` }} />
        ))}
        {task.obstacles.map((o, i) => {
          const y = (r.t - (o.at - LEAD_MS)) / LEAD_MS;
          if (y < -0.1 || y > 1.15) return null;
          return <img key={i} className={`ck-hazard ck-hazard-${o.kind}`} src={alleyArt(o.kind)} alt="" draggable={false} style={{ left: laneX(o.lane), top: `${y * RIDER_Y}%` }} />;
        })}
        <img className="ck-rider" src={alleyArt('rider')} alt={t('Xe máy của bạn', 'Your scooter')} draggable={false} style={{ left: laneX(r.lane), top: `${RIDER_Y}%` }} />
        {!running && !sent && (
          <button className="ck-start" onPointerDown={(e) => e.stopPropagation()} onClick={() => (restart(), setHint(['', 'info']), setRunning(true))}>
            ▶ {t('Chạy vô hẻm', 'Ride in')}
          </button>
        )}
      </div>
      <div className="ck-alley-controls">
        <button type="button" aria-label={t('Sang trái', 'Steer left')} disabled={!running || sent} onClick={() => steer(-1)}>←</button>
        <button type="button" aria-label={t('Sang phải', 'Steer right')} disabled={!running || sent} onClick={() => steer(1)}>→</button>
      </div>
    </MgShell>
  );
}

// ================================================================== Giao hàng tận tay
const SWAY = 60;

export function HandoffPackage({ task, submit }: P<'handoff_package'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [phase, setPhase] = useState<'ring' | 'photo' | 'slide'>('ring');
  const [ring, setRing] = useState(0); // ms the bell has been held
  const [holding, setHolding] = useState(false);
  const [time, setTime] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [slide, setSlide] = useState(0); // 0..1
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const track = useRef<HTMLDivElement>(null);
  const sliding = useRef<number | null>(null);
  const x = Math.sin(time * 0.0028) * SWAY;

  const ringAt = useRef(0);
  useFrame(phase === 'ring' && holding, () => {
    const v = performance.now() - ringAt.current;
    setRing(v);
    if (v >= task.ringMs) {
      sfx.bell();
      setHolding(false);
      setPhase('photo');
      setHint([t('“Có tính tiền gửi xe hông em?” — Chụp ảnh giao hàng đi.', '“Do I pay for parking too?” — Snap the delivery photo.'), 'info']);
    }
  });
  useFrame(phase === 'photo', (dt) => setTime((v) => v + dt));

  const shoot = () => {
    if (Math.abs(x) > task.tolerance) {
      sfx.bad();
      doShake();
      return setHint([t('Ảnh mờ, thùng lệch khung. Chụp lại!', 'Blurry, box out of frame. Again!'), 'bad']);
    }
    sfx.snap();
    setPhoto(x);
    setPhase('slide');
    setHint([t('Ảnh nét! Vuốt “Đã giao” để chốt.', 'Sharp! Slide “Delivered” to confirm.'), 'ok']);
  };
  const finish = () => {
    if (sent) return;
    setSlide(1);
    sfx.handoff();
    setHint([t('Năm sao! Cuốc Cuối hoàn tất.', 'Five stars! The Last Ride is done.'), 'ok']);
    send({ rang: true, photo, slid: true });
  };
  const endSlide = () => {
    if (sliding.current == null) return;
    sliding.current = null;
    if (slide < 0.9) return setSlide(0);
    finish();
  };

  return (
    <MgShell taskId={task.taskId} status={phase === 'ring' ? '🔔' : phase === 'photo' ? '📷' : '✅'} hint={hint[0]} tone={hint[1]}>
      <div className="ck-steps" aria-label={t('Các bước giao hàng', 'Delivery steps')}>
        {[t('1 · Gọi cửa', '1 · Ring'), t('2 · Chụp ảnh', '2 · Photo'), t('3 · Xác nhận', '3 · Confirm')].map((label, i) => <span key={label} className={i === ['ring', 'photo', 'slide'].indexOf(phase) ? 'active' : i < ['ring', 'photo', 'slide'].indexOf(phase) ? 'done' : ''}>{label}</span>)}
      </div>
      <div className={`ck-door ${shake}`}>
        <img className="ck-door-bg" src={taskArt(task.taskId, phase === 'ring' ? 'door' : 'recipient')} alt="" draggable={false} />
        {phase === 'ring' && (
          <button
            className={`ck-bell ${holding ? 'on' : ''}`}
            aria-label={t('Giữ để gọi cửa', 'Hold to ring the doorbell')}
            onKeyDown={(e) => {
              if (![' ', 'Enter'].includes(e.key)) return;
              e.preventDefault();
              if (!e.repeat) { ringAt.current = performance.now(); setHolding(true); }
            }}
            onKeyUp={(e) => {
              if (![' ', 'Enter'].includes(e.key)) return;
              e.preventDefault(); setHolding(false); setRing(0);
            }}
            onBlur={() => { setHolding(false); setRing(0); }}
            onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), (ringAt.current = performance.now()), setHolding(true))}
            onPointerUp={() => (setHolding(false), ring < task.ringMs && (setRing(0), setHint([t('Bấm nhẹ quá, trong nhà không nghe. Giữ lâu hơn.', 'Too short, nobody heard. Hold longer.'), 'bad'])))}
            onPointerCancel={() => (setHolding(false), setRing(0))}
          >
            <img src={taskArt(task.taskId, 'bell')} alt="" draggable={false} />
            <span className="ck-ring" style={{ ['--p' as string]: Math.min(1, ring / task.ringMs) }} />
          </button>
        )}
        {phase !== 'ring' && (
          <div className="ck-viewfinder">
            <img src={taskArt(task.taskId, 'package')} alt="" draggable={false} style={{ transform: `translateX(${phase === 'photo' ? x : photo}px)` }} />
            <i className="ck-frame" style={{ width: task.tolerance * 2 + 60 }} />
          </div>
        )}
      </div>
      {phase === 'photo' && (
        <button className="ck-hold" onClick={shoot}>
          📷 {t('Chụp', 'Snap')}
        </button>
      )}
      {phase === 'slide' && (
        <div
          ref={track}
          className="ck-slide"
          onPointerDown={(e) => !sent && ((sliding.current = e.clientX), e.currentTarget.setPointerCapture(e.pointerId))}
          onPointerMove={(e) => {
            if (sliding.current == null || !track.current) return;
            const w = track.current.getBoundingClientRect().width - 56;
            setSlide(Math.max(0, Math.min(1, (e.clientX - sliding.current) / w)));
          }}
          onPointerUp={endSlide}
          onPointerCancel={() => { sliding.current = null; setSlide(0); }}
          role="slider"
          tabIndex={sent ? -1 : 0}
          aria-label={t('Xác nhận đã giao: kéo sang phải hoặc dùng phím mũi tên', 'Confirm delivery: slide right or use arrow keys')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(slide * 100)}
          onKeyDown={(e) => {
            if (sent || !['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter', ' '].includes(e.key)) return;
            e.preventDefault();
            if (e.key === 'Enter' || e.key === ' ') { if (slide >= 0.9) finish(); return; }
            setSlide(e.key === 'Home' ? 0 : e.key === 'End' ? 1 : Math.max(0, Math.min(1, slide + (e.key === 'ArrowRight' ? 0.1 : -0.1))));
          }}
        >
          <span>{t('Đã giao →', 'Delivered →')}</span>
          <i className="ck-thumb" style={{ left: `calc(${slide} * (100% - 56px))` }} />
        </div>
      )}
    </MgShell>
  );
}
