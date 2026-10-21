import type { Faction, RoleId, TaskId } from './constants';

/** `blind` = vision cut for a few seconds; `ward` = critical, fix at a spot before time runs out. */
export type SabotageKind = 'blind' | 'ward';

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
  /** lobby only: change your own display name */
  rename: { name: string };
  /** target = player id, or 'skip' */
  vote: { target: string };
  /** killers only */
  sabotage: { kind: SabotageKind };
  /** press (on) / release (off) the fix button at the ward spot */
  'sabotage:fix': { on: boolean };
  'host:skip': Record<string, never>;
  /** after the game: anyone may bring the room back to its lobby */
  'lobby:return': Record<string, never>;
  'host:kick': { target: string };
  /** lobby only: switch the room's map (falls back to the default when not playable) */
  'host:map': { map: string };
  /** lobby only: public = listed for quick-match, private = invite code only */
  'host:visibility': { public: boolean };
  /** voice chat: WebRTC offer/answer/ICE for one peer (relayed as-is to `to`) */
  'voice:signal': { to: string; data: VoiceSignal };
  'voice:mic': { on: boolean };
};

/** voice:signal payload; the server relays it to the peer as `{ from, data }` */
export type VoiceSignal = { sdp: { type: 'offer' | 'answer'; sdp: string } } | { ice: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null } };

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
  /** killers only: session ids of every killer, self included (names render red for them) */
  killerIds?: string[];
  /** killers only: server time (ms) when the next kill is available */
  killReadyAt?: number;
  /** killers only: server time (ms) when the next sabotage is available */
  sabotageReadyAt?: number;
  /** guardian only */
  shield?: boolean;
};

/**
 * Mini-game payloads (server -> client). Answers stay on the server; the client only gets
 * what it needs to draw the game. See apps/server/src/content/game/.
 */
export type TaskData =
  /** read each (self-correcting) passenger line, pick the turn they finally mean. Answer: GameTurn[] in step order */
  | { taskId: 'task_chi_duong'; prompt: string; passenger: string; steps: { id: string; say: string }[] }
  /** memorise the order (hidden after memoMs), then pick exactly what goes on the plate. Answer: kind[] */
  | { taskId: 'task_com_tam'; prompt: string; customer: string; order: string[]; memoMs: number; want: number; tray: { kind: string; name: string }[] }
  /** learn tonight's signals, then judge each street call as it passes. Answer: Record<callId, 'safe' | 'stranger'> */
  | { taskId: 'task_tieng_rao'; prompt: string; legend: { text: string; means: 'safe' | 'stranger' }[]; calls: { id: string; text: string }[]; callMs: number }
  /** wait for the phin to drip through, then pour condensed milk to the line. Answer: { milk } (0..1 of the glass) */
  | { taskId: 'task_ca_phe_phin'; prompt: string; drips: number; dripMs: number; line: number; tolerance: number }
  /** hold the nozzle and let go on the target amount. Answer: { holdMs }; the server recomputes the money */
  | { taskId: 'task_do_xang'; prompt: string; target: number; pricePerLiter: number; litersPerSec: number; tolerance: number }
  /** turn the tube through the basin, spot where it bubbles, patch every leak. Answer: { patches: sector[] } */
  | { taskId: 'task_va_vo'; prompt: string; sectors: number; leaks: number[] }
  /** read the group chat, write each driver's contribution in the ledger. Answer: Record<rowId, amountId> */
  | { taskId: 'task_so_hui'; prompt: string; rows: { id: string; name: string }[]; messages: { from: string; text: string }[]; amounts: { id: string; label: string }[] }
  /** sort the loose notes into one stack per value, then report the total. Answer: { stacks: Record<noteId, value>, total } */
  | { taskId: 'task_dem_tien'; prompt: string; notes: { id: string; value: number }[]; values: number[]; choices: number[] }
  /** flip the envelopes and pick the highest bid before time runs out. Answer: envelopeId */
  | { taskId: 'task_khui_hui'; prompt: string; envelopes: { id: string; name: string; bid: string }[]; limitMs: number }
  /** park every bike in the lot (grid cells, no overlap, off the pillars). Answer: Record<bikeId, { x, y, vertical }> */
  | { taskId: 'task_xep_xe'; prompt: string; w: number; h: number; blocked: Pt[]; bikes: { id: string; len: number; crab?: boolean }[] };

export type GameTurn = 'trai' | 'phai' | 'thang';

export type Pt = { x: number; y: number };

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
  youAre?: 'actor' | 'victim' | 'witness';
  /** world position (px, feet point) of the victim — used to play in-world FX */
  at?: { x: number; y: number };
};
