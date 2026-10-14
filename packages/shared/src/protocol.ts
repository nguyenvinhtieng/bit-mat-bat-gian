import type { DeviationType, Faction, RoleId, TaskId } from './constants';

/** Client -> server */
export type InputMsg = { seq: number; dx: number; dy: number }[];

export type ClientMessages = {
  input: InputMsg;
  ready: { ready: boolean };
  configure: { variant: 'random' | 'HUE-A' | 'HUE-B' | 'HUE-C'; quick?: boolean };
  start: Record<string, never>;
  'task:open': { taskId: TaskId };
  'task:submit': { taskId: TaskId; answer: unknown };
  'ability:open': Record<string, never>;
  'ability:use': { option?: string };
  emergency: Record<string, never>;
  chat: { text: string };
  'clue:share': { clueId: string };
  conclude: ConclusionVote;
  'host:skip': Record<string, never>;
  'host:restart': Record<string, never>;
};

export type ConclusionVote = {
  sentence: number;
  type: DeviationType;
  responsible: string;
  when: string;
};

/** Server -> client */
export type Clue = {
  id: string;
  title: string;
  body: string;
  source: string;
  /** background art key, e.g. hue-clue-paper */
  art?: string;
  /** trace left by the forger / held by broker (visible text) */
  trace?: string;
  diff?: { before: string; after: string; lang: string }[];
};

export type PrivateInfo = {
  role: RoleId;
  faction: Faction;
  objective: string;
  abilityUsedRound: number;
  notebook: Clue[];
  completedTasks: TaskId[];
  extra?: string[];
};

export type TaskData =
  | { taskId: 'task_print_checklist'; items: { id: string; label: string; log: 'ok' | 'error' }[] }
  | { taskId: 'task_scan_footnote'; holdMs: number }
  | { taskId: 'task_update_floor_plan'; rooms: string[]; sequence: string[] }
  | { taskId: 'task_check_lights_labels'; lights: string[] }
  | { taskId: 'task_seal_box'; sealNumber: string; slipNote: string }
  | { taskId: 'task_return_shelf_a'; bookCode: string; slots: string[] };

export type AbilityData = {
  role: RoleId;
  title: string;
  prompt: string;
  options?: { id: string; label: string }[];
};

export type ChatMsg = { from: string; name: string; color: number; text: string; t: number; system?: boolean };

export type EndReveal = {
  winner: Faction;
  variantId: string;
  truthSummary: string;
  truthSteps: string[];
  correct: { sentence: boolean; type: boolean; responsible: boolean; when: boolean; evidence: boolean };
  teamConclusion: ConclusionVote | null;
  sharedClueCount: number;
  roles: { name: string; role: RoleId; faction: Faction; objectiveMet?: boolean; objective: string }[];
  metaQuestion: string;
  learned: string;
};

export type ToastMsg = { text: string; kind?: 'info' | 'warn' | 'success' };
