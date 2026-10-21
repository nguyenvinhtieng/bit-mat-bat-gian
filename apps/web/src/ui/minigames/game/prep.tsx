/** Cuốc Cuối: 7 preparation games + the final handoff. Drawn with plain DOM/SVG; the server judges every answer. */
import { useState } from 'react';
import type { Pt, TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, type Submit } from '../common/kit';
import { useT } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;
type P<K extends TaskData['taskId']> = { task: T<K>; submit: Submit };

/** Lock the UI after the first answer so a double tap never sends twice. */
function useOnce(submit: Submit): [boolean, Submit] {
  const [sent, setSent] = useState(false);
  return [
    sent,
    (a) => {
      if (sent) return;
      setSent(true);
      sfx.stamp();
      window.setTimeout(() => submit(a), 450);
    },
  ];
}

// ================================================================== Nhận kiện hàng
export function ReceivePackage({ task, submit }: P<'receive_package'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [pick, setPick] = useState('');
  return (
    <MgShell taskId={task.taskId} lore={task.prompt} status={`${task.boxes.length} ${t('thùng', 'boxes')}`} hint={t('Tem trên thùng phải khớp đủ mã trong phiếu — không thừa, không thiếu.', 'The box stickers must match every code on the slip — no more, no less.')}>
      <div className="cc-row">
        <div className="cc-slip">
          <b>{t('Phiếu nhận', 'Pickup slip')}</b>
          {task.slip.map((c) => (
            <span key={c} className="cc-code">
              {c}
            </span>
          ))}
        </div>
        <div className="cc-boxes">
          {task.boxes.map((b) => (
            <button key={b.id} className={`cc-box ${pick === b.id ? 'sel' : ''}`} disabled={sent} onClick={() => (setPick(b.id), send(b.id))}>
              {b.codes.map((c) => (
                <span key={c} className="cc-code">
                  {c}
                </span>
              ))}
            </button>
          ))}
        </div>
      </div>
    </MgShell>
  );
}

// ================================================================== Kiểm tra niêm phong
export function CheckSeal({ task, submit }: P<'check_seal'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [turns, setTurns] = useState<Record<string, number>>(() => Object.fromEntries(task.pieces.map((p) => [p.id, 0])));
  const upright = task.pieces.filter((p) => (p.rot + turns[p.id]) % 4 === 0).length;
  const turn = (id: string) => {
    if (sent) return;
    sfx.scrape();
    const next = { ...turns, [id]: turns[id] + 1 };
    setTurns(next);
    if (task.pieces.every((p) => (p.rot + next[p.id]) % 4 === 0)) send(next);
  };
  return (
    <MgShell taskId={task.taskId} lore={task.prompt} status={`${upright}/${task.pieces.length}`} tone={sent ? 'ok' : 'info'} hint={t(`Câu trên niêm: “${task.motto}”. Chạm mảnh để xoay ¼ vòng.`, `The seal reads “${task.motto}”. Tap a piece to turn it a quarter.`)}>
      <div className="cc-seal">
        {task.pieces.map((p) => (
          <button key={p.id} className={`cc-piece ${(p.rot + turns[p.id]) % 4 === 0 ? 'ok' : ''}`} onClick={() => turn(p.id)}>
            <span style={{ transform: `rotate(${(p.rot + turns[p.id]) * 90}deg)` }}>{p.glyph}</span>
          </button>
        ))}
      </div>
    </MgShell>
  );
}

