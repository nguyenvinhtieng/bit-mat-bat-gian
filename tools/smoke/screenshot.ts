/**
 * Visual check (technology.md step 4): drives the real web client in Chrome and saves screenshots.
 *   pnpm screenshot   (needs pnpm dev running; uses the system Google Chrome)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const WEB = process.env.WEB_URL || 'http://localhost:5173';
const OUT = process.env.SHOT_DIR || 'tools/smoke/shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(WEB);
console.log('shot'); await page.screenshot({ path: `${OUT}/01-home.png` });
await page.fill('input[placeholder="Ví dụ: Minh"]', 'Tester');
await page.click('text=Tạo phòng mới');
await page.waitForSelector('.room-code strong', { timeout: 8000 });
await sleep(1500);
console.log('shot'); await page.screenshot({ path: `${OUT}/02-lobby.png` });

// a second player in another tab
const page2 = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await page2.goto(page.url());
await page2.fill('input[placeholder="Ví dụ: Minh"]', 'Ban');
await page2.click('text=Vào phòng');
await page2.waitForSelector('.room-code strong', { timeout: 8000 });

// walk around in the lobby
await page.keyboard.down('KeyS');
await sleep(900);
await page.keyboard.up('KeyS');
await sleep(300);
console.log('shot'); await page.screenshot({ path: `${OUT}/03-lobby-walk.png` });

await page.click('text=Bắt đầu ván');
await page.waitForSelector('.intro', { timeout: 8000 });
await sleep(500);
console.log('shot'); await page.screenshot({ path: `${OUT}/04-intro.png` });
await page.click('text=Bắt đầu điều tra');

// walk down the corridor into the editing room (print checklist station)
const hold = async (key: string, ms: number) => {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
};
await hold('KeyS', 3600);
await hold('KeyA', 1500);
await hold('KeyS', 900);
await sleep(400);
console.log('shot'); await page.screenshot({ path: `${OUT}/05-editing.png` });
await page.keyboard.press('KeyE');
await sleep(800);
console.log('shot'); await page.screenshot({ path: `${OUT}/06-task.png` });

console.log('nearby/interact:', await page.locator('.interact').allTextContents());
console.log('area:', await page.locator('.area-name').allTextContents());
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
