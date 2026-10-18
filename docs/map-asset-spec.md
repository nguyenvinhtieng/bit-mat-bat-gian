# Map asset spec — danh sách asset cho 1 map

Lấy map **Sài Gòn** (`apps/web/public/assets/maps/sai-gon/`, manifest `manifests/sai-gon.assets.json`) làm mẫu.
Map mới thay prefix `sg-` bằng prefix của map (vd `hue-`, `ha-`) và đổi nội dung theo chủ đề.

## Tổng số

| Nhóm | Số ảnh cần vẽ | File xuất ra |
|---|---|---|
| A. Meta (menu, chọn map) | 4 | 4 webp |
| B. Sàn nền baked | 1 | 1 webp |
| C. Prop / decor | 46 sprite | gộp thành 1 atlas `webp + json` |
| D. Station (điểm làm nhiệm vụ) | 10 + 1 marker | gộp thành 1 atlas `webp + json` |
| E. Card nhiệm vụ | 10 | 10 webp |
| F. Icon minigame | 5 (tuỳ minigame) | 5 webp |
| G. UI riêng của map | 2 | 2 webp |
| H. Nhân vật | 48 frame đi/đứng + 12 frame hành động, mỗi bộ có thêm bản mask tint | 4 sheet `webp + json` |
| I. Âm thanh | 3 | 3 wav |
| **Tổng** | **~79 ảnh tĩnh + 60 frame nhân vật (+60 mask) + 3 sfx** | |

Asset dùng chung không cần vẽ lại cho mỗi map: `common/ui/*` (chuông họp, clue, timer, notebook, nền phòng họp, con dấu vote, FX kill/shield/report/witness), `common/ui/roles/*` (icon vai trò).

## Quy tắc chung (áp cho mọi ảnh)

- **Định dạng cuối:** WebP (lossy ~q85 cho ảnh nền/card; lossless hoặc q90+ cho sprite có viền mảnh). Khi generate bằng AI, xuất **PNG** rồi convert sang WebP.
- **Nền trong suốt (alpha)** cho mọi sprite/prop/station/icon/nhân vật. Chỉ ảnh nền (home-bg, thumb, preview, card, floor-bake) là ảnh đặc.
- **Góc nhìn:** top-down 3/4 (nhìn chéo từ trên xuống, thấy mặt trước + nóc), giống Among Us / Stardew. Prop đứng **chân chạm đáy ảnh**, căn giữa ngang (anchor `0.5, 1`).
- **Tile size:** 48 px. Footprint va chạm của prop là 48×48 ở chân.
- **Phong cách:** vector/cartoon sạch, viền tối nhẹ, đổ bóng mềm, màu bão hoà vừa; không chữ Latin lớn trên sprite (ngoại trừ biển hiệu).
- **Kích thước:** generate ở **2×–4×** kích thước dưới đây rồi downscale cho sắc nét. Kích thước ghi trong bảng là **kích thước cuối cùng** (px).
- **Ánh sáng:** đêm, đèn vàng sodium (map Sài Gòn); map khác chọn 1 tông thống nhất và giữ cho toàn bộ asset.

---

## A. Meta (`meta/`)

| # | File | Kích thước | Alpha | Mô tả hình ảnh |
|---|---|---|---|---|
| A1 | `home-bg.webp` | 1920×1080 | không | Ảnh nền màn hình chính khi chọn map. Toàn cảnh hẻm Sài Gòn về đêm: nhà ống nhiều tầng, dây điện chằng chịt, bảng hiệu neon, xe máy, quán cóc ghế nhựa đỏ, mưa nhẹ, bokeh đèn. Chừa vùng giữa-trái tương đối tối/trống để đặt chữ & nút. |
| A2 | `thumb.webp` | 640×360 | không | Thumbnail 16:9 cho thẻ map trong danh sách. Bản crop/thu gọn của home-bg, chủ thể rõ ở giữa, đọc được khi nhỏ. |
| A3 | `sg-map-preview.webp` | 1008×768 | không | Bản đồ thu nhỏ nhìn từ trên xuống của toàn bộ layout (minimap/preview khi chọn map). Có thể downscale từ floor-bake + prop. |
| A4 | `sg-map-icon.webp` | 128×128 | có | Icon vuông đại diện map: 1 vật biểu tượng (vd ly cà phê phin / xe máy Crab) trên huy hiệu tròn. Đọc rõ ở 32 px. |

