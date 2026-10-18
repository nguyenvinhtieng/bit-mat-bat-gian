/** Bàn hụi ở quán cóc: ghi sổ hụi, đếm tiền bó thun, khui hụi. The server judges every answer. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useDragDrop, useShake, type Submit } from '../common/kit';
import { useT, vnd } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

/** stable 0..1 from a string (layout jitter, avatar colours) */
const hash01 = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
};
const AVATAR = ['#00b14f', '#e8553d', '#2f6fb5', '#c0508a', '#d89a1c', '#6b4fb5', '#2a9d8f', '#8d5a3b'];
const avatarOf = (name: string) => AVATAR[Math.floor(hash01(name) * AVATAR.length)];
const initials = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2);

// ================================================================== Ghi sổ hụi
export function SoHui({ task, submit }: { task: T<'task_so_hui'>; submit: Submit }) {
  const t = useT();
  const [book, setBook] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const label = (id: string) => task.amounts.find((a) => a.id === id)?.label ?? '';
  const used = new Set(Object.values(book));
  const full = task.rows.every((r) => book[r.id]);

  const put = (amt: string, row: string) => {
    if (done) return;
    sfx.stamp();
    setBook((b) => {
      const next = Object.fromEntries(Object.entries(b).filter(([, v]) => v !== amt));
      return { ...next, [row]: amt };
    });
    setSel(null);
  };
  const dnd = useDragDrop<string>(put, (amt) => (sfx.scrape(), setSel((s) => (s === amt ? null : amt))));
  const tapRow = (row: string) => {
    if (done) return;
    if (sel) return put(sel, row);
    if (book[row]) {
      sfx.scrape();
      setBook(({ [row]: _, ...rest }) => rest);
    }
  };
  const close = () => {
    if (!full || done) return;
    sfx.ok();
    setDone(true);
    timer.current = window.setTimeout(() => submit(book), 700);
  };
  // the book closes itself once every row holds an amount
  useEffect(() => {
    if (full) close();
  }, [book]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(book).length}/${task.rows.length}`}
      tone={done ? 'ok' : 'info'}
      hint={
        done
          ? t('Sổ ghi rõ ràng — kỳ sau khỏi cãi.', 'The ledger is clear — no arguing next round.')
          : sel
            ? t('Giờ chạm vào dòng tên trong sổ để ghi số này.', 'Now tap a name in the ledger to write it down.')
            : t('Đọc kỹ ai góp cho ai — có người góp giùm bạn!', 'Read who pays for whom — someone may pay for a friend!')
      }
    >
      <div className={`sg-sh ${dnd.dragging ? 'mg-dragging' : ''}`}>
        <div className="sg-sh-chat" aria-label="Zalo">
          <div className="sg-sh-chat-head">
            <span className="sg-sh-group">🧧</span>
            <div>
              <b>Hụi Hẻm 42</b>
              <small>{t(`${task.rows.length + 1} thành viên`, `${task.rows.length + 1} members`)}</small>
            </div>
          </div>
          <div className="sg-sh-msgs">
            {task.messages.map((m, i) => (
              <div className="sg-sh-msg" key={i} style={{ animationDelay: `${i * 0.35}s` }}>
                <span className="sg-sh-ava" style={{ background: avatarOf(m.from) }}>
                  {initials(m.from)}
                </span>
                <div className="sg-sh-bub">
                  <small style={{ color: avatarOf(m.from) }}>{m.from}</small>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sg-sh-right">
          <div className="sg-sh-book">
            <div className="sg-sh-book-head">{t('SỔ HỤI · KỲ NÀY', 'HỤI LEDGER · THIS ROUND')}</div>
            {task.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`sg-sh-line ${book[r.id] ? 'filled' : ''} ${dnd.over === r.id ? 'drop-over' : ''} ${sel && !book[r.id] ? 'ready' : ''}`}
                data-drop={r.id}
                onClick={() => tapRow(r.id)}
              >
                <span className="sg-sh-name">{r.name}</span>
                <span className="sg-sh-amt">{book[r.id] ? label(book[r.id]) : '………'}</span>
              </button>
            ))}
          </div>
          <div className="sg-tray">
            {task.amounts.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`sg-chip sg-sh-chip ${sel === a.id ? 'sel' : ''} ${used.has(a.id) ? 'used' : ''}`}
                disabled={done}
                {...dnd.source(a.id, <span className="sg-sh-ghost">{a.label}</span>, done)}
              >
                <span aria-hidden>💵</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== Đếm tiền bó thun
/** Polymer note colours, by value (đ) */
const NOTE: Record<number, { bg: string; ink: string; band: string }> = {
  10000: { bg: '#d9b35a', ink: '#6b4a12', band: '#b88a2c' },
  20000: { bg: '#6d9bd6', ink: '#173f73', band: '#3f6fb0' },
  50000: { bg: '#d784b1', ink: '#6e1f4b', band: '#b35089' },
  100000: { bg: '#8fc27f', ink: '#24562a', band: '#5a9a4f' },
  200000: { bg: '#d48a62', ink: '#6b2c12', band: '#b0603a' },
  500000: { bg: '#79c4cf', ink: '#13545e', band: '#3a98a8' },
};
const short = (v: number) => (v >= 1000 ? `${v / 1000}K` : `${v}`);

export function Banknote({ value }: { value: number }) {
  const c = NOTE[value] ?? NOTE[10000];
  return (
    <svg viewBox="0 0 120 58" className="sg-note-svg" aria-label={vnd(value)}>
      <rect x="1" y="1" width="118" height="56" rx="5" fill={c.bg} stroke={c.band} strokeWidth="2" />
      <path d="M1 40 Q30 30 60 42 T119 36 V52 Q119 57 114 57 H6 Q1 57 1 52Z" fill={c.band} opacity="0.35" />
      {/* polymer window */}
      <ellipse cx="17" cy="20" rx="9" ry="11" fill="#fff" opacity="0.55" stroke={c.band} />
      {/* portrait */}
      <circle cx="94" cy="24" r="14" fill={c.band} opacity="0.55" />
      <circle cx="94" cy="20" r="6" fill={c.ink} opacity="0.55" />
      <path d="M84 36 Q94 26 104 36" fill={c.ink} opacity="0.55" />
      <text x="58" y="15" textAnchor="middle" fontSize="6.5" fontWeight="800" fill={c.ink} letterSpacing="0.5">
        VIỆT NAM
      </text>
      <text x="58" y="34" textAnchor="middle" fontSize="15" fontWeight="900" fill={c.ink}>
        {value.toLocaleString('vi-VN')}
      </text>
      <text x="58" y="47" textAnchor="middle" fontSize="6" fontWeight="700" fill={c.ink} opacity="0.8">
        ĐỒNG
      </text>
    </svg>
  );
}

export function DemTien({ task, submit }: { task: T<'task_dem_tien'>; submit: Submit }) {
  const t = useT();
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<string | null>(null);
  const [phase, setPhase] = useState<'sort' | 'count' | 'done'>('sort');
  const [msg, setMsg] = useState('');
  const [shake, doShake] = useShake();
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const valueOf = useMemo(() => Object.fromEntries(task.notes.map((n) => [n.id, n.value])), [task.notes]);
  const loose = task.notes.filter((n) => placed[n.id] == null);
  const count = (v: number) => task.notes.filter((n) => placed[n.id] === v).length;

  const drop = (id: string, target: string) => {
    if (phase !== 'sort') return;
    const v = Number(target);
    setSel(null);
    if (valueOf[id] !== v) {
      sfx.bad();
      doShake();
      setMsg(t(`Tờ này là ${vnd(valueOf[id])}, không phải xấp ${vnd(v)}.`, `That note is ${vnd(valueOf[id])}, not the ${vnd(v)} stack.`));
      return;
    }
    sfx.scrape();
    setMsg('');
    const next = { ...placed, [id]: v };
    setPlaced(next);
    if (Object.keys(next).length === task.notes.length) timer.current = window.setTimeout(tie, 450);
  };
  const dnd = useDragDrop<string>(drop, (id) => (sfx.scrape(), setSel((s) => (s === id ? null : id))));

  const tie = () => {
    sfx.stamp();
    setPhase('count');
  };
  const report = (total: number) => {
    if (phase !== 'count') return;
    sfx.ok();
    setPhase('done');
    timer.current = window.setTimeout(() => submit({ stacks: placed, total }), 700);
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(placed).length}/${task.notes.length}`}
      tone={phase === 'done' ? 'ok' : msg ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Bó thun gọn gàng — đếm lại vẫn khớp.', 'Neatly banded — the count still matches.')
          : phase === 'count'
            ? t('Cộng từng xấp lại — tổng cộng bao nhiêu?', 'Add up each stack — what is the total?')
            : msg || t('Kéo (hoặc chạm) từng tờ vào đúng xấp mệnh giá.', 'Drag (or tap) each note onto its value stack.')
      }
    >
      <div className={`sg-dt ${shake} ${dnd.dragging ? 'mg-dragging' : ''}`}>
        <div className="sg-dt-mat">
          {loose.map((n) => {
            const j = hash01(n.id);
            return (
              <button
                key={n.id}
                type="button"
                className={`sg-dt-note ${sel === n.id ? 'sel' : ''} ${dnd.dragging === n.id ? 'lifting' : ''}`}
                style={{ transform: `rotate(${(j - 0.5) * 26}deg) translateY(${(hash01(n.id + 'y') - 0.5) * 10}px)` }}
                {...dnd.source(n.id, <Banknote value={n.value} />, phase !== 'sort')}
              >
                <Banknote value={n.value} />
              </button>
            );
          })}
          {!loose.length && <div className="sg-dt-empty">{t('Chiếu sạch trơn!', 'The mat is clear!')}</div>}
        </div>
        <div className="sg-dt-stacks">
          {task.values.map((v) => {
            const k = count(v);
            return (
              <button
                key={v}
                type="button"
                className={`sg-dt-stack ${dnd.over === String(v) ? 'drop-over' : ''} ${sel ? 'ready' : ''} ${phase !== 'sort' ? 'tied' : ''}`}
                data-drop={String(v)}
                onClick={() => sel && drop(sel, String(v))}
              >
                <div className="sg-dt-pile">
                  {Array.from({ length: Math.max(k, 1) }, (_, i) => (
                    <div key={i} className={`sg-dt-sheet ${k ? '' : 'ghost'}`} style={{ bottom: i * 4, left: (i % 2) * 3 }}>
                      <Banknote value={v} />
                    </div>
                  ))}
                  {phase !== 'sort' && k > 0 && <span className="sg-dt-band" style={{ bottom: 6, height: 40 + (k - 1) * 4 }} />}
                </div>
                <b>{short(v)}</b>
                <small>× {k}</small>
              </button>
            );
          })}
        </div>
        {(phase === 'count' || phase === 'done') && (
          <div className="sg-row">
            {task.choices.map((c) => (
              <button key={c} type="button" className="btn sg-dt-total" disabled={phase === 'done'} onClick={() => report(c)}>
                {vnd(c)}
              </button>
            ))}
          </div>
        )}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== Khui hụi
