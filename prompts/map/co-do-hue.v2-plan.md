# [PLAN v2 — ĐÃ TRIỂN KHAI] Cố đô Huế — *Năm Canh Trước Bình Minh* (Đêm Ban Sóc)

> Trạng thái: **đã triển khai** (spec đang chạy: `co-do-hue.md`).
> Giữ nguyên: layout 7 khu, 3 role, luật thắng/thua, cơ chế hạ gục/họp (theo `cot-truyen-role.md`).
> ⚠ = chi tiết lịch sử cần kiểm chứng lại trước khi đưa vào nội dung chính thức.

---

## 1. Vì sao đổi

Bản cũ ("Đêm Hội Hoàng Cung") chung chung — thay "Huế" bằng địa danh khác vẫn đúng. Nhiệm vụ phần lớn là chọn đáp án / quiz.
Bản mới bám vào **một nghi lễ chỉ có ở cung đình Huế** để mọi nhiệm vụ đều có lý do tồn tại trong câu chuyện, và mỗi nhiệm vụ là một **mini-game thao tác** (kéo, xoay, gõ nhịp, cào, canh thời điểm), không còn câu hỏi trắc nghiệm.

## 2. Hook văn hoá: Lễ Ban Sóc

- Dưới triều Nguyễn, vào **mồng 1 tháng Chạp**, triều đình tổ chức **Lễ Ban Sóc** tại **Ngọ Môn**: ban lịch năm mới cho bá quan và dân chúng. Lịch do **Khâm Thiên Giám** soạn, triều Nguyễn gọi là **lịch Hiệp Kỷ** ⚠.
- "Sóc" = ngày trăng non, mồng 1 âm lịch. Có lịch thì dân biết ngày gieo trồng, ngày lễ, ngày Tết.
- Nghi lễ đã được Trung tâm Bảo tồn Di tích Cố đô Huế **tái hiện** trong những năm gần đây (mở màn Festival Huế 2023, đầu năm 2026…) → ít người biết nhưng có thật, kiểm chứng được.
- Đêm xưa chia **5 canh**, trống canh điểm từng canh → dùng làm thanh tiến độ.

## 3. Cốt truyện

**Tựa:** *Năm Canh Trước Bình Minh* — Đêm Ban Sóc

**Intro (≈60 chữ, dùng cho Cinematic):**
> Kinh thành Huế, đêm cuối tháng Mười Một. Rạng sáng mai, Lễ Ban Sóc sẽ diễn ra trước Ngọ Môn — lịch năm mới phải được trao tận tay bá quan và muôn dân. Đoàn nghệ nhân, thợ in, nhạc công và lính Ngự Lâm còn đúng năm canh để chuẩn bị. Nhưng trong đoàn có **Hắc Ảnh** — kẻ muốn đêm nay không bao giờ kết thúc. Không có lịch, cả kinh thành sẽ lạc mất thời gian.

**Hắc Ảnh là ai (hư cấu, gắn nhãn "truyện trong game"):** một bóng đêm "ăn trộm bình minh" — muốn giữ kinh thành mãi ở đêm cuối năm. Không gắn với nhân vật/sự kiện lịch sử có thật nào.

**Thanh tiến độ = 5 canh trống:** mỗi 20% tiến độ → tiếng trống canh + một dòng tường thuật ngắn:

| Canh | Tường thuật |
|------|-------------|
| Canh 1 | "Khâm Thiên Giám đã định xong ngày Sóc." |
| Canh 2 | "Ván khắc lịch đã lên mực." |
| Canh 3 | "Nhã nhạc đã dượt xong bài nghênh giá." |
| Canh 4 | "Bá quan đã vào vị trí trên sân chầu." |
| Canh 5 | "Trống Ngọ Môn vang — trời hửng sáng." → Người Dân thắng |

