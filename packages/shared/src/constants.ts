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
export const MIN_RECOMMENDED_PLAYERS = 4;
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

export const ROLE_INFO: Record<RoleId, { name: string; faction: Faction; icon: string; short: string; desc: string }> = {
  villager: {
    name: 'Nghệ Nhân Cố Đô',
    faction: 'crew',
    icon: 'local_guide',
    short: 'Làm nhiệm vụ, tránh Âm Binh',
    desc: 'Bạn là một người trong đoàn chuẩn bị Lễ Ban Sóc. Hoàn thành các nhiệm vụ trước canh năm, tránh xa kẻ đáng ngờ và báo khi thấy thi thể.',
  },
  guardian: {
    name: 'Lính Ngự Lâm',
    faction: 'crew',
    icon: 'conservator',
    short: 'Có một lá chắn chống bị hạ gục',
    desc: 'Bạn thuộc phe Người Dân và có MỘT lá chắn: lần đầu Âm Binh ra tay với bạn, đòn đánh bị chặn (cả hai cùng biết). Sau đó bạn như người thường.',
  },
  killer: {
    name: 'Âm Binh',
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
  revealSec: 6,
  emergencyPerPlayer: 1,
};

/** Number of killers for a given player count. */
export const killersFor = (n: number) => (n >= 8 ? 2 : n >= 2 ? 1 : 0);
