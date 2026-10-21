import { ROLE_INFO, TILE, type AreaId, type TaskId } from '../../constants';
import type { AreaSkin, MapSkin, PropPlacement, StationDef } from '../common/skin';

export type { PropPlacement, StationDef } from '../common/skin';

/**
 * Public skin for map `co-do-hue` (safe to ship to clients — contains no host truth).
 * Asset keys match assets/maps/co-do-hue/co-do-hue.assets.json.
 */
export const HUE_SLUG = 'co-do-hue';
export const HUE_MAP_VERSION = 1;

const t = (v: number) => Math.round(v * TILE);

export const HUE_AREAS: Record<AreaId, AreaSkin> = {
  courtyard_checkin: { name: 'Sân Ngọ Môn', nameEn: 'Meridian Gate Courtyard', floor: 'terracotta' },
  exhibition: { name: 'Điện Thái Hòa', nameEn: 'Thái Hòa Throne Hall', floor: 'wood' },
  corridor: { name: 'Hành lang Trường Lang', nameEn: 'Long Corridor', floor: 'carpet' },
  coordination: { name: 'Duyệt Thị Đường', nameEn: 'Royal Theatre', floor: 'jade' },
  editing: { name: 'Khâm Thiên Giám', nameEn: 'Royal Observatory', floor: 'cream' },
  archive: { name: 'Nội Các', nameEn: 'Imperial Cabinet', floor: 'wood', tint: 0xd9c7a8 },
  artifact_storage: { name: 'Sân Thế Miếu · Cửu Đỉnh', nameEn: 'Nine Dynastic Urns', floor: 'stone' },
};

/** Task ids played on this map. */
export const HUE_TASK_IDS = [
  'task_moon_phase',
  'task_woodblock_print',
  'task_ngo_mon_gates',
  'task_court_ranks',
  'task_nha_nhac',
  'task_cuu_dinh',
  'task_poem_wall',
  'task_royal_seal',
  'task_banh_beo',
] as const satisfies readonly TaskId[];
export type HueTaskId = (typeof HUE_TASK_IDS)[number];

/** Floor texture order in the packed tileset `hue-interior-48` (2x2 tiles each). */
export const HUE_TILESET_ORDER = ['wood', 'carpet', 'cream', 'terracotta', 'stone', 'jade', 'wall-face', 'wall-top'] as const;

/** Texture atlas holding the Đêm Ban Sóc props + station icons (tools/ui-art/draw-hue-bansoc.mjs). */
export const HUE_ATLAS = 'maps/co-do-hue/atlas/hue-bansoc-0';

/** Painted props + room decor atlas (tools/paint/props.py) — realistic raster art, y-sorted in the world. */
export const HUE_DECOR_ATLAS = 'maps/co-do-hue/atlas/hue-decor-0';
/** Pre-rendered floor + walls + baked room details for the whole layout (tools/paint/floor.py). */
export const HUE_FLOOR_BAKE = 'maps/co-do-hue/tileset/hue-floor-bake';
/** Small painted overview of the whole map (floor bake + props) for the map popup. */
export const HUE_MAP_PREVIEW = 'maps/co-do-hue/meta/hue-map-preview';

