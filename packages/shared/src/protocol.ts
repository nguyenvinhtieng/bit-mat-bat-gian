import type { Faction, RoleId, TaskId } from './constants';

/** Client -> server */
export type InputMsg = { seq: number; dx: number; dy: number }[];

export type ClientMessages = {
  input: InputMsg;
  ready: { ready: boolean };
  configure: { quick?: boolean };
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

export type TaskData =
  | { taskId: 'task_hue_cuisine'; prompt: string; items: { id: string; label: string }[] }
  | { taskId: 'task_woodblock'; prompt: string; holdMs: number }
  | { taskId: 'task_citadel_gates'; prompt: string; sequence: string[]; options: string[] }
  | { taskId: 'task_lanterns'; prompt: string; sequence: string[]; options: string[] }
  | { taskId: 'task_conical_hat'; prompt: string; question: string; options: string[] }
  | { taskId: 'task_heritage_quiz'; prompt: string; question: string; options: string[] };

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
