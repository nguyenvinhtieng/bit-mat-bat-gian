# Map: Cố đô Huế — *Năm Canh Trước Bình Minh* (Đêm Ban Sóc)

> Kế hoạch & lý do thiết kế: [`co-do-hue.v2-plan.md`](co-do-hue.v2-plan.md). File này là spec đang chạy.

## Cốt truyện

Kinh thành Huế, đêm cuối tháng Mười Một âm lịch. Rạng sáng mai, **Lễ Ban Sóc** — lễ ban lịch năm mới của triều Nguyễn — diễn ra trước **Ngọ Môn**. Đoàn nghệ nhân, thợ in, nhạc công và lính Ngự Lâm còn đúng **năm canh** để chuẩn bị. Trong đoàn có **Âm Binh** — bóng đêm muốn giữ kinh thành mãi ở đêm cuối năm (truyện hư cấu). Không có lịch, cả kinh thành sẽ lạc mất thời gian.

- **Thanh tiến độ = 5 canh trống.** Mỗi 20% tiến độ: server gửi `canh` → banner + tiếng trống (`HUE_CANH`). Canh năm = bình minh = Người Dân thắng.
- Bàn họp = **Án Ban Lịch**; họp khẩn = **đánh chuông Ngũ Phụng**.
- Kết thúc: `HUE_ENDINGS` (tasks / vote / killer).

## Khu vực (gán lên layout cố định)

| Layout id | Tên trong map | Prop |
|-----------|---------------|------|
| `courtyard_checkin` | Sân Ngọ Môn | Án Ban Lịch, chuông Ngũ Phụng, cờ lễ |
| `exhibition` | Điện Thái Hòa | hoành phi, bia phẩm sơn, đèn cung đình |
| `corridor` | Hành lang Trường Lang | chậu kiểng, mâm bánh bèo |
| `coordination` | Duyệt Thị Đường | trống Nhã nhạc, biên khánh |
| `editing` | Khâm Thiên Giám | bàn khắc mộc bản, hồn thiên nghi, bàn in lịch |
| `archive` | Nội Các | kệ châu bản, hộp ấn, tường thơ |
| `artifact_storage` | Sân Thế Miếu · Cửu Đỉnh | 2 đỉnh đồng |

## Nhiệm vụ — 9 mini-game

| Id | Khu | Mini-game | Server kiểm tra |
|----|-----|-----------|-----------------|
| `task_moon_phase` | Khâm Thiên Giám | Chạm 8 tuần trăng theo chu kỳ, bắt đầu từ Sóc (trăng non) | thứ tự id |
| `task_woodblock_print` | Khâm Thiên Giám | Chọn ván khắc chữ ngược → lăn mực ≥90% → ép giấy khi kim vào vùng xanh | id ván `mirror` |
| `task_ngo_mon_gates` | Sân Ngọ Môn | 8 người/vật lần lượt tới, chọn đúng 1 trong 5 cửa (4s/lượt, sai 3 lần làm lại) | luật cửa theo loại |
| `task_court_ranks` | Điện Thái Hòa | Đặt 6 quan lên bia phẩm sơn: bổ tử chim = văn (Đông), thú = võ (Tây), phẩm cao gần điện | slot → id |
| `task_nha_nhac` | Duyệt Thị Đường | Nghe chuỗi 5 nhạc cụ (trống, sênh tiền, đàn nguyệt, sáo) rồi gõ lại | chuỗi |
| `task_cuu_dinh` | Sân Thế Miếu | Chà bụi trên mặt đỉnh, tìm 3 hình đúc nổi được yêu cầu (25s) | id các ô |
| `task_poem_wall` | Nội Các | Lắp 4 ô thiếu trên tường "nhất thi nhất họa" (xen kẽ thơ/tranh, cùng đề tài), khay có 2 ô thừa | loại + đề tài từng ô |
| `task_royal_seal` | Nội Các | Ấn hơi rung; giữ ấn trong khung son đủ 1.2s | khoảng cách tới khung |
| `task_banh_beo` | Trường Lang | 3 chén: đổ bột → hấp → tôm chấy + tóp mỡ → nước mắm (25s) | số chén |

- Dữ liệu, đáp án, "Bạn có biết?": `apps/server/src/content/co-do-hue.content.ts` (`buildTask` / `verifyTask`, có `minMs` chống nộp tức thì).
- UI: `apps/web/src/ui/minigames/*` (âm thanh tổng hợp bằng WebAudio, không cần file audio).
- Kiểm thử: `pnpm smoke` (bot giải mọi nhiệm vụ được giao + kiểm tra đáp án sai bị từ chối).

## Art

- Props + icon trạm: atlas `maps/co-do-hue/atlas/hue-bansoc-0` · UI mini-game: `maps/co-do-hue/minigames/*.webp`.
- Sinh bằng `node tools/ui-art/draw-hue-bansoc.mjs` (vector SVG → PNG/WebP, nguồn ở `assets/_src/maps/co-do-hue/bansoc/`), tự cập nhật `manifests/co-do-hue.assets.json`.
- Nhân vật: áo dài + khăn đóng (`hue-player-*`).

## Cần kiểm chứng thêm (nội dung lịch sử)

Tên/công năng 5 cửa Ngọ Môn; quy ước văn ban phía Đông – võ ban phía Tây và hình bổ tử; năm đúc & số hình trên Cửu Đỉnh; tên lịch Hiệp Kỷ. Các năm UNESCO dùng trong game: Cố đô 1993, Nhã nhạc 2003, Mộc bản 2009, Châu bản 2014, Thơ văn kiến trúc 2016, Cửu Đỉnh 2024.