/** Props sit on the common FURNITURE_SLOTS (layout.ts) — skins only change the art. */
export const HUE_PROPS: PropPlacement[] = [
  // Sân Ngọ Môn — Án Ban Lịch, chuông Ngũ Phụng, cờ lễ
  { key: 'hue-prop-an-ban-lich', x: t(21), y: t(5.15) },
  { key: 'hue-prop-chuong-ngu-phung', x: t(25.5), y: t(2.05) },
  { key: 'hue-prop-co-le', x: t(16.3), y: t(3.2) },
  // Điện Thái Hòa — hoành phi, bia phẩm sơn, đèn cung đình
  { key: 'hue-prop-hoanh-phi', x: t(7), y: t(8.35), wall: true },
  { key: 'hue-prop-bia-pham-son', x: t(6.4), y: t(12.6) + 16 },
  { key: 'hue-prop-den-cung-dinh', x: t(3.6), y: t(14.5) },
  { key: 'hue-prop-den-cung-dinh', x: t(11.6), y: t(14.5) },
  // Trường Lang — chậu kiểng
  { key: 'hue-prop-chau-kieng', x: t(19.5), y: t(8.6) },
  { key: 'hue-prop-chau-kieng', x: t(22.5), y: t(17.8) },
  // Sân Thế Miếu — mâm bánh bèo (beside its station in the SE corner)
  { key: 'hue-prop-mam-banh-beo', x: t(37.4), y: t(30.4) + 16 },
  // Duyệt Thị Đường — trống, biên khánh
  { key: 'hue-prop-trong-nha-nhac', x: t(31.5), y: t(9.05) },
  { key: 'hue-prop-bien-khanh', x: t(34.3), y: t(8.7) + 16 },
  // Khâm Thiên Giám — bàn khắc, hồn thiên nghi, bàn in lịch
  { key: 'hue-prop-ban-khac', x: t(14.6), y: t(21.5) + 16 },
  { key: 'hue-prop-hon-thien-nghi', x: t(27.4), y: t(21.5) + 16 },
  { key: 'hue-prop-ban-in-lich', x: t(20.5), y: t(23.1) },
  // Nội Các — kệ châu bản, hộp ấn, tường thơ
  { key: 'hue-prop-ke-chau-ban', x: t(7), y: t(27.05) },
  { key: 'hue-prop-hop-an', x: t(4.5), y: t(28.6) + 16 },
  { key: 'hue-prop-tuong-tho', x: t(12.6), y: t(26.1), wall: true },
  // Sân Thế Miếu — Cửu Đỉnh
  { key: 'hue-prop-dinh-dong', x: t(25.5), y: t(30.5) + 16 },
  { key: 'hue-prop-dinh-dong', x: t(33), y: t(28.05) },
  // ---- room decor (footprints = decor_* slots in layout.ts)
  // Sân Ngọ Môn — vạc đồng
  { key: 'hue-decor-vac-dong', x: t(15.55), y: t(2.0) },
  { key: 'hue-decor-vac-dong', x: t(26.45), y: t(6.95) },
  // Điện Thái Hòa — ngai vàng, hạc đồng, cột rồng, bình sứ
  { key: 'hue-decor-ngai-vang', x: t(7.5), y: t(10.0) },
  { key: 'hue-decor-hac-dong', x: t(5.5), y: t(10.0) },
  { key: 'hue-decor-hac-dong', x: t(9.5), y: t(10.0) },
  { key: 'hue-decor-cot-rong', x: t(3.5), y: t(10.0) },
  { key: 'hue-decor-cot-rong', x: t(11.5), y: t(10.0) },
  { key: 'hue-decor-binh-su', x: t(2.5), y: t(9.0) },
  { key: 'hue-decor-binh-su', x: t(12.5), y: t(9.0) },
  // Duyệt Thị Đường — trường kỷ, đàn tranh, cột, bình
  { key: 'hue-decor-truong-ky', x: t(31), y: t(17.0) },
  { key: 'hue-decor-truong-ky', x: t(38), y: t(17.0) },
  { key: 'hue-decor-dan-tranh', x: t(39), y: t(13.0) },
  { key: 'hue-decor-cot-son', x: t(29.5), y: t(11.0) },
  { key: 'hue-decor-cot-son', x: t(29.5), y: t(15.0) },
  { key: 'hue-decor-cot-son', x: t(39.5), y: t(11.0) },
  { key: 'hue-decor-binh-su', x: t(39.5), y: t(9.0) },
  // Khâm Thiên Giám — kệ sách, kính thiên văn, thiên cầu, nhật quỹ, đèn
  { key: 'hue-decor-ke-sach', x: t(18), y: t(20.0) },
  { key: 'hue-decor-ke-sach', x: t(24), y: t(20.0) },
  { key: 'hue-decor-kinh-thien-van', x: t(27.5), y: t(20.0) },
  { key: 'hue-decor-thien-cau', x: t(14.5), y: t(20.0) },
  { key: 'hue-decor-nhat-quy', x: t(14.5), y: t(25.0) },
  { key: 'hue-prop-den-cung-dinh', x: t(27.5), y: t(25.0) },
  // Nội Các — án thư, rương, chum cuộn, đèn
  { key: 'hue-decor-an-thu', x: t(16), y: t(29.0) },
  { key: 'hue-decor-ruong', x: t(18), y: t(31.0) },
  { key: 'hue-decor-ruong', x: t(11), y: t(31.0) },
  { key: 'hue-decor-chum-cuon', x: t(4.5), y: t(31.0) },
  { key: 'hue-decor-chum-cuon', x: t(18.5), y: t(27.0) },
  { key: 'hue-prop-den-cung-dinh', x: t(4.5), y: t(27.0) },
  // Sân Thế Miếu — thêm đỉnh, cây đại, đèn đá, lư hương
  { key: 'hue-prop-dinh-dong', x: t(30), y: t(28.05) },
  { key: 'hue-decor-cay-dai', x: t(36.5), y: t(30.0) },
  { key: 'hue-decor-den-da', x: t(24.5), y: t(31.0) },
  { key: 'hue-decor-den-da', x: t(23.5), y: t(27.0) },
  { key: 'hue-decor-lu-huong', x: t(26.5), y: t(31.0) },
];

