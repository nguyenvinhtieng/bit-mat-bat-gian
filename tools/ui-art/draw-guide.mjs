#!/usr/bin/env node
/**
 * Procedural (vector) art for the "How to play" guide popup — no AI / API key needed.
 *   node tools/ui-art/draw-guide.mjs [repoRoot]
 * Writes assets/_src/common/ui/guide/<name>.svg, assets/common/ui/guide/<name>.png,
 *        apps/web/public/assets/common/ui/guide/<name>.webp
 *
 * Assets (rendered at 2x the SVG size; numbers below are final px — keep styles.css in sync):
 *   frame-guide            512x512 9-slice, slice 112   (teak + double gold + jade gems + cloud corners)
 *   guide-title            760x150 ribbon plaque for the title (text is HTML on top)
 *   tab / tab-active       320x96, horizontal 3-slice, slice 48 (fill)
 *   tab-story/roles        96x96 tab icons (scroll, mask)
 *   btn-close              128x128 round lacquer close button
 *   card / card-crew / card-killer   256x256 9-slice, slice 56 (inset panels)
 *   btn-guide              256x256 round jade button with an open book (settings popup)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const SRC = path.join(ROOT, 'assets/_src/common/ui/guide');
const OUT = path.join(ROOT, 'assets/common/ui/guide');
const PUB = path.join(ROOT, 'apps/web/public/assets/common/ui/guide');

const INK = '#22100a';
const GOLD_STOPS = `<stop offset="0" stop-color="#fff2bf"/><stop offset=".32" stop-color="#f3c75a"/><stop offset=".68" stop-color="#c58b26"/><stop offset="1" stop-color="#7d4f12"/>`;
const gold = (id = 'gold', x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${GOLD_STOPS}</linearGradient>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

const corners = (S, piece, H = S) =>
  ['', `transform="translate(${S} 0) scale(-1 1)"`, `transform="translate(0 ${H}) scale(1 -1)"`, `transform="translate(${S} ${H}) scale(-1 -1)"`]
    .map((t) => `<g ${t}>${piece}</g>`)
    .join('');
const ring = (S, inset, extra) => `<rect x="${inset}" y="${inset}" width="${S - 2 * inset}" height="${S - 2 * inset}" ${extra}/>`;
const band = (S, outer, inner, rx = 8) =>
  `M${outer + rx} ${outer} H${S - outer - rx} Q${S - outer} ${outer} ${S - outer} ${outer + rx} V${S - outer - rx} Q${S - outer} ${S - outer} ${S - outer - rx} ${S - outer} H${outer + rx} Q${outer} ${S - outer} ${outer} ${S - outer - rx} V${outer + rx} Q${outer} ${outer} ${outer + rx} ${outer} Z ` +
  `M${inner} ${inner} V${S - inner} H${S - inner} V${inner} Z`;
function lozenge(cx, cy, r, gem) {
  return `<g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z" fill="url(#gold)"/>
    <path d="M${cx} ${cy - r * 0.5} L${cx + r * 0.5} ${cy} L${cx} ${cy + r * 0.5} L${cx - r * 0.5} ${cy} Z" fill="${gem}" stroke-width="1.4"/>
    <circle cx="${cx - r * 0.12}" cy="${cy - r * 0.16}" r="${r * 0.12}" fill="#fff" stroke="none" opacity=".7"/>
  </g>`;
}

/* ------------------------------------------------------------------ main frame (9-slice) */
function frameGuide() {
  const S = 256, B = 56;
  const cloud = `
    <path d="M4 16 Q4 4 16 4 H58 Q55 17 43 19 Q29 21 25 31 Q21 45 8 48 L4 58 Z" fill="url(#goldD)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M18 18 m10 4 a6 6 0 1 1 -5 -8 q12 1 12 13 q0 12 -13 13" fill="none" stroke="#7d4f12" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M40 9 q10 3 13 -2 M9 40 q3 10 -2 13" fill="none" stroke="#7d4f12" stroke-width="2" stroke-linecap="round"/>
    ${lozenge(30, 30, 10, '#2f8a64')}`;
  return svg(S, S, `
  <defs>${gold()}${gold('goldD', 1, 1).replace('#fff2bf', '#f8dc8a')}
    <linearGradient id="teak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a3420"/><stop offset=".5" stop-color="#3b2214"/><stop offset="1" stop-color="#26150c"/></linearGradient>
  </defs>
  <path d="${band(S, 1, B, 12)}" fill="${INK}" fill-rule="evenodd"/>
  <path d="${band(S, 4, B - 3, 10)}" fill="url(#teak)" fill-rule="evenodd"/>
  ${ring(S, 8, 'fill="none" stroke="#7a4a2a" stroke-width="1.5" rx="7"')}
  ${ring(S, 14, 'fill="none" stroke="url(#gold)" stroke-width="3.2" rx="4"')}
  ${ring(S, 20, 'fill="none" stroke="#3f8f6e" stroke-width="2"')}
  ${ring(S, 25, 'fill="none" stroke="url(#gold)" stroke-width="1.4"')}
  ${ring(S, B - 10, 'fill="none" stroke="#e3ad48" stroke-width="2"')}
  ${ring(S, B - 2, `fill="none" stroke="${INK}" stroke-width="4"`)}
  ${corners(S, cloud)}`);
}

