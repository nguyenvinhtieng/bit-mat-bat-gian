import type { GameTaskId } from '@hidden-truth/shared';

type G = { goal: string };
/** One short action line per mini-game (vi / en) — the play area explains the rest. */
export const GUIDE: Partial<Record<GameTaskId, { vi: G; en: G }>> = {
  connect_wires: { vi: { goal: 'Kéo bốn đầu dây vào cọc cùng màu' }, en: { goal: 'Drag four wires to matching terminals' } },
  untangle_charger: { vi: { goal: 'Kéo đầu cáp qua chốt rồi cắm sạc' }, en: { goal: 'Free the cable, then plug it in' } },
  stuck_shutter: { vi: { goal: 'Kéo cửa lên · nhỏ dầu hoặc vặn chốt rỉ' }, en: { goal: 'Pull up · oil or twist each rusty bolt' } },
  tune_antenna: { vi: { goal: 'Xoay hai anten · giữ khi hình rõ' }, en: { goal: 'Rotate both antennas · hold a clear picture' } },
  water_pipes: { vi: { goal: 'Xoay bốn đoạn ống · nối vòi tới bồn' }, en: { goal: 'Rotate four pipes · connect tap to basin' } },
  pack_cooler: { vi: { goal: 'Kéo từng món vào thùng' }, en: { goal: 'Drag each item into the box' } },
  brew_coffee: { vi: { goal: 'Giữ để rót tới vạch' }, en: { goal: 'Hold to pour up to the band' } },
  wifi_hunt: { vi: { goal: 'Rê điện thoại tìm full vạch' }, en: { goal: 'Move the phone to full bars' } },
  pump_tyre: { vi: { goal: 'Giữ để bơm · thả cho nguội · dừng ở vùng xanh' }, en: { goal: 'Hold to pump · let it cool · stop in the green' } },
  patch_tube: { vi: { goal: 'Kéo ruột xe · chạm chỗ sủi bọt' }, en: { goal: 'Drag the tube · tap the bubbles' } },
  tape_box: { vi: { goal: 'Gấp nắp · dán dọc · dán ngang' }, en: { goal: 'Fold flaps · seal seam · cross tape' } },
  stack_rack: { vi: { goal: 'Chạm để thả thùng cho thẳng' }, en: { goal: 'Tap to drop the box straight' } },
  unpark_bike: { vi: { goal: 'Đưa xe xanh ra cổng phải' }, en: { goal: 'Get the green bike out the right' } },
  dodge_potholes: { vi: { goal: 'Đổi làn né chướng ngại' }, en: { goal: 'Switch lanes to dodge' } },
  handoff_package: { vi: { goal: 'Bấm chuông · chụp ảnh · vuốt giao' }, en: { goal: 'Ring · snap · slide to deliver' } },
};
