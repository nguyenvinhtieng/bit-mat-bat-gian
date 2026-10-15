# OpenCode — model & công cụ cho Bịt Mắt Bắt Gian

> Cấu hình project: `opencode.json` (OpenCode v2). Đọc file này trước khi code hoặc sinh asset.

## Phân vai model

| Việc | Model / công cụ | Ghi chú |
|------|------------------|---------|
| **Code, refactor, debug, server, Phaser, React** | **Claude Opus 5.5** | `openrouter/anthropic/claude-opus-5.5` — agent mặc định `build`, cũng gán cho `plan`. |
| **Sinh hình ảnh gameplay (Bước 2)** | **ChatGPT Image** | Plugin `@makcimbx/opencode-gpt-imagegen` → tool **`gpt_imagegen`** (GPT Image qua ChatGPT/Codex OAuth hoặc OmniRoute). **Không** dùng Opus để “vẽ” asset; Opus chỉ đọc spec và gọi tool. |

Nếu bạn dùng provider khác (Anthropic trực tiếp, OpenCode Zen, …), đổi `model` trong `opencode.json` nhưng **giữ nguyên quy tắc**: Opus 5.5 cho code, `gpt_imagegen` cho pixel art.

## Cách làm việc

### Code (agent `build`)

1. Tham chiếu `prompts/technology.md`, `prompts/cot-truyen-role.md`, `map/*.md`.
2. TypeScript monorepo: Phaser client, Colyseus server, React UI — theo stack trong `technology.md`.
3. Khi cần file ảnh mới: gọi subagent **`@assets`** hoặc tự gọi `gpt_imagegen`, không commit placeholder bitmap lâu dài.

### Asset (subagent `@assets`)

1. Đọc **`prompts/assets.md`** (kích thước, tên file, atlas, manifest).
2. Mỗi lô ảnh: prompt có **style + kích thước pixel + prefix** (`hue-`, `common-`).
3. Gọi **`gpt_imagegen`** với `out` trỏ vào đường dẫn trong `assets/` (plugin không ghi đè file — tự thêm `-v2` nếu trùng tên).
4. Sau sinh ảnh: đặt tên kebab-case, cập nhật `manifests/*.assets.json`, pack atlas nếu bước tiếp theo cần ship WebP.

Prompt chi tiết cho subagent: `.opencode/agents/assets.md`.

## Plugin ChatGPT Image

Trong `opencode.json`:

```json
"plugins": ["@makcimbx/opencode-gpt-imagegen"]
```

- Cần OpenCode đăng nhập **ChatGPT/Codex OAuth** (subscription) hoặc cấu hình OmniRoute theo [README plugin](https://github.com/makcimbx/opencode-gpt-imagegen).
- Restart OpenCode sau khi thêm plugin để cài package.

## Kiểm tra nhanh

```bash
opencode models | rg 'opus-5\.5'
```

Phiên code: Tab chọn **Build**, model hiển thị Opus 5.5. Sinh asset: `@assets` + yêu cầu cụ thể (ví dụ tile 48×48 seamless Huế).

## Lỗi `User not found` (Build · Claude Opus 5.5)

Thông báo này **không** có nghĩa tài khoản OpenCode bị xóa. Với model `openrouter/...`, đây là **HTTP 401 từ OpenRouter** — credential gửi lên không hợp lệ cho **chat/completions**.

### Nguyên nhân hay gặp trên máy dev

1. **Dùng nhầm loại API key** — key **Provisioning / Management** (tạo key cho team, billing, automation) vẫn pass `GET /api/v1/auth/key` nhưng **không** gọi được chat → luôn `User not found`.
2. Key hết hạn, bị revoke, copy thiếu ký tự, hoặc dán key Anthropic/OpenAI vào OpenRouter.
3. OpenCode vẫn giữ key cũ trong credential store.

### Cách sửa

1. Vào [OpenRouter → Keys](https://openrouter.ai/keys), tạo key **Inference** (API key thường, **không** chọn Provisioning/Management nếu chỉ dùng để code).
2. Trong terminal:

```bash
opencode auth logout openrouter   # hoặc integration tương ứng trong UI
opencode auth login               # chọn OpenRouter, dán sk-or-v1-...
```

3. Restart OpenCode (thoát app / `opencode` server) và prompt lại.

### Tự kiểm tra (không in full key)

```bash
# Key hợp lệ cho inference: HTTP 200 và có nội dung model
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}],"max_tokens":1}' \
  https://openrouter.ai/api/v1/chat/completions
```

- `200` → key OK; nếu OpenCode vẫn lỗi thì logout/login lại integration.
- `401` + `User not found` → đổi key (thường là provisioning key hoặc key chết).

### Không muốn OpenRouter

Đăng nhập **Anthropic** (`opencode auth login`) và đổi `opencode.json` sang model Anthropic trực tiếp (slug lấy từ `opencode models | rg opus`), ví dụ khi provider hỗ trợ `anthropic/claude-opus-5.5`.
