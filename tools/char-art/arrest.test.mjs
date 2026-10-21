import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const root = 'apps/web/public/assets/maps/game/characters/';
test('paired arrest atlas preserves combat pixels and independent helmet masks', async () => {
  const [base, tint] = await Promise.all(['player-action', 'player-action-tint'].map(async n => JSON.parse(await fs.readFile(`${root}${n}.json`))));
  assert.deepEqual(base.frames, tint.frames);
  assert.equal(Object.keys(base.frames).length, 34);
  const t = base.meta.arrest;
  assert.deepEqual(t.frameMs, [0, 350, 700, 2200, 2700, 3200, 3650, 4050]);
  assert.ok(t.frameMs[3] - t.frameMs[2] >= 1500, 'badge remains visible long enough to read');
  assert.equal(t.displayScale, 1 / 3);
  assert.deepEqual([t.cuffsAt, t.escortAt, t.bikeAt, t.duration], [3200, 4050, 4650, 5200]);
  for (const atlas of [base, tint]) {
    const image = sharp(root + atlas.meta.image), metadata = await image.metadata();
    assert.equal(metadata.width, atlas.meta.size.w); assert.equal(metadata.height, atlas.meta.size.h);
    const legacyName = atlas === base ? 'player-action' : 'player-action-tint';
    const legacy = await sharp(`assets/maps/game/characters/${legacyName}.png`).ensureAlpha().raw().toBuffer();
    const old = atlas.frames['strike-0'].frame;
    const preserved = await image.clone().extract({ left: old.x, top: old.y, width: 528, height: 264 }).ensureAlpha().raw().toBuffer();
    for (let p = 0; p < legacy.length; p += 4) {
      assert.equal(preserved[p + 3], legacy[p + 3]);
      if (legacy[p + 3]) assert.deepEqual(preserved.subarray(p, p + 3), legacy.subarray(p, p + 3));
    }
    for (const [name, { frame: f }] of Object.entries(atlas.frames)) {
      if (!name.startsWith('arrest-')) continue;
      assert.equal(f.w, 576); assert.equal(f.h, 384);
      const pixels = await image.clone().extract({ left: f.x, top: f.y, width: f.w, height: f.h }).ensureAlpha().raw().toBuffer();
      let visible = 0;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const a = pixels[(y * f.w + x) * 4 + 3];
        if (!x || !y || x === f.w - 1 || y === f.h - 1) assert.equal(a, 0);
        if (a > 128) visible++;
      }
      assert.ok(visible > 300, `${name} must have visible pixels`);
    }
  }
  for (let i = 0; i < 8; i++) {
    const masks = await Promise.all([`arrest-${i}`, `arrest-victim-${i}`].map(async name => {
      const f = tint.frames[name].frame;
      return sharp(root + tint.meta.image).extract({left:f.x,top:f.y,width:f.w,height:f.h}).ensureAlpha().raw().toBuffer();
    }));
    assert.notDeepEqual(tint.frames[`arrest-${i}`].frame, tint.frames[`arrest-victim-${i}`].frame);
    for (let p = 0; p < masks[0].length; p += 4) assert.ok(!(masks[0][p + 3] && masks[1][p + 3]), 'helmet masks cannot overlap');
  }
});