## B. Sàn nền baked (`tileset/`)

| # | File | Kích thước | Alpha | Mô tả |
|---|---|---|---|---|
| B1 | `sg-floor-bake.webp` | 2016×1536 (= 42×32 tile × 48) | không | Toàn bộ mặt bằng map nhìn top-down, **vẽ khớp đúng layout chung** (7 khu: `courtyard_checkin`, `exhibition`, `corridor`, `coordination`, `editing`, `archive`, `artifact_storage`, nối bằng hành lang). Gồm: sàn từng phòng (nhựa đường có vạch kẻ & nắp cống, gạch bông hoa văn, gạch lát đỏ, bê tông có vạch đỗ xe), tường 3/4 dày ~1 tile phía trên mỗi phòng (cửa cuốn, tủ kính, tôn xanh), viền tường xám, ngoài map là biển mái tôn nhiều màu tối. Ánh đèn vàng loang. **Không** vẽ prop đứng lên trên (prop là sprite riêng). ⚠️ AI khó vẽ đúng tỉ lệ: nên đưa ảnh layout hiện tại (file Sài Gòn) làm reference/img2img. |

## C. Prop & decor → atlas `atlas/sg-decor-0.webp` + `.json`

Mỗi dòng là 1 ảnh PNG trong suốt riêng; sau đó pack thành 1 atlas (TexturePacker / `free-tex-packer`, format JSON Hash, padding 2 px). `prop-*` có hitbox chặn đường; `decor-*` chỉ trang trí.

