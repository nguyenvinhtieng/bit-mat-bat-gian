/** Sân Thế Miếu, Nội Các, Trường Lang: Cửu Đỉnh, the poem wall and the royal kitchen. */
import { useEffect, useRef, useState } from 'react';
import type { PoemKind, TaskData } from '@hidden-truth/shared';
import { MgShell, mg, sfx, useDragDrop, useShake, type Submit } from './kit';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== 6. Lau bụi Cửu Đỉnh
/** cell boxes on hue-mg-dinh-face (480x480): x = 102 + c*96, y = 112 + r*96, size 84 */
const CELL = (k: number) => ({ x: (102 + (k % 3) * 96) / 480, y: (112 + Math.floor(k / 3) * 96) / 480, s: 84 / 480 });
const SUB = 6;

export function CuuDinh({ task, submit }: { task: T<'task_cuu_dinh'>; submit: Submit }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
  const hits = useRef<Set<number>[]>(task.cells.map(() => new Set()));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<string[]>([]);
  const [bad, setBad] = useState<number | null>(null);
  const [shake, doShake] = useShake();
  const [wrongMsg, setWrongMsg] = useState('');
  const down = useRef<{ x: number; y: number; moved: number } | null>(null);
  const lastScrape = useRef(0);
  const done = found.length === task.targets.length;

  // paint the ash / dust layer
  useEffect(() => {
    canvases.current.forEach((c, k) => {
      if (!c) return;
      const g = c.getContext('2d')!;
      g.globalCompositeOperation = 'source-over';
      // ash: grey base + soft random blotches (seeded per cell so it looks the same each round)
      let seed = 9301 + k * 49297;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      g.fillStyle = '#6f675f';
      g.fillRect(0, 0, c.width, c.height);
      for (let i = 0; i < 140; i++) {
        const v = 95 + Math.floor(rnd() * 70);
        g.fillStyle = `rgba(${v + 12},${v + 6},${v},${0.25 + rnd() * 0.35})`;
        g.beginPath();
        g.arc(rnd() * c.width, rnd() * c.height, 2 + rnd() * 9, 0, Math.PI * 2);
        g.fill();
      }
    });
    hits.current = task.cells.map(() => new Set());
    setRevealed(new Set());
    setFound([]);
  }, [task.cells]);

  const locate = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    for (let k = 0; k < task.cells.length; k++) {
      const c = CELL(k);
      if (fx >= c.x && fx <= c.x + c.s && fy >= c.y && fy <= c.y + c.s) return { k, u: (fx - c.x) / c.s, v: (fy - c.y) / c.s };
    }
    return null;
  };
  const scrub = (e: React.PointerEvent) => {
    const hit = locate(e);
    if (!hit) return;
    const c = canvases.current[hit.k];
    if (!c) return;
    const g = c.getContext('2d')!;
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(hit.u * c.width, hit.v * c.height, c.width * 0.17, 0, Math.PI * 2);
    g.fill();
    const set = hits.current[hit.k];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const sx = Math.floor(hit.u * SUB) + dx, sy = Math.floor(hit.v * SUB) + dy;
        if (sx >= 0 && sy >= 0 && sx < SUB && sy < SUB && Math.abs(dx) + Math.abs(dy) < 2) set.add(sy * SUB + sx);
      }
    if (set.size >= SUB * SUB * 0.5 && !revealed.has(hit.k)) {
      setRevealed((p) => new Set(p).add(hit.k));
      g.clearRect(0, 0, c.width, c.height);
    }
    const now = performance.now();
    if (now - lastScrape.current > 90) {
      sfx.scrape();
      lastScrape.current = now;
    }
  };
  const tap = (e: React.PointerEvent) => {
    const hit = locate(e);
    if (!hit || !revealed.has(hit.k) || done) return;
    const cell = task.cells[hit.k];
    if (found.includes(cell.id)) return;
    if (task.targets.includes(cell.motif)) {
      sfx.ok();
      setWrongMsg('');
      const next = [...found, cell.id];
      setFound(next);
      if (next.length === task.targets.length) setTimeout(() => submit(next), 800);
    } else {
      sfx.bad();
      doShake();
      setWrongMsg(`Hình “${cell.name}” không có trong cuộn giấy.`);
      setBad(hit.k);
      setTimeout(() => setBad(null), 450);
    }
  };
  const foundMotifs = new Set(task.cells.filter((c) => found.includes(c.id)).map((c) => c.motif));

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${found.length}/${task.targets.length}`}
      tone={done ? 'ok' : wrongMsg ? 'bad' : 'info'}
      hint={done ? 'Đã tìm đủ các hình đúc nổi!' : wrongMsg || (revealed.size ? 'Bấm vào hình đã lộ ra nếu nó có trong cuộn giấy.' : 'Nhấn giữ và chà lên các ô để lau tro.')}
    >
      <div className="cd-wrap">
        <div
          className={`cd-urn ${shake}`}
          ref={wrap}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            down.current = { x: e.clientX, y: e.clientY, moved: 0 };
            scrub(e);
          }}
          onPointerMove={(e) => {
            if (!down.current) return;
            down.current.moved += Math.abs(e.clientX - down.current.x) + Math.abs(e.clientY - down.current.y);
            down.current.x = e.clientX;
            down.current.y = e.clientY;
            scrub(e);
          }}
          onPointerUp={(e) => {
            if (down.current && down.current.moved < 12) tap(e);
            down.current = null;
          }}
        >
          <img src={mg('hue-mg-dinh-face')} alt="" draggable={false} />
          {task.cells.map((cell, k) => {
            const b = CELL(k);
            return (
              <div
                key={cell.id}
                className={`cd-cell ${revealed.has(k) ? 'rev' : ''} ${found.includes(cell.id) ? 'found' : ''} ${bad === k ? 'bad' : ''}`}
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.s * 100}%`, height: `${b.s * 100}%` }}
              >
                <img src={mg(`hue-mg-motif-${cell.motif}`)} alt="" draggable={false} />
                <canvas ref={(el) => {
                    canvases.current[k] = el;
                  }} width={84} height={84} />
              </div>
            );
          })}
          <span className="cd-name">{task.urn}</span>
        </div>
        <div className="cd-scroll">
          <b>Cần tìm</b>
          {task.targets.map((m) => {
            const cell = task.cells.find((c) => c.motif === m)!;
            return (
              <div key={m} className={`cd-target ${foundMotifs.has(m) ? 'ok' : ''}`}>
                <img src={mg(`hue-mg-motif-${m}`)} alt="" draggable={false} />
                <span>{cell.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </MgShell>
  );
}

// ================================================================== 7. Tường "nhất thi nhất họa"
type Tile = { kind: PoemKind; theme: string };

function Panel({ tile, themes, dim }: { tile: Tile; themes: T<'task_poem_wall'>['themes']; dim?: boolean }) {
  return tile.kind === 'hoa' ? (
    <div className={`pw-panel ${dim ? 'dim' : ''}`}>
      <img src={mg(`hue-mg-hoa-${tile.theme}`)} alt="" draggable={false} />
    </div>
  ) : (
    <div className={`pw-panel tho ${dim ? 'dim' : ''}`}>
      <img src={mg('hue-mg-tho')} alt="" draggable={false} />
      <b>{themes[tile.theme]?.han}</b>
      <small>{themes[tile.theme]?.name}</small>
    </div>
  );
}

export function PoemWall({ task, submit }: { task: T<'task_poem_wall'>; submit: Submit }) {
  const [sel, setSel] = useState<string | null>(null);
  const [fill, setFill] = useState<Record<number, string>>({});
  const [shake, doShake] = useShake();
  const [msg, setMsg] = useState('');
  const tray = Object.fromEntries(task.tray.map((t) => [t.id, t]));
  const missing = task.panels.filter((p) => !p.kind).map((p) => p.slot);
  const used = new Set(Object.values(fill));
  /** what a slot must hold: alternate poem/painting, same theme as its pair partner */
  const want = (slot: number): Tile => {
    const row = slot >> 2, col = slot & 3;
    const kind: PoemKind = (row + col) % 2 === 0 ? 'tho' : 'hoa';
    const partner = task.panels.find((p) => p.slot === (slot ^ 1))!;
    return { kind, theme: partner.theme! };
  };
  const drop = (slot: number, id = sel) => {
    if (!id || fill[slot] != null) return;
    const t = tray[id];
    const w = want(slot);
    if (t.kind !== w.kind) {
      sfx.bad();
      doShake();
      setMsg(w.kind === 'tho' ? 'Chỗ này cần một ô THƠ — thơ và tranh luôn đặt xen kẽ.' : 'Chỗ này cần một ô TRANH — thơ và tranh luôn đặt xen kẽ.');
      return;
    }
    if (t.theme !== w.theme) {
      sfx.bad();
      doShake();
      setMsg(`Chưa hợp đề tài — ô bên cạnh nói về “${task.themes[w.theme].name}”.`);
      return;
    }
    sfx.ok();
    setMsg('');
    const next = { ...fill, [slot]: id };
    setFill(next);
    setSel(null);
    if (Object.keys(next).length === missing.length) setTimeout(() => submit(next), 800);
  };
  const dnd = useDragDrop<string>(
    (id, slot) => drop(Number(slot), id),
    (id) => (setSel(id), setMsg('')),
  );

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(fill).length}/${missing.length}`}
      tone={Object.keys(fill).length === missing.length ? 'ok' : msg ? 'bad' : 'info'}
      hint={Object.keys(fill).length === missing.length ? 'Bức tường đã trọn vẹn!' : msg || (sel ? 'Giờ bấm vào một ô trống trên tường.' : 'Kéo một ô trong khay bên dưới thả vào chỗ trống trên tường.')}
    >
      <div className={`pw-wall ${shake}`}>
        {task.panels.map((p) => {
          const placed = fill[p.slot] != null ? tray[fill[p.slot]] : null;
          if (p.kind) return <Panel key={p.slot} tile={p as Tile} themes={task.themes} />;
          if (placed) return <Panel key={p.slot} tile={placed} themes={task.themes} />;
          return (
            <button
              key={p.slot}
              className={`pw-panel slot ${sel || dnd.dragging ? 'ready' : ''} ${dnd.over === String(p.slot) ? 'drop-over' : ''}`}
              data-drop={p.slot}
              onClick={() => drop(p.slot)}
            >
              <img src={mg('hue-mg-slot')} alt="" draggable={false} />
            </button>
          );
        })}
      </div>
      <div className="pw-tray">
        {task.tray.map((t) => (
          <button
            key={t.id}
            className={`pw-tile ${sel === t.id ? 'sel' : ''} ${dnd.dragging === t.id ? 'lifting' : ''}`}
            disabled={used.has(t.id)}
            {...dnd.source(t.id, <Panel tile={t} themes={task.themes} />, used.has(t.id))}
          >
            <Panel tile={t} themes={task.themes} dim={used.has(t.id)} />
          </button>
        ))}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== 9. Bánh bèo chén
const TOPPINGS = ['tom', 'mo'];
function nextStepName(done: string[], steps: { id: string; name: string }[]) {
  const n = (id: string) => steps.find((s) => s.id === id)?.name.toLowerCase() ?? id;
  if (!done.includes('bot')) return n('bot');
  if (!done.includes('hap')) return n('hap');
  const tops = TOPPINGS.filter((t) => !done.includes(t));
  if (tops.length) return tops.map(n).join(' và ');
  return n('mam');
}

export function BanhBeo({ task, submit }: { task: T<'task_banh_beo'>; submit: Submit }) {
  const [cup, setCup] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [shake, doShake] = useShake();
  const [msg, setMsg] = useState('');
  // the cup being finished: a short plating animation plays before the next cup is active
  const [plating, setPlating] = useState(false);
  const [served, setServed] = useState(0);
  const finished = cup >= task.cups;

  const allowed = (id: string): string | null => {
    if (done.includes(id)) return 'Bước này đã làm rồi.';
    if (id === 'bot') return null;
    if (!done.includes('bot')) return 'Phải đổ bột vào chén trước!';
    if (id === 'hap') return null;
    if (!done.includes('hap')) return 'Bột chưa hấp chín — cho vào xửng hấp đã.';
    if (TOPPINGS.includes(id)) return null;
    if (id === 'mam' && !TOPPINGS.every((t) => done.includes(t))) return 'Rắc tôm chấy và tóp mỡ trước, nước mắm chan sau cùng.';
    return null;
  };
  const step = (id: string) => {
    if (finished || plating) return;
    const why = allowed(id);
    if (why) {
      sfx.bad();
      doShake();
      setMsg(why);
      return;
    }
    sfx.ok();
    setMsg('');
    const next = [...done, id];
    setDone(next);
    if (next.length === task.steps.length) {
      // all toppings in -> quick plating animation, then announce the cup and move on
      const n = cup + 1;
      setPlating(true);
      setTimeout(() => {
        sfx.ok();
        setPlating(false);
        setServed(n);
        setDone([]);
        setCup(n);
        if (n >= task.cups) setTimeout(() => submit({ cups: n }), 600);
      }, 1200);
    }
  };
  const dnd = useDragDrop<string>((id, target) => target === 'cup' && step(id), step);
  const stateOf = (k: number) => {
    if (k < cup) return 5;
    if (k > cup) return 0;
    if (done.includes('mam')) return 5;
    const tops = TOPPINGS.filter((t) => done.includes(t)).length;
    if (tops) return 2 + tops;
    if (done.includes('hap')) return 2;
    if (done.includes('bot')) return 1;
    return 0;
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      vars={{ cups: String(task.cups) }}
      status={`Chén ${Math.min(cup + 1, task.cups)}/${task.cups}`}
      tone={finished ? 'ok' : msg ? 'bad' : plating || (served === cup && !done.length && served) ? 'ok' : 'info'}
      hint={
        finished
          ? 'Mâm bánh bèo đã sẵn sàng!'
          : msg ||
            (plating
              ? `Đang hoàn thiện chén ${cup + 1}…`
              : served === cup && served && !done.length
                ? `Xong chén ${served}/${task.cups}! Bắt đầu chén tiếp theo.`
                : `Bước tiếp theo: ${nextStepName(done, task.steps)}.`)
      }
    >
      <div className={`bb-tray ${shake}`}>
        {Array.from({ length: task.cups }, (_, k) => (
          <div
            key={k}
            className={`bb-cup ${k === cup ? 'active' : ''} ${k === cup && plating ? 'plating' : ''} ${k < cup ? 'served' : ''} ${k === served - 1 && k === cup - 1 ? 'just-served' : ''} ${k === cup && dnd.dragging ? 'mg-dragging' : ''} ${k === cup && dnd.over === 'cup' ? 'drop-over' : ''}`}
            data-drop={k === cup ? 'cup' : undefined}
          >
            <img src={mg(`hue-mg-chen-${stateOf(k)}`)} alt="" draggable={false} />
            {k === cup && plating && <i className="bb-steam" aria-hidden />}
            {k < cup && <b className="bb-done" aria-hidden>✔</b>}
          </div>
        ))}
      </div>
      <div className="bb-steps">
        {task.steps.map((s) => (
          <button
            key={s.id}
            className={`bb-step ${done.includes(s.id) ? 'used' : ''} ${dnd.dragging === s.id ? 'lifting' : ''}`}
            {...dnd.source(s.id, <img src={mg(`hue-mg-step-${s.id}`)} alt="" />, finished || plating)}
            disabled={finished || plating}
          >
            <img src={mg(`hue-mg-step-${s.id}`)} alt="" draggable={false} />
            <b>{s.name}</b>
          </button>
        ))}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}
