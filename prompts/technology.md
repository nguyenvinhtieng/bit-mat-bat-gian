# Công nghệ đề xuất — Giao Kèo (Web multiplayer realtime)

> Mục tiêu: chơi trên **trình duyệt**, **nhiều người cùng phòng**, **mời bạn bè** (mã phòng / link), gameplay **mượt** trên layout cố định (di chuyển, task, họp) như mô tả trong `cot-truyen-role.md`.  
> Tài liệu này chọn hướng **ưu tiên hiệu năng + tốc độ phát triển**, và **quy trình AI** (thiết kế → sinh asset → code → chạy thử) để agent có thể triển khai end-to-end.

---

## 0. Công nghệ lõi & quy trình AI (agent)

### 0.0. OpenCode (model & asset)

Khi chạy **[OpenCode](https://opencode.ai)** trong repo này:

| Hạng mục | Cấu hình |
|----------|-----------|
| **Code** (Phaser, Colyseus, React, tooling) | **Claude Opus 5.5** — `opencode.json` → `model` + agent `build` / `plan`: `openrouter/anthropic/claude-opus-5.5` |
| **Asset 2D** (Bước 2) | **ChatGPT Image** — plugin `@makcimbx/opencode-gpt-imagegen`, tool **`gpt_imagegen`**; subagent **`@assets`** (xem `prompts/opencode.md`) |

Chi tiết cài plugin, OAuth, và quy trình gọi tool: **`prompts/opencode.md`**.

### 0.1. Game engine — **Phaser + TypeScript**

Game **2D** chạy trên **Canvas / WebGL**: quản lý **scene**, **animation**, **input**, **camera** và **physics** (Arcade / Matter tùy map).

| Khả năng | Dùng trong Giao Kèo |
|----------|-----------------------------|
| Scene / loader | Boot → Lobby → Game; preload atlas theo `manifests/*.assets.json` |
| Sprite & animation | Avatar common, prop map, marker task |
| Input | WASD / joystick ảo; click tương tác station |
| Camera | Follow player, bounds map layout cố định |
| Physics | Collision tường / cửa từ `layout/base.tmj` |

- [Tài liệu Phaser](https://docs.phaser.io/)
- [Tutorial đầu tiên (Making your first Phaser game)](https://docs.phaser.io/phaser/getting-started/making-your-first-phaser-game)

UI lobby, manh mối, họp vẫn có thể là **React + TypeScript** nhúng cạnh canvas Phaser (xem mục 3).

### 0.2. AI tạo hình ảnh — **GPT Image API**

Sinh **nhân vật cartoon**, **vật phẩm**, **icon**, **background**; hỗ trợ **nền trong suốt** khi dùng model / định dạng phù hợp (PNG alpha, prompt rõ “transparent background”).

- [Image generation API](https://platform.openai.com/docs/guides/image-generation)

**Ràng buộc khi gọi API (khớp `assets.md`):**

- Một prompt / batch gắn **kích thước pixel** (48×48 tile, 48×64 avatar, …), **style** (flat, soft outline, top-down 3/4), **prefix** file (`hue-`, `common-`).
- Sau khi tải ảnh: cắt lưới nếu cần, đổi tên **kebab-case**, lưu vào `assets/` theo cấu trúc thư mục; pack atlas WebP cho ship client.

### 0.3. Quy trình bốn bước (AI thực hiện)

```text
Bước 1 — Thiết kế game
  → GDD ngắn, cơ chế gameplay, role, level/map, danh sách asset, cấu trúc monorepo
  → Tham chiếu: cot-truyen-role.md, map/*.md, assets.md

Bước 2 — Sinh asset
  → GPT Image API: nhân vật, frame walk (hoặc sheet), background, tileset, icon, VFX
  → Lưu file: quy ước tên, kích thước, định dạng (PNG nguồn → WebP/atlas)
  → Cập nhật maps/co-do-hue/co-do-hue.assets.json

Bước 3 — Sinh gameplay
  → TypeScript: Phaser scenes, di chuyển, va chạm, animation, HUD tối thiểu
  → Colyseus (server): sync multiplayer khi có phòng chơi
  → React: lobby, clue UI, họp — theo mục 3–4

Bước 4 — Chạy thử và sửa lỗi
  → Chạy dev server (Vite), mở game, chụp màn hình / kiểm tra viewport
  → Phát hiện asset lệch anchor, thiếu frame, z-order sai → sửa art hoặc manifest
  → Sửa animation / hitbox → chạy lại đến khi slice chơi được
```

**Deliverable mỗi vòng:** playable vertical slice (một map, di chuyển + ít nhất một task station) trước khi mở rộng role đầy đủ.

---

## 1. Yêu cầu kỹ thuật rút ra từ thiết kế game

| Hạng mục | Đặc điểm | Hệ quả kỹ thuật |
|----------|----------|------------------|
| Thể loại | Social deduction + điều tra, layout Among Us | **Server có quyền** (authoritative): vị trí, tương tác task, năng lực role, trạng thái họp |
| Số người / phòng | Thường **4–10** (có thể mở rộng 12) | WebSocket một phòng; không cần MMO-scale |
| Realtime | Di chuyển liên tục, đồng bộ người chơi | **Dự đoán phía client** + **nội suy** vị trí người khác; tick server ổn định (10–20 Hz gameplay, 20–30 Hz nếu cần mượt hơn) |
| UI nặng chữ | Manh mối, diff tài liệu, hội thoại | **DOM/React** cho panel điều tra; **canvas** cho map — tách layer |
| Replay / biến thể | Host chọn map + kịch bản; bí mật không lộ client | Logic ván chạy **chỉ trên server**; client chỉ nhận thông tin theo quyền role |
| Mời bạn | Link + mã phòng | Lobby tách biệt; JWT/session ngắn cho vào phòng |
| Đối tượng | Việt Nam + quốc tế | i18n sớm; CDN asset; hosting gần SEA |

**Không cần (giai đoạn đầu):** engine 3D, physics phức tại, client-side anticheat nặng, blockchain, P2P thuần cho gameplay (dễ gian lận).

---

## 2. Kiến trúc tổng thể (khuyến nghị)

```text
┌─────────────────────────────────────────────────────────────┐
│  Browser (client)                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ Vite + TS    │  │ Phaser 3     │  │ React (hoặc Solid)  │ │
│  │ build        │  │ map, avatar, │  │ lobby, clue UI,     │ │
│  │              │  │ collision    │  │ meeting, settings   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         └─────────────────┴─────────────────────┘            │
│                           WebSocket (binary/msgpack tùy chọn) │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Game server (Node.js + TypeScript)                          │
│  Colyseus Room = 1 phòng chơi                                │
│  • State schema đồng bộ (players, phase, tasks công khai)    │
│  • RPC / messages cho hành động role (ẩn kết quả theo quyền) │
│  • Load map variant từ JSON (biên dịch từ map/*.md)          │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │ Redis (tùy chọn MVP+)    │  PostgreSQL (tùy chọn)
              │ mã phòng, presence       │  tài khoản, chiến dịch meta
              └───────────────────────────┘
```

**Nguyên tắc vàng:** mọi quyết định “ai thắng / manh mối nào đúng / ai làm gì lúc nào” do **server** tính; client chỉ hiển thị và gửi **ý định** (di chuyển, bấm task, dùng skill).

---

## 3. Frontend — mượt trên web

### 3.1. Engine 2D: **Phaser 3 + TypeScript** (stack chính)

- Top-down, tilemap / sprite, collision polygon — khớp “một layout cố định, skin theo map”.
- **Canvas / WebGL**; scene graph, sprite animation, input, camera follow, Arcade physics cho collision.
- Tích hợp **Vite + TypeScript** (`phaser` ESM); asset do AI sinh qua **GPT Image API** rồi import trong `preload` (mục 0).

**Thay thế:** **PixiJS** (+ tự viết scene/collision) nếu team muốn nhẹ hơn và kiểm soát render tối đa; **Kaboom.js** nếu prototype rất nhanh nhưng ít phù hợp production dài hơi.

### 3.2. UI ngoài game: **React 19 + TypeScript**

- Lobby (tạo phòng, mã 6 ký tự, copy link), danh sách người chơi, chọn map/biến thể (host).
- Panel manh mối (markdown/HTML an toàn), diff tài liệu (Lưu Trữ Viên), modal họp/bỏ phiếu.
- **Zustand** hoặc **Jotai** cho state UI; tránh đổ toàn bộ game state React (để Phaser không bị re-render).

**Thay thế:** **SvelteKit** (bundle nhỏ, nhanh) nếu team quen Svelte; vẫn nhúng Phaser tương tự.

### 3.3. Build & chất lượng

- **Vite** — dev nhanh, HMR.
- **TypeScript strict** — shared types với server (`packages/shared`).
- Asset: sinh bằng **GPT Image API** (mục 0.2), pack **TexturePacker** hoặc atlas WebP/AVIF; giới hạn kích thước sprite (Among Us-style không cần 4K).

### 3.4. Mượt khi di chuyển (client)

1. Gửi input (hướng / click đích) lên server mỗi frame hoặc throttled.
2. Client **dự đoán** vị trí bản thân; khi server gửi state mới thì **blend** nhẹ (snap threshold) để tránh giật.
3. Người chơi khác: **nội suy** vị trí giữa các snapshot (không teleport trừ lag lớn).
4. Giới hạn tốc độ gửi tin: ưu tiên **delta state** thay vì full room mỗi tick.

---

## 4. Backend realtime — phòng chơi & đồng bộ

### 4.1. **Colyseus** + Node.js + TypeScript (khuyến nghị chính)

**Vì sao hợp game này:**

- Mô hình **Room** = một ván; join by id — khớp “mời bạn bè”.
- **Schema state** đồng bộ tự động (chỉ field thay đổi) — ít băng thông hơn JSON thuần mỗi frame.
- Ecosystem quen thuộc với game 2D multiplayer; dễ tách `InvestigationRoom` / `LobbyRoom`.
- Cùng ngôn ngữ TS với client → `shared` enums (phase, role, task id).

**Luồng đề xuất:**

- `LobbyRoom`: chờ người, host chọn `map/co-do-hue` + variant `HUE-A`, ready check.
- `GameRoom`: gameplay; disconnect/reconnect với timeout ngắn (social game cần xử lý rõ).

**Thay thế:**

| Giải pháp | Khi nào dùng | Lưu ý |
|-----------|--------------|--------|
| **Socket.io** + state tự viết | Team đã rất quen, muốn full control | Nhiều code hơn (sync, reconnect, cheat) |
| **Nakama** (Go) | Sau này cần auth, leaderboard, storage sẵn | Học curve; vẫn tốt cho realtime |
| **PartyKit / Cloudflare Durable Objects** | Scale edge, ít ops | Logic game phức tại vẫn phải viết kỹ |
| **SpacetimeDB** | Muốn DB + realtime một khối | Mới hơn; đánh giá phù hợp team |

**Không khuyến nghị làm core gameplay:** WebRTC data channel **P2P** (host migration, cheat, NAT).

### 4.2. Giao thức & serialization

- MVP: **JSON** message cho RPC (dùng skill, mở manh mối).
- Khi số người/tick tăng: **msgpack** hoặc schema binary của Colyseus cho snapshot.
- **wss://** bắt buộc production; sticky session nếu nhiều instance (Redis pub/sub hoặc Colyseus matchmaker).

### 4.3. Chống gian lận (tối thiểu nhưng đủ)

- Validate tốc độ di chuyển, collision server-side.
- Skill role: cooldown + phase check trên server.
- Không gửi “sự thật ván” / phe bí mật người khác xuống client.

---

## 5. Nội dung map (`map/*.md`) → runtime

Để một layout, nhiều bối cảnh:

1. **Build step** (script Node): parse markdown map → **JSON schema**:
   - `areas[]` (id logic trùng layout: `exhibition`, `editor`, `archive`, …)
   - `clues[]`, `variants[]`, `hostTruth` (chỉ server bundle, không ship client)
   - `skin`: tên hiển thị, asset key trang trí
2. Client nhận **skin + clue đã lộ**; server giữ **hostTruth + gán biến thể**.
3. Version map trong JSON (`mapVersion`) để client/server không lệch.

Công cụ: **gray-matter** + **remark** hoặc parser tùy chỉnh theo heading trong repo.

---

## 6. Mời bạn bè & phiên chơi

| Tính năng | Cách làm gọn |
|-----------|----------------|
| Mã phòng | 6–8 ký tự, map → `roomId` Colyseus; lưu metadata Redis TTL 2–4h |
| Link mời | `https://game.domain/join/ABC123` — SPA route mở lobby auto-join |
| Tài khoản | **MVP:** tên hiển thị + guest id (localStorage). **Sau:** OAuth (Google/Discord) + Postgres |
| Region | Deploy **Singapore** (hoặc Tokyo) làm primary cho ping SEA |

---

## 7. Voice / họp (tùy chọn nhưng rất đáng)

Social deduction sống nhờ nói chuyện:

- **LiveKit** (self-host hoặc cloud) hoặc **Daily** — WebRTC SFU, ít code hơn tự host.
- Chỉ bật mic trong phase **họp**; gameplay im lặng hoặc proximity voice (phase 2).

MVP có thể chỉ **text chat** trong phòng để giảm phạm vi.

---

## 8. Hosting & vận hành

| Thành phần | Gợi ý | Ghi chú |
|------------|--------|---------|
| Static client | **Cloudflare Pages** / **Vercel** | CDN global |
| Game server | **Fly.io** (region sin), **Railway**, **Render** | Colyseus cần **1 process sticky** / room |
| Redis | **Upstash** | Mã phòng, rate limit |
| DB (sau MVP) | **Supabase** (Postgres) | Meta chiến dịch, lịch sử ván (không spoil) |
| CI | **GitHub Actions** | lint, test shared logic, deploy |

**Scale:** một instance Node xử lý hàng trăm phòng nhẹ nếu tick hợp lý; scale ngang = nhiều node + matchmaker chỉ định node.

---

## 9. Stack khuyến nghị (tóm tắt một dòng)

**TypeScript monorepo (pnpm):** `apps/web` (Vite + React + **Phaser 3**) · `apps/server` (Colyseus) · `packages/shared` (types, constants, validation) · `tools/map-compile` (md → JSON) · `tools/assets-pack` (PNG → atlas WebP).

**Sinh nội dung:** **GPT Image API** (asset 2D) + quy trình **Bước 1–4** (mục 0.3).

Đây là combo cân bằng tốt giữa **FPS 2D**, **multiplayer authoritative**, **AI có thể tạo asset + code**, và **mở rộng** voice/meta sau.

---

## 10. Lộ trình kỹ thuật gợi ý

### Phase 0 — Playable vertical slice (4–6 tuần, 1–2 dev)

- Layout một map collision; 2–4 bot/người di chuyển sync.
- Lobby + mã phòng; host chọn `co-do-hue` variant A.
- 1 task chung + 1 skill (ví dụ Lưu Trữ Viên) server-validated.
- Họp text + timer.

### Phase 1 — Ván đầy đủ

- 6 role; phase vòng; manh mối theo quyền.
- Biên dịch `map/co-do-hue.md` → JSON.
- Màn hình kết thúc (không spoil biến thể khác).

### Phase 2 — Trải nghiệm sản phẩm

- Reconnect; kick AFK; i18n VI/EN.
- Voice (LiveKit); tài khoản tùy chọn.
- Analytics cơ bản (ván/xong, không log nội dung bí mật).

---

## 11. Rủi ro & mitigations

| Rủi ro | Mitigation |
|--------|------------|
| Giật lag SEA ↔ US | Host server gần người chơi; hiển thị ping trong lobby |
| Client hack vị trí | Server simulation + clamp |
| Scope creep (voice, campaign DB) | MVP text-only; meta chiến dịch chỉ localStorage trước |
| React + Phaser lifecycle | Mount Phaser một lần; bridge event qua custom EventEmitter |
| Nội dung map lệch code | `mapVersion` + test snapshot JSON từ md |

---

## 12. Công nghệ **không** ưu tiên giai đoạn đầu

- **Unity WebGL** — build nặng, load chậm, mobile yếu; chỉ xem xét nếu sau này port native.
- **Unreal / Godot HTML5** — tương tự; game 2D nhẹ không cần.
- **Firebase Realtime DB** làm game state — khó mô hình authoritative phức tại.
- **GraphQL subscriptions** cho tick di chuyển — overhead không cần thiết; WebSocket/game framework phù hợp hơn.

---

## 13. Quyết định cần chốt khi bắt code

1. **Số người tối đa / phòng** (ảnh hưởng tick rate và voice).
2. **Guest-only MVP** hay đăng nhập ngay.
3. **Proximity chat** hay chỉ chat họp.
4. **Mobile web** có trong scope MVP không (ảnh hưởng UI điều khiển Phaser).

---

*Tài liệu bổ sung cho `cot-truyen-role.md` và `map/*.md`. Khi stack được chốt, có thể thêm `ARCHITECTURE.md` chi tiết message schema và state machine từng phase.*
