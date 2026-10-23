#!/usr/bin/env node
/** Validate original ImageGen sprites and compose an inspection sheet; never changes inputs. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const INPUT = path.join(ROOT, 'assets/_src/maps/game/imagegen/saigon-matte-v5/raw');
const OUTPUT = path.join(ROOT, 'output/saigon-matte-v5');

// Regression cases are independent of generated artwork and run without modifying any asset.
async function selfTest() {
  const transparent = await sharp({ create: { width: 12, height: 16, channels: 4, background: '#00000000' } })
    .composite([{ input: await sharp({ create: { width: 4, height: 6, channels: 4, background: '#c49468' } }).png().toBuffer(), left: 3, top: 7 }])
    .png().toBuffer();
  const inspected = await inspectSprite(transparent, 'fixture');
  assert.deepEqual(inspected.bbox, { left: 3, top: 7, width: 4, height: 6 });
  assert.equal(inspected.visiblePixels, 24);
  assert.equal(inspected.transparentPixels, 168);
  const empty = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#00000000' } }).png().toBuffer();
  const opaque = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#123456' } }).png().toBuffer();
  await assert.rejects(inspectSprite(empty, 'empty'), /empty/);
  await assert.rejects(inspectSprite(opaque, 'opaque'), /transparent/);
  await assert.rejects(inspectSprite(await sharp(opaque).removeAlpha().png().toBuffer(), 'rgb'), /alpha/);
  const cell = await contactCell(transparent, inspected, 'fixture');
  const meta = await sharp(cell).metadata();
  assert.deepEqual([meta.width, meta.height], [220, 220]);
  console.log('PASS: bbox, visible/transparent diagnostics, empty/opaque/RGB rejection, contact-cell dimensions');
}

async function inspectSprite(input, key) {
  const metadata = await sharp(input).metadata();
  assert(metadata.hasAlpha, `${key}: image requires original alpha channel`);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  let visiblePixels = 0, transparentPixels = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (alpha === 0) transparentPixels++;
    if (alpha > 80) {
      visiblePixels++;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  assert(visiblePixels > 0, `${key}: sprite is empty`);
  assert(transparentPixels > 0, `${key}: background must contain transparent pixels`);
  return { width: info.width, height: info.height, visiblePixels, transparentPixels,
    bbox: { left, top, width: right - left + 1, height: bottom - top + 1 } };
}

async function contactCell(input, diagnostic, key) {
  const image = await sharp(input).extract(diagnostic.bbox)
    .resize(204, 176, { fit: 'inside' }).png().toBuffer();
  const meta = await sharp(image).metadata();
  const label = key.replace(/^prop-/, '').replace(/^decor-/, '');
  const lines = label.length > 29 ? [label.slice(0, 29), label.slice(29)] : [label];
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="40"><g font-family="sans-serif" font-size="10" fill="#302d29" text-anchor="middle">${lines.map((line, i) => `<text x="110" y="${14 + i * 13}">${line}</text>`).join('')}</g></svg>`);
  return sharp({ create: { width: 220, height: 220, channels: 4, background: '#dcd6cb' } })
    .composite([{ input: image, left: Math.floor((220 - meta.width) / 2), top: 180 - meta.height },
      { input: svg, left: 0, top: 180 }]).png().toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--self-test') return selfTest();
  assert(args.length === 0 || (args.length === 1 && args[0] === '--partial'),
    'Usage: node tools/assets-pack/prepare-saigon-matte.mjs [--partial | --self-test]');
  const partial = args.includes('--partial');
  const atlas = JSON.parse(await fs.readFile(path.join(ROOT, 'assets/maps/game/atlas/decor-0.json'), 'utf8'));
  const keys = Object.keys(atlas.frames).filter((key) => key !== 'body' && key !== 'body-tint').sort();
  assert.equal(keys.length, 45);
  const files = (await fs.readdir(INPUT)).filter((name) => name.endsWith('.png')).sort();
  for (const file of files) assert(keys.includes(file.slice(0, -4)), `Unknown sprite: ${file}`);
  const missing = keys.filter((key) => !files.includes(`${key}.png`));
  if (!partial) assert.equal(missing.length, 0, `Missing ${missing.length} sprites: ${missing.join(', ')}`);
  assert(files.length > 0, 'No sprites available for inspection');
  const diagnostics = [], composites = [];
  for (let index = 0; index < files.length; index++) {
    const key = files[index].slice(0, -4);
    const input = await fs.readFile(path.join(INPUT, files[index]));
    const diagnostic = await inspectSprite(input, key);
    const { w, h } = atlas.frames[key].frame;
    diagnostics.push({ key, ...diagnostic, bboxAspect: diagnostic.bbox.width / diagnostic.bbox.height,
      destination: { width: w, height: h, aspect: w / h } });
    composites.push({ input: await contactCell(input, diagnostic, key), left: index % 5 * 220, top: Math.floor(index / 5) * 220 });
  }
  await fs.mkdir(OUTPUT, { recursive: true });
  await sharp({ create: { width: 1100, height: Math.ceil(files.length / 5) * 220, channels: 4, background: '#dcd6cb' } })
    .composite(composites).png().toFile(path.join(OUTPUT, 'contact-sheet.png'));
  await fs.writeFile(path.join(OUTPUT, 'alpha-diagnostics.json'), JSON.stringify({ total: keys.length, present: files.length, missing, sprites: diagnostics }, null, 2) + '\n');
  console.log(`PASS: ${files.length}/45 original-alpha sprites; ${missing.length} pending; contact-sheet.png + alpha-diagnostics.json; inputs unchanged`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
