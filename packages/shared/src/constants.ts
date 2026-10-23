export const TILE = 48;
export const LAYOUT_VERSION = 1;

/** Server simulation / client prediction step (seconds). */
export const SIM_HZ = 30;
export const SIM_DT = 1 / SIM_HZ;
export const PATCH_MS = 50;
export const PLAYER_SPEED = 170; // px / s
/** Collision half-extents (px). Player position = feet point; the box sits just above it (the scooter's wheels end ~3px above the feet). */
export const BODY_HW = 12;
export const BODY_HH = 7;
/** Box centre relative to the feet point (px, negative = up): y + BODY_OY ± BODY_HH. */
export const BODY_OY = -10;
export const INTERACT_RADIUS = 72;

export const MAX_PLAYERS = 10;
/** a game cannot start with fewer players */
export const MIN_PLAYERS = 4;
export const ROOM_NAME = 'investigation';

/** Public domain the game is deployed at (web + WebSocket on one origin). */
export const GAME_DOMAIN = 'bitmat.vinhtieng.com';
export const GAME_URL = `https://${GAME_DOMAIN}`;

export const AREA_IDS = [
  'courtyard_checkin',
  'exhibition',
  'corridor',
  'coordination',
  'editing',
  'archive',
  'artifact_storage',
] as const;
export type AreaId = (typeof AREA_IDS)[number];

/** Hẻm 42 — Cuốc Cuối: one undercover cop hunts the CRAB drivers; one veteran driver can read a task log once. */
export const ROLE_IDS = ['driver', 'veteran_driver', 'undercover'] as const;
export type RoleId = (typeof ROLE_IDS)[number];
/** internal faction ids: `crew` = Hội Tài Xế, `killer` = Công an (display names come from the skin) */
export type Faction = 'crew' | 'killer';

export const ROLE_INFO: Record<RoleId, { name: string; nameEn: string; faction: Faction; icon: string; short: string; desc: string }> = {
  driver: {
    name: 'Tài Xế',
    nameEn: 'Driver',
    faction: 'crew',
    icon: 'local_guide',
    short: 'Chuẩn bị Cuốc Cuối, tìm công an chìm',
    desc: 'Làm các nhiệm vụ chuẩn bị chuyến hàng 50 triệu, quan sát người khác, họp và bỏ phiếu.',
  },
  veteran_driver: {
    name: 'Tài Xế Lão Làng',
    nameEn: 'Veteran Driver',
    faction: 'crew',
    icon: 'conservator',
    short: 'Soi lịch sử nhiệm vụ của một người (1 lần)',
    desc: 'Tài xế thật. Một lần mỗi trận, xem tối đa 3 hoạt động nhiệm vụ gần nhất của một người.',
  },
  undercover: {
    name: 'Công An Chìm — Tất Xanh',
    nameEn: 'Undercover Cop — Green Socks',
    faction: 'killer',
    icon: 'forger',
    short: 'Bắt giữ từng tài xế trước khi hàng được giao',
    desc: 'Trà trộn như tài xế thường, làm task giả để có vỏ bọc. Bấm nút Bắt giữ một lần ở cự ly gần để bắt từng người.',
  },
};

export type Phase = 'lobby' | 'explore' | 'meeting' | 'reveal' | 'ended';

export const PLAYER_COLORS = [
  0xe8524a, 0x3f7fd9, 0x3fae5a, 0xf2c230, 0xa05bd6, 0xf08a2c, 0x35c0c0, 0xef6fb0, 0x8d6e4a, 0x6b7a8f, 0xb8d94a, 0xf4f0e6,
];

/**
 * Cuốc Cuối tasks: two stations per area (except the alley mouth), 11 preparation tasks feed
 * `deliveryPreparation`; `handoff_package` ends the run. Ordered by area.
 */
