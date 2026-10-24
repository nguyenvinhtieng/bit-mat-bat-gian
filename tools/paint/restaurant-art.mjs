/** Import selected transparent restaurant sprites without changing any other atlas pixels.
 * node tools/paint/restaurant-art.mjs <directory containing banh-mi.png etc.>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Provide the restaurant sprite directory');
const base = 'apps/web/public/assets/maps/game';
const atlasPath = `${base}/atlas/decor-0`;
const atlas = JSON.parse(await fs.readFile(`${atlasPath}.json`, 'utf8'));
const manifest = JSON.parse(await fs.readFile(`${base}/game.assets.json`, 'utf8'));
const original = await sharp(`${atlasPath}.webp`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const entries = [
  ['banh-mi', 'prop-exhibition-xe-banh-mi'],
  ['hu-tieu', 'prop-exhibition-xe-hu-tieu'],
  ['com-tam', 'prop-exhibition-xe-com-tam'],
  ['nuoc-mia', 'prop-exhibition-xe-nuoc-mia'],
  ['sink', 'decor-exhibition-sink', [80, 112]],
  ['pickup', 'decor-exhibition-pickup', [64, 112]],
  ['table', 'decor-exhibition-table', [80, 64]],
  ['red-chair', 'decor-exhibition-chair-red', [40, 48]],
  ['blue-chair', 'decor-exhibition-chair-blue', [40, 48]],
  ['waiting-sign', 'decor-exhibition-waiting-sign', [72, 120]],
];
let nextX = 0;
const extraY = atlas.frames['decor-exhibition-sink']?.frame.y ?? original.info.height + 6;
// This appended row is reserved for restaurant-only props, whose sizes may change.
if (extraY < original.info.height) original.data.fill(0, extraY * original.info.width * 4);
const layers = [];
for (const [file, key, size] of entries) {
  if (size) {
    const [w, h] = size.map(n => n * 3);
    atlas.frames[key] = { frame: { x: nextX, y: extraY, w, h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } };
    manifest.props[key] = { atlas: 'decor-0', size, anchor: [0.5, 1], textureSize: [w, h] };
    nextX += w + 6;
  }
  const { x, y, w, h } = atlas.frames[key].frame;
  // Clear old frame completely before compositing, including old alpha.
  for (let row = y; row < Math.min(y + h, original.info.height); row++)
    original.data.fill(0, (row * original.info.width + x) * 4, (row * original.info.width + x + w) * 4);
  const input = await sharp(path.join(source, `${file}.png`)).trim({ threshold: 8 })
    .resize(w - 12, h - 12, { fit: 'contain', background: '#00000000' })
    .extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#00000000' }).ensureAlpha().raw().toBuffer();
  layers.push({ input, left: x, top: y, width: w, height: h });
}
const width = original.info.width, height = Math.max(...layers.map(layer => layer.top + layer.height));
// Copy RGBA bytes directly so compositing cannot round untouched translucent pixels.
const output = Buffer.alloc(width * height * 4);
original.data.copy(output);
for (const layer of layers)
  for (let row = 0; row < layer.height; row++)
    layer.input.copy(output, ((layer.top + row) * width + layer.left) * 4,
      row * layer.width * 4, (row + 1) * layer.width * 4);
const pixels = await sharp(output, { raw: { width, height, channels: 4 } }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
await fs.writeFile(`${atlasPath}.webp`, pixels);
atlas.meta.size = { w: width, h: height };
await fs.writeFile(`${atlasPath}.json`, JSON.stringify(atlas, null, 2) + '\n');
manifest.atlases.find(a => a.name === 'decor-0').size = [width, height];
await fs.writeFile(`${base}/game.assets.json`, JSON.stringify(manifest, null, 1) + '\n');
console.log(`Imported ${entries.length} restaurant sprites; atlas ${width}×${height}`);
