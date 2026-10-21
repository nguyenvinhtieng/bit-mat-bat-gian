# Đặc tả asset — Bịt Mắt Bắt Gian

> **Phạm vi tài liệu:** danh sách asset cần sản xuất, **kích thước**, **định dạng file**, **quy ước đặt tên** và **mapping** với gameplay.  
> **Nhân vật người chơi (avatar, animation):** mỗi map có **trang phục riêng** (mục 3.1) trên cùng một rig/khung hình; `maps/common/characters` là bản dự phòng.  
> **Tham chiếu:** `technology.md` (Phaser + TypeScript, GPT Image API, quy trình AI 4 bước), `cot-truyen-role.md` (role & task logic), `map/co-do-hue.md` (bối cảnh Huế).

---

## 0. Sinh asset bằng AI (Bước 2 trong `technology.md`)

**OpenCode:** gọi subagent **`@assets`** hoặc tool **`gpt_imagegen`** (plugin ChatGPT Image — xem `prompts/opencode.md`). **Cursor / agent khác:** dùng **GPT Image API** tương đương.

Mọi agent sinh pixel lưu file trực tiếp vào `assets/` (không bake chữ gameplay vào texture — xem mục 1).

| Loại asset | Gợi ý prompt (luôn kèm style + kích thước) | Đích lưu |
|------------|---------------------------------------------|----------|
| Avatar walk | Cartoon top-down 3/4, 48×64 px/frame, 4 hướng, soft outline, transparent | `maps/common/characters/` |
| Tile / sàn tường | Seamless tile 48×48, palette Huế (vàng đất, kem, gỗ) | `maps/co-do-hue/tileset/` |
| Prop | Footprint 48×48, anchor chân prop, prefix `hue-prop-…` | `maps/co-do-hue/props/` |
| Station / clue nền | 64×64 marker hoặc 400–720 px panel (chữ do UI render) | `stations/`, `clues/` |
| Icon role / UI | Flat icon 32×48 px, readable at small size | `maps/common/ui/` |

**Sau mỗi lô ảnh:** đặt tên theo mục **1.2**, kiểm tra alpha, cập nhật `maps/co-do-hue/co-do-hue.assets.json`, pack atlas (mục 1). **Bước 4:** chạy game Phaser, so screenshot với bảng kích thước — sửa prompt hoặc crop nếu lệch.

