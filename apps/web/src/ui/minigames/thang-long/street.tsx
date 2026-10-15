/** Phố Hàng Trống + Phố Ông Đồ: Đông Hồ colours, xin chữ (tracing), câu đối. The server judges every answer. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pt, TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useDragDrop, useShake, type Submit } from '../common/kit';
import { mg, useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

/** Assign each source item to one target (one-to-one), by drag or tap-then-tap. */
function usePairs(onPlace?: () => void) {
  const [pairs, setPairs] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const place = (item: string, target: string) => {
    onPlace?.();
    setPicked(null);
    setPairs((p) => {
      const n = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== item));
      n[target] = item;
      return n;
    });
  };
  const clear = (target: string) => setPairs(({ [target]: _, ...rest }) => rest);
  const dnd = useDragDrop<string>(place, (item) => setPicked((p) => (p === item ? null : item)));
  /** tap on a target: place the picked item there, or clear it */
  const tapTarget = (target: string) => (picked ? place(picked, target) : clear(target));
  return { pairs, picked, dnd, tapTarget };
}

// ================================================================== Pha màu tranh Đông Hồ
/** colour name -> printed layer (black outline is printed last, so it sits on top) */
const LAYER = (name: string) => {
  const n = name.toLowerCase();
  if (n.startsWith('đen')) return { art: 'tl-mg-tranh-den', z: 5, van: 'tl-mg-van-den' };
  if (n.startsWith('đỏ')) return { art: 'tl-mg-tranh-do', z: 3, van: 'tl-mg-van-do' };
  if (n.startsWith('vàng')) return { art: 'tl-mg-tranh-vang', z: 2, van: 'tl-mg-van-vang' };
  if (n.startsWith('xanh')) return { art: 'tl-mg-tranh-xanh', z: 4, van: 'tl-mg-van-xanh' };
  return null;
};

