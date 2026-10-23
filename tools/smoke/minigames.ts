/** UI regression/visual coverage for every mini game. Run: pnpm exec tsx tools/smoke/minigames.ts */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { GAME_CONTENT } from '../../apps/server/src/content/game/index';
import sharp from 'sharp';
import { GAME_SKIN, TASK_IDS, type TaskId, type LotBike } from '@hidden-truth/shared';

const visualOnly = process.argv.includes('--visual-only');
const taskFilter = process.argv.find((arg) => arg.startsWith('--tasks='))?.slice(8).split(',');
const out = process.env.MINIGAME_OUT || '/tmp/the-hidden-truth-minigames';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const failures: string[] = [];
const results: unknown[] = [];
const fixtures = TASK_IDS.filter((id) => !taskFilter || taskFilter.includes(id)).map((id) => GAME_CONTENT.buildTask(id)!);
assert.ok(fixtures.length, 'requested mini games exist');
const page = await browser.newPage();
page.setDefaultTimeout(8000);
await page.addInitScript('window.__name = (value) => value; localStorage.setItem("tht:lang", "vi")');
await page.goto(process.env.MINIGAME_URL || 'http://127.0.0.1:5173');
await page.evaluate(async () => {
  const w = window as any;
  const reactModule = await import('/node_modules/.vite/deps/react.js');
  const React = reactModule.default ?? reactModule;
  const domModule = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { createRoot } = domModule.default ?? domModule;
  const { Minigame } = await import('/src/ui/minigames/index.tsx');
  const { useLang } = await import('/src/i18n.ts');
  useLang.setState({ lang: 'vi' });
  const { CloseButton } = await import('/src/ui/common.tsx');
  const app = document.getElementById('root');
  if (app) app.style.display = 'none';
  // A visible world surrogate makes opaque game surfaces obvious in screenshots.
  Object.assign(document.body.style, {
    backgroundColor: '#263e37',
    backgroundImage: 'linear-gradient(90deg, transparent 47%, #b59d70 47%, #b59d70 53%, transparent 53%), linear-gradient(transparent 47%, #b59d70 47%, #b59d70 53%, transparent 53%)',
    backgroundSize: '240px 180px',
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  w.answers = [];
  w.renderGame = (task: any) => {
    w.answers = [];
    root.render(React.createElement('div', { role: 'dialog', 'aria-modal': true, 'aria-label': task._title ?? task.taskId, className: 'task-screen task-modal', key: Math.random() },
      React.createElement(CloseButton, { className: 'task-screen-x', onClick: () => root.render(null), label: 'Đóng' }),
      React.createElement('div', { className: `minigame mg-task mg-${task.taskId}` },
        React.createElement('div', { className: 'minigame-inner' }, React.createElement(Minigame, { task, submit: (a: unknown) => w.answers.push(a) })))));
  };
  w.unmountGame = () => root.render(null);
});
async function render(data: any) {
  await page.evaluate((d) => (window as any).renderGame(d), { ...data, _title: GAME_SKIN.stations.find((s) => s.id === data.taskId)?.title });
  await page.waitForSelector('.mg-col');
  await page.locator('.task-screen').evaluate(async (el) => { await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => {}))); });
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
        const source = (await page.locator('.ck-item').filter({ hasText: item.name }).boundingBox())!;
        const target = (await page.locator(`.ck-slot.${item.need}:not(:has(img))`).first().boundingBox())!;
        await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
        await page.mouse.down();
        await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 });
        await page.mouse.up();
      }
      break;
    case 'connect_wires': {
      const dragWire = async (from: string, to: string, side: 'left' | 'right' = 'left') => {
        const start = (await page.locator(`.ck-wire-end[data-side="${side}"][data-color="${from}"]`).boundingBox())!;
        const end = (await page.locator(`.ck-wire-end[data-side="${side === 'left' ? 'right' : 'left'}"][data-color="${to}"]`).boundingBox())!;
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 12 });
        await page.mouse.up();
      };
      await dragWire(task.left[0], task.left[1]);
      assert.equal(await page.evaluate(() => (window as any).answers.length), 0, 'a wrong colour does not complete wiring');
      await dragWire(task.right[0], task.right[1], 'right');
      assert.equal(await page.locator('.mg-chip').innerText(), '0/4', 'wrong colours from either side stay disconnected');
      for (const [i, color] of task.left.entries()) {
        await dragWire(color, color, i % 2 === 0 ? 'right' : 'left');
        assert.equal(await page.locator('.mg-chip').innerText(), `${i + 1}/4`, 'each direction connects a matching pair');
      }
      break;
    }
    case 'untangle_charger': {
      const box = (await page.locator('.ck-cable-hit').boundingBox())!;
      await page.mouse.move(box.x + box.width * .16, box.y + box.height * .8);
      await page.mouse.down();
      for (const peg of task.pegs) {
        await page.mouse.move(box.x + box.width * peg.x, box.y + box.height * peg.y, { steps: 10 });
      }
      assert.equal(await page.evaluate(() => (window as any).answers.length), 0, 'freeing the cable alone does not charge the phone');
      await page.mouse.move(box.x + box.width * task.phone.x, box.y + box.height * task.phone.y, { steps: 10 });
      await page.mouse.up();
      break;
    }
    case 'stuck_shutter': {
      const handle = page.getByRole('slider', { name: 'Tay nắm cửa cuốn' });
      const scene = page.locator('.ck-quiet-scene');
      const grip = (await handle.boundingBox())!, frame = (await page.locator('.ck-shutter-frame').boundingBox())!;
      const x = grip.x + grip.width / 2, y = grip.y + grip.height / 2;
      await page.mouse.move(x, y); await page.mouse.down();
      try {
        for (let step = 1; step <= 60 && await scene.getAttribute('data-alarm') !== 'true'; step++) {
          await page.mouse.move(x, y - frame.height * .87 * step / 50);
          await page.waitForTimeout(16);
        }
      } finally {
        await page.mouse.up();
      }
      assert.equal(await scene.getAttribute('data-alarm'), 'true', 'fast pulling wakes the neighbor');
      assert.equal(await page.evaluate(() => (window as any).answers.length), 0, 'alarm cannot submit a solution');
      const loud = Number(await scene.getAttribute('data-noise'));
      await page.screenshot({ path: `${out}/${page.viewportSize()!.width > 480 ? 'desktop' : 'mobile'}-stuck_shutter-alarm.png`, fullPage: true });
      await until(async () => await scene.getAttribute('data-alarm') === 'false');
      assert.ok(Number(await scene.getAttribute('data-noise')) < loud, 'waiting cools the noise');
      await handle.focus();
      await page.keyboard.down('ArrowUp');
      try {
        await until(async () => (await page.evaluate(() => (window as any).answers.length)) > 0, 12000);
      } finally {
        await page.keyboard.up('ArrowUp');
      }
      assert.equal(Number(await handle.getAttribute('aria-valuenow')), 100, 'quiet lift opens the door');
      break;
    }
    case 'tune_antenna':
      for (let i = 0; i < task.target.length; i++) {
        if (page.viewportSize()!.width > 480) {
          const arm = page.getByRole('slider', { name: `Nhánh anten ${i + 1}` });
          const box = (await arm.boundingBox())!;
          const pivot = (await page.locator('.ck-antenna-arms').boundingBox())!;
          const angle = task.target[i] * Math.PI / 180;
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down();
          await page.mouse.move(pivot.x - Math.cos(angle) * 65, pivot.y - Math.sin(angle) * 65, { steps: 12 });
          await page.mouse.up();
          assert.equal(Number(await arm.getAttribute('aria-valuenow')), task.target[i], 'drag rotates the antenna to the pointer');
        } else {
          await page.getByTestId(`antenna-${i}`).focus();
          await page.keyboard.press('Home');
          for (let step = 0; step < task.target[i]; step++) await page.keyboard.press('ArrowRight');
        }
      }
      break;
    case 'water_pipes':
      for (let i = 0; i < task.rotations.length; i++) {
        const turns = (task.solution[i] - task.rotations[i] + 4) % 4;
        for (let turn = 0; turn < turns; turn++) await page.getByTestId(`pipe-${i}`).click();
      }
      break;
    case 'brew_coffee':
      for (const target of [task.milk, task.coffee]) {
        await page.locator('.ck-hold').focus(); await page.keyboard.down('Space');
        await until(async () => Number(await page.locator('[role=meter]').getAttribute('aria-valuenow')) >= (target[0] + 0.025) * 100);
        await page.keyboard.up('Space');
      }
      break;
    case 'wifi_hunt': {
      const bar = page.locator('.ck-phone .ck-bars i').first();
      assert.equal(await bar.evaluate(el => getComputedStyle(el).position), 'static', 'Wi-Fi bars are not overridden by charger styles');
      assert.equal(await bar.evaluate(el => parseFloat(getComputedStyle(el).width)), 4, 'Wi-Fi bars remain distinct');
      assert.equal(await page.locator('.ck-room .ck-phone').evaluate(el => getComputedStyle(el).transitionDuration), '0s', 'phone follows the pointer without transition lag');
      const box = (await page.locator('.ck-room').boundingBox())!;
      const x = box.x + box.width * task.spot.x;
      const y = box.y + box.height * task.spot.y;
      if (page.viewportSize()!.width <= 480) {
        const touch = await page.context().newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width * .3, y: box.y + box.height * .3 + 76 }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 76 }] });
        await until(async () => {
          const phone = (await page.locator('.ck-phone-device').boundingBox())!;
          const center = (await page.locator('.ck-room .ck-phone').boundingBox())!;
          const expectedX = box.x + 4 + Math.max(36, Math.min(box.width - 44, (box.width - 8) * task.spot.x));
          const expectedY = box.y + 4 + Math.max(56, Math.min(box.height - 68, (box.height - 8) * task.spot.y));
          return phone.y + phone.height < y + 76 && Math.abs(center.x + center.width / 2 - expectedX) < 8 && Math.abs(center.y + center.height / 2 - expectedY) < 8;
        });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      } else {
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up();
      }
      break;
    }
    case 'pump_tyre': {
      const btn = page.locator('.ck-pump-btn');
      const box = (await btn.boundingBox())!;
      const psi = () => page.locator('.ck-psi').textContent().then((v) => parseInt(v ?? '0', 10));
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      while ((await psi()) < task.green[0] + 1) {
        await page.mouse.down();
        await page.waitForFunction((lo) => parseInt(document.querySelector('.ck-psi')?.textContent ?? '0', 10) >= lo || !!document.querySelector('.ck-pump-btn.hot'), task.green[0] + 1);
        await page.mouse.up();
        if (await btn.isDisabled()) break;
        await page.waitForFunction(() => !document.querySelector('.ck-pump-btn.hot'));
      }
      break;
    }
    case 'patch_tube':
      for (let section = 1; section < task.sections - 1; section++) {
        if (task.leaks.includes(section)) await page.locator('.ck-swipe-row .go').click();
        if (section >= Math.max(...task.leaks)) break;
        if (section < task.sections - 2) await page.locator('.ck-swipe-row button').last().click();
      }
      break;
    case 'tape_box': {
      const box = (await page.locator('.ck-pack').boundingBox())!;
      const drag = async (x: number, y: number, ex: number, ey: number) => {
        await page.mouse.move(box.x + x / 360 * box.width, box.y + y / 300 * box.height);
        await page.mouse.down();
        await page.mouse.move(box.x + ex / 360 * box.width, box.y + ey / 300 * box.height, { steps: 12 });
        await page.mouse.up();
      };
      await drag(45, 145, 80, 145);
      assert.equal(await page.locator('.mg-chip').innerText(), '0/4', 'partial flap resets');
      await drag(45, 145, 150, 145);
      await drag(315, 145, 210, 145);
      await drag(180, 80, 180, 255);
      assert.equal(await page.evaluate(() => (window as any).answers.length), 0, 'seam alone does not finish packing');
      await drag(80, 168, 280, 168);
      break;
    }
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
      assert.equal(await page.locator('.ck-swipe-row').count(), 0, 'parking has no bottom controls');
      const moves = solveLot(task);
      for (const move of moves) {
        const index = task.bikes.findIndex((b: LotBike) => b.id === move.id);
        const bike = task.bikes[index];
        await page.locator('.ck-lotbike').nth(index).focus();
        await page.keyboard.press(bike.dir === 'h' ? move.d > 0 ? 'ArrowRight' : 'ArrowLeft' : move.d > 0 ? 'ArrowDown' : 'ArrowUp');
      }
      break;
    }
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
  for (const [size, viewport] of Object.entries({ desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 }, ...(visualOnly ? { tiny: { width: 320, height: 740 }, compact: { width: 360, height: 640 }, landscape: { width: 844, height: 390 }, shortLandscape: { width: 667, height: 375 } } : {}) })) {
    await page.setViewportSize(viewport);
    for (const built of fixtures) {
      const task = built.data;
      try {
        await render(task);
        await page.screenshot({ path: `${out}/${size}-${task.taskId}.png`, fullPage: true });
        const issues = await page.evaluate(() => {
          const root = document.querySelector('.task-modal')!;
          const missing = [...root.querySelectorAll('img')].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src);
          const outside = [...root.querySelectorAll('button, .ck-lot, .ck-basin, .ck-rack, .ck-room, .ck-tape')].filter((el) => { const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1; }).map((el) => el.className);
          const clipped = [...root.querySelectorAll('.ck-water-basin, .ck-phone, .ck-shutter-handle')].filter((el) => {
            const scene = el.closest('.ck-errand');
            if (!scene) return false;
            const r = el.getBoundingClientRect(), bounds = scene.getBoundingClientRect();
            return r.left < bounds.left - 1 || r.right > bounds.right + 1 || r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1;
          }).map((el) => el.className);
          const surfaces = [root, ...root.querySelectorAll('.minigame-inner, .ck-room, .ck-alley, .ck-rack, .ck-lot, .ck-door')];
          const opaque = surfaces.flatMap((el) => {
            const style = getComputedStyle(el);
            const problems: string[] = [];
            if (el === root) {
              if (style.backgroundColor !== 'rgba(238, 230, 209, 0.5)') problems.push('expected light 50% backdrop');
            } else if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') problems.push('backgroundColor');
            if (!el.classList.contains('ck-lot') && style.backgroundImage !== 'none') problems.push('backgroundImage');
            if (style.backdropFilter !== 'none' || !['none', ''].includes(style.getPropertyValue('-webkit-backdrop-filter'))) problems.push('backdropFilter');
            return problems.map((property) => `${el.className}: ${property}`);
          });
          const scroll = [root, ...root.querySelectorAll('.minigame, .minigame-inner, .mg-col, .mg-play')].filter(el => {
            const style = getComputedStyle(el);
            return /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1;
          }).map(el => el.className);
          return { missing, outside, clipped, opaque, scroll };
        });
        try {
          assert.deepEqual(issues, { missing: [], outside: [], clipped: [], opaque: [], scroll: [] }, `${task.taskId} layout/assets/transparency`);
        } catch (error) {
          // Keep checking interaction/server answers even when a shared layout regression exists.
          failures.push(`${size} ${task.taskId}: ${(error as Error).message}`);
          console.log(`FAIL layout ${size} ${task.taskId}: ${JSON.stringify(issues)}`);
        }
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
  if (!visualOnly && fixtures.some((fixture) => fixture.data.taskId === 'pump_tyre')) {
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
