#!/usr/bin/env node
/** Replace keyed sprites in the existing Sài Gòn atlas without repacking other frames. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = path.join(ROOT, 'assets/maps/game');
const PUBLIC = path.join(ROOT, 'apps/web/public/assets/maps/game');

// Tests deliberately inspect raw pixels: transparent padding must replace old art,
// while every pixel outside the requested frame remains byte-for-byte identical.
async function selfTest() {
  const input = await sharp({ create: { width: 12, height: 14, channels: 4, background: '#00000000' } })
    .composite([{ input: await sharp({ create: { width: 2, height: 4, channels: 4, background: '#ff0000' } }).png().toBuffer(), left: 7, top: 3 }])
    .png().toBuffer();
  const normalized = await normalizeSprite(input, 10, 10);
  const { data, info } = await decode(normalized);
  assert.deepEqual([info.width, info.height], [10, 10]);
  const visible = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    if (data[(y * 10 + x) * 4 + 3] > 80) visible.push([x, y]);
  }
  assert.equal(Math.min(...visible.map(([x]) => x)), 2);
  assert.equal(Math.max(...visible.map(([x]) => x)), 6);
  assert.equal(Math.max(...visible.map(([, y]) => y)), 9);
  const opaque = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#123456' } }).png().toBuffer();
  await assert.rejects(normalizeSprite(opaque, 10, 10), /transparent/);
  const noAlpha = await sharp(opaque).removeAlpha().png().toBuffer();
  await assert.rejects(normalizeSprite(noAlpha, 10, 10), /alpha/);
  const empty = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#00000000' } }).png().toBuffer();
  await assert.rejects(normalizeSprite(empty, 10, 10), /empty/);
  const base = await sharp({ create: { width: 22, height: 18, channels: 4, background: '#346789' } }).png().toBuffer();
  const atlas = { meta: { size: { w: 22, h: 18 } }, frames: { target: { frame: { x: 4, y: 5, w: 10, h: 10 }, rotated: false, trimmed: false } } };
  const changes = new Map([['target', normalized]]);
  const patched = await patchPixels(base, atlas, changes);
  const before = (await decode(base)).data;
  const after = (await decode(patched)).data;
  for (let y = 0; y < 18; y++) for (let x = 0; x < 22; x++) {
    const offset = (y * 22 + x) * 4;
    const expected = x >= 4 && x < 14 && y >= 5 && y < 15
      ? data.subarray(((y - 5) * 10 + x - 4) * 4, ((y - 5) * 10 + x - 4) * 4 + 4)
      : before.subarray(offset, offset + 4);
    assert.deepEqual(after.subarray(offset, offset + 4), expected);
  }
  assert.deepEqual((await decode(await patchPixels(patched, atlas, changes))).data, after, 'Repeated patch must be idempotent');
  const clipped = await clipSprite(normalized, -2, -3, 10, 10, 20, 20);
  const clippedSize = await sharp(clipped.input).metadata();
  assert.deepEqual([clipped.left, clipped.top, clippedSize.width, clippedSize.height], [0, 0, 8, 7]);
  assert.equal(await clipSprite(normalized, 20, 1, 10, 10, 20, 20), null);
  const preview = await buildPreview(base, atlas, base, [
    { key: 'target', x: 0, y: 4, scale: 0.7 },
    { key: 'target', x: 2015, y: 1536, wall: true },
  ]);
  const previewSize = await sharp(preview).metadata();
  assert.deepEqual([previewSize.width, previewSize.height], [2016, 1536]);
  console.log('PASS: real alpha, empty/opaque rejection, size, bottom-centre anchor, exact non-target pixels, transparent replacement, idempotency, preview dimensions/scale/clipping');
}

async function decode(input) {
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function normalizeSprite(input, width, height) {
  assert((await sharp(input).metadata()).hasAlpha, 'Sprite requires a genuine alpha channel');
  const { data, info } = await decode(input);
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = false;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * 4 + 3];
    if (alpha < 255) transparent = true;
    if (alpha > 80) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  assert(transparent, 'Sprite background must contain transparent pixels');
  assert(right >= left && bottom >= top, 'Sprite is empty');
  const resized = await sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(width, height, { fit: 'inside', kernel: 'lanczos3' }).png().toBuffer();
  const size = await sharp(resized).metadata();
  return sharp({ create: { width, height, channels: 4, background: '#00000000' } })
    .composite([{ input: resized, left: Math.floor((width - size.width) / 2), top: height - size.height }])
    .png().toBuffer();
}

async function patchPixels(base, atlas, changes) {
  const { data, info } = await decode(base);
  assert.equal(info.width, atlas.meta.size.w);
  assert.equal(info.height, atlas.meta.size.h);
  for (const [key, image] of changes) {
    const entry = atlas.frames[key];
    assert(entry && !entry.rotated && !entry.trimmed, `${key}: requires an existing unrotated, untrimmed frame`);
    const { x, y, w, h } = entry.frame;
    assert(x >= 0 && y >= 0 && x + w <= info.width && y + h <= info.height, `${key}: invalid frame bounds`);
    const sprite = await decode(image);
    assert.equal(sprite.info.width, w);
    assert.equal(sprite.info.height, h);
    for (let row = 0; row < h; row++) {
      sprite.data.copy(data, ((y + row) * info.width + x) * 4, row * w * 4, (row + 1) * w * 4);
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

async function clipSprite(input, left, top, width, height, canvasWidth, canvasHeight) {
  const x = Math.max(0, left), y = Math.max(0, top);
  const right = Math.min(canvasWidth, left + width), bottom = Math.min(canvasHeight, top + height);
  if (right <= x || bottom <= y) return null;
  if (x !== left || y !== top || right !== left + width || bottom !== top + height) {
    input = await sharp(input).extract({ left: x - left, top: y - top, width: right - x, height: bottom - y }).png().toBuffer();
  }
  return { input, left: x, top: y };
}

async function buildPreview(sheet, atlas, floor, props) {
  const width = 2016, height = 1536, textureScale = atlas.meta.textureScale ?? 1;
  const composites = [];
  for (const prop of [...props].sort((a, b) => Number(!a.wall) - Number(!b.wall) || a.y - b.y)) {
    const entry = atlas.frames[prop.key];
    assert(entry && !entry.rotated && !entry.trimmed, `${prop.key}: unsupported preview frame`);
    const scale = prop.scale ?? 1;
    assert(Number.isFinite(scale) && scale > 0, `${prop.key}: invalid placement scale`);
    const w = Math.max(1, Math.round(entry.frame.w / textureScale * scale));
    const h = Math.max(1, Math.round(entry.frame.h / textureScale * scale));
    const input = await sharp(sheet).extract({ left: entry.frame.x, top: entry.frame.y, width: entry.frame.w, height: entry.frame.h })
      .resize(w, h).png().toBuffer();
    const composite = await clipSprite(input, Math.trunc(prop.x - w / 2), Math.trunc(prop.y - h), w, h, width, height);
    if (composite) composites.push(composite);
  }
  const background = await sharp(floor).resize(width, height, { fit: 'fill' }).png().toBuffer();
  return sharp(background).composite(composites).png().toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--self-test') return selfTest();
  assert(args.length === 2 && args[0] === '--input', 'Usage: node tools/assets-pack/refresh-saigon-props.mjs --input DIR | --self-test');
  const input = path.resolve(args[1]);
  const atlas = JSON.parse(await fs.readFile(path.join(SOURCE, 'atlas/decor-0.json'), 'utf8'));
  const publicAtlas = JSON.parse(await fs.readFile(path.join(PUBLIC, 'atlas/decor-0.json'), 'utf8'));
  assert.deepEqual(publicAtlas, atlas, 'Source/runtime atlas metadata differ');
  const filenames = (await fs.readdir(input)).filter((name) => name.endsWith('.png')).sort();
  assert(filenames.length, 'Input contains no keyed PNG files');
  const changes = new Map();
  for (const filename of filenames) {
    const key = filename.slice(0, -4);
    const entry = atlas.frames[key];
    assert(entry && !entry.rotated && !entry.trimmed, `${key}: unknown or unsupported atlas frame`);
    changes.set(key, await normalizeSprite(await fs.readFile(path.join(input, filename)), entry.frame.w, entry.frame.h));
  }
  const sheet = await patchPixels(await fs.readFile(path.join(SOURCE, 'atlas/decor-0.png')), atlas, changes);
  const webp = await sharp(sheet).webp({ lossless: true, alphaQuality: 100 }).toBuffer();
  const propsModule = new URL('../../packages/shared/src/maps/game/props.ts', import.meta.url).href;
  const props = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `import { GAME_PROPS } from ${JSON.stringify(propsModule)}; console.log(JSON.stringify(GAME_PROPS));`], { cwd: ROOT, encoding: 'utf8' }));
  const preview = await buildPreview(sheet, atlas, await fs.readFile(path.join(SOURCE, 'tileset/floor-bake.png')), props);
  const previewWebp = await sharp(preview).webp({ lossless: true, alphaQuality: 100 }).toBuffer();
  // Validate everything before mutating any tracked asset. Metadata and frame layout stay untouched.
  await fs.writeFile(path.join(SOURCE, 'atlas/decor-0.png'), sheet);
  await fs.writeFile(path.join(PUBLIC, 'atlas/decor-0.webp'), webp);
  for (const [key, png] of changes) await fs.writeFile(path.join(SOURCE, 'props', `${key}.png`), png);
  await fs.writeFile(path.join(SOURCE, 'meta/map-preview.png'), preview);
  await fs.writeFile(path.join(PUBLIC, 'meta/map-preview.webp'), previewWebp);
  console.log(`PASS: replaced ${changes.size} existing frames; atlas metadata and all other frame pixels preserved; map preview refreshed`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
