import { TILE } from '../../constants';
import type { StreetSign } from '../common/skin';

const t = (v: number) => Math.round(v * TILE);

/**
 * Painted props for map `sai-gon` (Hụi Sài Gòn · Hẻm 42) — frames in maps/game/atlas/decor-0.
 * Anchor = bottom-centre (x, y in px); `wall` = hung on a wall face (no y-sort lift). Same slots as Huế / Thăng Long.
 * Generated art: tools/paint/sg_props.py (phase 3).
 */
export const GAME_PROPS: { key: string; x: number; y: number; wall?: boolean }[] = [
  // Đầu hẻm — bàn inox họp hụi, hàng xe CRAB, cột điện
  { key: 'prop-courtyard-ban-inox', x: t(21), y: t(5.15) },
  { key: 'prop-courtyard-xe-crab-hang', x: t(25.5), y: t(2.05) },
  { key: 'prop-courtyard-cot-dien', x: t(16.3), y: t(3.2) },
  // Dãy quán ăn — bảng hiệu icon, xe cơm tấm, đèn
  { key: 'prop-exhibition-bang-hieu', x: t(7), y: t(8.35), wall: true },
  { key: 'prop-exhibition-xe-com-tam', x: t(6.4), y: t(12.6) + 16 },
  { key: 'prop-exhibition-xe-banh-mi', x: t(3.6), y: t(14.5) },
  { key: 'prop-exhibition-xe-hu-tieu', x: t(11.6), y: t(14.5) },
  // Hẻm chính — cột điện dây điện mạng nhện
  { key: 'prop-corridor-cot-dien', x: t(19.5), y: t(8.6) },
  { key: 'prop-corridor-cot-dien', x: t(22.5), y: t(17.8) },
  // Bãi giữ xe — xe máy xếp
  { key: 'prop-storage-xe-may-xep', x: t(37.4), y: t(30.4) + 16 },
  // Quán cà phê cóc — quầy pha phin, bàn ghế nhựa
  { key: 'prop-coordination-quay-ca-phe', x: t(31.5), y: t(9.05) },
  { key: 'prop-coordination-ban-ghe-nhua', x: t(34.3), y: t(8.7) + 16 },
  // Tiệm vá xe & cây xăng mini — thau vá xe, kệ xăng lẻ, bàn thờ Ông Địa
  { key: 'prop-editing-thau-va-xe', x: t(14.6), y: t(21.5) + 16 },
  { key: 'prop-editing-ke-xang', x: t(27.4), y: t(21.5) + 16 },
  { key: 'prop-editing-cot-dien', x: t(20.5), y: t(23.1) },
  // Gác lửng nhà trọ — tủ sổ hụi, bàn đếm tiền
  { key: 'prop-archive-tu-so', x: t(7), y: t(27.05) },
  { key: 'prop-archive-ban-dem-tien', x: t(12.6), y: t(26.1), wall: true },
  // Bãi giữ xe — quần áo phơi, áo mưa
  { key: 'prop-storage-day-phoi', x: t(25.5), y: t(30.5) + 16 },
  { key: 'prop-storage-ao-mua', x: t(33), y: t(28.05) },
  // Quán cóc — khui hụi (beside its station)
  { key: 'prop-coordination-binh-tra-da', x: t(39.4), y: t(17.4) + 16 },
  // ---- room decor (footprints = decor_* slots in layout.ts)
  // Đầu hẻm — chậu bông giấy, nón bảo hiểm treo
  { key: 'decor-chau-bong-giay', x: t(15.55), y: t(2.0) },
  { key: 'decor-binh-tra-da', x: t(26.45), y: t(6.95) },
  // Dãy quán ăn — xe nước mía, ghế nhựa, bánh tráng trộn
  { key: 'prop-exhibition-xe-nuoc-mia', x: t(7.5), y: t(10.0) },
  { key: 'decor-ghe-nhua-do', x: t(5.5), y: t(10.0) },
  { key: 'decor-ghe-nhua-xanh', x: t(9.5), y: t(10.0) },
  { key: 'decor-xe-banh-trang', x: t(3.5), y: t(10.0) },
  { key: 'decor-thung-da', x: t(11.5), y: t(10.0) },
  { key: 'decor-chau-bong-giay', x: t(2.5), y: t(9.0) },
  { key: 'decor-long-chim', x: t(12.5), y: t(9.0) },
  // Quán cóc — ghế nhựa, đồng hồ treo, cây dù
  { key: 'decor-ghe-nhua-do', x: t(31), y: t(17.0) },
  { key: 'decor-ghe-nhua-xanh', x: t(38), y: t(17.0) },
  { key: 'decor-ban-inox', x: t(39), y: t(13.0) },
  { key: 'decor-cot-dien', x: t(29.5), y: t(11.0) },
  { key: 'decor-long-chim', x: t(29.5), y: t(15.0) },
  { key: 'decor-du-che', x: t(39.5), y: t(11.0) },
  { key: 'decor-chau-bong-giay', x: t(39.5), y: t(9.0) },
  // Tiệm vá xe — lốp treo, bình xăng, bàn thờ Ông Địa, can nước
  { key: 'decor-lop-treo', x: t(18), y: t(20.0) },
  { key: 'decor-lop-treo', x: t(24), y: t(20.0) },
  { key: 'decor-ban-tho-ong-dia', x: t(27.5), y: t(20.0) },
  { key: 'decor-binh-xang', x: t(14.5), y: t(20.0) },
  { key: 'decor-can-nuoc', x: t(14.5), y: t(25.0) },
  { key: 'decor-xe-crab', x: t(27.5), y: t(25.0) },
  // Gác lửng — nệm, thùng giấy, quạt, chậu bông
  { key: 'prop-archive-nem', x: t(16), y: t(29.0) },
  { key: 'decor-thung-giay', x: t(18), y: t(31.0) },
  { key: 'decor-thung-giay', x: t(11), y: t(31.0) },
  { key: 'decor-quat-may', x: t(4.5), y: t(31.0) },
  { key: 'decor-chau-bong-giay', x: t(18.5), y: t(27.0) },
  { key: 'decor-quat-may', x: t(4.5), y: t(27.0) },
  // Bãi giữ xe — xe máy đậu, cột chung cư, nón bảo hiểm
  { key: 'prop-storage-xe-may', x: t(30), y: t(28.05) },
  { key: 'decor-cot-chung-cu', x: t(36.5), y: t(30.0) },
  { key: 'decor-xe-crab', x: t(24.5), y: t(31.0) },
  { key: 'decor-cot-dien', x: t(23.5), y: t(27.0) },
  { key: 'decor-non-bao-hiem', x: t(26.5), y: t(31.0) },
  // hẻm life — đống rác under the "Cấm đổ rác" sign, ổ gà in the asphalt (floor decals: wall=true keeps them under players)
  { key: 'decor-dong-rac', x: t(24.9), y: t(11.95) },
  { key: 'decor-o-ga', x: t(21.1), y: t(15.9), wall: true },
  { key: 'decor-o-ga', x: t(20.3), y: t(12.3), wall: true },
  { key: 'decor-o-ga', x: t(18.6), y: t(6.0), wall: true },
  { key: 'decor-o-ga', x: t(10.4), y: t(19.8), wall: true },
  { key: 'decor-o-ga', x: t(34.6), y: t(24.2), wall: true },
  // backdrop outside the walkable rooms — dãy nhà ống
  { key: 'decor-nha-ong', x: t(7), y: t(6.6) },
];

