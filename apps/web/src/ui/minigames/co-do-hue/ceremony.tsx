/** Sân Ngọ Môn, Điện Thái Hòa, Duyệt Thị Đường: rehearse the ceremony itself. */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GateTraveler, TaskData } from '@hidden-truth/shared';
import { MgShell, sfx, useDragDrop, useShake, type Submit } from '../common/kit';
import { mg } from './art';

type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;

// ================================================================== 3. Năm cửa Ngọ Môn
const KIND_LABEL: Record<GateTraveler, string> = { vua: 'Nhà vua', van: 'Quan văn', vo: 'Quan võ', linh: 'Lính hầu', voi: 'Voi', ngua: 'Ngựa' };
/** must match GATE_RULE on the server (gate index = screen left -> right) */
const ALLOWED: Record<GateTraveler, number[]> = { vua: [2], vo: [1], van: [3], linh: [0, 4], voi: [0, 4], ngua: [0, 4] };
const GATE_X = [0.1, 0.27, 0.5, 0.73, 0.9];
const GATE_W = [0.07, 0.08, 0.11, 0.08, 0.07];
/** keep in sync with the gateWalk animation in styles.css */
const WALK_MS = 950;

export function NgoMonGates({ task, submit }: { task: T<'task_ngo_mon_gates'>; submit: Submit }) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [miss, setMiss] = useState(0);
  const [walking, setWalking] = useState<number | null>(null);
  const [deny, setDeny] = useState<number | null>(null);
  const [passed, setPassed] = useState(0);
  const [shake, doShake] = useShake();
  const [msg, setMsg] = useState('');
  const done = i >= task.travelers.length;
  const cur = task.travelers[Math.min(i, task.travelers.length - 1)];

  // no time limit and no reset: a wrong gate just explains the rule
  const fail = (why: string) => {
    sfx.bad();
    doShake();
    setMiss((m) => m + 1);
    setMsg(why);
  };

  const choose = (g: number) => {
    if (done || walking != null) return;
    if (!ALLOWED[cur.kind].includes(g)) {
      setDeny(g);
      setTimeout(() => setDeny((d) => (d === g ? null : d)), 650);
      fail(`${KIND_LABEL[cur.kind]} không đi ${task.gates[g].name} — cửa này dành cho ${task.gates[g].for.toLowerCase()}.`);
      return;
    }
    sfx.ok();
    setMsg('');
    setWalking(g);
    const next = [...answers, g];
    setAnswers(next);
    setTimeout(() => {
      setWalking(null);
      setPassed((n) => n + 1);
      setI((x) => x + 1);
      if (next.length === task.travelers.length) setTimeout(() => submit(next), 500);
    }, WALK_MS);
  };

  const dnd = useDragDrop<string>((_, target) => choose(Number(target)));
  const overGate = dnd.over != null ? Number(dnd.over) : null;

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Math.min(i, task.travelers.length)}/${task.travelers.length}`}
      tone={done ? 'ok' : msg ? 'bad' : 'info'}
      hint={done ? 'Cả đoàn rước đã qua đúng cửa!' : msg || `Đến lượt: ${KIND_LABEL[cur.kind]}. Kéo vào cửa phù hợp.${miss ? ` (đã nhầm ${miss} lần)` : ''}`}
    >
      <div className={`gates ${shake} ${dnd.dragging ? 'mg-dragging' : ''} ${done ? 'all-done' : ''}`}>
        <img src={mg('hue-mg-ngo-mon')} alt="Ngọ Môn" draggable={false} />
        {GATE_X.map((x, g) => (
          <button
            key={g}
            className={['gate-hit', overGate === g ? 'drop-over' : '', walking === g ? 'pass' : '', deny === g ? 'deny' : ''].join(' ')}
            data-drop={g}
            style={{ left: `${(x - GATE_W[g] / 2) * 100}%`, width: `${GATE_W[g] * 100}%` }}
            onClick={() => choose(g)}
            aria-label={task.gates[g].name}
          >
            {walking === g && (
              <span className="gate-spark" key={passed} aria-hidden>
                {Array.from({ length: 8 }, (_, k) => (
                  <i key={k} style={{ '--a': `${k * 45}deg` } as React.CSSProperties} />
                ))}
              </span>
            )}
          </button>
        ))}
        {walking != null && (
          <span className="gate-walker" key={passed} style={{ left: `${GATE_X[walking] * 100}%` }}>
            <img src={mg(`hue-mg-trav-${cur.kind}`)} alt="" draggable={false} />
          </span>
        )}
      </div>
      <div className="gate-labels">
        {task.gates.map((g, k) => (
          <button key={k} className={`gate-label ${overGate === k ? 'drop-over' : ''}`} data-drop={k} onClick={() => choose(k)}>
            <b>{g.name}</b>
            <small>{g.for}</small>
          </button>
        ))}
      </div>
      <div className="gate-queue">
        {!done && walking == null && (
          <div className={`gate-traveler ${dnd.dragging ? 'lifting' : ''} ${deny != null ? 'denied' : ''}`} key={cur.id} {...dnd.source(cur.id, <img src={mg(`hue-mg-trav-${cur.kind}`)} alt="" />)}>
            <img src={mg(`hue-mg-trav-${cur.kind}`)} alt="" draggable={false} />
            <b>{KIND_LABEL[cur.kind]}</b>
          </div>
        )}
        <div className="gate-next">
          {task.travelers.slice(i + 1, i + 5).map((t) => (
            <img key={t.id} src={mg(`hue-mg-trav-${t.kind}`)} alt="" draggable={false} />
          ))}
          <span>
            {Math.min(i + 1, task.travelers.length)}/{task.travelers.length}
          </span>
        </div>
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== 4. Xếp bá quan theo phẩm sơn
const SIDES = [
  { side: 'vo' as const, title: 'Võ ban', sub: 'phía Tây', emblem: 'hue-mg-botu-thu' },
  { side: 'van' as const, title: 'Văn ban', sub: 'phía Đông', emblem: 'hue-mg-botu-chim' },
];
const RANKS = ['Nhất phẩm', 'Nhị phẩm', 'Tam phẩm'];

export function CourtRanks({ task, submit }: { task: T<'task_court_ranks'>; submit: Submit }) {
  const [sel, setSel] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [shake, doShake] = useShake();
  const [msg, setMsg] = useState('');
  const byId = Object.fromEntries(task.officials.map((o) => [o.id, o]));
  const used = new Set(Object.values(placed));

  const drop = (slot: string, id = sel) => {
    if (!id || placed[slot]) return;
    const o = byId[id];
    const [side, rank] = slot.split('-');
    if (o.side !== side) {
      sfx.bad();
      doShake();
      setMsg(o.side === 'van' ? 'Vị này thêu CHIM trước ngực — là quan văn, đứng bên Văn ban.' : 'Vị này thêu THÚ trước ngực — là quan võ, đứng bên Võ ban.');
      return;
    }
    if (String(o.rank) !== rank) {
      sfx.bad();
      doShake();
      setMsg(`Vị này là ${o.name} — hãy đặt vào bia “${o.name}” (phẩm càng cao càng gần điện).`);
      return;
    }
    sfx.ok();
    setMsg('');
    const next = { ...placed, [slot]: id };
    setPlaced(next);
    setSel(null);
    if (Object.keys(next).length === task.officials.length) setTimeout(() => submit(next), 700);
  };
  const dnd = useDragDrop<string>(
    (id, slot) => drop(slot, id),
    (id) => (setSel(id), setMsg('')),
  );

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={`${Object.keys(placed).length}/${task.officials.length}`}
      tone={Object.keys(placed).length === task.officials.length ? 'ok' : msg ? 'bad' : 'info'}
      hint={Object.keys(placed).length === task.officials.length ? 'Hàng chầu đã ngay ngắn!' : msg || (sel ? 'Giờ bấm vào bia phẩm sơn phù hợp.' : 'Kéo một vị quan ở khay bên dưới thả vào bia phẩm sơn.')}
    >
      <div className={`court ${shake}`}>
        <img className="court-hall" src={mg('hue-mg-thai-hoa')} alt="Điện Thái Hòa" draggable={false} />
        <div className="court-grid">
          {SIDES.map((s) => (
            <div key={s.side} className="court-col">
              <div className="court-head">
                <img src={mg(s.emblem)} alt="" />
                <b>{s.title}</b>
                <small>{s.sub}</small>
              </div>
              {[1, 2, 3].map((r) => {
                const slot = `${s.side}-${r}`;
                const o = placed[slot] ? byId[placed[slot]] : null;
                return (
                  <button
                    key={slot}
                    className={`court-slot ${o ? 'filled' : sel || dnd.dragging ? 'ready' : ''} ${dnd.over === slot ? 'drop-over' : ''}`}
                    data-drop={o ? undefined : slot}
                    onClick={() => drop(slot)}
                  >
                    <img className="stele" src={mg('hue-mg-pham-son')} alt="" draggable={false} />
                    <small>{RANKS[r - 1]}</small>
                    {o && <img className="official" src={mg(`hue-mg-trav-${o.side}`)} alt="" draggable={false} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="court-tray">
        {task.officials.map((o) => (
          <button
            key={o.id}
            className={`official-card ${sel === o.id ? 'sel' : ''} ${used.has(o.id) ? 'used' : ''} ${dnd.dragging === o.id ? 'lifting' : ''}`}
            disabled={used.has(o.id)}
            {...dnd.source(o.id, <img src={mg(`hue-mg-trav-${o.side}`)} alt="" />, used.has(o.id))}
          >
            <img src={mg(`hue-mg-trav-${o.side}`)} alt="" draggable={false} />
            <small>{o.name}</small>
          </button>
        ))}
      </div>
      {dnd.ghost}
    </MgShell>
  );
}

// ================================================================== 5. Dượt Nhã nhạc
const NOTE: Record<string, () => void> = { trong: sfx.drum, senh: sfx.senh, nguyet: () => sfx.nguyet(392), sao: () => sfx.sao(784) };

export function NhaNhac({ task, submit }: { task: T<'task_nha_nhac'>; submit: Submit }) {
  const [mode, setMode] = useState<'listen' | 'play' | 'done'>('listen');
  const [lit, setLit] = useState<string | null>(null);
  const [input, setInput] = useState<string[]>([]);
  const [shake, doShake] = useShake();
  const [wrong, setWrong] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const flash = (id: string) => {
    NOTE[id]?.();
    setLit(id);
    timers.current.push(setTimeout(() => setLit(null), 320));
  };
  const listen = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMode('listen');
    setTimeout(() => setWrong(false), 1500);
    setInput([]);
    task.sequence.forEach((id, k) => timers.current.push(setTimeout(() => flash(id), 700 + k * 650)));
    timers.current.push(setTimeout(() => setMode('play'), 700 + task.sequence.length * 650));
  }, [task.sequence]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    listen();
    return () => timers.current.forEach(clearTimeout);
  }, [listen]);

  const hit = (id: string) => {
    if (mode !== 'play') return;
    flash(id);
    const next = [...input, id];
    if (task.sequence[next.length - 1] !== id) {
      sfx.bad();
      doShake();
      setWrong(true);
      setTimeout(listen, 700);
      return;
    }
    setInput(next);
    if (next.length === task.sequence.length) {
      setMode('done');
      setTimeout(() => submit(next), 700);
    }
  };

  return (
    <MgShell
      taskId={task.taskId}
      lore={task.prompt}
      status={
        <span className="nn-dots">
          {task.sequence.map((_, k) => (
            <i key={k} className={k < input.length ? 'on' : ''} />
          ))}
        </span>
      }
      tone={mode === 'done' ? 'ok' : wrong ? 'bad' : 'info'}
      hint={mode === 'done' ? 'Hoà tấu trọn vẹn!' : wrong ? 'Lệch nhịp rồi — nghe lại một lượt nhé.' : mode === 'listen' ? '🎧 Lắng nghe dàn nhạc…' : `Đến lượt bạn: nốt ${input.length + 1}/${task.sequence.length}`}
    >
      <div className={`nn-pads ${shake}`}>
        {task.instruments.map((ins) => (
          <button key={ins.id} className={`nn-pad ${lit === ins.id ? 'lit' : ''}`} onPointerDown={() => hit(ins.id)} disabled={mode !== 'play'}>
            <img src={mg(`hue-mg-inst-${ins.id}`)} alt="" draggable={false} />
            <b>{ins.name}</b>
          </button>
        ))}
      </div>
      <button className="btn small mg-replay" onClick={listen} disabled={mode === 'listen' || mode === 'done'}>
        ↻ Nghe lại
      </button>
    </MgShell>
  );
}