**Kết thúc:**
- *Người Dân thắng bằng nhiệm vụ:* bình minh trên Lầu Ngũ Phụng, lịch Hiệp Kỷ được ban.
- *Người Dân thắng bằng bỏ phiếu:* "Bóng đêm tan. Bình minh đến đúng giờ."
- *Hắc Ảnh thắng:* "Trống canh năm không bao giờ điểm. Kinh thành chìm trong một đêm không có ngày mai."

**Đổi tên theo cốt truyện:**
- Bàn họp → **Án Ban Lịch** (trước Ngọ Môn).
- Họp khẩn → **Đánh chuông Ngũ Phụng**.
- Hồn ma → "hồn đèn" (vẫn làm nhiệm vụ như cũ).

## 4. Khu vực (gán lên layout cố định)

| Layout id | Tên mới | Vai trò trong truyện |
|-----------|---------|----------------------|
| `courtyard_checkin` | **Sân Ngọ Môn** | Án Ban Lịch, chuông Ngũ Phụng, điểm xuất phát |
| `exhibition` | **Điện Thái Hòa & Sân Đại Triều Nghi** | Sắp xếp bá quan cho buổi lễ |
| `corridor` | **Hành lang Trường Lang** | Đường nối, đèn lồng (chỗ dễ bị hạ gục) |
| `coordination` | **Duyệt Thị Đường** | Nhạc công dượt Nhã nhạc |
| `editing` | **Khâm Thiên Giám** | Xem trăng định ngày, khắc & in lịch |
| `archive` | **Nội Các** (Tàng Thư) | Đóng ấn, phục dựng tường thơ |
| `artifact_storage` | **Sân Thế Miếu — Cửu Đỉnh** | Lau bụi Cửu Đỉnh trước lễ |

> Bỏ "Xưởng Mộc Bản" & "Kho Cổ Vật" như khu riêng: mộc bản giờ là một bước của việc in lịch; "kho cổ vật" đổi thành Cửu Đỉnh — có thật, độc đáo hơn.

## 5. Nhiệm vụ — 9 mini-game

Nguyên tắc: ≤ ~20 giây · một thao tác chính · hiểu được không cần đọc nhiều chữ · luôn có "Bạn có biết?" · có lý do trong cốt truyện ("Hắc Ảnh đã làm rối…").

