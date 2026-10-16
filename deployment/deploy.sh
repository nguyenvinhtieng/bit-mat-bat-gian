#!/usr/bin/env bash
# Build and reload the app on the VPS (run as deploy user from APP_DIR or any cwd).
#
#   cd /var/www/the-hidden-truth && bash deployment/deploy.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "${APP_DIR}"

if [[ ! -f package.json ]]; then
  echo "Not a repo root: ${APP_DIR}"
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Creating .env from deployment/env.example"
  cp deployment/env.example .env
fi

export APP_DIR

echo "==> pnpm install"
corepack enable 2>/dev/null || true
pnpm install --frozen-lockfile

echo "==> pnpm build (layout + web + server typecheck)"
pnpm build

echo "==> PM2"
ECOSYSTEM="${APP_DIR}/deployment/ecosystem.config.cjs"
if pm2 describe hidden-truth &>/dev/null; then
  pm2 reload "${ECOSYSTEM}" --update-env
else
  pm2 start "${ECOSYSTEM}"
fi
pm2 save

echo "==> Health (local)"
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-2567}/health" || {
  echo "Health check failed — try: pm2 logs hidden-truth"
  exit 1
}
# /health also answers from a stale process left on the port; a current route proves the new code is live
curl -fsS -o /dev/null "http://127.0.0.1:${PORT:-2567}/admin/stats" || {
  echo
  echo "Server is running OLD code (/admin/stats missing) — an old process still holds the port."
  echo "Fix: pm2 delete hidden-truth; kill the process on :${PORT:-2567} (sudo lsof -i :${PORT:-2567}); bash deployment/deploy.sh"
  exit 1
}

echo "Deploy OK — https://bitmat.vinhtieng.com (${APP_DIR})"
