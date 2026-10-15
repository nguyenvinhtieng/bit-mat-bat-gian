/** Thủy Đình: ca trù rhythm and water-puppet steering. The server judges every answer. */
import { useEffect, useRef, useState } from 'react';
import type { Pt, TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useShake, type Submit } from '../common/kit';
import { mg, useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== Gõ phách ca trù
export function CaTru({ task, submit }: { task: T<'task_ca_tru'>; submit: Submit }) {
  const t = useT();
  const [phase, setPhase] = useState<'idle' | 'listen' | 'play' | 'done'>('idle');
  const [heard, setHeard] = useState(false);
  const [lit, setLit] = useState(-1);
  const [taps, setTaps] = useState<number[]>([]);
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const timers = useRef<number[]>([]);
  const idle = useRef(0);
  // visual playhead (sound optional): ms since the first tap, so every beat can be seen coming
  const [elapsed, setElapsed] = useState(-1);
  const raf = useRef(0);
  const span = task.beats[task.beats.length - 1] || 1;
  const clearTimers = () => (timers.current.forEach(clearTimeout), (timers.current = []));
  useEffect(() => () => (clearTimers(), clearTimeout(idle.current), cancelAnimationFrame(raf.current)), []);
  const stopHead = () => (cancelAnimationFrame(raf.current), setElapsed(-1));

  const listen = () => {
    clearTimers();
    setPhase('listen');
    setTaps([]);
    setMsg('');
    task.beats.forEach((b, i) => timers.current.push(window.setTimeout(() => (sfx.senh(), setLit(i)), 400 + b)));
    // straight into the player's turn once the pattern has been shown
    timers.current.push(window.setTimeout(() => (setLit(-1), setHeard(true), setPhase('play')), 400 + span + 700));
  };
  const fail = (text: string) => {
    sfx.bad();
    doShake();
    setMsg(text);
    setTaps([]);
    stopHead();
    setPhase('play');
  };
  const tap = () => {
    if (phase !== 'play') return;
    sfx.senh();
    const now = performance.now();
    const next = [...taps, now];
    setTaps(next);
    clearTimeout(idle.current);
    if (next.length === 1) {
      const loop = () => {
        const e = performance.now() - now;
        setElapsed(e);
        if (e < span + task.tolerance) raf.current = requestAnimationFrame(loop);
      };
      raf.current = requestAnimationFrame(loop);
    }
    if (next.length < task.beats.length) {
      // a long silence means the player lost the beat
      idle.current = window.setTimeout(() => fail(t('Hụt nhịp rồi — xem lại và gõ tiếp nhé.', 'You lost the beat — watch again and retry.')), 2000);
      return;
    }
    const rel = next.map((v) => Math.round(v - next[0]));
    const off = task.beats.findIndex((b, i) => Math.abs(rel[i] - b) > task.tolerance);
    if (off >= 0) return fail(t(`Tiếng phách thứ ${off + 1} lệch nhịp — thử lại.`, `Stroke ${off + 1} was off the beat — try again.`));
    stopHead();
    setPhase('done');
    timers.current.push(window.setTimeout(() => sfx.drum(), 250));
    timers.current.push(window.setTimeout(() => submit(rel), 900));
  };
  const relTaps = taps.map((v) => v - taps[0]);

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={phase === 'play' || phase === 'done' ? `${taps.length}/${task.beats.length}` : '♪'}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Quan viên gõ chầu khen: “Hay!”', 'The patron strikes the drum: “Bravo!”')
          : msg ||
            (phase === 'listen'
              ? t('Xem các chấm sáng lần lượt (bật tiếng nếu muốn nghe).', 'Watch the dots light up (sound is optional).')
              : phase === 'play'
                ? taps.length
                  ? t('Gõ khi vạch đỏ chạm chấm đang sáng.', 'Tap when the red line reaches a glowing dot.')
                  : t('Chạm phách để bắt đầu — vạch đỏ sẽ chạy theo nhịp.', 'Tap the clapper to start — a red line will sweep the beats.')
                : t('Bấm “Xem” để đào nương gõ mẫu một lượt.', 'Press “Watch” to see the singer’s pattern once.'))
      }
    >
      <div className="tl-ct">
        <div className="tl-ct-stage">
          <img className={`tl-ct-singer ${lit >= 0 ? 'beat' : ''}`} key={lit} src={mg('tl-mg-dao-nuong')} alt="" />
          <img className="tl-ct-dan" src={mg('tl-mg-dan-day')} alt="" />
          <img className={`tl-ct-drum ${phase === 'done' ? 'beat' : ''}`} src={mg('tl-mg-trong-chau')} alt="" />
        </div>
        <div className="tl-ct-line" aria-hidden>
          {task.beats.map((b, i) => (
            <i
              key={i}
              className={
                i === lit ? 'on' : i < taps.length ? 'hit' : phase === 'play' && (taps.length ? elapsed >= 0 && Math.abs(elapsed - b) <= task.tolerance : i === 0) ? 'cue' : ''
              }
              style={{ left: `${(b / span) * 100}%` }}
            />
          ))}
          {elapsed >= 0 && <u style={{ left: `${Math.min(100, (elapsed / span) * 100)}%` }} />}
          {phase !== 'listen' && relTaps.map((v, i) => <b key={i} style={{ left: `${Math.min(100, (v / span) * 100)}%` }} />)}
        </div>
        <button className={`tl-ct-phach ${shake}`} disabled={phase !== 'play'} onPointerDown={tap}>
          <img src={mg('tl-mg-phach')} alt={t('Phách', 'Clapper')} />
        </button>
        <div className="tl-row">
          <button className={`btn ${heard ? '' : 'primary'}`} disabled={phase === 'listen' || phase === 'done' || (phase === 'play' && taps.length > 0)} onClick={listen}>
            {heard ? t('Xem lại', 'Watch again') : t('Xem', 'Watch')}
          </button>
        </div>
      </div>
    </MgShell>
  );
}