API: [Image generation](https://platform.openai.com/docs/guides/image-generation).

---

## 1. Nguyên tắc kỹ thuật

| Hạng mục | Quy ước |
|----------|---------|
| **Đơn vị tile** | **48×48 px** (world pixel). Mọi tile / prop căn lưới 48px trừ decor “floating” (đèn, bảng treo) có thể offset nửa tile. |
| **Tỉ lệ nhìn** | Top-down ~3/4 nhẹ (Among Us / museum interior), **không** isometric 2:1. |
| **Màu & style** | Flat / soft outline; palette map Huế: vàng đất, xanh ngọc, gỗ tối, giấy kem (ghi trong `skins/hue/palette.json` khi có). |
| **Ship client** | Texture **WebP** (quality 85–90, alpha); giữ **PNG nguồn** trong repo hoặc drive art. |
| **Atlas** | Gom sprite/prop vào atlas; **tối đa 2048×2048** mỗi sheet (mobile web). Tên atlas theo map: `hue-gameplay-0.webp` + `hue-gameplay-0.json`. |
| **Vector UI** | Icon lobby / role: **SVG** nguồn → export PNG 24/32/48 dp (@1x). |
| **Collision** | Một file **layout chung** (`layout/base.tmj`); map chỉ đổi **layer decor + skin key**, không đổi topology phòng (trừ khi version `layoutVersion`). |
| **i18n** | Chữ manh mối **không** bake vào texture gameplay (trừ poster trang trí mờ / không đọc được). Text đọc trong UI React. |

### 1.1. Cấu trúc thư mục đề xuất

```text
assets/
├── common/                    # Dùng mọi map
│   ├── characters/              # Avatar + walk cycle (atlas)
│   ├── ui/                    # Lobby, họp, vote, task progress
│   ├── layout/                # base.tmj, collision, spawn points
│   └── audio/                 # SFX/UI (map-agnostic)
├── maps/
│   └── co-do-hue/             # Skin + prop + clue art Huế
│       ├── tileset/
│       ├── props/
│       ├── stations/            # Điểm tương tác task (marker + minigame art)
│       ├── clues/               # Ảnh nền manh mối (text overlay trong code)
│       ├── npc/                 # Portrait NPC (UI dialogue, tùy chọn MVP)
│       └── meta/                # Thumbnail lobby, icon map
└── manifests/
    └── co-do-hue.assets.json    # Liệt kê key → file, anchor, z-order
```

### 1.2. Đặt tên file

- **Kebab-case**, prefix map: `hue-`.
- **ID logic** trùng code / map JSON (sau `map-compile`): `exhibition`, `editing`, `archive`, `artifact_storage`, `coordination`, `corridor`, `courtyard_checkin`.
- Task station: `hue-station-<task_id>.png`.
- Prop tĩnh: `hue-prop-<area>-<name>.png`.

---

## 2. Layout chung (common) — một bản cho mọi map

Asset **không** skin theo Huế; map chỉ “dán” decor lên trên.

| Asset | Mô tả | Kích thước / file | Ghi chú |
|-------|--------|-------------------|---------|
| `layout/base.tmj` | Tilemap logic: tường, sàn trung tính, cửa | Lưới **48px**; kích thước đề xuất **42×32 tile** (~2016×1536 px) | Export layer `collision` (polygon hoặc tile) |
| `layout/spawns.json` | Điểm spawn, điểm họp | Tọa độ pixel | 10 slot + 1 điểm “bàn họp” |
| `layout/area-zones.json` | Polygon / rect → `areaId` | Cùng kích thước map | 7 `areaId` bên dưới |
| `common/tileset/base-floor-wall.png` | Sàn & tường placeholder | Tile **48×48**; sheet ≤2048 | Map skin có thể override layer `floor` |
| `maps/common/props/door-closed.png` | Cửa generic | 48×96 hoặc 96×48 | Flip H/V |
| `maps/common/ui/task-marker.png` | Vòng sáng tương tác | **64×64** | Animation 4–8 frame tùy chọn |
| `maps/common/ui/exhibition-progress.png` | Thanh tiến độ triển lãm | **320×24** + fill slice | UI HUD |

### 2.1. `areaId` cố định (gán skin Huế lên từng vùng)

| `areaId` | Tên hiển thị (Huế) | Chức năng gameplay |
|----------|-------------------|-------------------|
| `courtyard_checkin` | Sân hiên / Check-in | Sự kiện ngắn, áp lực khai mạc |
| `exhibition` | Gian trưng bày | Bảng treo, ảnh kiến trúc |
| `corridor` | Hành lang | Liên kết phòng |
| `coordination` | Phòng điều phối | Lịch, chat nhóm |
| `editing` | Phòng biên tập | In, scan, file |
| `archive` | Phòng lưu trữ | Kệ, hộp tư liệu |
| `artifact_storage` | Kho hiện vật | Bản sao, niêm phong |

---

## 3. Nhân vật người chơi (common)

| Asset | Kích thước | File | Ghi chú |
|-------|------------|------|---------|
| Body sprite (4 hướng) | **48×64** mỗi frame | `maps/common/characters/player-atlas.png` + `.json` | 4–8 frame walk / hướng |
| Shadow | **32×16** | `maps/common/characters/shadow.png` | Ellipse mờ |
| Màu / palette swap | — | `player-tint-*.png` hoặc shader | 12 màu tối đa / phòng |
| Icon role (HUD) | **48×48** | `maps/common/ui/roles/<role_id>.svg` | `historian`, `conservator`, `local_guide`, `archivist`, `forger`, `broker` |
| Icon ability | **32×32** | `maps/common/ui/abilities/<role_id>.png` | Một nút / role, mọi map |

**Rig chung, trang phục theo map** — xem 3.1.

### 3.1. Trang phục nhân vật theo map

Cùng khung **48×64**, 4 hàng (`down`, `left`, `right`, `up`) × 4 frame `walk-<dir>-<i>`, anchor chân giữa. Phần **áo** nằm ở tint atlas (xám) để engine nhuộm màu người chơi; mũ/khăn, tóc, quần, giày nằm ở base atlas.

| Map | Trang phục | File (dưới `maps/<slug>/characters/`) |
|-----|------------|----------------------------------------|
| `co-do-hue` | Áo dài ngũ thân (nhuộm màu) + **khăn đóng vàng**, quần trắng, hài mũi cong | `hue-player-atlas`, `hue-player-tint-atlas` |
| `hoi-an` | Áo bà ba (nhuộm màu) + **nón lá**, búi tóc, quần lụa đen, guốc mộc | `hoian-player-atlas`, `hoian-player-tint-atlas` |
| `thang-long` | Áo the dài (nhuộm màu) + **khăn xếp**, quần trắng, giày Gia Định | `tl-player-atlas`, `tl-player-tint-atlas` |

- Sinh bằng `pnpm assets:chars` (`tools/char-art/draw-characters.mjs`, vector, không cần API) → PNG ở `assets/maps/<slug>/characters/`, WebP + JSON ở `apps/web/public/assets/...`, ảnh duyệt `assets/_src/maps/<slug>/characters/*-preview.png`.
- Map mới: thêm một costume trong script + `charPrefix` trong `packages/shared/src/maps/catalog.ts`. Không có `charPrefix` → dùng `maps/common/characters/player-atlas`.
- Client chọn atlas qua `playerArt(mapSlug)` (GameScene + Sprite cinematic).

---

## 4. UI common (lobby, họp, manh mối)

| Asset | Kích thước | File |
|-------|------------|------|
| Logo / wordmark | SVG + PNG **512×128** max | `maps/common/ui/logo.svg` |
| Nút primary/secondary | 9-slice **120×48** | `maps/common/ui/button-*.png` |
| Panel clue (khung) | 9-slice **720×min** | `maps/common/ui/clue-panel.png` |
| Avatar vote / meeting | **40×40** circle mask | dùng texture chung |
| Map card placeholder | **640×360** (16:9) | `maps/common/ui/map-card-frame.png` |

Manh mối **nội dung**: React + markdown/HTML; asset chỉ là **nền giấy / ảnh**.

---

## 5. Map **Cố đô Huế** (`maps/co-do-hue/`)

**Slug:** `co-do-hue` · **Skin prefix:** `hue-` · **Biến thể:** `HUE-A` | `HUE-B` | `HUE-C` (không đổi art cơ bản; đổi **dữ liệu** manh mối).

### 5.1. Meta & lobby

| Asset | Kích thước | File | Mô tả |
|-------|------------|------|--------|
| Thumbnail chọn map | **640×360** WebP | `meta/hue-lobby-thumb.webp` | Gian trưng bày + motif Huế (kinh thành silhouette) |
| Icon map nhỏ | **128×128** | `meta/hue-map-icon.webp` | Dùng list phòng |
| Loading splash (tùy chọn) | **1920×1080** safe **1200×675** | `meta/hue-loading.webp` | Không chữ nhỏ |

### 5.2. Tileset & nền phòng (skin theo `areaId`)

Mỗi khu: **bộ tile** riêng hoặc **1 tileset** với variant index.

| Asset | Kích thước | File | Ghi chú |
|-------|------------|------|---------|
| Tileset Huế | Tile **48×48**; sheet ≤2048 | `tileset/hue-interior-48.png` | Sàn gỗ, thảm, tường kem, viền trang trí nhẹ |
| Overlay decor (optional) | Full room ~**14×12 tile** max / vùng | `tileset/hue-overlay-<areaId>.png` | Không collision; z trên sàn |
| Ambient prop tile | 48×48 hoặc 96×48 | trong tileset | Thảm hành lang, bệ cửa |

**MVP:** một tileset chung + 7 màu accent khác nhau per `areaId` (đổi hue trong art hoặc tint shader).

### 5.3. Prop tĩnh theo khu (decoration, không bắt buộc tương tác)

Anchor: **chân prop** = tâm ô dưới (48×48 footprint chuẩn).

| `areaId` | Asset key | Kích thước (px) | File gợi ý |
|----------|-----------|-----------------|------------|
| `exhibition` | `hue-prop-exhibition-panel-bilingual` | **96×192** | Bảng treo song ngữ (chữ blur / fake) |
| `exhibition` | `hue-prop-exhibition-photo-wall` | **192×128** | Ảnh kiến trúc (3 khung) |
| `exhibition` | `hue-prop-exhibition-spotlight` | **64×64** | Đèn spot |
| `editing` | `hue-prop-editing-printer` | **96×80** | Máy in |
| `editing` | `hue-prop-editing-scanner` | **80×64** | Máy scan |
| `editing` | `hue-prop-editing-desk-papers` | **128×64** | Bàn giấy |
| `archive` | `hue-prop-archive-shelf-a` | **192×128** | Kệ tài liệu |
| `archive` | `hue-prop-archive-box-hue04` | **64×48** | Hộp Huế-04 |
| `artifact_storage` | `hue-prop-storage-sealed-box` | **80×64** | Hộp niêm phong |
| `artifact_storage` | `hue-prop-storage-copy-stand` | **96×96** | Bục bản sao |
| `coordination` | `hue-prop-coord-whiteboard` | **128×96** | Bảng lịch khai mạc |
| `coordination` | `hue-prop-coord-monitor` | **80×64** | Màn hình chat (UI fake) |
| `corridor` | `hue-prop-corridor-plant` | **48×64** | Cây chậu |
| `courtyard_checkin` | `hue-prop-courtyard-banner` | **128×192** | Banner *Bịt Mắt Bắt Gian* |
| `courtyard_checkin` | `hue-prop-courtyard-bench` | **128×48** | Ghế |

**Tổng tối thiểu MVP:** ~12 prop (ưu tiên có trong bảng nhiệm vụ).

### 5.4. Điểm tương tác (task stations)

Mỗi station: sprite **inactive** + **active** (highlight); **64×64** icon trên map + hitbox **96×96** tại tọa độ cố định trong `hue-stations.json`.

#### 5.4.1. Nhiệm vụ chung (mọi người) — khớp `map/co-do-hue.md`

| `task_id` | Phòng (`areaId`) | Station art | Minigame / panel art (UI) |
|-----------|------------------|-------------|---------------------------|
| `task_print_checklist` | `editing` | `stations/hue-station-print-checklist.png` | Checklist **400×520** nền giấy |
| `task_scan_footnote` | `editing` | `stations/hue-station-scan-footnote.png` | Trang scan **480×640** |
| `task_update_floor_plan` | `coordination` | `stations/hue-station-floor-plan.png` | Sơ đồ gian **560×400** |
| `task_check_lights_labels` | `exhibition` | `stations/hue-station-lights-labels.png` | Ảnh bảng + timestamp **480×360** |
| `task_seal_box` | `artifact_storage` | `stations/hue-station-seal-box.png` | UI nhập/so số niêm **360×320** |
| `task_return_shelf_a` | `archive` | `stations/hue-station-return-shelf.png` | Phiếu mượn **400×280** |

**Progress:** mỗi task hoàn thành +1 tiến độ; dùng icon chung `maps/common/ui/task-complete.png` (**32×32**).

#### 5.4.2. Nhiệm vụ theo role (cùng station type, đổi nội dung theo map data)

| `role_id` | Hành động Huế | `areaId` gợi ý | Asset UI chính |
|-----------|---------------|----------------|----------------|
| `historian` | Email vs ngày in | `editing` hoặc `coordination` | `clues/hue-ui-email-thread.png` **520×400** |
| `conservator` | Niêm phong hộp bản sao | `artifact_storage` | `clues/hue-ui-seal-record.png` **400×360** |
| `local_guide` | Ngữ cảnh trích dẫn di tích | `courtyard_checkin` hoặc `exhibition` | `clues/hue-ui-tour-script.png` **480×320** |
| `archivist` | Diff `intro_VI_EN_v2` vs bản in | `archive` | `clues/hue-ui-doc-diff-bg.png` **640×480** (text render code) |
| `forger` | (bí mật) | `editing` | Dùng station biên tập; hiệu ứng **glitch nhẹ** optional |
| `broker` | (bí mật) | `coordination` | `clues/hue-ui-chat-fragment.png` **360×280** |

Icon trên map cho role ability: tái dùng `maps/common/ui/abilities/<role_id>.png`; chỉ **một** điểm tương tác / role / vòng tại tọa độ trong `hue-role-stations.json`.

### 5.5. Manh mối (clue art — Huế)

Text (VI/EN, diff câu) nằm trong **data**; art là nền + texture.

| `clue_id` (gợi ý) | Loại | Kích thước | File |
|-------------------|------|------------|------|
| `hue-clue-panel-printed` | Bảng in treo | **720×480** | `clues/hue-clue-panel-printed-bg.webp` |
| `hue-clue-print-proof-photo` | Ảnh bản thử in | **640×480** | `clues/hue-clue-print-proof.webp` |
| `hue-clue-file-final-v3` | Screenshot file | **560×400** | `clues/hue-clue-file-ui-bg.webp` |
| `hue-clue-comment-unresolved` | Comment biên tập | **480×320** | `clues/hue-clue-comment-bg.webp` |
| `hue-clue-loan-slip-hue04` | Phiếu mượn | **400×300** | `clues/hue-clue-loan-slip.webp` |
| `hue-clue-handnote-missing-pages` | Ghi chú tay meta | **360×280** | `clues/hue-clue-handnote.webp` |
| `hue-clue-bilingual-paragraph` | Đoạn song ngữ (highlight 1 câu) | **640×auto** | nền `hue-clue-paper.webp` + HTML text |

**Biến thể HUE-A/B/C:** không cần bộ art riêng; đổi **variant JSON** (câu diff, meta clue slot).

### 5.6. NPC (UI — tùy chọn MVP)

Portrait bust, dùng hộp thoại / sân hiên; **không** sprite đi trên map (trừ phase 2).

| NPC | File | Kích thước |
|-----|------|------------|
| Chị Minh Giám | `npc/hue-npc-minh-giam.webp` | **256×256** |
| Anh Tuấn | `npc/hue-npc-tuan.webp` | **256×256** |
| Chị Lan | `npc/hue-npc-lan.webp` | **256×256** |
| Em Vi | `npc/hue-npc-vi.webp` | **256×256** |
| Ông Hòa | `npc/hue-npc-hoa.webp` | **256×256** |
| Chị Thảo | `npc/hue-npc-thao.webp` | **256×256** |
| Anh Phú | `npc/hue-npc-phu.webp` | **256×256** |

Style: cùng outline với avatar người chơi; nền trong suốt.

### 5.7. Audio (map Huế — tùy chọn)

| Asset | Định dạng | Thời lượng | File |
|-------|-----------|------------|------|
| Ambient phòng triển lãm | **OGG** loop | 60–120s | `audio/hue-ambient-loop.ogg` |
| SFX máy in / scan | **OGG** | &lt;2s | `audio/hue-sfx-printer.ogg` |
| SFX hoàn thành task | dùng common | — | `common/audio/task-done.ogg` |

---

## 6. Manifest & versioning

File `maps/co-do-hue/co-do-hue.assets.json` (schema gợi ý):

```json
{
  "mapSlug": "co-do-hue",
  "mapVersion": 1,
  "layoutVersion": 1,
  "tileSize": 48,
  "skin": "hue",
  "atlases": ["hue-gameplay-0"],
  "areas": ["courtyard_checkin", "exhibition", "corridor", "coordination", "editing", "archive", "artifact_storage"],
  "stations": [],
  "clues": []
}
```

- Tăng **`mapVersion`** khi đổi art/prop/station ID.  
- Tăng **`layoutVersion`** chỉ khi đổi `layout/base.tmj` hoặc collision.

---

## 7. Checklist sản xuất — Huế MVP (thứ tự)

1. [ ] `layout/base.tmj` + `area-zones.json` + spawn  
2. [ ] `maps/common/characters` + `maps/common/ui` tối thiểu  
3. [ ] `hue-interior-48` tileset + 7 vùng nhận diện được  
4. [ ] 6 **task station** chung + JSON tọa độ  
5. [ ] 12 prop tĩnh ưu tiên  
6. [ ] 5–7 **clue background** + data text từ map  
7. [ ] `hue-lobby-thumb` + manifest  
8. [ ] Atlas pack + WebP build script  

---

## 8. Map tương lai (chỉ khung — chưa sản xuất)

Cùng **layout** và **task_id chung**; đổi skin + `maps/<slug>/` tương tự Huế.

| File map | Slug | Skin prefix | Ghi chú asset |
|----------|------|-------------|----------------|
| `map/pho-co-hoi-an.md` | `pho-co-hoi-an` | `hoian-` | Đèn lồng, phố cổ; station logic giữ nguyên |
| `map/ha-noi-am-thuc.md` | `ha-noi-am-thuc` | `hanoi-` | Gian ẩm thực / biên tập |
| `map/dong-bang-song-cuu-long.md` | `dong-bang-song-cuu-long` | `dbscl-` | Kho / vận chuyển |
| `map/vinh-ha-long.md` | `vinh-ha-long` | `halong-` | Bản đồ, panel truyền thuyết (có nhãn) |

Mỗi map mới: copy mục **5** (meta, tileset, props, stations, clues, npc, audio) và thay prefix + danh sách prop theo file `map/*.md`.

---

## 9. Liên kết tài liệu

| File | Nội dung |
|------|----------|
| `technology.md` | Phaser + TypeScript, GPT Image API, quy trình 4 bước, atlas, CDN |
| `map/co-do-hue.md` | Nhiệm vụ, NPC, manh mối, biến thể |
| `cot-truyen-role.md` | Role & năng lực chung |
| `assets.md` | Tài liệu này |

---

*Khi bắt code: thêm script `tools/assets-check` (optional) để so manifest với file thực tế trên disk.*
