# Prompt — Map "Hụi Sài Gòn · Phiên Hụi Chui Hẻm 42"

> Copy toàn bộ phần dưới đây làm prompt khi bắt đầu triển khai map.

---

Triển khai map mới **`sai-gon`** cho game "Bịt Mắt Bắt Gian" (social deduction kiểu Among Us, chủ đề văn hoá Việt).

Map này **khác motif** các map trước: không ma quỷ, không tâm linh — **hài đời thường Sài Gòn**. Phe đông là một hội tài xế xe ôm công nghệ chơi hụi chui; phe ẩn là **công an chìm** giả làm tài xế mới.

## Tham chiếu cấu trúc có sẵn
- Map mẫu đã hoàn chỉnh: `co-do-hue`, `thang-long`. Đọc theo thứ tự rồi làm tương tự:
  - `packages/shared/src/maps/catalog.ts` — **chưa có entry**, thêm `sai-gon` (bắt đầu `available: false`), `charPrefix: 'sg'`
  - `packages/shared/src/maps/common/skin.ts` (kiểu `MapSkin`: roles, killerName, emergency, sabotage, labels, story)
  - `packages/shared/src/maps/thang-long/index.ts` + `props.ts` (map skin mẫu)
  - `packages/shared/src/constants.ts` (`AREA_IDS`, `ROLE_IDS`, `TASK_IDS`, `GAME`, `SABOTAGE`) — thêm task id mới vào `TASK_IDS`
  - `apps/server/src/content/` (TASK_FACTS, TASK_DONE, FUN_FACTS, buildTask/verify — đáp án chỉ ở server)
  - `apps/web/src/ui/minigames/*` (UI mini-game)
  - `tools/char-art/draw-characters.mjs`, `tools/ui-art/draw-home.mjs`, `prompts/assets.md`
- **Không có NPC** trên map. Mọi tương tác là trạm nhiệm vụ.
- Lên plan và chờ duyệt trước khi sửa code (task chạm >2 file). Map này chạm cả rig nhân vật → **bắt buộc chia giai đoạn** (xem cuối file).

## Catalog (song ngữ)
- `name`: **Hụi Sài Gòn** / *Saigon Hụi Club*
- `subtitle`: **Phiên Hụi Chui Hẻm 42** / *The Secret Savings Circle of Alley 42*
- `hook`:
  - vi: *"Cả hội tài xế áo xanh lén khui hụi giữa đêm ở Hẻm 42. Khổ nỗi trong hội có một đứa áo xanh… là công an chìm!"*
  - en: *"A crew of green-jacket ride drivers holds a secret savings-circle night in Alley 42. Trouble is, one of the green jackets… is an undercover cop!"*
- `players`: `4–10`

## Bối cảnh & cốt truyện (để người chơi hiểu không cần đọc)
- Cả nhóm là **tài xế xe ôm công nghệ app "CRAB"** (áo khoác xanh lá, logo con cua — nhại thương hiệu, **không dùng chữ/logo Grab thật**). Mỗi tháng họ lén khui **hụi chui** (hụi lãi cắt cổ, không khai báo) ở quán cà phê cóc đầu Hẻm 42.
- Tối nay có "tài xế mới" xin vào hụi — thật ra là **công an chìm**. Ai cũng áo xanh nón bảo hiểm nên chẳng ai phân biệt được.
- **Phe gian: "Công An Chìm"** (`killerName`). Hành động: **mời lên phường** (thay cho hạ gục). Không bạo lực, không vũ khí.
- Người chơi phải hiểu trong 10 giây đầu nhờ: prelude ngắn → thẻ vai 2 dòng → thanh "Quỹ hụi" → chữ "Mời lên phường!" khi có người bị bắt.

### Prelude (mỗi dòng 1 beat, không cần đọc kỹ)
1. "Hẻm 42, 11 giờ đêm. Xe CRAB đậu kín đầu hẻm."
2. "Tối nay khui hụi. Ai cũng mang tiền góp."
3. "Có một tài xế mới xin vào hụi…"
4. "…nghe đồn là công an chìm."

