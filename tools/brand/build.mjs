// Generates brand assets (logo, favicons, PWA icons, OG card) for "Công An Chìm — The Hidden Police".
// Setup (outside the repo is fine): npm i @resvg/resvg-js sharp png-to-ico
//   fonts/NotoSerif-Black.ttf      — github.com/notofonts/notofonts.github.io (fonts/NotoSerif/hinted/ttf)
//   fonts/BeVietnamPro-SemiBold.ttf, BeVietnamPro-ExtraBold.ttf — github.com/google/fonts (ofl/bevietnampro)
//   (BRAND_FONTS=/some/dir overrides the fonts folder)
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
const FONT_DIR = process.env.BRAND_FONTS ?? path.join(here, 'fonts');
const FONTS = ['NotoSerif-Black.ttf', 'BeVietnamPro-SemiBold.ttf', 'BeVietnamPro-ExtraBold.ttf'].map((f) => path.join(FONT_DIR, f));
const SERIF = `font-family="Noto Serif" font-weight="900"`, SANS = `font-family="Be Vietnam Pro" font-weight="600"`;
const SANS_X = `font-family="Be Vietnam Pro" font-weight="800"`;

// ---------- emblem (512 box) ----------
const DEFS = () => `
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
  </linearGradient>${EMBLEM_DEFS}`;

const INK = '#1e1209';
const SKIN = '#e3a874';
// 5-point star centred on (cx, cy)
const star = (cx, cy, R, r) =>
  'M' + Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? r : R;
    return `${(cx + k * Math.cos(a)).toFixed(1)} ${(cy + k * Math.sin(a)).toFixed(1)}`;
  }).join(' L') + ' Z';
// one rice-ear branch hugging the shield (mirrored for the right side)
function riceEar(flip) {
  const q = (t, a, b, c) => (1 - t) ** 2 * a + 2 * (1 - t) * t * b + t * t * c;
  const P = [[204, 468], [66, 420], [74, 196]];
  const pt = (t) => [q(t, P[0][0], P[1][0], P[2][0]), q(t, P[0][1], P[1][1], P[2][1])];
  let g = `<path d="M${P[0]} Q${P[1]} ${P[2]}" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
    <path d="M${P[0]} Q${P[1]} ${P[2]}" fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round"/>`;
  for (let i = 0; i < 9; i++) {
    const t = 0.12 + i * 0.1, [x, y] = pt(t), [x2, y2] = pt(t + 0.01);
    const ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
    for (const side of [-1, 1]) g += `<ellipse cx="0" cy="${side * 15}" rx="${17 - i * 0.6}" ry="8" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(ang + side * 28).toFixed(1)})" fill="url(#gold)" stroke="${INK}" stroke-width="4"/>`;
  }
  g += `<ellipse cx="74" cy="182" rx="9" ry="19" fill="url(#gold)" stroke="${INK}" stroke-width="4"/>`;
  return flip ? `<g transform="translate(512 0) scale(-1 1)">${g}</g>` : `<g>${g}</g>`;
}
// police shield; inside it the undercover driver, lit by a red/blue siren glow
const SHIELD = 'M256 54 L 416 104 C 418 262 366 382 256 466 C 146 382 94 262 96 104 Z';
const ring = (k) => `transform="translate(256 262) scale(${k}) translate(-256 -262)"`;
const EMBLEM_DEFS = `
  <radialGradient id="sirenR" cx=".18" cy=".5" r=".6"><stop offset="0" stop-color="#ff3b30" stop-opacity=".75"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
  <radialGradient id="sirenB" cx=".82" cy=".5" r=".6"><stop offset="0" stop-color="#2f7dff" stop-opacity=".8"/><stop offset="1" stop-color="#2f7dff" stop-opacity="0"/></radialGradient>
  <linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1426"/><stop offset="1" stop-color="#0b0710"/></linearGradient>
  <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f0b98a"/><stop offset=".6" stop-color="${SKIN}"/><stop offset="1" stop-color="#b9784a"/></linearGradient>
  <linearGradient id="jacket" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fae7c"/><stop offset="1" stop-color="#14523a"/></linearGradient>
  <linearGradient id="helm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b57"/><stop offset=".55" stop-color="#cf2d22"/><stop offset="1" stop-color="#7d1410"/></linearGradient>
  <linearGradient id="lensL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff5a4a"/><stop offset=".45" stop-color="#2a0d10"/><stop offset="1" stop-color="#07040a"/></linearGradient>
  <linearGradient id="lensR" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa2ff"/><stop offset=".45" stop-color="#0d1630"/><stop offset="1" stop-color="#07040a"/></linearGradient>
  <linearGradient id="mask" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a46"/><stop offset="1" stop-color="#1b1b23"/></linearGradient>
  <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8a5a14"/><stop offset=".5" stop-color="#4a2e0a"/><stop offset="1" stop-color="#8a5a14"/></linearGradient>
  <clipPath id="inner"><path d="${SHIELD}" ${ring(0.84)}/></clipPath>`;
