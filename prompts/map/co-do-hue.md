# Map: Cố đô Huế — *Đêm Hội Hoàng Cung*

## Cốt truyện

Đêm nay Đại Nội Huế thắp hàng nghìn ngọn đèn lồng. Đoàn nghệ nhân, đầu bếp, nhạc công và hướng dẫn viên phải chuẩn bị xong trước khi đèn lên. Nhưng có kẻ lạ — **Hắc Ảnh** — trà trộn trong đoàn, muốn dập tắt từng ngọn đèn, từng con người. Người Dân hoàn thành công việc để thắp sáng Đêm Hội, đồng thời tìm ra Hắc Ảnh trước khi quá muộn.

## Khu vực (gán lên layout cố định)

| Layout id | Tên trong map |
|-----------|---------------|
| `courtyard_checkin` | Sân Ngọ Môn (bàn họp, nơi xuất phát) |
| `exhibition` | Điện Thái Hòa |
| `corridor` | Hành lang Trường Lang |
| `coordination` | Duyệt Thị Đường |
| `editing` | Xưởng Mộc Bản |
| `archive` | Tàng Thư Lâu |
| `artifact_storage` | Kho Cổ Vật |

## Nhiệm vụ (mini-game về Huế)

| Id | Trạm | Mini-game | Kiến thức |
|----|------|-----------|-----------|
| `task_hue_cuisine` | Xưởng Mộc Bản | Chọn tất cả món đặc sản Huế trong danh sách lẫn món vùng khác | Ẩm thực Huế |
| `task_woodblock` | Xưởng Mộc Bản | Giữ nút để in hết một trang mộc bản | Mộc bản triều Nguyễn (UNESCO) |
| `task_citadel_gates` | Duyệt Thị Đường | Xếp thứ tự đi từ ngoài vào trong Hoàng Thành | Kỳ Đài → Ngọ Môn → Điện Thái Hòa → Tử Cấm Thành |
| `task_lanterns` | Điện Thái Hòa | Thắp đèn lồng đúng thứ tự | Đèn lồng đêm hội |
| `task_conical_hat` | Kho Cổ Vật | Câu hỏi về nón bài thơ & ca dao Huế | Nón bài thơ, sông Hương, chùa Thiên Mụ |
| `task_heritage_quiz` | Tàng Thư Lâu | Đố vui di sản Cố đô | UNESCO 1993, Nhã nhạc, nhà Nguyễn… |

Câu hỏi và đáp án nằm ở `apps/server/src/content/co-do-hue.content.ts` (chỉ server giữ đáp án).

## Ghi chú art

Nhân vật người chơi mặc **áo dài + khăn đóng vàng** (`assets/maps/co-do-hue/characters/hue-player-*`, `pnpm assets:chars`); màu người chơi nhuộm lên áo dài.


Prop/icon hiện vẫn là bộ asset cũ (máy in, kệ sách…). Khi có thời gian nên đổi icon trạm cho khớp: bát bún bò, khuôn mộc bản, cổng Ngọ Môn, đèn lồng, nón bài thơ, bia di sản.
