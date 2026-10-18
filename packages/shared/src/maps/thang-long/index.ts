import { TILE, type AreaId, type RoleId, type TaskId } from '../../constants';
import type { AreaSkin, MapSkin, RoleSkin, StationDef } from '../common/skin';
import { TL_PROPS } from './props';

/**
 * Public skin for map `thang-long` — "Hồ Gươm · Đêm Giao Thừa" (safe to ship to clients — no host truth).
 * Same common layout as Huế; asset keys match assets/manifests/thang-long.assets.json.
 */
export const TL_SLUG = 'thang-long';
export const TL_MAP_VERSION = 1;

const t = (v: number) => Math.round(v * TILE);
const DIR = `maps/${TL_SLUG}`;

export const TL_AREAS: Record<AreaId, AreaSkin> = {
  courtyard_checkin: { name: 'Bờ Hồ · Cây Nêu', nameEn: 'Lakeside · Tết Pole', floor: 'brick' },
  exhibition: { name: 'Đền Ngọc Sơn', nameEn: 'Ngọc Sơn Temple', floor: 'bat-trang' },
  corridor: { name: 'Cầu Thê Húc', nameEn: 'Thê Húc Bridge', floor: 'bridge' },
  coordination: { name: 'Thủy Đình Rối Nước', nameEn: 'Water Puppet Pavilion', floor: 'planks' },
  editing: { name: 'Phố Ông Đồ · Tháp Bút', nameEn: 'Calligraphers’ Street · Pen Tower', floor: 'pavers' },
  archive: { name: 'Phố Hàng Trống', nameEn: 'Hàng Trống Painting Street', floor: 'brick' },
  artifact_storage: { name: 'Bếp Tết', nameEn: 'Tết Kitchen', floor: 'earth' },
};

/** Task ids played on this map. */
export const TL_TASK_IDS = [
  'task_banh_chung',
  'task_dong_ho',
  'task_cho_chu',
  'task_cay_neu',
  'task_cau_doi',
  'task_ngu_qua',
  'task_ca_tru',
  'task_roi_nuoc',
] as const satisfies readonly TaskId[];
export type TlTaskId = (typeof TL_TASK_IDS)[number];

/** Stations sit on the same corner slots as Huế (away from doors). Bờ Hồ (spawn) has none on purpose. */
export const TL_STATIONS: StationDef[] = [
  { id: 'task_cho_chu', area: 'editing', x: t(27.4), y: t(21.5), title: 'Xin chữ ông đồ', titleEn: 'Ask the scholar for a calligraphy', icon: 'tl-station-cho-chu' },
  { id: 'task_cau_doi', area: 'editing', x: t(14.6), y: t(21.5), title: 'Ghép câu đối Tết', titleEn: 'Match the Tết couplets', icon: 'tl-station-cau-doi' },
  { id: 'task_roi_nuoc', area: 'coordination', x: t(39.4), y: t(17.4), title: 'Điều rối nước', titleEn: 'Steer the water puppet', icon: 'tl-station-roi-nuoc' },
  { id: 'task_ca_tru', area: 'coordination', x: t(34.3), y: t(8.7), title: 'Gõ phách ca trù', titleEn: 'Keep the ca trù clapper beat', icon: 'tl-station-ca-tru' },
  { id: 'task_ngu_qua', area: 'exhibition', x: t(6.4), y: t(12.6), title: 'Bày mâm ngũ quả', titleEn: 'Arrange the five-fruit tray', icon: 'tl-station-ngu-qua' },
  { id: 'task_dong_ho', area: 'archive', x: t(12.6), y: t(27.3), title: 'Pha màu tranh Đông Hồ', titleEn: 'Mix the Đông Hồ colours', icon: 'tl-station-dong-ho' },
  { id: 'task_cay_neu', area: 'artifact_storage', x: t(25.5), y: t(30.5), title: 'Dựng cây nêu', titleEn: 'Raise the Tết pole', icon: 'tl-station-cay-neu' },
  { id: 'task_banh_chung', area: 'artifact_storage', x: t(37.4), y: t(30.4), title: 'Gói bánh chưng', titleEn: 'Wrap the bánh chưng', icon: 'tl-station-banh-chung' },
];

