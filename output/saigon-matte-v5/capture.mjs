import { chromium } from 'playwright-core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const probe = process.argv.includes('--probe');
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${new URL(response.url()).pathname}`);
});
page.on('requestfailed', (request) => errors.push(`NETWORK ${request.failure()?.errorText} ${new URL(request.url()).pathname}`));
try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__net?.createRoom && window.__store);
  if (probe) {
    console.log(`READY: Chrome, game dev hooks, ${await page.title()}; errors=${errors.length}`);
  } else {
    await page.evaluate(() => window.__net.createRoom('Kiểm tra vật phẩm'));
    await page.waitForFunction(() => {
      const scene = window.__game?.scene.getScene('game');
      return scene?.avatars?.get(window.__net.room?.sessionId)?.c && scene?.propImgs?.length > 0;
    }, null, { timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.addStyleTag({ content: '.zola,.ready-dock{visibility:hidden!important}' });
    // Pause a real lobby scene after asset loading, retaining its actual rider and render state.
    // This allows inspecting each room without fog, networking corrections or gameplay timers.
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('game');
      scene.scene.pause();
      scene.cameras.main.stopFollow();
    });
    const rooms = {
      courtyard: [21, 4, 18, 4.5], exhibition: [7.5, 13, 7.5, 14],
      coordination: [34.5, 13, 34.5, 13.5], editing: [21, 22, 23, 23.5],
      archive: [11.5, 28.5, 11.5, 28.5], storage: [30.5, 28.5, 31.5, 29.5],
      corridor: [21, 12, 21, 13.5], outer_alleys: [21, 22, 21, 24],
    };
    for (const [name, [cx, cy, px, py]] of Object.entries(rooms)) {
      await page.evaluate(([x, y, rx, ry]) => {
        const scene = window.__game.scene.getScene('game');
        const rider = scene.avatars.get(window.__net.room.sessionId).c;
        rider.setPosition(rx * 48, ry * 48).setDepth(ry * 48);
        scene.cameras.main.setZoom(1.15).centerOn(x * 48, y * 48);
      }, [cx, cy, px, py]);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(output, `live-${name}.png`) });
    }
    await page.evaluate(() => {
      const scene = window.__game.scene.getScene('game');
      scene.cameras.main.setZoom(0.55).centerOn(1008, 768);
    });
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(output, 'live-overview.png') });
    await fs.writeFile(path.join(output, 'live-errors.json'), JSON.stringify(errors, null, 2) + '\n');
    console.log(`PASS: 9 live Chrome screenshots; runtime errors=${errors.length}`);
    if (errors.length) console.log(errors.join('\n'));
  }
} finally {
  await browser.close();
}
