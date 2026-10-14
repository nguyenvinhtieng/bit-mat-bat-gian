import { create } from 'zustand';
import type { AbilityData, ChatMsg, Clue, EndReveal, Phase, PrivateInfo, TaskData, TaskId, ToastMsg } from '@hidden-truth/shared';

export type PlayerView = {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  connected: boolean;
  tasksDone: number;
  voted: boolean;
  emergencyUsed: boolean;
};

export type BoardClue = Clue & { by: string };

export type RoomView = {
  code: string;
  hostId: string;
  phase: Phase;
  round: number;
  maxRounds: number;
  phaseEndsAt: number;
  progress: number;
  progressTarget: number;
  finalMeeting: boolean;
  meetingReason: string;
  variantChoice: string;
  quick: boolean;
  players: PlayerView[];
  board: BoardClue[];
};

export type Nearby =
  | { kind: 'task'; id: TaskId; title: string; done: boolean }
  | { kind: 'ability'; title: string; used: boolean }
  | { kind: 'emergency'; title: string; used: boolean }
  | null;

type TaskResult = { ok: boolean; text: string; clues?: Clue[] };

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
  ability: AbilityData | null;
  abilityResult: { clue: Clue | null } | null;
  nearby: Nearby;
  area: string;
  notebookOpen: boolean;
  introOpen: boolean;
  viewClue: Clue | null;
  end: EndReveal | null;
  timeOffset: number;
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
  ability: null,
  abilityResult: null,
  nearby: null,
  area: '',
  notebookOpen: false,
  introOpen: false,
  viewClue: null,
  end: null,
  timeOffset: 0,
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
  return !!(s.task || s.ability || s.notebookOpen || s.introOpen || s.viewClue);
}

export const colorHex = (n: number) => '#' + n.toString(16).padStart(6, '0');
