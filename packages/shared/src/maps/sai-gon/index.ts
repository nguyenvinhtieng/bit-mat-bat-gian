import { TILE, type AreaId, type RoleId, type TaskId } from '../../constants';
import type { AreaSkin, MapSkin, RoleSkin, StationDef } from '../common/skin';
import { SG_PROPS, SG_SIGNS } from './props';

/**
 * Public skin for map `sai-gon` — "Hụi Sài Gòn · Phiên Hụi Chui Hẻm 42" (safe to ship to clients — no host truth).
 * Everyday Saigon comedy, no ghosts: a crew of CRAB ride drivers runs a secret hụi night, one "new driver" is an undercover cop.
 * Same common layout as Huế; asset keys match assets/manifests/sai-gon.assets.json (phase 3).
 */
export const SG_SLUG = 'sai-gon';
export const SG_MAP_VERSION = 1;

const t = (v: number) => Math.round(v * TILE);
const DIR = `maps/${SG_SLUG}`;

export const SG_AREAS: Record<AreaId, AreaSkin> = {
  courtyard_checkin: { name: 'Đầu Hẻm 42 · Điểm Đón Khách', nameEn: 'Alley 42 Mouth · Pickup Point', floor: 'asphalt' },
  exhibition: { name: 'Dãy Quán Ăn', nameEn: 'Food Stall Row', floor: 'sidewalk' },
  corridor: { name: 'Hẻm Xương Cá', nameEn: 'Fishbone Alley', floor: 'asphalt' },
  coordination: { name: 'Quán Cà Phê Cóc', nameEn: 'Sidewalk Coffee Stall', floor: 'gach-bong' },
  editing: { name: 'Tiệm Vá Xe · Xăng Lẻ', nameEn: 'Tyre Patch & Bottle Fuel', floor: 'concrete' },
  archive: { name: 'Gác Lửng Nhà Trọ', nameEn: 'Boarding-House Loft', floor: 'gach-bong' },
  artifact_storage: { name: 'Bãi Giữ Xe Chung Cư', nameEn: 'Old Apartment Bike Park', floor: 'concrete' },
};

/** Task ids played on this map. */
export const SG_TASK_IDS = [
  'task_chi_duong',
  'task_com_tam',
  'task_tieng_rao',
  'task_ca_phe_phin',
  'task_do_xang',
  'task_va_vo',
  'task_so_hui',
  'task_dem_tien',
  'task_khui_hui',
  'task_xep_xe',
] as const satisfies readonly TaskId[];
export type SgTaskId = (typeof SG_TASK_IDS)[number];

/** Same corner slots as Huế, plus one at the alley mouth (spawn) and one in the west loop of the alley. */
export const SG_STATIONS: StationDef[] = [
  { id: 'task_chi_duong', area: 'courtyard_checkin', x: t(17.2), y: t(1.9), title: 'Chạy cuốc theo khách chỉ đường', titleEn: 'Follow the passenger’s directions', icon: 'sg-station-chi-duong' },
  { id: 'task_com_tam', area: 'exhibition', x: t(6.4), y: t(12.6), title: 'Giao cơm tấm', titleEn: 'Deliver the broken-rice plate', icon: 'sg-station-com-tam' },
  { id: 'task_tieng_rao', area: 'corridor', x: t(10.5), y: t(21.5), title: 'Nghe rao canh chừng', titleEn: 'Listen to the street calls', icon: 'sg-station-tieng-rao' },
  { id: 'task_ca_phe_phin', area: 'coordination', x: t(34.3), y: t(8.7), title: 'Pha cà phê sữa đá', titleEn: 'Brew an iced milk coffee', icon: 'sg-station-ca-phe-phin' },
  { id: 'task_khui_hui', area: 'coordination', x: t(39.4), y: t(17.4), title: 'Bỏ thăm khui hụi', titleEn: 'Open the hụi bids', icon: 'sg-station-khui-hui' },
  { id: 'task_do_xang', area: 'editing', x: t(27.4), y: t(21.5), title: 'Đổ xăng tròn 50', titleEn: 'Fill up exactly 50k', icon: 'sg-station-do-xang' },
  { id: 'task_va_vo', area: 'editing', x: t(14.6), y: t(21.5), title: 'Vá vỏ xe', titleEn: 'Patch the inner tube', icon: 'sg-station-va-vo' },
  { id: 'task_so_hui', area: 'archive', x: t(12.6), y: t(27.3), title: 'Ghi sổ hụi', titleEn: 'Write up the hụi ledger', icon: 'sg-station-so-hui' },
  { id: 'task_dem_tien', area: 'archive', x: t(4.5), y: t(28.6), title: 'Đếm tiền bó thun', titleEn: 'Count the rubber-banded cash', icon: 'sg-station-dem-tien' },
  { id: 'task_xep_xe', area: 'artifact_storage', x: t(37.4), y: t(30.4), title: 'Xếp xe bãi giữ xe', titleEn: 'Pack the bike park', icon: 'sg-station-xep-xe' },
];