| # | Key | Kích thước | Mô tả hình ảnh |
|---|---|---|---|
| C1 | `sg-prop-corridor-cot-dien` | 96×288 | Cột điện bê tông cao, xà ngang, cuộn dây điện rối, tờ rơi dán quanh thân, đèn đường vàng trên đỉnh. |
| C2 | `sg-prop-courtyard-cot-dien` | 96×288 | Như C1, biến thể có hộp công tơ xám. |
| C3 | `sg-prop-editing-cot-dien` | 96×272 | Như C1, biến thể thấp hơn, thêm hộp điện. |
| C4 | `sg-decor-cot-dien` | 80×248 | Cột điện nhỏ, dây rối, không đèn. |
| C5 | `sg-decor-nha-ong` | 192×232 | Mặt tiền nhà ống 3 tầng hồng nhạt, ban công song sắt, chậu hoa giấy, quần áo phơi, cửa cuốn tầng trệt. |
| C6 | `sg-decor-cot-chung-cu` | 56×200 | Cột bê tông chung cư cũ, dán tờ rơi quảng cáo vàng/xanh. |
| C7 | `sg-decor-du-che` | 136×160 | Dù che quán cóc sọc xanh-trắng trên chân inox. |
| C8 | `sg-prop-archive-tu-so` | 104×152 | Tủ gỗ nâu đựng sổ sách nhiều màu, radio cũ + bình thủy đỏ trên nóc. |
| C9 | `sg-prop-exhibition-xe-com-tam` | 160×144 | Xe đẩy cơm tấm: tủ kính, sườn nướng trên vỉ, thân đỏ, 4 bánh. |
| C10 | `sg-prop-exhibition-xe-hu-tieu` | 128×144 | Xe hủ tiếu gỗ: nồi nước lèo bốc khói, chén tô, đũa, thân xanh dương. |
| C11 | `sg-prop-exhibition-xe-banh-mi` | 128×136 | Xe bánh mì tủ kính vàng, ổ bánh mì xếp hàng. |
| C12 | `sg-prop-exhibition-xe-nuoc-mia` | 128×136 | Xe nước mía: bó mía xanh, máy ép inox, thân xanh lá. |
| C13 | `sg-decor-chau-bong-giay` | 72×120 | Chậu sành nâu trồng hoa giấy hồng tím. |
| C14 | `sg-decor-long-chim` | 48×120 | Lồng chim phủ vải nâu treo trên cây sắt. |
| C15 | `sg-prop-coordination-quay-ca-phe` | 160×120 | Quầy cà phê ốp gạch men xanh, phin nhôm xếp hàng, bình đá. |
| C16 | `sg-prop-editing-ke-xang` | 96×120 | Kệ sắt bán xăng lẻ: chai thủy tinh xăng vàng cam xếp 2 tầng, phễu trên nóc. |
| C17 | `sg-prop-storage-ao-mua` | 96×120 | Giá treo áo mưa cánh dơi xanh & vàng. |
| C18 | `sg-prop-storage-day-phoi` | 176×120 | Dây phơi giữa 2 cọc, áo thun & quần nhiều màu. |
| C19 | `sg-prop-courtyard-xe-crab-hang` | 208×112 | Hàng 3 xe tay ga xanh lá có nón bảo hiểm, đậu chéo. |
| C20 | `sg-prop-storage-xe-may-xep` | 176×112 | Cụm xe máy đậu chen nhau (đỏ, xanh, xám). |
| C21 | `sg-decor-lop-treo` | 64×104 | Chồng 3 lốp xe đen treo/dựng đứng. |
| C22 | `sg-decor-xe-banh-trang` | 104×104 | Xe đẩy nhỏ bánh tráng trộn: hũ gia vị, thân cam. |
| C23 | `sg-body` | 120×96 | Xác nhân vật ngã gục bên xe (dùng khi bị loại). Nhân vật nằm sấp, nón văng. |
| C24 | `sg-body-tint` | 120×96 | **Mask** của C23: chỉ vùng áo/nón cần đổi màu theo người chơi, vẽ trắng/xám trên nền trong suốt, cùng vị trí pixel với C23. |
| C25 | `sg-decor-xe-crab` | 120×96 | 1 xe tay ga xanh lá có nón bảo hiểm trên yên. |
| C26 | `sg-prop-archive-ban-dem-tien` | 136×96 | Bàn gỗ thấp: máy đếm tiền, xấp tiền, sổ sách. |
| C27 | `sg-prop-coordination-binh-tra-da` | 64×96 | Bình trà đá nhựa cam-xanh lớn trên ghế, ly nhựa. |
| C28 | `sg-prop-exhibition-bang-hieu` | 208×96 | Bảng hiệu quán viền đỏ nền vàng, 3 hình tròn (tô hủ tiếu, dĩa cơm, ly nước). |
| C29 | `sg-prop-storage-xe-may` | 128×96 | 1 xe tay ga trắng, nón bảo hiểm vàng trên yên. |
| C30 | `sg-decor-ban-tho-ong-dia` | 72×88 | Bàn thờ Ông Địa – Thần Tài đỏ dưới đất, tượng, trái cây, nhang. |
| C31 | `sg-decor-quat-may` | 48×88 | Quạt đứng lồng xanh nhạt. |
| C32 | `sg-prop-coordination-ban-ghe-nhua` | 120×88 | Bàn nhựa xanh + 3 ghế đẩu nhựa đỏ, 2 ly cà phê. |
| C33 | `sg-prop-courtyard-ban-inox` | 128×88 | Bàn inox dài, ly, điện thoại, giấy tờ. |
| C34 | `sg-prop-editing-thau-va-xe` | 128×88 | Thau nước xanh + hộp đồ nghề đỏ + bơm tay (tiệm vá xe). |
| C35 | `sg-decor-dong-rac` | 120×84 | Đống rác: bao nylon đen buộc, giấy vụn. |
| C36 | `sg-prop-archive-nem` | 136×72 | Tấm nệm/chiếu hồng trải đất, sổ hụi, điện thoại, tiền. |
| C37 | `sg-decor-ban-inox` | 80×64 | Bàn inox nhỏ, 1 ly. |
| C38 | `sg-decor-binh-tra-da` | 48×64 | Bình trà đá nhựa đỏ nắp trắng. |
| C39 | `sg-decor-can-nuoc` | 48×64 | Can nhựa xanh dương đựng nước. |
| C40 | `sg-decor-thung-da` | 64×64 | Thùng đá xốp trắng, chai nước bên trong. |
| C41 | `sg-decor-thung-giay` | 64×64 | Chồng thùng carton nâu dán băng keo. |
| C42 | `sg-decor-binh-xang` | 40×56 | Can xăng nhựa đỏ, vòi vàng. |
| C43 | `sg-decor-ghe-nhua-do` | 40×48 | Ghế đẩu nhựa đỏ. |
| C44 | `sg-decor-ghe-nhua-xanh` | 40×48 | Ghế đẩu nhựa xanh dương. |
| C45 | `sg-decor-non-bao-hiem` | 56×48 | Nón bảo hiểm xanh lá đặt dưới đất. |
| C46 | `sg-decor-o-ga` | 96×40 | Ổ gà trên mặt đường: lõm tối, đọng nước, viền nhựa đường nứt (decal phẳng, gần như không có chiều cao). |

