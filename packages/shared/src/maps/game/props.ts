import { TILE } from '../../constants';
import type { PropPlacement, StreetSign } from '../common/skin';

const t = (v: number) => Math.round(v * TILE);

/**
 * Painted props for map `sai-gon` (Hụi Sài Gòn · Hẻm 42) — frames in maps/game/atlas/decor-0.
 * Anchor = bottom-centre (x, y in px); `wall` = hung on a wall face (no y-sort lift). Same slots as Huế / Thăng Long.
 * Generated art: tools/paint/sg_props.py (phase 3).
 */
export const GAME_PROPS: PropPlacement[] = [
  // The sprite's 48px base matches each solid tile; keep the middle lane open.
  ...[9, 11, 33, 35].flatMap((x) =>
    [20, 21, 22, 23].map((y) => ({ key: 'decor-hem-barrier', x: t(x + 0.5), y: t(y + 1) })),
  ),
  // Đầu hẻm — bàn inox họp hụi, hàng xe CRAB, cột điện
  { key: 'prop-courtyard-ban-inox', x: t(21), y: t(5.15) },
  { key: 'prop-courtyard-xe-crab-hang', x: t(25.2), y: t(2.6) },
  { key: 'prop-courtyard-cot-dien', x: t(16.3), y: t(3.2) },
  // Bánh mì và hủ tiếu sát vách trên; cơm tấm dưới bánh mì, chừa lối giữa.
  { key: 'prop-exhibition-bang-hieu', x: t(4.2), y: t(8.35), wall: true, scale: 0.9 },
  { key: 'prop-exhibition-xe-banh-mi', x: t(3.4), y: t(10.9), scale: 0.9 },
  { key: 'prop-exhibition-xe-com-tam', x: t(3.6), y: t(14.5), scale: 0.9 },
  { key: 'prop-exhibition-xe-nuoc-mia', x: t(9.2), y: t(11.8), scale: 0.9 },
  { key: 'prop-exhibition-xe-hu-tieu', x: t(11.85), y: t(10.9), scale: 0.9 },
  // Hẻm chính — cột điện dây điện mạng nhện
  { key: 'prop-corridor-cot-dien', x: t(19.5), y: t(8.6) },
  { key: 'prop-corridor-cot-dien', x: t(22.5), y: t(17.8) },
  // Bãi giữ xe — hàng xe sát vách bắc, chừa lối vào phía đông và lối đi giữa.
  { key: 'prop-storage-xe-may-xep', x: t(28.8), y: t(28.15), scale: 0.85 },
  // Quầy sát vách trên; bàn khách bên cạnh, chừa lối pha cà phê phía tây.
  { key: 'prop-coordination-quay-ca-phe', x: t(31.5), y: t(9.05) },
  { key: 'prop-coordination-ban-ghe-nhua', x: t(35), y: t(9.2), scale: 0.95 },
  // Tiệm vá xe & cây xăng mini — thau vá xe, kệ xăng lẻ, bàn thờ Ông Địa
  { key: 'prop-editing-thau-va-xe', x: t(15.5), y: t(21.0) },
  { key: 'prop-editing-ke-xang', x: t(27), y: t(21.0) },
  { key: 'prop-editing-cot-dien', x: t(20.5), y: t(23.1) },
  // Kho CRAB — tủ bám footprint sát vách bắc, kệ tiền chừa cửa vào giữa phòng.
  { key: 'prop-archive-tu-so', x: t(7), y: t(27.0), scale: 0.9 },
  { key: 'prop-archive-ban-dem-tien', x: t(13.5), y: t(26.1), wall: true, scale: 0.9 },
  // Giàn phơi sát mép tây nam; giá áo mưa nép vách đông, xa cửa vào.
  { key: 'prop-storage-day-phoi', x: t(25.5), y: t(31.05), scale: 0.85 },
  { key: 'prop-storage-ao-mua', x: t(37.1), y: t(28.2), scale: 0.65 },
  // Quán cóc — khui hụi (beside its station)
  { key: 'prop-coordination-binh-tra-da', x: t(38.3), y: t(17.0), scale: 0.85 },
  // ---- room decor (footprints = decor_* slots in layout.ts)
  // Đầu hẻm — chậu bông giấy, nón bảo hiểm treo
  { key: 'decor-chau-bong-giay', x: t(15.55), y: t(2.0) },
  { key: 'decor-binh-tra-da', x: t(26.45), y: t(6.95) },
  // Giữ hai điểm nhấn ở mép tường; bỏ xe phụ, thùng đá và ghế nhựa cũ.
  { key: 'decor-chau-bong-giay', x: t(2.5), y: t(9.0) },
  { key: 'decor-long-chim', x: t(12.5), y: t(9.0) },
  // Các cụm bàn ghế bám footprint bàn/ghế sẵn có; giữ lối giữa và cửa nam thông thoáng.
  { key: 'decor-ban-inox', x: t(31), y: t(16.65), scale: 0.9 },
  { key: 'decor-ghe-nhua-do', x: t(30.45), y: t(17.0), scale: 0.9 },
  { key: 'decor-ghe-nhua-do', x: t(31.55), y: t(17.0), scale: 0.9 },
  { key: 'decor-ghe-nhua-xanh', x: t(37.25), y: t(17.0), scale: 0.9 },
  { key: 'decor-ban-inox', x: t(39), y: t(13.0) },
  { key: 'decor-ghe-nhua-do', x: t(38.25), y: t(13.1), scale: 0.8 },
  { key: 'decor-ghe-nhua-xanh', x: t(39.55), y: t(13.1), scale: 0.8 },
  { key: 'decor-cot-dien', x: t(29.5), y: t(11.0) },
  { key: 'decor-long-chim', x: t(29.55), y: t(15.05), scale: 1.05 },
  { key: 'decor-du-che', x: t(39.35), y: t(12.85), scale: 0.95 },
  { key: 'decor-chau-bong-giay', x: t(39.5), y: t(9.0) },
  // Lốp bám vách, kệ tách bàn thờ; hai can cạnh dụng cụ, chừa cửa nam.
  { key: 'decor-lop-treo', x: t(18), y: t(19.9), wall: true },
  { key: 'decor-lop-treo', x: t(24), y: t(19.9), wall: true },
  { key: 'decor-ban-tho-ong-dia', x: t(25.4), y: t(20.15), scale: 0.8, wall: true },
  { key: 'decor-binh-xang', x: t(16.9), y: t(20.0), scale: 0.9 },
  { key: 'decor-can-nuoc', x: t(16.9), y: t(21.6), scale: 0.8 },
  { key: 'decor-xe-crab', x: t(27.5), y: t(25.0) },
  // Góc nghỉ phía đông; kiện hàng nép mép nam, chừa lối đến hai trạm nhiệm vụ.
  { key: 'prop-archive-nem', x: t(16), y: t(29.0), scale: 0.95 },
  { key: 'decor-thung-giay', x: t(18), y: t(30.9), scale: 0.9 },
  { key: 'decor-thung-giay', x: t(11), y: t(30.9), scale: 0.9 },
  { key: 'decor-quat-may', x: t(18.15), y: t(29.05), scale: 0.9 },
  { key: 'decor-chau-bong-giay', x: t(18.5), y: t(27.0) },
  // Bãi giữ xe — xe máy đậu, cột chung cư, nón bảo hiểm
  { key: 'prop-storage-xe-may', x: t(32), y: t(28.05), scale: 0.65 },
  { key: 'decor-cot-chung-cu', x: t(36.5), y: t(30.0), scale: 0.72 },
  { key: 'decor-xe-crab', x: t(24.8), y: t(28.05), scale: 0.65 },
  { key: 'decor-cot-dien', x: t(23.5), y: t(27.0) },
  { key: 'decor-non-bao-hiem', x: t(27.4), y: t(31.0) },
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
  { text: 'HÚT HẦM CẦU', art: 'drain', width: 92, height: 59, x: t(16.5), y: t(10), style: 'sticker', angle: -4 },
  { text: 'CẤM ĐỔ RÁC · AI ĐỔ RÁC LÀM CHÓ', art: 'trash', width: 144, height: 84, x: t(27), y: t(9.9), style: 'spray', angle: 2 },
  { text: 'HÚT HẦM CẦU', art: 'drain', width: 92, height: 59, x: t(16.6), y: t(18.2), style: 'sticker', angle: -5 },
  { text: 'HẺM 47 · HẺM CỤT', art: 'dead-end', width: 90, height: 36, x: t(25.3), y: t(18.1), style: 'board', angle: -2 },
  { text: 'NHẬN CHUYỂN NHÀ', art: 'moving', width: 80, height: 59, x: t(38), y: t(25.15), style: 'sticker', angle: -4 },
];