### Objective (thẻ vai riêng tư)
- crew: *"Chạy cuốc, góp đủ **quỹ hụi**. Trong hội có **công an chìm** — tìm ra trước khi bị mời lên phường!"*
- killer: *"Bạn là **công an chìm** giả làm tài xế mới. Mời từng người lên phường, đừng để bị lột nón."*

## 3 vai (map chỉ đổi tên/mô tả, luật giữ chung)
| `RoleId` | Tên map | Năng lực (luật chung) | Mô tả ngắn |
|---|---|---|---|
| `villager` | **Tài Xế Chơi Hụi** / *Hụi Driver* | Không | Chạy cuốc kiếm tiền, góp hụi, bỏ phiếu |
| `guardian` | **Tư Lách Hẻm** / *Alley Slipper Tư* | Lá chắn: thoát lần bị mời lên phường đầu tiên (cả hai cùng biết) | "Chạy xe ôm 30 năm, quẹo vô hẻm là mất dấu." |
| `killer` | **Công An Chìm** / *Undercover Cop* | Mời lên phường (= hạ gục, hồi chiêu chung), danh sách cuốc giả, biết đồng đội | "Tài xế mới, xe mới cáu, rating 5.0 — đáng nghi!" |

Số công an chìm theo luật chung: 1 (2–7 người), 2 (8–10 người).

## Đổi tên các khái niệm chung
| Chung | Sài Gòn |
|---|---|
| Hạ gục | **"Mời lên phường!"** (bóng chữ + tiếng còi "tò te" ngắn) |
| Hồn ma | "Ngồi phường viết tường trình — vẫn nhắn Zalo phụ hụi" (vẫn làm task) |
| Thi thể | **Xe CRAB dựng chân chống + nón bảo hiểm bỏ lại** — "Ủa xe ai đậu đây?" |
| Họp khẩn (`emergency`) | **Bóp còi xe** ở quán cà phê cóc |
| Nơi họp (`meetingPlace`) | Quán cà phê cóc đầu hẻm |
| Tiêu đề họp | **"Ai là công an chìm?"** |
| Loại đúng | "…là công an chìm! Lột nón rồi!" |
| Loại oan | "…là tài xế thiệt. Oan quá trời!" |
| Hoà phiếu | "Cả quán cãi nhau, không ai chịu trả tiền cà phê." |
| Thanh tiến độ | **💰 Quỹ hụi** (mỗi task xong nảy "+50 triệu!") |

## Kết ván (`endings`) — nhẹ nhàng, KHÔNG kích động, không chống đối
- `vote` (lột nón hết công an): **"Phát hiện công an chìm! Cả hụi ôm sổ chạy mất dép."** — hình chỉ còn mấy chiếc dép tổ ong giữa hẻm.
- `tasks` (đủ quỹ): **"Khui hụi xong! Ai về nhà nấy, coi như chưa có gì."**
- `killer` (công an đủ người): **"Cả hụi được mời lên phường uống trà."**
- `timeout`: **"Trời sáng, cả hẻm thức dậy — phiên hụi bị lộ!"** (công an thắng)
- `sabotage` (ward hết giờ): **"Phường ập tới — cả hụi được mời lên phường."**
- Tuyệt đối không có câu/hình chống người thi hành công vụ, xô xát, bỏ chạy kèm phá hoại. Chỉ "chạy mất dép" kiểu hài.

## Đồng hồ — KHÔNG làm nội dung theo mốc
- Map này **không có 5 mốc kể chuyện** như các map khác. Giữ timer đêm của engine (`nightMin`, `timeout`) vì là luật chung, nhưng:
  - HUD hiện **giờ đồng hồ thường** (23:00 → 04:00) thay cho tên canh; `segments` để nhãn giờ đơn giản.
  - `canh[]`: không viết thông báo cốt truyện. Nếu engine bắt buộc, dùng 5 "tin nhắn Zalo nhóm hụi" chung chung (vd. "Ai chưa góp hụi nhắn tui nha 😤") — hoặc thêm flag `quietClock` để tắt thông báo mốc.
  - (Tuỳ chọn) câu vui theo **% quỹ hụi** 25/50/75% thay cho mốc giờ — chỉ làm nếu thêm hook nhỏ trong engine.

