/** Dev-only: random Vietnamese display names (≤16 chars, server limit). */
const NAMES = [
  'Tài Xế Bảy', 'Anh CRAB', 'Chú Hai Bánh', 'Cô Hụi', 'Lái Xe Tèo', 'Bé Xe Ôm',
  'Thầy Vá Vỏ', 'Chị Cơm Tấm', 'Ông Sổ Hụi', 'Em Giao Hàng', 'Bác Xăng Lẻ', 'Cậu Hẻm 42',
  'Dì Cà Phê', 'Ku Xếp Xe', 'Anh Bóp Còi', 'Chị Zalo', 'Thằng Rating 5', 'Bà Bán Nước',
];

export function randomDevName(_mapSlug?: string, avoid = ''): string {
  const pool = NAMES.filter((n) => n !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}
