import { TILE, type AreaId, type RoleId, type TaskId } from '../constants';

/**
 * Public skin for map `co-do-hue` (safe to ship to clients — contains no host truth).
 * Asset keys match assets/manifests/co-do-hue.assets.json.
 */
export const HUE_SLUG = 'co-do-hue';
export const HUE_MAP_VERSION = 1;

const t = (v: number) => Math.round(v * TILE);

export const HUE_AREAS: Record<AreaId, { name: string; nameEn: string; floor: string; tint?: number }> = {
  courtyard_checkin: { name: 'Sân hiên / Check-in', nameEn: 'Courtyard / Check-in', floor: 'terracotta' },
  exhibition: { name: 'Gian trưng bày', nameEn: 'Exhibition hall', floor: 'wood' },
  corridor: { name: 'Hành lang', nameEn: 'Corridor', floor: 'carpet' },
  coordination: { name: 'Phòng điều phối', nameEn: 'Coordination room', floor: 'jade' },
  editing: { name: 'Phòng biên tập', nameEn: 'Editing room', floor: 'cream' },
  archive: { name: 'Phòng lưu trữ', nameEn: 'Archive', floor: 'wood', tint: 0xd9c7a8 },
  artifact_storage: { name: 'Kho hiện vật', nameEn: 'Artifact storage', floor: 'stone' },
};

/** Floor texture order in the packed tileset `hue-interior-48` (2x2 tiles each). */
export const HUE_TILESET_ORDER = ['wood', 'carpet', 'cream', 'terracotta', 'stone', 'jade', 'wall-face', 'wall-top'] as const;

export type PropPlacement = {
  key: string;
  /** bottom-centre anchor, pixels */
  x: number;
  y: number;
  /** render on the wall (behind players regardless of y) */
  wall?: boolean;
};

export const HUE_PROPS: PropPlacement[] = [
  // courtyard
  { key: 'hue-prop-courtyard-meeting-table', x: t(21), y: t(5.15) },
  { key: 'hue-prop-courtyard-banner', x: t(16.3), y: t(3.2) },
  { key: 'hue-prop-courtyard-bench', x: t(25.5), y: t(2.05) },
  // exhibition
  { key: 'hue-prop-exhibition-photo-wall', x: t(5), y: t(8.35), wall: true },
  { key: 'hue-prop-exhibition-panel-bilingual', x: t(8), y: t(13.1) },
  { key: 'hue-prop-exhibition-spotlight', x: t(4), y: t(14.5) },
  { key: 'hue-prop-exhibition-spotlight', x: t(11.5), y: t(14.5) },
  // corridor
  { key: 'hue-prop-corridor-plant', x: t(19.5), y: t(8.6) },
  { key: 'hue-prop-corridor-plant', x: t(22.5), y: t(17.8) },
  // coordination
  { key: 'hue-prop-coord-whiteboard', x: t(31.5), y: t(9.05) },
  { key: 'hue-prop-coord-monitor', x: t(37), y: t(10.05) },
  // editing
  { key: 'hue-prop-editing-printer', x: t(16), y: t(20.05) },
  { key: 'hue-prop-editing-scanner', x: t(26), y: t(20.05) },
  { key: 'hue-prop-editing-desk-papers', x: t(20.5), y: t(23.1) },
  // archive
  { key: 'hue-prop-archive-shelf-a', x: t(7), y: t(27.05) },
  { key: 'hue-prop-archive-box-hue04', x: t(11), y: t(27.4) },
  // storage
  { key: 'hue-prop-storage-sealed-box', x: t(27), y: t(28.05) },
  { key: 'hue-prop-storage-copy-stand', x: t(33), y: t(28.05) },
];

export type StationDef = { id: TaskId; area: AreaId; x: number; y: number; title: string; frame: number };

