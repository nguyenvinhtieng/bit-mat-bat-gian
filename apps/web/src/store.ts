import { create } from 'zustand';
import type { Cinematic, ChatMsg, EndReveal, Phase, PrivateInfo, TaskData, TaskId, ToastMsg, VoteResult } from '@hidden-truth/shared';

export type PlayerView = {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  connected: boolean;
  tasksDone: number;
  voted: boolean;
  emergencyUsed: boolean;
  alive: boolean;
  body: boolean;
  bodyX: number;
  bodyY: number;
};

export type RoomView = {
  code: string;
  mapSlug: string;
  hostId: string;
  phase: Phase;
  phaseEndsAt: number;
  progress: number;
  progressTarget: number;
  meetingReason: string;
  quick: boolean;
  players: PlayerView[];
};

export type Nearby =
  | { kind: 'task'; id: TaskId; title: string; done: boolean }
  | { kind: 'report'; title: string }
  | { kind: 'emergency'; title: string; used: boolean }
  | null;

type TaskResult = { ok: boolean; text: string; fact?: string; headline?: string };

type Store = {
  screen: 'home' | 'room';
  connecting: boolean;
  error: string;
  sessionId: string;
  room: RoomView | null;
  me: PrivateInfo | null;
  chat: ChatMsg[];
  toasts: (ToastMsg & { id: number })[];
  task: TaskData | null;
  taskResult: TaskResult | null;
  /** bumps when the server rejects an answer -> the mini-game restarts */
  taskAttempt: number;
  /** night-watch drum banner (5 canh) */
  canh: { n: number; text: string; id: number } | null;
  nearby: Nearby;
  /** a player (not killer-mate) is within kill range of me */
  killTarget: boolean;
  area: string;
  /** my position in tile units */
  pos: { x: number; y: number } | null;
  introOpen: boolean;
  /** reopened from the HUD: show only the role card, no story / long animation */
  introQuick: boolean;
  voteResult: VoteResult | null;
  end: EndReveal | null;
  cinematic: (Cinematic & { id: number }) | null;
  timeOffset: number;
  ping: number;
  set: (p: Partial<Store>) => void;
  toast: (t: ToastMsg) => void;
};

let toastId = 0;
export const useStore = create<Store>((set, get) => ({
  screen: 'home',
  connecting: false,
  error: '',
  sessionId: '',
  room: null,
  me: null,
  chat: [],
  toasts: [],
  task: null,
  taskResult: null,
  taskAttempt: 0,
  canh: null,
  nearby: null,
  killTarget: false,
  area: '',
  pos: null,
  introOpen: false,
  introQuick: false,
  voteResult: null,
  end: null,
  cinematic: null,
  timeOffset: 0,
  ping: 0,
  set: (p) => set(p),
  toast: (t) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts, { ...t, id }].slice(-4) });
    setTimeout(() => set({ toasts: get().toasts.filter((x) => x.id !== id) }), 4200);
  },
}));

/** Any modal that should freeze movement / keyboard input in Phaser. */
export function uiBlocksMovement(): boolean {
  const s = useStore.getState();
  return !!(s.task || s.introOpen);
}

export const colorHex = (n: number) => '#' + n.toString(16).padStart(6, '0');
