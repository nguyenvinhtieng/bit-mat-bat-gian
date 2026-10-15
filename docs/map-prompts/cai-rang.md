# Prompt — Map "Chợ nổi Cái Răng · Phiên Chợ Trước Bình Minh"

> Copy toàn bộ phần dưới đây làm prompt khi bắt đầu triển khai map.

---

Triển khai map mới **`cai-rang`** cho game "Bịt Mắt Bắt Gian" (social deduction kiểu Among Us, chủ đề văn hoá Việt).

## Tham chiếu cấu trúc có sẵn
- Map mẫu đã hoàn chỉnh: `co-do-hue`. Đọc theo thứ tự rồi làm tương tự:
  - `packages/shared/src/maps/catalog.ts` — **chưa có entry**, cần thêm `cai-rang` (bắt đầu `available: false` để hiện thẻ "coming soon")
  - `packages/shared/src/maps/co-do-hue.ts` (story, prelude, thông báo theo canh, đồng hồ)
  - `apps/server/src/content/co-do-hue.content.ts` (TASK_FACTS, TASK_DONE, FUN_FACTS, buildTask/verify — đáp án chỉ ở server)
  - `apps/web/src/ui/minigames/*` (UI mini-game)
- **Chưa có atlas nhân vật**: cần trang phục áo bà ba + khăn rằn (qua `tools/char-art/draw-characters.mjs`, `charPrefix` gợi ý `cr`); ảnh home/thumb qua `tools/ui-art/draw-home.mjs`.
- Lên plan và chờ duyệt trước khi sửa code (task chạm >2 file). Nếu ước tính >10 file, đề xuất chia giai đoạn.

## Bối cảnh & cốt truyện
- Chợ nổi Cái Răng (Cần Thơ) họp từ khoảng 4–5 giờ sáng. Đoàn ghe phải sẵn sàng hàng hoá trước khi mặt trời lên.
- **Phe gian: "Ma Da"** — hồn ma dưới nước trong chuyện dân gian miền sông nước, muốn phiên chợ không thể họp.
- **Đồng hồ:** con nước — 5 mốc nước ròng dần tới bình minh. Nước càng ròng, một số kênh cạn dần và đóng lại → tăng áp lực đường đi.

## Phá hoại (sabotage) đặc trưng
1. **Lục bình trôi kín kênh** — chặn một tuyến; phải vớt lục bình để mở lại.
2. **Ghe mắc cạn** — cần 2 người cùng đẩy ghe ở 2 đầu.

## Nhiệm vụ (mini-game)
| id gợi ý | Nhiệm vụ | Cơ chế chơi | Nét văn hoá |
|---|---|---|---|
| `task_cay_beo` | Treo cây bẹo | Khách hỏi mua món gì → tìm đúng ghe treo món đó trên sào | "Rao hàng bằng mắt" của chợ nổi |
| `task_xep_ghe` | Xếp hàng lên ghe | Xếp sầu riêng, dưa hấu, măng cụt… cho ghe cân, không nghiêng/chìm | Ghe buôn trái cây |
| `task_hu_tieu` | Tráng hủ tiếu | Tráng bột → phơi → cắt sợi đúng trình tự & thời gian | Làng nghề hủ tiếu Cái Răng |
| `task_don_ca_tai_tu` | Đờn ca tài tử | Gõ song lang giữ nhịp cho người đờn | Đờn ca tài tử — UNESCO 2013 |
| `task_cau_khi` | Qua cầu khỉ | Đặt đoạn tre đúng chỗ rồi giữ thăng bằng đi qua | Cầu khỉ miền Tây |
| `task_tat_muong` | Tát mương bắt cá | Tát cạn mương rồi chụp cá lóc (kiểu đập chuột) | Thú vui dân dã mùa nước |
| `task_con_nuoc` | Chèo theo con nước | Chọn tuyến kênh còn đủ nước theo con nước lớn/ròng | Đời sống ven kênh rạch |
| `task_bep_ghe` | Bếp lò trên ghe | Canh lửa để nồi cơm và nồi canh chua chín cùng lúc | Gian bếp nổi của người buôn ghe |

Ưu tiên cơ chế **khác Huế** (Huế thiên về sắp thứ tự): cân bằng, nhịp, phản xạ, chọn đường.

## Nội dung kèm theo
- Mỗi task có `TASK_FACTS` (headline + 2–4 câu) và `TASK_DONE` (1 câu), giọng như map Huế.
- `FUN_FACTS`: chợ nổi Cái Răng là di sản văn hoá phi vật thể quốc gia, "cây bẹo" là gì, mùa nước nổi, đờn ca tài tử…
- **Kiểm chứng mọi mốc năm/UNESCO** với nguồn chính thức trước khi đưa vào.
- Song ngữ vi/en như catalog.

## Hoàn thành khi
- Map có trong catalog, chọn được ở Home (`available: true`), chơi trọn một ván với đủ task, sabotage, đồng hồ con nước.
- Đáp án không lộ ra client; typecheck/build pass; đã kiểm tra trên mobile.