export function KhuiHui({ task, submit }: { task: T<'task_khui_hui'>; submit: Submit }) {
  const t = useT();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [pick, setPick] = useState<string | null>(null);
  const [phase, setPhase] = useState<'play' | 'late' | 'done'>('play');
  const [shake, doShake] = useShake();
  const timer = useRef(0);
  const started = useRef(performance.now());
  const [left, setLeft] = useState(task.limitMs);

  useEffect(() => {
    if (phase !== 'play') return;
    const id = window.setInterval(() => {
      const l = Math.max(0, task.limitMs - (performance.now() - started.current));
      setLeft(l);
      if (l > 0) return;
      clearInterval(id);
      sfx.bad();
      doShake();
      setPhase('late');
      // a failed answer restarts the round (fresh clock on the server)
      timer.current = window.setTimeout(() => submit(null), 1400);
    }, 100);
    return () => clearInterval(id);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);

  const tap = (id: string) => {
    if (phase !== 'play') return;
    if (!open.has(id)) {
      sfx.scrape();
      setOpen(new Set(open).add(id));
      return;
    }
    if (open.size < task.envelopes.length) return;
    sfx.ok();
    setPick(id);
    setPhase('done');
    timer.current = window.setTimeout(() => submit(id), 600);
  };

  const frac = left / task.limitMs;
  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Math.ceil(left / 1000)}s`}
      tone={phase === 'done' ? 'ok' : phase === 'late' || frac < 0.3 ? 'bad' : 'info'}
      hint={
        phase === 'done'
          ? t('Khui! Cả bàn vỗ tay.', 'Opened! The table claps.')
          : phase === 'late'
            ? t('Chậm quá, cả bàn sốt ruột — khui lại từ đầu!', 'Too slow, the table is restless — start over!')
            : open.size < task.envelopes.length
              ? t('Chạm để lật phong bì. Số viết đủ kiểu — đọc kỹ!', 'Tap to flip an envelope. Bids are written every which way — read closely!')
              : t('Chạm vào thăm cao nhất để khui.', 'Tap the highest bid to open the hụi.')
      }
    >
      <div className={`sg-kh ${shake}`}>
        <div className="sg-kh-time">
          <i style={{ width: `${frac * 100}%` }} className={frac < 0.3 ? 'low' : ''} />
        </div>
        <div className="sg-kh-table">
          {task.envelopes.map((e) => (
            <button
              key={e.id}
              type="button"
              className={`sg-kh-env ${open.has(e.id) ? 'open' : ''} ${pick === e.id ? 'pick' : ''}`}
              onClick={() => tap(e.id)}
              disabled={phase !== 'play'}
            >
              <div className="sg-kh-inner">
                <div className="sg-kh-face sg-kh-back">
                  <svg viewBox="0 0 80 100" aria-hidden>
                    <rect x="2" y="2" width="76" height="96" rx="6" fill="#c8262c" stroke="#8e1418" strokeWidth="2" />
                    <path d="M2 8 L40 46 L78 8" fill="#a91c22" stroke="#8e1418" strokeWidth="2" />
                    <circle cx="40" cy="46" r="11" fill="#f2c14e" stroke="#b98a1c" strokeWidth="2" />
                    <text x="40" y="50" textAnchor="middle" fontSize="11" fontWeight="900" fill="#8e1418">
                      ?
                    </text>
                    <path d="M14 82 H66" stroke="#f2c14e" strokeWidth="2" strokeDasharray="3 3" />
                  </svg>
                  <span className="sg-kh-name">{e.name}</span>
                </div>
                <div className="sg-kh-face sg-kh-front">
                  <small>{e.name}</small>
                  <b>{e.bid}</b>
                  <em>{t('bỏ thăm', 'bids')}</em>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </MgShell>
  );
}