/* ------------------------------------------------------------------ title ribbon */
function guideTitle() {
  const W = 380, H = 75;
  const tail = `<path d="M8 22 L64 22 L64 60 L8 60 L22 41 Z" fill="#7e1a12" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M52 22 L64 14 L64 22 Z" fill="#4a0c08" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M16 28 H58 M16 54 H58" stroke="#e3ad48" stroke-width="1.4" opacity=".8"/>`;
  return svg(W, H, `
  <defs>${gold()}
    <linearGradient id="lac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c03a28"/><stop offset=".55" stop-color="#8a1f15"/><stop offset="1" stop-color="#5a120b"/></linearGradient>
  </defs>
  ${tail}<g transform="translate(${W} 0) scale(-1 1)">${tail}</g>
  <path d="M52 8 H${W - 52} Q${W - 44} 8 ${W - 44} 16 V58 Q${W - 44} 66 ${W - 52} 66 H52 Q44 66 44 58 V16 Q44 8 52 8 Z" fill="${INK}"/>
  <path d="M53 11 H${W - 53} Q${W - 47} 11 ${W - 47} 17 V57 Q${W - 47} 63 ${W - 53} 63 H53 Q47 63 47 57 V17 Q47 11 53 11 Z" fill="url(#gold)"/>
  <rect x="53" y="16" width="${W - 106}" height="42" rx="3" fill="url(#lac)" stroke="${INK}" stroke-width="2"/>
  <rect x="58" y="20" width="${W - 116}" height="34" rx="2" fill="none" stroke="#e3ad48" stroke-width="1.2" opacity=".85"/>
  <ellipse cx="${W / 2}" cy="23" rx="${W / 2 - 80}" ry="5" fill="#fff" opacity=".12"/>
  <g stroke="${INK}" stroke-width="1.8" stroke-linejoin="round">
    <path d="M${W / 2} 0 L${W / 2 + 9} 9 L${W / 2} 18 L${W / 2 - 9} 9 Z" fill="url(#gold)"/>
    <circle cx="${W / 2}" cy="9" r="3.2" fill="#2f8a64" stroke-width="1.2"/>
    <path d="M${W / 2} 57 L${W / 2 + 8} 66 L${W / 2} 75 L${W / 2 - 8} 66 Z" fill="url(#gold)"/>
  </g>`);
}

/* ------------------------------------------------------------------ tabs (3-slice horizontal) */
function tab(active) {
  const W = 160, H = 48;
  const body = active
    ? `<linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4452f"/><stop offset=".55" stop-color="#9a2318"/><stop offset="1" stop-color="#5e130c"/></linearGradient>`
    : `<linearGradient id="tb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a24"/><stop offset=".55" stop-color="#3b2416"/><stop offset="1" stop-color="#26160d"/></linearGradient>`;
  const rim = active ? 'url(#gold)' : '#8a6a3c';
  const cap = (k) => `<g ${k}>
      <path d="M6 12 L14 4 L14 44 L6 36 Z" fill="${rim}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      ${active ? `<circle cx="10" cy="24" r="2.6" fill="#2f8a64" stroke="${INK}" stroke-width="1.2"/>` : ''}
    </g>`;
  return svg(W, H, `
  <defs>${gold()}${body}</defs>
  <path d="M14 2 H${W - 14} V46 H14 Z" fill="${INK}"/>
  <rect x="14" y="4.5" width="${W - 28}" height="39" fill="${rim}"/>
  <rect x="14" y="8" width="${W - 28}" height="32" fill="url(#tb)"/>
  <path d="M14 10 H${W - 14}" stroke="#fff" stroke-opacity="${active ? 0.3 : 0.12}" stroke-width="2"/>
  <path d="M14 37.5 H${W - 14}" stroke="${active ? '#f3c75a' : '#6a4a2c'}" stroke-width="1.2" opacity=".8"/>
  ${cap('')}${cap(`transform="translate(${W} 0) scale(-1 1)"`)}`);
}

