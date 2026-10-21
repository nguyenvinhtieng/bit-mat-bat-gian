// Generates brand assets (logo, favicons, PWA icons, OG card) for "Bịt Mắt Bắt Gian".
// Setup (outside the repo is fine): npm i @resvg/resvg-js sharp png-to-ico
//   fonts/NotoSerif-Black.ttf      — github.com/notofonts/notofonts.github.io (fonts/NotoSerif/hinted/ttf)
//   fonts/BeVietnamPro-SemiBold.ttf — github.com/google/fonts (ofl/bevietnampro)
// usage: node tools/brand/build.mjs apps/web/public
import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const PUB = path.resolve(process.argv[2]);
const OUT = path.join(PUB, 'brand');
fs.mkdirSync(OUT, { recursive: true });
const here = path.dirname(new URL(import.meta.url).pathname);
const FONTS = ['NotoSerif-Black.ttf', 'BeVietnamPro-SemiBold.ttf'].map((f) => path.join(here, 'fonts', f));
const SERIF = `font-family="Noto Serif" font-weight="900"`, SANS = `font-family="Be Vietnam Pro" font-weight="600"`;

// ---------- emblem (512 box) ----------
const DEFS = `
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff0b0"/><stop offset=".45" stop-color="#f0c04e"/><stop offset="1" stop-color="#a8701a"/>
  </linearGradient>
  <radialGradient id="lacq" cx=".5" cy=".42" r=".6">
    <stop offset="0" stop-color="#4a2c17"/><stop offset="1" stop-color="#170d06"/>
  </radialGradient>
  <radialGradient id="jade" cx=".4" cy=".35" r=".7">
    <stop offset="0" stop-color="#7fd6a4"/><stop offset=".55" stop-color="#2f9463"/><stop offset="1" stop-color="#14523a"/>
  </radialGradient>
  <linearGradient id="silk" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ef5a48"/><stop offset=".6" stop-color="#c22b22"/><stop offset="1" stop-color="#861612"/>
  </linearGradient>
  <linearGradient id="silk2" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#d8392d"/><stop offset="1" stop-color="#7a120e"/>
  </linearGradient>
  <linearGradient id="petal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffb3a0"/><stop offset="1" stop-color="#d4473c"/>
  </linearGradient>`;

const INK = '#1e1209';
const EMBLEM = `
  <!-- ribbon tails (behind medallion) -->
  <path d="M410 238 C 455 262, 470 300, 500 318 C 478 330, 458 326, 440 318 C 430 296, 414 276, 396 262 Z" fill="url(#silk2)" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M404 252 C 430 300, 432 350, 470 392 C 444 396, 424 388, 410 374 C 404 334, 396 300, 382 272 Z" fill="url(#silk2)" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <!-- lotus crown -->
  <path d="M256 18 C 284 44, 286 74, 256 96 C 226 74, 228 44, 256 18 Z" fill="url(#petal)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M214 46 C 246 54, 258 80, 250 100 C 222 98, 206 74, 214 46 Z" fill="url(#petal)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M298 46 C 266 54, 254 80, 262 100 C 290 98, 306 74, 298 46 Z" fill="url(#petal)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  <!-- medallion -->
  <circle cx="256" cy="268" r="200" fill="url(#gold)" stroke="${INK}" stroke-width="10"/>
  <circle cx="256" cy="268" r="181" fill="none" stroke="#8a5a14" stroke-width="12" stroke-dasharray="0.1 22.6" stroke-linecap="round"/>
  <circle cx="256" cy="268" r="164" fill="url(#lacq)" stroke="${INK}" stroke-width="8"/>
  <!-- eye -->
  <path d="M112 284 Q 256 150 400 284 Q 256 412 112 284 Z" fill="#f6ecd6" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <circle cx="256" cy="286" r="60" fill="url(#jade)" stroke="${INK}" stroke-width="7"/>
  <circle cx="256" cy="290" r="25" fill="${INK}"/>
  <circle cx="281" cy="304" r="10" fill="#fff"/>
  <!-- blindfold band -->
  <path d="M60 250 Q 256 192 452 228 L 452 276 Q 256 248 60 302 Z" fill="url(#silk)" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
  <path d="M84 272 Q 256 224 430 250" fill="none" stroke="#ff8a74" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/>
  <path d="M96 290 Q 256 248 426 266" fill="none" stroke="#6e0f0b" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>
  <!-- knot -->
  <ellipse cx="420" cy="254" rx="26" ry="32" fill="url(#silk2)" stroke="${INK}" stroke-width="9"/>`;

const emblemSvg = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${DEFS}</defs>${bg ?? ''}${EMBLEM}</svg>`;

// maskable/app icon: emblem scaled into the 80% safe zone on lacquer
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${DEFS}
  <radialGradient id="bgr" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#3b2414"/><stop offset="1" stop-color="#120a05"/></radialGradient></defs>
  <rect width="512" height="512" fill="url(#bgr)"/>
  <g transform="translate(256 262) scale(.74) translate(-256 -262)">${EMBLEM}</g></svg>`;

