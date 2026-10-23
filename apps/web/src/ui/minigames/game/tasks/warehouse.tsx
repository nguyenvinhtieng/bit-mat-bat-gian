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
  const turnRef = useRef(0);
  const laps = Math.floor((Math.abs(turn) + 0.00001) / (2 * Math.PI));
  const goal = task.laps * 2 * Math.PI;

  const wind = (delta: number) => {
    if (sent) return;
    const before = Math.floor(Math.abs(turnRef.current) / (2 * Math.PI));
    const next = turnRef.current + delta;
    turnRef.current = next;
    const lapsNow = Math.floor(Math.abs(next) / (2 * Math.PI));
    setTurn(next);
    if (lapsNow > before) {
      sfx.scrape();
      setHint([t('Một vòng chắc tay! Tiếp tục cùng chiều.', 'One tight lap! Keep going in the same direction.'), 'ok']);
    }
    if (Math.abs(next) + 0.00001 >= goal) {
      setHint([t('Kín mít! Không ai biết bên trong có gì.', 'Sealed tight! Nobody knows what’s inside.'), 'ok']);
      send({ laps: task.laps });
    }
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (last.current == null || sent) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(x, y) / (r.width / 2);
    const a = Math.atan2(y, x);
    let d = a - last.current;
    if (d > Math.PI) d -= 2 * Math.PI;
    if (d < -Math.PI) d += 2 * Math.PI;
    last.current = a;
    if (dist < 0.55 || dist > 1.1 || Math.abs(d) > Math.PI / 3) {
      return setHint([t('Đi đều theo vòng chấm; cắt ngang thùng không tính nhé.', 'Follow the dotted ring steadily; cutting across the box does not count.'), 'bad']);
    }
    wind(d);
  };
  const pct = Math.min(1, Math.abs(turn) / goal);

  return (
    <MgShell taskId={task.taskId} status={`${laps}/${task.laps} ${t('vòng', 'laps')}`} hint={hint[0] || t('Kéo quanh vòng chấm theo cùng một chiều. Có thể dùng nút Quấn để đi từng đoạn.', 'Trace the dotted ring in one direction, or use Wind to advance in short steps.')} tone={hint[1]}>
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
      <progress value={pct} max={1} aria-label={t('Tiến độ quấn băng keo', 'Tape winding progress')} />
      <div className="ck-swipe-row"><button disabled={sent} onClick={() => wind((turnRef.current < 0 ? -1 : 1) * Math.PI / 4)}>{t('Quấn ⅛ vòng', 'Wind ⅛ lap')} ↻</button></div>
    </MgShell>
  );
}

// ================================================================== Chất hàng lên baga
const STAGE_W = 300;
const stagePct = (px: number) => `${px / STAGE_W * 100}%`;

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

  const H = 34;
  return (
    <MgShell taskId={task.taskId} status={`${n}/${task.boxes.length}`} hint={hint[0] || t('Bấm Bắt đầu, canh bóng thùng chuyển xanh rồi thả. Mỗi thùng phía trên sẽ nhanh hơn.', 'Start, wait for the landing shadow to turn green, then drop. Each new box moves faster.')} tone={hint[1]}>
      <div className={`ck-rack ${shake}`} style={{ width: STAGE_W }} onPointerDown={drop}>
        {cur && started && <div aria-hidden style={{ position: 'absolute', width: stagePct(cur.w), boxSizing: 'border-box', height: 32, left: stagePct(STAGE_W / 2 + x - cur.w / 2), bottom: 74 + n * H, border: `2px dashed ${safe ? '#327e59' : '#b75a3c'}`, borderRadius: 4, background: safe ? '#5da67830' : '#b75a3c20' }} />}
        {cur && (
          <div className="ck-crate swing" style={{ width: stagePct(cur.w), boxSizing: 'border-box', left: stagePct(STAGE_W / 2 + x - cur.w / 2), top: 8 }}>
            <img src={taskArt(task.taskId, cur.kind)} alt="" draggable={false} />
            <span>{cur.name}</span>
          </div>
        )}
        {stack.map((sx, i) => (
          <div key={i} className="ck-crate" style={{ width: stagePct(task.boxes[i].w), boxSizing: 'border-box', left: stagePct(STAGE_W / 2 + sx - task.boxes[i].w / 2), bottom: 74 + i * H }}>
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