## D. Station → atlas `atlas/sg-stations-0.webp` + `.json`

Mỗi station: **128×128**, nền trong suốt, hiển thị ở 52×52 trên map nên phải đọc rõ khi nhỏ — 1 vật thể đậm nét, có viền sáng/glow nhẹ để người chơi nhận ra là điểm tương tác.

| # | Key | Nhiệm vụ | Mô tả hình ảnh |
|---|---|---|---|
| D1 | `sg-station-chi-duong` | Chỉ đường hẻm xương cá | Điện thoại hiện bản đồ hẻm + ghim định vị đỏ. |
| D2 | `sg-station-com-tam` | Làm dĩa cơm tấm | Dĩa cơm tấm: sườn, bì, chả, trứng ốp la, đồ chua. |
| D3 | `sg-station-tieng-rao` | Canh chừng tiếng rao | Cái loa cầm tay / loa phát rao. |
| D4 | `sg-station-ca-phe-phin` | Pha cà phê phin | Ly cà phê sữa đá với phin nhôm. |
| D5 | `sg-station-do-xang` | Đổ xăng đúng 50k | Cây/chai xăng lẻ với đồng hồ số. |
| D6 | `sg-station-va-vo` | Vá ruột xe | Ruột xe trong thau nước, bọt khí. |
| D7 | `sg-station-so-hui` | Ghi sổ hụi | Cuốn sổ hụi mở + cây bút. |
| D8 | `sg-station-dem-tien` | Đếm tiền | Xấp tiền polymer bó thun. |
| D9 | `sg-station-khui-hui` | Khui hụi (mở thăm) | Phong bì thăm hụi đỏ xếp quạt. |
| D10 | `sg-station-xep-xe` | Xếp xe bãi giữ xe | Thẻ giữ xe + xe máy nhỏ. |
| D11 | `task-marker` | — | **64×64**: dấu chỉ nhiệm vụ nổi trên đầu station (mũi tên / chấm than vàng có glow). |

## E. Card nhiệm vụ (`cards/`)

10 file, mỗi file **640×400**, không alpha, WebP. Ảnh minh hoạ hiện khi làm/hoàn thành nhiệm vụ: 1 chủ thể lớn ở giữa, nền là cảnh hẻm đêm **mờ (blur)** + bokeh + mưa nhẹ, tông ấm.

| # | File | Chủ thể |
|---|---|---|
| E1 | `sg-card-task_chi_duong.webp` | Tài xế xe ôm nhìn điện thoại giữa ngã ba hẻm, biển số nhà “42/7/3”. |
| E2 | `sg-card-task_com_tam.webp` | Dĩa cơm tấm đầy đủ, mỡ hành, chén nước mắm. |
| E3 | `sg-card-task_tieng_rao.webp` | Xe bánh mì đi ngang đầu hẻm, loa rao. |
| E4 | `sg-card-task_ca_phe_phin.webp` | Ly cà phê phin nhỏ giọt trên bàn nhựa. |
| E5 | `sg-card-task_do_xang.webp` | Chai xăng lẻ rót vào bình xe máy. |
| E6 | `sg-card-task_va_vo.webp` | Ruột xe trong thau nước sủi bọt, đồ nghề vá. |
| E7 | `sg-card-task_so_hui.webp` | Sổ hụi viết tay, tên & số tiền, bàn tay cầm bút. |
| E8 | `sg-card-task_dem_tien.webp` | Xấp tiền bó thun trên bàn, máy đếm tiền. |
| E9 | `sg-card-task_khui_hui.webp` | Bàn nhựa xanh dưới dù sọc, ghế đỏ, 2 ly cà phê (hiện tại); hoặc phong bì thăm hụi được mở. |
| E10 | `sg-card-task_xep_xe.webp` | Bãi giữ xe chật kín xe máy xếp ngay hàng. |

