#!/usr/bin/env node
/** Sài Gòn decoration regression checks; run before and after an asset refresh. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SOURCE = path.join(ROOT, 'assets/maps/game');
const PUBLIC = path.join(ROOT, 'apps/web/public/assets/maps/game');
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--baseline'),
  'Usage: node tools/assets-pack/check-saigon-props.mjs [--baseline FILE]');

async function pixels(input) {
  const decoded = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Lossless WebP may discard RGB under alpha=0; those pixels have no visible colour.
  for (let offset = 0; offset < decoded.data.length; offset += 4) {
    if (decoded.data[offset + 3] === 0) decoded.data.fill(0, offset, offset + 3);
  }
  return decoded;
}

const atlas = JSON.parse(await fs.readFile(path.join(SOURCE, 'atlas/decor-0.json'), 'utf8'));
assert.deepEqual(JSON.parse(await fs.readFile(path.join(PUBLIC, 'atlas/decor-0.json'), 'utf8')), atlas,
  'Source/runtime atlas metadata differ');
assert.equal(atlas.meta.textureScale, 3);
const source = await pixels(path.join(SOURCE, 'atlas/decor-0.png'));
const runtime = await pixels(path.join(PUBLIC, 'atlas/decor-0.webp'));
assert.deepEqual([source.info.width, source.info.height], [atlas.meta.size.w, atlas.meta.size.h]);
assert.deepEqual([runtime.info.width, runtime.info.height], [source.info.width, source.info.height]);
assert(runtime.data.equals(source.data), 'Runtime atlas differs from source pixels');

const keys = Object.keys(atlas.frames).filter((key) => key !== 'body' && key !== 'body-tint');
assert.equal(keys.length, 45, 'Expected complete set of 45 decoration sprites');
for (const key of keys) {
  const entry = atlas.frames[key];
  const { x, y, w, h } = entry.frame;
  assert(!entry.rotated && !entry.trimmed, `${key}: unsupported frame`);
  assert(x >= 0 && y >= 0 && w > 0 && h > 0
    && x + w <= source.info.width && y + h <= source.info.height, `${key}: out-of-bounds frame`);
  const frame = await sharp(source.data, { raw: source.info }).extract({ left: x, top: y, width: w, height: h }).raw().toBuffer();
  const spritePath = path.join(SOURCE, 'props', `${key}.png`);
  assert((await sharp(spritePath).metadata()).hasAlpha, `${key}: missing alpha channel`);
  const sprite = await pixels(spritePath);
  assert.deepEqual([sprite.info.width, sprite.info.height], [w, h], `${key}: sprite dimensions differ`);
  assert(sprite.data.equals(frame), `${key}: source sprite differs from atlas frame`);
  let visible = false, transparent = false;
  for (let offset = 3; offset < frame.length; offset += 4) {
    visible ||= frame[offset] > 80;
    transparent ||= frame[offset] === 0;
  }
  assert(visible && transparent, `${key}: empty sprite or missing transparent background`);
}

const shared = new URL('../../packages/shared/src/', import.meta.url).href;
const props = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
  `import { GAME_PROPS } from ${JSON.stringify(`${shared}maps/game/props.ts`)}; console.log(JSON.stringify(GAME_PROPS));`],
{ cwd: ROOT, encoding: 'utf8' }));
for (const prop of props) {
  assert(keys.includes(prop.key), `${prop.key}: unknown decoration`);
  assert(Number.isFinite(prop.scale ?? 1) && (prop.scale ?? 1) > 0, `${prop.key}: invalid scale`);
  assert(Number.isFinite(prop.x) && prop.x >= 0 && prop.x <= 2016
    && Number.isFinite(prop.y) && prop.y >= 0 && prop.y <= 1536, `${prop.key}: anchor outside world`);
}
if (args.length) {
  const baseline = JSON.parse(await fs.readFile(path.resolve(args[1]), 'utf8'));
  for (const [relative, expected] of Object.entries(baseline)) {
    assert(['assets/maps/game/tileset/floor-bake.png', 'apps/web/public/assets/maps/game/tileset/floor-bake.webp',
      'packages/shared/src/layout.ts'].includes(relative), `Unsupported baseline file: ${relative}`);
    const actual = createHash('sha256').update(await fs.readFile(path.join(ROOT, relative))).digest('hex');
    assert.equal(actual, expected, `${relative}: protected background/collision layout changed`);
  }
}
execFileSync(process.execPath, ['--import', 'tsx', '--test', 'packages/shared/src/movement.test.ts'],
  { cwd: ROOT, stdio: 'pipe' });
console.log(`PASS: ${keys.length} transparent sprites; ${props.length} valid placements; atlas/source/runtime pixel parity; movement${args.length ? '; protected floor/layout hashes' : ''}`);
