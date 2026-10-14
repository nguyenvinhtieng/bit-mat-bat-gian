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

export const ROLE_IDS = ['historian', 'conservator', 'local_guide', 'archivist', 'forger', 'broker'] as const;
export type RoleId = (typeof ROLE_IDS)[number];
export type Faction = 'investigation' | 'secret';

export const ROLE_INFO: Record<RoleId, { name: string; faction: Faction; ability: string; desc: string }> = {
  historian: {
    name: 'Sử Gia',
    faction: 'investigation',
    ability: 'Kiểm tra mốc thời gian',
    desc: 'Mỗi vòng kiểm tra một mốc thời gian / nhận định trong hồ sơ đã xác minh. Không biết ai nói dối.',
  },
  conservator: {
    name: 'Người Bảo Tồn',
    faction: 'investigation',
    ability: 'Kiểm tra dấu vết vật lý',
    desc: 'Mỗi vòng kiểm tra một dấu vết trên hiện vật, bao bì, niêm phong. Dấu vết không cho biết ai làm.',
  },
  local_guide: {
    name: 'Hướng Dẫn Viên Địa Phương',
    faction: 'investigation',
    ability: 'Mở manh mối ngữ cảnh',
    desc: 'Mỗi vòng mở một manh mối ngữ cảnh địa điểm. Hiểu bối cảnh không đồng nghĩa với chứng kiến.',
  },
  archivist: {
    name: 'Lưu Trữ Viên',
    faction: 'investigation',
    ability: 'Khôi phục phiên bản cũ',
    desc: 'Mỗi vòng khôi phục / so sánh một phiên bản tài liệu. Không tự biết ai đứng sau thay đổi.',
  },
  forger: {
    name: 'Người Làm Giả',
    faction: 'secret',
    ability: 'Tác động một chi tiết hồ sơ',
    desc: 'Mỗi vòng sửa một chi tiết theo kịch bản. Hành động luôn để lại dấu vết có thể tìm thấy.',
  },
  broker: {
    name: 'Người Môi Giới',
    faction: 'secret',
    ability: 'Giữ / trao đổi một mẩu tin',
    desc: 'Mỗi vòng giữ lại một mẩu thông tin hoặc biết ai đang nắm manh mối liên quan. Không được sửa bằng chứng gốc.',
  },
};

export type Phase = 'lobby' | 'explore' | 'meeting' | 'conclusion' | 'ended';

export const PLAYER_COLORS = [
  0xe8524a, 0x3f7fd9, 0x3fae5a, 0xf2c230, 0xa05bd6, 0xf08a2c, 0x35c0c0, 0xef6fb0, 0x8d6e4a, 0x6b7a8f, 0xb8d94a, 0xf4f0e6,
];

export const TASK_IDS = [
  'task_print_checklist',
  'task_scan_footnote',
  'task_update_floor_plan',
  'task_check_lights_labels',
  'task_seal_box',
  'task_return_shelf_a',
] as const;
export type TaskId = (typeof TASK_IDS)[number];

export const TIMINGS = {
  exploreSec: 210,
  meetingSec: 90,
  finalMeetingSec: 120,
  conclusionSec: 90,
  rounds: 2,
};

export const DEVIATION_TYPES = [
  { id: 'translation', label: 'Dịch (lựa chọn từ / bản dịch)' },
  { id: 'editing', label: 'Biên tập (rút gọn / sửa câu / yêu cầu wording)' },
  { id: 'misprint', label: 'In nhầm (in sai file)' },
  { id: 'deliberate', label: 'Cố ý bịa để thu hút khách' },
] as const;
export type DeviationType = (typeof DEVIATION_TYPES)[number]['id'];
