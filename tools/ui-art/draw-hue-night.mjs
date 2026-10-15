#!/usr/bin/env node
/**
 * Night-clock UI art for Cố đô Huế (5 canh timer + ghost notice).
 *   node tools/ui-art/draw-hue-night.mjs            (SHARP_DIR=/path/to/node_modules/sharp if sharp is not installed here)
 * Writes:
 *   assets/_src/maps/co-do-hue/night/<name>.svg                    editable vector sources
 *   apps/web/public/assets/maps/co-do-hue/minigames/<name>.webp    UI art
 * Same style as draw-hue-bansoc.mjs: soft dark outline (#22100a), lacquer red, imperial yellow, gold.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = createRequire(path.join(process.env.SHARP_DIR || '.', 'x.js'))('sharp');
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SRC = path.join(ROOT, 'assets/_src/maps/co-do-hue/night');
const PUB = path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/minigames');
const INK = '#22100a';

/** Hồn ma: a pale wisp holding a red paper lantern (notice shown after you die). */
const honMa = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe28a" stop-opacity=".55"/><stop offset="1" stop-color="#ffe28a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f7ff"/><stop offset=".65" stop-color="#c9d6f0"/><stop offset="1" stop-color="#8fa3cc" stop-opacity=".35"/>
    </linearGradient>
    <linearGradient id="lamp" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a5261f"/><stop offset=".5" stop-color="#e2584a"/><stop offset="1" stop-color="#a5261f"/>
    </linearGradient>
  </defs>
  <circle cx="186" cy="150" r="70" fill="url(#glow)"/>
  <path d="M128 34c-42 0-70 32-70 76v62c0 14-10 24-18 34 14 6 26-2 34-10 6 14 18 22 30 14 10 12 26 12 36 0 12 8 24 0 30-14 8 8 20 16 34 10-8-10-18-20-18-34v-62c0-44-28-76-58-76z"
    fill="url(#body)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <ellipse cx="108" cy="104" rx="10" ry="14" fill="${INK}"/>
  <ellipse cx="150" cy="104" rx="10" ry="14" fill="${INK}"/>
  <circle cx="111" cy="99" r="3.5" fill="#fff"/><circle cx="153" cy="99" r="3.5" fill="#fff"/>
  <path d="M116 134q13 10 26 0" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="94" cy="124" rx="9" ry="5" fill="#ef9aa0" opacity=".6"/><ellipse cx="166" cy="124" rx="9" ry="5" fill="#ef9aa0" opacity=".6"/>
  <path d="M176 140q14-6 12-26" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <line x1="186" y1="112" x2="186" y2="124" stroke="${INK}" stroke-width="4"/>
  <rect x="174" y="122" width="24" height="7" rx="2" fill="#f4b93a" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="186" cy="152" rx="22" ry="25" fill="url(#lamp)" stroke="${INK}" stroke-width="5"/>
  <path d="M174 134q-6 18 0 36M198 134q6 18 0 36M186 128v48" stroke="#6a1410" stroke-width="2.5" fill="none" opacity=".7"/>
  <ellipse cx="186" cy="150" rx="9" ry="12" fill="#ffe28a" opacity=".55"/>
  <rect x="176" y="175" width="20" height="7" rx="2" fill="#f4b93a" stroke="${INK}" stroke-width="4"/>
  <path d="M182 182l-2 16M190 182l2 16M186 182v18" stroke="#d8473a" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const jobs = [['hue-ui-hon-ma', honMa, 256]];
fs.mkdirSync(SRC, { recursive: true });
fs.mkdirSync(PUB, { recursive: true });
for (const [name, svg, size] of jobs) {
  fs.writeFileSync(path.join(SRC, `${name}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(size, size).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  console.log('wrote', name);
}
