import type { GameTaskId } from '@hidden-truth/shared';

type G = { goal: string };
/** One short action line per mini-game (vi / en) — the play area explains the rest. */
export const GUIDE: Partial<Record<GameTaskId, { vi: G; en: G }>> = {
  pack_cooler: { vi: { goal: 'Kéo từng món vào thùng' }, en: { goal: 'Drag each item into the box' } },
  dodge_sellers: { vi: { goal: 'Vuốt trái / phải để từ chối' }, en: { goal: 'Swipe left / right to decline' } },
  brew_coffee: { vi: { goal: 'Giữ để rót tới vạch' }, en: { goal: 'Hold to pour up to the band' } },
  wifi_hunt: { vi: { goal: 'Rê điện thoại tìm full vạch' }, en: { goal: 'Move the phone to full bars' } },
  pump_tyre: { vi: { goal: 'Bơm tới vùng xanh rồi dừng' }, en: { goal: 'Pump into the green, then stop' } },
  patch_tube: { vi: { goal: 'Kéo ruột xe · chạm chỗ sủi bọt' }, en: { goal: 'Drag the tube · tap the bubbles' } },
  tape_box: { vi: { goal: 'Vẽ vòng quanh thùng' }, en: { goal: 'Draw circles around the box' } },
  stack_rack: { vi: { goal: 'Chạm để thả thùng cho thẳng' }, en: { goal: 'Tap to drop the box straight' } },
  unpark_bike: { vi: { goal: 'Đưa xe xanh ra cổng phải' }, en: { goal: 'Get the green bike out the right' } },
  find_ticket: { vi: { goal: 'Kéo đồ ra · chạm vé xe' }, en: { goal: 'Drag items out · tap the ticket' } },
  dodge_potholes: { vi: { goal: 'Đổi làn né chướng ngại' }, en: { goal: 'Switch lanes to dodge' } },
  handoff_package: { vi: { goal: 'Bấm chuông · chụp ảnh · vuốt giao' }, en: { goal: 'Ring · snap · slide to deliver' } },
};
