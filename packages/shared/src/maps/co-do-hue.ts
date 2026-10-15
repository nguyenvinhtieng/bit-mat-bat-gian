import { TILE, type AreaId, type TaskId } from '../constants';

/**
 * Public skin for map `co-do-hue` (safe to ship to clients — contains no host truth).
 * Asset keys match assets/manifests/co-do-hue.assets.json.
 */
export const HUE_SLUG = 'co-do-hue';
export const HUE_MAP_VERSION = 1;

const t = (v: number) => Math.round(v * TILE);

export const HUE_AREAS: Record<AreaId, { name: string; nameEn: string; floor: string; tint?: number }> = {
  courtyard_checkin: { name: 'Sân Ngọ Môn', nameEn: 'Meridian Gate Courtyard', floor: 'terracotta' },
  exhibition: { name: 'Điện Thái Hòa', nameEn: 'Thái Hòa Throne Hall', floor: 'wood' },
  corridor: { name: 'Hành lang Trường Lang', nameEn: 'Long Corridor', floor: 'carpet' },
  coordination: { name: 'Duyệt Thị Đường', nameEn: 'Royal Theatre', floor: 'jade' },
  editing: { name: 'Khâm Thiên Giám', nameEn: 'Royal Observatory', floor: 'cream' },
  archive: { name: 'Nội Các', nameEn: 'Imperial Cabinet', floor: 'wood', tint: 0xd9c7a8 },
  artifact_storage: { name: 'Sân Thế Miếu · Cửu Đỉnh', nameEn: 'Nine Dynastic Urns', floor: 'stone' },
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
  { key: 'hue-prop-bia-pham-son', x: t(8), y: t(13.1) },
  { key: 'hue-prop-den-cung-dinh', x: t(3.6), y: t(14.5) },
  { key: 'hue-prop-den-cung-dinh', x: t(11.6), y: t(14.5) },
  // Trường Lang — chậu kiểng, mâm bánh bèo
  { key: 'hue-prop-chau-kieng', x: t(19.5), y: t(8.6) },
  { key: 'hue-prop-chau-kieng', x: t(22.5), y: t(17.8) },
  { key: 'hue-prop-mam-banh-beo', x: t(11.45), y: t(21.2) },
  // Duyệt Thị Đường — trống, biên khánh
  { key: 'hue-prop-trong-nha-nhac', x: t(31.5), y: t(9.05) },
  { key: 'hue-prop-bien-khanh', x: t(37), y: t(10.05) },
  // Khâm Thiên Giám — bàn khắc, hồn thiên nghi, bàn in lịch
  { key: 'hue-prop-ban-khac', x: t(16), y: t(20.05) },
  { key: 'hue-prop-hon-thien-nghi', x: t(26), y: t(20.05) },
  { key: 'hue-prop-ban-in-lich', x: t(20.5), y: t(23.1) },
  // Nội Các — kệ châu bản, hộp ấn, tường thơ
  { key: 'hue-prop-ke-chau-ban', x: t(7), y: t(27.05) },
  { key: 'hue-prop-hop-an', x: t(10.6), y: t(27.4) },
  { key: 'hue-prop-tuong-tho', x: t(12.6), y: t(26.1), wall: true },
  // Sân Thế Miếu — Cửu Đỉnh
  { key: 'hue-prop-dinh-dong', x: t(27), y: t(28.05) },
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

export type StationDef = { id: TaskId; area: AreaId; x: number; y: number; title: string; titleEn: string; icon: string };

/** Task stations (hitbox 96x96 around x, y). Each one is a mini-game that prepares the Ban Sóc ceremony. */
export const HUE_STATIONS: StationDef[] = [
  { id: 'task_moon_phase', area: 'editing', x: t(26), y: t(21.3), title: 'Xem trăng định ngày Sóc', titleEn: 'Read the moon for the new-moon day', icon: 'hue-station-moon' },
  { id: 'task_woodblock_print', area: 'editing', x: t(16), y: t(21.3), title: 'In lịch bằng mộc bản', titleEn: 'Print the calendar from woodblocks', icon: 'hue-station-woodblock' },
  { id: 'task_ngo_mon_gates', area: 'courtyard_checkin', x: t(16.3), y: t(5.7), title: 'Dẫn đoàn qua 5 cửa Ngọ Môn', titleEn: 'Guide the procession through the 5 gates', icon: 'hue-station-gates' },
  { id: 'task_court_ranks', area: 'exhibition', x: t(8), y: t(14.4), title: 'Xếp bá quan theo phẩm sơn', titleEn: 'Line up the mandarins by rank', icon: 'hue-station-ranks' },
  { id: 'task_nha_nhac', area: 'coordination', x: t(34), y: t(12.5), title: 'Dượt Nhã nhạc cung đình', titleEn: 'Rehearse the royal court music', icon: 'hue-station-nha-nhac' },
  { id: 'task_cuu_dinh', area: 'artifact_storage', x: t(30), y: t(29.4), title: 'Lau bụi Cửu Đỉnh', titleEn: 'Dust the Nine Urns', icon: 'hue-station-cuu-dinh' },
  { id: 'task_poem_wall', area: 'archive', x: t(12.6), y: t(28.4), title: 'Phục dựng tường “nhất thi nhất họa”', titleEn: 'Restore the poem-and-painting wall', icon: 'hue-station-poem' },
  { id: 'task_royal_seal', area: 'archive', x: t(7), y: t(28.6), title: 'Đóng ấn lên lịch', titleEn: 'Seal the calendar', icon: 'hue-station-seal' },
  { id: 'task_banh_beo', area: 'corridor', x: t(10.5), y: t(22), title: 'Làm bánh bèo đãi bá quan', titleEn: 'Make bánh bèo for the court', icon: 'hue-station-banh-beo' },
];

export const HUE_STORY_TITLE = 'Năm Canh Trước Bình Minh';
export const HUE_STORY_SUBTITLE = 'Đêm Ban Sóc';

export const HUE_INTRO =
  'Kinh thành Huế, đêm cuối tháng Mười Một. Rạng sáng mai, Lễ Ban Sóc sẽ diễn ra trước Ngọ Môn — lịch năm mới phải được trao tận tay bá quan và muôn dân. Đoàn nghệ nhân, thợ in, nhạc công và lính Ngự Lâm chỉ còn năm canh để chuẩn bị. Nhưng trong đoàn có Hắc Ảnh — kẻ muốn đêm nay không bao giờ kết thúc. Không có lịch, cả kinh thành sẽ lạc mất thời gian.';

/** Night-watch drum: one line per canh (progress 20%, 40% … 100%). */
export const HUE_CANH = [
  'Trống điểm canh một — Khâm Thiên Giám đã định xong ngày Sóc.',
  'Trống điểm canh hai — ván khắc lịch đã lên mực.',
  'Trống điểm canh ba — Nhã nhạc đã dượt xong bài nghênh giá.',
  'Trống điểm canh tư — bá quan đã vào vị trí trên sân chầu.',
  'Trống điểm canh năm — trời hửng sáng trên Lầu Ngũ Phụng!',
];

export const HUE_ENDINGS = {
  tasks: 'Canh năm đã điểm — bình minh lên trên Lầu Ngũ Phụng, lịch năm mới được ban cho muôn dân!',
  vote: 'Bóng đêm tan — Hắc Ảnh bị trục xuất, bình minh đến đúng giờ.',
  killer: 'Trống canh năm không bao giờ điểm — kinh thành chìm trong một đêm không có ngày mai.',
};
