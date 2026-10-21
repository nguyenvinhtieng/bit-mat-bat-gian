import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { playerColorLayers } from './player-color-layers.mjs';

test('reference-style plum eyes and blush do not inherit player color', () => {
  const pixels = Buffer.from([85, 45, 65, 255, 242, 175, 164, 255]);
  const { base, tint } = playerColorLayers(pixels);
  assert.deepEqual(base, pixels);
  assert.equal(tint[3], 0);
  assert.equal(tint[7], 0);
});

test('all helmet and scooter panels recolor, while the green delivery uniform stays green', () => {
  // Helmet, handlebar housing and both fairings at arbitrary vertical positions.
  const pink = [220, 65, 182, 255], green = [32, 120, 66, 255];
  const pixels = Buffer.from([...pink, ...green, ...pink, ...pink, ...pink]);
  const { base, tint } = playerColorLayers(pixels);
  for (const index of [0, 2, 3, 4]) {
    const p = index * 4;
    assert.equal(tint[p + 3], 255, 'every painted panel is recolorable');
    assert.equal(base[p], base[p + 1], 'no source paint hue underneath tint');
    assert.equal(base[p + 1], base[p + 2]);
    for (const color of [[232, 82, 74], [63, 127, 217]]) {
      const tinted = color.map((channel, i) => Math.round(tint[p + i] * channel / 255));
      assert.ok(tinted[1] < tinted[0] || tinted[1] < tinted[2], 'red/blue bike cannot retain green panels');
    }
  }
  assert.deepEqual([...base.subarray(4, 8)], green);
  assert.equal(tint[7], 0, 'uniform excluded from player recoloring');
});

test('Grab atlas has aligned, transparent idle and driving frames in four directions', async () => {
  const root = 'apps/web/public/assets/maps/game/characters/';
  const base = JSON.parse(await fs.readFile(`${root}grab-chibi-atlas.json`, 'utf8'));
  const tint = JSON.parse(await fs.readFile(`${root}grab-chibi-tint-atlas.json`, 'utf8'));
  assert.deepEqual(base.frames, tint.frames);
  assert.equal(Object.keys(base.frames).length, 24);
  for (const atlas of [base, tint]) {
    const image = sharp(`${root}${atlas.meta.image}`);
    const metadata = await image.metadata();
    assert.equal(metadata.width, atlas.meta.size.w);
    assert.equal(metadata.height, atlas.meta.size.h);
    for (const direction of ['down', 'left', 'right', 'up']) {
      for (const [state, count] of [['walk', 4], ['idle', 2]]) {
        const hashes = [];
        for (let i = 0; i < count; i++) {
          const { frame } = atlas.frames[`${state}-${direction}-${i}`];
          assert.equal(frame.w, 240);
          assert.equal(frame.h, 264);
          assert.equal(frame.w * atlas.meta.displayScale, 80, 'high resolution keeps world size');
          assert.equal(frame.h * atlas.meta.displayScale, 88);
          const pixels = await image.clone().extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h }).ensureAlpha().raw().toBuffer();
          let opaque = 0;
          for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++) {
            const alpha = pixels[(y * frame.w + x) * 4 + 3];
            if (!x || !y || x === frame.w - 1 || y === frame.h - 1) assert.equal(alpha, 0, 'transparent cell gutter');
            if (alpha > 128) opaque++;
          }
          assert.ok(opaque > 50, 'visible character / player color mask');
          hashes.push(pixels.toString('base64'));
        }
        assert.ok(new Set(hashes).size > 1, 'animation must change between frames');
      }
    }
  }
});