// ================================================================== Điều rối nước
type Sample = Pt & { t: number };

export function RoiNuoc({ task, submit }: { task: T<'task_roi_nuoc'>; submit: Submit }) {
  const t = useT();
  const pond = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pt>(task.start);
  const [next, setNext] = useState(0);
  const [msg, setMsg] = useState('');
  const target = useRef<Pt | null>(null);
  const st = useRef({ pos: task.start, next: 0, path: [] as Sample[], t0: 0, done: false });
  const finished = next === task.marks.length;
  const cb = useRef({ submit, t });
  cb.current = { submit, t };

  useEffect(() => {
    const { t } = cb.current;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = st.current;
      const goal = target.current;
      if (goal && !s.done) {
        if (!s.t0) (s.t0 = now), (s.path = [{ ...s.pos, t: 0 }]);
        const dx = goal.x - s.pos.x, dy = goal.y - s.pos.y;
        const d = Math.hypot(dx, dy);
        const step = Math.min(d, task.speed * 0.9 * dt);
        if (step > 1e-4) {
          s.pos = { x: s.pos.x + (dx / d) * step, y: s.pos.y + (dy / d) * step };
          const l = s.path[s.path.length - 1];
          if (Math.hypot(s.pos.x - l.x, s.pos.y - l.y) >= 0.012) {
            s.path.push({ x: Math.round(s.pos.x * 1000) / 1000, y: Math.round(s.pos.y * 1000) / 1000, t: Math.round(now - s.t0) });
            if (s.path.length > 1800) {
              // wandered too long: start over from the bank
              s.pos = task.start;
              s.next = 0;
              s.t0 = 0;
              target.current = null;
              setNext(0);
              setMsg(t('Con rối bơi lạc quá lâu — đưa lại từ đầu nhé.', 'The puppet drifted too long — start again from the bank.'));
            }
          }
          setPos(s.pos);
        }
        const m = task.marks[s.next];
        if (m && Math.hypot(s.pos.x - m.x, s.pos.y - m.y) <= task.radius * 0.85) {
          s.next++;
          setNext(s.next);
          setMsg('');
          sfx.ok();
          if (s.next === task.marks.length) {
            s.done = true;
            const l = s.path[s.path.length - 1];
            if (l.x !== s.pos.x || l.y !== s.pos.y) s.path.push({ x: s.pos.x, y: s.pos.y, t: Math.round(now - s.t0) });
            setTimeout(() => cb.current.submit(s.path), 700);
          }
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [task]);

  const aim = (e: React.PointerEvent) => {
    const r = pond.current!.getBoundingClientRect();
    target.current = { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) };
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${next}/${task.marks.length}`}
      tone={finished ? 'ok' : msg ? 'bad' : 'info'}
      hint={finished ? t(`${task.puppet} đã bơi hết vòng sóng!`, `${task.puppet} swam through every ripple!`) : msg || t(`Nhấn giữ trên mặt nước để dẫn ${task.puppet} tới vòng số ${next + 1}.`, `Press and hold on the water to lead ${task.puppet} to ring ${next + 1}.`)}
      vars={{ puppet: task.puppet }}
    >
      <div className="tl-rn">
        <img className="tl-rn-dinh" src={mg('tl-mg-thuy-dinh')} alt="" />
        <div
          ref={pond}
          className="tl-rn-pond"
          style={{ backgroundImage: `url(${mg('tl-mg-mat-nuoc')})` }}
          onPointerDown={(e) => ((e.target as HTMLElement).setPointerCapture?.(e.pointerId), aim(e))}
          onPointerMove={(e) => target.current && aim(e)}
          onPointerUp={() => (target.current = null)}
          onPointerCancel={() => (target.current = null)}
        >
          {task.marks.map((m, i) => (
            <span
              key={i}
              className={`tl-rn-mark ${i < next ? 'done' : i === next ? 'next' : ''}`}
              style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, width: `${task.radius * 200}%`, height: `${task.radius * 200}%` }}
            >
              {i + 1}
            </span>
          ))}
          <img className="tl-rn-puppet" src={mg('tl-mg-chu-teu')} alt={task.puppet} style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }} />
        </div>
      </div>
    </MgShell>
  );
}
