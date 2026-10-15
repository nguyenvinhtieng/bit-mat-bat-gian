import type { TlTaskId } from '@hidden-truth/shared';

type G = { goal: string; steps: string[] };
/** Goal + how-to for each mini-game (vi / en). `{glyph}` etc. are filled from the task data. */
export const GUIDE: Record<TlTaskId, { vi: G; en: G }> = {
  task_banh_chung: {
    vi: { goal: 'Gói một chiếc bánh chưng vuông vức.', steps: ['Đọc gợi ý, chạm đúng nguyên liệu cho từng lớp', 'Lá dong lót đáy, gạo bọc ngoài nhân đậu và thịt', 'Bấm Siết khi kim vào vùng xanh để buộc 4 lạt'] },
    en: { goal: 'Wrap a perfectly square bánh chưng.', steps: ['Read the hint and tap the right ingredient for each layer', 'Leaves underneath, rice around the bean and pork filling', 'Press Pull when the needle is in the green to tie 4 strings'] },
  },
  task_dong_ho: {
    vi: { goal: 'Tìm nguồn màu tự nhiên để in tranh “{painting}”.', steps: ['Kéo nguyên liệu vào chum màu', 'Mỗi màu một nguồn, có lá, hoa, sỏi, vỏ sò', 'Đủ màu là tranh tự in'] },
    en: { goal: 'Find the natural pigment sources to print “{painting}”.', steps: ['Drag a material onto each colour jar', 'One source per colour: leaves, flowers, stone, shells', 'The print starts once every jar is filled'] },
  },
  task_cho_chu: {
    vi: { goal: 'Viết chữ {glyph} ({meaning}) theo nét bút ông đồ.', steps: ['Đặt bút ở chấm vàng', 'Kéo theo nét mờ, đúng hướng', 'Viết lần lượt từng nét theo số'] },
    en: { goal: 'Write {glyph} ({meaning}) the way the scholar does.', steps: ['Start at the gold dot', 'Follow the faint stroke in its direction', 'Write the strokes in numbered order'] },
  },
  task_cay_neu: {
    vi: { goal: 'Treo đồ lên ngọn nêu và dựng cây thẳng đứng.', steps: ['Chọn đúng đồ treo theo tục xưa', 'Đủ đồ treo là cây tự dựng lên', 'Bấm Chống khi cây gần thẳng'] },
    en: { goal: 'Dress the Tết pole and stand it upright.', steps: ['Pick the traditional ornaments', 'The pole rises once it is dressed', 'Press Brace when it is nearly upright'] },
  },
  task_cau_doi: {
    vi: { goal: 'Ghép mỗi vế trên với vế dưới đối với nó.', steps: ['Đọc vế trên', 'Xem thẻ vàng: cặp chữ đối nhau', 'Kéo vế dưới chứa chữ đối vào ô'] },
    en: { goal: 'Pair each first line with its matching second line.', steps: ['Read the first line', 'Check the yellow tag: the paired words', 'Drag the second line holding the pair'] },
  },
  task_ngu_qua: {
    vi: { goal: 'Bày mâm ngũ quả đúng kiểu từng miền.', steps: ['Đọc yêu cầu: miền Bắc hay miền Nam', 'Kéo quả vào từng ô trên mâm', 'Đủ quả là mâm tự được dâng'] },
    en: { goal: 'Arrange the five-fruit tray the regional way.', steps: ['Check whether it is the Northern or Southern style', 'Drag fruit onto each spot of the tray', 'The tray is offered once it is full'] },
  },
  task_ca_tru: {
    vi: { goal: 'Gõ phách lại đúng nhịp đào nương.', steps: ['Bấm Xem để thấy chấm sáng lần lượt', 'Xem xong là tới lượt bạn: chạm phách để bắt đầu', 'Chạm mỗi khi vạch đỏ tới chấm đang sáng'] },
    en: { goal: 'Echo the singer’s clapper rhythm.', steps: ['Press Watch to see the dots light up', 'Then it is your turn: tap once to start', 'Tap whenever the red line reaches a glowing dot'] },
  },
  task_roi_nuoc: {
    vi: { goal: 'Dẫn {puppet} qua các vòng sóng theo thứ tự.', steps: ['Nhấn giữ trên mặt nước', 'Con rối bơi theo ngón tay, không nhanh hơn được', 'Đi qua vòng 1 → 2 → 3'] },
    en: { goal: 'Lead {puppet} through the ripples in order.', steps: ['Press and hold on the water', 'The puppet swims after your finger at its own pace', 'Pass ring 1 → 2 → 3'] },
  },
};