| # | Id (đề xuất) | Khu | Mini-game | Lý do trong truyện | Bạn có biết? |
|---|--------------|-----|-----------|--------------------|--------------|
| 1 | `task_moon_phase` | Khâm Thiên Giám | **Xếp tuần trăng:** kéo 6–8 hình mặt trăng vào vòng tròn theo đúng chu kỳ, rồi chạm vào trăng **Sóc** (trăng non) | Phải định đúng ngày Sóc để ghi lịch | "Sóc" là ngày trăng non (mồng 1), "Vọng" là trăng tròn (rằm) |
| 2 | `task_woodblock_print` | Khâm Thiên Giám | **In mộc bản lịch:** (a) chọn đúng ván khắc **chữ ngược** để in ra chữ thuận; (b) quét chổi mực phủ ≥90% ván; (c) ép giấy đúng lúc kim đồng hồ vào vùng xanh | Lịch phải in ra hàng nghìn bản trước sáng | Mộc bản khắc chữ ngược trên gỗ; Mộc bản triều Nguyễn là Di sản Tư liệu Thế giới (UNESCO 2009) |
| 3 | `task_ngo_mon_gates` | Sân Ngọ Môn | **Dẫn đúng cửa:** người/vật chạy dần tới, vuốt vào 1 trong 5 lối: giữa = Vua; Tả/Hữu Giáp Môn = quan văn/võ; Tả/Hữu Dịch Môn = lính, voi, ngựa. Sai 2 lần là làm lại | Diễn tập đoàn rước cho lễ sáng mai | Ngọ Môn có 5 lối đi, lối giữa dành riêng cho nhà vua ⚠ (đối chiếu tên các cửa) |
| 4 | `task_court_ranks` | Điện Thái Hòa | **Xếp bá quan:** kéo 6 vị quan vào các bia **phẩm sơn**: bổ tử hình chim → bên văn, hình thú → bên võ; phẩm cao đứng gần điện | Hắc Ảnh xáo trộn thứ tự đứng của bá quan | Trên sân Đại Triều Nghi có hàng bia đá phẩm sơn đánh dấu chỗ đứng theo phẩm hàm ⚠ (vị trí văn tả / võ hữu, hình bổ tử) |
| 5 | `task_nha_nhac` | Duyệt Thị Đường | **Dượt Nhã nhạc (nhịp):** nghe-nhìn chuỗi 4–6 nhạc cụ (trống, sênh tiền, đàn nguyệt, sáo…) sáng lên, rồi gõ lại đúng thứ tự và nhịp | Hắc Ảnh đã xé lẫn bản tổng phổ | Nhã nhạc cung đình Huế được UNESCO ghi danh (2003) |
| 6 | `task_cuu_dinh` | Sân Thế Miếu | **Lau Cửu Đỉnh:** cào lớp bụi trên mặt đỉnh (scratch-reveal) để tìm đủ 3 hình đúc nổi được yêu cầu trên cuộn giấy (sông, núi, voi, thuyền, chim…) trước khi hết giờ | Đỉnh phải sạch trước lễ | Cửu Đỉnh đúc thời Minh Mạng; hình đúc nổi trên đỉnh là Di sản Tư liệu Châu Á–TBD (2024) ⚠ (số lượng hình, năm đúc) |
| 7 | `task_poem_wall` | Nội Các | **Phục dựng tường "Nhất thi nhất họa":** lắp 4 ô còn thiếu sao cho ô thơ và ô tranh xen kẽ, và tranh khớp chủ đề với bài thơ bên cạnh (sen–sen, núi–núi) | Hắc Ảnh gỡ các ô ốp trên tường điện | Thơ văn trên kiến trúc cung đình Huế (UNESCO Châu Á–TBD, 2016); thường bố trí "một thơ một họa" |
| 8 | `task_royal_seal` | Nội Các | **Đóng ấn:** kéo ấn khớp đúng khung đỏ trên tờ lịch (thanh run tay nhẹ), nhấn giữ đủ lực → ấn hiện đều | Lịch chưa đóng ấn thì chưa được ban | Văn bản triều Nguyễn có bút phê son của vua gọi là Châu bản (UNESCO Châu Á–TBD, 2014) |
| 9 | `task_banh_beo` | Hành lang Trường Lang (gian dọn cỗ) | **Làm bánh bèo chén:** 6 chén chạy qua băng chuyền; chạm đúng thứ tự: đổ bột → tôm chấy → tóp mỡ/hành → chan nước mắm | Cỗ đãi bá quan sau lễ | Ẩm thực Huế nổi tiếng với các món bánh nhỏ trong chén/lá: bánh bèo, bánh nậm, bánh bột lọc |

**Nhiệm vụ dự phòng / mở rộng** (nếu cần thêm hoặc thay):
- `task_poem_hat` — **Soi nón bài thơ:** xoay nón trước đèn lồng cho tới khi hiện câu ca dao ẩn giữa hai lớp lá → kéo chữ còn thiếu vào chỗ trống. Hợp chủ đề "hidden truth".
- `task_thuy_xuan_incense` — **Xoè bó hương Thủy Xuân:** xếp bó hương theo màu thành hình bông hoa (làng hương Thủy Xuân, Huế).
- `task_hoa_giay` — **Gấp hoa giấy Thanh Tiên** (làng hoa giấy Huế, dùng trang trí bàn thờ Tết).

**Phân bổ:** 9 trạm / 7 khu → mỗi người nhận 3–4 nhiệm vụ, server đảm bảo ít nhất 2 khu khác nhau để buộc người chơi di chuyển (tăng cơ hội hạ gục & chứng kiến).

**Liên kết nhiệm vụ (tuỳ chọn, tăng chiều sâu):** `task_moon_phase` → mở khoá `task_woodblock_print` → mở khoá `task_royal_seal` (chuỗi "định ngày → in → đóng ấn"). Chỉ áp dụng nếu người chơi có cả ba; nếu không thì độc lập.

