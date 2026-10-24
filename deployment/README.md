# Triển khai VPS — giaokeo.vinhtieng.com

Stack: **Node 22 + pnpm + PM2 + Nginx** → Colyseus/Express (`2567`), static `apps/web`.

| | |
|---|---|
| **Domain** | `giaokeo.vinhtieng.com` |
| **HTTPS** | **Cloudflare** (VPS chỉ HTTP :80, không Certbot) |
| **Code** | `GAME_DOMAIN` trong `packages/shared/src/constants.ts` |

VPS **Ubuntu 22.04 / 24.04**, quyền `sudo`.

## Tóm tắt

| Bước | Việc cần làm |
|------|----------------|
| Cloudflare DNS | A `giaokeo.vinhtieng.com` → IP VPS, **Proxied** (orange cloud) |
| Cloudflare SSL | **Flexible** (CF HTTPS ↔ user, CF HTTP ↔ VPS:80) |
| Bootstrap | `sudo bash deployment/vps-bootstrap.sh` |
| Deploy | `bash deployment/deploy.sh` |

## 1. Cloudflare

1. **DNS**: bản ghi **A** `giaokeo.vinhtieng.com` → IP VPS, bật proxy (đám mây cam).
2. **SSL/TLS** → Overview: chọn **Flexible** (không cài certificate trên VPS).
   - Nếu sau này dùng **Full (strict)**, cài [Origin Certificate](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) trên Nginx — không bắt buộc với setup hiện tại.
3. **Network**: **WebSockets** = ON (game Colyseus).
4. (Tuỳ chọn) **SSL/TLS** → Edge Certificates: Always Use HTTPS.

Người chơi truy cập `https://giaokeo.vinhtieng.com`; Nginx trên VPS lắng nghe **port 80** only.

## 2. Bootstrap VPS

```bash
sudo apt-get update && sudo apt-get install -y git
sudo git clone <repo-url> /var/www/giao-keo
cd /var/www/giao-keo
sudo bash deployment/vps-bootstrap.sh
```

Script: Node 22, pnpm, PM2, Nginx + snippet IP Cloudflare (`CF-Connecting-IP`), UFW (SSH + HTTP).

## 3. Deploy

```bash
sudo -u deploy bash -lc 'cd /var/www/giao-keo && test -f .env || cp deployment/env.example .env; bash deployment/deploy.sh'
```

```bash
pm2 status
curl -s http://127.0.0.1:2567/health
curl -sI https://giaokeo.vinhtieng.com/health
```

Production: `NODE_ENV=production`. CORS/WebSocket origin: `https://giaokeo.vinhtieng.com`.

## 4. Cập nhật

```bash
cd /var/www/giao-keo && git pull && bash deployment/deploy.sh
```

## 5. Nginx thủ công

```bash
sudo mkdir -p /etc/nginx/snippets
sudo cp deployment/nginx/cloudflare-real-ip.conf /etc/nginx/snippets/
sudo cp deployment/nginx/giaokeo.vinhtieng.com.conf /etc/nginx/sites-available/giaokeo.vinhtieng.com
sudo ln -sf /etc/nginx/sites-available/giaokeo.vinhtieng.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Gỡ lỗi

- **502**: `pm2 logs giao-keo`, `.env` có `PORT=2567`.
- **525/526 Cloudflare**: SSL mode **Full** nhưng origin không có HTTPS → đổi sang **Flexible** hoặc thêm origin cert.
- **WebSocket**: Cloudflare WebSockets ON; Nginx có `Upgrade` / `Connection`.
- **CORS**: mở game qua `https://giaokeo.vinhtieng.com`, không IP trực tiếp.
- **pnpm install**: không set `NODE_ENV=production` trước `pnpm install`.

## 7. Thư mục `deployment/`

```
deployment/
  README.md
  vps-bootstrap.sh
  deploy.sh
  ecosystem.config.cjs
  env.example
  nginx/
    giaokeo.vinhtieng.com.conf
    cloudflare-real-ip.conf
```

## 8. Copy/paste

```bash
cd /var/www/giao-keo && sudo bash deployment/vps-bootstrap.sh
sudo -u deploy bash -lc 'cd /var/www/giao-keo && bash deployment/deploy.sh'
```
