import { TILE } from '../../constants';
import type { PropPlacement, StreetSign } from '../common/skin';

const t = (v: number) => Math.round(v * TILE);

/**
 * Sài Gòn · Hẻm 42 — matte sprites in maps/game/atlas/decor-0.
 * Anchor = bottom-centre (x, y in px); `wall` draws beneath players (wall art / floor decals).
 * Art sources: assets/_src/maps/game/imagegen/saigon-matte-v5; collision slots remain unchanged.
 */
export const GAME_PROPS: PropPlacement[] = [
  // The sprite's 48px base matches each solid tile; keep the middle lane open.
  ...[9, 11, 33, 35].flatMap((x) =>
    [20, 21, 22, 23].map((y) => ({ key: 'decor-hem-barrier', x: t(x + 0.5), y: t(y + 1) })),
  ),
  // Đầu hẻm — bàn tổ dân phố; ghế nhựa và bình trà nép vách bắc, chừa lối họp.
  { key: 'prop-courtyard-ban-inox', x: t(21), y: t(5.15) },
  { key: 'decor-exhibition-chair-red', x: t(24.3), y: t(2.6), scale: 0.9 },
  { key: 'decor-exhibition-chair-blue', x: t(25.5), y: t(2.6), scale: 0.9 },
  // Quầy bán bám vách bắc và tây; lối gọi món mở ra giữa quán.
  { key: 'prop-exhibition-bang-hieu', x: t(4.2), y: t(8.35), wall: true, scale: 0.9 },
  { key: 'prop-exhibition-xe-banh-mi', x: t(3.5), y: t(10), scale: 0.85 },
  { key: 'prop-exhibition-xe-nuoc-mia', x: t(6), y: t(10), scale: 0.8 },
  { key: 'prop-exhibition-xe-hu-tieu', x: t(9), y: t(10), scale: 0.85 },
  { key: 'prop-exhibition-xe-com-tam', x: t(3.5), y: t(13), scale: 0.85 },
  // Bồn rửa sát vách đông, vòi và ống lộ thiên ngay trên điểm sửa nước.
  { key: 'decor-exhibition-sink', x: t(12.15), y: t(9), scale: 0.85 },
  // Bàn inox nhỏ, ghế nhựa thấp; chừa trục đi từ cửa đông xuống hẻm nam.
  { key: 'decor-exhibition-table', x: t(7), y: t(13.3), scale: 0.9 },
  { key: 'decor-exhibition-chair-red', x: t(6.1), y: t(13.6), scale: 0.8 },
  { key: 'decor-exhibition-chair-blue', x: t(7.9), y: t(13.6), scale: 0.8 },
  { key: 'decor-exhibition-table', x: t(10.5), y: t(15.3), scale: 0.9 },
  { key: 'decor-exhibition-chair-blue', x: t(9.6), y: t(15.6), scale: 0.8 },
  { key: 'decor-exhibition-chair-red', x: t(11.4), y: t(15.6), scale: 0.8 },
  // Góc nhận đơn cạnh nhiệm vụ xếp thùng; ghế chờ shipper nép vách nam.
  { key: 'decor-exhibition-pickup', x: t(2.4), y: t(17.2), scale: 0.85 },
  { key: 'decor-exhibition-waiting-sign', x: t(6.75), y: t(16.5), scale: 0.9 },
  { key: 'decor-exhibition-chair-blue', x: t(6.2), y: t(17.2), scale: 0.8 },
  { key: 'decor-exhibition-chair-red', x: t(7.3), y: t(17.2), scale: 0.8 },
  // Hẻm chính — cột điện dây điện mạng nhện
  { key: 'prop-corridor-cot-dien', x: t(19.5), y: t(9), scale: 0.9 },
  { key: 'prop-corridor-cot-dien', x: t(22.5), y: t(18), scale: 0.9 },
  // Bãi giữ xe — góc chú bảo vệ sát vách bắc, đồ cũ cùng bộ với quán nước.
  // Quạt cạnh bàn trà nép vách giữa hai cửa bắc; lối từ hẻm đông xuống trạm rút xe để trống.
  { key: 'decor-quat-may', x: t(28.4), y: t(26.8), scale: 0.8 },
  { key: 'decor-exhibition-table', x: t(29.7), y: t(26.9), scale: 0.9 },
  { key: 'decor-binh-tra-da', x: t(31.3), y: t(26.75), scale: 0.65 },
  { key: 'decor-exhibition-chair-blue', x: t(30.5), y: t(27.45), scale: 0.85 },
  { key: 'decor-thung-da', x: t(24.8), y: t(27.8), scale: 0.75 },
  // Quán nước: quầy cà phê vợt và tivi CRT thẳng hàng sát vách bắc.
  // Ba điểm tương tác giữ nguyên, đồ dùng đặt ngay cạnh từng nhiệm vụ.
  { key: 'prop-coordination-quay-ca-phe', x: t(31.5), y: t(9.05) },
  { key: 'prop-coordination-tivi', x: t(37.5), y: t(9.05) },
  // Tiệm sửa xe — vá ruột bên trái, khí nén bên phải, kệ phụ tùng sát vách.
  { key: 'prop-editing-thau-va-xe', x: t(15.5), y: t(21.8), scale: 0.7 },
  { key: 'prop-editing-compressor', x: t(26.7), y: t(20.25) },
  { key: 'prop-editing-parts-shelf', x: t(15.5), y: t(20.25), scale: 0.9 },
  { key: 'prop-editing-wiring-panel', x: t(20.5), y: t(24.9), scale: 0.9 },
  // Kho CRAB — kệ khung sắt chứa hàng sát góc tây bắc, chừa cửa vào giữa phòng.
  { key: 'prop-archive-tu-so', x: t(5), y: t(27.0), scale: 0.9 },
  { key: 'prop-archive-ban-dem-tien', x: t(13.5), y: t(27), scale: 0.85 },
  // Giàn phơi sát mép tây nam; giá áo mưa nép vách đông, xa cửa vào.
  { key: 'prop-storage-day-phoi', x: t(25.5), y: t(31.05), scale: 0.85 },
  { key: 'prop-storage-ao-mua', x: t(37.1), y: t(28.2), scale: 0.65 },
  // ---- room decor (footprints = decor_* slots in layout.ts)
  // Đầu hẻm — cây sát góc tường, bình trà cạnh ghế chờ.
  { key: 'decor-chau-bong-giay', x: t(15.5), y: t(2), scale: 0.7 },
  { key: 'decor-binh-tra-da', x: t(26.3), y: t(2.65), scale: 0.75 },
  // Chậu cây và lồng chim nhỏ nép sát vách, không lấn cửa quán.
  { key: 'decor-chau-bong-giay', x: t(2.5), y: t(9), scale: 0.7 },
  // Bàn ghế nhìn thẳng; chừa lối từ cửa tây qua giữa quán xuống cửa nam.
  { key: 'decor-exhibition-table', x: t(32), y: t(11.6), scale: 0.85 },
  { key: 'decor-exhibition-chair-red', x: t(31.35), y: t(12), scale: 0.8 },
  { key: 'decor-exhibition-chair-blue', x: t(32.65), y: t(12), scale: 0.8 },
  { key: 'decor-exhibition-table', x: t(35.3), y: t(11.6), scale: 0.85 },
  { key: 'decor-exhibition-chair-blue', x: t(34.65), y: t(12), scale: 0.8 },
  { key: 'decor-exhibition-chair-red', x: t(35.95), y: t(12), scale: 0.8 },
  { key: 'decor-exhibition-table', x: t(39), y: t(12.65), scale: 0.85 },
  { key: 'decor-exhibition-chair-red', x: t(38.35), y: t(13), scale: 0.8 },
  { key: 'decor-exhibition-chair-blue', x: t(39.65), y: t(13), scale: 0.8 },
  // Bốn tài xế nghỉ chân, không đội mũ; xe dựng sát vách tây, chừa cửa nam x34.
  { key: 'prop-coordination-danh-bai', x: t(36.7), y: t(16.85), scale: 0.9 },
  { key: 'prop-coordination-xe-dung', x: t(31.2), y: t(17.5) },
  { key: 'decor-coordination-router', x: t(39.2), y: t(17.6), wall: true },
  { key: 'decor-long-chim', x: t(29.5), y: t(10), wall: true, scale: 0.55 },
  { key: 'decor-chau-bong-giay', x: t(39.5), y: t(9), scale: 0.7 },
  // Lốp sát vách; chừa thoáng cửa nam và khoảng thao tác giữa phòng.
  { key: 'decor-lop-treo', x: t(18), y: t(19.9), wall: true },
  { key: 'decor-ban-tho-ong-dia', x: t(14.5), y: t(25), scale: 0.65 },
  // Kiện hàng nép mép nam, chừa lối đến hai trạm nhiệm vụ.
  { key: 'decor-thung-giay', x: t(18), y: t(30.9), scale: 0.9 },
  { key: 'decor-thung-giay', x: t(11), y: t(30.9), scale: 0.9 },
  { key: 'decor-quat-may', x: t(18.15), y: t(29.05), scale: 0.9 },
  { key: 'decor-chau-bong-giay', x: t(18.5), y: t(27), scale: 0.7 },
  // Chậu cây thay cột giữa bãi; không che lối đến trạm rút xe phía đông.
  { key: 'decor-chau-bong-giay', x: t(36.5), y: t(30), scale: 0.7 },
  // hẻm life — đống rác under the "Cấm đổ rác" sign, ổ gà in the asphalt (floor decals: wall=true keeps them under players)
  { key: 'decor-dong-rac', x: t(25), y: t(12.1), scale: 0.8 },
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
  // Fit inside the plaster face (y 467–522), clear of vents and the roof trim.
  { text: 'HÚT HẦM CẦU', art: 'drain', width: 64, height: 36, x: t(17.5), y: t(10.3), style: 'sticker', angle: -2 },
  { text: 'CẤM ĐỔ RÁC · AI ĐỔ RÁC LÀM CHÓ', art: 'trash', width: 112, height: 36, x: t(25), y: t(10.3), style: 'board', angle: 0 },
  { text: 'HÚT HẦM CẦU', art: 'drain', width: 64, height: 36, x: t(16.6), y: t(18.2), style: 'sticker', angle: -3 },
  { text: 'HẺM 47 · HẺM CỤT', art: 'dead-end', width: 90, height: 36, x: t(25.3), y: t(18.1), style: 'board', angle: -2 },
  { text: 'NHẬN CHUYỂN NHÀ', art: 'moving', width: 80, height: 59, x: t(38), y: t(25.15), style: 'sticker', angle: -4 },
];