## 6. Hắc Ảnh — gắn theo map (giai đoạn 2, tuỳ chọn)

Hiện spec chung không có phá hoại. Nếu muốn map Huế đặc sắc hơn, đề xuất 1–2 phá hoại đơn giản, hồi chiêu dài:
- **Tắt đèn Trường Lang:** giảm tầm nhìn khu hành lang 20s; sửa bằng cách thắp lại 3 đèn lồng (mini-game chạm nhanh).
- **Đánh trống sai canh:** thanh tiến độ hiển thị nhiễu 15s.
→ Chỉ làm sau khi bản cơ bản ổn định; cần cập nhật `cot-truyen-role.md` nếu áp dụng cho mọi map.

## 7. Tác động kỹ thuật (để ước lượng, chưa code)

Loại `TaskData` mới cần thêm vào `protocol.ts` (hiện chỉ có pick/sequence/hold/quiz):

| Kiểu | Dùng cho | Server kiểm tra |
|------|----------|-----------------|
| `order` (kéo thả vào slot) | 1, 4, 7 | thứ tự/ánh xạ slot đúng |
| `swipe_sort` (luồng vật thể → làn) | 3, 9 | chuỗi lựa chọn đúng, sai ≤ 1 |
| `rhythm` (chuỗi + timing) | 5 | thứ tự đúng; timing chỉ kiểm phía client |
| `scratch_find` | 6 | id các hình đã chạm khớp danh sách |
| `multi_step` (chọn + tô + canh) | 2, 8 | kết quả từng bước; timing kiểm client |

- Đáp án vẫn chỉ nằm ở server (`co-do-hue.content.ts`); random hoá dữ liệu mỗi lần mở.
- Chống gian lận nhẹ: server từ chối nếu thời gian hoàn thành < ngưỡng tối thiểu.
- Cập nhật `HUE_AREAS`, `HUE_STATIONS`, `HUE_INTRO`, `HUE_STORY_TITLE`, i18n (vi/en).

## 8. Asset cần (theo `assets.md`)

- Icon/prop trạm (9): bảng tuần trăng, ván khắc + giấy dó, 5 cửa Ngọ Môn, bia phẩm sơn, bộ Nhã nhạc, đỉnh đồng, tường thơ-họa, ấn son, mâm bánh bèo.
- UI mini-game: mặt trăng các pha, ván khắc chữ ngược, quan văn/võ với bổ tử, nhạc cụ, mặt đỉnh có hình đúc + lớp bụi, ô thơ/ô tranh, con dấu, chén bánh bèo.
- Cinematic: trống canh (5 trạng thái), bình minh trên Lầu Ngũ Phụng, đêm không sáng (Hắc Ảnh thắng).
- Đổi prop cũ kiểu văn phòng (máy in, màn hình, bảng trắng) sang prop cung đình.

## 9. Việc cần kiểm chứng trước khi viết nội dung

1. Tên lịch triều Nguyễn (Hiệp Kỷ) và ngày tổ chức Ban Sóc.
2. Tên và công năng 5 lối đi Ngọ Môn.
3. Quy ước văn tả / võ hữu, hình bổ tử, số bia phẩm sơn.
4. Cửu Đỉnh: năm đúc, số hình đúc, tên các hình dùng trong game.
5. Năm UNESCO ghi danh: Mộc bản (2009), Nhã nhạc (2003), Châu bản (2014), Thơ văn kiến trúc (2016), Cửu Đỉnh (2024).

## 10. Phương án khác đã cân nhắc (không chọn)

- **Ca Huế trên sông Hương** (đoàn thuyền ca Huế, hò mái đẩy, thả hoa đăng) — rất đặc sắc nhưng không khớp layout nội điện hiện tại; để dành cho map phụ.
- **Đội trùng tu Lăng Khải Định** (khảm sành sứ, thời hiện đại) — hay về nghề thủ công nhưng chỉ xoay quanh một lăng, ít đa dạng mini-game hơn.
