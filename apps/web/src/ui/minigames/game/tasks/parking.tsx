/** Bãi Giữ Xe: get the bike out (slide puzzle). */
import { useRef, useState } from 'react';
import type { LotBike } from '@giao-keo/shared';
import { MgShell, sfx, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useOnce, type P } from './shared';

// ================================================================== Rút xe ra khỏi bãi
export function UnparkBike({ task, submit }: P<'unpark_bike'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [bikes, setBikes] = useState<LotBike[]>(task.bikes);
  const [selected, setSelected] = useState(task.bikes.find((b) => b.mine)?.id ?? task.bikes[0].id);
  const [moves, setMoves] = useState<{ id: string; d: number }[]>([]);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const drag = useRef<{ id: string; p0: number; steps: number } | null>(null);
  // a drag fires many moves per second: keep the foley from piling up
  const soundAt = useRef({ roll: 0, block: 0 });

  const cellsOf = (b: LotBike) => Array.from({ length: b.len }, (_, k) => (b.dir === 'h' ? `${b.x + k},${b.y}` : `${b.x},${b.y + k}`));
  /** slide one cell if the lot allows it; returns the new lot or null */
  const step = (lot: LotBike[], id: string, d: number) => {
    const b = lot.find((v) => v.id === id)!;
    const n = { ...b, x: b.dir === 'h' ? b.x + d : b.x, y: b.dir === 'v' ? b.y + d : b.y };
    const taken = new Set(lot.filter((v) => v.id !== id).flatMap(cellsOf));
    const ok = cellsOf(n).every((c) => {
      const [x, y] = c.split(',').map(Number);
      return x >= 0 && y >= 0 && x < task.w && y < task.h && !taken.has(c);
    });
    return ok ? lot.map((v) => (v.id === id ? n : v)) : null;
  };

  const moveBike = (id: string, direction: number) => {
    if (sent) return false;
    const next = step(bikes, id, direction);
    const now = performance.now();
    if (!next) {
      if (now - soundAt.current.block > 450) (soundAt.current.block = now), sfx.nudge();
      return false;
    }
    if (now - soundAt.current.roll > 90) (soundAt.current.roll = now), sfx.roll();
    const ms = [...moves, { id, d: direction }];
    setBikes(next);
    setMoves(ms);
    setHint(['', 'info']);
    const me = next.find((v) => v.mine)!;
    if (me.x + me.len === task.w) {
      drag.current = null;
      sfx.rev();
      setHint([t('Ra rồi! Bảo vệ vỗ tay.', 'Out! The guard applauds.'), 'ok']);
      send({ moves: ms });
    }
    return true;
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || sent) return;
    const b = bikes.find((v) => v.id === d.id)!;
    const board = e.currentTarget.getBoundingClientRect();
    const cell = (b.dir === 'h' ? board.width / task.w : board.height / task.h);
    const want = Math.round(((b.dir === 'h' ? e.clientX : e.clientY) - d.p0) / cell);
    if (want === d.steps) return;
    const direction = Math.sign(want - d.steps);
    if (moveBike(d.id, direction)) d.steps += direction;
  };

  return (
    <MgShell bare taskId={task.taskId} status={`${moves.length} ${t('lần đẩy', 'pushes')}`} hint={hint[0]} tone={hint[1]}>
      <div className="ck-lot" style={{ '--cols': task.w, '--rows': task.h, height: 'auto', aspectRatio: `${task.w} / ${task.h}`, backgroundSize: `${100 / task.w}% ${100 / task.h}%` } as React.CSSProperties} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        <div className="ck-gate" style={{ top: `${((bikes.find((b) => b.mine)?.y ?? 0) / task.h) * 100}%`, height: `${100 / task.h}%` }} />
        {bikes.map((b) => (
          <button
            type="button"
            aria-pressed={selected === b.id}
            aria-label={b.mine ? t('Xe của bạn', 'Your bike') : `${t('Xe', 'Bike')} ${b.id}`}
            key={b.id}
            className={`ck-lotbike ${b.dir} ${b.mine ? 'mine' : ''}`}
            style={{ left: `calc(${b.x / task.w * 100}% + 3px)`, top: `calc(${b.y / task.h * 100}% + 3px)`, width: `calc(${(b.dir === 'h' ? b.len : 1) / task.w * 100}% - 6px)`, height: `calc(${(b.dir === 'v' ? b.len : 1) / task.h * 100}% - 6px)`, outline: selected === b.id ? '3px solid #f7d477' : undefined }}
            disabled={sent}
            onClick={() => setSelected(b.id)}
            onKeyDown={(e) => {
              const direction = b.dir === 'h' ? { ArrowLeft: -1, ArrowRight: 1 }[e.key] : { ArrowUp: -1, ArrowDown: 1 }[e.key];
              if (!direction) return;
              e.preventDefault();
              moveBike(b.id, direction);
            }}
            onPointerDown={(e) => {
              setSelected(b.id);
              e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
              drag.current = { id: b.id, p0: b.dir === 'h' ? e.clientX : e.clientY, steps: 0 };
            }}
          >
            <img src={taskArt(task.taskId, b.mine ? 'mine' : 'bike')} alt="" draggable={false} />
          </button>
        ))}
      </div>
    </MgShell>
  );
}
