import { TASK_IDS, TILE, type AreaId, type RoleId, type TaskId } from '../../constants';
import type { AreaSkin, MapSkin, RoleSkin, StationDef } from '../common/skin';
import { GAME_SLUG } from '../catalog';
import { GAME_PROPS, GAME_SIGNS } from './props';

/**
 * Public skin for the only map — "Hẻm 42 — Cuốc Cuối" (safe to ship to clients — no host truth).
 * 23:42, Saigon: the CRAB driver crew takes a 50-million delivery; one of the green jackets is an undercover cop.
 */
export const GAME_MAP_VERSION = 2;

const t = (v: number) => Math.round(v * TILE);
const DIR = `maps/${GAME_SLUG}`;

export const GAME_AREAS: Record<AreaId, AreaSkin> = {
  courtyard_checkin: { name: 'Đầu Hẻm 42', nameEn: 'Alley 42 Mouth', floor: 'asphalt' },
  exhibition: { name: 'Dãy Quán Ăn', nameEn: 'Food Stall Row', floor: 'sidewalk' },
  corridor: { name: 'Hẻm Cuối', nameEn: 'The Back Alley', floor: 'asphalt' },
  coordination: { name: 'Quán Nước', nameEn: 'Drink Stall', floor: 'gach-bong' },
  editing: { name: 'Tiệm Sửa Xe', nameEn: 'Bike Repair Shop', floor: 'concrete' },
  archive: { name: 'Kho CRAB', nameEn: 'CRAB Warehouse', floor: 'gach-bong' },
  artifact_storage: { name: 'Bãi Giữ Xe', nameEn: 'Bike Park', floor: 'concrete' },
};

/** Task ids played on this map (all of them: one map). */
export const GAME_TASK_IDS = TASK_IDS;
export type GameTaskId = TaskId;

/**
 * Stations sit beside everyday props (none at the alley mouth: that's the meeting spot), tucked into a wall nook
 * or corner so whoever works it is hard to see from the room — and easy to sneak up on.
 * `icon` = file in the station's task folder (`${art.tasks}/<id>/<icon>.svg`).
 */
export const GAME_STATIONS: StationDef[] = [
  // Dãy Quán Ăn — góc dưới trái sau xe bánh mì · hốc trên phải sau lồng chim
  { id: 'pack_cooler', area: 'exhibition', x: t(2.5), y: t(17.6), title: 'Xếp đơn vào thùng giữ nhiệt', titleEn: 'Pack the cooler box', icon: 'icon' },
  { id: 'water_pipes', area: 'exhibition', x: t(12.5), y: t(9.7), title: 'Mở van nước rửa tay', titleEn: 'Fix the handwashing tap', icon: 'icon' },
  // Quán Nước — cạnh quầy cà phê vợt, trước tivi và dưới kệ router.
  { id: 'brew_coffee', area: 'coordination', x: t(29.5), y: t(8.7), title: 'Pha cà phê sữa đá', titleEn: 'Make an iced milk coffee', icon: 'icon' },
  { id: 'wifi_hunt', area: 'coordination', x: t(39.5), y: t(17.6), title: 'Bắt wifi ké', titleEn: 'Leech the Wi-Fi', icon: 'icon' },
  { id: 'tune_antenna', area: 'coordination', x: t(37.5), y: t(9.7), title: 'Chỉnh anten tivi quán cóc', titleEn: 'Tune the stall TV aerial', icon: 'icon' },
  // Tiệm Sửa Xe — điểm bơm nằm trước bình khí nén; hộp điện cạnh điểm nối dây.
  { id: 'pump_tyre', area: 'editing', x: t(26.7), y: t(21.1), title: 'Bơm bánh xe', titleEn: 'Pump the tyre', icon: 'icon' },
  { id: 'connect_wires', area: 'editing', x: t(20.5), y: t(23.9), title: 'Nối dây hộp điện', titleEn: 'Reconnect the junction box', icon: 'icon' },
  { id: 'patch_tube', area: 'editing', x: t(15.5), y: t(22.5), title: 'Vá ruột xe', titleEn: 'Patch the inner tube', icon: 'icon' },
  // Kho CRAB — góc trên trái dưới kệ · hốc dưới phải giữa hai rương
  { id: 'tape_box', area: 'archive', x: t(4.5), y: t(27.2), title: 'Quấn băng keo thùng hàng', titleEn: 'Tape up the box', icon: 'icon' },
  { id: 'stack_rack', area: 'archive', x: t(16.5), y: t(30.6), title: 'Chất hàng lên baga', titleEn: 'Stack the rear rack', icon: 'icon' },
  { id: 'untangle_charger', area: 'archive', x: t(5.5), y: t(30.6), title: 'Gỡ dây sạc điện thoại', titleEn: 'Untangle the phone charger', icon: 'icon' },
  // Bãi Giữ Xe — góc dưới phải chỗ xe xếp · sát vách tây, trên giàn phơi
  { id: 'unpark_bike', area: 'artifact_storage', x: t(37.5), y: t(30.6), title: 'Rút xe ra khỏi bãi', titleEn: 'Get the bike out', icon: 'icon' },
  { id: 'stuck_shutter', area: 'artifact_storage', x: t(23.5), y: t(29.4), title: 'Kéo cửa cuốn kẹt', titleEn: 'Unstick the roller shutter', icon: 'icon' },
  // Hẻm Cuối — sát vách tây hẻm giữa, tránh cột điện · điểm giao ở hẻm đông
  { id: 'dodge_potholes', area: 'corridor', x: t(19.5), y: t(16.6), title: 'Né ổ gà vào hẻm', titleEn: 'Dodge the potholes', icon: 'icon' },
  { id: 'handoff_package', area: 'corridor', x: t(34.5), y: t(21.5), title: 'Bàn giao Cuốc Cuối', titleEn: 'Hand off the Last Ride', icon: 'icon' },
];