const EMBLEM = `
  ${riceEar(false)}${riceEar(true)}
  <!-- shield: gold rim, dark bevel, night field -->
  <path d="${SHIELD}" transform="translate(0 8)" fill="${INK}" opacity=".5"/>
  <path d="${SHIELD}" fill="url(#gold)" stroke="${INK}" stroke-width="10" stroke-linejoin="round"/>
  <path d="${SHIELD}" ${ring(0.91)} fill="url(#bevel)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
  <path d="${SHIELD}" ${ring(0.84)} fill="url(#field)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
  <g clip-path="url(#inner)">
    <rect x="0" y="0" width="512" height="512" fill="url(#sirenR)"/>
    <rect x="0" y="0" width="512" height="512" fill="url(#sirenB)"/>
    <!-- jacket + neck -->
    <path d="M226 330 L 286 330 L 290 384 L 222 384 Z" fill="#a8693c" stroke="${INK}" stroke-width="7"/>
    <path d="M110 480 C 118 408 176 376 256 372 C 336 376 394 408 402 480 Z" fill="url(#jacket)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M216 376 L 256 420 L 296 376" fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M150 420 C 168 396 196 386 214 382" fill="none" stroke="#7fe0b0" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/>
    <!-- face -->
    <path d="M180 236 C 178 316 210 362 256 362 C 302 362 334 316 332 236 Z" fill="url(#skin)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
    <!-- cloth mask with ear loops -->
    <path d="M184 300 L 176 270 M 328 300 L 336 270" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M182 296 Q 256 278 330 296 L 322 330 Q 256 372 190 330 Z" fill="url(#mask)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
    <path d="M196 312 Q 256 298 316 312 M 202 328 Q 256 316 310 328" fill="none" stroke="#55556a" stroke-width="3.5" stroke-linecap="round"/>
    <!-- aviator shades reflecting the siren -->
    <path d="M176 252 L 336 252" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <path d="M186 250 L 248 250 C 250 278 238 292 216 292 C 194 292 184 276 186 250 Z" fill="url(#lensL)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M326 250 L 264 250 C 262 278 274 292 296 292 C 318 292 328 276 326 250 Z" fill="url(#lensR)" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M196 258 L 214 258 M 304 258 L 316 258" stroke="#fff" stroke-opacity=".75" stroke-width="4" stroke-linecap="round"/>
    <!-- half helmet + peak + chin strap -->
    <path d="M168 238 C 164 132 348 132 344 238 Z" fill="url(#helm)" stroke="${INK}" stroke-width="9" stroke-linejoin="round"/>
    <path d="M244 160 Q 256 158 268 160 L 268 236 L 244 236 Z" fill="#f6ecd6" fill-opacity=".85"/>
    <path d="M192 196 Q 206 166 236 158" fill="none" stroke="#ffb3a0" stroke-opacity=".8" stroke-width="7" stroke-linecap="round"/>
    <path d="M156 244 Q 256 222 356 244 L 352 258 Q 256 238 160 258 Z" fill="#7d1410" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
  </g>
  <path d="${SHIELD}" ${ring(0.84)} fill="none" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
  <!-- ribbon (no lettering) -->
  <path d="M138 424 L 92 428 L 108 448 L 92 470 L 138 462 Z" fill="url(#silk2)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M374 424 L 420 428 L 404 448 L 420 470 L 374 462 Z" fill="url(#silk2)" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M126 418 Q 256 446 386 418 L 386 458 Q 256 486 126 458 Z" fill="url(#silk)" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M140 430 Q 256 456 372 430" fill="none" stroke="#ff8a74" stroke-opacity=".6" stroke-width="4" stroke-linecap="round"/>
  ${[[214, 448], [256, 456], [298, 448]].map(([x, y]) => `<path d="${star(x, y, 12, 5)}" fill="url(#gold)" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`).join('')}
  <!-- star seal on top -->
  <circle cx="256" cy="66" r="44" fill="url(#silk)" stroke="${INK}" stroke-width="8"/>
  <circle cx="256" cy="66" r="34" fill="none" stroke="#f0c04e" stroke-width="3" stroke-dasharray="1 7" stroke-linecap="round"/>
  <path d="${star(256, 68, 27, 11)}" fill="url(#gold)" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;

const emblemSvg = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${DEFS()}</defs>${bg ?? ''}${EMBLEM}</svg>`;

