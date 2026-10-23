/** UI regression/visual coverage for every mini game. Run: pnpm exec tsx tools/smoke/minigames.ts */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GAME_CONTENT } from '../../apps/server/src/content/game/index';
import sharp from 'sharp';
import { GAME_SKIN, TASK_IDS, type TaskId, type LotBike } from '@hidden-truth/shared';

const visualOnly = process.argv.includes('--visual-only');
const out = 'output/minigames-v3';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const failures: string[] = [];
const results: unknown[] = [];
const fixtures = TASK_IDS.map((id) => GAME_CONTENT.buildTask(id)!);
const page = await browser.newPage();
page.setDefaultTimeout(8000);
await page.addInitScript('window.__name = (value) => value; localStorage.setItem("tht:lang", "vi")');
await page.goto('http://127.0.0.1:5173');
await page.evaluate(async () => {
  const w = window as any;
  const reactModule = await import('/node_modules/.vite/deps/react.js');
  const React = reactModule.default ?? reactModule;
  const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { createRoot } = domModule.default ?? domModule;
  const { Minigame } = await import('/src/ui/minigames/index.tsx');
  const { useLang } = await import('/src/i18n.ts');
  useLang.setState({ lang: 'vi' });
  const { Modal } = await import('/src/ui/common.tsx');
  const app = document.getElementById('root');
  if (app) app.style.display = 'none';
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  w.answers = [];
  w.renderGame = (task: any) => {
    w.answers = [];
    root.render(React.createElement(Modal, { title: task._title ?? task.taskId, wide: true, className: 'task-modal', key: Math.random() },
      React.createElement('div', { className: `minigame mg-task mg-${task.taskId}` },
        React.createElement('div', { className: 'minigame-inner' }, React.createElement(Minigame, { task, submit: (a: unknown) => w.answers.push(a) })))));
  };
  w.unmountGame = () => root.render(null);
});
async function render(data: any) {
  await page.evaluate((d) => (window as any).renderGame(d), { ...data, _title: GAME_SKIN.stations.find((s) => s.id === data.taskId)?.title });
  await page.waitForSelector('.mg-col');
  await page.evaluate(async () => { await Promise.all([...document.querySelectorAll('.modal, .modal-backdrop')].flatMap((el) => el.getAnimations().map((animation) => animation.finished.catch(() => {})))); });
  await page.evaluate(async () => { await Promise.all([...document.images].map((i) => i.decode().catch(() => {}))); });
}
async function until(fn: () => Promise<boolean>, timeout = 8000) {
  const start = Date.now();
  while (!(await fn())) { if (Date.now() - start > timeout) throw new Error('interaction condition timed out'); await page.waitForTimeout(20); }
}
async function clickText(text: string) { await page.getByRole('button', { name: text, exact: true }).click(); }
async function holdButton(selector: string, ms: number) {
  await page.locator(selector).focus(); await page.keyboard.down('Space'); await page.waitForTimeout(ms); await page.keyboard.up('Space');
}
function solveLot(d: any) {
  const sig = (bs: LotBike[]) => bs.map((b) => `${b.x},${b.y}`).join('|');
  const queue = [{ bs: d.bikes as LotBike[], moves: [] as { id: string; d: number }[] }];
  const seen = new Set([sig(d.bikes)]);
  for (let at = 0; at < queue.length; at++) {
    const { bs, moves } = queue[at];
    if (bs.some((b) => b.mine && b.x + b.len === d.w)) return moves;
    bs.forEach((b, i) => {
      const occupied = new Set(bs.flatMap((v, j) => j === i ? [] : Array.from({ length: v.len }, (_, k) => v.dir === 'h' ? `${v.x + k},${v.y}` : `${v.x},${v.y + k}`)));
      for (const direction of [-1, 1]) {
        const n = { ...b, x: b.x + (b.dir === 'h' ? direction : 0), y: b.y + (b.dir === 'v' ? direction : 0) };
        if (Array.from({ length: n.len }, (_, k) => [n.x + (n.dir === 'h' ? k : 0), n.y + (n.dir === 'v' ? k : 0)]).some(([x, y]) => x < 0 || y < 0 || x >= d.w || y >= d.h || occupied.has(`${x},${y}`))) continue;
        const next = bs.map((v, j) => j === i ? n : v);
        if (seen.has(sig(next))) continue;
        seen.add(sig(next)); queue.push({ bs: next, moves: [...moves, { id: b.id, d: direction }] });
      }
    });
  }
  throw new Error('parking fixture unsolvable');
}
async function interact(task: any) {
  switch (task.taskId as TaskId) {
    case 'pack_cooler':
      for (const item of task.items) {
        await page.locator('.ck-item').filter({ hasText: item.name }).click();
        await page.locator(`.ck-slot.${item.need}:not(:has(img))`).first().click();
      }
      break;
    case 'dodge_sellers':
      for (let i = 0; i < task.sellers.length; i++) { await page.waitForTimeout(700); await page.locator('.ck-swipe-row button').first().click(); }
      await page.waitForTimeout(700); await page.locator('.ck-seller-actions button').last().click(); break;
    case 'brew_coffee':
      for (const target of [task.milk, task.coffee]) {
        await page.locator('.ck-hold').focus(); await page.keyboard.down('Space');
        await until(async () => Number(await page.locator('[role=meter]').getAttribute('aria-valuenow')) >= (target[0] + 0.025) * 100);
        await page.keyboard.up('Space');
      }
      break;
    case 'wifi_hunt': {
      const box = (await page.locator('.ck-room').boundingBox())!;
      await page.mouse.move(box.x + box.width * task.spot.x, box.y + box.height * task.spot.y); await page.mouse.down(); await page.mouse.up(); break;
    }
    case 'pump_tyre':
      for (let i = 0; i < Math.ceil(task.green[0] / task.perStroke); i++) await page.locator('.ck-swipe-row button').first().click();
      await page.locator('.ck-swipe-row .go').click(); break;
    case 'patch_tube':
      for (let section = 1; section < task.sections - 1; section++) {
        if (task.leaks.includes(section)) await page.locator('.ck-swipe-row .go').click();
        if (section >= Math.max(...task.leaks)) break;
        if (section < task.sections - 2) await page.locator('.ck-swipe-row button').last().click();
      }
      break;
    case 'tape_box':
      for (let i = 0; i < task.laps * 8 + 1; i++) {
        const button = page.locator('.ck-swipe-row button');
        if (await button.isDisabled()) break;
        await button.click();
      }
      break;
    case 'stack_rack':
      await page.locator('.ck-swipe-row .go').click();
      for (let i = 0; i < task.boxes.length; i++) {
        await until(async () => page.locator('.ck-crate.swing').evaluate((el) => {
          const r = el as HTMLElement; const stage = r.parentElement!; return Math.abs(r.offsetLeft + r.offsetWidth / 2 - stage.clientWidth / 2) < 12;
        }));
        await page.locator('.ck-swipe-row .go').click(); await page.waitForTimeout(220);
      }
      break;
    case 'unpark_bike': {
      const moves = solveLot(task);
      for (const move of moves) {
        const index = task.bikes.findIndex((b: LotBike) => b.id === move.id);
        const bike = task.bikes[index];
        await page.locator('.ck-lotbike').nth(index).focus();
        await page.keyboard.press(bike.dir === 'h' ? move.d > 0 ? 'ArrowRight' : 'ArrowLeft' : move.d > 0 ? 'ArrowDown' : 'ArrowUp');
      }
      break;
    }
    case 'find_ticket':
      for (let i = 0; i <= task.items.findIndex((item: any) => item.kind === 've-xe'); i++) await page.locator('.ck-hold').click();
      break;
    case 'dodge_potholes':
      await page.locator('.ck-start').click();
      // Read displayed obstacle positions; steer away only when a hazard approaches the rider.
      await until(async () => {
        if (await page.locator('.ck-start').count()) throw new Error('runner collision');
        const decision = await page.evaluate(() => {
          const rider = document.querySelector('.ck-rider') as HTMLElement;
          const hazards = [...document.querySelectorAll('.ck-hazard')] as HTMLElement[];
          const near = hazards.find((h) => parseFloat(h.style.top) > 55 && parseFloat(h.style.top) < 80 && h.style.left === rider.style.left);
          if (!near) return null;
          return parseFloat(rider.style.left) > 50 ? 'ArrowLeft' : 'ArrowRight';
        });
        if (decision) await page.keyboard.press(decision);
        return (await page.evaluate(() => (window as any).answers.length)) > 0;
      }, task.duration + 4000);
      break;
    case 'handoff_package':
      await holdButton('.ck-bell', task.ringMs + 100);
      await until(async () => page.locator('.ck-viewfinder img').evaluate((el) => Math.abs(parseFloat((el as HTMLElement).style.transform.match(/translateX\(([-.\d]+)/)?.[1] ?? '100')) < 8));
      await page.locator('.ck-hold').click();
      await page.locator('.ck-slide').focus(); await page.keyboard.press('End');
      await page.locator('.ck-slide').dispatchEvent('pointercancel');
      assert.equal(await page.locator('.ck-slide').getAttribute('aria-valuenow'), '0', 'cancel must reset confirmation');
      assert.equal(await page.evaluate(() => (window as any).answers.length), 0);
      await page.keyboard.press('End'); await page.keyboard.press('Enter'); break;
  }
}
try {
  for (const [size, viewport] of Object.entries({ desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 }, ...(visualOnly ? { tiny: { width: 320, height: 740 }, landscape: { width: 844, height: 390 } } : {}) })) {
    await page.setViewportSize(viewport);
    for (const built of fixtures) {
      const task = built.data;
      try {
        await render(task);
        await page.screenshot({ path: `${out}/${size}-${task.taskId}.png`, fullPage: true });
        const issues = await page.evaluate(() => {
          const root = document.querySelector('.task-modal')!;
          const missing = [...root.querySelectorAll('img')].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src);
          const outside = [...root.querySelectorAll('button, .ck-lot, .ck-basin, .ck-rack, .ck-room, .ck-tape')].filter((el) => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).map((el) => el.className);
          return { missing, outside };
        });
        assert.deepEqual(issues, { missing: [], outside: [] }, `${task.taskId} layout/assets`);
        if (visualOnly) { results.push({ size, taskId: task.taskId, visual: true }); console.log(`PASS visual ${size} ${task.taskId}`); continue; }
        await interact(task);
        await until(async () => (await page.evaluate(() => (window as any).answers.length)) > 0);
        await page.screenshot({ path: `${out}/${size}-${task.taskId}-complete.png`, fullPage: true });
        assert.deepEqual(await page.locator('.task-modal img').evaluateAll((images) => images.filter((i) => !(i as HTMLImageElement).naturalWidth).map((i) => (i as HTMLImageElement).src)), [], 'completed-phase art loads');
        const answers = await page.evaluate(() => (window as any).answers);
        assert.equal(answers.length, 1, 'exactly one submission');
        assert.ok(GAME_CONTENT.verifyTask({ taskId: task.taskId, expected: built.expected, minMs: built.minMs, openedAt: Date.now() - 60000 }, answers[0]), `${task.taskId} server verification`);
        results.push({ size, taskId: task.taskId, pass: true });
        console.log(`PASS ${size} ${task.taskId}`);
      } catch (error) {
        const failure = `${size} ${task.taskId}: ${(error as Error).message}`; failures.push(failure); console.log(`FAIL ${failure}`);
        await page.screenshot({ path: `${out}/${size}-${task.taskId}-failure.png`, fullPage: true });
      }
    }
  }
  // A successful fast task must never submit after closing its component.
  if (!visualOnly) {
  const pump = fixtures.find((f) => f.data.taskId === 'pump_tyre')!;
  await render(pump.data); await interact(pump.data);
  await page.evaluate(() => (window as any).unmountGame()); await page.waitForTimeout(3500);
  assert.equal(await page.evaluate(() => (window as any).answers.length), 0, 'unmount cancels delayed submission');
  results.push({ regression: 'unmount cancels pending submit', pass: true });
  }
} finally {
  await browser.close();
  fs.writeFileSync(`${out}/${visualOnly ? 'visual-results' : 'results'}.json`, JSON.stringify({ results, failures }, null, 2));
}
if (!failures.length) {
  for (const file of fs.readdirSync(out).filter((name) => name.endsWith('-failure.png'))) fs.unlinkSync(`${out}/${file}`);
  for (const [size, columns, width, height] of [['desktop', 3, 426, 300], ['mobile', 4, 234, 506]] as const) {
    const tiles = await Promise.all(fixtures.map(async ({ data }, i) => ({ input: await sharp(`${out}/${size}-${data.taskId}.png`).resize(width, height, { fit: 'contain', background: '#07181a' }).png().toBuffer(), left: (i % columns) * width, top: Math.floor(i / columns) * height })));
    await sharp({ create: { width: columns * width, height: Math.ceil(fixtures.length / columns) * height, channels: 4, background: '#07181a' } }).composite(tiles).png().toFile(`${out}/${size}-contact-sheet.png`);
  }
}
assert.deepEqual(failures, [], 'all mini games must pass');
console.log(`PASS ${results.length} browser checks`);
