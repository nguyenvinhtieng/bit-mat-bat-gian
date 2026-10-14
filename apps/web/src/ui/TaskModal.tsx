import { useEffect, useRef, useState } from 'react';
import { HUE_STATIONS, type TaskData } from '@hidden-truth/shared';
import { send } from '../net';
import { useStore } from '../store';
import { ClueCard, Modal, asset } from './common';

const ART: Record<TaskData['taskId'], string> = {
  task_print_checklist: 'hue-ui-checklist-paper',
  task_scan_footnote: 'hue-ui-scan-page',
  task_update_floor_plan: 'hue-ui-floor-plan',
  task_check_lights_labels: 'hue-ui-photo-board',
  task_seal_box: 'hue-ui-seal-record',
  task_return_shelf_a: 'hue-ui-loan-slip',
};

export function TaskModal() {
  const task = useStore((s) => s.task);
  const result = useStore((s) => s.taskResult);
  const set = useStore((s) => s.set);
  if (!task) return null;
  const st = HUE_STATIONS.find((x) => x.id === task.taskId)!;
  const close = () => set({ task: null, taskResult: null });
  const submit = (answer: unknown) => send('task:submit', { taskId: task.taskId, answer });

  return (
    <Modal title={st.title} onClose={close} wide>
      {result ? (
        <div className="task-done">
          <p className="success">✅ {result.text}</p>
          <p className="muted">Manh mối mới đã vào sổ của bạn. Chia sẻ nó trong cuộc họp để cả nhóm cùng suy luận.</p>
          {result.clues?.map((c) => <ClueCard key={c.id} clue={c} />)}
          <button className="btn primary" onClick={close}>
            Đóng
          </button>
        </div>
      ) : (
        <div className="minigame" style={{ backgroundImage: `url(${asset(`maps/co-do-hue/clues/${ART[task.taskId]}.webp`)})` }}>
          <div className="minigame-inner">
            <Minigame task={task} submit={submit} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Minigame({ task, submit }: { task: TaskData; submit: (a: unknown) => void }) {
  switch (task.taskId) {
    case 'task_print_checklist':
      return <Checklist task={task} submit={submit} />;
    case 'task_scan_footnote':
      return <HoldScan holdMs={task.holdMs} submit={submit} />;
    case 'task_update_floor_plan':
      return <Sequence title="Đăng ký ca trực theo đúng thứ tự trên lịch:" sequence={task.sequence} options={task.rooms} submit={submit} />;
    case 'task_check_lights_labels':
      return <Sequence title="Bật đèn theo thứ tự trong quy trình kiểm tra:" sequence={task.lights} options={[...task.lights].sort()} submit={submit} />;
    case 'task_seal_box':
      return <Seal task={task} submit={submit} />;
    case 'task_return_shelf_a':
      return <Shelf task={task} submit={submit} />;
  }
}

function Checklist({ task, submit }: { task: Extract<TaskData, { taskId: 'task_print_checklist' }>; submit: (a: unknown) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const n = new Set(checked);
    n.has(id) ? n.delete(id) : n.add(id);
    setChecked(n);
  };
  return (
    <div className="mg-two">
      <div>
        <h4>Log máy in (bản thử cuối)</h4>
        <ul className="printer-log">
          {task.items.map((i) => (
            <li key={i.id} className={i.log}>
              {i.log === 'ok' ? '✔' : '✖'} {i.label}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h4>Checklist in ấn</h4>
        <p className="muted small">Chỉ tích các mục mà log máy in báo đạt.</p>
        {[...task.items]
          .sort((a, b) => a.label.localeCompare(b.label))
          .map((i) => (
            <label key={i.id} className="check">
              <input type="checkbox" checked={checked.has(i.id)} onChange={() => toggle(i.id)} />
              {i.label}
            </label>
          ))}
        <button className="btn primary" onClick={() => submit([...checked])}>
          Xác nhận checklist
        </button>
      </div>
    </div>
  );
}

function HoldScan({ holdMs, submit }: { holdMs: number; submit: (a: unknown) => void }) {
  const [p, setP] = useState(0);
  const start = useRef(0);
  const raf = useRef(0);
  const done = useRef(false);
  const tick = () => {
    const k = Math.min(1, (performance.now() - start.current) / holdMs);
    setP(k);
    if (k >= 1 && !done.current) {
      done.current = true;
      submit({ held: true });
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };
  const down = () => {
    if (done.current) return;
    start.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };
  const up = () => {
    cancelAnimationFrame(raf.current);
    if (!done.current) setP(0);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return (
    <div className="mg-center">
      <p>Đặt trang chú thích lên mặt kính, giữ nút để máy quét chạy hết trang.</p>
      <div className="scan-bar">
        <div style={{ width: `${p * 100}%` }} />
      </div>
      <button className="btn primary big" onPointerDown={down} onPointerUp={up} onPointerLeave={up}>
        {p >= 1 ? 'Đã quét xong' : 'Giữ để quét'}
      </button>
    </div>
  );
}

function Sequence({ title, sequence, options, submit }: { title: string; sequence: string[]; options: string[]; submit: (a: unknown) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const click = (o: string) => {
    if (picked.includes(o)) return;
    const next = [...picked, o];
    if (sequence[next.length - 1] !== o) {
      setWrong(true);
      setPicked([]);
      setTimeout(() => setWrong(false), 600);
      return;
    }
    setPicked(next);
    if (next.length === sequence.length) submit(next);
  };
  return (
    <div className="mg-center">
      <p>{title}</p>
      <ol className="sequence">
        {sequence.map((s, i) => (
          <li key={s} className={i < picked.length ? 'done' : ''}>
            {s}
          </li>
        ))}
      </ol>
      <div className={`option-grid ${wrong ? 'shake' : ''}`}>
        {options.map((o) => (
          <button key={o} className={`btn ${picked.includes(o) ? 'on' : ''}`} onClick={() => click(o)}>
            {picked.includes(o) ? '💡 ' : ''}
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Seal({ task, submit }: { task: Extract<TaskData, { taskId: 'task_seal_box' }>; submit: (a: unknown) => void }) {
  const [v, setV] = useState('');
  return (
    <div className="mg-center">
      <div className="slip">
        <span>Phiếu bàn giao — số niêm</span>
        <strong>{task.sealNumber}</strong>
      </div>
      <p className="muted">{task.slipNote}</p>
      <input
        className="code-input"
        value={v}
        placeholder="____-HUE"
        onChange={(e) => setV(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') submit(v);
        }}
      />
      <button className="btn primary" onClick={() => submit(v)}>
        Niêm phong
      </button>
    </div>
  );
}

function Shelf({ task, submit }: { task: Extract<TaskData, { taskId: 'task_return_shelf_a' }>; submit: (a: unknown) => void }) {
  return (
    <div className="mg-center">
      <p>
        Mã sách mượn: <strong>{task.bookCode}</strong> — trả về đúng ô trên kệ A.
      </p>
      <div className="shelf-grid">
        {task.slots.map((s) => (
          <button key={s} className="btn shelf-slot" onClick={() => submit(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
