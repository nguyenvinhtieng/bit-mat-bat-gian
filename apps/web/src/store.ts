import { create } from 'zustand';
import type { Cinematic, ChatMsg, EndReveal, Phase, PrivateInfo, SabotageKind, TaskData, TaskId, ToastMsg, VoteResult } from '@hidden-truth/shared';

/** which matchmaking call is in flight (false = idle) */
export type Connecting = false | 'create' | 'join' | 'reconnect';

export type PlayerView = {
  id: string;
  name: string;
  color: number;
  ready: boolean;
  connected: boolean;
  tasksDone: number;
  voted: boolean;
  /** target id, 'skip', or '' */
  voteFor: string;
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
  /** night clock: elapsed = (nightPausedAt || serverNow) - nightStartAt; 0 = not running */
  nightStartAt: number;
  nightPausedAt: number;
  meetingReason: string;
  /** running sabotage ('' = none); ward spot/area only while a ward runs */
  sabotage: '' | SabotageKind;
  sabotageEndsAt: number;
  sabotageArea: string;
  sabotageX: number;
  sabotageY: number;
  killers: number;
  tasksPerPlayer: number;
  /** whole-night length (min); nightAuto = follows lobby size until the host sets it */
  nightMin: number;
  nightAuto: boolean;
  crewAlive: number;
  killersAlive: number;
  players: PlayerView[];
};

export type Nearby =
  | { kind: 'task'; id: TaskId; title: string; done: boolean }
  | { kind: 'report'; title: string }
  | { kind: 'emergency'; title: string; used: boolean }
  | { kind: 'fix'; title: string }
  | null;

type TaskResult = { ok: boolean; text: string; fact?: string; headline?: string };

type Store = {
  screen: 'home' | 'room';
  connecting: Connecting;
  /** lost the room unexpectedly and retrying in the background */
  reconnecting: boolean;
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
  /** holding the sabotage fix button (pointer or E/Space) */
  fixing: boolean;
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
  reconnecting: false,
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
  fixing: false,
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

/** Name colour Âm Binh see on fellow Âm Binh (and themselves). Only killers ever receive `killerIds`. */
export const KILLER_NAME_COLOR = '#ff5a4a';
const NO_KILLERS: readonly string[] = [];
/** ids of every Âm Binh — non-empty only when the viewer is one */
export const useKillerIds = () => useStore((s) => s.me?.killerIds ?? NO_KILLERS);