/**
 * Task stations (hitbox 96x96 around x, y). Each one is a mini-game that prepares the Ban Sóc ceremony.
 * Placed in corners / against walls, away from doors and walkways, so a player at work is not in plain sight.
 * Sân Ngọ Môn (the spawn hall) has none on purpose.
 */
export const HUE_STATIONS: StationDef[] = [
  { id: 'task_moon_phase', area: 'editing', x: t(27.4), y: t(21.5), title: 'Xem trăng định ngày Sóc', titleEn: 'Read the moon for the new-moon day', icon: 'hue-station-moon' },
  { id: 'task_woodblock_print', area: 'editing', x: t(14.6), y: t(21.5), title: 'In lịch bằng mộc bản', titleEn: 'Print the calendar from woodblocks', icon: 'hue-station-woodblock' },
  { id: 'task_ngo_mon_gates', area: 'coordination', x: t(39.4), y: t(17.4), title: 'Dẫn đoàn qua 5 cửa Ngọ Môn', titleEn: 'Guide the procession through the 5 gates', icon: 'hue-station-gates' },
  { id: 'task_court_ranks', area: 'exhibition', x: t(6.4), y: t(12.6), title: 'Xếp bá quan theo phẩm sơn', titleEn: 'Line up the mandarins by rank', icon: 'hue-station-ranks' },
  { id: 'task_nha_nhac', area: 'coordination', x: t(34.3), y: t(8.7), title: 'Dượt Nhã nhạc cung đình', titleEn: 'Rehearse the royal court music', icon: 'hue-station-nha-nhac' },
  { id: 'task_cuu_dinh', area: 'artifact_storage', x: t(25.5), y: t(30.5), title: 'Lau bụi Cửu Đỉnh', titleEn: 'Dust the Nine Urns', icon: 'hue-station-cuu-dinh' },
  { id: 'task_poem_wall', area: 'archive', x: t(12.6), y: t(27.3), title: 'Phục dựng tường “nhất thi nhất họa”', titleEn: 'Restore the poem-and-painting wall', icon: 'hue-station-poem' },
  { id: 'task_royal_seal', area: 'archive', x: t(4.5), y: t(28.6), title: 'Đóng ấn lên lịch', titleEn: 'Seal the calendar', icon: 'hue-station-seal' },
  { id: 'task_banh_beo', area: 'artifact_storage', x: t(37.4), y: t(30.4), title: 'Làm bánh bèo đãi bá quan', titleEn: 'Make bánh bèo for the court', icon: 'hue-station-banh-beo' },
];

export const HUE_STORY_TITLE = 'Năm Canh Trước Bình Minh';
export const HUE_STORY_SUBTITLE = 'Đêm Ban Sóc';

export const HUE_INTRO =
  'Kinh thành Huế, đêm cuối tháng Mười Một. Rạng sáng mai, Lễ Ban Sóc sẽ diễn ra trước Ngọ Môn — lịch năm mới phải được trao tận tay bá quan và muôn dân. Đoàn nghệ nhân, thợ in, nhạc công và lính Ngự Lâm chỉ còn năm canh để chuẩn bị. Nhưng trong đoàn có Âm Binh — kẻ muốn đêm nay không bao giờ kết thúc. Không có lịch, cả kinh thành sẽ lạc mất thời gian.';

/** Short dark prelude before the role reveal on game start (one line per beat). */
export const HUE_PRELUDE = ['Hoàng hôn tắt sau Kinh thành Huế…', 'Đêm Ban Sóc buông xuống — trống canh sắp điểm.'];
/** Night-watch drum: HUE_CANH[i] is announced when canh i+1 begins (the clock runs on time, not on progress). */
export const HUE_CANH = [
  'Trống điểm canh một (19 giờ) — đêm Ban Sóc bắt đầu, mọi người vào việc!',
  'Trống điểm canh hai (21 giờ) — đã hết một canh, lịch vẫn chưa xong.',
  'Trống điểm canh ba (23 giờ) — nửa đêm rồi, khẩn trương lên!',
  'Trống điểm canh tư (1 giờ sáng) — chỉ còn hai canh trước bình minh.',
  'Trống điểm canh năm (3 giờ sáng) — canh cuối! Hết canh này mà chưa xong là Âm Binh thắng.',
];
/** Clock face for the night: canh một starts 19:00, canh năm ends 05:00 (2 hours per canh). */
export const HUE_NIGHT_START_HOUR = 19;

