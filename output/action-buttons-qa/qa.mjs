import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const out = new URL('./', import.meta.url);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
const errors = [];
const artwork = new Set();
try {
  for (const [width, height] of [[1440, 900], [844, 390], [667, 375], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1000, isMobile: width < 1000 });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.WEB_URL || 'http://localhost:5176');
    await page.waitForFunction(() => !!window.__store);
    await page.addStyleTag({ content: '.rotate-gate{display:none!important} #root>*,.game-root>*{visibility:visible!important}' });
    for (const role of ['driver', 'veteran_driver', 'undercover']) {
      for (const kind of ['task', 'emergency', 'report']) {
        await page.evaluate(({ role, kind }) => {
          const player = { id: 'qa-driver', name: 'Tài xế QA', color: 0, ready: true, connected: true, tasksDone: 1, voted: false, voteFor: '', emergencyUsed: false, alive: true, body: false, bodyX: 0, bodyY: 0, micOn: false };
          window.__store.getState().set({ screen: 'room', sessionId: player.id, area: 'archive', pos: { x: 800, y: 1700 }, introOpen: false, task: null, taskResult: null, inspectOpen: false, arrestTarget: true,
            nearby: { kind, id: 'receive_package', title: 'Làm nhiệm vụ', done: false, used: false },
            me: { role, faction: role === 'undercover' ? 'killer' : 'crew', objective: 'QA', tasks: [{ id: 'receive_package', done: false }], inspectLeft: true, arrestReadyAt: 0 },
            room: { code: 'QA4242', mapSlug: 'game', hostId: player.id, isPublic: false, phase: 'explore', phaseEndsAt: 0, progress: 1, progressTarget: 12, nightStartAt: Date.now(), nightPausedAt: 0, nightMin: 10, meetingReason: '', stations: {}, handoffOpen: false, packageState: 'carried', packageCarrier: player.id, packageX: 800, packageY: 1700, tasksPerPlayer: 1, crewAlive: 1, killersAlive: 1, players: [player] } });
        }, { role, kind });
        await page.locator('.action-bar.cluster').waitFor();
        await page.waitForTimeout(100);
        await page.evaluate(async () => {
          const url = getComputedStyle(document.querySelector('.action-art')).backgroundImage.slice(5, -2);
          const img = new Image(); img.src = url; await img.decode();
          if (img.naturalWidth < 4 || img.naturalHeight < 2) throw new Error('Invalid chibi atlas dimensions');
        });
        const metrics = await page.evaluate(() => {
          const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
          const buttons = [...document.querySelectorAll('.action-bar.cluster > button')].map(el => {
            const label = el.querySelector('em');
            const style = label ? getComputedStyle(label) : null;
            const labelVisible = !!label && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && label.getBoundingClientRect().width > 0;
            const img = el.querySelector('img.action-art, .action-art img, img');
            const href = el.querySelector('.action-art use')?.getAttribute('href');
            const painted = el.querySelector('span.action-art');
            const paint = painted ? getComputedStyle(painted) : null;
            return { cls: el.className, ...rect(el), labelVisible, label: labelVisible ? rect(label) : null, art: img?.src || href || (paint?.backgroundImage + '@' + paint?.backgroundPosition), loaded: img ? img.complete && img.naturalWidth > 0 : !!href || !!paint?.backgroundImage?.includes('actions-chibi.webp') };
          });
          const joystick = document.querySelector('.joystick');
          return { buttons, joystick: joystick ? rect(joystick) : null };
        });
        const failures = [];
        const overlap = (a, b) => !!a && !!b && Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
        for (const [i, a] of metrics.buttons.entries()) {
          if (!a.loaded) failures.push(`image: ${a.cls}`);
          if (a.labelVisible) failures.push(`visible label: ${a.cls}`);
          if (a.art) artwork.add(a.art);
          for (const bounds of [a, a.label].filter(Boolean)) if (bounds.x < 0 || bounds.y < 0 || bounds.right > width + 1 || bounds.bottom > height + 1) failures.push(`viewport: ${a.cls}`);
          if (metrics.joystick && overlap(a, metrics.joystick)) failures.push(`joystick: ${a.cls}`);
          for (const b of metrics.buttons.slice(i + 1)) if (overlap(a, b) || overlap(a.label, b) || overlap(a, b.label) || overlap(a.label, b.label)) failures.push(`collision: ${a.cls} / ${b.cls}`);
        }
        const main = metrics.buttons.find(b => b.cls.includes('slot-main'));
        if (!main || metrics.buttons.some(b => b !== main && b.width >= main.width)) failures.push('main size');
        const say = metrics.buttons.find(b => b.cls.includes('slot-say'));
        const sayGap = main && say ? Math.hypot(Math.max(main.x - say.right, say.x - main.right, 0), Math.max(main.y - say.bottom, say.y - main.bottom, 0)) : Infinity;
        if (sayGap > 12) failures.push(`say gap: ${sayGap.toFixed(1)}px`);
        results.push({ width, height, role, kind, failures });
        if (kind === 'task' || (role === 'veteran_driver' && kind === 'emergency')) await page.screenshot({ path: new URL(`${width}x${height}-${role}-${kind}.png`, out).pathname });
        if (role === 'veteran_driver' && kind === 'task') {
          await page.locator('.action-bar .inspect').click();
          await page.locator('.inspect-panel').waitFor({ state: 'visible' });
          await page.evaluate(() => window.__store.getState().set({ inspectOpen: false }));
          await page.locator('.action-bar .say-btn').click();
          await page.locator('.say-box input').waitFor({ state: 'visible' });
          await page.evaluate(() => window.__store.getState().set({ sayOpen: false }));
        }
      }
    }
    await context.close();
  }
  await fs.writeFile(new URL('results.json', out), JSON.stringify({ results, errors }, null, 2));
  const failed = results.filter(x => x.failures.length);
  console.log(JSON.stringify({ cases: results.length, failed, errors, artwork: [...artwork] }));
  assert.equal(failed.length, 0, 'action geometry failed');
  assert.equal(errors.length, 0, 'browser errors');
  assert.equal(artwork.size, 7, 'Expected seven distinct artwork crops');
} finally { await browser.close(); }
