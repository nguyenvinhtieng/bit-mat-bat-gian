/** Tiệm Sửa Xe: pump the tyre (hold, mind the heat) · patch the inner tube (find the bubbles). */
import { useEffect, useRef, useState } from 'react';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useFrame, useOnce, type P } from './shared';

// ================================================================== Bơm bánh xe
export function PumpTyre({ task, submit }: P<'pump_tyre'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [view, setView] = useState({ psi: 0, heat: 0 });
  const [held, setHeld] = useState(false);
  const [hot, setHot] = useState(false); // overheated: no air until it cools down
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const s = useRef({ psi: 0, heat: 0, heldMs: 0, held: false, hot: false, popped: false, beat: 0 });
  const inGreen = (v: number) => v >= task.green[0] && v <= task.green[1];

  useFrame(!sent, (dt) => {
    const m = s.current;
    if (m.held && !m.hot && !m.popped) {
      m.psi += (task.rate * dt) / 1000;
      m.heldMs += dt;
      m.heat = Math.min(1, m.heat + (task.heatRate * dt) / 1000);
      if ((m.beat += dt) > 260) (m.beat = 0), sfx.drum();
      if (m.psi > task.green[1]) {
        m.popped = true;
        m.psi = 0;
        sfx.bad();
        doShake();
        setHint([t('BỤP! Bơm lố rồi — thả tay, bơm lại từ đầu.', 'POP! Too much air — let go and start again.'), 'bad']);
      } else if (m.heat >= 1) {
        m.hot = true;
        setHot(true);
        sfx.bad();
        setHint([t('Bơm nóng quá! Thả tay cho nguội.', 'The pump is overheating! Let go to cool it.'), 'bad']);
      }
    } else if (!m.held) {
      m.heat = Math.max(0, m.heat - (task.coolRate * dt) / 1000);
      if (m.hot && m.heat <= 0.3) (m.hot = false), setHot(false);
    }
    setView({ psi: m.psi, heat: m.heat });
  });

  const press = () => {
    if (sent) return;
    s.current.held = true;
    setHeld(true);
  };
  const release = () => {
    const m = s.current;
    if (!m.held) return;
    m.held = false;
    m.popped = false;
    setHeld(false);
    if (inGreen(m.psi)) send({ psi: Math.round(m.psi * 10) / 10, heldMs: Math.ceil(m.heldMs) });
  };

  const psi = Math.min(view.psi, task.max);
  const arc = (v: number) => -120 + (v / task.max) * 240;
  return (
    <MgShell bare taskId={task.taskId} hint={sent ? t('Lốp căng vừa đủ!', 'Just the right pressure!') : hint[0]} tone={sent ? 'ok' : hint[1]}>
      <div className={`ck-pump-row ${shake}`}>
        <div className="ck-gauge">
          <svg viewBox="-60 -60 120 90">
            <path d={arcPath(arc(0), arc(task.max))} className="track" />
            <path d={arcPath(arc(task.green[0]), arc(task.green[1]))} className="green" />
            <line x1="0" y1="0" x2="0" y2="-44" className="needle" transform={`rotate(${arc(psi)})`} />
            <circle r="5" />
            <text y="24" textAnchor="middle" className={`ck-psi ${inGreen(view.psi) ? 'in' : ''}`}>{Math.round(psi)} psi</text>
          </svg>
          <img src={taskArt(task.taskId, 'tyre')} alt="" draggable={false} style={{ transform: `scale(${0.85 + psi / task.max / 4})` }} />
        </div>
        <div className="ck-pump-ctl">
          <div className={`ck-heat ${hot ? 'hot' : view.heat > 0.7 ? 'warn' : ''}`} role="meter" aria-label={t('Độ nóng của bơm', 'Pump heat')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.heat * 100)}>
            <i style={{ '--heat': view.heat } as React.CSSProperties} />
            <span aria-hidden="true">🌡</span>
          </div>
          <button
            type="button"
            className={`ck-pump-btn ${held && !hot ? 'on' : ''} ${hot ? 'hot' : ''}`}
            disabled={sent}
            aria-label={t('Giữ để bơm', 'Hold to pump')}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); press(); }}
            onPointerUp={release}
            onPointerCancel={release}
            onLostPointerCapture={release}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(); } }}
            onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') release(); }}
          >
            <img src={taskArt(task.taskId, 'pump')} alt="" draggable={false} />
            <b>{hot ? t('Đang nguội…', 'Cooling…') : t('Giữ để bơm', 'Hold to pump')}</b>
          </button>
        </div>
      </div>
    </MgShell>
  );
}

const arcPath = (a0: number, a1: number, r = 46) => {
  const p = (a: number) => `${(r * Math.sin((a * Math.PI) / 180)).toFixed(2)} ${(-r * Math.cos((a * Math.PI) / 180)).toFixed(2)}`;
  return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
};