// ================================================================== Giải mã địa chỉ
export function DecodeAddress({ task, submit }: P<'decode_address'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  return (
    <MgShell taskId={task.taskId} lore={task.prompt} hint={t('Chỉ tin lời khách — người khác nói chen vào thì bỏ qua.', 'Trust only the customer — ignore anyone chiming in.')}>
      <div className="cc-row">
        <div className="cc-chat">
          {task.messages.map((m, i) => (
            <p key={i} className={m.from === 'Khách' ? 'me' : ''}>
              <b>{m.from}</b> {m.text}
            </p>
          ))}
        </div>
        <div className="cc-cards">
          {task.cards.map((c) => (
            <button key={c.id} className="cc-card" disabled={sent} onClick={() => send(c.id)}>
              {c.lines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </button>
          ))}
        </div>
      </div>
    </MgShell>
  );
}

// ================================================================== Vạch tuyến né chốt
const same = (a: Pt, b: Pt) => a.x === b.x && a.y === b.y;
export function PlanRoute({ task, submit }: P<'plan_route'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [path, setPath] = useState<Pt[]>([task.start]);
  const [drag, setDrag] = useState(false);
  const blocked = (c: Pt) => task.flooded.some((q) => same(q, c)) || task.deadEnds.some((q) => same(q, c));
  const reached = task.stops.filter((s) => path.some((c) => same(c, s))).length;
  const step = (c: Pt) => {
    if (sent) return;
    const at = path.findIndex((q) => same(q, c));
    // tap a cell already on the route -> cut the route back to it
    if (at >= 0) return void setPath(path.slice(0, Math.max(1, at + 1)));
    const last = path.at(-1)!;
    if (Math.abs(last.x - c.x) + Math.abs(last.y - c.y) !== 1 || blocked(c)) return;
    sfx.scrape();
    const next = [...path, c];
    setPath(next);
    if (same(c, task.end)) send(next);
  };
  const stopNo = (c: Pt) => task.stops.findIndex((s) => same(s, c));
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${reached}/${task.stops.length}`}
      hint={t('Đi từ chấm xanh qua các điểm theo số thứ tự, tới cờ. Né ô ngập 🌊 và hẻm cụt ⛔.', 'From the green dot through the numbered stops in order to the flag. Avoid floods 🌊 and dead ends ⛔.')}
    >
      <div className="cc-grid" style={{ gridTemplateColumns: `repeat(${task.w}, 1fr)`, ["--ar" as string]: task.w / task.h }} onPointerUp={() => setDrag(false)} onPointerLeave={() => setDrag(false)}>
        {Array.from({ length: task.w * task.h }, (_, i) => {
          const c = { x: i % task.w, y: Math.floor(i / task.w) };
          const n = stopNo(c);
          const on = path.some((q) => same(q, c));
          const cls = task.flooded.some((q) => same(q, c)) ? 'flood' : task.deadEnds.some((q) => same(q, c)) ? 'dead' : '';
          return (
            <button
              key={i}
              className={`cc-cell ${cls} ${on ? 'on' : ''}`}
              onPointerDown={(e) => {
                // touch captures the pointer to the first cell; release it so dragging reaches the neighbours
                const el = e.currentTarget;
                if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
                setDrag(true);
                step(c);
              }}
              onPointerEnter={() => drag && step(c)}
            >
              {same(c, task.start) ? '●' : same(c, task.end) ? '🏁' : n >= 0 ? n + 1 : cls === 'flood' ? '🌊' : cls === 'dead' ? '⛔' : ''}
            </button>
          );
        })}
      </div>
      <button className="btn" disabled={sent || path.length < 2} onClick={() => setPath([task.start])}>
        {t('Vẽ lại', 'Redraw')}
      </button>
    </MgShell>
  );
}

// ================================================================== Chuẩn bị xe
export function PrepareBike({ task, submit }: P<'prepare_bike'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [pumps, setPumps] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const p = pumps * task.perPump;
  const pct = (v: number) => `${Math.min(100, (v / task.max) * 100)}%`;
  const inGreen = p >= task.green[0] && p <= task.green[1];
  const strap = (id: string) => {
    if (sent || order.includes(id)) return;
    sfx.scrape();
    const next = [...order, id];
    setOrder(next);
    if (next.length === task.straps.length) send({ pumps, order: next });
  };
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${p} psi`}
      tone={p > task.green[1] ? 'bad' : inGreen ? 'ok' : 'info'}
      hint={p > task.green[1] ? t('Căng quá! Xả hơi rồi bơm lại.', 'Too hard! Let it out and pump again.') : t('Bơm tới vùng xanh, rồi siết dây theo số 1 → hết.', 'Pump into the green, then tighten the straps 1 → last.')}
    >
      <div className="cc-gauge">
        <i className="green" style={{ left: pct(task.green[0]), width: `calc(${pct(task.green[1])} - ${pct(task.green[0])})` }} />
        <i className="needle" style={{ left: pct(p) }} />
      </div>
      <div className="cc-row">
        <button className="btn primary" disabled={sent || p >= task.max} onClick={() => (sfx.scrape(), setPumps(pumps + 1))}>
          {t('Bơm', 'Pump')} +{task.perPump}
        </button>
        <button className="btn" disabled={sent || !pumps} onClick={() => (setPumps(0), setOrder([]))}>
          {t('Xả hơi', 'Let out')}
        </button>
      </div>
      <div className="cc-straps">
        {task.straps.map((s) => (
          <button key={s.id} className={`cc-strap ${order.includes(s.id) ? 'on' : ''}`} disabled={sent || !inGreen} onClick={() => strap(s.id)}>
            {s.n}
          </button>
        ))}
      </div>
    </MgShell>
  );
}

