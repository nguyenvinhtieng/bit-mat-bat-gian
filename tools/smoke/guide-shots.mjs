// Guide art: mobile-landscape HUD screenshots (crew / meeting bell / killer) + button pin positions.
// Needs `pnpm dev:server` + `pnpm dev:web`. Roles are random server-side, so the HUD state is
// staged client-side (faction, nearby, killTarget) — only what the screenshot shows changes.
//   node tools/smoke/guide-shots.mjs
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { Client } from 'colyseus.js';
import sharp from 'sharp';

const WEB = process.env.WEB_URL || 'http://localhost:5173';
const WS = process.env.SERVER_URL || 'ws://localhost:2567';
const OUT = new URL('../../apps/web/public/assets/common/ui/guide/', import.meta.url);
const PINS = new URL('../../apps/web/src/ui/guides/hud-pins.json', import.meta.url);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const W = 844, H = 390;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// pin id -> selector (first visible match); a missing one is skipped
const PIN_SEL = {
  joystick: '.joystick',
  tasks: '.task-chip',
  map: '.minimap-btn',
  progress: '.progress',
  clock: '.night-bar',
  role: '.role-card',
  counts: '.alive-count',
  task: '.round-btn.task',
  report: '.round-btn.report',
  bell: '.round-btn.bell',
  kill: '.round-btn.kill',
  sabotage: '.round-btn.sab',
  chat: '.chat-fab, .chat-toggle, .chat-mini',
  tools: '.corner-tools',
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'vi-VN' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(WEB);
await page.waitForSelector('.home-form input');
await page.evaluate(() => localStorage.setItem('tht:lang', 'vi'));
await page.fill('.home-form input', 'Minh');
await page.click('.home-actions .btn.primary');
await page.waitForFunction(() => window.__store?.getState().room?.code);
const code = await page.evaluate(() => window.__store.getState().room.code);
const bots = [];
for (const name of ['Lan', 'Tuấn', 'Hoa', 'Vi']) {
  const room = await new Client(WS).joinById(code, { name });
  room.onMessage('*', () => {});
  bots.push(room);
}
await sleep(800);
await page.evaluate(() => window.__net.send('start', {}));
await page.waitForFunction(() => window.__store.getState().room?.phase === 'explore', null, { timeout: 30000 });
await page.evaluate(() => window.__store.getState().set({ introOpen: false, cinematic: null }));
await sleep(9000); // role reveal / welcome toasts fade out
await page.addStyleTag({ content: '.canh-banner, .toasts, .toast { display: none !important; }' });

const stage = (patch) =>
  page.evaluate((p) => {
    const s = window.__store.getState();
    s.set({ ...p.top, me: { ...s.me, ...p.me }, toasts: [], canh: null });
  }, patch);

async function shot(name) {
  await sleep(700);
  const pins = await page.evaluate((sel) => {
    const out = {};
    for (const [id, q] of Object.entries(sel)) {
      const el = [...document.querySelectorAll(q)].find((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
      });
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[id] = [+(((r.left + r.width / 2) / innerWidth) * 100).toFixed(1), +(((r.top + r.height / 2) / innerHeight) * 100).toFixed(1)];
    }
    return out;
  }, PIN_SEL);
  const png = await page.screenshot();
  await sharp(png).resize(1280).webp({ quality: 78 }).toFile(new URL(`hud-${name}.webp`, OUT).pathname);
  console.log('shot', name, pins);
  return pins;
}

const result = {};
await stage({ me: { faction: 'crew', role: 'villager', mates: [] }, top: { nearby: { kind: 'task', id: 'x', title: 'Nhiệm vụ', done: false }, killTarget: false } });
result.crew = await shot('crew');
await stage({ me: { faction: 'crew', role: 'villager', mates: [] }, top: { nearby: { kind: 'emergency', title: 'Đánh chuông', used: false }, killTarget: false } });
result.bell = await shot('bell');
await stage({ me: { faction: 'killer', role: 'killer', killReadyAt: 0, sabotageReadyAt: 0 }, top: { nearby: { kind: 'task', id: 'x', title: 'Nhiệm vụ', done: false }, killTarget: true } });
result.killer = await shot('killer');

writeFileSync(PINS, JSON.stringify(result, null, 2) + '\n');
for (const b of bots) b.leave();
await browser.close();
process.exit(0);
