import type { TaskId } from '@hidden-truth/shared';

type G = { goal: string; steps: string[] };
/** Goal + how-to for each mini-game (vi / en). `{glyph}` etc. are filled from the task data. */
export const GUIDE: Record<TaskId, { vi: G; en: G }> = {
  task_moon_phase: {
    vi: { goal: 'Xếp 8 tuần trăng theo đúng chu kỳ, bắt đầu từ ngày Sóc.', steps: ['Chọn trăng non (mặt trăng tối hẳn) trước', 'Trăng lớn dần: lưỡi liềm → bán nguyệt → tròn', 'Sau ngày Rằm, trăng khuyết dần ở phía ngược lại'] },
    en: { goal: 'Put the 8 moon phases in cycle order, starting from the new moon.', steps: ['Pick the new moon (completely dark) first', 'It waxes: crescent → half → full', 'After the full moon it wanes on the other side'] },
  },
  task_woodblock_print: {
    vi: { goal: 'In chữ {glyph} lên giấy dó.', steps: ['Chọn ván khắc chữ NGƯỢC (như soi gương)', 'Kéo chổi phủ mực kín mặt ván', 'Bấm “Ép giấy” khi kim nằm trong vùng xanh'] },
    en: { goal: 'Print {glyph} on dó paper.', steps: ['Pick the block carved in MIRROR image', 'Drag the brush to ink the whole block', 'Press when the needle is in the green zone'] },
  },
  task_ngo_mon_gates: {
    vi: { goal: 'Đưa từng người trong đoàn rước vào đúng cửa Ngọ Môn.', steps: ['Xem người đang đứng đầu hàng', 'Bấm vào cửa phù hợp (đọc nhãn dưới mỗi cửa)', 'Cửa giữa chỉ dành riêng cho nhà vua'] },
    en: { goal: 'Send everyone in the procession through the right gate.', steps: ['Look at who is first in line', 'Click the matching gate (read the labels)', 'The centre gate is for the emperor only'] },
  },
  task_court_ranks: {
    vi: { goal: 'Đưa 6 vị quan về đúng bia phẩm sơn.', steps: ['Chọn một vị quan ở khay bên dưới', 'Thêu chim trước ngực = quan văn, thêu thú = quan võ', 'Bấm vào bia đúng phẩm — nhất phẩm đứng gần điện nhất'] },
    en: { goal: 'Lead the 6 mandarins to their rank steles.', steps: ['Pick a mandarin from the tray', 'Bird badge = civil, animal badge = military', 'Click the right stele — 1st rank stands closest to the hall'] },
  },
  task_nha_nhac: {
    vi: { goal: 'Gõ lại đúng giai điệu dàn nhạc vừa dạo.', steps: ['Lắng nghe dàn nhạc dạo một lượt', 'Bấm các nhạc cụ theo đúng thứ tự đã nghe', 'Gõ sai thì dàn nhạc dạo lại — cứ thử tiếp'] },
    en: { goal: 'Play back the melody the ensemble just played.', steps: ['Listen to the ensemble once', 'Click the instruments in the same order', 'A wrong note replays the melody — just try again'] },
  },
  task_cuu_dinh: {
    vi: { goal: 'Tìm 3 hình đúc nổi ghi trên cuộn giấy.', steps: ['Nhấn giữ và chà để lau lớp tro', 'Hình nào lộ ra thì bấm vào để chọn', 'Chỉ chọn những hình có trong danh sách'] },
    en: { goal: 'Find the 3 relief images listed on the scroll.', steps: ['Hold and rub to wipe off the ash', 'Click an uncovered image to select it', 'Only pick images from the list'] },
  },
  task_poem_wall: {
    vi: { goal: 'Lắp 4 ô còn thiếu để thơ và tranh xen kẽ, cùng đề tài.', steps: ['Chọn một ô trong khay', 'Đặt ô thơ cạnh ô tranh cùng đề tài (và ngược lại)', 'Khay có 2 ô thừa — đừng để bị lừa'] },
    en: { goal: 'Fill the 4 gaps so poems and paintings alternate by theme.', steps: ['Pick a panel from the tray', 'A poem sits next to the painting of the same theme', 'Two panels in the tray are decoys'] },
  },
  task_royal_seal: {
    vi: { goal: 'Đóng ấn son vào đúng khung đỏ trên tờ lịch.', steps: ['Rê ấn vào khung đỏ nét đứt', 'Nhấn giữ đến khi vòng tròn đầy', 'Ấn hơi rung — giữ cho ấn nằm trong khung'] },
    en: { goal: 'Stamp the red seal inside the frame on the calendar.', steps: ['Move the seal onto the dashed red frame', 'Hold until the ring fills up', 'The seal sways a little — keep it inside'] },
  },
  task_banh_beo: {
    vi: { goal: 'Làm đủ {cups} chén bánh bèo.', steps: ['Đổ bột rồi đem hấp', 'Rắc tôm chấy và tóp mỡ', 'Chan nước mắm là xong một chén'] },
    en: { goal: 'Make {cups} cups of bánh bèo.', steps: ['Pour the batter, then steam it', 'Sprinkle shrimp floss and crispy pork fat', 'Add fish sauce to finish a cup'] },
  },
};
