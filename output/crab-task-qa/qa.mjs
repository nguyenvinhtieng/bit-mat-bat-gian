import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Isolated real-Hud fixture: no server accounts or game mutations required.
// Portrait gameplay is rotate-gated; narrow portrait checks explicitly remove
// that gate to exercise the task component's responsive layout in isolation.
const out = new URL('./', import.meta.url);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const ids = ['receive_package', 'decode_address', 'prepare_bike', 'plan_route', 'check_seal', 'confirm_recipient', 'pack_disguise'];
async function fixture(page, many = false) {
  await page.evaluate(({ ids, many }) => {
    const tasks = (many ? Array.from({ length: 28 }, (_, i) => ids[i % ids.length]) : ids).map((id, i) => ({ id, done: i === 1 }));
    const player = { id: 'qa-driver', name: 'Tài xế QA', color: 0, ready: true, connected: true, tasksDone: 1, voted: false, voteFor: '', emergencyUsed: false, alive: true, body: false, bodyX: 0, bodyY: 0, micOn: false };
    window.__store.getState().set({ screen: 'room', sessionId: player.id, area: 'archive', pos: { x: 800, y: 1700 }, introOpen: false, task: null, taskResult: null, nearby: null,
      me: { role: 'driver', faction: 'crew', objective: 'QA', tasks },
      room: { code: 'QA4242', mapSlug: 'game', hostId: player.id, isPublic: false, phase: 'explore', phaseEndsAt: 0, progress: 1, progressTarget: 12, nightStartAt: Date.now(), nightPausedAt: 0, nightMin: 10, meetingReason: '', stations: {}, handoffOpen: false, packageState: 'home', packageCarrier: '', packageX: 800, packageY: 1700, tasksPerPlayer: tasks.length, crewAlive: 1, killersAlive: 1, players: [player] },
    });
  }, { ids, many });
}
async function bounds(page, selector) {
  const metrics = await page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  assert(metrics.x >= -1 && metrics.y >= -1 && metrics.right <= metrics.viewportWidth + 1 && metrics.bottom <= metrics.viewportHeight + 1, `${selector} escapes viewport: ${JSON.stringify(metrics)}`);
  assert(metrics.scrollWidth <= metrics.clientWidth + 1, `${selector} overflows horizontally`);
  return metrics;
}
try {
  for (const config of [
    { name: 'desktop', width: 1440, height: 900, touch: false, lang: 'vi' },
    { name: 'landscape', width: 844, height: 390, touch: true, lang: 'vi' },
    { name: 'landscape-en', width: 667, height: 375, touch: true, lang: 'en' },
    { name: 'portrait-component', width: 390, height: 844, touch: true, lang: 'vi' },
    { name: 'narrow-component-en', width: 320, height: 568, touch: true, lang: 'en' },
  ]) {
    const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, hasTouch: config.touch, isMobile: config.touch, locale: config.lang === 'vi' ? 'vi-VN' : 'en-US' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(lang => localStorage.setItem('tht:lang', lang), config.lang);
    await page.goto(process.env.WEB_URL || 'http://localhost:5173');
    await page.waitForFunction(() => !!window.__store);
    await fixture(page);
    if (config.height > config.width) {
      await page.locator('.rotate-gate').waitFor({ state: 'visible' });
      await page.addStyleTag({ content: '.rotate-gate { display: none !important; } #root > *, .game-root > * { visibility: visible !important; }' });
    }
    if (config.touch) {
      await page.locator('.crab-task-chip').click();
    }
    const board = page.locator('.crab-dispatch');
    await board.waitFor({ state: 'visible' });
    await page.waitForTimeout(600);
    const geometry = await bounds(page, '.crab-dispatch');
    assert.equal(await board.locator('li').count(), ids.length + 1);
    assert.equal(await board.locator('li.done').count(), 1, 'completed row missing');
    assert.equal(await board.locator('li.locked').count(), 1, 'locked handoff missing');
    assert((await board.locator('li.here').count()) > 0, 'current-area rows missing');
    assert((await board.locator('li:not(.done):not(.here):not(.locked)').count()) > 0, 'pending rows missing');
    assert((await page.request.get(new URL('/assets/maps/common/ui/saigon/crab-dispatch.svg', page.url()).href)).ok(), 'dispatch SVG missing');
    const broken = await page.locator('.crab-dispatch img, .crab-task-chip img').evaluateAll(images => images.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src));
    assert.deepEqual(broken, [], 'broken task assets');
    if (config.name !== 'landscape-en') await page.screenshot({ path: new URL(`${config.name}-board.png`, out).pathname });
    if (!config.touch) {
      await page.keyboard.press('t');
      await board.waitFor({ state: 'hidden' });
      await bounds(page, '.crab-task-chip');
      await page.keyboard.press('t');
      await board.waitFor({ state: 'visible' });
      await page.locator('.task-head').click();
      await page.locator('.crab-task-chip').click();
      await board.waitFor({ state: 'visible' });
    } else {
      await page.keyboard.press('Escape');
      await board.waitFor({ state: 'hidden' });
      await page.locator('.crab-task-chip').click();
      await page.locator('.task-pop-x').click();
      await board.waitFor({ state: 'hidden' });
      await page.locator('.crab-task-chip').click();
      await page.locator('.task-pop-backdrop').click({ position: { x: 2, y: 2 } });
      await board.waitFor({ state: 'hidden' });
      await page.locator('.crab-task-chip').click();
      await page.locator('.task-pop-map').click();
      await page.locator('.mapview').waitFor({ state: 'visible' });
      await board.waitFor({ state: 'hidden' });
      await page.keyboard.press('Escape');
      await page.locator('.mapview').waitFor({ state: 'hidden' });
      await page.locator('.crab-task-chip').click();
    }
    await fixture(page, true);
    await board.waitFor({ state: 'visible' });
    await bounds(page, '.crab-dispatch');
    const scrolling = await board.locator('ul').evaluate(el => {
      const previous = el.scrollTop;
      el.scrollTop = el.scrollHeight;
      return { moved: el.scrollTop > previous, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
    });
    assert(scrolling.moved, `long task list does not scroll: ${JSON.stringify(scrolling)}`);
    await page.evaluate(() => {
      const s = window.__store.getState();
      s.set({ room: { ...s.room, handoffOpen: true }, me: { ...s.me, faction: 'killer', role: 'undercover' } });
    });
    assert.equal(await board.locator('li.locked').count(), 0, 'handoff remained locked');
    await board.locator('.task-note').waitFor({ state: 'visible' });
    await bounds(page, '.crab-dispatch');
    assert.deepEqual(errors, [], `${config.name} browser errors`);
    results.push({ ...config, geometry, scrolling, errors });
    await context.close();
  }
  await fs.writeFile('/tmp/crab-task-qa-results.json', `${JSON.stringify(results, null, 2)}\n`);
  console.log(`PASS ${results.length} viewport/language cases; four screenshots in ${out.pathname}; results /tmp/crab-task-qa-results.json`);
} finally {
  await browser.close();
}