/** Where the 50-million box waits in the warehouse (feet position, px). */
export const PACKAGE_HOME = { x: t(17.5), y: t(27.5) };

const ROLES: Record<RoleId, RoleSkin> = {
  driver: {
    name: 'Tài Xế',
    nameEn: 'Driver',
    tag: { vi: 'Tài Xế', en: 'Driver' },
    short: 'Làm trạm, giao hàng, tìm công an chìm',
    desc: 'Bạn là tài xế thật. Làm trạm, giao kiện hàng, bỏ phiếu tìm công an chìm.',
  },
  veteran_driver: {
    name: 'Tài Xế Lão Làng',
    nameEn: 'Veteran Driver',
    tag: { vi: 'Lão Làng', en: 'Veteran' },
    short: 'Soi 3 hoạt động gần nhất của một người — 1 lần',
    desc: 'Bạn là tài xế thật. Thêm 1 lần soi 3 hoạt động gần nhất của một người — không thấy vai, chỉ thấy họ đã làm gì.',
  },
  undercover: {
    name: 'Công An Chìm — Tất Xanh',
    nameEn: 'Undercover Cop — Green Socks',
    tag: { vi: 'Công An', en: 'Cop' },
    short: 'Bắt hết tài xế, hoặc cầm chân tới sáng',
    desc: 'Bạn trà trộn trong hội. Lại gần để bắt giữ, làm nhiệm vụ giả để giữ vỏ bọc. Đừng để hàng được giao.',
  },
};

export const GAME_ENDINGS = {
  tasks: 'Kiện hàng đã tới tay người nhận. “Giao xong nhớ đánh giá tài xế năm sao nha anh!” — cả hội chia nhau 50 triệu.',
  vote: 'Công an chìm đã bị lật mặt — cả hội kịp hủy chuyến và giải tán trước khi bị bắt.',
  killer: 'Tài xế cuối cùng đã bị còng — kiện hàng nằm lại Hẻm 42.',
  timeout: 'Trời đã sáng mà kiện hàng vẫn chưa giao — chuyến hàng bị hủy.',
};

