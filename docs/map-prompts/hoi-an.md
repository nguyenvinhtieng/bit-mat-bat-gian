# Prompt — Map "Phố cổ Hội An · Đêm Rằm Phố Hội"

> Copy toàn bộ phần dưới đây làm prompt khi bắt đầu triển khai map.

---

Triển khai map mới **`hoi-an`** cho game "Bịt Mắt Bắt Gian" (social deduction kiểu Among Us, chủ đề văn hoá Việt).

## Tham chiếu cấu trúc có sẵn
- Map mẫu đã hoàn chỉnh: `co-do-hue`. Đọc theo thứ tự rồi làm tương tự:
  - `packages/shared/src/maps/catalog.ts` (entry `hoi-an` đang `available: false`, `charPrefix: 'hoian'` — atlas nhân vật áo bà ba + nón lá đã có ở `apps/web/public/assets/maps/hoi-an/characters/`)
  - `packages/shared/src/maps/co-do-hue.ts` (story, prelude, thông báo theo canh, đồng hồ)
  - `apps/server/src/content/co-do-hue.content.ts` (TASK_FACTS, TASK_DONE, FUN_FACTS, buildTask/verify — đáp án chỉ ở server)
  - `apps/web/src/ui/minigames/*` (UI mini-game)
- Lên plan và chờ duyệt trước khi sửa code (task chạm >2 file). Nếu ước tính >10 file, đề xuất chia giai đoạn.

## Bối cảnh & cốt truyện
- Từ năm 1998, đêm 14 âm lịch hằng tháng phố cổ Hội An tắt đèn điện, chỉ thắp đèn lồng.
- Đêm nay đoàn phải thắp sáng phố cổ và **Chùa Cầu** trước khi trăng lên đỉnh trời.
- **Phe gian: "Ma Đèn"** — muốn phố cổ chìm trong bóng tối. Hook catalog: "ai đã tắt ngọn đèn ở Chùa Cầu?"
- **Đồng hồ:** trăng mọc dần qua bầu trời (5 mốc thay cho 5 canh), mốc cuối = trăng đỉnh đầu. Hết giờ chưa xong → Ma Đèn thắng.

## Phá hoại (sabotage) đặc trưng
1. **Gió sông Hoài** — thổi tắt đèn một khu phố (giảm tầm nhìn); cần 2 người thắp lại ở 2 điểm cùng lúc.
2. **Nước lên** — một con phố ngập (Hội An ngập lụt là chuyện thường), chặn lối tạm thời, phải đi vòng.

## Nhiệm vụ (mini-game)
| id gợi ý | Nhiệm vụ | Cơ chế chơi | Nét văn hoá |
|---|---|---|---|
| `task_lantern_make` | Làm đèn lồng | Uốn khung tre theo đơn (bí, tỏi, quả trám), căng lụa đúng màu | Nghề đèn lồng Hội An |
| `task_hoa_dang` | Thả hoa đăng | Timing: thả đèn đúng lúc để trôi lọt khe giữa hai ghe | Thả đèn cầu an trên sông Hoài |
| `task_bai_choi` | Hô bài chòi | Nghe câu thơ hô hát → chọn đúng con bài (Nhứt Trò, Nhì Bí…), đủ hàng thì "tới" | Bài chòi Trung Bộ — UNESCO 2017 |
| `task_chua_cau` | Chùa Cầu | Đặt tượng khỉ & chó về đúng đầu cầu, thắp hương | Lai Viễn Kiều, do thương nhân Nhật xây |
| `task_cao_lau` | Nấu cao lầu | Chọn nước giếng Bá Lễ + tro củi Cù Lao Chàm, loại nguyên liệu giả | Bí quyết sợi cao lầu |
| `task_gom_thanh_ha` | Nặn gốm | Giữ bàn xoay đều tay — nhanh/chậm quá thì méo bình | Làng gốm Thanh Hà |
| `task_mat_ghe` | Vẽ mắt ghe | Vẽ mắt thuyền đúng hình & hướng nhìn | Tín ngưỡng "mắt thuyền" |
| `task_ao_dai` | May áo dài | Khớp số đo khách với mảnh vải đã cắt | Phố may đo lấy ngay |

Ưu tiên cơ chế **khác Huế** (Huế thiên về sắp thứ tự): timing, giữ tốc độ, nghe-chọn.

## Nội dung kèm theo
- Mỗi task có `TASK_FACTS` (headline + 2–4 câu) và `TASK_DONE` (1 câu), giọng như map Huế.
- `FUN_FACTS`: phố cổ UNESCO 1999, đêm phố cổ từ 1998, Chùa Cầu trên tờ tiền 20.000đ, hội quán người Hoa…
- **Kiểm chứng mọi mốc năm/UNESCO** với nguồn chính thức trước khi đưa vào.
- Song ngữ vi/en như catalog.

## Hoàn thành khi
- Map chọn được ở Home (`available: true`), chơi trọn một ván với đủ task, sabotage, đồng hồ trăng.
- Đáp án không lộ ra client; typecheck/build pass; đã kiểm tra trên mobile.