const ROLES: Record<RoleId, RoleSkin> = {
  villager: {
    name: 'Người Thăng Long',
    nameEn: 'Townsfolk',
    short: 'Làm nhiệm vụ, tránh Quỷ',
    desc: 'Bạn là người Thăng Long sửa soạn đón giao thừa bên Hồ Gươm. Hoàn thành các nhiệm vụ trước nửa đêm, tránh xa kẻ đáng ngờ và báo khi thấy thi thể.',
  },
  guardian: {
    name: 'Thủ Từ Đền Ngọc Sơn',
    nameEn: 'Temple Keeper',
    short: 'Có một lá bùa chống bị hạ gục',
    desc: 'Bạn là Thủ Từ giữ Đền Ngọc Sơn, thuộc phe Người Thăng Long và mang MỘT lá bùa hộ mệnh: lần đầu Quỷ ra tay với bạn, đòn đánh bị chặn (cả hai cùng biết). Sau đó bạn như người thường.',
  },
  killer: {
    name: 'Quỷ',
    nameEn: 'Demon',
    short: 'Hạ gục mọi người để thắng',
    desc: 'Bạn là Quỷ lẻn vào đất Thăng Long đêm ba mươi, muốn phá lễ Trừ tịch để ở lại trần gian. Lại gần một người và bấm Hạ gục (có thời gian hồi). Giả vờ làm nhiệm vụ, đừng để ai thấy, và thuyết phục mọi người trong cuộc họp.',
  },
};

export const TL_CANH = [
  '22 giờ đêm ba mươi — Bờ Hồ lên đèn, mọi người vào việc sửa soạn đón giao thừa!',
  '22 giờ 24 — bánh chưng còn trên bếp, câu đối vẫn chưa treo.',
  '22 giờ 48 — đã quá nửa thời gian, Quỷ đang rình quanh vòng vôi!',
  '23 giờ 12 — chỉ còn hai mốc nữa là tới giao thừa.',
  '23 giờ 36 — mốc cuối! Nửa đêm mà lễ chưa xong là Quỷ thắng.',
];

export const TL_ENDINGS = {
  tasks: 'Giao thừa! Pháo hoa rực sáng trên Hồ Gươm, Rùa Vàng nổi lên đón năm mới — đất Thăng Long bình an.',
  vote: 'Quỷ đã bị đuổi khỏi Bờ Hồ — vòng vôi vẹn nguyên, giao thừa đến trọn vẹn.',
  killer: 'Đèn Bờ Hồ tắt lịm — không còn ai làm lễ, Quỷ ở lại trần gian suốt năm mới.',
  timeout: 'Nửa đêm đã điểm mà lễ vẫn dang dở — năm cũ không được tiễn, Quỷ ở lại trần gian.',
  sabotage: 'Vòng vôi bị xoá mà không ai kịp rắc lại — Quỷ tràn vào Bờ Hồ, lễ Trừ tịch đổ vỡ.',
};