/* ------------------------------------------------------------------ tab icons */
const ICON_DEFS = `${gold()}<linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf1d8"/><stop offset="1" stop-color="#e2cc9c"/></linearGradient>`;
const iconScroll = () => svg(48, 48, `<defs>${ICON_DEFS}</defs>
  <g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
    <rect x="10" y="9" width="28" height="30" fill="url(#paper)"/>
    <path d="M15 17 H33 M15 23 H33 M15 29 H27" stroke="#8a5a2a" stroke-width="2" stroke-linecap="round"/>
    <rect x="6" y="5" width="36" height="7" rx="3.5" fill="#9a2318"/>
    <rect x="6" y="36" width="36" height="7" rx="3.5" fill="#9a2318"/>
    <rect x="3" y="6.5" width="5" height="4" rx="1.5" fill="url(#gold)"/><rect x="40" y="6.5" width="5" height="4" rx="1.5" fill="url(#gold)"/>
    <rect x="3" y="37.5" width="5" height="4" rx="1.5" fill="url(#gold)"/><rect x="40" y="37.5" width="5" height="4" rx="1.5" fill="url(#gold)"/>
    <circle cx="33" cy="32" r="4" fill="#c4241b" stroke-width="1.5"/>
  </g>`);
const iconRoles = () => svg(48, 48, `<defs>${ICON_DEFS}</defs>
  <g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M6 12 Q24 4 42 12 Q42 34 24 44 Q6 34 6 12 Z" fill="url(#paper)"/>
    <path d="M24 8 Q42 6 42 12 Q42 34 24 44 Z" fill="#26150c"/>
    <path d="M12 20 Q16 16 20 20 Q16 23 12 20 Z" fill="${INK}"/>
    <path d="M28 20 Q32 16 36 20 Q32 23 28 20 Z" fill="#c4241b" stroke="#c4241b"/>
    <path d="M14 30 Q18 33 22 31" fill="none" stroke-linecap="round"/>
    <path d="M27 31 Q31 28 35 31" fill="none" stroke="#e3ad48" stroke-linecap="round"/>
    <circle cx="24" cy="13" r="2.4" fill="url(#gold)" stroke-width="1.4"/>
  </g>`);

/* ------------------------------------------------------------------ close button */
const btnClose = () => svg(64, 64, `
  <defs>${gold('gold', 1, 1)}
    <radialGradient id="disc" cx=".4" cy=".32" r=".75"><stop offset="0" stop-color="#e2533e"/><stop offset=".6" stop-color="#9a2318"/><stop offset="1" stop-color="#4e0f09"/></radialGradient>
  </defs>
  <circle cx="32" cy="32" r="31" fill="${INK}"/>
  <circle cx="32" cy="32" r="29" fill="url(#gold)"/>
  ${Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return `<circle cx="${(32 + Math.cos(a) * 26).toFixed(1)}" cy="${(32 + Math.sin(a) * 26).toFixed(1)}" r="1.5" fill="#7d4f12"/>`;
  }).join('')}
  <circle cx="32" cy="32" r="22.5" fill="${INK}"/>
  <circle cx="32" cy="32" r="21" fill="url(#disc)"/>
  <ellipse cx="32" cy="21" rx="14" ry="7" fill="#fff" opacity=".22"/>
  <g stroke-linecap="round">
    <path d="M23.5 23.5 L40.5 40.5 M40.5 23.5 L23.5 40.5" stroke="${INK}" stroke-width="8.5"/>
    <path d="M23.5 23.5 L40.5 40.5 M40.5 23.5 L23.5 40.5" stroke="#fff6e0" stroke-width="5"/>
  </g>`);

