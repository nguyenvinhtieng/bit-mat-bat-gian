// Visual check: 2-3 players, start game, capture rooms / popups / meeting. Needs dev servers running.
// node tools/smoke/visual.mjs [what...]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const WEB = process.env.WEB_URL || 'http://localhost:5173';
const OUT = process.env.SHOT_DIR || '/tmp/shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const what = new Set(process.argv.slice(2));
const want = (k) => !what.size || what.has(k);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
async function player(name, w = 1366, h = 800) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(name + ': ' + m.text()));
  await page.goto(WEB);
  await page.waitForSelector('input');
  await page.fill('input', name);
  return page;
}
const p1 = await player('Minh');
await p1.click('.btn.primary.big.wide');
await p1.waitForFunction(() => window.__store?.getState().room?.code);
const code = await p1.evaluate(() => window.__store.getState().room.code);
const others = [];
for (const n of what.has('kill') ? ['Lan', 'Tuấn', 'Hoa', 'Vi'] : ['Lan', 'Tuấn']) {
  const p = await player(n, 900, 600);
  await p.evaluate((c) => window.__net.joinRoom(c, document.querySelector('input').value).catch((e) => console.error('join', e.message)), code);
  await sleep(400);
  await p.waitForFunction(() => window.__store?.getState().room?.code, null, { timeout: 15000 }).catch(async () => console.log('join failed', n, await p.evaluate(() => window.__store.getState().error)));
  others.push(p);
}
await sleep(1500);
const shot = async (name, page = p1) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name); };
const pan = async (tx, ty, zoom) => p1.evaluate(([x, y, z]) => { const cam = window.__game.scene.getScene('game').cameras.main; cam.stopFollow(); if (z) cam.setZoom(z); cam.centerOn(x * 48, y * 48); }, [tx, ty, zoom]);
if (want('rooms')) {
  await shot('lobby');
  const rooms = { courtyard: [21, 4], exhibition: [7.5, 13], coordination: [34.5, 13], editing: [21, 22], archive: [11.5, 28.5], storage: [30.5, 28.5], corridor: [21, 12] };
  for (const [k, [x, y]] of Object.entries(rooms)) { await pan(x, y, 1); await sleep(400); await shot('room-' + k); }
  await pan(21, 16, 0.42); await sleep(400); await shot('overview');
  await p1.evaluate(() => { const s = window.__game.scene.getScene('game'); s.cameras.main.setZoom(1); s.cameras.main.startFollow(s.avatars.get(window.__net.room.sessionId).c); });
}
// start game
if (want('kill')) await p1.evaluate(() => window.__net.send('configure', { quick: true }));
await sleep(200);
await p1.evaluate(() => window.__net.send('start', {}));
await sleep(1200);
if (want('intro')) {
  await shot('intro');
  await p1.evaluate(() => window.__store.getState().set({ introOpen: true, introQuick: true }));
  await sleep(500); await p1.keyboard.press('Escape'); await sleep(900);
  console.log('role card closed by esc:', !(await p1.evaluate(() => window.__store.getState().introOpen)));
}
for (const p of [p1, ...others]) await p.evaluate(() => window.__store.getState().set({ introOpen: false }));
await sleep(600);
if (want('hud')) await shot('hud');
if (want('map')) {
  await p1.keyboard.press('KeyM'); await sleep(700); await shot('map');
  await p1.keyboard.press('Escape'); await sleep(300); console.log('map closed by esc:', !(await p1.$('.mapview')));
  await p1.keyboard.press('KeyT'); await sleep(300); await shot('tasks-collapsed'); await p1.keyboard.press('KeyT');
}
if (want('done')) {
  await p1.evaluate(() => window.__store.getState().set({ task: { taskId: 'task_woodblock_print' }, taskResult: { ok: true, text: 'Lịch đã in xong!', fact: 'Ván mộc bản phải khắc chữ ngược để khi in lên giấy thành chữ xuôi. Mộc bản triều Nguyễn là Di sản tư liệu thế giới (UNESCO, 2009).' } }));
  await sleep(700); await shot('task-done');
  await p1.keyboard.press('Escape'); await sleep(300);
}
if (want('meeting')) {
  // walk the host next to the bell, then ring it
  for (let i = 0; i < 12; i++) {
    const d = await p1.evaluate(() => { const s = window.__game.scene.getScene('game'); return { dx: 21 * 48 - s.pred.x, dy: 3.2 * 48 - s.pred.y }; });
    if (Math.hypot(d.dx, d.dy) < 90) break;
    const k = Math.abs(d.dx) > Math.abs(d.dy) ? (d.dx > 0 ? 'KeyD' : 'KeyA') : (d.dy > 0 ? 'KeyS' : 'KeyW');
    await p1.keyboard.down(k); await sleep(180); await p1.keyboard.up(k);
  }
  await p1.evaluate(() => window.__net.send('emergency', {}));
  await sleep(1500);
  console.log('phase', await p1.evaluate(() => window.__store.getState().room.phase));
  // self vote must be rejected by the server
  await p1.evaluate(() => window.__net.send('vote', { target: window.__net.room.sessionId }));
  await sleep(600);
  console.log('self-vote accepted?', await p1.evaluate(() => window.__store.getState().room.players.find((x) => x.id === window.__net.room.sessionId).voted));
  await shot('meeting');
  await p1.click('.vcard.votable .vcard-hit');
  await sleep(400); await shot('meeting-select');
  await p1.click('.vc-yes');
  await others[0].evaluate(() => { const r = window.__store.getState(); const t = r.room.players.find((x) => x.id !== window.__net.room.sessionId && x.name === 'Tuấn'); window.__net.send('vote', { target: t.id }); });
  await sleep(800); await shot('meeting-voted');
  await p1.evaluate(() => window.__net.send('host:skip', {}));
  await sleep(1200); await shot('reveal-1');
  await sleep(2200); await shot('reveal-2');
}
if (want('kill')) {
  const pages = [p1, ...others];
  await sleep(10500);
  let killer = null;
  for (const p of pages) if (await p.evaluate(() => window.__store.getState().me?.faction === 'killer')) killer = p;
  // try kill until it lands (someone in range)
  for (let i = 0; i < 6; i++) {
    await killer.evaluate(() => window.__net.send('kill', {}));
    await sleep(300);
    if (await killer.evaluate(() => window.__store.getState().cinematic?.kind === 'kill')) break;
    await killer.keyboard.down(i % 2 ? 'KeyA' : 'KeyD'); await sleep(250); await killer.keyboard.up(i % 2 ? 'KeyA' : 'KeyD');
  }
  const witness = pages.find((p) => p !== killer);
  await sleep(1000);
  await shot('kill-cine-1', killer);
  await sleep(450);
  await shot('kill-cine-2', killer);
  for (const p of pages) await p.evaluate(() => window.__store.getState().set({ cinematic: null }));
  // world FX as seen by a living witness
  const live = [];
  for (const p of pages) if (p !== killer && (await p.evaluate(() => window.__store.getState().room.players.find((x) => x.id === window.__net.room.sessionId).alive))) live.push(p);
  await sleep(100);
  await shot('kill-world', live[0] ?? witness);
  // shield: inject the cinematic locally (overlay + in-world FX)
  await p1.evaluate(() => { const s = window.__game.scene.getScene('game'); window.__store.getState().set({ cinematic: { kind: 'shield', actor: { name: 'Hắc Ảnh', color: 0 }, victim: { name: 'Lính', color: 1 }, youAre: 'victim', at: { x: s.pred.x + 40, y: s.pred.y }, id: Date.now() } }); });
  await sleep(1250); await shot('shield-cine', p1);
  await p1.evaluate(() => window.__store.getState().set({ cinematic: null }));
  await sleep(150); await shot('shield-world', p1);
  if (live[0]) {
    await live[0].evaluate(() => window.__net.send('report', {}));
    await sleep(1700); await shot('report-cine', live[0]);
  }
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