// ================================================================== Ngụy trang kiện hàng
export function PackDisguise({ task, submit }: P<'pack_disguise'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [box, setBox] = useState('');
  const [label, setLabel] = useState('');
  const [layers, setLayers] = useState<string[]>([]);
  const ready = box && label && layers.length === task.layerCount;
  const chips = (xs: { id: string; name: string }[], sel: (id: string) => boolean, on: (id: string) => void) => (
    <div className="cc-chips">
      {xs.map((x) => (
        <button key={x.id} className={`cc-chip ${sel(x.id) ? 'sel' : ''}`} disabled={sent} onClick={() => (sfx.scrape(), on(x.id))}>
          {x.name}
        </button>
      ))}
    </div>
  );
  const name = (id: string) => task.layers.find((l) => l.id === id)?.name ?? id;
  return (
    <MgShell taskId={task.taskId} lore={task.prompt} status={`${layers.length}/${task.layerCount}`} hint={t('Làm đúng từng dòng trong ghi chú của khách.', 'Follow the customer’s note line by line.')}>
      <div className="cc-row">
        <ul className="cc-note">
          {task.note.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <div className="cc-pack">
          <b>{t('Thùng ngoài', 'Outer box')}</b>
          {chips(task.boxes, (id) => box === id, setBox)}
          <b>{t('Nhãn', 'Label')}</b>
          {chips(task.labels, (id) => label === id, setLabel)}
          <b>{t('Lớp lót (dưới → trên)', 'Layers (bottom → top)')}</b>
          {chips(task.layers, (id) => layers.includes(id), (id) => setLayers(layers.includes(id) ? layers.filter((x) => x !== id) : layers.length < task.layerCount ? [...layers, id] : layers))}
          <ol className="cc-stack">
            {layers.map((id) => (
              <li key={id}>{name(id)}</li>
            ))}
          </ol>
          <button className="btn primary" disabled={sent || !ready} onClick={() => send({ box, label, layers })}>
            {t('Đóng thùng', 'Seal the box')}
          </button>
        </div>
      </div>
    </MgShell>
  );
}

// ================================================================== Xác nhận người nhận
export function ConfirmRecipient({ task, submit }: P<'confirm_recipient'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  return (
    <MgShell taskId={task.taskId} lore={task.prompt} hint={t('Phải khớp cả 4 số cuối lẫn mật khẩu.', 'Both the last 4 digits and the passphrase must match.')}>
      <p className="cc-msg">{task.message}</p>
      <div className="cc-callers">
        {task.callers.map((c) => (
          <button key={c.id} className="cc-caller" disabled={sent} onClick={() => send(c.id)}>
            <b>📞 {c.name}</b>
            <span>…{c.code4}</span>
            <i>“{c.phrase}”</i>
          </button>
        ))}
      </div>
    </MgShell>
  );
}

// ================================================================== Bàn giao kiện hàng
export function HandoffPackage({ task, submit }: P<'handoff_package'>) {
  const t = useT();
  const [sent, send] = useOnce(submit);
  const [code, setCode] = useState('');
  const key = (d: string) => {
    if (sent) return;
    sfx.scrape();
    const next = d === '⌫' ? code.slice(0, -1) : (code + d).slice(0, task.digits);
    setCode(next);
    if (next.length === task.digits) send({ code: next });
  };
  return (
    <MgShell taskId={task.taskId} lore={task.prompt} tone={sent ? 'ok' : 'info'} hint={t('Nhập mã nhận đã xác nhận với người nhận.', 'Key in the receiving code you verified with the recipient.')}>
      <p className="cc-msg">{task.message}</p>
      <div className="cc-display">{code.padEnd(task.digits, '_').split('').join(' ')}</div>
      <div className="cc-keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
          d ? (
            <button key={i} disabled={sent} onClick={() => key(d)}>
              {d}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </MgShell>
  );
}