## Phá hoại (map lại vào 2 kiểu engine: `blind`, `ward`)
| Kiểu | Tên | Alert | Ghi chú |
|---|---|---|---|
| `blind` | **Mưa Sài Gòn** / *Saigon Downpour* | "Mưa ụp xuống không báo trước — trắng xoá, chẳng thấy gì!" | Mưa rào + tiếng mưa trên mái tôn |
| `ward` | **Lộ địa điểm hụi** / *Location Leaked* | "Có người gửi định vị cho phường! Dẹp chiếu hụi ở {area} lẹ!" | `fix`: **"Dẹp chiếu hụi"**; hết `wardSec` → công an thắng |

## Khu vực (gán lên 7 `AREA_IDS` cố định)
| `areaId` | Khu Sài Gòn | Chức năng |
|---|---|---|
| `courtyard_checkin` | **Đầu hẻm — điểm đón khách** | Spawn; xe CRAB đậu hàng dài |
| `coordination` | **Quán cà phê cóc** | Bàn họp, ghế nhựa thấp, trạm khui hụi |
| `corridor` | **Hẻm chính (hẻm xương cá)** | Nối các khu; dây điện mạng nhện trên đầu |
| `exhibition` | **Dãy quán ăn** | Cơm tấm, xe bánh mì, xe hủ tiếu |
| `editing` | **Tiệm vá xe & cây xăng mini** | Thau nước vá ruột, bình xăng lẻ |
| `archive` | **Gác lửng nhà trọ** | Chỗ giấu sổ hụi, đếm tiền |
| `artifact_storage` | **Bãi giữ xe chung cư cũ** | Xe máy xếp chật, quần áo phơi ban công |

## Nhiệm vụ (mini-game, mỗi cái ≤ ~20 giây, không NPC)
| id gợi ý | Khu | Nhiệm vụ | Cơ chế chơi | Nét Sài Gòn |
|---|---|---|---|---|
| `task_chi_duong` | courtyard_checkin | Chạy cuốc theo khách chỉ đường | Nghe/đọc "quẹo trái… à không, phải… lố rồi!" → bấm hướng đúng qua mê cung hẻm | Hẻm trong hẻm |
| `task_com_tam` | exhibition | Giao cơm tấm | Nhớ order ("sườn bì chả, thêm mỡ hành, bỏ đồ chua") → gắp đúng | Cơm tấm |
| `task_tieng_rao` | corridor | Nghe rao canh chừng | Nghe tiếng rao → chọn đúng ám hiệu ("bánh mì" = an toàn, "ve chai" = có người lạ) | Tiếng rao đêm |
| `task_ca_phe_phin` | coordination | Pha cà phê sữa đá | Canh phin nhỏ giọt rồi rót sữa đặc đúng vạch | Cà phê phin, cà phê cóc |
| `task_do_xang` | editing | Đổ xăng tròn 50 | Giữ – thả đúng 50.000đ (timing) | Đời tài xế |
| `task_va_vo` | editing | Vá vỏ xe | Nhúng ruột vào thau nước, tìm chỗ sủi bọt → vá | Tiệm vá xe đầu hẻm |
| `task_so_hui` | archive | Ghi sổ hụi | Khớp tên tài xế với số tiền góp | Hụi / họ |
| `task_dem_tien` | archive | Đếm tiền bó thun | Đếm nhanh, gom đúng mệnh giá polymer vào từng xấp | Tiền Việt |
| `task_khui_hui` | coordination | Bỏ thăm khui hụi | Lật phong bì, chọn thăm cao nhất trong thời gian giới hạn (so sánh nhanh) | Hụi bỏ thăm |
| `task_xep_xe` | artifact_storage | Xếp xe bãi giữ xe | Kéo xe máy xếp sát kiểu xếp hình để dư chỗ | Bãi xe chung cư |

