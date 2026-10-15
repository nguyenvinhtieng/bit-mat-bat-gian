/** Khâm Thiên Giám & Nội Các: define the Sóc day, print the calendar, seal it. */
import { useEffect, useRef, useState } from 'react';
import type { TaskData } from '@hidden-truth/shared';
import { MgShell, mg, sfx, useDragDrop, useShake, type Submit } from './kit';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== 1. Xem trăng định ngày Sóc
const PHASE_LABEL: Record<number, string> = { 0: 'Sóc · mồng 1', 2: 'Thượng huyền', 4: 'Vọng · rằm', 6: 'Hạ huyền' };
const PHASE_NAME = ['trăng non (tối hẳn)', 'lưỡi liềm đầu tháng', 'bán nguyệt thượng huyền', 'trăng gần tròn', 'trăng tròn ngày Rằm', 'trăng bắt đầu khuyết', 'bán nguyệt hạ huyền', 'lưỡi liềm cuối tháng'];

export function MoonPhase({ task, submit }: { task: T<'task_moon_phase'>; submit: Submit }) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const byId = Object.fromEntries(task.moons.map((m) => [m.id, m]));
  const tap = (id: string) => {
    if (placed.includes(id) || placed.length === 8) return;
    if (byId[id].phase !== placed.length) {
      sfx.bad();
      setBad(id);
      doShake();
      setMsg(`Chưa đúng — tuần trăng tiếp theo là ${PHASE_NAME[placed.length]}.`);
      setTimeout(() => setBad(null), 450);
      return;
    }
    sfx.ok();
    setMsg('');
    const next = [...placed, id];
    setPlaced(next);
    if (next.length === 8) setTimeout(() => submit(next), 900);
  };
  // drop on the glowing slot (or anywhere on the ring); a wrong slot just points back to the right one
  const dnd = useDragDrop<string>((id, target) => {
    if (target !== 'ring' && Number(target) !== placed.length) {
      sfx.bad();
      doShake();
      setMsg('Đặt vào ô đang sáng — tuần trăng đi theo vòng.');
      return;
    }
    tap(id);
  }, tap);
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${placed.length}/8`}
      tone={placed.length === 8 ? 'ok' : msg ? 'bad' : 'info'}
      hint={placed.length === 8 ? 'Đã định xong ngày Sóc!' : msg || `Tiếp theo: ${PHASE_NAME[placed.length]}.`}
    >
      <div className={`moon-ring ${dnd.dragging ? 'mg-dragging' : ''} ${dnd.over === 'ring' ? 'drop-over' : ''}`} data-drop="ring">
        <div className="moon-ring-center">
          {placed.length === 8 ? 'Đã định xong ngày Sóc!' : placed.length === 0 ? 'Bắt đầu: trăng non (không thấy trăng)' : `Tiếp theo: tuần trăng ${placed.length + 1}/8`}
        </div>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const id = placed[i];
          return (
            <div key={i} className={`moon-slot ${id ? 'filled' : ''} ${i === placed.length ? 'next' : ''} ${dnd.over === String(i) ? 'drop-over' : ''}`} data-drop={id ? undefined : i} style={{ left: `${50 + Math.cos(a) * 40}%`, top: `${50 + Math.sin(a) * 40}%` }}>
              {id && <img src={mg(`hue-mg-moon-${byId[id].phase}`)} alt="" draggable={false} />}
              {id && PHASE_LABEL[i] && <span>{PHASE_LABEL[i]}</span>}
            </div>
          );
        })}
      </div>
      <div className={`moon-tray ${shake}`}>
        {task.moons.map((m) => (
          <button
            key={m.id}
            className={`moon-btn ${placed.includes(m.id) ? 'used' : ''} ${bad === m.id ? 'bad' : ''} ${dnd.dragging === m.id ? 'lifting' : ''}`}
            {...dnd.source(m.id, <img src={mg(`hue-mg-moon-${m.phase}`)} alt="" />, placed.includes(m.id))}
            disabled={placed.includes(m.id)}
          >
            <img src={mg(`hue-mg-moon-${m.phase}`)} alt="" draggable={false} />
          </button>
        ))}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== 2. In lịch bằng mộc bản
const FLIP_CSS: Record<string, string> = { none: 'none', mirror: 'scaleX(-1)', flipV: 'scaleY(-1)', rot180: 'rotate(180deg)' };
const INK_N = 6;

export function WoodblockPrint({ task, submit }: { task: T<'task_woodblock_print'>; submit: Submit }) {
  const [step, setStep] = useState<'pick' | 'ink' | 'press' | 'done'>('pick');
  const [block, setBlock] = useState<string>('');
  const [hint, setHint] = useState('');
  const [shake, doShake] = useShake();
  const [inked, setInked] = useState<Set<number>>(new Set());
  const drawing = useRef(false);
  const inkBox = useRef<HTMLDivElement>(null);
  const [needle, setNeedle] = useState(0);
  const raf = useRef(0);

  const pick = (id: string, flip: string) => {
    if (flip !== 'mirror') {
      sfx.bad();
      doShake();
      setHint(flip === 'none' ? 'Ván này in ra sẽ bị NGƯỢC chữ! Ván khắc phải là ảnh soi gương của chữ.' : 'Ván này in ra chữ bị lật / xoay mất rồi.');
      return;
    }
    sfx.ok();
    setHint('');
    setBlock(id);
    setHint('');
    setStep('ink');
  };
  const dndBlock = useDragDrop<{ id: string; flip: string }>(
    (b, target) => target === 'paper' && pick(b.id, b.flip),
    (b) => pick(b.id, b.flip),
  );
  const inkAt = (e: React.PointerEvent) => {
    const r = inkBox.current!.getBoundingClientRect();
    const cx = Math.floor(((e.clientX - r.left) / r.width) * INK_N);
    const cy = Math.floor(((e.clientY - r.top) / r.height) * INK_N);
    const cells: number[] = [];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < INK_N && y < INK_N) cells.push(y * INK_N + x);
    }
    setInked((prev) => {
      if (cells.every((c) => prev.has(c))) return prev;
      const n = new Set(prev);
      cells.forEach((c) => n.add(c));
      if (n.size >= INK_N * INK_N * 0.9 && prev.size < INK_N * INK_N * 0.9) setTimeout(() => setStep('press'), 350);
      return n;
    });
  };
  useEffect(() => {
    if (step !== 'press') return;
    const t0 = performance.now();
    const tick = () => {
      setNeedle((Math.sin((performance.now() - t0) / 650) + 1) / 2);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [step]);
  const press = () => {
    if (needle > 0.3 && needle < 0.7) {
      cancelAnimationFrame(raf.current);
      sfx.stamp();
      setStep('done');
      setTimeout(() => submit({ block }), 1100);
    } else {
      sfx.bad();
      doShake();
      setHint('Ép lệch lực rồi — chờ kim vào vùng xanh rồi ép lại.');
    }
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      vars={{ glyph: task.glyph }}
      tone={step === 'done' ? 'ok' : hint ? 'bad' : 'info'}
      hint={
        step === 'done'
          ? `Tờ lịch đã in xong: ${task.meaning}.`
          : hint || (step === 'pick' ? 'Kéo ván khắc đúng thả lên tờ giấy bên trái.' : step === 'ink' ? 'Giữ chuột và kéo khắp mặt ván.' : 'Chờ kim vào vùng xanh rồi bấm.')
      }
    >
      <ol className="mg-steps">
        <li className={step === 'pick' ? 'on' : 'done'}>Chọn ván</li>
        <li className={step === 'ink' ? 'on' : step === 'pick' ? '' : 'done'}>Lăn mực</li>
        <li className={step === 'press' ? 'on' : step === 'done' ? 'done' : ''}>Ép giấy</li>
      </ol>
      {step === 'pick' && (
        <div className="wb-pick">
          <div className={`wb-target ${dndBlock.dragging ? 'mg-dragging' : ''} ${dndBlock.over === 'paper' ? 'drop-over' : ''}`} data-drop="paper">
            <img src={mg('hue-mg-paper')} alt="" draggable={false} />
            <b>{task.glyph}</b>
            <small>Bản in cần ra</small>
          </div>
          <div className={`wb-blocks ${shake}`}>
            {task.blocks.map((b) => (
              <button
                key={b.id}
                className={`wb-block ${dndBlock.dragging?.id === b.id ? 'lifting' : ''}`}
                {...dndBlock.source(
                  b,
                  <div className="wb-block">
                    <img src={mg('hue-mg-woodblock')} alt="" />
                    <b style={{ transform: FLIP_CSS[b.flip] }}>{task.glyph}</b>
                  </div>,
                )}
              >
                <img src={mg('hue-mg-woodblock')} alt="" draggable={false} />
                <b style={{ transform: FLIP_CSS[b.flip] }}>{task.glyph}</b>
              </button>
            ))}
          </div>
          {dndBlock.ghost}
        </div>
      )}
      {step === 'ink' && (
        <div
          className="wb-ink"
          ref={inkBox}
          onPointerDown={(e) => {
            drawing.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            inkAt(e);
          }}
          onPointerMove={(e) => drawing.current && inkAt(e)}
          onPointerUp={() => (drawing.current = false)}
        >
          <img src={mg('hue-mg-woodblock')} alt="" draggable={false} />
          <b style={{ transform: 'scaleX(-1)' }}>{task.glyph}</b>
          <div className="wb-grid">
            {Array.from({ length: INK_N * INK_N }, (_, i) => (
              <i key={i} className={inked.has(i) ? 'inked' : ''} />
            ))}
          </div>
          <span className="wb-ink-hint">Kéo chổi mực phủ kín ván · {Math.round((inked.size / (INK_N * INK_N)) * 100)}%</span>
        </div>
      )}
      {(step === 'press' || step === 'done') && (
        <div className={`wb-press ${shake}`}>
          <div className={`wb-sheet ${step === 'done' ? 'printed' : ''}`}>
            <img src={mg('hue-mg-paper')} alt="" draggable={false} />
            <b>{task.glyph}</b>
          </div>
          {step === 'press' && (
            <>
              <div className="gauge">
                <div className="gauge-zone" />
                <div className="gauge-needle" style={{ left: `${needle * 100}%` }} />
              </div>
              <button className="btn primary big" onPointerDown={press}>
                Ép giấy dó
              </button>
            </>
          )}
        </div>
      )}
    </MgShell>
  );
}

// ================================================================== 8. Đóng ấn
export function RoyalSeal({ task, submit }: { task: T<'task_royal_seal'>; submit: Submit }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0.5, y: 0.85 });
  const ptr = useRef({ x: 0.5, y: 0.85 });
  const [hold, setHold] = useState(0);
  const [done, setDone] = useState(false);
  const [shake, doShake] = useShake();
  const [slipped, setSlipped] = useState(false);
  const holding = useRef<number | null>(null);
  const raf = useRef(0);

  useEffect(() => {
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (!done) {
        // the old seal is heavy: it sways a little around the pointer
        const sx = Math.sin(t * 2.0) * 0.018 + Math.sin(t * 4.7) * 0.006;
        const sy = Math.cos(t * 1.7) * 0.016 + Math.sin(t * 4.1) * 0.005;
        const p = { x: ptr.current.x + sx, y: ptr.current.y + sy };
        setPos(p);
        if (holding.current != null) {
          const inside = Math.hypot(p.x - task.target.x, p.y - task.target.y) <= task.tolerance;
          if (!inside) {
            holding.current = null;
            setHold(0);
            setSlipped(true);
            sfx.bad();
            doShake();
          } else {
            const k = Math.min(1, (performance.now() - holding.current) / task.holdMs);
            setHold(k);
            if (k >= 1) {
              holding.current = null;
              setDone(true);
              sfx.stamp();
              setTimeout(() => submit({ x: p.x, y: p.y }), 900);
            }
          }
        }
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    ptr.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };
  const down = (e: React.PointerEvent) => {
    move(e);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (done) return;
    setSlipped(false);
    // the per-frame tick checks the (swaying) seal stays inside the frame while held
    holding.current = performance.now();
  };
  const up = () => {
    if (holding.current != null) {
      holding.current = null;
      setHold(0);
    }
  };
  const near = Math.hypot(pos.x - task.target.x, pos.y - task.target.y) <= task.tolerance;
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={hold > 0 && !done ? `${Math.round(hold * 100)}%` : undefined}
      tone={done ? 'ok' : slipped ? 'bad' : 'info'}
      hint={done ? 'Ấn son đã đóng — lịch sẵn sàng để ban!' : slipped ? 'Ấn trượt ra khỏi khung — đưa vào lại rồi nhấn giữ.' : near ? 'Đúng chỗ rồi! Nhấn giữ cho đến khi vòng đầy.' : 'Rê ấn vào khung đỏ nét đứt.'}
    >
      <div className={`seal-page ${shake}`} ref={box} onPointerMove={move} onPointerDown={down} onPointerUp={up} onPointerLeave={up}>
        <img className="seal-paper" src={mg('hue-mg-lich-page')} alt="" draggable={false} />
        <div className={`seal-target ${near ? 'near' : ''}`} style={{ left: `${task.target.x * 100}%`, top: `${task.target.y * 100}%` }} />
        {done ? (
          <img className="seal-mark" src={mg('hue-mg-an-dau')} alt="" style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }} draggable={false} />
        ) : (
          <div className="seal-tool" style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}>
            <img src={mg('hue-mg-an')} alt="" draggable={false} />
            {hold > 0 && <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" pathLength="1" strokeDasharray={`${hold} 1`} /></svg>}
          </div>
        )}
      </div>
    </MgShell>
  );
}
