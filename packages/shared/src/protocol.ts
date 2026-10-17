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
  /** killers only: session ids of every killer, self included (names render red for them) */
  killerIds?: string[];
  /** killers only: server time (ms) when the next kill is available */
  killReadyAt?: number;
  /** killers only: server time (ms) when the next sabotage is available */
  sabotageReadyAt?: number;
  /** guardian only */
  shield?: boolean;
};

/** Ngọ Môn traveller kinds (task_ngo_mon_gates). */
export type GateTraveler = 'vua' | 'van' | 'vo' | 'linh' | 'voi' | 'ngua';
export type PoemKind = 'tho' | 'hoa';

/**
 * Mini-game payloads (server -> client). Answers stay on the server; the client only gets
 * what it needs to draw the game. See apps/server/src/content/<slug>/.
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
  | { taskId: 'task_banh_beo'; prompt: string; cups: number; steps: { id: string; name: string }[] }
  // ---- thang-long
  /** stack the layers into the mould bottom -> top, then tie the lạt. Answer: { layers: kind[], ties } */
  | { taskId: 'task_banh_chung'; prompt: string; tray: { kind: string; name: string }[]; slots: number; ties: number }
  /** match each Đông Hồ colour to its natural source. Answer: Record<colorId, sourceId> */
  | { taskId: 'task_dong_ho'; prompt: string; painting: string; colors: { id: string; name: string; hex: string }[]; sources: { id: string; name: string; hex?: string }[] }
  /** trace the calligraphy strokes in order (points 0..1 of the paper). Answer: { x, y }[][] */
  | { taskId: 'task_cho_chu'; prompt: string; glyph: string; meaning: string; strokes: Pt[][] }
  /** hang the right ornaments, then raise the swaying pole upright. Answer: { ornaments: id[], tilt } (tilt in degrees) */
  | { taskId: 'task_cay_neu'; prompt: string; tray: { id: string; name: string; desc?: string }[]; need: number; maxTilt: number }
  /** pair each first line with its second line. Answer: Record<topId, bottomId> */
  | { taskId: 'task_cau_doi'; prompt: string; tops: CoupletLine[]; bottoms: CoupletLine[] }
  /** nam: line fruits up to spell the saying; bac: chuối at the base, bưởi/phật thủ at the centre + 3 more. Answer: kind[] (nam) | { base, center, ring: kind[] } (bac) */
  | { taskId: 'task_ngu_qua'; prompt: string; region: 'bac' | 'nam'; fruits: { kind: string; name: string }[]; slots: number }
  /** tap the phách on the beats (ms from the first beat). Answer: tap times, ms */
  | { taskId: 'task_ca_tru'; prompt: string; beats: number[]; tolerance: number }
  /** steer the puppet across the pond through the marks in order. Answer: { x, y, t }[] (0..1, ms) */
  | { taskId: 'task_roi_nuoc'; prompt: string; puppet: string; start: Pt; marks: Pt[]; radius: number; speed: number };

export type Pt = { x: number; y: number };
/** `hint` = the paired words of a first line, e.g. "Đông ↔ Nam" (helps players who don't know the couplet) */
export type CoupletLine = { id: string; text: string; han?: string; hint?: string };

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
