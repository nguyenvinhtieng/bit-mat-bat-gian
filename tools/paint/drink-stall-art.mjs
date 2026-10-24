/** Import straight-on Quán Nước sprites, preserving every unrelated atlas pixel.
 * node tools/paint/drink-stall-art.mjs [source directory]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = process.argv[2] ?? 'assets/maps/game/drink-stall';
const base = 'apps/web/public/assets/maps/game';
const atlasPath = `${base}/atlas/decor-0`;
const atlas = JSON.parse(await fs.readFile(`${atlasPath}.json`, 'utf8'));
const manifest = JSON.parse(await fs.readFile(`${base}/game.assets.json`, 'utf8'));
const original = await sharp(`${atlasPath}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const entries = [
  ['coffee', 'prop-coordination-quay-ca-phe', [160, 120]],
  ['tv', 'prop-coordination-tivi', [96, 112]],
  ['router', 'decor-coordination-router', [72, 52]],
  ['cards', 'prop-coordination-danh-bai', [192, 160]],
  ['bikes', 'prop-coordination-xe-dung', [160, 96]],
];
const scale = atlas.meta.textureScale;
if (scale !== 3) throw new Error('Expected a 3× map atlas');
let nextX = 0;
const appendY = original.info.height + 6;
const layers = [];
for (const [file, key, size] of entries) {
  const [w, h] = size.map(n => n * scale);
  if (!atlas.frames[key]) {
    if (nextX + w > original.info.width) throw new Error('Sprite row exceeds atlas width');
    atlas.frames[key] = { frame: { x: nextX, y: appendY, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
    nextX += w + 6;
  }
  const frame = atlas.frames[key].frame;
  if (frame.w !== w || frame.h !== h) throw new Error(`Unexpected frame size: ${key}`);
  manifest.props[key] = { ...manifest.props[key], atlas: 'decor-0', size,
    anchor: [0.5, 1], textureSize: [w, h] };
  const input = await sharp(path.join(source, `${file}.png`)).trim({ threshold: 8 })
    .resize(w - 12, h - 12, { fit: 'contain', background: '#00000000' })
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#00000000' })
    .ensureAlpha().raw().toBuffer();
  layers.push({ input, ...frame });
}
const width = original.info.width;
const height = Math.max(original.info.height, ...layers.map(layer => layer.y + layer.h));
const output = Buffer.alloc(width * height * 4);
original.data.copy(output);
for (const layer of layers)
  for (let row = 0; row < layer.h; row++)
    layer.input.copy(output, ((layer.y + row) * width + layer.x) * 4,
      row * layer.w * 4, (row + 1) * layer.w * 4);
await fs.writeFile(`${atlasPath}.webp`, await sharp(output, { raw: { width, height, channels: 4 } })
  .webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer());
atlas.meta.size = { w: width, h: height };
await fs.writeFile(`${atlasPath}.json`, JSON.stringify(atlas, null, 2) + '\n');
manifest.atlases.find(a => a.name === 'decor-0').size = [width, height];
await fs.writeFile(`${base}/game.assets.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`Imported ${entries.length} drink-stall sprites; atlas ${width}×${height}`);
