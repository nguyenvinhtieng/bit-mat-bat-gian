import type { TaskData, TaskId } from '@hidden-truth/shared';

export const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const sample = <T>(arr: readonly T[], n: number) => shuffle(arr).slice(0, n);
export const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
export const rid = () => Math.random().toString(36).slice(2, 8);
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export type Fact = { headline: string; text: string };

/** A task the server handed out and is waiting to verify. */
export type Pending = { taskId: TaskId; expected: unknown; openedAt: number; reward?: Fact; done?: string; minMs?: number };

/** Client payload + what to verify (never sent) + the minimum plausible solve time. */
export type Built = { data: TaskData; expected: unknown; minMs: number };

/** Host-only content of one map. */
/** Per-match secrets a task may need (e.g. the receiving code shared by confirm_recipient and the handoff). */
export type TaskCtx = { handoffCode: string };

export type MapContent = {
  /** one-liners for the meeting / loading screens */
  funFacts: readonly string[];
  buildTask(taskId: TaskId, ctx: TaskCtx): (Built & { fact: Fact; done: string }) | null;
  verifyTask(p: Pending, answer: unknown): boolean;
};