Ưu tiên cơ chế **khác các map trước** (Huế sắp thứ tự, Hội An timing, Cái Răng cân bằng): **nghe-hiểu, nhớ order, chọn nhanh, xếp hình**. Mọi chữ trong mini-game render bằng UI (không bake vào texture).

## Nội dung kèm theo
- Mỗi task có `TASK_FACTS` (headline + 2–4 câu) và `TASK_DONE` (1 câu), giọng **hài, ấm, đời thường** (khác giọng trang nghiêm của Huế).
- `FUN_FACTS` gợi ý: cơm tấm từ tấm gạo vỡ; hủ tiếu gõ gõ tre báo hiệu; cà phê vợt Chợ Lớn; bình trà đá miễn phí trước cửa nhà; hẻm Sài Gòn; nghề xe ôm; hụi/họ là góp vốn xoay vòng dân gian (có quy định riêng — Nghị định 19/2019/NĐ-CP về họ, hụi, biêu, phường).
- **Kiểm chứng mọi mốc năm/văn bản pháp luật** với nguồn chính thức trước khi đưa vào. Không cổ vũ hụi lãi nặng — fact về hụi nên nhắc chơi hụi đúng luật.
- Song ngữ vi/en như catalog.

---

## Asset — phải "Sài Gòn" thật nét

Tuân thủ `prompts/assets.md` (tile 48×48, WebP, kebab-case, prefix `sg-`, atlas ≤2048, không bake chữ gameplay). Palette: **xanh lá CRAB, đỏ ghế nhựa, vàng đèn đường sodium, xám bê tông, gạch bông**, đêm ấm.

### Sàn / tường (`maps/sai-gon/tileset/`, floor bake)
- Nhựa đường hẻm có **ổ gà**, **nắp cống**, vạch sơn mờ.
- Vỉa hè **gạch con sâu / gạch bông**, bậc tam cấp lấn vỉa hè.
- Tường nhà ống sơn màu (vàng, xanh ngọc, hồng), **cửa sắt kéo**, mái tôn, **số nhà biển xanh**.
- Sàn gạch bông quán cà phê; nền xi măng bãi xe.

### Prop đặc trưng (`maps/sai-gon/props/`, prefix `sg-prop-<area>-<name>`)
- **Cột điện dây điện mạng nhện** (prop cao, đè lên đầu nhân vật) — biểu tượng số 1.
- **Ghế nhựa đỏ/xanh lùn + bàn inox**, ly cà phê sữa đá, **bình trà đá miễn phí**.
- **Xe bánh mì** kính, **xe hủ tiếu gõ**, **xe nước mía**, xe đẩy bánh tráng trộn.
- **Xe máy đậu san sát** (có xe CRAB xanh), **nón bảo hiểm** treo gương, áo mưa cánh dơi.
- **Thau nước vá xe + lốp treo**, **chai xăng lẻ** trên kệ.
- **Bàn thờ Ông Địa – Thần Tài** trong tiệm, **chậu bông giấy** ban công, **lồng chim** treo, quần áo phơi.
- Bảng hiệu dùng **icon thay chữ** (ổ bánh mì, cái lốp, ly cà phê) — tránh chữ đọc được; nếu có chữ trang trí thì mờ/ngắn và không mang thông tin gameplay.
- Thi thể: `sg-body` = xe CRAB dựng chân chống + nón bảo hiểm trên yên.
- Không dùng logo/bao bì thương hiệu thật (bia, nước ngọt, app xe…).

### Âm thanh (tuỳ chọn, `sfx`)
- Còi xe "píp píp" (họp khẩn), còi "tò te" ngắn (mời lên phường), mưa trên mái tôn (blind), tiếng gõ hủ tiếu, tiếng rao xa, tiếng karaoke vọng lại rất nhỏ.