export const GAME_SKIN: MapSkin = {
  slug: GAME_SLUG,
  version: GAME_MAP_VERSION,
  prefix: 'card',
  areas: GAME_AREAS,
  taskIds: GAME_TASK_IDS,
  stations: GAME_STATIONS,
  props: GAME_PROPS,
  art: {
    floorBake: `${DIR}/tileset/floor-bake`,
    decor: `${DIR}/atlas/decor-0`,
    stations: `${DIR}/atlas/stations-0`,
    preview: `${DIR}/meta/map-preview`,
    clockIcon: `${DIR}/minigames/ui-dong-ho`,
    nightMarker: `${DIR}/minigames/ui-xe-crab`,
    ghostIcon: `${DIR}/minigames/ui-tuong-trinh`,
    minigames: `${DIR}/minigames`,
    tasks: `${DIR}/tasks`,
    cards: `${DIR}/cards`,
    body: 'body',
    ride: true,
  },
  roles: ROLES,
  killerName: { vi: 'Công An Chìm', en: 'Undercover Cop' },
  crewName: { vi: 'Hội Tài Xế', en: 'Driver Crew' },
  emergency: { vi: 'Gọi họp tại bảng tin', en: 'Call a meeting at the noticeboard' },
  delivery: { packageHome: PACKAGE_HOME },
  labels: {
    mapTitle: { vi: 'Hẻm 42', en: 'Alley 42' },
    mapSubtitle: { vi: 'Cuốc Cuối', en: 'The Last Ride' },
    meetingPlace: { vi: 'Họp ở đầu hẻm', en: 'Meeting at the alley mouth' },
    deadline: { vi: 'trời sáng', en: 'daybreak' },
  },
  story: {
    title: 'Hẻm 42',
    subtitle: 'Cuốc Cuối',
    intro:
      '23:42, Sài Gòn vừa tạnh mưa. Một khách lạ đặt Hội CRAB chở kiện hàng 50 triệu — không mở thùng, không hỏi người gửi, giao trước khi trời sáng. Đang chia việc thì điện thoại cả hội cùng rung: “Trong hội có công an chìm.” Chuẩn bị xong Cuốc Cuối và bàn giao kiện hàng, hoặc lật mặt kẻ trà trộn trước khi cả hội bị còng.',
    prelude: [
      'Đêm nay, Hội Tài Xế CRAB ở Hẻm 42 nhận một cuốc đặc biệt:',
      'giao một kiện hàng cấm trị giá 50 triệu trước khi trời sáng.',
      'Một công an chìm đã trà trộn vào hội!',
      'Hãy cùng nhau chuẩn bị và giao hàng trót lọt,',
      'hoặc tìm ra ai là công an chìm — trước khi cả hội bị còng tay.',
    ],
    preludeAlert: 2,
    // 23:42 -> 05:00 on the fictional clock, whatever the countdown length
    clock: { startMin: 23 * 60 + 42, endMin: 24 * 60 + 5 * 60 },
    endings: GAME_ENDINGS,
    objective: {
      crew: 'Chuẩn bị đủ 100%, mang kiện hàng tới Hẻm Cuối bàn giao — hoặc bỏ phiếu loại đúng công an chìm.',
      killer: 'Bắt hết tài xế, hoặc cầm chân tới khi trời sáng mà kiện hàng chưa được bàn giao.',
    },
  },
  phrases: {
    kill: { vi: 'Bắt giữ', en: 'Arrest' },
    killBanner: { vi: 'Bị bắt giữ!', en: 'Arrested!' },
    ghost: { vi: 'Ngồi khu tạm giữ — gọi đàn em làm nốt', en: 'In the holding room — your runner finishes up' },
    body: { vi: 'Xe CRAB bỏ lại', en: 'Abandoned CRAB bike' },
    bodyFound: { vi: 'Ủa xe ai đậu đây?', en: 'Wait, whose bike is this?' },
    meetingTitle: { vi: 'Ai là công an chìm?', en: 'Who’s the undercover cop?' },
    ejectKiller: { vi: '{name} là công an chìm — tất xanh lộ rồi!', en: '{name} was the undercover cop — green socks!' },
    ejectInnocent: { vi: '{name} là tài xế thiệt. Oan quá trời!', en: '{name} was a real driver. So unfair!' },
    tie: { vi: 'Cả quán cãi nhau, không ai chịu trả tiền nước.', en: 'The whole stall argues — nobody pays for the drinks.' },
    progress: { vi: '📦 Chuẩn bị Cuốc Cuối', en: '📦 Last Ride prep' },
    progressBump: { vi: 'Thêm một bước!', en: 'One step closer!' },
  },
  killButton: { label: { vi: 'Bắt giữ', en: 'Arrest' }, icon: `${DIR}/ui/btn-kill` },
  arrest: { cuffs: `${DIR}/ui/fx-cuffs` },
  ejectScene: 'socks',
  signs: GAME_SIGNS,
  taskEyebrow: { vi: 'Chuẩn bị Cuốc Cuối', en: 'Preparing the Last Ride' },
  sfx: { clock: `${DIR}/sfx/coi-xe.wav` },
};
