/** Kho CRAB: tape up the box (circle the finger) · stack the rear rack (tap-to-drop timing). */
import { useRef, useState } from 'react';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useFrame, useOnce, type P } from './shared';

// ================================================================== Quấn băng keo
export function TapeBox({ task, submit }: P<'tape_box'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [turn, setTurn] = useState(0); // radians wound so far
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const last = useRef<number | null>(null);
  const laps = Math.floor(Math.abs(turn) / (2 * Math.PI));
  const goal = task.laps * 2 * Math.PI;

  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (last.current == null || sent) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(x, y) / (r.width / 2);
    if (dist < 0.45) {
      last.current = Math.atan2(y, x);
      return setHint([t('Vòng ra ngoài thùng chứ, quấn vô tay bây giờ!', 'Go around the box, not across it!'), 'bad']);
    }
    const a = Math.atan2(y, x);
    let d = a - last.current;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    last.current = a;
    const next = turn + d;
    const lapsNow = Math.floor(Math.abs(next) / (2 * Math.PI));
    if (lapsNow > laps) {
      sfx.scrape();
      setHint(lapsNow === 1 ? [t('Rẹtttt… ủa, thùng vừa kêu “tít”?', 'Rrrrip… wait, did the box just beep?'), 'info'] : ['', 'info']);
    }
    setTurn(next);
    if (Math.abs(next) >= goal) {
      setHint([t('Kín mít! Không ai biết bên trong có gì.', 'Sealed tight! Nobody knows what’s inside.'), 'ok']);
      send({ laps: lapsNow });
    }
  };
  const pct = Math.min(1, Math.abs(turn) / goal);

  return (
    <MgShell taskId={task.taskId} status={`${laps}/${task.laps} ${t('vòng', 'laps')}`} hint={hint[0]} tone={hint[1]}>
      <div
        className="ck-tape"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const r = e.currentTarget.getBoundingClientRect();
          last.current = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
        }}
        onPointerMove={move}
        onPointerUp={() => (last.current = null)}
        onPointerCancel={() => (last.current = null)}
      >
        <svg viewBox="-100 -100 200 200">
          <circle r="78" className="guide" />
          <circle r="78" className="wound" pathLength={1} strokeDasharray={`${pct} 1`} transform="rotate(-90)" />
        </svg>
        <img src={taskArt(task.taskId, 'box')} alt="" draggable={false} />
        {Array.from({ length: laps }, (_, i) => (
          <i key={i} className="ck-tape-band" style={{ transform: `rotate(${i * 50 - 20}deg)` }} />
        ))}
      </div>
    </MgShell>
  );
}

// ================================================================== Chất hàng lên baga
const STAGE_W = 300;

export function StackRack({ task, submit }: P<'stack_rack'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [stack, setStack] = useState<number[]>([]); // absolute x of each dropped box (0 = rack centre)
  const [time, setTime] = useState(0);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const n = stack.length;
  const cur = task.boxes[n];
  const speed = 0.0022 + n * 0.0006;
  const x = Math.sin(time * speed) * task.swing;
  useFrame(!!cur && !sent, (dt) => setTime((v) => v + dt));

  const drop = () => {
    if (!cur || sent) return;
    const belowX = n ? stack[n - 1] : 0;
    const belowW = n ? task.boxes[n - 1].w : task.base;
    if (Math.abs(x - belowX) > Math.min(belowW, cur.w) / 2) {
      sfx.bad();
      doShake();
      setStack([]);
      return setHint([n === 3 ? t('Sầu riêng rớt! Cả hẻm ngửi thấy luôn. Chất lại!', 'The durian fell! The whole alley can smell it. Again!') : t('Đổ hết rồi! Chất lại từ đầu.', 'It all toppled! Start over.'), 'bad']);
    }
    sfx.stamp();
    const next = [...stack, x];
    setStack(next);
    setHint(['', 'info']);
    if (next.length === task.boxes.length) {
      setHint([t('Vững như kiềng — kể cả thùng sầu riêng.', 'Rock solid — even the durian.'), 'ok']);
      send({ offsets: next.map((v, i) => v - (i ? next[i - 1] : 0)) });
    }
  };

  const H = 34;
  return (
    <MgShell taskId={task.taskId} status={`${n}/${task.boxes.length}`} hint={hint[0]} tone={hint[1]}>
      <div className={`ck-rack ${shake}`} style={{ width: STAGE_W }} onPointerDown={drop}>
        {cur && (
          <div className="ck-crate swing" style={{ width: cur.w, left: STAGE_W / 2 + x - cur.w / 2, top: 8 }}>
            <img src={taskArt(task.taskId, cur.kind)} alt="" draggable={false} />
            <span>{cur.name}</span>
          </div>
        )}
        {stack.map((sx, i) => (
          <div key={i} className="ck-crate" style={{ width: task.boxes[i].w, left: STAGE_W / 2 + sx - task.boxes[i].w / 2, bottom: 74 + i * H }}>
            <img src={taskArt(task.taskId, task.boxes[i].kind)} alt="" draggable={false} />
            <span>{task.boxes[i].name}</span>
          </div>
        ))}
        <div className="ck-baga" style={{ width: task.base, left: STAGE_W / 2 - task.base / 2 }} />
        <img className="ck-bike" src={taskArt(task.taskId, 'bike')} alt="" draggable={false} />
      </div>
    </MgShell>
  );
}