// ================================================================== Vá ruột xe
const SEG = 120; // px per tube section
const VIEW = 3; // sections visible at once; the middle one sits in the water

export function PatchTube({ task, submit }: P<'patch_tube'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [off, setOff] = useState(0); // px the tube is pulled left
  const [patched, setPatched] = useState<number[]>([]);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const drag = useRef<{ x0: number; off0: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false); // the tube follows the finger 1:1, buttons glide it
  const [checked, setChecked] = useState<number[]>([]);
  const maxOff = (task.sections - VIEW) * SEG;
  // section whose centre is in the basin (the middle of the window)
  const wet = Math.floor((off + SEG * 1.5) / SEG);

  useEffect(() => { setChecked((prev) => prev.includes(wet) ? prev : [...prev, wet]); }, [wet]);

  const tap = (i: number) => {
    if (sent || patched.includes(i)) return;
    if (i !== wet) return setHint([t('Nhúng chỗ đó xuống thau nước trước đã.', 'Dip that part in the water first.'), 'bad']);
    if (!task.leaks.includes(i)) {
      sfx.bad();
      doShake();
      return setHint([t('Chỗ này lành mà, không có bọt.', 'No bubbles here — it’s fine.'), 'bad']);
    }
    sfx.stamp();
    const next = [...patched, i];
    setPatched(next);
    if (next.length === task.leaks.length) {
      setHint([t('Vá xong! Cây đinh ba phân cho vô ve chai.', 'Patched! The nail goes in the scrap bin.'), 'ok']);
      send({ patched: next });
    } else setHint(['', 'info']);
  };

  return (
    <MgShell bare taskId={task.taskId} status={`🩹 ${patched.length}/${task.leaks.length}`} hint={hint[0]} tone={hint[1]}>
      <div className="ck-tube-progress" aria-label={t('Các đoạn đã kiểm tra', 'Inspected sections')}>{Array.from({ length: task.sections - 2 }, (_, i) => <i key={i} className={`${checked.includes(i + 1) ? 'checked' : ''} ${wet === i + 1 ? 'active' : ''}`} />)}</div>
      <div
        className={`ck-basin ${shake} ${dragging ? 'dragging' : ''}`}
        onPointerDown={(e) => ((drag.current = { x0: e.clientX, off0: off, moved: false }), e.currentTarget.setPointerCapture(e.pointerId))}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (Math.abs(e.clientX - d.x0) > 6 && !d.moved) (d.moved = true), setDragging(true);
          setOff(Math.max(0, Math.min(maxOff, d.off0 - (e.clientX - d.x0) * (SEG * VIEW / e.currentTarget.getBoundingClientRect().width))));
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false); setOff((v) => Math.round(v / SEG) * SEG); }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          setDragging(false);
          // settle on a whole section so the one in the water lines up with the basin
          if (d?.moved) setOff((v) => Math.round(v / SEG) * SEG);
          if (d && !d.moved) {
            const r = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - r.left) * (SEG * VIEW / r.width) + off;
            tap(Math.floor(x / SEG));
          }
        }}
      >
        <div className="ck-water" style={{ left: '33.333%', width: '33.333%' }} />
        <div className="ck-tube" style={{ width: `${task.sections / VIEW * 100}%`, transform: `translateX(${-off / (SEG * task.sections) * 100}%)` }}>
          {Array.from({ length: task.sections }, (_, i) => (
            <div key={i} className={`ck-seg ${i === wet ? 'wet' : ''}`} style={{ width: `${100 / task.sections}%`, flexShrink: 0 }}>
              <span className="ck-tube-seam" aria-hidden="true" />
              {patched.includes(i) && <img src={taskArt(task.taskId, 'patch')} alt="" draggable={false} />}
              {i === wet && task.leaks.includes(i) && !patched.includes(i) && (
                <span className="ck-bubbles">
                  <img src={taskArt(task.taskId, 'bubble')} alt="" draggable={false} />
                  <img src={taskArt(task.taskId, 'bubble')} alt="" draggable={false} />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="ck-swipe-row">
        <button disabled={sent || off <= 0} onClick={() => setOff((v) => Math.max(0, v - SEG))} aria-label={t('Đoạn trước', 'Previous section')}>←</button>
        <button className="go" disabled={sent || patched.includes(wet)} onClick={() => tap(wet)}>{t('Vá đoạn đang nhúng', 'Patch submerged section')}</button>
        <button disabled={sent || off >= maxOff} onClick={() => setOff((v) => Math.min(maxOff, v + SEG))} aria-label={t('Đoạn sau', 'Next section')}>→</button>
      </div>
    </MgShell>
  );
}
