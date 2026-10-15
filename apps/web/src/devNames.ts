/** Dev-only: random Vietnamese display names themed to each map (≤16 chars, server limit). */
const NAMES: Record<string, string[]> = {
  'co-do-hue': [
    'Ôn Bửu Lâm', 'Mệ Tôn Nữ', 'O Hương Giang', 'Mạ Đông Ba', 'Tôn Thất Bảo', 'Thị Vệ Hùng',
    'Thái Giám Lộc', 'Cụ Khâm Thiên', 'Ông Đồ Kinh', 'Cô Nam Giao', 'O Tịnh Tâm', 'Bà Đội Trà',
    'Quan Thượng Thư', 'Ôn Phu Văn', 'O Vỹ Dạ', 'Mệ Kim Long',
  ],
  'hoi-an': [
    'Bà Chùa Cầu', 'Cô Phố Hội', 'Chú Thu Bồn', 'Lão Phúc Kiến', 'Bà Cao Lầu', 'O Cẩm Thanh',
    'Anh Đèn Lồng', 'Ông Tấn Ký', 'Cô Bạch Đằng', 'Chị Trà Quế', 'Lão Quán Thắng', 'Chú Cửa Đại',
  ],
  'thang-long': [
    'Cụ Hàng Bạc', 'Cô Hàng Đào', 'Ông Đồ Văn Miếu', 'Chàng Hồ Gươm', 'Bà Hàng Mã', 'Trạng Quốc Tử',
    'Lính Cửa Bắc', 'Cô Tây Hồ', 'Lão Long Biên', 'Anh Hàng Buồm', 'Chị Hàng Ngang', 'Ông Kẻ Chợ',
  ],
};

export function randomDevName(mapSlug: string, avoid = ''): string {
  const pool = (NAMES[mapSlug] ?? NAMES['co-do-hue']).filter((n) => n !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}
