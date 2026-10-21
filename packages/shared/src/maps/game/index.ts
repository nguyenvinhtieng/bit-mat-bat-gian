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
  coordination: { name: 'Quán Nước Dì Bảy', nameEn: 'Aunt Bảy’s Drink Stall', floor: 'gach-bong' },
  editing: { name: 'Tiệm Sửa Xe Chú Tám', nameEn: 'Uncle Tám’s Bike Shop', floor: 'concrete' },
  archive: { name: 'Kho CRAB', nameEn: 'CRAB Warehouse', floor: 'gach-bong' },
  artifact_storage: { name: 'Bãi Giữ Xe · Bảng Đường', nameEn: 'Bike Park · Route Board', floor: 'concrete' },
};

/** Task ids played on this map (all of them: one map). */
export const GAME_TASK_IDS = TASK_IDS;
export type GameTaskId = TaskId;

export const GAME_STATIONS: StationDef[] = [
  { id: 'receive_package', area: 'archive', x: t(12.6), y: t(27.3), title: 'Nhận kiện hàng bí ẩn', titleEn: 'Receive the mystery package', icon: 'station-receive-package' },
  { id: 'check_seal', area: 'archive', x: t(4.5), y: t(28.6), title: 'Kiểm tra niêm phong', titleEn: 'Check the seal', icon: 'station-check-seal' },
  { id: 'pack_disguise', area: 'archive', x: t(8.5), y: t(29.5), title: 'Ngụy trang kiện hàng', titleEn: 'Disguise the package', icon: 'station-pack-disguise' },
  { id: 'decode_address', area: 'coordination', x: t(34.3), y: t(8.7), title: 'Giải mã địa chỉ giao', titleEn: 'Decode the drop-off address', icon: 'station-decode-address' },
  { id: 'confirm_recipient', area: 'coordination', x: t(39.4), y: t(17.4), title: 'Xác minh người nhận', titleEn: 'Verify the recipient', icon: 'station-confirm-recipient' },
  { id: 'prepare_bike', area: 'editing', x: t(14.6), y: t(21.5), title: 'Chuẩn bị xe chở hàng', titleEn: 'Prepare the delivery bike', icon: 'station-prepare-bike' },
  { id: 'plan_route', area: 'artifact_storage', x: t(37.4), y: t(30.4), title: 'Chọn đường tránh kẹt xe, ngập', titleEn: 'Plan a route around jams and floods', icon: 'station-plan-route' },
  { id: 'handoff_package', area: 'corridor', x: t(34.5), y: t(21.5), title: 'Bàn giao Cuốc Cuối', titleEn: 'Hand off the Last Ride', icon: 'station-handoff-package' },
];

/** Where the 50-million box waits in the warehouse (feet position, px). */
export const PACKAGE_HOME = { x: t(17.5), y: t(27.5) };

const ROLES: Record<RoleId, RoleSkin> = {
  driver: {
    name: 'Tài Xế CRAB',
    nameEn: 'CRAB Driver',
    short: 'Chuẩn bị Cuốc Cuối, tìm cảnh sát chìm',
    desc: 'Làm nhiệm vụ chuẩn bị chuyến hàng 50 triệu, quan sát người khác, họp và bỏ phiếu. Bạn không biết ai là cảnh sát. “Năm mươi triệu chia đều, ai làm biếng thì đừng có nhận phần!”',
  },
  veteran_driver: {
    name: 'Tài Xế Lão Làng',
    nameEn: 'Veteran Driver',
    short: 'Soi 3 hoạt động nhiệm vụ gần nhất của một người — 1 lần',
    desc: 'Bạn là tài xế CRAB thật, thắng thua cùng hội. Một lần mỗi trận, chọn một người để xem tối đa 3 hoạt động nhiệm vụ gần nhất (không thấy role — cảnh sát làm task giả vẫn có log). “Chạy cuốc bao năm, nhìn cách cầm điện thoại là tao biết có mùi rồi!”',
  },
  undercover: {
    name: 'Cảnh Sát Chìm — Tất Xanh',
    nameEn: 'Undercover Cop — Green Socks',
    short: 'Bắt giữ toàn bộ tài xế trước khi hàng được giao',
    desc: 'Bạn mặc áo CRAB như mọi người. Làm task giả để có vỏ bọc (không cộng tiến độ). Đứng sát một người và GIỮ nút Bắt giữ 1,5 giây — người ở gần sẽ nghe tiếng còng. “Cho anh kiểm tra... à, cho em xin mã đơn với!”',
  },
};

