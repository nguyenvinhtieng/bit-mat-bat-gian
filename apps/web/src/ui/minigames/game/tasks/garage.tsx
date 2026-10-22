/** Tiệm Sửa Xe: pump the tyre (swipe the handle) · patch the inner tube (find the bubbles). */
import { useRef, useState } from 'react';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useOnce, type P } from './shared';

// ================================================================== Bơm bánh xe
const STROKE_PX = 45;

export function PumpTyre({ task, submit }: P<'pump_tyre'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [strokes, setStrokes] = useState(0);
  const [handle, setHandle] = useState(0); // 0 = up, 1 = pushed down
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const drag = useRef<{ y0: number; armed: boolean } | null>(null);
  const psi = strokes * task.perStroke;
  const green = psi >= task.green[0] && psi <= task.green[1];

  const pump = () => {
    if (sent) return;
    const n = strokes + 1;
    if (n * task.perStroke > task.green[1]) {
      sfx.bad();
      doShake();
      setStrokes(0);
      return setHint([t('BỤP! Nổ ruột rồi. Thay ruột mới, bơm lại từ đầu.', 'POP! Tube’s gone. New tube, pump again.'), 'bad']);
    }
    sfx.drum();
    setStrokes(n);
    setHint(n * task.perStroke >= task.green[0] ? [t('Vào vùng xanh! Bấm “Đủ rồi”.', 'In the green! Press “That’s enough”.'), 'ok'] : ['', 'info']);
  };
  const angle = -120 + (Math.min(psi, task.max) / task.max) * 240;
  const arc = (v: number) => -120 + (v / task.max) * 240;

  return (
    <MgShell taskId={task.taskId} status={`${psi} psi`} hint={hint[0]} tone={hint[1]}>
      <div className="ck-pump-row">
        <div className={`ck-gauge ${shake}`}>
          <svg viewBox="-60 -60 120 90">
            <path d={arcPath(arc(0), arc(task.max))} className="track" />
            <path d={arcPath(arc(task.green[0]), arc(task.green[1]))} className="green" />
            <line x1="0" y1="0" x2="0" y2="-44" className="needle" transform={`rotate(${angle})`} />
            <circle r="5" />
          </svg>
          <img src={taskArt(task.taskId, 'tyre')} alt="" draggable={false} style={{ transform: `scale(${0.85 + Math.min(psi, task.max) / task.max / 4})` }} />
        </div>
        <div
          className="ck-pump"
          onPointerDown={(e) => ((drag.current = { y0: e.clientY, armed: true }), e.currentTarget.setPointerCapture(e.pointerId))}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dy = e.clientY - d.y0;
            setHandle(Math.max(0, Math.min(1, dy / STROKE_PX)));
            if (d.armed && dy > STROKE_PX) (d.armed = false), pump();
            if (!d.armed && dy < 8) d.armed = true;
          }}
          onPointerUp={() => ((drag.current = null), setHandle(0))}
        >
          <div className="ck-pump-handle" style={{ transform: `translateY(${handle * STROKE_PX}px)` }} />
          <div className="ck-pump-body">
            <img src={taskArt(task.taskId, 'pump')} alt="" draggable={false} />
          </div>
        </div>
      </div>
      <div className="ck-swipe-row">
        <button disabled={sent} onClick={pump}>
          ⬇ {t('Bơm', 'Pump')}
        </button>
        <button className="go" disabled={!green || sent} onClick={() => send({ strokes })}>
          {t('Đủ rồi!', 'That’s enough!')}
        </button>
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
  const maxOff = (task.sections - VIEW) * SEG;
  // section whose centre is in the basin (the middle of the window)
  const wet = Math.floor((off + SEG * 1.5) / SEG);

  const tap = (i: number) => {
    if (sent || patched.includes(i)) return;
    if (i !== wet) return setHint([t('Nhúng chỗ đó xuống thau nước trước đã.', 'Dip that part in the water first.'), 'info']);
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
    } else setHint([t('Một chỗ rồi… còn chỗ nữa đang xì.', 'One down… still hissing somewhere.'), 'ok']);
  };

  return (
    <MgShell taskId={task.taskId} status={`🩹 ${patched.length}/${task.leaks.length}`} hint={hint[0]} tone={hint[1]}>
      <div
        className={`ck-basin ${shake}`}
        style={{ width: SEG * VIEW }}
        onPointerDown={(e) => ((drag.current = { x0: e.clientX, off0: off, moved: false }), e.currentTarget.setPointerCapture(e.pointerId))}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (Math.abs(e.clientX - d.x0) > 6) d.moved = true;
          setOff(Math.max(0, Math.min(maxOff, d.off0 - (e.clientX - d.x0))));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (d && !d.moved) {
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left + off;
            tap(Math.floor(x / SEG));
          }
        }}
      >
        <div className="ck-water" style={{ left: SEG, width: SEG }} />
        <div className="ck-tube" style={{ width: SEG * task.sections, transform: `translateX(${-off}px)` }}>
          {Array.from({ length: task.sections }, (_, i) => (
            <div key={i} className={`ck-seg ${i === wet ? 'wet' : ''}`} style={{ width: SEG }}>
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
    </MgShell>
  );
}