// maskable/app icon: emblem scaled into the 80% safe zone on lacquer
const appIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${DEFS()}
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
  const S = 128, L = 4, E = 360, H = 420; // font size, tracking, emblem size, canvas height
  const l1 = 'CÔNG AN', l2 = 'CHÌM';
  const sub = 'THE HIDDEN POLICE', SS = 34, SL = 7;
  const w = Math.max(measure(SERIF, l1, S, L), measure(SERIF, l2, S * 1.18, L));
  const tx = E + 30, W = Math.ceil(tx + w + 24), cx = tx + w / 2;
  const a = textPath(SERIF, l1, S, cx, 150, L, 'middle');
  const b = textPath(SERIF, l2, S * 1.18, cx, 296, L, 'middle');
  // blue enamel house-number plate, the kind nailed at every Sài Gòn hẻm
  const sp = textPath(SANS_X, sub, SS, cx, 376, SL, 'middle');
  const pw = sp.w + 56, px = cx - pw / 2;
  const txt = (p) => `
    <path d="${p.d}" transform="translate(0 7)" fill="${INK}" stroke="${INK}" stroke-width="16" stroke-linejoin="round"/>
    <path d="${p.d}" fill="none" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>
    <path d="${p.d}" fill="url(#tgold)" stroke="#fff3c4" stroke-opacity=".35" stroke-width="1.5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs>${DEFS()}
    <linearGradient id="tgold" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#f2bf4a"/><stop offset="1" stop-color="#b9781a"/></linearGradient>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fc4"/><stop offset="1" stop-color="#173f86"/></linearGradient></defs>
    <g transform="translate(6 ${(H - E) / 2}) scale(${E / 512})">${EMBLEM}</g>
    ${txt(a)}${txt(b)}
    <rect x="${px}" y="${330 + 6}" width="${pw}" height="62" rx="12" fill="${INK}"/>
    <rect x="${px}" y="330" width="${pw}" height="62" rx="12" fill="url(#plate)" stroke="${INK}" stroke-width="6"/>
    <rect x="${px + 7}" y="337" width="${pw - 14}" height="48" rx="7" fill="none" stroke="#f4f1e8" stroke-width="3"/>
    <path d="${sp.d}" fill="#f8f5ec"/></svg>`;
}

const png = (svg, w, h) => sharp(Buffer.from(svg), { density: 300 }).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();

const emblem = emblemSvg();
const wm = wordmark();
fs.writeFileSync(path.join(OUT, 'logo-emblem.svg'), emblem);
fs.writeFileSync(path.join(OUT, 'logo.svg'), emblem);
fs.writeFileSync(path.join(PUB, 'favicon.svg'), emblem);

// the page logo is the emblem alone: no lettering, so nothing can break on a missing font
await png(emblem, 512, 512).webp({ quality: 92 }).toFile(path.join(OUT, 'logo.webp'));
await png(emblem, 512, 512).toFile(path.join(OUT, 'logo.png'));
await png(emblem, 512, 512).toFile(path.join(OUT, 'logo-emblem-512.png'));
for (const s of [192, 512]) await png(appIconSvg, s, s).toFile(path.join(OUT, `icon-${s}.png`));
await png(appIconSvg, 180, 180).toFile(path.join(PUB, 'apple-touch-icon.png'));
const icoPngs = await Promise.all([16, 32, 48].map((s) => png(emblem, s, s).toBuffer()));
fs.writeFileSync(path.join(PUB, 'favicon.ico'), await pngToIco(icoPngs));

// ---------- Open Graph / social card 1200x630 ----------
const bg = await sharp(path.join(PUB, 'assets/maps/game/meta/home-bg.webp')).resize(1200, 630, { fit: 'cover' }).toBuffer();
const tag = 'Ai Là Công An Chìm Trong Hẻm 42?';
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