const ROLES: Record<RoleId, RoleSkin> = {
  villager: {
    name: 'Tài Xế Chơi Hụi',
    nameEn: 'Hụi Driver',
    short: 'Chạy cuốc, góp hụi, bỏ phiếu',
    desc: 'Bạn là tài xế CRAB chơi hụi ở Hẻm 42. Chạy cuốc kiếm tiền góp đủ quỹ hụi trước khi trời sáng. Trong hội có công an chìm — để ý ai làm việc giả, báo khi thấy xe ai bỏ lại.',
  },
  guardian: {
    name: 'Tư Lách Hẻm',
    nameEn: 'Alley Slipper Tư',
    short: 'Thoát lần bị mời lên phường đầu tiên',
    desc: 'Chạy xe ôm 30 năm, quẹo vô hẻm là mất dấu. Bạn thuộc phe tài xế và có MỘT lần lách: lần đầu công an chìm mời bạn lên phường, bạn quẹo hẻm thoát được (cả hai cùng biết). Sau đó bạn như mọi người.',
  },
  killer: {
    name: 'Công An Chìm',
    nameEn: 'Undercover Cop',
    short: 'Mời từng người lên phường',
    desc: 'Tài xế mới, xe mới cáu, rating 5.0 — đáng nghi! Bạn là công an chìm trà trộn vào hụi. Lại gần một người và bấm Mời lên phường (có thời gian hồi). Giả vờ chạy cuốc, đừng để ai thấy, và nói khéo trong cuộc họp.',
  },
};

/** Not story beats — just the hụi group chat pinging once an hour (the clock stays quiet). */
export const SG_CANH = [
  'Zalo nhóm hụi: “Ai chưa góp hụi nhắn tui nha 😤”',
  'Zalo nhóm hụi: “Có ai còn ở quán cóc hông, tui ghé.”',
  'Zalo nhóm hụi: “Sổ hụi ai cầm vậy trời?”',
  'Zalo nhóm hụi: “Trời gần sáng rồi, lẹ lẹ giùm!”',
  'Zalo nhóm hụi: “Giờ chót! Ai chưa xong thì thôi khỏi về.”',
];

export const SG_ENDINGS = {
  tasks: 'Khui hụi xong! Ai về nhà nấy, coi như chưa có gì.',
  vote: 'Phát hiện công an chìm! Cả hụi ôm sổ chạy mất dép.',
  killer: 'Cả hụi được mời lên phường uống trà.',
  timeout: 'Trời sáng, cả hẻm thức dậy — phiên hụi bị lộ!',
  sabotage: 'Phường ập tới — cả hụi được mời lên phường.',
};

