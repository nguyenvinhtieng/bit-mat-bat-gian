import type { Faction, RoleId, TaskId } from './constants';

/** Client -> server */
export type InputMsg = { seq: number; dx: number; dy: number }[];

export type ClientMessages = {
  input: InputMsg;
  ready: { ready: boolean };
  configure: { killers?: number; tasksPerPlayer?: number; nightMin?: number; nightAuto?: boolean };
  start: Record<string, never>;
  'task:open': { taskId: TaskId };
  'task:submit': { taskId: TaskId; answer: unknown };
  kill: Record<string, never>;
  report: Record<string, never>;
  emergency: Record<string, never>;
  chat: { text: string };
  /** target = player id, or 'skip' */
  vote: { target: string };
  'host:skip': Record<string, never>;
  'host:restart': Record<string, never>;
  'host:kick': { target: string };
};

/** Server -> client (private, only to the owner) */
export type PrivateInfo = {
  role: RoleId;
  faction: Faction;
  objective: string;
  /** assigned task ids (killers get a fake list) */
  tasks: TaskId[];
  completedTasks: TaskId[];
  /** killers only: fellow killer names */
  mates?: string[];
  /** killers only: server time (ms) when the next kill is available */
  killReadyAt?: number;
  /** guardian only */
  shield?: boolean;
};

/** Ngọ Môn traveller kinds (task_ngo_mon_gates). */
export type GateTraveler = 'vua' | 'van' | 'vo' | 'linh' | 'voi' | 'ngua';
export type PoemKind = 'tho' | 'hoa';

/**
 * Mini-game payloads (server -> client). Answers stay on the server; the client only gets
 * what it needs to draw the game. See apps/server/src/content/co-do-hue.content.ts.
 */
export type TaskData =
  /** tap the 8 moon phases in cycle order, starting from Sóc (new moon). Answer: moon ids in order. */
  | { taskId: 'task_moon_phase'; prompt: string; moons: { id: string; phase: number }[] }
  /** pick the mirrored block, ink it, press the paper. Answer: { block } */
  | { taskId: 'task_woodblock_print'; prompt: string; glyph: string; meaning: string; blocks: { id: string; flip: 'none' | 'mirror' | 'flipV' | 'rot180' }[] }
  /** route each traveller to one of the 5 gates (index 0..4, screen left -> right). Answer: gate index per traveller. */
  | { taskId: 'task_ngo_mon_gates'; prompt: string; travelers: { id: string; kind: GateTraveler }[]; gates: { name: string; for: string }[] }
  /** place 6 officials on the phẩm sơn steles. Answer: Record<slotId, officialId>, slotId = `${side}-${rank}` */
  | { taskId: 'task_court_ranks'; prompt: string; officials: { id: string; side: 'van' | 'vo'; rank: number; name: string }[] }
  /** repeat the instrument sequence. Answer: instrument ids. */
  | { taskId: 'task_nha_nhac'; prompt: string; instruments: { id: string; name: string }[]; sequence: string[] }
  /** scratch the dust, tap the requested relief images. Answer: cell ids. */
  | { taskId: 'task_cuu_dinh'; prompt: string; urn: string; cells: { id: string; motif: string; name: string }[]; targets: string[] }
  /** fill the missing wall panels (alternate poem / painting, matching themes). Answer: Record<slot, trayId>. */
  | {
      taskId: 'task_poem_wall';
      prompt: string;
      panels: { slot: number; kind?: PoemKind; theme?: string }[];
      tray: { id: string; kind: PoemKind; theme: string }[];
      themes: Record<string, { han: string; name: string }>;
    }
  /** move the swaying seal onto the red frame, then hold to press. Answer: { x, y } (0..1 of the paper). */
  | { taskId: 'task_royal_seal'; prompt: string; target: { x: number; y: number }; tolerance: number; holdMs: number }
  /** build N bánh bèo cups step by step. Answer: { cups } */
  | { taskId: 'task_banh_beo'; prompt: string; cups: number; steps: { id: string; name: string }[] };

/** Sent when a task is solved: success line + the heritage card ("Bạn có biết?"). */
export type TaskResultMsg = { ok: boolean; text: string; fact?: string; headline?: string };

export type ChatMsg = { from: string; name: string; color: number; text: string; t: number; system?: boolean };

export type VoteResult = {
  /** name of the ejected player, or null (tie / skip) */
  ejected: string | null;
  ejectedColor?: number;
  wasKiller?: boolean;
  killersLeft: number;
  tally: { name: string; color: number; votes: number }[];
  skips: number;
};

export type EndReveal = {
  winner: Faction;
  reason: string;
  roles: { name: string; color: number; role: RoleId; faction: Faction; alive: boolean; tasksDone: number }[];
  fact: string;
};

/** Night-watch drum (5 canh) progress announcement. */
export type CanhMsg = { canh: number; text: string };

export type ToastMsg = { text: string; kind?: 'info' | 'warn' | 'success' };

/** Full-screen cinematic shown on key events (kill / report / emergency). */
export type Cinematic = {
  kind: 'kill' | 'report' | 'emergency' | 'shield' | 'witness';
  actor: { name: string; color: number };
  victim?: { name: string; color: number };
  /** which side of the screen the viewer is (victim sees themselves as victim) */
  youAre?: 'actor' | 'victim';
  /** world position (px, feet point) of the victim — used to play in-world FX */
  at?: { x: number; y: number };
};
