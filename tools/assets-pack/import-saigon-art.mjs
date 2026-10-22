#!/usr/bin/env node
/** Selectively import ImageGen art without regenerating quest assets or changing atlas frames. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = path.join(ROOT, 'assets/maps/game');
const PUBLIC = path.join(ROOT, 'apps/web/public/assets/maps/game');
const PROVENANCE = 'ChatGPT Image; tools/assets-pack/import-saigon-art.mjs';
const MIXED_PROVENANCE = 'mixed: ChatGPT Image map/decor via importer; existing quest/UI assets retained';
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const replacements = {
  barrier: ['decor-hem-barrier'],
  pothole: ['decor-o-ga'],
  trash: ['decor-dong-rac'],
  'food-cart': ['prop-exhibition-xe-com-tam'],
  cafe: ['prop-coordination-ban-ghe-nhua', 'prop-courtyard-ban-inox'],
  plant: ['decor-chau-bong-giay'],
  scooter: ['decor-xe-crab', 'prop-storage-xe-may'],
  pole: ['prop-corridor-cot-dien', 'prop-courtyard-cot-dien', 'prop-editing-cot-dien', 'decor-cot-dien'],
};

async function rgba(input) {
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** Inspect the alpha channel rather than colour, preserving pale outlines and soft edges. */
async function normalizeSprite(input, width, height, fit = 'inside') {
  const metadata = await sharp(input).metadata();
  assert(metadata.hasAlpha, 'Generated sprite must have a genuine alpha channel');
  const { data, info } = await rgba(input);
  let left = info.width, top = info.height, right = -1, bottom = -1, transparent = false;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha < 255) transparent = true;
      if (alpha > 80) {
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
    }
  }
  assert(transparent, 'Generated sprite background must contain transparent pixels');
  assert(right >= left && bottom >= top, 'Generated sprite is empty');
  const trimmed = await sharp(data, { raw: info })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(width, height, { fit, kernel: 'lanczos3' }).png().toBuffer();
  const size = await sharp(trimmed).metadata();
  return sharp({ create: { width, height, channels: 4, background: TRANSPARENT } })
    .composite([{ input: trimmed, left: Math.floor((width - size.width) / 2), top: height - size.height }])
    .png().toBuffer();
}

function validateAtlas(atlas) {
  const { w, h } = atlas.meta.size;
  assert(Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 4096 && h <= 4096);
  const previous = [];
  for (const [key, entry] of Object.entries(atlas.frames)) {
    const r = entry.frame;
    assert([r.x, r.y, r.w, r.h].every(Number.isInteger), `${key}: non-integer frame`);
    assert(r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= w && r.y + r.h <= h, `${key}: frame outside atlas`);
    for (const [other, q] of previous) {
      assert(!(r.x < q.x + q.w && r.x + r.w > q.x && r.y < q.y + q.h && r.y + r.h > q.y), `${key} overlaps ${other}`);
    }
    previous.push([key, r]);
  }
}