/* ------------------------------------------------------------------ inset cards (9-slice) */
function card(accent, glow) {
  const S = 128, B = 28;
  const bracket = `<path d="M6 22 V10 Q6 6 10 6 H22" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M6 22 V10 Q6 6 10 6 H22" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="13" cy="13" r="3.2" fill="${accent}" stroke="${INK}" stroke-width="1.4"/>`;
  return svg(S, S, `
  <defs>${gold()}
    <linearGradient id="inset" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a10"/><stop offset="1" stop-color="#1a100a"/></linearGradient>
  </defs>
  <rect x="2" y="2" width="${S - 4}" height="${S - 4}" rx="8" fill="${INK}"/>
  <rect x="4" y="4" width="${S - 8}" height="${S - 8}" rx="7" fill="url(#inset)"/>
  ${ring(S, 9, `fill="none" stroke="${accent}" stroke-width="2" rx="4"`)}
  ${ring(S, 13, `fill="none" stroke="${glow}" stroke-width="1" rx="3" opacity=".55"`)}
  ${corners(S, bracket)}`);
}

/* ------------------------------------------------------------------ round guide button (matches btn-kill/report) */
function btnGuide() {
  const studs = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = 128 + Math.cos(a) * 110, y = 128 + Math.sin(a) * 110;
    return `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="1.5" transform="rotate(${(a * 180) / Math.PI + 45} ${x} ${y})" fill="#6a3d0c" stroke="#ffe7a0" stroke-width="1.2"/>`;
  }).join('');
  return svg(256, 256, `
  <defs>${gold('gold', 1, 1)}
    <radialGradient id="disc" cx=".42" cy=".34" r=".72"><stop offset="0" stop-color="#5fd0a6"/><stop offset=".55" stop-color="#1f8a6a"/><stop offset="1" stop-color="#0a3a2e"/></radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#ead6ad"/></linearGradient>
  </defs>
  <circle cx="128" cy="128" r="126" fill="${INK}"/>
  <circle cx="128" cy="128" r="122" fill="url(#gold)"/>
  <circle cx="128" cy="128" r="119" fill="none" stroke="#fff6cf" stroke-width="2" opacity=".55"/>
  ${studs}
  <circle cx="128" cy="128" r="101" fill="${INK}"/>
  <circle cx="128" cy="128" r="97" fill="url(#disc)"/>
  <circle cx="128" cy="128" r="89" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".9"/>
  <ellipse cx="128" cy="80" rx="66" ry="38" fill="url(#gloss)"/>
  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" paint-order="stroke">
    <path d="M60 92 Q94 80 128 98 Q162 80 196 92 L196 176 Q162 164 128 182 Q94 164 60 176 Z" fill="#7e1a12"/>
    <path d="M66 86 Q98 74 128 92 L128 172 Q98 156 66 168 Z" fill="url(#pg)"/>
    <path d="M190 86 Q158 74 128 92 L128 172 Q158 156 190 168 Z" fill="url(#pg)"/>
    <path d="M128 92 V172" stroke-width="4"/>
  </g>
  <g stroke="#a07a4a" stroke-width="3.5" stroke-linecap="round" fill="none">
    <path d="M80 104 Q98 98 114 106 M80 120 Q98 114 114 122 M80 136 Q98 130 114 138"/>
    <path d="M142 106 Q158 98 176 104 M142 122 Q158 114 176 120"/>
  </g>
  <path d="M150 88 V128 L160 120 L170 128 V84" fill="#c4241b" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
  <circle cx="160" cy="146" r="11" fill="url(#gold)" stroke="${INK}" stroke-width="3"/>
  <path d="M155 146 h10 M160 141 v10" stroke="#7d4f12" stroke-width="2.6" stroke-linecap="round"/>`);
}

/* ------------------------------------------------------------------ render */
const JOBS = [
  ['frame-guide', frameGuide(), 512, 512],
  ['guide-title', guideTitle(), 760, 150],
  ['tab', tab(false), 320, 96],
  ['tab-active', tab(true), 320, 96],
  ['tab-story', iconScroll(), 96, 96],
  ['tab-roles', iconRoles(), 96, 96],
  ['btn-close', btnClose(), 128, 128],
  ['card', card('#c58b26', '#f3c75a'), 256, 256],
  ['card-crew', card('#3f8fb0', '#8fd3f0'), 256, 256],
  ['card-killer', card('#a8322d', '#ff7a5a'), 256, 256],
  ['btn-guide', btnGuide(), 256, 256],
];

for (const dir of [SRC, OUT, PUB]) fs.mkdirSync(dir, { recursive: true });
for (const [name, code, w, h] of JOBS) {
  fs.writeFileSync(path.join(SRC, `${name}.svg`), code);
  const vw = Number(code.match(/width="(\d+)"/)[1]);
  const png = await sharp(Buffer.from(code), { density: 72 * (w / vw) }).resize(w, h).png().toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  console.log('[guide-art]', name, `${w}x${h}`);
}
