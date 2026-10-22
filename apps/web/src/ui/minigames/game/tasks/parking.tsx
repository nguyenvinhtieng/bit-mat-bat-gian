/** Bãi Giữ Xe: get the bike out (slide puzzle) · find the parking ticket (dig through the pocket). */
import { useRef, useState } from 'react';
import type { LotBike } from '@hidden-truth/shared';
import { MgShell, sfx, useShake, type Tone } from '../../common/kit';
import { useT } from '../art';
import { taskArt, useOnce, type P } from './shared';

// ================================================================== Rút xe ra khỏi bãi
const CELL = 72;

export function UnparkBike({ task, submit }: P<'unpark_bike'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [bikes, setBikes] = useState<LotBike[]>(task.bikes);
  const [moves, setMoves] = useState<{ id: string; d: number }[]>([]);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const drag = useRef<{ id: string; p0: number; steps: number } | null>(null);

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

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || sent) return;
    const b = bikes.find((v) => v.id === d.id)!;
    const want = Math.round(((b.dir === 'h' ? e.clientX : e.clientY) - d.p0) / CELL);
    if (want === d.steps) return;
    const dir = Math.sign(want - d.steps);
    const next = step(bikes, d.id, dir);
    if (!next) return;
    d.steps += dir;
    sfx.scrape();
    const ms = [...moves, { id: d.id, d: dir }];
    setBikes(next);
    setMoves(ms);
    const me = next.find((v) => v.mine)!;
    if (me.x + me.len === task.w) {
      drag.current = null;
      setHint([t('Ra rồi! Bảo vệ vỗ tay.', 'Out! The guard applauds.'), 'ok']);
      send({ moves: ms });
    }
  };

  return (
    <MgShell taskId={task.taskId} status={`${moves.length} ${t('lần đẩy', 'pushes')}`} hint={hint[0] || t('Xe xanh là xe của bạn. Cổng ra ở bên phải.', 'The green bike is yours. The gate is on the right.')} tone={hint[1]}>
      <div className="ck-lot" style={{ width: task.w * CELL, height: task.h * CELL }} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
        <div className="ck-gate" style={{ top: (bikes.find((b) => b.mine)?.y ?? 0) * CELL }} />
        {bikes.map((b) => (
          <div
            key={b.id}
            className={`ck-lotbike ${b.dir} ${b.mine ? 'mine' : ''}`}
            style={{ left: b.x * CELL + 3, top: b.y * CELL + 3, width: (b.dir === 'h' ? b.len : 1) * CELL - 6, height: (b.dir === 'v' ? b.len : 1) * CELL - 6 }}
            onPointerDown={(e) => {
              e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
              drag.current = { id: b.id, p0: b.dir === 'h' ? e.clientX : e.clientY, steps: 0 };
            }}
          >
            <img src={taskArt(task.taskId, b.mine ? 'mine' : 'bike')} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </MgShell>
  );
}

// ================================================================== Lục túi tìm vé xe
const JOKES: Record<string, [string, string]> = {
  'vo-keo': ['Vỏ kẹo… kẹo ăn hồi nào không nhớ.', 'A candy wrapper… don’t remember eating it.'],
  'tien-le': ['2 nghìn! Để dành mua trà đá.', '2k dong! Saving it for iced tea.'],
  've-so': ['Vé số trật. Như mọi tuần.', 'A losing lottery ticket. As usual.'],
  'khau-trang': ['Khẩu trang từ năm ngoái…', 'A mask from last year…'],
  'hoa-don': ['Hóa đơn tiền điện. Thôi đừng nhìn.', 'The power bill. Don’t look.'],
  'chia-khoa': ['Chìa khóa nhà ai đây trời?', 'Whose house key is this?'],
  'bat-lua': ['Bật lửa hết gas.', 'An empty lighter.'],
  'day-thun': ['Dây thun. Giữ lại, lỡ cần.', 'A rubber band. Keep it, just in case.'],
};

export function FindTicket({ task, submit }: P<'find_ticket'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fly, setFly] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [hint, setHint] = useState<[string, Tone]>(['', 'info']);
  const [shake, doShake] = useShake();
  const drag = useRef<{ x0: number; y0: number } | null>(null);
  const pile = task.items.filter((i) => !removed.includes(i.id));
  const top = pile[0];

  const takeOut = () => {
    if (!top || sent) return;
    if (top.kind === 've-xe') {
      setHint([t('Thấy vé rồi! Nằm dưới đáy, như mọi lần.', 'Found it! At the bottom, as always.'), 'ok']);
      return send({ removed, ticket: top.id });
    }
    sfx.scrape();
    const j = JOKES[top.kind];
    setHint([j ? t(j[0], j[1]) : top.name, 'info']);
    setRemoved((r) => [...r, top.id]);
    setFly(null);
  };

  return (
    <MgShell taskId={task.taskId} status={`${removed.length} ${t('món đã lấy ra', 'items out')}`} hint={hint[0]} tone={hint[1]}>
      <div className={`ck-pocket ${shake}`}>
        {pile
          .slice(0, 5)
          .reverse()
          .map((it, i, arr) => {
            const isTop = it === top;
            const k = arr.length - 1 - i;
            return (
              <div
                key={it.id}
                className={`ck-junk ${isTop ? 'top' : ''}`}
                style={{
                  transform: isTop && fly ? `translate(${fly.dx}px, ${fly.dy}px) rotate(${fly.dx / 8}deg)` : `translate(${(k % 2 ? 1 : -1) * k * 6}px, ${k * 10}px) rotate(${(k % 3) * 5 - 5}deg)`,
                  zIndex: 10 - k,
                }}
                onPointerDown={(e) => {
                  if (!isTop) return (sfx.bad(), doShake(), setHint([t('Lấy món trên cùng ra trước đã.', 'Take the top one out first.'), 'bad']));
                  drag.current = { x0: e.clientX, y0: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => isTop && drag.current && setFly({ id: it.id, dx: e.clientX - drag.current.x0, dy: e.clientY - drag.current.y0 })}
                onPointerUp={() => {
                  if (!isTop || !drag.current) return;
                  drag.current = null;
                  // a real pull out of the pocket, or a tap on the ticket once it shows
                  if ((fly && Math.hypot(fly.dx, fly.dy) > 60) || it.kind === 've-xe') takeOut();
                  else setFly(null);
                }}
              >
                <img src={taskArt(task.taskId, it.kind)} alt="" draggable={false} />
                <span>{it.name}</span>
              </div>
            );
          })}
        <div className="ck-pocket-lip" />
      </div>
    </MgShell>
  );
}
