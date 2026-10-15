import type { TaskId } from '@hidden-truth/shared';

type G = { goal: string; steps: string[] };
/** Goal + how-to for each mini-game (vi / en). `{glyph}` etc. are filled from the task data. */
export const GUIDE: Record<TaskId, { vi: G; en: G }> = {
  task_moon_phase: {
    vi: { goal: 'Xếp 8 tuần trăng theo chu kỳ, từ ngày Sóc.', steps: ['Kéo trăng non (tối hẳn) vào ô sáng', 'Trăng lớn dần: liềm → nửa → tròn', 'Qua Rằm, trăng khuyết dần phía ngược lại'] },
    en: { goal: 'Put the 8 moon phases in cycle order, starting from the new moon.', steps: ['Drag the new moon (dark) onto the glowing slot', 'It grows: crescent → half → full', 'After full, it shrinks on the other side'] },
  },
  task_woodblock_print: {
    vi: { goal: 'In chữ {glyph} lên giấy dó.', steps: ['Kéo ván khắc chữ NGƯỢC (soi gương) lên giấy', 'Chà chổi phủ kín mực', 'Ép giấy khi kim ở vùng xanh'] },
    en: { goal: 'Print {glyph} on dó paper.', steps: ['Drag the MIRRORED block onto the paper', 'Brush ink over all of it', 'Press when the needle is green'] },
  },
  task_ngo_mon_gates: {
    vi: { goal: 'Đưa mỗi người qua đúng cửa Ngọ Môn.', steps: ['Xem ai đứng đầu hàng', 'Kéo người đó vào cửa có nhãn phù hợp', 'Cửa giữa chỉ dành cho vua'] },
    en: { goal: 'Send everyone in the procession through the right gate.', steps: ['See who is first in line', 'Drag them to the gate with the matching label', 'Centre gate: emperor only'] },
  },
  task_court_ranks: {
    vi: { goal: 'Đưa 6 vị quan về đúng bia phẩm.', steps: ['Kéo một vị quan trong khay', 'Áo thêu chim = văn, thú = võ', 'Thả vào bia đúng phẩm của họ'] },
    en: { goal: 'Lead the 6 mandarins to their rank steles.', steps: ['Drag a mandarin from the tray', 'Bird = civil, animal = military', 'Drop on the stele of their rank'] },
  },
  task_nha_nhac: {
    vi: { goal: 'Gõ lại giai điệu dàn nhạc vừa dạo.', steps: ['Nghe dàn nhạc dạo một lượt', 'Bấm nhạc cụ đúng thứ tự', 'Sai thì nghe lại và thử tiếp'] },
    en: { goal: 'Play back the melody the ensemble just played.', steps: ['Listen once', 'Tap instruments in the same order', 'Wrong? Listen again and retry'] },
  },
  task_cuu_dinh: {
    vi: { goal: 'Tìm 3 hình đúc nổi ghi trên cuộn giấy.', steps: ['Giữ và chà để lau tro', 'Bấm hình vừa lộ ra', 'Chỉ chọn hình trong danh sách'] },
    en: { goal: 'Find the 3 relief images listed on the scroll.', steps: ['Hold and rub off the ash', 'Tap an uncovered image', 'Only pick listed images'] },
  },
  task_poem_wall: {
    vi: { goal: 'Lắp 4 ô trống: thơ, tranh xen kẽ cùng đề tài.', steps: ['Kéo một ô trong khay vào chỗ trống', 'Thơ đặt cạnh tranh cùng đề tài', 'Khay có 2 ô thừa'] },
    en: { goal: 'Fill the 4 gaps so poems and paintings alternate by theme.', steps: ['Drag a panel from the tray into a gap', 'Poem next to same-theme painting', 'Two panels are decoys'] },
  },
  task_royal_seal: {
    vi: { goal: 'Đóng ấn son vào khung đỏ trên lịch.', steps: ['Rê ấn vào khung đỏ', 'Giữ đến khi vòng đầy', 'Ấn rung — giữ trong khung'] },
    en: { goal: 'Stamp the red seal inside the frame on the calendar.', steps: ['Move the seal onto the red frame', 'Hold until the ring fills', 'It sways — keep it inside'] },
  },
  task_banh_beo: {
    vi: { goal: 'Làm đủ {cups} chén bánh bèo.', steps: ['Kéo nguyên liệu thả vào chén: bột → hấp', 'Rắc tôm chấy, tóp mỡ', 'Chan nước mắm là xong chén'] },
    en: { goal: 'Make {cups} cups of bánh bèo.', steps: ['Drag each step onto the cup: batter → steam', 'Add shrimp floss, pork fat', 'Fish sauce finishes a cup'] },
  },
};
