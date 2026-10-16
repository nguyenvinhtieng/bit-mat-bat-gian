const fs = require('node:fs');
const path = require('node:path');

/** App root on the VPS (override with APP_DIR env when starting PM2). */
const appDir = process.env.APP_DIR || '/var/www/the-hidden-truth';

function loadEnvFile(filePath) {
  const env = { NODE_ENV: 'production', PORT: '2567' };
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const i = trimmed.indexOf('=');
    if (i === -1) continue;
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim();
  }
  return env;
}

module.exports = {
  apps: [
    {
      name: 'hidden-truth',
      cwd: appDir,
      script: 'pnpm',
      args: 'start',
      interpreter: 'none',
      env: loadEnvFile(path.join(appDir, '.env')),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      merge_logs: true,
      time: true,
    },
  ],
};
