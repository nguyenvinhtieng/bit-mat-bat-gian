import { create } from 'zustand';
import type { ArrestHoldMsg, Cinematic, ChatMsg, EndReveal, InspectResult, Phase, PrivateInfo, TaskData, TaskId, ToastMsg, VoteResult } from '@hidden-truth/shared';

/** which matchmaking call is in flight (false = idle) */
export type Connecting = false | 'create' | 'join' | 'find' | 'reconnect';

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
  /** voice chat: microphone on */
  micOn: boolean;
};

export type RoomView = {
  code: string;
  mapSlug: string;
  hostId: string;
  /** public = findable via quick-match; private = invite code only */
  isPublic: boolean;
  phase: Phase;
  phaseEndsAt: number;
  progress: number;
  progressTarget: number;
  /** countdown: elapsed = (nightPausedAt || serverNow) - nightStartAt; 0 = not running */
  nightStartAt: number;
  nightPausedAt: number;
  meetingReason: string;
  /** shared preparation turns per prep station */
  stations: Record<string, { need: number; done: number }>;
  /** handoff_package unlocked (preparation at 100%) */
  handoffOpen: boolean;
  packageState: 'home' | 'carried' | 'dropped' | 'delivered';
  packageCarrier: string;
  packageX: number;
  packageY: number;
  turnsPerDriver: number;
  /** countdown length (min) */
  nightMin: number;
  crewAlive: number;
  killersAlive: number;
  players: PlayerView[];
};

export type Nearby =
  | { kind: 'task'; id: TaskId; title: string; done: boolean }
  | { kind: 'report'; title: string }
  | { kind: 'emergency'; title: string; used: boolean }
  | { kind: 'package'; title: string }
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
  nearby: Nearby;
  /** a driver is within arrest range of me (undercover only) */
  arrestTarget: boolean;
  /** an arrest hold in progress that involves me (as the cop or the target) */
  arrestHold: ArrestHoldMsg | null;
  /** veteran: the inspect picker is open / its result */
  inspectOpen: boolean;
  inspect: InspectResult | null;
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
  nearby: null,
  arrestTarget: false,
  arrestHold: null,
  inspectOpen: false,
  inspect: null,
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
  return !!(s.task || s.introOpen || s.inspectOpen);
}

export const colorHex = (n: number) => '#' + n.toString(16).padStart(6, '0');

/** Name colour the undercover sees on themselves. Only the undercover ever receives `killerIds`. */
export const KILLER_NAME_COLOR = '#ff5a4a';
const NO_KILLERS: readonly string[] = [];
/** the undercover's own id — non-empty only when the viewer is the undercover */
export const useKillerIds = () => useStore((s) => s.me?.killerIds ?? NO_KILLERS);