function makeFrame(x, y, w, h) {
  return { frame: { x, y, w, h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
}

function ensureBarrierFrame(atlas) {
  if (!atlas.frames['decor-hem-barrier']) {
    const y = atlas.meta.size.h;
    atlas.frames['decor-hem-barrier'] = makeFrame(0, y, 48, 80);
    atlas.meta.size.h = y + 80;
  }
}

function packHighResolution(logicalFrames) {
  const frames = {};
  let x = 0, y = 0, rowHeight = 0;
  for (const [key, { w, h }] of Object.entries(logicalFrames).sort((a, b) => b[1].h - a[1].h || a[0].localeCompare(b[0]))) {
    const width = w * 3, height = h * 3;
    assert(width <= 4096 && height <= 4096, `${key}: frame exceeds GPU texture limit`);
    if (x + width > 4096) { x = 0; y += rowHeight + 6; rowHeight = 0; }
    frames[key] = makeFrame(x, y, width, height);
    x += width + 6; rowHeight = Math.max(rowHeight, height);
  }
  const atlas = { frames, meta: { app: PROVENANCE, image: 'decor-0.webp', format: 'RGBA8888', size: { w: 4096, h: y + rowHeight }, scale: '1', textureScale: 3 } };
  validateAtlas(atlas);
  return atlas;
}

async function clippedComposite(input, left, top, width, height, canvasWidth, canvasHeight) {
  const x = Math.max(0, left), y = Math.max(0, top);
  const right = Math.min(canvasWidth, left + width), bottom = Math.min(canvasHeight, top + height);
  if (right <= x || bottom <= y) return null;
  if (x !== left || y !== top || right !== left + width || bottom !== top + height) {
    input = await sharp(input).extract({ left: x - left, top: y - top, width: right - x, height: bottom - y }).png().toBuffer();
  }
  return { input, left: x, top: y };
}

function placementDimensions(frame, scale = 1) {
  assert(Number.isFinite(scale) && scale > 0, 'Placement scale must be positive');
  return { w: Math.max(1, Math.round(frame.w * scale)), h: Math.max(1, Math.round(frame.h * scale)) };
}

async function selfTest() {
  const sprite = await sharp({ create: { width: 10, height: 12, channels: 4, background: TRANSPARENT } })
    .composite([{ input: await sharp({ create: { width: 2, height: 4, channels: 4, background: '#ff0000' } }).png().toBuffer(), left: 5, top: 3 }])
    .png().toBuffer();
  const normalized = await normalizeSprite(sprite, 10, 10);
  const { data, info } = await rgba(normalized);
  assert.equal(info.width, 10); assert.equal(info.height, 10);
  assert.equal(data[3], 0);
  assert(data[((9 * 10 + 5) * 4) + 3] > 0, 'sprite must touch bottom centre');
  const opaque = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(() => normalizeSprite(opaque, 10, 10), /alpha/);
  const atlas = { meta: { size: { w: 20, h: 20 } }, frames: { a: makeFrame(0, 0, 10, 10), b: makeFrame(10, 0, 10, 10) } };
  validateAtlas(atlas);
  atlas.frames.b.frame.x = 9;
  assert.throws(() => validateAtlas(atlas), /overlaps/);
  atlas.frames.b.frame.x = 19;
  assert.throws(() => validateAtlas(atlas), /outside/);
  const clipped = await clippedComposite(normalized, -2, -3, 10, 10, 20, 20);
  const clippedInfo = await sharp(clipped.input).metadata();
  assert.deepEqual([clipped.left, clipped.top, clippedInfo.width, clippedInfo.height], [0, 0, 8, 7]);
  assert.equal(await clippedComposite(normalized, 20, 1, 10, 10, 20, 20), null);
  const repeatAtlas = { meta: { size: { w: 2048, h: 500 } }, frames: {} };
  ensureBarrierFrame(repeatAtlas);
  const first = JSON.stringify(repeatAtlas);
  ensureBarrierFrame(repeatAtlas);
  assert.equal(JSON.stringify(repeatAtlas), first, 're-import must not append another barrier or grow atlas');
  assert.equal(repeatAtlas.meta.size.h, 580);
  const high = packHighResolution({ tiny: { w: 48, h: 80 }, wide: { w: 208, h: 112 } });
  assert.deepEqual(high.frames.tiny.sourceSize, { w: 144, h: 240 });
  assert.equal(high.meta.textureScale, 3);
  const logicalAgain = Object.fromEntries(Object.entries(high.frames).map(([key, v]) => [key, { w: v.frame.w / high.meta.textureScale, h: v.frame.h / high.meta.textureScale }]));
  assert.deepEqual(packHighResolution(logicalAgain), high, '3x atlas repack must be idempotent');
  const highSprite = await normalizeSprite(sprite, 144, 240);
  const highInfo = await sharp(highSprite).metadata();
  assert.deepEqual([highInfo.width, highInfo.height], [144, 240]);
  const preview = await sharp({ create: { width: 2016, height: 1536, channels: 4, background: TRANSPARENT } }).png().toBuffer();
  const previewInfo = await sharp(preview).metadata();
  assert.deepEqual([previewInfo.width, previewInfo.height], [2016, 1536]);
  assert.deepEqual(placementDimensions({ w: 120, h: 96 }, 0.7), { w: 84, h: 67 });
  assert.deepEqual(placementDimensions({ w: 120, h: 96 }), { w: 120, h: 96 });
  assert.throws(() => placementDimensions({ w: 120, h: 96 }, 0), /positive/);
  console.log('PASS: alpha, anchoring, 3x frames, bounds, clipping, idempotency, preview, placement scale');
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--self-test') return selfTest();
  const options = {};
  while (args.length) {
    const key = args.shift();
    assert(['--floor', '--props-dir', '--signs-dir'].includes(key) && args.length && !args[0].startsWith('--'), 'Usage: import-saigon-art.mjs --floor FILE [--props-dir DIR] [--signs-dir DIR]');
    options[key] = path.resolve(args.shift());
  }
  assert(options['--floor'], '--floor FILE is required');
  const previousAtlas = JSON.parse(await fs.readFile(path.join(PUBLIC, 'atlas/decor-0.json'), 'utf8'));
  validateAtlas(previousAtlas);
  const previousScale = previousAtlas.meta.textureScale ?? 1;
  const logicalFrames = Object.fromEntries(Object.entries(previousAtlas.frames).map(([key, value]) => [key, { w: value.frame.w / previousScale, h: value.frame.h / previousScale }]));
  const generated = new Map();
  if (options['--props-dir']) {
    for (const name of Object.keys(replacements)) {
      try { generated.set(name, await fs.readFile(path.join(options['--props-dir'], `${name}.png`))); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  if (generated.has('barrier')) logicalFrames['decor-hem-barrier'] ??= { w: 48, h: 80 };
  const atlas = packHighResolution(logicalFrames);
  const replacementBuffers = new Map();
  for (const [name, input] of generated) {
    for (const key of replacements[name]) {
      const frame = atlas.frames[key]?.frame;
      assert(frame, `Missing atlas frame ${key}`);
      replacementBuffers.set(key, await normalizeSprite(input, frame.w, frame.h, name === 'barrier' ? 'fill' : 'inside'));
    }
  }
  const images = new Map();
  const logicalImages = new Map();
  for (const [key, entry] of Object.entries(atlas.frames)) {
    let buffer = replacementBuffers.get(key);
    if (!buffer) {
      buffer = await fs.readFile(path.join(SOURCE, 'props', `${key}.png`));
      const oldSize = await sharp(buffer).metadata();
      assert(oldSize.hasAlpha, `${key}: source alpha missing`);
      buffer = await sharp(buffer).resize(entry.frame.w, entry.frame.h, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
    }
    const size = await sharp(buffer).metadata();
    assert(size.width === entry.frame.w && size.height === entry.frame.h && size.hasAlpha, `${key}: source size/alpha mismatch`);
    images.set(key, buffer);
    logicalImages.set(key, await sharp(buffer).resize(logicalFrames[key].w, logicalFrames[key].h).png().toBuffer());
  }
  const floorRaw = await fs.readFile(options['--floor']);
  const floorInfo = await sharp(floorRaw).metadata();
  assert(floorInfo.width >= 1000 && floorInfo.height >= 700, 'Floor source is too small');
  assert(floorInfo.width <= 4096 && floorInfo.height <= 4096, 'Floor exceeds GPU texture cap');
  assert(Math.abs(floorInfo.width / floorInfo.height - 2016 / 1536) < 0.2, 'Floor aspect ratio differs too much from map');
  const floor = await sharp(floorRaw).png().toBuffer();
  const sheet = await sharp({ create: { width: atlas.meta.size.w, height: atlas.meta.size.h, channels: 4, background: TRANSPARENT } })
    .composite([...images].map(([key, input]) => ({ input, left: atlas.frames[key].frame.x, top: atlas.frames[key].frame.y })))
    .png().toBuffer();
  const propsModule = pathToFileURL(path.join(ROOT, 'packages/shared/src/maps/game/props.ts')).href;
  const props = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `import { GAME_PROPS } from ${JSON.stringify(propsModule)}; console.log(JSON.stringify(GAME_PROPS));`], { cwd: ROOT, encoding: 'utf8' }));
  const composites = [];
  for (const prop of props.sort((a, b) => Number(!a.wall) - Number(!b.wall) || a.y - b.y)) {
    assert(images.has(prop.key), `Preview prop missing frame: ${prop.key}`);
    const { w, h } = placementDimensions(logicalFrames[prop.key], prop.scale);
    const input = prop.scale ? await sharp(logicalImages.get(prop.key)).resize(w, h).png().toBuffer() : logicalImages.get(prop.key);
    const composite = await clippedComposite(input, Math.trunc(prop.x - w / 2), Math.trunc(prop.y - h), w, h, 2016, 1536);
    if (composite) composites.push(composite);
  }
  const previewFloor = await sharp(floor).resize(2016, 1536, { fit: 'fill' }).png().toBuffer();
  const preview = await sharp(previewFloor).composite(composites).png().toBuffer();
  const signs = new Map();
  if (options['--signs-dir']) {
    for (const name of ['drain', 'moving', 'trash', 'dead-end']) {
      const raw = await fs.readFile(path.join(options['--signs-dir'], `${name}.png`));
      const { data, info } = await rgba(raw);
      let left = info.width, top = info.height, right = -1, bottom = -1;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * 4 + 3] > 80) {
          left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
      }
      assert(right >= left && bottom >= top, `${name}: empty sign`);
      const png = await sharp(raw).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
      const size = await sharp(png).metadata();
      assert(Math.max(size.width, size.height) >= 512, `${name}: sign source too small`);
      signs.set(name, { raw, png, size: [size.width, size.height] });
    }
  }
  const manifests = [];
  for (const base of [SOURCE, PUBLIC]) {
    const manifest = JSON.parse(await fs.readFile(path.join(base, 'game.assets.json'), 'utf8'));
    manifest.generatedBy = MIXED_PROVENANCE;
    const decor = manifest.atlases.find((item) => item.name === 'decor-0');
    assert(decor, 'Manifest missing decor atlas');
    Object.assign(decor, { size: [atlas.meta.size.w, atlas.meta.size.h], textureScale: 3, generatedBy: PROVENANCE });
    Object.assign(manifest.textures['floor-bake'], { size: [floorInfo.width, floorInfo.height], displaySize: [2016, 1536], generatedBy: PROVENANCE, note: 'Native ImageGen resolution; logical world size maintained in shared layout' });
    Object.assign(manifest.textures['map-preview'], { size: [2016, 1536], generatedBy: PROVENANCE });
    for (const [key, { w, h }] of Object.entries(logicalFrames)) {
      manifest.props[key] = { ...manifest.props[key], atlas: 'decor-0', size: [w, h], textureSize: [w * 3, h * 3], anchor: [0.5, 1], ...(key === 'decor-hem-barrier' ? { footprint: [48, 48] } : {}) };
    }
    for (const [name, sign] of signs) manifest.textures[`sign-${name}`] = { file: `maps/game/signs/${name}`, size: sign.size, generatedBy: PROVENANCE };
    manifests.push([base, manifest]);
  }
  // All checks complete before writes. Preserve original raw input bytes independently of packed textures.
  const rawDir = path.join(ROOT, 'assets/_src/maps/game/imagegen');
  await fs.mkdir(rawDir, { recursive: true });
  const floorCopy = path.join(rawDir, path.basename(options['--floor']));
  if (path.resolve(floorCopy) !== options['--floor']) await fs.writeFile(floorCopy, floorRaw);
  for (const [name, buffer] of generated) await fs.writeFile(path.join(rawDir, `saigon-${name}-generated.png`), buffer);
  for (const [key, buffer] of images) await fs.writeFile(path.join(SOURCE, 'props', `${key}.png`), buffer);
  for (const base of [SOURCE, PUBLIC]) {
    await fs.mkdir(path.join(base, 'atlas'), { recursive: true });
    await fs.mkdir(path.join(base, 'signs'), { recursive: true });
  }
  await fs.writeFile(path.join(SOURCE, 'tileset/floor-bake.png'), floor);
  await fs.writeFile(path.join(SOURCE, 'meta/map-preview.png'), preview);
  await fs.writeFile(path.join(SOURCE, 'atlas/decor-0.png'), sheet);
  for (const [relative, buffer] of [['tileset/floor-bake', floor], ['meta/map-preview', preview], ['atlas/decor-0', sheet]]) {
    await sharp(buffer).webp({ lossless: true, alphaQuality: 100 }).toFile(path.join(PUBLIC, `${relative}.webp`));
  }
  for (const [name, sign] of signs) {
    await fs.writeFile(path.join(rawDir, `saigon-sign-${name}-generated.png`), sign.raw);
    await fs.writeFile(path.join(SOURCE, 'signs', `${name}.png`), sign.png);
    await sharp(sign.png).webp({ lossless: true }).toFile(path.join(PUBLIC, 'signs', `${name}.webp`));
  }
  for (const [base, manifest] of manifests) {
    await fs.writeFile(path.join(base, 'atlas/decor-0.json'), JSON.stringify(atlas, null, 2) + '\n');
    await fs.writeFile(path.join(base, 'game.assets.json'), JSON.stringify(manifest, null, 1) + '\n');
  }
  console.log(`PASS: floor ${floorInfo.width}x${floorInfo.height}; 3x atlas ${atlas.meta.size.w}x${atlas.meta.size.h} (${images.size} frames); native preview 2016x1536; ${signs.size} lossless signs; quest assets retained`);
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