export const HUE_ENDINGS = {
  tasks: 'Canh năm đã điểm — bình minh lên trên Lầu Ngũ Phụng, lịch năm mới được ban cho muôn dân!',
  vote: 'Bóng đêm tan — Âm Binh bị trục xuất, bình minh đến đúng giờ.',
  killer: 'Trống canh năm không bao giờ điểm — kinh thành chìm trong một đêm không có ngày mai.',
  timeout: 'Hết canh năm mà việc vẫn còn dang dở — trời sáng không có lịch, Âm Binh đã giữ được đêm dài.',
  sabotage: 'Ấn trấn bị phá mà không ai kịp niêm lại — Âm Binh tràn vào Hoàng Thành, đêm dài không dứt.',
};

export const HUE_SKIN: MapSkin = {
  slug: HUE_SLUG,
  version: HUE_MAP_VERSION,
  prefix: 'hue',
  areas: HUE_AREAS,
  taskIds: HUE_TASK_IDS,
  stations: HUE_STATIONS,
  props: HUE_PROPS,
  art: {
    floorBake: HUE_FLOOR_BAKE,
    decor: HUE_DECOR_ATLAS,
    stations: HUE_ATLAS,
    marker: 'maps/co-do-hue/atlas/hue-gameplay-0',
    tileset: { file: 'maps/co-do-hue/tileset/hue-interior-48', order: HUE_TILESET_ORDER },
    preview: HUE_MAP_PREVIEW,
    clockIcon: 'maps/co-do-hue/minigames/hue-ui-trong-canh',
    nightMarker: 'maps/co-do-hue/minigames/hue-mg-moon-4',
    ghostIcon: 'maps/co-do-hue/minigames/hue-ui-hon-ma',
    minigames: 'maps/co-do-hue/minigames',
    cards: 'maps/co-do-hue/cards',
  },
  roles: ROLE_INFO,
  killerName: { vi: 'Âm Binh', en: 'Shadow' },
  emergency: { vi: 'Chuông Ngũ Phụng', en: 'Ngũ Phụng bell' },
  sabotage: {
    blind: {
      name: { vi: 'Gió tắt đèn lồng', en: 'Lantern gust' },
      alert: { vi: 'Gió lạnh thổi tắt đèn lồng — tối om mấy hơi thở!', en: 'A cold gust snuffs the lanterns — darkness for a few breaths!' },
    },
    ward: {
      name: { vi: 'Âm Binh phá ấn', en: 'Break the seal' },
      alert: { vi: 'Ấn trấn ở {area} bị phá! Mau tới niêm lại trước khi Âm Binh tràn vào.', en: 'The ward seal in {area} is broken! Reseal it before the Shadows pour in.' },
      fix: { vi: 'Niêm ấn', en: 'Reseal' },
    },
  },
  labels: {
    mapTitle: { vi: 'Hoàng Thành Huế', en: 'Imperial City of Huế' },
    mapSubtitle: { vi: 'Đêm Ban Sóc · bản đồ Kinh thành', en: 'The night of the Calendar Ceremony' },
    meetingPlace: { vi: 'Họp khẩn trước Điện Thái Hòa', en: 'Emergency council before Thái Hòa Hall' },
    segment: { vi: 'canh', en: 'watch' },
    deadline: { vi: 'canh năm', en: 'the fifth watch' },
  },
  story: {
    title: HUE_STORY_TITLE,
    subtitle: HUE_STORY_SUBTITLE,
    intro: HUE_INTRO,
    prelude: HUE_PRELUDE,
    canh: HUE_CANH,
    segments: ['một', 'hai', 'ba', 'tư', 'năm'].map((vi, i) => ({ vi, en: ['I', 'II', 'III', 'IV', 'V'][i] })),
    clock: { startMin: HUE_NIGHT_START_HOUR * 60, segmentMin: 120 },
    endings: HUE_ENDINGS,
    objective: {
      killer: 'Hạ gục người trong đoàn cho tới khi số Âm Binh bằng hoặc nhiều hơn số người còn sống. Đừng để bị phát hiện và bị bỏ phiếu loại.',
      crew: 'Hoàn thành mọi nhiệm vụ trước canh năm để Lễ Ban Sóc diễn ra lúc bình minh — hoặc tìm ra Âm Binh trong cuộc họp và bỏ phiếu loại họ.',
    },
  },
  sfx: { clock: 'maps/co-do-hue/sfx/trong-canh.wav' },
};