/** Street writing on the wall faces (see MapSkin.signs). */
export const GAME_SIGNS: StreetSign[] = [
  { text: 'CẤM ĐÁI BẬY', x: t(15.6), y: t(10.05), style: 'spray', angle: -3 },
  { text: 'KHOAN CẮT BÊ TÔNG\n09xx.xxx.xxx', x: t(18.1), y: t(9.85), style: 'sticker', angle: 4 },
  { text: 'CẤM ĐỔ RÁC', x: t(24.6), y: t(9.95), style: 'board' },
  { text: 'ĐỔ RÁC LÀ CHÓ!', x: t(26.9), y: t(10.45), style: 'spray', angle: 5 },
  { text: 'HÚT HẦM CẦU\n09xx.xxx.xxx', x: t(16.6), y: t(18.2), style: 'sticker', angle: -5 },
  { text: 'HÚT HẦM CẦU\nGIÁ RẺ', x: t(24.4), y: t(18.0), style: 'sticker', angle: 3 },
  { text: 'CHO THUÊ PHÒNG\nCÓ GÁC – GIỜ GIẤC TỰ DO', x: t(8.4), y: t(25.3), style: 'board' },
  { text: 'BƠM VÁ XE', x: t(31.6), y: t(25.25), style: 'spray', angle: -2 },
  { text: 'NHẬN CHUYỂN NHÀ\n09xx.xxx.xxx', x: t(35.2), y: t(25.15), style: 'sticker', angle: -4 },
];