/** hue-stations.json — common tasks. Hitbox 96x96 around (x, y). */
export const HUE_STATIONS: StationDef[] = [
  { id: 'task_print_checklist', area: 'editing', x: t(16), y: t(21.3), title: 'Đối chiếu checklist in ấn', frame: 0 },
  { id: 'task_scan_footnote', area: 'editing', x: t(26), y: t(21.3), title: 'Scan trang chú thích', frame: 1 },
  { id: 'task_update_floor_plan', area: 'coordination', x: t(34), y: t(13), title: 'Cập nhật sơ đồ gian', frame: 2 },
  { id: 'task_check_lights_labels', area: 'exhibition', x: t(10.5), y: t(10.5), title: 'Kiểm tra đèn & nhãn phụ', frame: 3 },
  { id: 'task_seal_box', area: 'artifact_storage', x: t(27), y: t(29.3), title: 'Niêm phong hộp tư liệu', frame: 4 },
  { id: 'task_return_shelf_a', area: 'archive', x: t(7), y: t(28.6), title: 'Trả sách mượn kệ A', frame: 5 },
];

/** hue-role-stations.json — one ability point per role (only shown to that role). */
export const HUE_ROLE_STATIONS: Record<RoleId, { area: AreaId; x: number; y: number; title: string }> = {
  historian: { area: 'coordination', x: t(37), y: t(15.5), title: 'Hộp thư dự án — đối chiếu email duyệt' },
  conservator: { area: 'artifact_storage', x: t(33), y: t(29.4), title: 'Hộp bản sao — kiểm tra niêm phong' },
  local_guide: { area: 'courtyard_checkin', x: t(25), y: t(5.6), title: 'Anh Phú — kịch bản tour mẫu' },
  archivist: { area: 'archive', x: t(14), y: t(28.5), title: 'Máy lưu trữ — khôi phục intro_VI_EN_v2' },
  forger: { area: 'editing', x: t(22.6), y: t(22.0), title: 'Bàn biên tập — bản nháp & nhãn phụ' },
  broker: { area: 'coordination', x: t(38.5), y: t(11), title: 'Nhóm chat điều phối' },
};

export const HUE_NPCS = [
  { id: 'minh-giam', name: 'Chị Minh Giám', role: 'Người Giám Tuyển' },
  { id: 'tuan', name: 'Anh Tuấn', role: 'Biên Dịch Viên' },
  { id: 'lan', name: 'Chị Lan', role: 'Lưu Trữ Viên (NPC)' },
  { id: 'vi', name: 'Em Vi', role: 'Thực tập sinh' },
  { id: 'hoa', name: 'Ông Hòa', role: 'Cố vấn Sử học' },
  { id: 'thao', name: 'Chị Thảo', role: 'Điều phối in & logistics' },
  { id: 'phu', name: 'Anh Phú', role: 'Hướng dẫn viên di tích' },
] as const;

export const HUE_INTRO =
  '“Bảng ‘Câu chuyện từ tư liệu’ đã treo. Đại diện đối tác địa phương nhắn: một câu tiếng Anh nghe ‘mạnh’ hơn bản các bạn gửi duyệt tuần trước. Giám tuyển yêu cầu đối chiếu trước giờ mở cửa — nếu lệch hồ sơ nghiên cứu, phải ghi rõ là do biên tập hay do dịch. Một số người trong đoàn đêm qua vẫn vào được kho tư liệu.”';

/** Sentences of the public bilingual panel (the printed version players can see). */
export const HUE_PANEL_SENTENCES = [
  { id: 1, label: 'Câu 1 — mô tả trình tự buổi lễ trong không gian cung đình' },
  { id: 2, label: 'Câu 2 — các bước được chuẩn bị từ sáng sớm' },
  { id: 3, label: 'Câu 3 — chi tiết trang phục và quy mô buổi lễ' },
] as const;

export const HUE_WHEN_OPTIONS = [
  { id: 'week_before', label: 'Tuần trước (bản v2 được góp ý)' },
  { id: 'two_days_before', label: 'Hai ngày trước khai mạc' },
  { id: 'night_before', label: 'Đêm trước khai mạc (export v3 / in thử)' },
  { id: 'morning', label: 'Sáng khai mạc (khi treo bảng)' },
] as const;
