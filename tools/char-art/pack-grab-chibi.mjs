// Built-in ChatGPT Image source: grab-chibi-sheet.png.
// Prompt: cute reference-style oval eyes, tiny smile and soft pink cheeks;
// blank magenta-key helmet and entire scooter, green jacket/box, white 'CRAP'
// lettering on box only; transparent 6x4 sheet; down/left/right/up rows;
// two stopped breathing frames followed by four driving frames per direction.
// 3x atlas preserves fine lines, displayed at the existing 80x88 world size.
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { playerColorLayers } from './player-color-layers.mjs';

const source = 'assets/_src/maps/game/characters/grab-chibi-sheet.png';
const output = 'apps/web/public/assets/maps/game/characters/';
const { width, height } = await sharp(source).metadata();
const cw = width / 6, ch = height / 4;
const resolution = 3, fw = 80 * resolution, fh = 88 * resolution;
const frames = {}, base = [], tint = [];
for (const [row, direction] of ['down', 'left', 'right', 'up'].entries()) {
  for (let col = 0; col < 6; col++) {
    const cell = sharp(source).extract({ left: col * cw, top: row * ch, width: cw, height: ch });
    const { data, info } = await cell.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Keep the main connected sprite: generated grids can have a neighboring
    // helmet's top edge bleed into a cell. Never include that detached fragment.
    const labels = new Int32Array(cw * ch);
    let component = 0, largest = 0, largestSize = 0;
    for (let start = 0; start < labels.length; start++) {
      if (labels[start] || data[start * 4 + 3] <= 16) continue;
      const queue = [start];
      labels[start] = ++component;
      for (let head = 0; head < queue.length; head++) {
        const p = queue[head], x = p % cw, y = Math.floor(p / cw);
        for (const next of [x > 0 ? p - 1 : -1, x < cw - 1 ? p + 1 : -1, y > 0 ? p - cw : -1, y < ch - 1 ? p + cw : -1]) {
          if (next < 0 || labels[next] || data[next * 4 + 3] <= 16) continue;
          labels[next] = component;
          queue.push(next);
        }
      }
      if (queue.length > largestSize) { largest = component; largestSize = queue.length; }
    }
    for (let p = 0; p < labels.length; p++) if (labels[p] !== largest) data[p * 4 + 3] = 0;
    let left = cw, right = 0, top = ch, bottom = 0;
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (data[(y * cw + x) * 4 + 3] < 100) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    if (right <= left || bottom <= top) throw new Error(`Empty sprite ${row}/${col}`);
    const normalized = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize({ width: 74 * resolution, height: 82 * resolution, fit: 'inside' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const layers = playerColorLayers(normalized.data);
    const w = normalized.info.width, h = normalized.info.height;
    const x = col * fw + Math.round((fw - w) / 2), y = row * fh + 85 * resolution - h;
    const raw = { width: w, height: h, channels: 4 };
    base.push({ input: await sharp(layers.base, { raw }).png().toBuffer(), left: x, top: y });
    tint.push({ input: await sharp(layers.tint, { raw }).png().toBuffer(), left: x, top: y });
    const name = col < 2 ? `idle-${direction}-${col}` : `walk-${direction}-${col - 2}`;
    frames[name] = { frame: { x: col * fw, y: row * fh, w: fw, h: fh }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: fw, h: fh }, sourceSize: { w: fw, h: fh } };
  }
}
for (const [name, cells] of [['grab-chibi-atlas', base], ['grab-chibi-tint-atlas', tint]]) {
  await sharp({ create: { width: fw * 6, height: fh * 4, channels: 4, background: '#00000000' } })
    .composite(cells).webp({ lossless: true }).toFile(`${output}${name}.webp`);
  await fs.writeFile(`${output}${name}.json`, JSON.stringify({ frames, meta: {
    app: 'the-hidden-truth/chatgpt-image', image: `${name}.webp`, size: { w: fw * 6, h: fh * 4 }, scale: '1', displayScale: 1 / resolution,
    anim: { idle: [0, 0, 1, 1], idleFps: 3 },
  } }, null, 2) + '\n');
}
console.log('Packed Crap chibi: 24 high resolution frames, idle + drive, four directions.');
