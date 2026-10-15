import { chromium } from 'playwright-core';
const OUT = process.env.SHOT_DIR!;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = (w: number, h: number) => browser.newContext({ locale: 'vi-VN', viewport: { width: w, height: h } }).then((c) => c.newPage());
const page = await ctx(1280, 800);
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5173');
await page.fill('input[placeholder="Ví dụ: Minh"]', 'Tester');
await page.click('text=Tạo phòng mới');
await page.waitForSelector('.room-code', { timeout: 8000 }).catch(async () => { await page.screenshot({ path: `${OUT}/lhost.png` }); throw new Error('host'); });
const code = (await page.locator('.room-code').innerText()).match(/[A-Z0-9]{4,8}/)![0];
console.log('code', code);
for (const n of ['Ban', 'Lan', 'Hoa']) {
  const p = await ctx(800, 600);
  await p.goto(`http://localhost:5173/join/${code}`);
  await p.fill('input[placeholder="Ví dụ: Minh"]', n);
  await p.click('button.primary:has-text("Vào phòng")');
  await p.waitForSelector('.room-code', { timeout: 8000 }).catch(async () => { await p.screenshot({ path: `${OUT}/ljoin.png` }); throw new Error('join'); });
  await p.click('button:has-text("Sẵn sàng")').catch(() => {});
}
try {
await sleep(800);
await page.screenshot({ path: `${OUT}/l0-lobby.png` });
await page.click('text=Bắt đầu ván');
await sleep(7000);
await sleep(500);
await page.click('text=Bắt đầu điều tra').catch(() => {});
await sleep(1500);
await page.screenshot({ path: `${OUT}/l1-idle.png` });
const hold = async (key: string, ms: number, shot?: string) => {
  await page.keyboard.down(key);
  await sleep(ms);
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png` });
  await page.keyboard.up(key);
};
await hold('KeyD', 700, 'l2-right');
await hold('KeyA', 700, 'l3-left');
await hold('KeyW', 700, 'l4-up');
await hold('KeyS', 700, 'l5-down');
} catch (e) { console.log('FAIL', String(e).slice(0, 300)); await page.screenshot({ path: `${OUT}/lfail.png` }); }
console.log('errors:', errors.slice(0, 5));
await browser.close();
