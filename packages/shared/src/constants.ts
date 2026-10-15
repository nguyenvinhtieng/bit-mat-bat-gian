export const TILE = 48;
export const LAYOUT_VERSION = 1;

/** Server simulation / client prediction step (seconds). */
export const SIM_HZ = 30;
export const SIM_DT = 1 / SIM_HZ;
export const PATCH_MS = 50;
export const PLAYER_SPEED = 170; // px / s
/** Feet collision half-extents (px). Player position = feet point. */
export const BODY_HW = 12;
export const BODY_HH = 7;
export const INTERACT_RADIUS = 72;

export const MAX_PLAYERS = 10;
/** a game cannot start with fewer players */
export const MIN_PLAYERS = 4;
export const ROOM_NAME = 'investigation';

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

/** Among-Us style: a few killers hunt, everybody else does tasks. */
export const ROLE_IDS = ['villager', 'guardian', 'killer'] as const;
export type RoleId = (typeof ROLE_IDS)[number];
export type Faction = 'crew' | 'killer';

export const ROLE_INFO: Record<RoleId, { name: string; nameEn: string; faction: Faction; icon: string; short: string; desc: string }> = {
  villager: {
    name: 'Nghệ Nhân Cố Đô',
    nameEn: 'Heritage Artisan',
    faction: 'crew',
    icon: 'local_guide',
    short: 'Làm nhiệm vụ, tránh Âm Binh',
    desc: 'Bạn là một người trong đoàn chuẩn bị Lễ Ban Sóc. Hoàn thành các nhiệm vụ trước canh năm, tránh xa kẻ đáng ngờ và báo khi thấy thi thể.',
  },
  guardian: {
    name: 'Lính Ngự Lâm',
    nameEn: 'Royal Guard',
    faction: 'crew',
    icon: 'conservator',
    short: 'Có một lá chắn chống bị hạ gục',
    desc: 'Bạn thuộc phe Người Dân và có MỘT lá chắn: lần đầu Âm Binh ra tay với bạn, đòn đánh bị chặn (cả hai cùng biết). Sau đó bạn như người thường.',
  },
  killer: {
    name: 'Âm Binh',
    nameEn: 'Shadow',
    faction: 'killer',
    icon: 'forger',
    short: 'Hạ gục mọi người để thắng',
    desc: 'Bạn là bóng đêm muốn giữ kinh thành mãi ở đêm cuối năm. Lại gần một người và bấm Hạ gục (có thời gian hồi). Giả vờ làm nhiệm vụ, đừng để ai thấy, và thuyết phục mọi người trong cuộc họp.',
  },
};

export type Phase = 'lobby' | 'explore' | 'meeting' | 'reveal' | 'ended';

export const PLAYER_COLORS = [
  0xe8524a, 0x3f7fd9, 0x3fae5a, 0xf2c230, 0xa05bd6, 0xf08a2c, 0x35c0c0, 0xef6fb0, 0x8d6e4a, 0x6b7a8f, 0xb8d94a, 0xf4f0e6,
];

/** Union of every map's task ids (ids are globally unique; each map plays its own subset, see MapSkin.taskIds). */
export const TASK_IDS = [
  'task_moon_phase',
  'task_woodblock_print',
  'task_ngo_mon_gates',
  'task_court_ranks',
  'task_nha_nhac',
  'task_cuu_dinh',
  'task_poem_wall',
  'task_royal_seal',
  'task_banh_beo',
  // thang-long
  'task_banh_chung',
  'task_dong_ho',
  'task_cho_chu',
  'task_cay_neu',
  'task_cau_doi',
  'task_ngu_qua',
  'task_ca_tru',
  'task_roi_nuoc',
] as const;
export type TaskId = (typeof TASK_IDS)[number];

export const GAME = {
  /** tasks assigned to every player */
  tasksPerPlayer: 4,
  killRange: 84,
  /** how far a living player can see (px); also blocked by walls */
  visionRadius: 264,
  reportRange: 110,
  killCooldownSec: 25,
  firstKillCooldownSec: 15,
  /** after a meeting */
  postMeetingCooldownSec: 15,
  meetingSec: 75,
  /** 5 canh = the whole round; length is per-room (`nightMin`), the clock pauses during meetings */
  canhCount: 5,
  /** host-adjustable range for the whole night, in minutes */
  nightMinMin: 2,
  nightMinMax: 15,
  revealSec: 6,
  /** prelude + role reveal on game start; the night clock (canh một) starts when it ends */
  introSec: 9.5,
  emergencyPerPlayer: 1,
};

/** Killer sabotages (common engine; names/art come from `skin.sabotage`). One runs at a time; killers share the cooldown. */
export const SABOTAGE = {
  cooldownSec: 40,
  /** after the role reveal */
  firstCooldownSec: 20,
  /** after a meeting ends */
  postMeetingCooldownSec: 20,
  /** `blind`: living players' vision shrinks to `blindVision` of normal (killers keep theirs) */
  blindSec: 6,
  blindVision: 0.25,
  /** `ward`: fix it at its spot before this runs out or the killers win */
  wardSec: 45,
  /** hold time at the spot to fix a ward (server-timed) */
  fixHoldSec: 2.5,
  fixRange: INTERACT_RADIUS + 24,
};

/**
 * Most killers a room of `n` may have: the crew must stay at least twice the killers
 * (4–6 → 1, 7–9 → 2, 10 → 3), otherwise a couple of quick kills end the game. Always at least 1.
 */
export const maxKillersFor = (n: number) => Math.max(1, Math.floor((n - 1) / 3));
/** A requested killer count clamped to 1..maxKillersFor(n). */
export const clampKillers = (k: number, n: number) => Math.max(1, Math.min(maxKillersFor(n), Math.floor(k)));
/** Default number of killers for a given player count. */
export const killersFor = (n: number) => clampKillers(n >= 8 ? 2 : 1, n);

/**
 * Auto night length (minutes) so the crew can just finish in time:
 * ~50s per task each (play + walk; crew work in parallel), extra slack per killer (deaths slow the crew)
 * and per player (crowding, emergency calls). Meetings pause the clock, so they are not counted.
 */
export const autoNightMin = (players: number, killers: number, tasksPerPlayer: number) =>
  Math.max(3, Math.min(GAME.nightMinMax, Math.round((60 + tasksPerPlayer * 50 + killers * 30 + players * 5) / 60)));

/** real ms of one canh for a night of `nightMin` minutes */
export const canhMs = (nightMin: number) => (nightMin * 60_000) / GAME.canhCount;
