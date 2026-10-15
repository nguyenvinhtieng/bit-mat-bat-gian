import { TILE } from '../../constants';

const t = (v: number) => Math.round(v * TILE);

/**
 * Painted props for map `thang-long` (Hồ Gươm · Đêm Giao Thừa) — frames in maps/thang-long/atlas/tl-decor-0.
 * Anchor = bottom-centre (x, y in px); `wall` = hung on a wall face (no y-sort lift). Same slots as Huế.
 * Generated art: tools/paint/tl_props.py.
 */
export const TL_PROPS: { key: string; x: number; y: number; wall?: boolean }[] = [
  // Bờ Hồ · Cây Nêu — bàn thờ giao thừa, xe hoa Tết, cây nêu
  { key: 'tl-prop-ban-tho-giao-thua', x: t(21), y: t(5.15) },
  { key: 'tl-prop-xe-hoa', x: t(25.5), y: t(2.05) },
  { key: 'tl-prop-cay-neu', x: t(16.3), y: t(3.2) },
  // Đền Ngọc Sơn — hoành phi, mâm ngũ quả, đèn lồng
  { key: 'tl-prop-hoanh-phi', x: t(7), y: t(8.35), wall: true },
  { key: 'tl-prop-ban-ngu-qua', x: t(6.4), y: t(12.6) + 16 },
  { key: 'tl-prop-den-long', x: t(3.6), y: t(14.5) },
  { key: 'tl-prop-den-long', x: t(11.6), y: t(14.5) },
  // Cầu Thê Húc — cột đèn lồng
  { key: 'tl-decor-den-long-cot', x: t(19.5), y: t(8.6) },
  { key: 'tl-decor-den-long-cot', x: t(22.5), y: t(17.8) },
  // Bếp Tết — nồi bánh chưng
  { key: 'tl-prop-noi-banh-chung', x: t(37.4), y: t(30.4) + 16 },
  // Thủy Đình Rối Nước — thủy đình, chiếu ca trù
  { key: 'tl-prop-thuy-dinh', x: t(31.5), y: t(9.05) },
  { key: 'tl-prop-ca-tru', x: t(34.3), y: t(8.7) + 16 },
  // Phố Ông Đồ · Tháp Bút — bàn câu đối, chõng ông đồ, Tháp Bút
  { key: 'tl-prop-ban-cau-doi', x: t(14.6), y: t(21.5) + 16 },
  { key: 'tl-prop-chong-ong-do', x: t(27.4), y: t(21.5) + 16 },
  { key: 'tl-prop-thap-but', x: t(20.5), y: t(23.1) },
  // Phố Hàng Trống — giá tranh, dây tranh Đông Hồ
  { key: 'tl-prop-gia-tranh', x: t(7), y: t(27.05) },
  { key: 'tl-prop-tranh-treo', x: t(12.6), y: t(26.1), wall: true },
  // Bếp Tết — cây nêu nhỏ, đống củi
  { key: 'tl-prop-neu-nho', x: t(25.5), y: t(30.5) + 16 },
  { key: 'tl-prop-dong-cui', x: t(33), y: t(28.05) },
  // Thủy Đình — ao rối (beside its station)
  { key: 'tl-prop-ao-roi', x: t(39.4), y: t(17.4) + 16 },
  // ---- room decor (footprints = decor_* slots in layout.ts)
  // Bờ Hồ — chậu quất, chậu đào
  { key: 'tl-decor-chau-quat', x: t(15.55), y: t(2.0) },
  { key: 'tl-decor-chau-dao', x: t(26.45), y: t(6.95) },
  // Đền Ngọc Sơn — bàn thờ, hạc rùa, cột câu đối, bình đào
  { key: 'tl-prop-ban-tho-ngoc-son', x: t(7.5), y: t(10.0) },
  { key: 'tl-decor-hac-rua', x: t(5.5), y: t(10.0) },
  { key: 'tl-decor-hac-rua', x: t(9.5), y: t(10.0) },
  { key: 'tl-decor-cot-cau-doi', x: t(3.5), y: t(10.0) },
  { key: 'tl-decor-cot-cau-doi', x: t(11.5), y: t(10.0) },
  { key: 'tl-decor-binh-dao', x: t(2.5), y: t(9.0) },
  { key: 'tl-decor-binh-dao', x: t(12.5), y: t(9.0) },
  // Thủy Đình — ghế tre, giá rối, cột đỏ, cờ hội
  { key: 'tl-decor-ghe-tre', x: t(31), y: t(17.0) },
  { key: 'tl-decor-ghe-tre', x: t(38), y: t(17.0) },
  { key: 'tl-decor-gia-roi', x: t(39), y: t(13.0) },
  { key: 'tl-decor-cot-do', x: t(29.5), y: t(11.0) },
  { key: 'tl-decor-cot-do', x: t(29.5), y: t(15.0) },
  { key: 'tl-decor-cot-do', x: t(39.5), y: t(11.0) },
  { key: 'tl-decor-co-hoi', x: t(39.5), y: t(9.0) },
  // Phố Ông Đồ — giá câu đối, chậu quất/đào, chum nước, đèn lồng
  { key: 'tl-decor-gia-cau-doi', x: t(18), y: t(20.0) },
  { key: 'tl-decor-gia-cau-doi', x: t(24), y: t(20.0) },
  { key: 'tl-decor-chau-quat', x: t(27.5), y: t(20.0) },
  { key: 'tl-decor-chau-dao', x: t(14.5), y: t(20.0) },
  { key: 'tl-decor-chum-nuoc', x: t(14.5), y: t(25.0) },
  { key: 'tl-prop-den-long', x: t(27.5), y: t(25.0) },
  // Phố Hàng Trống — bàn in tranh, chồng giấy điệp, chum màu, đèn lồng
  { key: 'tl-prop-ban-in-tranh', x: t(16), y: t(29.0) },
  { key: 'tl-decor-chong-giay', x: t(18), y: t(31.0) },
  { key: 'tl-decor-chong-giay', x: t(11), y: t(31.0) },
  { key: 'tl-decor-chum-mau', x: t(4.5), y: t(31.0) },
  { key: 'tl-decor-chum-mau', x: t(18.5), y: t(27.0) },
  { key: 'tl-prop-den-long', x: t(4.5), y: t(27.0) },
  // Bếp Tết — mâm lá dong, cây đào, cột đèn, chum nước
  { key: 'tl-prop-mam-la-dong', x: t(30), y: t(28.05) },
  { key: 'tl-decor-cay-dao', x: t(36.5), y: t(30.0) },
  { key: 'tl-decor-den-long-cot', x: t(24.5), y: t(31.0) },
  { key: 'tl-decor-den-long-cot', x: t(23.5), y: t(27.0) },
  { key: 'tl-decor-chum-nuoc', x: t(26.5), y: t(31.0) },
  // Hồ Gươm backdrop (outside the walkable rooms) — Tháp Rùa
  { key: 'tl-decor-thap-rua', x: t(7), y: t(6.6) },
];
