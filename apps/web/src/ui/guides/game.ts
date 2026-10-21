import type { MapGuide } from './types';
import { l } from './types';

export const GAME_GUIDE: MapGuide = {
  storyH: l('Câu chuyện', 'Story'),
  story: {
    vi: [
      'Hẻm 42, Sài Gòn, 23:42. Hội tài xế CRAB nhận Cuốc Cuối: một kiện hàng phải bàn giao trước khi trời sáng.',
      'Cả hội chia nhau chuẩn bị — nhận hàng, kiểm niêm phong, giải địa chỉ, lên lộ trình, sửa xe, ngụy trang, xác nhận người nhận.',
      'Nhưng trong hội có một Cảnh Sát Chìm — cùng áo, cùng nón, chẳng ai phân biệt được.',
      'Chuẩn bị đủ 100%, mang kiện hàng tới điểm hẹn và bàn giao — hoặc lột mặt cảnh sát chìm trong buổi họp!',
    ],
    en: [
      'Alley 42, Saigon, 23:42. The CRAB crew takes the Last Ride: one package must be handed off before daybreak.',
      'The crew splits the prep — receive the box, check the seal, decode the address, plan the route, fix the bike, pack the disguise, confirm the recipient.',
      'But an Undercover Cop rides among them — same jacket, same helmet, impossible to tell apart.',
      'Reach 100% prep, carry the package to the meeting point and hand it off — or expose the cop in a meeting!',
    ],
  },
  roles: {
    driver: l(
      'Tài xế CRAB: làm nhiệm vụ chuẩn bị (mỗi lượt tính một lần, hỏng thì làm lại), mang kiện hàng đi bàn giao và bỏ phiếu khi họp.',
      'CRAB driver: do prep tasks (each turn counts once, retry on failure), carry the package to the handoff and vote in meetings.',
    ),
    veteran_driver: l(
      'Tài xế lão làng: như tài xế thường, thêm 1 lần mỗi ván soi 3 hoạt động gần nhất của một người (việc, khu vực, thời gian, kết quả) — không thấy vai hay việc thật/giả.',
      'Veteran driver: a regular driver who can, once per match, inspect a player\'s last 3 activities (task, area, time, result) — never their role or whether a task was fake.',
    ),
    undercover: l(
      'Cảnh Sát Chìm: giữ nút bắt 1,5 giây khi đứng sát một tài xế để còng tay họ (hồi 35 giây, không bắt khi họp). Làm nhiệm vụ giả để trà trộn — chúng không cộng tiến độ. Thắng khi bắt hết hội hoặc hết giờ.',
      'Undercover Cop: hold arrest for 1.5s next to a driver to cuff them (35s cooldown, never during meetings). Do fake tasks to blend in — they add no progress. Win by arresting everyone or running out the clock.',
    ),
  },
};
