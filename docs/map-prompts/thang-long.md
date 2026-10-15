# Prompt — Map "Thăng Long – Hồ Gươm · Đêm Giao Thừa"

> Copy toàn bộ phần dưới đây làm prompt khi bắt đầu triển khai map.

---

Triển khai map mới **`thang-long`** cho game "Bịt Mắt Bắt Gian" (social deduction kiểu Among Us, chủ đề văn hoá Việt).

## Tham chiếu cấu trúc có sẵn
- Map mẫu đã hoàn chỉnh: `co-do-hue`. Đọc theo thứ tự rồi làm tương tự:
  - `packages/shared/src/maps/catalog.ts` (entry `thang-long` đang `available: false`, `charPrefix: 'tl'` — atlas nhân vật áo the + khăn xếp đã có ở `apps/web/public/assets/maps/thang-long/characters/`)
  - `packages/shared/src/maps/co-do-hue.ts` (story, prelude, thông báo theo canh, đồng hồ)
  - `apps/server/src/content/co-do-hue.content.ts` (TASK_FACTS, TASK_DONE, FUN_FACTS, buildTask/verify — đáp án chỉ ở server)
  - `apps/web/src/ui/minigames/*` (UI mini-game)
- Lên plan và chờ duyệt trước khi sửa code (task chạm >2 file). Nếu ước tính >10 file, đề xuất chia giai đoạn.

## Bối cảnh & cốt truyện
- Đêm 30 Tết bên Hồ Gươm. Phải dựng xong cây nêu và sửa soạn lễ cúng giao thừa ở **đền Ngọc Sơn** trước giờ Tý.
- **Phe gian: "Quỷ"** — lấy từ tích cây nêu: quỷ muốn chiếm lại đất trước khi năm mới sang.
- **Đồng hồ:** đếm ngược tới giao thừa (5 mốc), mốc cuối kết thúc bằng tiếng pháo. Hết giờ chưa xong → Quỷ thắng.
- **Đổi subtitle catalog** từ "Đêm Trăng Hồ Gươm" thành **"Đêm Giao Thừa Hồ Gươm"** (đêm 30 không có trăng); cập nhật hook vi/en cho khớp.
- Màn kết gợi ý: thắng → Rùa Vàng nổi lên giữa hồ; thua → gươm Thuận Thiên biến mất ("bí mật nghìn năm").

## Phá hoại (sabotage) đặc trưng
1. **Quỷ xoá vôi** — mất vòng vôi bảo vệ một khu; phải rắc lại vôi trước khi hết giờ.
2. **Pháo nổ** — loé sáng/ù tai, tạm che tầm nhìn toàn map vài giây.

## Nhiệm vụ (mini-game)
| id gợi ý | Nhiệm vụ | Cơ chế chơi | Nét văn hoá |
|---|---|---|---|
| `task_banh_chung` | Gói bánh chưng | Gấp lá dong vào khuôn, xếp lớp gạo–đỗ–thịt–đỗ–gạo, buộc 4 lạt | Tích Lang Liêu |
| `task_dong_ho` | In tranh Đông Hồ | Chọn thứ tự ván: các ván màu trước, ván nét đen sau cùng | Giấy điệp, màu tự nhiên (khác cơ chế khắc ngược của Huế) |
| `task_cho_chu` | Ông đồ cho chữ | Tô nét chữ Phúc/Lộc/Thọ/Tâm đúng thứ tự nét | Xin chữ đầu năm |
| `task_cay_neu` | Dựng nêu, rắc vôi | Vẽ vòng vôi hình cung tên, mũi tên hướng ra ngoài | Tích cây nêu xua quỷ |
| `task_cau_doi` | Ghép câu đối | Ghép vế trên – vế dưới đối nhau (vd. "Thịt mỡ dưa hành câu đối đỏ / Cây nêu tràng pháo bánh chưng xanh") | Câu đối Tết dân gian |
| `task_ngu_qua` | Mâm ngũ quả | Bày kiểu miền Bắc (nải chuối đỡ dưới); câu đố phụ phân biệt mâm miền Nam "cầu vừa đủ xài" | Khác biệt vùng miền |
| `task_ca_tru` | Hát ca trù | Gõ trống chầu "tom/chát" đúng chỗ theo phách | Ca trù — UNESCO 2009 |
| `task_roi_nuoc` | Múa rối nước | Điều khiển Chú Tễu bằng sào dưới nước theo đường ra sân khấu | Rối nước Thăng Long |

Ưu tiên cơ chế **khác Huế** (Huế thiên về sắp thứ tự): tô nét, giữ nhịp, điều khiển, ghép đối.

## Nội dung kèm theo
- Mỗi task có `TASK_FACTS` (headline + 2–4 câu) và `TASK_DONE` (1 câu), giọng như map Huế.
- `FUN_FACTS`: Thăng Long – Hà Nội nghìn năm văn hiến (1010), Hoàng thành Thăng Long UNESCO 2010, bia Tiến sĩ Văn Miếu, Tháp Bút "Tả thanh thiên", cầu Thê Húc, tích trả gươm…
- **Kiểm chứng mọi mốc năm/UNESCO** với nguồn chính thức trước khi đưa vào.
- Song ngữ vi/en như catalog.

## Hoàn thành khi
- Map chọn được ở Home (`available: true`), chơi trọn một ván với đủ task, sabotage, đồng hồ giao thừa.
- Đáp án không lộ ra client; typecheck/build pass; đã kiểm tra trên mobile.
