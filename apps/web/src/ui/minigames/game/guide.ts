import type { GameTaskId } from '@hidden-truth/shared';

type G = { goal: string; steps: string[] };
/** Goal + how-to for each mini-game (vi / en). */
export const GUIDE: Partial<Record<GameTaskId, { vi: G; en: G }>> = {
  receive_package: {
    vi: { goal: 'Nhận đúng thùng hàng ở quán dì Bảy.', steps: ['Đọc các mã trên phiếu nhận', 'Tìm thùng có tem khớp đủ mã', 'Chạm thùng để nhận'] },
    en: { goal: 'Pick up the right box at Auntie Bảy’s.', steps: ['Read the codes on the slip', 'Find the box whose stickers match them all', 'Tap it to collect'] },
  },
  check_seal: {
    vi: { goal: 'Kiểm tra niêm phong mà không mở thùng.', steps: ['Mỗi mảnh niêm đang bị xoay lệch', 'Chạm mảnh để xoay ¼ vòng', 'Mọi mảnh thẳng đứng là xong'] },
    en: { goal: 'Check the seal without opening the box.', steps: ['Each seal piece is turned askew', 'Tap a piece to turn it a quarter', 'Done when every piece stands upright'] },
  },
  decode_address: {
    vi: { goal: 'Ghép tin nhắn của khách thành địa chỉ.', steps: ['Đọc tin nhắn của Khách — bỏ qua người nói chen', 'So từng dòng trên thẻ địa chỉ', 'Chọn thẻ khớp cả bốn dòng'] },
    en: { goal: 'Piece the customer’s messages into an address.', steps: ['Read the Customer’s messages — ignore anyone else', 'Compare every line on the cards', 'Pick the card that matches all four'] },
  },
  plan_route: {
    vi: { goal: 'Vạch tuyến qua các điểm hẹn, né chốt và đường ngập.', steps: ['Bắt đầu ở chấm xanh', 'Kéo hoặc chạm từng ô kề nhau, qua điểm theo đúng số', 'Né ô ngập và hẻm cụt, kết thúc ở cờ'] },
    en: { goal: 'Plot a route through the stops, around floods and checkpoints.', steps: ['Start at the green dot', 'Drag or tap neighbouring cells, hitting the stops in number order', 'Avoid floods and dead ends; finish at the flag'] },
  },
  prepare_bike: {
    vi: { goal: 'Bơm lốp vừa đủ rồi chằng dây hàng.', steps: ['Bấm Bơm tới khi kim vào vùng xanh', 'Lố thì Xả hơi rồi bơm lại', 'Siết dây theo số 1 → hết'] },
    en: { goal: 'Pump the tyre just right, then strap the load.', steps: ['Press Pump until the needle sits in the green', 'Overdid it? Let it out and start over', 'Tighten the straps 1 → last'] },
  },
  pack_disguise: {
    vi: { goal: 'Ngụy trang kiện hàng theo ghi chú của khách.', steps: ['Chọn đúng thùng ngoài', 'Dán đúng nhãn', 'Lót các lớp theo thứ tự dưới → trên, rồi Đóng thùng'] },
    en: { goal: 'Disguise the package as the customer’s note says.', steps: ['Pick the right outer box', 'Stick on the right label', 'Add the layers bottom → top, then Seal the box'] },
  },
  confirm_recipient: {
    vi: { goal: 'Gọi xác nhận đúng người nhận.', steps: ['Đọc tin nhắn: 4 số cuối và mật khẩu', 'Dò danh sách người gọi', 'Chọn người khớp cả hai — nhớ mã để bàn giao'] },
    en: { goal: 'Confirm the real recipient.', steps: ['Read the message: last 4 digits and passphrase', 'Check the list of callers', 'Pick the one matching both — remember the code for the handoff'] },
  },
  handoff_package: {
    vi: { goal: 'Bàn giao kiện hàng — Cuốc Cuối.', steps: ['Mang kiện hàng tới điểm giao', 'Nhập mã nhận đã xác nhận', 'Đúng mã là cả hội thắng'] },
    en: { goal: 'Hand off the package — the Last Ride.', steps: ['Carry the package to the drop point', 'Key in the verified receiving code', 'Right code and the crew wins'] },
  },
};
