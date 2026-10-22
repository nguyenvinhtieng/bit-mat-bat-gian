// Rebuild text-free branding from the approved chibi illustration.
// Usage: node tools/brand/build.mjs [apps/web/public]
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PUB = path.resolve(process.argv[2] ?? path.join(ROOT, 'apps/web/public'));
const OUT = path.join(PUB, 'brand');
const SOURCE = path.join(ROOT, 'assets/_src/brand/approved-logo.png');
const BACKGROUND = '#10294a';
await fs.mkdir(OUT, { recursive: true });
const source = await fs.readFile(SOURCE);
const metadata = await sharp(source).metadata();
if (metadata.width !== metadata.height) throw new Error('Approved logo must be square');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${source.toString('base64')}"/></svg>\n`;
for (const filename of ['logo.svg', 'logo-emblem.svg']) await fs.writeFile(path.join(OUT, filename), svg);
await fs.writeFile(path.join(PUB, 'favicon.svg'), svg);
const logo = (size) => sharp(source).resize(size, size);
await logo(512).webp({ quality: 92 }).toFile(path.join(OUT, 'logo.webp'));
for (const filename of ['logo.png', 'logo-emblem-512.png']) await logo(512).png().toFile(path.join(OUT, filename));

// Keep the complete artwork inside the inscribed circle of the maskable safe zone.
const appIcon = async (size) => {
  const inner = Math.floor(size * 0.56);
  const image = await logo(inner).png().toBuffer();
  const offset = Math.floor((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: image, top: offset, left: offset }]).png().toBuffer();
};
for (const size of [192, 512]) await fs.writeFile(path.join(OUT, `icon-${size}.png`), await appIcon(size));
await fs.writeFile(path.join(PUB, 'apple-touch-icon.png'), await appIcon(180));

// ICO supports PNG entries; encode its small directory without another build dependency.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => logo(size).png().toBuffer()));
const directory = Buffer.alloc(6 + images.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(images.length, 4);
let offset = directory.length;
images.forEach((image, i) => {
  const entry = 6 + i * 16;
  directory[entry] = sizes[i];
  directory[entry + 1] = sizes[i];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await fs.writeFile(path.join(PUB, 'favicon.ico'), Buffer.concat([directory, ...images]));

// Text-free social card: the same approved image, with its full square composition.
const hero = await logo(590).png().toBuffer();
await sharp(source).resize(1200, 630, { fit: 'cover' }).blur(35).modulate({ brightness: 0.35 })
  .composite([{ input: hero, left: 305, top: 20 }]).jpeg({ quality: 90, mozjpeg: true })
  .toFile(path.join(OUT, 'og-image.jpg'));
console.log('Brand assets rebuilt from assets/_src/brand/approved-logo.png');
