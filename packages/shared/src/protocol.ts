import type { Faction, PrepTaskId, RoleId, TaskId } from './constants';

/** Client -> server */
export type InputMsg = { seq: number; dx: number; dy: number }[];

export type ClientMessages = {
  input: InputMsg;
  ready: { ready: boolean };
  /** tasksPerPlayer: prep stations dealt to each player; timeMin: countdown length in minutes */
  configure: { tasksPerPlayer?: number; timeMin?: number };
  start: Record<string, never>;
  'task:open': { taskId: TaskId };
  'task:submit': { taskId: TaskId; answer: unknown };
  /** undercover only: press (on) / release (off) the arrest button; the server times the hold */
  arrest: { on: boolean };
  /** pick up the package when standing next to it */
  'package:pick': Record<string, never>;
  /** put the package down where you stand */
  'package:drop': Record<string, never>;
  /** veteran only, once per game: read the target's last task activities */
  'skill:inspect': { target: string };
  report: Record<string, never>;
  emergency: Record<string, never>;
  chat: { text: string };
  /** lobby only: change your own display name */
  rename: { name: string };
  /** target = player id, or 'skip' */
  vote: { target: string };
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
  /** own prep list (the undercover's is fake cover) */
  tasks: { id: PrepTaskId; done: boolean }[];
  /** undercover only: server time (ms) when the next arrest is available */
  arrestReadyAt?: number;
  /** undercover only: own session id (name renders red for them) */
  killerIds?: string[];
  /** veteran only: the one-time inspection is still available */
  inspectLeft?: boolean;
};

/** One task activity as the veteran sees it — never the role or a "fake" flag. */
export type ActivityEntry = { taskId: TaskId; title: string; area: string; agoSec: number; status: 'done' | 'failed' };
/** Server -> veteran only. */
export type InspectResult = { target: string; color: number; entries: ActivityEntry[] };

/** Arrest hold feedback: to the target (`youAre: 'target'`) and to the cop (`'actor'`). `on: false` = released/cancelled. */
export type ArrestHoldMsg = { on: boolean; youAre: 'actor' | 'target'; endsAt?: number; by?: string };

/**
 * Mini-game payloads (server -> client). Answers stay on the server; the client only gets
 * what it needs to draw the game. See apps/server/src/content/game/.
 */
export type TaskData =
  /** compare the slip's 3 codes with the boxes, pick the one that matches all three. Answer: boxId */
  | { taskId: 'receive_package'; prompt: string; slip: string[]; boxes: { id: string; codes: string[] }[] }
  /** turn every seal piece upright without opening the box. Answer: Record<pieceId, turns> (clockwise quarter turns) */
  | { taskId: 'check_seal'; prompt: string; pieces: { id: string; rot: number; glyph: string }[]; motto: string }
  /** read the customer's scattered messages, pick the address card they describe. Answer: cardId */
  | { taskId: 'decode_address'; prompt: string; messages: { from: string; text: string }[]; cards: { id: string; lines: string[] }[] }
  /** draw a route from start to end through every required stop, avoiding flooded cells and dead ends. Answer: Pt[] (start..end, 4-neighbour steps) */
  | { taskId: 'plan_route'; prompt: string; w: number; h: number; start: Pt; end: Pt; stops: Pt[]; flooded: Pt[]; deadEnds: Pt[] }
  /** pump the tyre into the green zone, then tighten the straps in number order. Answer: { pumps, order: strapId[] } */
  | { taskId: 'prepare_bike'; prompt: string; perPump: number; green: [number, number]; max: number; straps: { id: string; n: number }[] }
  /** follow the customer's packing note: outer box, label, padding layers bottom -> top. Answer: { box, label, layers: id[] } */
  | {
      taskId: 'pack_disguise';
      prompt: string;
      note: string[];
      boxes: { id: string; name: string }[];
      labels: { id: string; name: string }[];
      layers: { id: string; name: string }[];
      layerCount: number;
    }
  /** match the last 4 digits + passphrase from the message to one of the callers. Answer: callerId */
  | { taskId: 'confirm_recipient'; prompt: string; message: string; callers: { id: string; name: string; code4: string; phrase: string }[] }
  /** final step: you carried the box here — key in the receiving code from the verified message. Answer: { code } */
  | { taskId: 'handoff_package'; prompt: string; message: string; digits: number };

export type Pt = { x: number; y: number };

/** Sent when a task is solved: success line + the story card. */
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

export type ToastMsg = { text: string; kind?: 'info' | 'warn' | 'success' };

/** Full-screen cinematic shown on key events (arrest / report / emergency). `kill` = an arrest. */
export type Cinematic = {
  kind: 'kill' | 'report' | 'emergency' | 'witness';
  actor: { name: string; color: number };
  victim?: { name: string; color: number };
  /** which side of the screen the viewer is (victim sees themselves as victim) */
  youAre?: 'actor' | 'victim' | 'witness';
  /** world position (px, feet point) of the victim — used to play in-world FX */
  at?: { x: number; y: number };
};