export const GAME_ENDINGS = {
  tasks: 'Kiện hàng đã tới tay người nhận. “Giao xong nhớ đánh giá tài xế năm sao nha anh!” — Hội CRAB chia nhau 50 triệu.',
  vote: 'Lật mặt cảnh sát chìm! Cả hội hủy chuyến và giải tán trước khi bị bắt.',
  killer: 'Tài xế cuối cùng bị còng — kiện hàng ở lại Hẻm 42. Cảnh sát chìm thắng.',
  timeout: 'Trời sáng mà kiện hàng chưa giao — chuyến hàng bị hủy. Cảnh sát chìm thắng.',
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
    cards: `${DIR}/cards`,
    body: 'body',
    ride: true,
  },
  roles: ROLES,
  killerName: { vi: 'Cảnh Sát Chìm', en: 'Undercover Cop' },
  crewName: { vi: 'Hội CRAB', en: 'CRAB Crew' },
  emergency: { vi: 'Bóp còi xe ở đầu hẻm', en: 'Honk the bike horn' },
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
      '23:42, Sài Gòn, mưa vừa tạnh. Hội tài xế CRAB nhận chuyến hàng 50 triệu: không mở thùng, không hỏi người gửi, giao trước khi trời sáng. Rồi điện thoại cả hội cùng rung: “Trong hội có công an chìm. Ổng đang giả làm tài xế CRAB.” Chuẩn bị Cuốc Cuối và bàn giao kiện hàng — hoặc lật mặt người trà trộn trước khi bị bắt hết.',
    prelude: [
      '23:42. Sài Gòn. Mưa vừa tạnh.',
      'Quán nước dì Bảy vẫn sáng đèn ở cuối Hẻm 42.',
      'Một vị khách giấu tên: 50 triệu cho một chuyến hàng.',
      'Không mở thùng. Không hỏi người gửi. Giao trước khi trời sáng.',
      '“Trong hội có công an chìm. Ổng đang giả làm tài xế CRAB.”',
    ],
    // 23:42 -> 05:00 on the fictional clock, whatever the countdown length
    clock: { startMin: 23 * 60 + 42, endMin: 24 * 60 + 5 * 60 },
    endings: GAME_ENDINGS,
    objective: {
      crew: 'Hoàn tất chuẩn bị, mang kiện hàng tới Hẻm Cuối và bàn giao — hoặc bỏ phiếu đúng cảnh sát chìm.',
      killer: 'Bắt giữ toàn bộ tài xế trước khi kiện hàng được bàn giao. Làm task giả để trà trộn.',
    },
  },
  phrases: {
    kill: { vi: 'Bắt giữ', en: 'Arrest' },
    killBanner: { vi: 'Bị bắt giữ!', en: 'Arrested!' },
    ghost: { vi: 'Ngồi khu tạm giữ — chỉ được xem', en: 'In the holding room — watching only' },
    body: { vi: 'Xe CRAB bỏ lại', en: 'Abandoned CRAB bike' },
    bodyFound: { vi: 'Ủa xe ai đậu đây?', en: 'Wait, whose bike is this?' },
    meetingTitle: { vi: 'Ai là cảnh sát chìm?', en: 'Who’s the undercover cop?' },
    ejectKiller: { vi: '{name} là cảnh sát chìm — tất xanh lộ rồi!', en: '{name} was the undercover cop — green socks!' },
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
