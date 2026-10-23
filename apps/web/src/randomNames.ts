/** Curated, moderated default display names (≤ NAME_MAX = 12 chars, NFC). */
const NAMES = [
  'Còi Thủ', 'Phanh Thủ', 'Lùi Thủ', 'Kèn Thủ', 'Xi Nhan Thủ', 'Quay Đầu Thủ',
  'Trùm Tạt Hẻm', 'Trùm Ngõ Cụt', 'Trùm Ăn Vặt', 'Vua Kẹt Xe', 'Vua Ổ Gà', 'Vua Quay Đầu', 'Vua Xi Nhan',
  'Thánh Quẹo', 'Thánh Đỗ Bừa', 'Chúa Tể Ổ Gà', 'Bá Chủ Ổ Gà', 'Sát Thủ Ổ Gà', 'Bá Đạo Hẻm', 'Đại Ca Hẻm',
  'Cao Thủ Lùi', 'Bậc Thầy Lùi', 'Đệ Nhất Còi', 'Nữ Hoàng Còi', 'Bóp Còi Tổng',
  'Tài 5 Sao', 'Tài 1 Sao', 'Tài 0 Sao', 'Tài Chạy Rùa', 'Rùa Tốc Hành', 'Rùa Thần', 'Thần Tốc Rùa',
  'Gà Mờ GPS', 'Quên Xi Nhan', 'Mr. Đèn Vàng', 'Ms. Hết Xăng', 'Kẻ Hủy Cuốc', 'Hiệp Sĩ Đêm', 'Lãng Tử Đêm',
  'Thích Đi Tắt',
];

export function randomName(avoid = ''): string {
  const pool = NAMES.filter((n) => n !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}
