import type { Faction, PrepTaskId, RoleId, TaskId } from './constants';

/** Client -> server */
export type InputMsg = { seq: number; dx: number; dy: number }[];

export type ClientMessages = {
  input: InputMsg;
  ready: { ready: boolean };
  /** tasksPerPlayer: prep stations dealt to each player; timeMin: countdown length in minutes; cops: undercover count */
  configure: { tasksPerPlayer?: number; timeMin?: number; cops?: number };
  start: Record<string, never>;
  'task:open': { taskId: TaskId };
  'task:submit': { taskId: TaskId; answer: unknown };
  /** closed the task window: frees the station slot */
  'task:cancel': Record<string, never>;
  /** undercover only: on=true requests an immediate arrest; on=false is a compatibility no-op */
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
  /** explore only: a short line shown as a speech bubble over your head (not logged on the board) */
  say: { text: string };
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
 * Mini-game payloads (server -> client). Hands-on games (drag, swipe, hold, tap timing) — never a
 * "pick 1 of 4". The server sends the round's setup and checks that the reported play fits it.
 * See apps/server/src/content/game/.
 */
export type CoolerItem = { id: string; kind: string; name: string; need: 'cup' | 'bottom' | 'shelf' };
export type Seller = { id: string; kind: string; name: string; line: string };
export type RackBox = { id: string; kind: string; name: string; w: number };
/** Parking-lot bike: top-left cell, length in cells, axis. `mine` must leave through the exit on the right of its row. */
export type LotBike = { id: string; x: number; y: number; len: number; dir: 'h' | 'v'; mine?: boolean };
export type Pothole = { at: number; lane: number; kind: string };

export type TaskData =
  /** Match all four coloured terminals. Answer: { connections: { from: string, to: string }[] } */
  | { taskId: 'connect_wires'; prompt: string; left: string[]; right: string[] }
  /** drag each takeaway item into the cooler: drinks in cup holders, soup at the bottom. Answer: Record<itemId, slotId> */
  | { taskId: 'pack_cooler'; prompt: string; bill: string[]; items: CoolerItem[]; slots: { id: string; kind: 'cup' | 'bottom' | 'shelf' }[] }
  /** Release each peg in order, then plug in. Answer: { released: string[], plugged: true } */
  | { taskId: 'untangle_charger'; prompt: string; pegs: (Pt & { id: string })[]; phone: Pt }
  /** Lift slowly to stay quiet; pause to cool noise. Answer: { samples: { dtMs, rise }[] }. */
  | { taskId: 'stuck_shutter'; prompt: string; quietSpeed: number; noiseGain: number; cooldownRate: number; alarmMs: number }
  /** Tune both aerial arms and hold the picture steady. Answer: { angles: [number, number], heldMs: number } */
  | { taskId: 'tune_antenna'; prompt: string; target: [number, number]; tolerance: number; holdMs: number }
  /** Rotate four pipe corners and open the valve. Answer: { rotations: number[], opened: true } */
  | { taskId: 'water_pipes'; prompt: string; rotations: number[]; solution: number[] }
  /** hold to pour condensed milk into its band, then coffee into its band (0..1 of the glass). Answer: { milk, coffee } */
  | { taskId: 'brew_coffee'; prompt: string; milk: [number, number]; coffee: [number, number]; rate: number }
  /** drag the phone around the stall until the signal is full, hold it there. Answer: { x, y } (0..1) */
  | { taskId: 'wifi_hunt'; prompt: string; networks: string[]; spot: Pt; radius: number }
  /** hold to pump (`rate` psi/s) while heat builds; release to cool; stop with the needle in the green. Answer: { psi, heldMs } */
  | { taskId: 'pump_tyre'; prompt: string; green: [number, number]; max: number; rate: number; heatRate: number; coolRate: number }
  /** slide the tube through the basin, tap each bubbling section to patch it. Answer: { patched: section[] } */
  | { taskId: 'patch_tube'; prompt: string; sections: number; leaks: number[] }
  /** drag round the box along the dotted line, `laps` times. Answer: { laps } */
  | { taskId: 'tape_box'; prompt: string; strips: number }
  /** a box swings over the rack, tap to drop; keep the stack standing. Answer: { offsets: number[] } (px from the box below, per box) */
  | { taskId: 'stack_rack'; prompt: string; boxes: RackBox[]; base: number; swing: number }
  /** slide bikes along their axis to free yours (Rush Hour). Answer: { moves: { id, d }[] } (d = ±1 cell) */
  | { taskId: 'unpark_bike'; prompt: string; w: number; h: number; bikes: LotBike[] }
  /** the bike rides on its own; swipe between 3 lanes to dodge. Answer: { moves: { at, lane }[] } (ms since start) */
  | { taskId: 'dodge_potholes'; prompt: string; lanes: number; duration: number; obstacles: Pothole[] }
  /** final step, package in hand: hold the bell, snap the delivery photo, slide "Delivered". Answer: { rang, photo, slid } */
  | { taskId: 'handoff_package'; prompt: string; ringMs: number; tolerance: number };

export type Pt = { x: number; y: number };

/** Sent when a task is solved: success line + the story card. */
export type TaskResultMsg = { ok: boolean; text: string; fact?: string; headline?: string };

/** Server -> all: a speech bubble over `from`'s head */
export type SayMsg = { from: string; text: string };
export const SAY_MAX = 80;
/** Max display-name length (keeps nameplates / HUD lists from overflowing) */
export const NAME_MAX = 12;

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
