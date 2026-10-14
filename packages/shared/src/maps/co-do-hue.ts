import { TILE, type AreaId, type TaskId } from '../constants';

/**
 * Public skin for map `co-do-hue` (safe to ship to clients — contains no host truth).
 * Asset keys match assets/manifests/co-do-hue.assets.json.
 */
export const HUE_SLUG = 'co-do-hue';
export const HUE_MAP_VERSION = 1;

const t = (v: number) => Math.round(v * TILE);

export const HUE_AREAS: Record<AreaId, { name: string; nameEn: string; floor: string; tint?: number }> = {
  courtyard_checkin: { name: 'Sân Ngọ Môn', nameEn: 'Ngọ Môn Courtyard', floor: 'terracotta' },
  exhibition: { name: 'Điện Thái Hòa', nameEn: 'Thái Hòa Palace', floor: 'wood' },
  corridor: { name: 'Hành lang Trường Lang', nameEn: 'Long Corridor', floor: 'carpet' },
  coordination: { name: 'Duyệt Thị Đường', nameEn: 'Royal Theatre', floor: 'jade' },
  editing: { name: 'Xưởng Mộc Bản', nameEn: 'Woodblock Workshop', floor: 'cream' },
  archive: { name: 'Tàng Thư Lâu', nameEn: 'Archive Hall', floor: 'wood', tint: 0xd9c7a8 },
  artifact_storage: { name: 'Kho Cổ Vật', nameEn: 'Relic Storehouse', floor: 'stone' },
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

/** hue-stations.json — task stations. Hitbox 96x96 around (x, y). Every task is a mini-game about Huế culture. */
export const HUE_STATIONS: StationDef[] = [
  { id: 'task_hue_cuisine', area: 'editing', x: t(16), y: t(21.3), title: 'Chọn món ngon xứ Huế', frame: 0 },
  { id: 'task_woodblock', area: 'editing', x: t(26), y: t(21.3), title: 'In mộc bản triều Nguyễn', frame: 1 },
  { id: 'task_citadel_gates', area: 'coordination', x: t(34), y: t(13), title: 'Dẫn đường vào Hoàng Thành', frame: 2 },
  { id: 'task_lanterns', area: 'exhibition', x: t(10.5), y: t(10.5), title: 'Thắp đèn lồng đêm hội', frame: 3 },
  { id: 'task_conical_hat', area: 'artifact_storage', x: t(27), y: t(29.3), title: 'Nón bài thơ — điền chữ còn thiếu', frame: 4 },
  { id: 'task_heritage_quiz', area: 'archive', x: t(7), y: t(28.6), title: 'Đố vui di sản Cố đô', frame: 5 },
];

export const HUE_STORY_TITLE = 'Đêm Hội Hoàng Cung';

export const HUE_INTRO =
  'Đêm nay Đại Nội Huế thắp hàng nghìn ngọn đèn lồng cho Đêm Hội Hoàng Cung. Đoàn nghệ nhân, đầu bếp, nhạc công và hướng dẫn viên phải chuẩn bị xong trước khi đèn lên. Nhưng có kẻ lạ trà trộn trong đoàn — Hắc Ảnh — muốn dập tắt từng ngọn đèn, từng con người. Hãy hoàn thành công việc, giữ vững đoàn, và tìm ra Hắc Ảnh trước khi quá muộn.';