export const PREP_TASK_IDS = [
  'pack_cooler', // Dãy Quán Ăn
  'water_pipes',
  'brew_coffee', // Quán Nước
  'wifi_hunt',
  'pump_tyre', // Tiệm Sửa Xe
  'patch_tube',
  'connect_wires',
  'tape_box', // Kho CRAB
  'stack_rack',
  'unpark_bike', // Bãi Giữ Xe
  'stuck_shutter',
  'untangle_charger',
  'tune_antenna',
  'dodge_potholes', // Hẻm Cuối
] as const;
export const TASK_IDS = [...PREP_TASK_IDS, 'handoff_package'] as const;
export type TaskId = (typeof TASK_IDS)[number];
export type PrepTaskId = (typeof PREP_TASK_IDS)[number];

export const GAME = {
  /** prep stations dealt to each player (host-adjustable, 1..all stations); every list is personal */
  tasksPerPlayerMin: 1,
  tasksPerPlayerMax: PREP_TASK_IDS.length,
  tasksPerPlayerDefault: 3,
  /** Legacy hold duration, retained for compatibility; live arrests are immediate */
  arrestRange: 84,
  arrestHoldSec: 1.5,
  arrestCooldownSec: 35,
  firstArrestCooldownSec: 20,
  /** nearby players hear the cuffs (px, through walls) */
  arrestHearRadius: 420,
  /** how far a living player can see (px); also blocked by walls */
  visionRadius: 264,
  /** how far other players are actually detected (px) — a bit past the lamp's glow */
  sightRadius: 330,
  reportRange: 110,
  /** pick up / drop the package within this range */
  packageRange: 84,
  /** after a meeting */
  postMeetingCooldownSec: 15,
  meetingSec: 75,
  /** single countdown "before daybreak" (minutes, host-adjustable); pauses during meetings; at zero the cop wins */
  timeMinMin: 4,
  /** dev builds only: short rounds for testing */
  timeMinMinDev: 1,
  timeMinMax: 15,
  timeMinDefault: 8,
  /** undercover cops per game (host-adjustable); must stay below half the civilians, see `maxCops` */
  copsMin: 1,
  copsMax: 5,
  copsDefault: 1,
  /** 2.5s kick message + 6s sock-check clip + time to read the verdict */
  revealSec: 10.5,
  /** prelude (~8.8s) + a few seconds to read the role on game start; the countdown starts when it ends */
  introSec: 13,
  emergencyPerPlayer: 1,
  /** veteran: how many recent task activities the inspection shows */
  inspectEntries: 3,
};

/** Most cops `n` players allow: cops < civilians / 2, i.e. 3 * cops < n (never below 1). */
export const maxCops = (n: number) => Math.max(GAME.copsMin, Math.floor((n - 1) / 3));
export const copsValid = (cops: number, n: number) => cops >= GAME.copsMin && 3 * cops < n;
/** The cop count actually dealt: the host's pick, clamped to 1..maxCops(n). */
export const copsFor = (want: number, n: number) => Math.max(GAME.copsMin, Math.min(maxCops(n), Math.floor(want) || 0));

/**
 * Personal prep lists for one game: each player gets `perPlayer` distinct stations, always picking
 * the least-dealt ones (random tie-break) so the crew spreads out instead of walking around as one pack.
 */
export const dealTasks = (ids: readonly string[], perPlayer: number, rand = Math.random): Record<string, PrepTaskId[]> => {
  const per = Math.max(GAME.tasksPerPlayerMin, Math.min(GAME.tasksPerPlayerMax, Math.floor(perPlayer) || 0));
  const load = new Map<PrepTaskId, number>(PREP_TASK_IDS.map((t) => [t, 0]));
  const out: Record<string, PrepTaskId[]> = {};
  for (const id of ids) {
    const pool = PREP_TASK_IDS.map((t) => ({ t, k: load.get(t)! + rand() * 0.5 })).sort((a, b) => a.k - b.k);
    out[id] = pool.slice(0, per).map((x) => x.t);
    for (const t of out[id]) load.set(t, load.get(t)! + 1);
  }
  return out;
};
