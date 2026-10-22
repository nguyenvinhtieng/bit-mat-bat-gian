import type { MapGuide } from './types';
import { l } from './types';

export const GAME_GUIDE: MapGuide = {
  storyH: l('Câu chuyện', 'Story'),
  story: {
    vi: [
      'Hẻm 42, 23:42. Sài Gòn vừa tạnh mưa, quán nước cuối hẻm còn sáng một bóng đèn. Một khách lạ đặt Hội CRAB một cuốc đặc biệt: chở kiện hàng 50 triệu — không mở thùng, không hỏi người gửi, giao trước khi trời sáng.',
      'Cả hội chia nhau chuẩn bị: nhận hàng ở kho, kiểm niêm phong, ngụy trang thùng, giải mã địa chỉ, xác minh người nhận, sửa xe và chọn đường né kẹt xe, ngập nước.',
      'Đang làm dở thì điện thoại cả hội cùng rung: “Trong hội có công an chìm.” Cùng áo xanh, cùng nón bảo hiểm, không ai phân biệt được. Rồi từng người lần lượt biến mất, chỉ còn chiếc xe CRAB bỏ lại trong hẻm.',
      'Chuẩn bị đủ 100% rồi mang kiện hàng tới Hẻm Cuối bàn giao — hoặc họp ở đầu hẻm, bỏ phiếu lật mặt kẻ trà trộn trước khi trời sáng.',
    ],
    en: [
      'Alley 42, 23:42. The rain over Saigon has just stopped; one bulb still burns at the drink stall at the end of the alley. A stranger books the CRAB crew for a special ride: a 50-million package — don’t open it, don’t ask who sent it, deliver before daybreak.',
      'The crew splits the prep: pick up the box at the warehouse, check the seal, disguise it, decode the address, verify the recipient, fix the bike and plan a route around jams and floods.',
      'Halfway through, every phone buzzes at once: “There’s an undercover cop in the crew.” Same green jacket, same helmet — no way to tell. Then, one by one, drivers vanish, leaving only an abandoned CRAB bike in the alley.',
      'Reach 100% prep and carry the package to the Back Alley for the handoff — or meet at the alley mouth and vote out the infiltrator before daybreak.',
    ],
  },
  roles: {
    driver: l(
      'Làm các trạm của mình, đủ 100% thì mang kiện hàng tới Hẻm Cuối bàn giao. Họp và bỏ phiếu tìm công an chìm.',
      'Finish your stations; at 100%, carry the package to the Back Alley. Meet and vote to find the cop.',
    ),
    veteran_driver: l(
      'Như tài xế thường, thêm 1 lần soi 3 hoạt động gần nhất của một người để bắt lỗi khai gian.',
      'Like a driver, plus one look at a player’s last 3 activities to catch a lie.',
    ),
    undercover: l(
      'Lại gần tài xế và bắt giữ (hồi 35 giây). Làm nhiệm vụ giả để trà trộn. Thắng khi bắt hết hoặc trời sáng.',
      'Get close and arrest a driver (35s cooldown). Fake tasks to blend in. Win by arresting all or reaching daybreak.',
    ),
  },
};
