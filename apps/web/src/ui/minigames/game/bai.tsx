/** Bãi giữ xe chung cư: xếp xe khít như xếp hình. The server re-checks the whole layout. */
import { useEffect, useRef, useState } from 'react';
import type { TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useDragDrop, useShake, type Submit } from '../common/kit';
import { useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;
type Spot = { x: number; y: number; vertical: boolean };
type Bike = { id: string; len: number; crab?: boolean };

const PAINT = ['#d8342c', '#2f6fb5', '#f1efe8', '#2b2d31', '#e2a227', '#7a4fb5'];
const paintOf = (id: string) => PAINT[[...id].reduce((s, c) => s + c.charCodeAt(0), 0) % PAINT.length];

/** Top-down bike, drawn along +x in a len×1 box of 48px cells. */
function BikeArt({ bike, vertical }: { bike: Bike; vertical: boolean }) {
  const L = bike.len * 48;
  const body = bike.crab ? '#00b14f' : paintOf(bike.id);
  const trim = bike.crab ? '#007a37' : 'rgba(0,0,0,0.28)';
  const art =
    bike.len >= 3 ? (
      // ba gác: scooter front + wooden cargo bed with two rear wheels
      <g>
        <rect x="52" y="4" width={L - 58} height="40" rx="3" fill="#a8743e" stroke="#6e4620" strokeWidth="2" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${60 + i * ((L - 74) / 3)} 6 V42`} stroke="#6e4620" strokeWidth="1.5" opacity="0.7" />
        ))}
        <rect x={L - 30} y="0" width="16" height="7" rx="2" fill="#1d1f24" />
        <rect x={L - 30} y="41" width="16" height="7" rx="2" fill="#1d1f24" />
        <rect x="4" y="19" width="16" height="10" rx="4" fill="#1d1f24" />
        <rect x="12" y="15" width="44" height="18" rx="8" fill={body} stroke={trim} strokeWidth="2" />
        <rect x="32" y="17" width="20" height="14" rx="5" fill="#2b2420" />
        <path d="M20 9 V39" stroke="#3a3d42" strokeWidth="3" strokeLinecap="round" />
        <circle cx="20" cy="8" r="3" fill="#c9ced3" />
        <circle cx="20" cy="40" r="3" fill="#c9ced3" />
        <circle cx="8" cy="24" r="3" fill="#ffe58a" />
      </g>
    ) : (
      // xe tay ga
      <g>
        <rect x="3" y="19" width="16" height="10" rx="4" fill="#1d1f24" />
        <rect x={L - 19} y="19" width="16" height="10" rx="4" fill="#1d1f24" />
        <path d={`M14 16 Q14 10 24 11 H${L - 22} Q${L - 10} 12 ${L - 10} 24 Q${L - 10} 36 ${L - 22} 37 H24 Q14 38 14 32Z`} fill={body} stroke={trim} strokeWidth="2" />
        <rect x={L * 0.46} y="15" width={L * 0.36} height="18" rx="7" fill="#2b2420" />
        <path d="M24 7 V41" stroke="#3a3d42" strokeWidth="3" strokeLinecap="round" />
        <circle cx="24" cy="6" r="3" fill="#c9ced3" />
        <circle cx="24" cy="42" r="3" fill="#c9ced3" />
        <circle cx="10" cy="24" r="3" fill="#ffe58a" />
        {bike.crab ? (
          <g>
            <circle cx={L * 0.64} cy="24" r="8" fill="#00b14f" stroke="#e8f8ee" strokeWidth="2" />
            <text x={L * 0.64} y="27" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff">
              🦀
            </text>
          </g>
        ) : (
          <path d={`M${L * 0.5} 24 H${L * 0.78}`} stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeLinecap="round" />
        )}
      </g>
    );
  return vertical ? (
    <svg viewBox={`0 0 48 ${L}`} className="xx-art" aria-hidden>
      <g transform={`translate(48 0) rotate(90)`}>{art}</g>
    </svg>
  ) : (
    <svg viewBox={`0 0 ${L} 48`} className="xx-art" aria-hidden>
      {art}
    </svg>
  );
}

const cellsOf = (len: number, s: Spot) => Array.from({ length: len }, (_, i) => ({ x: s.x + (s.vertical ? 0 : i), y: s.y + (s.vertical ? i : 0) }));

export function XepXe({ task, submit }: { task: T<'task_xep_xe'>; submit: Submit }) {
  const t = useT();
  const [lot, setLot] = useState<Record<string, Spot>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [vertical, setVertical] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const [shake, doShake] = useShake();
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const bikeOf = (id: string) => task.bikes.find((b) => b.id === id)!;
  const pillar = new Set(task.blocked.map((c) => `${c.x},${c.y}`));
  const fits = (id: string, s: Spot) => {
    const taken = new Set(pillar);
    for (const [oid, os] of Object.entries(lot)) if (oid !== id) for (const c of cellsOf(bikeOf(oid).len, os)) taken.add(`${c.x},${c.y}`);
    return cellsOf(bikeOf(id).len, s).every((c) => c.x >= 0 && c.y >= 0 && c.x < task.w && c.y < task.h && !taken.has(`${c.x},${c.y}`));
  };

  const park = (id: string, x: number, y: number) => {
    if (done) return;
    const s = { x, y, vertical };
    if (!fits(id, s)) {
      sfx.bad();
      doShake();
      setMsg(t('Chỗ đó không lọt — đụng cột hoặc đụng xe khác. Thử xoay xe?', 'It won’t fit there — a pillar or another bike is in the way. Try rotating?'));
      return;
    }
    sfx.stamp();
    setMsg('');
    const next = { ...lot, [id]: s };
    setLot(next);
    setSel(null);
    setHover(null);
    if (Object.keys(next).length === task.bikes.length) {
      setDone(true);
      sfx.ok();
      timer.current = window.setTimeout(() => submit(next), 800);
    }
  };
  const dnd = useDragDrop<string>(
    (id, cell) => {
      const [x, y] = cell.split(',').map(Number);
      park(id, x, y);
    },
    (id) => (sfx.scrape(), setSel((s) => (s === id ? null : id))),
  );
  const unpark = (id: string) => {
    if (done) return;
    sfx.scrape();
    setLot(({ [id]: _, ...rest }) => rest);
    setVertical(lot[id].vertical);
    setSel(id);
  };

  // R rotates the bike in hand
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') setVertical((v) => !v);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  const hand = (dnd.dragging as string | null) ?? sel;
  const at = dnd.over ? { x: Number(dnd.over.split(',')[0]), y: Number(dnd.over.split(',')[1]) } : hover;
  const preview = hand && at ? { cells: cellsOf(bikeOf(hand).len, { ...at, vertical }), ok: fits(hand, { ...at, vertical }) } : null;
  const previewSet = new Set(preview?.cells.map((c) => `${c.x},${c.y}`));
  const waiting = task.bikes.filter((b) => !lot[b.id]);
  const box = (s: Spot, len: number) => ({
    left: `${(s.x / task.w) * 100}%`,
    top: `${(s.y / task.h) * 100}%`,
    width: `${((s.vertical ? 1 : len) / task.w) * 100}%`,
    height: `${((s.vertical ? len : 1) / task.h) * 100}%`,
  });

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(lot).length}/${task.bikes.length}`}
      tone={done ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        done
          ? t('Khít rịt! Chú bảo vệ gật gù.', 'Snug as can be! The guard nods.')
          : msg ||
            (hand
              ? t('Chạm ô để đậu (ô đầu xe). Bấm Xoay hoặc phím R để đổi hướng.', 'Tap a cell to park (front of the bike). Press Rotate or R to turn it.')
              : t('Chọn hoặc kéo một chiếc xe vào bãi. Chạm xe đã đậu để dời lại.', 'Pick or drag a bike into the lot. Tap a parked bike to move it.'))
      }
    >
      <div className={`xx ${shake} ${dnd.dragging ? 'mg-dragging' : ''}`}>
        <div className="xx-lot" style={{ aspectRatio: `${task.w} / ${task.h}` }} onPointerLeave={() => setHover(null)}>
          <div className="xx-grid" style={{ gridTemplateColumns: `repeat(${task.w}, 1fr)` }}>
            {Array.from({ length: task.w * task.h }, (_, i) => {
              const x = i % task.w;
              const y = Math.floor(i / task.w);
              const k = `${x},${y}`;
              const isPillar = pillar.has(k);
              return (
                <div
                  key={k}
                  className={`xx-cell ${isPillar ? 'pillar' : ''} ${previewSet.has(k) ? (preview!.ok ? 'pv-ok' : 'pv-bad') : ''}`}
                  data-drop={isPillar ? undefined : k}
                  onPointerEnter={() => hand && setHover({ x, y })}
                  onClick={() => hand && !isPillar && park(hand, x, y)}
                />
              );
            })}
          </div>
          {Object.entries(lot).map(([id, s]) => (
            <button key={id} type="button" className="xx-parked" style={box(s, bikeOf(id).len)} onClick={() => unpark(id)} disabled={done} aria-label="bike">
              <BikeArt bike={bikeOf(id)} vertical={s.vertical} />
            </button>
          ))}
        </div>

        <div className="xx-bar">
          <div className="xx-queue">
            {waiting.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`xx-wait len${b.len} ${sel === b.id ? 'sel' : ''} ${dnd.dragging === b.id ? 'lifting' : ''}`}
                {...dnd.source(b.id, <BikeArt bike={b} vertical={vertical} />, done)}
              >
                <BikeArt bike={b} vertical={false} />
              </button>
            ))}
          </div>
          <button type="button" className="btn xx-rot" onClick={() => (sfx.scrape(), setVertical((v) => !v))} disabled={done}>
            ⟳ {vertical ? t('Dọc', 'Vertical') : t('Ngang', 'Across')}
          </button>
        </div>
      </div>
      {dnd.ghost}
    </MgShell>
  );
}
