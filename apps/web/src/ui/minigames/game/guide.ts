import type { GameTaskId } from '@hidden-truth/shared';

type G = { goal: string; steps: string[] };
/** Goal + how-to for each mini-game (vi / en). `{passenger}` etc. are filled from the task data. */
export const GUIDE: Partial<Record<GameTaskId, { vi: G; en: G }>> = {
  task_chi_duong: {
    vi: { goal: 'Chở {passenger} tới nơi, theo đúng hướng khách chỉ.', steps: ['Đọc hết câu khách nói — khách hay đổi ý', 'Chọn hướng khách chốt sau cùng', 'Đủ 3 ngã rẽ là tới nơi'] },
    en: { goal: 'Drive {passenger} home, the way they point.', steps: ['Read the whole line — passengers change their mind', 'Pick the turn they settle on last', 'Three junctions and you are there'] },
  },
  task_com_tam: {
    vi: { goal: 'Dọn đúng dĩa cơm tấm cho {customer}.', steps: ['Nhớ tờ order trước khi gió thổi bay', 'Chạm món để bỏ lên dĩa, chạm lần nữa để gỡ', 'Đủ món là dĩa tự giao'] },
    en: { goal: 'Plate the right broken-rice dish for {customer}.', steps: ['Memorise the order before the wind takes it', 'Tap a dish to plate it, tap again to remove it', 'The plate goes out once it holds the full order'] },
  },
  task_tieng_rao: {
    vi: { goal: 'Nghe tiếng rao, báo hiệu cho cả hội.', steps: ['Thuộc ám hiệu: món nào là an toàn, món nào là có người lạ', 'Mỗi tiếng rao chỉ nghe được vài giây', 'Bấm An toàn hoặc Người lạ cho từng tiếng'] },
    en: { goal: 'Read the street calls and signal the crew.', steps: ['Learn tonight’s code: which call means safe, which means stranger', 'Each call only lasts a few seconds', 'Answer Safe or Stranger for every call'] },
  },
  task_ca_phe_phin: {
    vi: { goal: 'Pha một ly cà phê sữa đá chuẩn quán cóc.', steps: ['Chờ phin nhỏ giọt cho hết', 'Nhấn giữ để rót sữa đặc', 'Thả tay khi sữa chạm vạch đỏ'] },
    en: { goal: 'Brew a proper street-side iced milk coffee.', steps: ['Wait for the phin to finish dripping', 'Press and hold to pour condensed milk', 'Let go when the milk reaches the red line'] },
  },
  task_do_xang: {
    vi: { goal: 'Đổ xăng tròn {target}, không dư không thiếu.', steps: ['Nhấn giữ cò bơm, số tiền chạy lên', 'Thả tay để dừng, nhích thêm được', 'Lố quá là phải đổ lại'] },
    en: { goal: 'Pump exactly {target} of fuel.', steps: ['Hold the trigger and watch the money run', 'Let go to stop — you can top up', 'Go over and you start again'] },
  },
  task_va_vo: {
    vi: { goal: 'Tìm và vá lỗ thủng trên ruột xe.', steps: ['Xoay ruột xe qua thau nước', 'Chỗ nào sủi bọt là có lỗ', 'Bấm Vá khi lỗ đang chìm trong nước'] },
    en: { goal: 'Find and patch the hole in the inner tube.', steps: ['Turn the tube through the basin', 'Bubbles mean a hole', 'Press Patch while the hole is under water'] },
  },
  task_so_hui: {
    vi: { goal: 'Ghi đúng số tiền góp của từng người vào sổ hụi.', steps: ['Đọc tin nhắn trong nhóm Zalo', 'Coi chừng có người góp giùm bạn', 'Kéo số tiền vào đúng dòng tên — đủ dòng là sổ tự chốt'] },
    en: { goal: 'Write each driver’s contribution in the hụi ledger.', steps: ['Read the group-chat messages', 'Watch out — someone may pay for a friend', 'Drag each amount onto the right name — the book closes itself'] },
  },
  task_dem_tien: {
    vi: { goal: 'Xếp tiền thành từng xấp rồi báo tổng.', steps: ['Mỗi mệnh giá một màu — nhìn màu là biết', 'Kéo từng tờ vào đúng xấp', 'Xếp xong tự bó thun — chọn tổng cộng'] },
    en: { goal: 'Sort the money into stacks, then report the total.', steps: ['Each value has its own colour', 'Drag every note onto its stack', 'Stacks band themselves — then pick the total'] },
  },
  task_khui_hui: {
    vi: { goal: 'Khui hụi: chọn người bỏ thăm cao nhất.', steps: ['Lật hết phong bì', 'Số viết đủ kiểu: đồng, nghìn, triệu — đọc kỹ', 'Chạm thăm cao nhất để khui trước khi hết giờ'] },
    en: { goal: 'Open the hụi: pick the highest bid.', steps: ['Flip every envelope', 'Bids are written in đồng, nghìn or triệu — read closely', 'Tap the highest bid before time runs out'] },
  },
  task_xep_xe: {
    vi: { goal: 'Xếp hết xe vào bãi giữ xe, né mấy cây cột.', steps: ['Chọn hoặc kéo xe vào ô', 'Bấm Xoay (phím R) để đổi hướng', 'Chạm xe đã đậu để dời lại'] },
    en: { goal: 'Park every bike in the lot, around the pillars.', steps: ['Pick or drag a bike onto a cell', 'Press Rotate (R key) to turn it', 'Tap a parked bike to move it'] },
  },
};