// ---------- wordmark (text → paths) ----------
// shape text with resvg (proper Vietnamese diacritics) and return it as one outline path
function textPath(font, str, size, x, y, letter = 0, anchor = 'start') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="1000"><text x="${x}" y="${y}" ${font} font-size="${size}" letter-spacing="${letter}" text-anchor="${anchor}">${str}</text></svg>`;
  const out = new Resvg(svg, { font: { fontFiles: FONTS, loadSystemFonts: false } }).toString();
  const d = [...out.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(' ');
  const xs = [...d.matchAll(/([-\d.]+) ([-\d.]+)/g)].map((m) => +m[1]);
  return { d, minX: Math.min(...xs), maxX: Math.max(...xs), w: Math.max(...xs) - Math.min(...xs) };
}
function measure(font, str, size, letter = 0) { return textPath(font, str, size, 0, 500, letter).w; }

function wordmark() {
  const S = 132, L = 6, E = 340; // font size, tracking, emblem size
  const l1 = 'BỊT MẮT', l2 = 'BẮT GIAN';
  const w = Math.max(measure(SERIF, l1, S, L), measure(SERIF, l2, S, L));
  const tx = E + 34, W = Math.ceil(tx + w + 24), H = 392, cx = tx + w / 2;
  const a = textPath(SERIF, l1, S, cx, 172, L, 'middle');
  const b = textPath(SERIF, l2, S, cx, 356, L, 'middle');
  const txt = (p) => `
    <path d="${p.d}" transform="translate(0 7)" fill="${INK}" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
    <path d="${p.d}" fill="none" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <path d="${p.d}" fill="url(#tgold)" stroke="#fff3c4" stroke-opacity=".35" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs>${DEFS}
    <linearGradient id="tgold" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#f2bf4a"/><stop offset="1" stop-color="#b9781a"/></linearGradient></defs>
    <g transform="translate(6 ${(H - E) / 2}) scale(${E / 512})">${EMBLEM}</g>
    ${txt(a)}${txt(b)}</svg>`;
}

const png = (svg, w, h) => sharp(Buffer.from(svg), { density: 300 }).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();

const emblem = emblemSvg();
const wm = wordmark();
fs.writeFileSync(path.join(OUT, 'logo-emblem.svg'), emblem);
fs.writeFileSync(path.join(OUT, 'logo.svg'), wm);
fs.writeFileSync(path.join(PUB, 'favicon.svg'), emblem);

await png(wm, 1200, null).webp({ quality: 92 }).toFile(path.join(OUT, 'logo.webp'));
await png(wm, 1200, null).toFile(path.join(OUT, 'logo.png'));
await png(emblem, 512, 512).toFile(path.join(OUT, 'logo-emblem-512.png'));
for (const s of [192, 512]) await png(appIconSvg, s, s).toFile(path.join(OUT, `icon-${s}.png`));
await png(appIconSvg, 180, 180).toFile(path.join(PUB, 'apple-touch-icon.png'));
const icoPngs = await Promise.all([16, 32, 48].map((s) => png(emblem, s, s).toBuffer()));
fs.writeFileSync(path.join(PUB, 'favicon.ico'), await pngToIco(icoPngs));

// ---------- Open Graph / social card 1200x630 ----------
const bg = await sharp(path.join(PUB, 'assets/maps/game/meta/home-bg.webp')).resize(1200, 630, { fit: 'cover' }).toBuffer();
const tag = 'Mắt Ai Cũng Bịt, Gian Ai Cũng Giấu';
const tp = textPath(SANS, tag, 44, 600, 520, 1, 'middle');
const sub = 'Game suy luận xã hội nhiều người chơi · Chơi miễn phí trên trình duyệt';
const sp = textPath(SANS, sub, 26, 600, 572, 0, 'middle');
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
  <defs><radialGradient id="v" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#120a05" stop-opacity=".35"/><stop offset="1" stop-color="#0b0603" stop-opacity=".92"/></radialGradient>
  <linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset=".55" stop-color="#0b0603" stop-opacity="0"/><stop offset="1" stop-color="#0b0603" stop-opacity=".9"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#v)"/><rect width="1200" height="630" fill="url(#b)"/>
  <rect x="14" y="14" width="1172" height="602" rx="18" fill="none" stroke="#e0a93b" stroke-opacity=".7" stroke-width="3"/>
  <path d="${tp.d}" fill="none" stroke="#0b0603" stroke-width="8" stroke-linejoin="round"/><path d="${tp.d}" fill="#f6ecd6"/>
  <path d="${sp.d}" fill="#e0a93b"/></svg>`;
const logoBuf = await png(wm, 900, null).toBuffer();
const lm = await sharp(logoBuf).metadata();
await sharp(bg)
  .composite([
    { input: Buffer.from(overlay), top: 0, left: 0 },
    { input: logoBuf, top: Math.round(40 + (420 - lm.height) / 2), left: Math.round((1200 - lm.width) / 2) },
  ])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(path.join(OUT, 'og-image.jpg'));
console.log('ok', fs.readdirSync(OUT));
