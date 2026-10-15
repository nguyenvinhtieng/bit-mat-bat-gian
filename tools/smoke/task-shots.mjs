// Screenshots every mini-game (task data built by the server content module, injected into the store).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const TASKS = JSON.parse(fs.readFileSync(process.env.TASKS || '/tmp/pt/tasks.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const only = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 800) }, locale: 'vi-VN' });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://localhost:5173'); await p.waitForSelector('input'); await p.fill('input', 'Minh');
await p.click('.btn.primary.big.wide'); await p.waitForFunction(() => window.__store?.getState().room?.code);
await p.evaluate(() => window.__net.send('start', {})); await sleep(1200);
await p.evaluate(() => window.__store.getState().set({ introOpen: false })); await sleep(500);
for (const [id, t] of Object.entries(TASKS)) {
  if (only.length && !only.some((o) => id.includes(o))) continue;
  await p.evaluate((d) => window.__store.getState().set({ task: d, taskResult: null }), t.data);
  await sleep(1600);
  await p.screenshot({ path: `/tmp/shots/mg-${id}.png` });
  console.log('shot', id);
}
await p.evaluate(() => window.__store.getState().set({ task: null }));
console.log('errors', errs);
await b.close();
