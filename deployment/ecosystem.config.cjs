const fs = require('node:fs');
const path = require('node:path');

/** App root on the VPS (override with APP_DIR env when starting PM2). */
const appDir = process.env.APP_DIR || '/var/www/giao-keo';

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
      name: 'giao-keo',
      // cwd must be apps/server: tsx reads tsconfig.json from the cwd, and only the server's enables
      // experimentalDecorators (without it @colyseus/schema's @type crashes on startup)
      cwd: path.join(appDir, 'apps/server'),
      // run node directly (not pnpm → tsx → node): PM2 then owns the real server process, so a reload
      // actually stops the old one instead of leaving it holding the port and serving stale code
      script: 'src/index.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      kill_timeout: 5000,
      env: loadEnvFile(path.join(appDir, '.env')),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      // a restart drops every live room, so keep this well above normal use (~2-5 MB per room)
      max_memory_restart: '1536M',
      merge_logs: true,
      time: true,
    },
  ],
};
