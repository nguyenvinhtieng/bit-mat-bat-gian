// FX visual check: 1 browser player + 4 headless bots; a real kill, report, and an injected shield.
import { chromium } from 'playwright-core';
import { Client } from 'colyseus.js';
const WEB = 'http://localhost:5173', OUT = '/tmp/shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(WEB); await page.waitForSelector('input'); await page.fill('input', 'Minh');
await page.click('.btn.primary.big.wide');
await page.waitForFunction(() => window.__store?.getState().room?.code);
const code = await page.evaluate(() => window.__store.getState().room.code);
const bots = [];
for (const n of ['Lan', 'Tuấn', 'Hoa', 'Vi']) {
  const room = await new Client('ws://localhost:2567').joinById(code, { name: n });
  const b = { room, name: n, me: null, cine: null };
  room.onMessage('private', (m) => (b.me = m));
  room.onMessage('*', () => {});
  bots.push(b);
}
await sleep(800);
await page.evaluate(() => window.__net.send('configure', { quick: true }));
await page.evaluate(() => window.__net.send('start', {}));
await sleep(1000);
await page.evaluate(() => window.__store.getState().set({ introOpen: false }));
await sleep(10500);
const shot0 = (n) => page.screenshot({ path: `${OUT}/${n}.png` }).then(() => console.log('shot', n));
const shot = shot0;
const meKiller = await page.evaluate(() => window.__store.getState().me.faction === 'killer');
console.log('browser is killer:', meKiller);
const killerBot = bots.find((b) => b.me?.faction === 'killer');
if (!meKiller && killerBot) {
  // walk the browser player next to the killer bot
  for (let i = 0; i < 40; i++) {
    const d = await page.evaluate((id) => { const s = window.__game.scene.getScene('game'); const k = s.avatars.get(id); return { dx: k.c.x - s.pred.x, dy: k.c.y - s.pred.y }; }, killerBot.room.sessionId);
    if (Math.hypot(d.dx, d.dy) < 60) break;
    const key = Math.abs(d.dx) > Math.abs(d.dy) ? (d.dx > 0 ? 'KeyD' : 'KeyA') : (d.dy > 0 ? 'KeyS' : 'KeyW');
    await page.keyboard.down(key); await sleep(120); await page.keyboard.up(key);
  }
}
let gotShield = false;
for (let i = 0; i < 30; i++) {
  if (meKiller) await page.evaluate(() => window.__net.send('kill', {}));
  else killerBot.room.send('kill', {});
  await sleep(200);
  const st = await page.evaluate(() => ({ body: window.__store.getState().room.players.some((p) => p.body), shield: window.__store.getState().cinematic?.kind === 'shield' }));
  if (st.shield && !gotShield) { gotShield = true; await sleep(1100); await shot('shield-real'); await sleep(15500); }
  if (st.body) break;
}
await sleep(meKiller ? 1000 : 120); await shot(meKiller ? 'kill-cine-1' : 'kill-world-1');
await sleep(meKiller ? 450 : 250); await shot(meKiller ? 'kill-cine-2' : 'kill-world-2');
await page.evaluate(() => window.__store.getState().set({ cinematic: null }));
await sleep(700); await shot('kill-world-after');
await page.evaluate(() => { const s = window.__game.scene.getScene('game'); window.__store.getState().set({ cinematic: { kind: 'shield', actor: { name: 'Hắc Ảnh', color: 0 }, victim: { name: 'Lính', color: 1 }, youAre: 'victim', at: { x: s.pred.x + 40, y: s.pred.y }, id: Date.now() } }); });
await sleep(1250); await shot('shield-cine');
await page.evaluate(() => window.__store.getState().set({ cinematic: null }));
await sleep(120); await shot('shield-world');
await sleep(600);
// report
const alive = await page.evaluate(() => window.__store.getState().room.players.find((x) => x.id === window.__net.room.sessionId).alive);
if (alive) { await page.evaluate(() => window.__net.send('report', {})); }
else for (const b of bots) b.room.send('report', {});
await sleep(1900); await shot('report-cine');
console.log('errors', errs);
for (const b of bots) b.room.leave();
await browser.close();
