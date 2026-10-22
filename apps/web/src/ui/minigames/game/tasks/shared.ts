import { useEffect, useRef, useState } from 'react';
import { GAME_SKIN, type TaskData } from '@hidden-truth/shared';
import { asset } from '../../../common';
import { sfx, type Submit } from '../../common/kit';

export type T<K extends TaskData['taskId']> = Extract<TaskData, { taskId: K }>;
export type P<K extends TaskData['taskId']> = { task: T<K>; submit: Submit };

/** A sprite from the task's own art folder: tasks/<taskId>/<name>.svg (placeholders, redrawn later). */
export const taskArt = (taskId: TaskData['taskId'], name: string) => asset(`${GAME_SKIN.art.tasks}/${taskId}/${name}.svg`);

/** the server refuses answers faster than a person could play (≤ 3 s for every game but the potholes run) */
const MIN_PLAY_MS = 3100;

/** Lock the UI after the first answer so a double tap never sends twice. */
export function useOnce(submit: Submit): [boolean, Submit] {
  const [sent, setSent] = useState(false);
  const [openedAt] = useState(() => performance.now());
  return [
    sent,
    (a) => {
      if (sent) return;
      setSent(true);
      sfx.stamp();
      window.setTimeout(() => submit(a), Math.max(450, MIN_PLAY_MS - (performance.now() - openedAt)));
    },
  ];
}

/** requestAnimationFrame loop while `on`; the callback gets ms since the previous frame. */
export function useFrame(on: boolean, cb: (dt: number) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      ref.current(Math.min(64, now - last));
      last = now;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [on]);
}

/** Pointer position inside an element, 0..1 on both axes. */
export const rel = (e: { clientX: number; clientY: number }, el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
};
