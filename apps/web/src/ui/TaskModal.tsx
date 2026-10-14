import { useEffect, useRef, useState } from 'react';
import { HUE_STATIONS, type TaskData } from '@hidden-truth/shared';
import { send } from '../net';
import { useStore } from '../store';
import { Modal } from './common';

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
          {result.fact && (
            <p className="fact">
              💡 <b>Bạn có biết?</b> {result.fact}
            </p>
          )}
          <button className="btn primary" onClick={close}>
            Tiếp tục
          </button>
        </div>
      ) : (
        <div className="minigame">
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
    case 'task_hue_cuisine':
      return <Pick prompt={task.prompt} items={task.items} submit={submit} />;
    case 'task_woodblock':
      return <HoldPrint prompt={task.prompt} holdMs={task.holdMs} submit={submit} />;
    case 'task_citadel_gates':
    case 'task_lanterns':
      return <Sequence prompt={task.prompt} sequence={task.sequence} options={task.options} submit={submit} />;
    case 'task_conical_hat':
    case 'task_heritage_quiz':
      return <Quiz prompt={task.prompt} question={task.question} options={task.options} submit={submit} />;
  }
}

function Pick({ prompt, items, submit }: { prompt: string; items: { id: string; label: string }[]; submit: (a: unknown) => void }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const n = new Set(checked);
    n.has(id) ? n.delete(id) : n.add(id);
    setChecked(n);
  };
  return (
    <div className="mg-center">
      <p>{prompt}</p>
      <div className="option-grid">
        {items.map((i) => (
          <button key={i.id} className={`btn ${checked.has(i.id) ? 'on' : ''}`} onClick={() => toggle(i.id)}>
            {checked.has(i.id) ? '✔ ' : ''}
            {i.label}
          </button>
        ))}
      </div>
      <button className="btn primary" disabled={!checked.size} onClick={() => submit([...checked])}>
        Dọn mâm cỗ
      </button>
    </div>
  );
}

function HoldPrint({ prompt, holdMs, submit }: { prompt: string; holdMs: number; submit: (a: unknown) => void }) {
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
      <p>{prompt}</p>
      <div className="scan-bar">
        <div style={{ width: `${p * 100}%` }} />
      </div>
      <button className="btn primary big" onPointerDown={down} onPointerUp={up} onPointerLeave={up}>
        {p >= 1 ? 'Đã in xong' : 'Giữ để in'}
      </button>
    </div>
  );
}

function Sequence({ prompt, sequence, options, submit }: { prompt: string; sequence: string[]; options: string[]; submit: (a: unknown) => void }) {
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
      <p>{prompt}</p>
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

function Quiz({ prompt, question, options, submit }: { prompt: string; question: string; options: string[]; submit: (a: unknown) => void }) {
  return (
    <div className="mg-center">
      <p className="muted">{prompt}</p>
      <p className="quiz-q">{question}</p>
      <div className="option-grid">
        {options.map((o) => (
          <button key={o} className="btn" onClick={() => submit(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
