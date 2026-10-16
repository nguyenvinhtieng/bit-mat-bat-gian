#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu 22.04 / 24.04 VPS (run as root or with sudo).
# Production: https://bitmat.vinhtieng.com — HTTPS via Cloudflare (no cert on VPS).
#
# Usage (from repo on VPS):
#   sudo bash deployment/vps-bootstrap.sh
#
set -euo pipefail

DOMAIN=bitmat.vinhtieng.com
GIT_REPO="${GIT_REPO:-}"
APP_DIR="${APP_DIR:-/var/www/the-hidden-truth}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
NODE_MAJOR="${NODE_MAJOR:-22}"
APP_PORT="${APP_PORT:-2567}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash $0"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> System packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ca-certificates curl git gnupg ufw nginx \
  build-essential

echo "==> Deploy user: ${DEPLOY_USER}"
if ! id "${DEPLOY_USER}" &>/dev/null; then
  useradd -m -s /bin/bash "${DEPLOY_USER}"
fi
usermod -aG www-data "${DEPLOY_USER}" 2>/dev/null || true

echo "==> Node.js ${NODE_MAJOR}.x + pnpm (corepack)"
if ! command -v node &>/dev/null || [[ "$(node -p "process.versions.node.split('.')[0]")" != "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
corepack enable
corepack prepare pnpm@11.1.1 --activate

echo "==> PM2"
npm install -g pm2
env PATH="$PATH:$(npm prefix -g)/bin" pm2 startup systemd -u "${DEPLOY_USER}" --hp "/home/${DEPLOY_USER}" || true

echo "==> App directory: ${APP_DIR}"
mkdir -p "${APP_DIR}"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"

if [[ -n "${GIT_REPO}" ]] && [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "==> Clone ${GIT_REPO}"
  sudo -u "${DEPLOY_USER}" git clone "${GIT_REPO}" "${APP_DIR}"
elif [[ ! -d "${APP_DIR}/.git" ]]; then
  echo "WARN: Set GIT_REPO or clone the repo into ${APP_DIR} manually, then run deployment/deploy.sh"
fi

echo "==> Firewall (UFW)"
ufw allow OpenSSH
ufw allow 'Nginx HTTP'
ufw --force enable

echo "==> Nginx site: ${DOMAIN} (Cloudflare origin HTTP)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p /etc/nginx/snippets
cp "${SCRIPT_DIR}/nginx/cloudflare-real-ip.conf" /etc/nginx/snippets/cloudflare-real-ip.conf
NGINX_SRC="${SCRIPT_DIR}/nginx/bitmat.vinhtieng.com.conf"
NGINX_DST="/etc/nginx/sites-available/bitmat.vinhtieng.com"
if [[ ! -f "${NGINX_SRC}" ]]; then
  echo "Missing ${NGINX_SRC} — run this script from the repo checkout."
  exit 1
fi
cp "${NGINX_SRC}" "${NGINX_DST}"
ln -sf "${NGINX_DST}" /etc/nginx/sites-enabled/bitmat.vinhtieng.com
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

echo "==> Env file template"
if [[ -f "${APP_DIR}/deployment/env.example" ]] && [[ ! -f "${APP_DIR}/.env" ]]; then
  cp "${APP_DIR}/deployment/env.example" "${APP_DIR}/.env"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/.env"
fi

cat <<EOF

Bootstrap done (${DOMAIN}).

Cloudflare (no SSL on this VPS):
  - DNS: A record ${DOMAIN} → this server's public IP, proxy ON (orange cloud).
  - SSL/TLS encryption mode: Flexible (recommended here) or Full if you install a Cloudflare Origin Certificate on Nginx later.
  - Network → WebSockets: ON.

Next steps (as ${DEPLOY_USER}):
  1. If repo not cloned yet:
       sudo -u ${DEPLOY_USER} git clone <your-repo-url> ${APP_DIR}
  2. Edit ${APP_DIR}/.env if needed (PORT=${APP_PORT}).
  3. Build and start:
       sudo -u ${DEPLOY_USER} bash ${APP_DIR}/deployment/deploy.sh

PM2 (as ${DEPLOY_USER}):
  pm2 status
  pm2 logs hidden-truth

EOF
