import { useEffect } from 'react';
import { useLang } from '../i18n';
import { send } from '../net';
import { useStore } from '../store';
import { CloseButton, useEscape, useSkin } from './common';
import { Minigame } from './minigames';

const AUTO_CLOSE_MS = 1000;

export function TaskModal() {
  const task = useStore((s) => s.task);
  const result = useStore((s) => s.taskResult);
  const attempt = useStore((s) => s.taskAttempt);
  const set = useStore((s) => s.set);
  const lang = useLang((s) => s.lang);
  const skin = useSkin();
  const en = lang === 'en';
  const close = () => set({ task: null, taskResult: null });
  useEscape(task && !result ? close : undefined);
  useEffect(() => {
    if (!result) return;
    // Release keyboard and touch movement while the shared completion cue is visible.
    set({ task: null });
    const auto = window.setTimeout(() => {
      if (useStore.getState().taskResult === result) set({ taskResult: null });
    }, AUTO_CLOSE_MS);
    return () => window.clearTimeout(auto);
  }, [result, set]);

  if (result) {
    return (
      <div className="task-done" role="status" aria-live="polite" aria-atomic="true">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2" />
          <path d="m9 16 5 5 9-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <strong>{en ? 'Task complete' : 'Đã xong nhiệm vụ'}</strong>
      </div>
    );
  }
  if (!task) return null;
  const st = skin.stations.find((x) => x.id === task.taskId)!;
  const submit = (answer: unknown) => send('task:submit', { taskId: task.taskId, answer });
  const title = en ? st.titleEn : st.title;

  return (
    // full-screen play area, no popup frame (Among Us style)
    <div className="task-screen task-modal" role="dialog" aria-modal="true" aria-label={title}>
      <CloseButton className="task-screen-x" onClick={close} label={en ? 'Close' : 'Đóng'} />
      <div className={`minigame mg-task mg-${task.taskId}`}>
        <div className="minigame-inner">
          <Minigame key={attempt} task={task} submit={submit} />
        </div>
      </div>
    </div>
  );
}