### UI / meta
- `home-bg`, `thumb`: hẻm đêm, dây điện, hàng xe CRAB, quán cóc ghế nhựa đỏ.
- Icon đồng hồ: đồng hồ treo tường quán cóc; marker thanh đêm: **xe CRAB nhỏ**.
- `ghostIcon`: tài xế ngồi ghế phường cầm tờ tường trình (hài, không u ám).
- Icon `blind`: đám mây mưa; icon `ward`: ghim định vị đỏ.

---

## Nhân vật — chibi, lớn hơn, mượt hơn (`charPrefix: 'sg'`)

### Trang phục
- **Áo khoác xanh lá CRAB** (màu cố định, không tint) — logo **con cua** + chữ "CRAB" trên lưng (nhại, không giống logo Grab thật).
- **Nón bảo hiểm = phần tint** theo màu người chơi (đây là cách phân biệt người chơi, vì áo ai cũng xanh). Có thể tint thêm khẩu trang.
- Quần jean/quần tây, **dép tổ ong / dép quai hậu + TẤT XANH LÁ** (điểm gây hài, cùng tông áo).
- Tuỳ chọn (giai đoạn sau): phụ kiện ngẫu nhiên không lộ vai — khẩu trang ninja, nón sừng, kính râm, balo, tóc lô.

### Tỉ lệ & khung hình (thay đổi so với rig hiện tại 48×64)
- **Chibi**: đầu ~45–50% chiều cao, mắt to, thân ngắn, outline mềm.
- **Lớn hơn**: đề xuất frame **64×88** (hoặc giữ tỉ lệ 3:4 tương đương), anchor chân giữa; hitbox/collision/killRange **giữ nguyên** theo world px — chỉ đổi kích thước hiển thị.
- **Mượt hơn**: **8 frame walk mỗi hướng** (hiện 4) × 4 hướng `down/left/right/up`; thêm **idle 4 frame** (thở, nhún vai, gãi nón) mỗi hướng.
- Action poses (thay 96×64 tương ứng tỉ lệ mới):
  - strike: **rút còng / giơ thẻ ngành** (công an mời lên phường)
  - die: **giơ hai tay đầu hàng, mặt méo** (bị mời) — không đau đớn, không máu
  - guard: **lách người quẹo hẻm** (Tư Lách Hẻm thoát)
- Xuất đúng cấu trúc: `sg-player-atlas`, `sg-player-tint-atlas`, `sg-player-action(-tint)`, preview 8x trong `_src`.
- Rig mới chỉ áp dụng cho `sai-gon` trước; engine đọc kích thước frame/số frame **từ atlas/meta map** (không hardcode 48×64 / 4 frame) để map cũ không vỡ.

---

## Chia giai đoạn đề xuất
1. **Content + skin**: catalog entry, `MapSkin` (roles, labels, endings, sabotage), 10 task id + content server, layout gán areaId. Dùng tạm avatar chung.
2. **Mini-game UI**: 10 mini-game (ưu tiên 6 cái trước: chỉ đường, cơm tấm, đổ xăng, cà phê, sổ hụi, xếp xe).
3. **Asset map**: floor bake, props, stations, cards, meta home/thumb, sfx.
4. **Rig nhân vật chibi**: frame lớn hơn, 8 frame walk + idle, action poses; engine đọc meta frame theo map; kiểm tra map cũ không đổi.
5. **Polish**: quietClock / câu theo % quỹ hụi, kiểm tra mobile, chơi trọn ván.

## Hoàn thành khi
- Map chọn được ở Home (`available: true`), chơi trọn một ván với đủ task, 2 sabotage, kết ván đúng câu ở trên.
- Người chơi mới (không đọc story) hiểu được mục tiêu từ thẻ vai + thanh quỹ hụi + "Mời lên phường!".
- Không còn chữ/logo Grab thật; không có nội dung bạo lực hay chống người thi hành công vụ.
- Nhân vật `sg` chibi, frame lớn hơn, walk 8 frame mượt; map cũ không bị ảnh hưởng.
- Đáp án không lộ ra client; typecheck/build pass; đã kiểm tra trên mobile.