## F. Icon minigame (`minigames/`)

Mỗi icon **64×64**, nền trong suốt, nét đơn giản kiểu icon UI.

| # | File | Mô tả |
|---|---|---|
| F1 | `sg-ui-dong-ho.webp` | Đồng hồ bấm giờ / đồng hồ treo tường. |
| F2 | `sg-ui-ghim-dinh-vi.webp` | Ghim định vị bản đồ màu đỏ. |
| F3 | `sg-ui-may-mua.webp` | Đám mây mưa. |
| F4 | `sg-ui-tuong-trinh.webp` | Tờ giấy tường trình / biên bản. |
| F5 | `sg-ui-xe-crab.webp` | Xe máy xanh lá nhìn ngang (icon xe công nghệ). |

## G. UI riêng của map (`ui/`)

| # | File | Kích thước | Mô tả |
|---|---|---|---|
| G1 | `sg-btn-kill.webp` | 256×256, alpha | Nút hành động “loại” của kẻ phá hoại, theo chủ đề map (vd tay cầm mỏ lết / con dao trong vòng tròn đỏ). Phải nổi bật trên mọi nền. |
| G2 | `sg-fx-cuffs.webp` | 256×256, alpha | Hiệu ứng còng tay (khi bị bắt / bị loại khỏi vòng), nét trắng-bạc. |

## H. Nhân vật (`characters/`)

Khung sprite: mỗi frame **80×88**, nền trong suốt, chân nhân vật chạm đáy frame, căn giữa. Nhân vật = người lái xe tay ga (Sài Gòn: tài xế xe ôm công nghệ áo xanh lá, nón bảo hiểm trắng, xe trắng).

| # | File | Sheet | Nội dung |
|---|---|---|---|
| H1 | `sg-player-atlas.webp/.json` | 640×704 (8 cột × 11 hàng, dùng 48 ô) | **walk** 4 hướng (down, left, right, up) × 8 frame + **idle** 4 hướng × 4 frame. Hướng `up` nhìn từ sau lưng. |
| H2 | `sg-player-tint-atlas.webp/.json` | 640×704 | **Mask** cùng vị trí từng pixel với H1: chỉ vẽ vùng đổi màu theo người chơi (nón bảo hiểm), màu trắng/xám sáng trên nền trong suốt. Game nhân màu vào. |
| H3 | `sg-player-action.webp/.json` | 528×264 (4 cột × 3 hàng), frame 132×88 | **strike** ×4 (đánh), **die** ×4 (ngã), **guard** ×4 (đỡ đòn/khiên). |
| H4 | `sg-player-action-tint.webp/.json` | 528×264 | Mask tint của H3 (giống quy tắc H2). |

Tên frame trong JSON: `walk-down-0..7`, `walk-left-0..7`, `walk-right-0..7`, `walk-up-0..7`, `idle-<dir>-0..3`, `strike-0..3`, `die-0..3`, `guard-0..3`.

⚠️ AI ảnh rất khó giữ nhân vật nhất quán qua 60 frame. Cách thực tế: generate 1 nhân vật 4 hướng (character turnaround sheet), sau đó dùng công cụ sprite (Aseprite, PixelLab, Spine/rig 2D) để làm animation, rồi tự tách mask tint bằng cách xoá mọi thứ trừ vùng nón.

## I. Âm thanh (`sfx/`) — không phải ảnh

WAV mono, 22 050 Hz, 16-bit PCM.

| # | File | Thời lượng | Mô tả |
|---|---|---|---|
| I1 | `coi-xe.wav` | ~0.6 s | Tiếng còi xe máy “tin tin”. |
| I2 | `to-te.wav` | ~1.2 s | Kèn tò te (đồ chơi/đám cưới) báo hiệu. |
| I3 | `go-hu-tieu.wav` | ~0.8 s | Tiếng gõ lốc cốc của xe hủ tiếu gõ. |

---

## Sau khi có ảnh

1. Convert PNG → WebP (`cwebp -q 85 in.png -o out.webp`, sprite dùng `-lossless` hoặc `-q 95`).
2. Pack nhóm C và D thành atlas (JSON Hash, đúng tên key ở trên).
3. Cập nhật `apps/web/public/assets/manifests/<map>.assets.json` (kích thước `size` khớp với frame trong atlas).