export function DongHo({ task, submit }: { task: T<'task_dong_ho'>; submit: Submit }) {
  const t = useT();
  const { pairs, picked, dnd, tapTarget } = usePairs(sfx.scrape);
  const [sent, setSent] = useState(false);
  const full = task.colors.every((c) => pairs[c.id]);
  const used = new Set(Object.values(pairs));
  const srcName = (id: string) => task.sources.find((s) => s.id === id)?.name ?? '';
  const print = () => {
    setSent(true);
    sfx.stamp();
    setTimeout(() => submit(pairs), 600);
  };
  // every jar filled -> print straight away, no confirm button
  useEffect(() => {
    if (full && !sent) print();
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(pairs).length}/${task.colors.length}`}
      tone={sent ? 'ok' : 'info'}
      hint={sent ? t('Đang in tranh…', 'Printing…') : t('Kéo mỗi nguyên liệu vào chum màu nó tạo ra. Chạm chum để bỏ ra.', 'Drag each material onto the colour it makes. Tap a jar to clear it.')}
      vars={{ painting: task.painting }}
    >
      <div className={`tl-dh ${dnd.dragging ? 'mg-dragging' : ''}`}>
        <figure className="tl-dh-print">
          <img src={mg('tl-mg-giay-diep')} alt="" />
          {/* faint key-block outline so the player sees which painting they print */}
          {!pairs[task.colors.find((c) => LAYER(c.name)?.z === 5)?.id ?? ''] && <img className="ghost" src={mg('tl-mg-tranh-den')} alt="" style={{ zIndex: 5 }} />}
          {task.colors.map((c) => {
            const l = LAYER(c.name);
            return l && pairs[c.id] ? <img key={c.id} src={mg(l.art)} alt="" style={{ zIndex: l.z }} className={sent ? 'pressed' : ''} /> : null;
          })}
          <figcaption>{task.painting}</figcaption>
        </figure>
        <div className="tl-dh-jars">
          {task.colors.map((c) => (
            <button key={c.id} className={`tl-dh-jar ${dnd.over === c.id ? 'drop-over' : ''} ${picked ? 'invite' : ''}`} data-drop={c.id} onClick={() => !sent && tapTarget(c.id)}>
              <i style={{ background: c.hex }} />
              <b>{c.name}</b>
              <small>{pairs[c.id] ? srcName(pairs[c.id]) : '…'}</small>
            </button>
          ))}
        </div>
        <div className="tl-tray">
          {task.sources.map((s) => (
            <button key={s.id} className={`tl-chip ${used.has(s.id) ? 'used' : ''} ${picked === s.id ? 'sel' : ''}`} {...dnd.source(s.id, <span className="tl-chip">{s.name}</span>, sent)}>
              {s.hex && <i className="tl-sw" style={{ background: s.hex }} />}
              <span>{s.name}</span>
            </button>
          ))}
        </div>
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== Xin chữ ông đồ (tracing)
const MAX_PTS = 120;
const thin = (pts: Pt[]) => (pts.length <= MAX_PTS ? pts : pts.filter((_, i) => i % Math.ceil(pts.length / MAX_PTS) === 0 || i === pts.length - 1));
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const segDist = (p: Pt, a: Pt, b: Pt) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1e-9)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
const polyDist = (p: Pt, l: Pt[]) => Math.min(...l.slice(1).map((b, i) => segDist(p, l[i], b)));
/** same shape test the server runs (a little stricter so a local pass is a server pass) */
function hugs(user: Pt[], target: Pt[]) {
  const samples: Pt[] = [];
  target.slice(1).forEach((b, i) => {
    for (let s = 0; s < 6; s++) samples.push({ x: target[i].x + ((b.x - target[i].x) * s) / 6, y: target[i].y + ((b.y - target[i].y) * s) / 6 });
  });
  samples.push(target[target.length - 1]);
  return samples.every((q) => polyDist(q, user) <= 0.09) && user.every((q) => polyDist(q, target) <= 0.13);
}

export function ChoChu({ task, submit }: { task: T<'task_cho_chu'>; submit: Submit }) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState<Pt[][]>([]);
  const cur = useRef<Pt[] | null>(null);
  const [shake, doShake] = useShake();
  const [msg, setMsg] = useState('');
  const k = done.length;
  const finished = k === task.strokes.length;

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const s = c.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(s * dpr)) (c.width = Math.round(s * dpr)), (c.height = Math.round(s * dpr));
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, s, s);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const line = (pts: Pt[], w: number, color: string) => {
      g.strokeStyle = color;
      g.lineWidth = w;
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p.x * s, p.y * s) : g.moveTo(p.x * s, p.y * s)));
      g.stroke();
    };
    // guide on red paper: all strokes faint gold, the next one stronger with its start dot + number
    task.strokes.forEach((st, i) => i >= k && line(st, s * 0.075, i === k ? 'rgba(255,214,120,0.5)' : 'rgba(255,230,180,0.16)'));
    if (!finished) {
      const p = task.strokes[k][0];
      g.fillStyle = '#f2c14e';
      g.strokeStyle = '#1d1410';
      g.lineWidth = s * 0.006;
      g.beginPath();
      g.arc(p.x * s, p.y * s, s * 0.032, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#1d1410';
      g.font = `bold ${Math.round(s * 0.035)}px sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(String(k + 1), p.x * s, p.y * s);
    }
    done.forEach((st) => line(st, s * 0.06, '#1d1410'));
    if (cur.current) line(cur.current, s * 0.06, '#2b1d16');
  }, [task.strokes, done, k, finished]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const at = (e: React.PointerEvent): Pt => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: r3((e.clientX - r.left) / r.width), y: r3((e.clientY - r.top) / r.height) };
  };
  const down = (e: React.PointerEvent) => {
    if (finished) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    cur.current = [at(e)];
    draw();
  };
  const move = (e: React.PointerEvent) => {
    const c = cur.current;
    if (!c) return;
    const p = at(e);
    const l = c[c.length - 1];
    if (Math.hypot(p.x - l.x, p.y - l.y) < 0.008) return;
    c.push(p);
    draw();
  };
  const up = () => {
    const c = cur.current;
    cur.current = null;
    if (!c || finished) return;
    const target = task.strokes[k];
    const near = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) <= 0.12;
    if (c.length < 2 || !near(c[0], target[0]) || !near(c[c.length - 1], target[target.length - 1]) || !hugs(c, target)) {
      sfx.bad();
      doShake();
      setMsg(t('Nét chưa đúng — bắt đầu ở chấm vàng và đi theo hướng nét mờ.', 'Not quite — start at the gold dot and follow the faint stroke.'));
      draw();
      return;
    }
    sfx.scrape();
    setMsg('');
    const next = [...done, thin(c)];
    setDone(next);
    if (next.length === task.strokes.length) {
      sfx.stamp();
      setTimeout(() => submit(next), 700);
    }
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${k}/${task.strokes.length}`}
      tone={finished ? 'ok' : msg ? 'bad' : 'info'}
      hint={finished ? t(`Chữ “${task.meaning}” đã viết xong!`, `“${task.meaning}” is written!`) : msg || t(`Nét ${k + 1}: đặt bút ở chấm vàng, kéo theo nét mờ.`, `Stroke ${k + 1}: start at the gold dot and follow the faint line.`)}
      vars={{ glyph: task.glyph, meaning: task.meaning }}
    >
      <div className="tl-cc">
        <img className="tl-cc-ong" src={mg('tl-mg-ong-do')} alt="" />
        <div className={`tl-cc-paper ${shake}`} style={{ backgroundImage: `url(${mg('tl-mg-giay-do')})` }}>
          <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => ((cur.current = null), draw())} />
        </div>
        <p className="tl-cc-meaning">
          <b>{task.glyph}</b> {task.meaning}
        </p>
      </div>
    </MgShell>
  );
}

// ================================================================== Ghép câu đối
export function CauDoi({ task, submit }: { task: T<'task_cau_doi'>; submit: Submit }) {
  const t = useT();
  const { pairs, picked, dnd, tapTarget } = usePairs(sfx.scrape);
  const [sent, setSent] = useState(false);
  const full = task.tops.every((x) => pairs[x.id]);
  const used = new Set(Object.values(pairs));
  const line = (id: string) => task.bottoms.find((b) => b.id === id);
  const hang = () => {
    setSent(true);
    sfx.ok();
    setTimeout(() => submit(pairs), 600);
  };
  // every couplet paired -> hang them up straight away
  useEffect(() => {
    if (full && !sent) hang();
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(pairs).length}/${task.tops.length}`}
      tone={sent ? 'ok' : 'info'}
      hint={sent ? t('Đang treo câu đối…', 'Hanging the couplets…') : t('Kéo vế dưới vào ô cạnh vế trên. Mẹo: nhìn cặp chữ đối nhau ở thẻ vàng.', 'Drag each second line next to its first line. Tip: the yellow tag shows the paired words.')}
    >
      <div className={`tl-cd ${dnd.dragging ? 'mg-dragging' : ''}`}>
        {task.tops.map((top) => {
          const b = pairs[top.id] ? line(pairs[top.id]) : undefined;
          return (
            <div key={top.id} className="tl-cd-row">
              <div className="tl-cd-paper top">
                {top.han && <small>{top.han}</small>}
                {top.text}
                {top.hint && <span className="tl-cd-hint">{top.hint}</span>}
              </div>
              <button className={`tl-cd-paper slot ${b ? 'on' : ''} ${dnd.over === top.id ? 'drop-over' : ''} ${picked ? 'invite' : ''}`} data-drop={top.id} onClick={() => !sent && tapTarget(top.id)}>
                {b ? (
                  <>
                    {b.han && <small>{b.han}</small>}
                    {b.text}
                  </>
                ) : (
                  <em>{t('vế dưới…', 'second line…')}</em>
                )}
              </button>
            </div>
          );
        })}
        <div className="tl-tray col">
          {task.bottoms.map((b) => (
            <button key={b.id} className={`tl-chip line ${used.has(b.id) ? 'used' : ''} ${picked === b.id ? 'sel' : ''}`} {...dnd.source(b.id, <span className="tl-chip line">{b.text}</span>, sent)}>
              <span>{b.text}</span>
            </button>
          ))}
        </div>
      </div>
      {dnd.ghost}
    </MgShell>
  );
}
