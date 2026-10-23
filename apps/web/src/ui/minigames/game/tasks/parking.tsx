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
  const [selected, setSelected] = useState(task.bikes.find((b) => b.mine)?.id ?? task.bikes[0].id);
  const [history, setHistory] = useState<LotBike[][]>([]);
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

  const moveBike = (id: string, direction: number) => {
    if (sent) return false;
    const next = step(bikes, id, direction);
    if (!next) {
      sfx.bad();
      setHint([t('Bị chắn rồi. Dời xe bên cạnh trước nhé.', 'Blocked. Move the neighbouring bike first.'), 'bad']);
      return false;
    }
    sfx.scrape();
    const ms = [...moves, { id, d: direction }];
    setHistory((h) => [...h, bikes]);
    setBikes(next);
    setMoves(ms);
    setHint(['', 'info']);
    const me = next.find((v) => v.mine)!;
    if (me.x + me.len === task.w) {
      drag.current = null;
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
  const selectedBike = bikes.find((b) => b.id === selected)!;

  return (
    <MgShell taskId={task.taskId} status={`${moves.length} ${t('lần đẩy', 'pushes')}`} hint={hint[0] || t('Xe xanh là xe của bạn. Cổng ra ở bên phải.', 'The green bike is yours. The gate is on the right.')} tone={hint[1]}>
      <div className="ck-lot" style={{ width: `min(${task.w * CELL}px, 100%)`, height: 'auto', aspectRatio: `${task.w} / ${task.h}`, backgroundSize: `${100 / task.w}% ${100 / task.h}%` }} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
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
      <div className="ck-swipe-row">
        <button disabled={sent} onClick={() => moveBike(selected, -1)} aria-label={t('Đẩy xe đã chọn lùi', 'Move selected bike back')}>{selectedBike.dir === 'h' ? '←' : '↑'}</button>
        <button disabled={sent} onClick={() => moveBike(selected, 1)} aria-label={t('Đẩy xe đã chọn tới', 'Move selected bike forward')}>{selectedBike.dir === 'h' ? '→' : '↓'}</button>
        <button disabled={sent || !history.length} onClick={() => {
          drag.current = null;
          setBikes(history[history.length - 1]);
          setHistory((h) => h.slice(0, -1));
          setMoves((m) => m.slice(0, -1));
          setHint(['', 'info']);
        }}>{t('Hoàn tác', 'Undo')}</button>
        <button disabled={sent || !moves.length} onClick={() => {
          drag.current = null;
          setBikes(task.bikes); setMoves([]); setHistory([]); setHint(['', 'info']);
        }}>{t('Xếp lại', 'Reset')}</button>
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
    drag.current = null;
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
                  if (sent) return;
                  if (!isTop) return (sfx.bad(), doShake(), setHint([t('Lấy món trên cùng ra trước đã.', 'Take the top one out first.'), 'bad']));
                  drag.current = { x0: e.clientX, y0: e.clientY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerCancel={() => { drag.current = null; setFly(null); }}
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
      <button className="ck-hold" disabled={sent || !top} onClick={takeOut}>
        {top?.kind === 've-xe' ? t('Lấy vé xe', 'Take ticket') : t('Lấy món trên cùng ra', 'Remove top item')}
      </button>
    </MgShell>
  );
}