export const TL_SKIN: MapSkin = {
  slug: TL_SLUG,
  version: TL_MAP_VERSION,
  prefix: 'tl',
  areas: TL_AREAS,
  taskIds: TL_TASK_IDS,
  stations: TL_STATIONS,
  props: TL_PROPS,
  art: {
    floorBake: `${DIR}/tileset/tl-floor-bake`,
    decor: `${DIR}/atlas/tl-decor-0`,
    stations: `${DIR}/atlas/tl-stations-0`,
    preview: `${DIR}/meta/tl-map-preview`,
    clockIcon: `${DIR}/minigames/tl-ui-dong-ho`,
    nightMarker: `${DIR}/minigames/tl-ui-phao`,
    // the wandering-soul face is shared (no Tết-specific variant)
    ghostIcon: 'maps/co-do-hue/minigames/hue-ui-hon-ma',
    minigames: `${DIR}/minigames`,
    cards: `${DIR}/cards`,
  },
  roles: ROLES,
  killerName: { vi: 'Quỷ', en: 'Demon' },
  emergency: { vi: 'Trống Chầu Đền Ngọc Sơn', en: 'Ngọc Sơn temple drum' },
  sabotage: {
    blind: {
      name: { vi: 'Pháo nổ', en: 'Firecrackers' },
      icon: `${DIR}/minigames/tl-ui-phao`,
      alert: { vi: 'Pháo nổ đì đùng — loé mắt, ù tai, chẳng thấy gì!', en: 'Firecrackers burst — dazzled and deafened, you can barely see!' },
    },
    ward: {
      name: { vi: 'Quỷ xoá vôi', en: 'Erase the lime ring' },
      icon: `${DIR}/minigames/tl-ui-voi`,
      alert: { vi: 'Quỷ đã xoá vòng vôi ở {area}! Mau tới rắc lại trước khi Quỷ tràn vào.', en: 'A Demon erased the lime ring in {area}! Sprinkle it back before they pour in.' },
      fix: { vi: 'Rắc vôi', en: 'Sprinkle lime' },
    },
  },
  labels: {
    mapTitle: { vi: 'Thăng Long – Hồ Gươm', en: 'Thăng Long – Sword Lake' },
    mapSubtitle: { vi: 'Đêm Giao Thừa · bản đồ Bờ Hồ', en: 'New Year’s Eve by Sword Lake' },
    meetingPlace: { vi: 'Họp khẩn trước Đền Ngọc Sơn', en: 'Emergency council before Ngọc Sơn Temple' },
    segment: { vi: 'mốc', en: 'mark' },
    deadline: { vi: 'giao thừa', en: 'midnight' },
  },
  story: {
    title: 'Đêm Giao Thừa Hồ Gươm',
    subtitle: 'Đêm ba mươi Tết',
    intro:
      'Thăng Long, đêm ba mươi Tết. Táo Quân đã về trời, Quỷ nhân dịp đội lốt người lẻn vào chợ Tết. Người Thăng Long phải dựng nêu, rắc vôi, gói bánh, treo câu đối để làm xong lễ Trừ tịch trước giao thừa — nếu không, Quỷ sẽ ở lại trần gian suốt năm mới.',
    prelude: ['Hoàng hôn ngày cuối năm tắt trên mặt Hồ Gươm…', 'Đêm ba mươi buông xuống — chỉ còn năm mốc tới giao thừa.'],
    canh: TL_CANH,
    segments: [
      { vi: 'Tất niên', en: 'Year-end' },
      { vi: 'Tống cựu', en: 'Farewell' },
      { vi: 'Trừ tịch', en: 'Eve rite' },
      { vi: 'Đón xuân', en: 'Welcome' },
      { vi: 'Giao thừa', en: 'Midnight' },
    ],
    // 22:00 -> 00:00, five marks of 24 minutes
    clock: { startMin: 22 * 60, segmentMin: 24 },
    endings: TL_ENDINGS,
    objective: {
      killer: 'Hạ gục người Thăng Long cho tới khi số Quỷ bằng hoặc nhiều hơn số người còn sống. Đừng để bị phát hiện và bị bỏ phiếu loại.',
      crew: 'Hoàn thành mọi nhiệm vụ trước giao thừa để pháo hoa nổ đúng nửa đêm — hoặc tìm ra Quỷ trong cuộc họp và bỏ phiếu loại họ.',
    },
  },
  taskEyebrow: { vi: 'Chuẩn bị lễ Trừ tịch', en: 'Year-End rite preparations' },
  sfx: { clock: `${DIR}/sfx/trong-chau-tom.wav` },
};