export const SG_SKIN: MapSkin = {
  slug: SG_SLUG,
  version: SG_MAP_VERSION,
  prefix: 'sg',
  areas: SG_AREAS,
  taskIds: SG_TASK_IDS,
  stations: SG_STATIONS,
  props: SG_PROPS,
  art: {
    floorBake: `${DIR}/tileset/sg-floor-bake`,
    decor: `${DIR}/atlas/sg-decor-0`,
    stations: `${DIR}/atlas/sg-stations-0`,
    preview: `${DIR}/meta/sg-map-preview`,
    clockIcon: `${DIR}/minigames/sg-ui-dong-ho`,
    nightMarker: `${DIR}/minigames/sg-ui-xe-crab`,
    ghostIcon: `${DIR}/minigames/sg-ui-tuong-trinh`,
    minigames: `${DIR}/minigames`,
    cards: `${DIR}/cards`,
    body: 'sg-body',
    ride: true,
  },
  roles: ROLES,
  killerName: { vi: 'Công An Chìm', en: 'Undercover Cop' },
  emergency: { vi: 'Bóp còi xe ở đầu hẻm', en: 'Honk the bike horn' },
  sabotage: {
    blind: {
      name: { vi: 'Mưa Sài Gòn', en: 'Saigon Downpour' },
      icon: `${DIR}/minigames/sg-ui-may-mua`,
      alert: { vi: 'Mưa ụp xuống không báo trước — trắng xoá, chẳng thấy gì!', en: 'A downpour out of nowhere — a white wall of rain, you can’t see a thing!' },
    },
    ward: {
      name: { vi: 'Lộ địa điểm hụi', en: 'Location Leaked' },
      icon: `${DIR}/minigames/sg-ui-ghim-dinh-vi`,
      alert: { vi: 'Có người gửi định vị cho phường! Dẹp chiếu hụi ở {area} lẹ!', en: 'Someone sent the location to the ward office! Pack up the hụi mat in {area}, quick!' },
      fix: { vi: 'Dẹp chiếu hụi', en: 'Pack up the mat' },
    },
  },
  labels: {
    mapTitle: { vi: 'Hụi Sài Gòn', en: 'Saigon Hụi Club' },
    mapSubtitle: { vi: 'Phiên Hụi Chui Hẻm 42', en: 'The Secret Savings Circle of Alley 42' },
    meetingPlace: { vi: 'Họp ở quán cà phê cóc đầu hẻm', en: 'Meeting at the sidewalk coffee stall' },
    segment: { vi: 'giờ', en: 'hour' },
    deadline: { vi: 'trời sáng', en: 'daybreak' },
  },
  story: {
    title: 'Hụi Sài Gòn',
    subtitle: 'Phiên Hụi Chui Hẻm 42',
    intro:
      'Hẻm 42, Sài Gòn. Mỗi tháng hội tài xế CRAB lén khui hụi ở quán cà phê cóc đầu hẻm. Tối nay có một tài xế mới xin vào hụi — nghe đồn là công an chìm. Ai cũng áo xanh nón bảo hiểm, chẳng ai phân biệt được. Chạy cuốc góp đủ quỹ hụi trước khi trời sáng, và tìm ra công an chìm trước khi cả hội bị mời lên phường!',
    prelude: [
      'Hẻm 42, 11 giờ đêm. Xe CRAB đậu kín đầu hẻm.',
      'Tối nay khui hụi. Ai cũng mang tiền góp.',
      'Có một tài xế mới xin vào hụi…',
      '…nghe đồn là công an chìm.',
    ],
    canh: SG_CANH,
    // plain wall-clock hours on the night bar (no story marks)
    segments: [
      { vi: '23:00', en: '11 PM' },
      { vi: '00:00', en: '12 AM' },
      { vi: '01:00', en: '1 AM' },
      { vi: '02:00', en: '2 AM' },
      { vi: '03:00', en: '3 AM' },
    ],
    // 23:00 -> 04:00, five hours
    clock: { startMin: 23 * 60, segmentMin: 60 },
    endings: SG_ENDINGS,
    objective: {
      crew: 'Chạy cuốc, góp đủ quỹ hụi. Trong hội có công an chìm — tìm ra trước khi bị mời lên phường!',
      killer: 'Bạn là công an chìm giả làm tài xế mới. Mời từng người lên phường, đừng để bị lột nón.',
    },
  },
  phrases: {
    kill: { vi: 'Mời lên phường', en: 'Invite to the ward' },
    killBanner: { vi: 'Mời lên phường!', en: 'To the ward office, please!' },
    ghost: { vi: 'Ngồi phường viết tường trình — vẫn nhắn Zalo phụ hụi', en: 'Writing a statement at the ward — still texting to help the hụi' },
    body: { vi: 'Xe CRAB bỏ lại', en: 'Abandoned CRAB bike' },
    bodyFound: { vi: 'Ủa xe ai đậu đây?', en: 'Wait, whose bike is this?' },
    meetingTitle: { vi: 'Ai là công an chìm?', en: 'Who’s the undercover cop?' },
    ejectKiller: { vi: '{name} là công an chìm! Lột nón rồi!', en: '{name} was the undercover cop! Helmet off!' },
    ejectInnocent: { vi: '{name} là tài xế thiệt. Oan quá trời!', en: '{name} was a real driver. So unfair!' },
    tie: { vi: 'Cả quán cãi nhau, không ai chịu trả tiền cà phê.', en: 'The whole stall argues — nobody pays for the coffee.' },
    progress: { vi: '💰 Quỹ hụi', en: '💰 Hụi fund' },
    progressBump: { vi: '+50 triệu!', en: '+50 million!' },
  },
  killButton: { label: { vi: 'Bắt lên đồn', en: 'Arrest' }, icon: `${DIR}/ui/sg-btn-kill` },
  arrest: { cuffs: `${DIR}/ui/sg-fx-cuffs` },
  ejectScene: 'socks',
  signs: SG_SIGNS,
  taskEyebrow: { vi: 'Việc vặt Hẻm 42', en: 'Alley 42 errands' },
  sfx: { clock: `${DIR}/sfx/coi-xe.wav` },
};
