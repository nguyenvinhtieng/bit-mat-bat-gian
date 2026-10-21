#!/usr/bin/env node
/**
 * Procedural (vector) art for the Cố đô Huế map — "Năm Canh Trước Bình Minh" (Đêm Ban Sóc).
 *   node tools/ui-art/draw-hue-bansoc.mjs            (SHARP_DIR=/path/to/node_modules/sharp if sharp is not installed here)
 * Writes:
 *   assets/_src/maps/co-do-hue/bansoc/<name>.svg            editable vector sources
 *   assets/maps/co-do-hue/{props,stations,minigames}/<name>.png
 *   apps/web/public/assets/maps/co-do-hue/atlas/hue-bansoc-0.{webp,json}   props + station icons (Phaser hash atlas)
 *   apps/web/public/assets/maps/co-do-hue/minigames/<name>.webp            mini-game UI art
 *   maps/co-do-hue/co-do-hue.assets.json (atlases / props / stations / minigames)
 * Style: top-down 3/4, soft dark outline (#22100a), lacquer red + imperial yellow + gold, bronze, stone.
 * No text is baked into the art (labels are HTML so they can be translated).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

let sharp;
try {
  sharp = (await import('sharp')).default;
  await sharp({ create: { width: 1, height: 1, channels: 4, background: '#000' } }).png().toBuffer();
} catch {
  sharp = createRequire(path.join(process.env.SHARP_DIR || '.', 'x.js'))('sharp');
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SRC = path.join(ROOT, 'assets/_src/maps/co-do-hue/bansoc');
const OUT = path.join(ROOT, 'assets/maps/co-do-hue');
const PUB = path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue');
const ensure = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });

// ------------------------------------------------------------------ palette + helpers
const INK = '#22100a';
const C = {
  red: ['#d8473a', '#a5261f', '#6a1410'],
  yellow: ['#ffe28a', '#f4b93a', '#b9791a'],
  wood: ['#b77a45', '#8a5228', '#5a3216'],
  darkwood: ['#7a4a2a', '#563019', '#33190b'],
  bronze: ['#d9b26a', '#9a6b33', '#4e3216'],
  verd: ['#8fc0a5', '#4f8a72', '#2d5446'],
  stone: ['#e6dfd2', '#b9ad99', '#7f735f'],
  paper: ['#fbf3dc', '#efe0b9', '#d6c193'],
  jade: ['#9fd8b6', '#3f9c72', '#1f5c43'],
  porcelain: ['#ffffff', '#e8eef6', '#b8c6da'],
  blue: ['#5f8fd6', '#2c5aa8', '#173469'],
};
let gid = 0;
const uid = (p) => `${p}${++gid}`;
/** vertical linear gradient def + url */
function grad(defs, stops, { x2 = 0, y2 = 1, id } = {}) {
  const i = id || uid('g');
  const s = stops.map((c, k) => `<stop offset="${k / (stops.length - 1)}" stop-color="${c}"/>`).join('');
  defs.push(`<linearGradient id="${i}" x1="0" y1="0" x2="${x2}" y2="${y2}">${s}</linearGradient>`);
  return `url(#${i})`;
}
function rgrad(defs, stops, { cx = 0.4, cy = 0.35, r = 0.75 } = {}) {
  const i = uid('r');
  const s = stops.map((c, k) => `<stop offset="${k / (stops.length - 1)}" stop-color="${c}"/>`).join('');
  defs.push(`<radialGradient id="${i}" cx="${cx}" cy="${cy}" r="${r}">${s}</radialGradient>`);
  return `url(#${i})`;
}
const GOLD = ['#fff2bf', '#f3c75a', '#c58b26', '#7d4f12'];
const svg = (w, h, defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs>${body}</svg>`;
const shadow = (cx, cy, rx, ry, o = 0.28) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity="${o}"/>`;
const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const range = (n) => Array.from({ length: n }, (_, i) => i);

/** Each art: { name, kind: 'prop'|'station'|'mg', w, h, draw(defs) -> body } */
const ARTS = [];
const art = (kind, name, w, h, draw) => ARTS.push({ kind, name, w, h, draw });

// ------------------------------------------------------------------ shared drawing bits
function lacquerBox(defs, x, y, w, h, { top = 14, col = C.red, trim = true } = {}) {
  const f = grad(defs, col);
  const t = grad(defs, [col[0], col[1]]);
  const g = grad(defs, GOLD);
  return `
    <rect x="${x}" y="${y + top}" width="${w}" height="${h - top}" rx="4" fill="${f}" ${S()}/>
    <rect x="${x}" y="${y}" width="${w}" height="${top + 4}" rx="4" fill="${t}" ${S()}/>
    ${trim ? `<rect x="${x + 5}" y="${y + top + 6}" width="${w - 10}" height="${h - top - 12}" rx="2" fill="none" stroke="${g}" stroke-width="2.5"/>` : ''}`;
}
/** simple 4-petal gold medallion (decor) */
const medallion = (cx, cy, r, fill) =>
  `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="${fill}" ${S(1.5)}/>${range(4)
    .map((i) => `<ellipse rx="${r * 0.28}" ry="${r * 0.62}" transform="rotate(${i * 45})" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>`)
    .join('')}<circle r="${r * 0.22}" fill="${INK}" opacity=".5"/></g>`;
/** bronze-urn body (used by prop + station + mini-game) */
function urn(defs, cx, base, s = 1) {
  const b = grad(defs, C.bronze, { x2: 1, y2: 0.3 });
  const v = grad(defs, C.verd);
  const k = (n) => n * s;
  return `
  <g transform="translate(${cx} ${base}) scale(${s})">
    <path d="M-34 -6 L-40 0 L-32 2 L-26 -8 Z M34 -6 L40 0 L32 2 L26 -8 Z M-4 -6 L0 2 L4 -6Z" fill="${b}" ${S(2.5)}/>
    <path d="M-46 -78 Q-50 -40 -36 -16 Q-20 -2 0 -2 Q20 -2 36 -16 Q50 -40 46 -78 Z" fill="${b}" ${S(3)}/>
    <path d="M-40 -60 Q0 -50 40 -60 M-42 -36 Q0 -26 42 -36" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".55"/>
    ${range(3).map((i) => `<rect x="${-30 + i * 22}" y="-56" width="16" height="16" rx="2" fill="${v}" stroke="${INK}" stroke-width="1.4" opacity=".85"/>`).join('')}
    <ellipse cx="0" cy="-80" rx="48" ry="12" fill="${b}" ${S(3)}/>
    <ellipse cx="0" cy="-80" rx="38" ry="7" fill="#3a2410"/>
    <path d="M-52 -92 Q-60 -96 -58 -78 Q-56 -70 -46 -72" fill="none" stroke="${INK}" stroke-width="8"/>
    <path d="M-52 -92 Q-60 -96 -58 -78 Q-56 -70 -46 -72" fill="none" stroke="${b}" stroke-width="4.5"/>
    <path d="M52 -92 Q60 -96 58 -78 Q56 -70 46 -72" fill="none" stroke="${INK}" stroke-width="8"/>
    <path d="M52 -92 Q60 -96 58 -78 Q56 -70 46 -72" fill="none" stroke="${b}" stroke-width="4.5"/>
    <path d="M-36 -30 Q-20 -14 0 -12" fill="none" stroke="#fff3c8" stroke-width="3" opacity=".45"/>
  </g>`;
}
function lantern(defs, cx, cy, s = 1, glow = true) {
  const r = grad(defs, C.red);
  const g = grad(defs, GOLD);
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    ${glow ? `<circle r="30" fill="${rgrad(defs, ['#ffd27a', '#ffb54a00'], { cx: 0.5, cy: 0.5, r: 0.5 })}" opacity=".7"/>` : ''}
    <rect x="-9" y="-22" width="18" height="5" rx="1" fill="${g}" ${S(2)}/>
    <path d="M-15 -17 Q-19 0 -15 17 L15 17 Q19 0 15 -17 Z" fill="${r}" ${S(2.4)}/>
    <path d="M-6 -17 Q-8 0 -6 17 M6 -17 Q8 0 6 17" stroke="${INK}" stroke-width="1.2" fill="none" opacity=".5"/>
    <rect x="-9" y="17" width="18" height="5" rx="1" fill="${g}" ${S(2)}/>
    <path d="M-4 22 L-5 32 M0 22 L0 34 M4 22 L5 32" stroke="#f4b93a" stroke-width="2"/>
  </g>`;
}

// ================================================================== PROPS (atlas)
art('prop', 'hue-prop-an-ban-lich', 192, 128, (d) => {
  const silk = grad(d, C.yellow);
  const book = grad(d, ['#fff0b0', '#f2c84a']);
  const g = grad(d, GOLD);
  return `${shadow(96, 120, 88, 8)}
    ${lacquerBox(d, 6, 44, 180, 76, { top: 18 })}
    <path d="M30 44 L162 44 L166 92 Q96 102 26 92 Z" fill="${silk}" ${S(2.5)}/>
    <path d="M40 92 Q96 100 152 92" stroke="#b9791a" stroke-width="2" fill="none"/>
    ${range(3).map((i) => `<g transform="translate(${44 + i * 24} ${18 - i * 4})"><rect width="20" height="${30 + i * 4}" rx="2" fill="${book}" ${S(2)}/><rect x="3" y="5" width="14" height="5" fill="#a5261f"/></g>`).join('')}
    <g transform="translate(120 20)"><rect width="44" height="26" rx="3" fill="${grad(d, C.red)}" ${S(2.4)}/><rect x="4" y="4" width="36" height="18" rx="2" fill="none" stroke="${g}" stroke-width="2"/>${medallion(22, 13, 6, g)}</g>
    <path d="M8 120 L8 128 M184 120 L184 128" ${S(6)}/>`;
});

art('prop', 'hue-prop-chuong-ngu-phung', 144, 160, (d) => {
  const w = grad(d, C.red, { x2: 1, y2: 0 });
  const b = grad(d, C.bronze, { x2: 1, y2: 0.2 });
  const g = grad(d, GOLD);
  return `${shadow(72, 154, 62, 7)}
    <rect x="14" y="22" width="12" height="134" rx="3" fill="${w}" ${S()}/>
    <rect x="118" y="22" width="12" height="134" rx="3" fill="${w}" ${S()}/>
    <path d="M4 14 Q72 2 140 14 L140 28 Q72 18 4 28 Z" fill="${grad(d, C.red)}" ${S()}/>
    <path d="M10 18 Q72 8 134 18" stroke="${g}" stroke-width="2.5" fill="none"/>
    <rect x="68" y="26" width="8" height="16" fill="${INK}"/>
    <path d="M42 120 Q40 62 72 42 Q104 62 102 120 Q72 128 42 120 Z" fill="${b}" ${S(3)}/>
    <path d="M44 100 Q72 108 100 100 M46 78 Q72 84 98 78" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".5"/>
    ${range(3).map((i) => range(3).map((j) => `<circle cx="${56 + i * 16}" cy="${56 + j * 8}" r="2.4" fill="#ffe9a8" ${S(0.8)}/>`).join('')).join('')}
    <ellipse cx="72" cy="121" rx="30" ry="5" fill="#3a2410" opacity=".55"/>
    <path d="M52 64 Q56 52 66 48" stroke="#fff3c8" stroke-width="3" fill="none" opacity=".5"/>
    <rect x="30" y="132" width="40" height="7" rx="3" fill="${grad(d, C.wood)}" ${S(2)}/>`;
});

art('prop', 'hue-prop-co-le', 96, 192, (d) => {
  const flag = grad(d, C.yellow);
  const g = grad(d, GOLD);
  return `${shadow(30, 186, 22, 5)}
    <rect x="26" y="10" width="8" height="178" rx="3" fill="${grad(d, C.darkwood, { x2: 1, y2: 0 })}" ${S(2.4)}/>
    <path d="M30 2 L36 12 L24 12 Z" fill="${g}" ${S(2)}/>
    <path d="M34 18 L88 18 L88 122 L74 112 L61 124 L48 112 L34 122 Z" fill="${flag}" ${S(3)}/>
    <path d="M40 24 L82 24 L82 108" fill="none" stroke="#a5261f" stroke-width="4"/>
    <circle cx="61" cy="62" r="15" fill="#d8473a" ${S(2.4)}/>
    ${range(12).map((i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M${61 + Math.cos(a) * 18} ${62 + Math.sin(a) * 18} L${61 + Math.cos(a) * 24} ${62 + Math.sin(a) * 24}" stroke="#a5261f" stroke-width="2.5"/>`; }).join('')}
    <rect x="18" y="176" width="24" height="12" rx="3" fill="${grad(d, C.stone)}" ${S(2)}/>`;
});

art('prop', 'hue-prop-hoanh-phi', 192, 112, (d) => {
  const r = grad(d, ['#b4302a', '#7a1712']);
  const g = grad(d, GOLD);
  return `
    <path d="M4 18 Q96 4 188 18 L184 98 Q96 108 8 98 Z" fill="${g}" ${S(3)}/>
    <path d="M16 26 Q96 14 176 26 L172 88 Q96 96 20 88 Z" fill="${r}" ${S(2)}/>
    ${[48, 80, 112, 144].map((x) => `<g transform="translate(${x} 56)"><rect x="-11" y="-17" width="22" height="34" rx="2" fill="none" stroke="${g}" stroke-width="1.6" opacity=".7"/>
      <path d="M-7 -10 H7 M0 -13 V12 M-8 0 H8 M-6 8 Q0 4 6 10" stroke="${g}" stroke-width="3"/></g>`).join('')}
    <path d="M4 18 Q-4 10 2 4 Q12 8 14 20 M188 18 Q196 10 190 4 Q180 8 178 20" fill="${g}" ${S(2)}/>`;
});

art('prop', 'hue-prop-bia-pham-son', 96, 112, (d) => {
  const st = grad(d, C.stone, { x2: 1, y2: 0.3 });
  const one = (x, h) => `<g transform="translate(${x} 104)">
      <rect x="-16" y="-10" width="32" height="12" rx="2" fill="${grad(d, C.stone)}" ${S(2.4)}/>
      <path d="M-12 -10 L-12 ${-h} Q0 ${-h - 10} 12 ${-h} L12 -10 Z" fill="${st}" ${S(2.6)}/>
      <path d="M-6 ${-h + 8} V-20 M0 ${-h + 6} V-20 M6 ${-h + 8} V-20" stroke="#7f735f" stroke-width="2" opacity=".6"/></g>`;
  return `${shadow(48, 106, 44, 6)}${one(28, 82)}${one(68, 70)}`;
});

art('prop', 'hue-prop-den-cung-dinh', 64, 128, (d) => {
  const post = grad(d, C.red, { x2: 1, y2: 0 });
  return `${shadow(32, 124, 20, 5)}
    <rect x="18" y="112" width="28" height="12" rx="3" fill="${grad(d, C.stone)}" ${S(2)}/>
    <rect x="28" y="40" width="8" height="74" fill="${post}" ${S(2.2)}/>
    <path d="M10 24 L54 24 L46 18 L18 18 Z" fill="${grad(d, GOLD)}" ${S(2)}/>
    ${lantern(d, 32, 48, 1.15)}`;
});

art('prop', 'hue-prop-chau-kieng', 64, 96, (d) => {
  const pot = grad(d, C.porcelain, { x2: 1, y2: 0.4 });
  const leaf = grad(d, ['#7fcf7a', '#2f8a4a']);
  return `${shadow(32, 92, 24, 5)}
    <path d="M32 64 Q30 46 22 38 M32 60 Q38 40 46 34" stroke="#5a3216" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="20" cy="32" rx="14" ry="9" fill="${leaf}" ${S(2.2)}/>
    <ellipse cx="44" cy="26" rx="15" ry="10" fill="${leaf}" ${S(2.2)}/>
    <ellipse cx="33" cy="16" rx="11" ry="8" fill="${leaf}" ${S(2.2)}/>
    <path d="M12 62 L52 62 L46 90 L18 90 Z" fill="${pot}" ${S(2.6)}/>
    <path d="M20 70 Q32 80 44 70 M24 82 Q32 76 40 82" stroke="#2c5aa8" stroke-width="2.2" fill="none"/>
    <rect x="10" y="58" width="44" height="7" rx="2" fill="${pot}" ${S(2.2)}/>`;
});

function cup(d, cx, cy, s, state) {
  const p = grad(d, C.porcelain);
  const parts = [`<ellipse cx="0" cy="6" rx="26" ry="10" fill="#000" opacity=".2"/>`,
    `<path d="M-24 -4 L-17 10 Q0 15 17 10 L24 -4 Z" fill="${p}" ${S(2.4)}/>`,
    `<ellipse cx="0" cy="-4" rx="24" ry="9" fill="#f6f9fd" ${S(2.4)}/>`,
    `<path d="M-16 6 Q0 10 16 6" stroke="#2c5aa8" stroke-width="2" fill="none"/>`];
  if (state >= 1) parts.push(`<ellipse cx="0" cy="-3" rx="19" ry="6.5" fill="${state >= 2 ? '#fbfaf2' : '#f1ead6'}" stroke="#d8ccb0" stroke-width="1.2"/>`);
  if (state >= 2) parts.push(`<ellipse cx="0" cy="-3" rx="8" ry="2.6" fill="#e6dcc0"/><path d="M-12 -6 Q-4 -9 6 -7" stroke="#fff" stroke-width="2" opacity=".9" fill="none"/>`);
  if (state >= 3) parts.push(range(9).map((i) => `<circle cx="${-9 + (i % 3) * 8 + ((i * 7) % 3)}" cy="${-6 + Math.floor(i / 3) * 3}" r="2.6" fill="#ef7a3a"/>`).join(''));
  if (state >= 4) parts.push(range(5).map((i) => `<rect x="${-12 + i * 5}" y="${-5 + (i % 2) * 3}" width="5" height="3.6" rx="1" fill="#f3c75a" stroke="#9a6b33" stroke-width=".8"/>`).join('') + `<path d="M-6 -1 l2 -2 M4 -6 l2 2 M10 -2 l2 -2" stroke="#3f9c45" stroke-width="2"/>`);
  if (state >= 5) parts.push(`<path d="M-16 -3 Q0 4 16 -3 Q0 0 -16 -3 Z" fill="#c9782a" opacity=".75"/>`);
  return `<g transform="translate(${cx} ${cy}) scale(${s})">${parts.join('')}</g>`;
}

art('prop', 'hue-prop-mam-banh-beo', 80, 64, (d) => {
  const tray = grad(d, C.red);
  return `${shadow(40, 56, 36, 6)}
    <ellipse cx="40" cy="38" rx="36" ry="18" fill="${tray}" ${S(2.6)}/>
    <ellipse cx="40" cy="35" rx="31" ry="14" fill="none" stroke="${grad(d, GOLD)}" stroke-width="2"/>
    ${cup(d, 24, 34, 0.45, 5)}${cup(d, 44, 28, 0.45, 5)}${cup(d, 56, 40, 0.45, 5)}${cup(d, 34, 46, 0.45, 4)}`;
});

art('prop', 'hue-prop-trong-nha-nhac', 144, 128, (d) => {
  const drum = grad(d, C.red, { x2: 1, y2: 0 });
  const skin = rgrad(d, ['#fff3d6', '#e8cf9c', '#b9915a']);
  const wood = grad(d, C.wood);
  return `${shadow(72, 122, 64, 7)}
    <path d="M22 122 L44 40 M122 122 L100 40 M30 96 L114 96" ${S(9)}/>
    <path d="M22 122 L44 40 M122 122 L100 40 M30 96 L114 96" stroke="${wood}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M30 26 Q72 14 114 26 L114 82 Q72 94 30 82 Z" fill="${drum}" ${S(3)}/>
    <ellipse cx="72" cy="28" rx="42" ry="14" fill="${skin}" ${S(3)}/>
    ${medallion(72, 28, 8, '#d8473a')}
    ${range(9).map((i) => `<circle cx="${34 + i * 9.5}" cy="${34 + Math.sin((i / 8) * Math.PI) * 6}" r="2" fill="#ffe28a" ${S(0.8)}/>`).join('')}
    <path d="M40 46 Q72 56 104 46" stroke="#ffe28a" stroke-width="2.4" fill="none" opacity=".8"/>
    <path d="M118 8 L96 30 M128 14 L104 34" ${S(6)}/><path d="M118 8 L96 30 M128 14 L104 34" stroke="#e8cf9c" stroke-width="3" stroke-linecap="round"/>`;
});

art('prop', 'hue-prop-bien-khanh', 96, 128, (d) => {
  const f = grad(d, C.red, { x2: 1, y2: 0 });
  const st = grad(d, C.jade);
  return `${shadow(48, 124, 42, 6)}
    <rect x="10" y="18" width="9" height="104" rx="3" fill="${f}" ${S(2.4)}/>
    <rect x="77" y="18" width="9" height="104" rx="3" fill="${f}" ${S(2.4)}/>
    <path d="M2 14 Q48 4 94 14 L94 24 Q48 16 2 24 Z" fill="${grad(d, GOLD)}" ${S(2.4)}/>
    <rect x="16" y="64" width="64" height="6" fill="${f}" ${S(2)}/>
    ${range(4).map((i) => `<path d="M${24 + i * 15} 24 V32" stroke="${INK}" stroke-width="1.5"/><path d="M${18 + i * 15} 32 L${30 + i * 15} 32 L${32 + i * 15} 50 L${24 + i * 15} 46 L${16 + i * 15} 50 Z" fill="${st}" ${S(2)}/>`).join('')}
    ${range(4).map((i) => `<path d="M${24 + i * 15} 70 V78" stroke="${INK}" stroke-width="1.5"/><path d="M${18 + i * 15} 78 L${30 + i * 15} 78 L${32 + i * 15} 96 L${24 + i * 15} 92 L${16 + i * 15} 96 Z" fill="${st}" ${S(2)}/>`).join('')}`;
});

function woodBlockTop(d, x, y, w, h) {
  const wd = grad(d, ['#e2b07a', '#c58a52'], { x2: 1, y2: 1 });
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${wd}" ${S(2.4)}/>
    ${range(4).map((i) => `<path d="M${x + 4} ${y + 6 + i * (h / 4)} Q${x + w / 2} ${y + 2 + i * (h / 4)} ${x + w - 4} ${y + 7 + i * (h / 4)}" stroke="#a8713e" stroke-width="1.2" fill="none" opacity=".7"/>`).join('')}`;
}

art('prop', 'hue-prop-ban-khac', 112, 96, (d) => {
  return `${shadow(56, 90, 52, 6)}
    ${lacquerBox(d, 6, 30, 100, 60, { top: 16, col: C.wood, trim: false })}
    ${woodBlockTop(d, 18, 18, 46, 30)}
    <g opacity=".85">${range(3).map((i) => `<rect x="${24 + i * 13}" y="23" width="8" height="20" rx="1" fill="#6b3d17" opacity=".55"/>`).join('')}</g>
    <path d="M74 22 L98 40 M80 18 L102 32" ${S(5)}/><path d="M74 22 L98 40 M80 18 L102 32" stroke="#d9dde2" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="84" cy="40" r="5" fill="${INK}"/>`;
});

art('prop', 'hue-prop-hon-thien-nghi', 96, 128, (d) => {
  const b = grad(d, C.bronze, { x2: 1, y2: 0.3 });
  const ring = (rx, ry, rot) => `<ellipse cx="48" cy="52" rx="${rx}" ry="${ry}" transform="rotate(${rot} 48 52)" fill="none" stroke="${INK}" stroke-width="7"/><ellipse cx="48" cy="52" rx="${rx}" ry="${ry}" transform="rotate(${rot} 48 52)" fill="none" stroke="${b}" stroke-width="4"/>`;
  return `${shadow(48, 124, 34, 6)}
    <path d="M48 88 L48 112 M26 122 L48 108 L70 122" ${S(8)}/><path d="M48 88 L48 112 M26 122 L48 108 L70 122" stroke="${b}" stroke-width="4.5"/>
    ${ring(38, 38, 0)}${ring(38, 12, -20)}${ring(12, 38, 30)}${ring(38, 16, 60)}
    <circle cx="48" cy="52" r="8" fill="${rgrad(d, ['#9fd8ff', '#2c5aa8'])}" ${S(2)}/>
    <path d="M48 8 L48 96" stroke="${INK}" stroke-width="2" opacity=".6"/>`;
});

art('prop', 'hue-prop-ban-in-lich', 144, 80, (d) => {
  const p = grad(d, C.paper);
  return `${shadow(72, 74, 66, 6)}
    ${lacquerBox(d, 6, 24, 132, 50, { top: 14, col: C.darkwood, trim: false })}
    ${range(4).map((i) => `<rect x="${18 + i * 3}" y="${18 - i * 3}" width="44" height="22" rx="1.5" fill="${p}" ${S(1.6)}/>`).join('')}
    <rect x="30" y="2" width="22" height="12" fill="none"/>
    <path d="M22 12 V26 M30 12 V26 M38 12 V26 M46 12 V26" stroke="#7f735f" stroke-width="1" opacity=".5"/>
    <ellipse cx="92" cy="22" rx="12" ry="6" fill="#2a1d18" ${S(2)}/>
    <path d="M106 8 L122 26" ${S(5)}/><path d="M106 8 L122 26" stroke="#c58a52" stroke-width="2.4"/><path d="M121 24 L126 32" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <rect x="94" y="30" width="34" height="8" rx="2" fill="#a5261f" ${S(1.6)}/>`;
});

art('prop', 'hue-prop-ke-chau-ban', 192, 128, (d) => {
  const w = grad(d, C.wood);
  const box = grad(d, C.yellow);
  return `${shadow(96, 124, 90, 6)}
    <rect x="8" y="8" width="176" height="114" rx="4" fill="${grad(d, C.darkwood)}" ${S(3)}/>
    ${[40, 76, 112].map((y) => `<rect x="8" y="${y}" width="176" height="8" fill="${w}" ${S(2)}/>`).join('')}
    ${[14, 50, 86].map((y, r) => range(6).map((i) => `<g transform="translate(${18 + i * 27 + (r % 2) * 6} ${y})"><rect width="22" height="25" rx="2" fill="${(i + r) % 3 === 0 ? grad(d, C.red) : box}" ${S(1.8)}/><path d="M0 9 H22" stroke="#a5261f" stroke-width="2"/></g>`).join('')).join('')}`;
});

art('prop', 'hue-prop-hop-an', 64, 56, (d) => {
  return `${shadow(32, 52, 28, 5)}${lacquerBox(d, 8, 14, 48, 38, { top: 12 })}
    <path d="M24 14 Q32 2 40 14" fill="${grad(d, GOLD)}" ${S(2)}/>${medallion(32, 34, 6, grad(d, GOLD))}`;
});

function poemPanel(d, x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${grad(d, C.paper)}" ${S(1.6)}/>
    ${range(3).map((i) => range(4).map((j) => `<path d="M${x + w * 0.25 + i * w * 0.25 - 3} ${y + 6 + j * (h - 8) / 4} h6 M${x + w * 0.25 + i * w * 0.25} ${y + 4 + j * (h - 8) / 4} v6" stroke="#5a1d14" stroke-width="1.8"/>`).join('')).join('')}`;
}
function paintPanel(d, x, y, w, h, theme = 'nui') {
  const bg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${grad(d, ['#f6ecd0', '#e3d3a6'])}" ${S(1.6)}/>`;
  const cx = x + w / 2, cy = y + h / 2;
  const tm = {
    nui: `<path d="M${x + 2} ${y + h - 3} L${cx - w * 0.15} ${cy - h * 0.2} L${cx} ${cy + 2} L${cx + w * 0.2} ${cy - h * 0.3} L${x + w - 2} ${y + h - 3} Z" fill="#4f8a72" stroke="${INK}" stroke-width="1.2"/>`,
    sen: `<path d="M${cx} ${y + h - 3} V${cy}" stroke="#2f6a3a" stroke-width="2"/><path d="M${cx} ${cy - h * 0.25} Q${cx - w * 0.25} ${cy} ${cx} ${cy + 2} Q${cx + w * 0.25} ${cy} ${cx} ${cy - h * 0.25}Z" fill="#ef8fb0" stroke="${INK}" stroke-width="1.2"/>`,
  };
  return bg + (tm[theme] || tm.nui);
}

art('prop', 'hue-prop-tuong-tho', 160, 96, (d) => {
  const f = grad(d, C.red);
  const g = grad(d, GOLD);
  return `<rect x="2" y="6" width="156" height="84" rx="3" fill="${f}" ${S(3)}/>
    <rect x="6" y="10" width="148" height="76" rx="2" fill="none" stroke="${g}" stroke-width="2"/>
    ${range(4).map((i) => (i % 2 ? paintPanel(d, 12 + i * 36, 18, 30, 60, i === 1 ? 'nui' : 'sen') : poemPanel(d, 12 + i * 36, 18, 30, 60))).join('')}`;
});

art('prop', 'hue-prop-dinh-dong', 112, 128, (d) => `${shadow(56, 122, 50, 7)}
  <rect x="10" y="104" width="92" height="20" rx="3" fill="${grad(d, C.stone)}" ${S(2.6)}/>
  ${urn(d, 56, 104, 0.9)}`);

// ================================================================== GATE (Ngọ Môn) facade — shared by station + mini-game
function ngoMon(d, w, h, { arches = true } = {}) {
  const wall = grad(d, ['#c9a77d', '#a17f57']);
  const roof = grad(d, C.yellow);
  const red = grad(d, C.red);
  const gw = w, base = h * 0.42;
  // gate openings x-centres (5)
  const cx = [0.1, 0.27, 0.5, 0.73, 0.9].map((k) => k * gw);
  const ow = [0.07, 0.08, 0.11, 0.08, 0.07].map((k) => k * gw);
  const oh = [0.26, 0.3, 0.38, 0.3, 0.26].map((k) => k * h);
  return `
    <path d="M${gw * 0.02} ${h} L${gw * 0.02} ${base} L${gw * 0.98} ${base} L${gw * 0.98} ${h} Z" fill="${wall}" ${S(3)}/>
    ${range(6).map((i) => `<path d="M${gw * 0.02} ${base + (i + 1) * (h - base) / 7} H${gw * 0.98}" stroke="#7d5c3a" stroke-width="1" opacity=".35"/>`).join('')}
    <!-- Lầu Ngũ Phụng -->
    <rect x="${gw * 0.2}" y="${h * 0.2}" width="${gw * 0.6}" height="${h * 0.22}" fill="${red}" ${S(2.6)}/>
    ${range(9).map((i) => `<rect x="${gw * 0.22 + i * gw * 0.063}" y="${h * 0.24}" width="${gw * 0.04}" height="${h * 0.15}" fill="#f4e1b0" stroke="${INK}" stroke-width="1.2"/>`).join('')}
    <path d="M${gw * 0.12} ${h * 0.22} Q${gw * 0.5} ${h * 0.14} ${gw * 0.88} ${h * 0.22} L${gw * 0.78} ${h * 0.08} Q${gw * 0.5} ${h * 0.03} ${gw * 0.22} ${h * 0.08} Z" fill="${roof}" ${S(3)}/>
    <path d="M${gw * 0.12} ${h * 0.22} Q${gw * 0.08} ${h * 0.16} ${gw * 0.1} ${h * 0.12} M${gw * 0.88} ${h * 0.22} Q${gw * 0.92} ${h * 0.16} ${gw * 0.9} ${h * 0.12}" stroke="${INK}" stroke-width="3" fill="none"/>
    <path d="M${gw * 0.42} ${h * 0.05} Q${gw * 0.5} ${h * 0.0} ${gw * 0.58} ${h * 0.05}" stroke="#f4b93a" stroke-width="4" fill="none"/>
    ${arches ? cx.map((x, i) => `<path d="M${x - ow[i] / 2} ${h} L${x - ow[i] / 2} ${h - oh[i] + ow[i] / 2} A${ow[i] / 2} ${ow[i] / 2} 0 0 1 ${x + ow[i] / 2} ${h - oh[i] + ow[i] / 2} L${x + ow[i] / 2} ${h} Z" fill="#20140e" ${S(2.4)}/>`).join('') : ''}
    <rect x="${gw * 0.5 - gw * 0.035}" y="${base + 6}" width="${gw * 0.07}" height="${h * 0.07}" fill="${grad(d, GOLD)}" ${S(1.6)}/>`;
}

// ================================================================== STATION ICONS (atlas, 128px)
function stationDisc(d, inner) {
  const disc = rgrad(d, ['#7a2a1e', '#4a160f', '#2a0c08']);
  const g = grad(d, GOLD, { x2: 1, y2: 1 });
  return `<circle cx="64" cy="64" r="62" fill="${INK}"/><circle cx="64" cy="64" r="58" fill="${g}"/>
    <circle cx="64" cy="64" r="50" fill="${disc}" ${S(2)}/>
    <circle cx="64" cy="64" r="45" fill="none" stroke="${g}" stroke-width="1.5" opacity=".6"/>${inner}`;
}
art('station', 'hue-station-moon', 128, 128, (d) => stationDisc(d, `
  <circle cx="64" cy="64" r="44" fill="#1b2a52" opacity=".85"/>
  ${[[38, 40], [86, 36], [92, 82], [44, 90], [70, 28]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff6cf"/>`).join('')}
  <path d="M72 30 A34 34 0 1 0 72 98 A26 26 0 1 1 72 30 Z" fill="${grad(d, ['#fff7d6', '#f3d27a'])}" ${S(2.6)}/>`));
art('station', 'hue-station-woodblock', 128, 128, (d) => stationDisc(d, `
  <g transform="rotate(-8 64 64)">${woodBlockTop(d, 30, 36, 60, 50)}
  <path d="M46 48 H74 M60 44 V80 M44 62 H76 M48 74 Q60 68 72 78" stroke="#2a1d18" stroke-width="5" stroke-linecap="round"/></g>
  <path d="M82 84 L102 100" ${S(10)}/><path d="M82 84 L102 100" stroke="#c58a52" stroke-width="6" stroke-linecap="round"/>`));
art('station', 'hue-station-gates', 128, 128, (d) => stationDisc(d, `<g transform="translate(18 34)">${ngoMon(d, 92, 62)}</g>`));
art('station', 'hue-station-ranks', 128, 128, (d) => {
  const st = grad(d, C.stone, { x2: 1, y2: 0.3 });
  const s = (x, y, h) => `<rect x="${x - 10}" y="${y - 6}" width="20" height="8" rx="1" fill="${st}" ${S(2)}/><path d="M${x - 7} ${y - 6} V${y - h} Q${x} ${y - h - 6} ${x + 7} ${y - h} V${y - 6} Z" fill="${st}" ${S(2.2)}/>`;
  return stationDisc(d, `${s(40, 98, 42)}${s(64, 92, 52)}${s(88, 98, 42)}<path d="M64 26 L70 36 L58 36 Z" fill="${grad(d, GOLD)}" ${S(1.5)}/>`);
});
art('station', 'hue-station-nha-nhac', 128, 128, (d) => {
  const drum = grad(d, C.red, { x2: 1, y2: 0 });
  return stationDisc(d, `<path d="M34 46 Q64 36 94 46 L94 82 Q64 92 34 82 Z" fill="${drum}" ${S(3)}/>
  <ellipse cx="64" cy="46" rx="30" ry="10" fill="${rgrad(d, ['#fff3d6', '#c9a46a'])}" ${S(2.6)}/>
  ${range(7).map((i) => `<circle cx="${38 + i * 8.5}" cy="${52 + Math.sin((i / 6) * Math.PI) * 4}" r="1.8" fill="#ffe28a"/>`).join('')}
  <path d="M86 22 L70 40 M98 28 L80 44" ${S(6)}/><path d="M86 22 L70 40 M98 28 L80 44" stroke="#e8cf9c" stroke-width="3" stroke-linecap="round"/>`);
});
art('station', 'hue-station-cuu-dinh', 128, 128, (d) => stationDisc(d, urn(d, 64, 104, 0.72)));
art('station', 'hue-station-poem', 128, 128, (d) => stationDisc(d, `<rect x="30" y="34" width="68" height="60" fill="${grad(d, C.red)}" ${S(2.6)}/>
  ${poemPanel(d, 36, 40, 26, 48)}${paintPanel(d, 66, 40, 26, 48, 'sen')}`));
art('station', 'hue-station-seal', 128, 128, (d) => stationDisc(d, `
  <rect x="34" y="60" width="44" height="40" rx="3" fill="none" stroke="#d8473a" stroke-width="5"/>
  <path d="M42 70 H70 M42 80 H70 M42 90 H70 M56 66 V96" stroke="#d8473a" stroke-width="3"/>
  <g transform="translate(76 52) rotate(18)"><rect x="-20" y="0" width="40" height="18" rx="3" fill="${grad(d, C.jade)}" ${S(2.4)}/>
  <path d="M-12 0 Q-14 -16 0 -22 Q14 -16 12 0 Z" fill="${grad(d, GOLD)}" ${S(2.4)}/><circle cx="0" cy="-12" r="4" fill="${INK}" opacity=".5"/></g>`));
art('station', 'hue-station-banh-beo', 128, 128, (d) => stationDisc(d, `${cup(d, 46, 76, 0.9, 5)}${cup(d, 84, 70, 0.9, 4)}${cup(d, 66, 92, 0.9, 5)}`));

// ================================================================== MINI-GAME ART
// ---- moon phases (0 = Sóc / new moon, 2 = thượng huyền, 4 = Vọng / full, 6 = hạ huyền)
for (const k of range(8)) {
  art('mg', `hue-mg-moon-${k}`, 128, 128, (d) => {
    const cx = 64, cy = 64, r = 46;
    const lit = rgrad(d, ['#fffbe6', '#f6e3a4', '#d9b866'], { cx: 0.45, cy: 0.4, r: 0.7 });
    const dark = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#26304f" ${S(3)}/>`;
    const glow = `<circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="${rgrad(d, ['#fff3c060', '#fff3c000'], { cx: 0.5, cy: 0.5, r: 0.5 })}"/>`;
    const craters = [[-14, -10, 7], [12, 14, 9], [16, -18, 5], [-8, 22, 5]].map(([x, y, rr]) => `<circle cx="${cx + x}" cy="${cy + y}" r="${rr}" fill="#000" opacity=".08"/>`).join('');
    let litPath = '';
    if (k === 4) litPath = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${lit}"/>`;
    else if (k !== 0) {
      const th = (k * 45 * Math.PI) / 180;
      const rx = Math.abs(Math.cos(th)) * r;
      const waxing = k < 4;
      const crescent = k === 1 || k === 7;
      const half = waxing ? `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r}` : `M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r}`;
      let sweep;
      if (waxing) sweep = crescent ? 0 : 1;
      else sweep = crescent ? 1 : 0;
      litPath = `<path d="${half} A${Math.max(0.01, rx)} ${r} 0 0 ${sweep} ${cx} ${cy - r} Z" fill="${lit}"/>`;
    }
    return `${k ? glow : ''}${dark}${litPath}${craters}<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" ${S(3)}/>`;
  });
}

// ---- woodblock + paper
art('mg', 'hue-mg-woodblock', 240, 240, (d) => {
  const side = grad(d, C.wood);
  return `<rect x="14" y="22" width="212" height="212" rx="10" fill="${side}" ${S(4)}/>
    ${woodBlockTop(d, 14, 10, 212, 206)}
    <rect x="30" y="26" width="180" height="174" rx="4" fill="none" stroke="#8a5228" stroke-width="3" stroke-dasharray="2 5"/>`;
});
art('mg', 'hue-mg-paper', 300, 300, (d) => {
  const p = grad(d, ['#fffaf0', '#f3e8cc'], { x2: 1, y2: 1 });
  const fib = range(60).map((i) => {
    const x = (i * 97) % 280 + 10, y = (i * 53) % 280 + 10;
    return `<path d="M${x} ${y} q${(i % 7) - 3} ${(i % 5) + 4} ${(i % 9) - 2} ${(i % 6) + 8}" stroke="#c9b48a" stroke-width="1" opacity=".35" fill="none"/>`;
  }).join('');
  return `<path d="M8 10 Q150 2 292 10 L290 292 Q150 298 10 290 Z" fill="${p}" ${S(2)}/>${fib}`;
});

// ---- Ngọ Môn facade + travellers
art('mg', 'hue-mg-ngo-mon', 720, 300, (d) => `<rect x="0" y="292" width="720" height="8" fill="#7d5c3a"/>${ngoMon(d, 720, 296)}`);

function person(d, { robe, trim, hat, emblem, hold }) {
  const r = grad(d, robe);
  const skin = '#f6d3a8';
  const hats = {
    crown: `<path d="M44 34 L48 14 L56 22 L64 8 L72 22 L80 14 L84 34 Z" fill="${grad(d, GOLD)}" ${S(2.6)}/><circle cx="64" cy="20" r="4" fill="#d8473a"/>`,
    canh: `<path d="M44 34 Q46 14 64 12 Q82 14 84 34 Z" fill="#20160f" ${S(2.4)}/><path d="M44 28 L22 22 L24 30 L44 32 M84 28 L106 22 L104 30 L84 32" fill="#20160f" ${S(2)}/>`,
    vo: `<path d="M42 34 Q44 10 64 10 Q84 10 86 34 Z" fill="#a5261f" ${S(2.4)}/><path d="M64 10 L64 0" stroke="#d8473a" stroke-width="5" stroke-linecap="round"/><path d="M44 30 H84" stroke="${grad(d, GOLD)}" stroke-width="3"/>`,
    nondau: `<path d="M34 32 L64 6 L94 32 Z" fill="#2a2a2a" ${S(2.4)}/><circle cx="64" cy="8" r="3" fill="#d8473a"/>`,
  };
  return `${shadow(64, 122, 30, 5)}
    <path d="M38 64 Q36 98 32 120 L96 120 Q92 98 90 64 Q64 54 38 64 Z" fill="${r}" ${S(3)}/>
    <path d="M64 58 L64 120" stroke="${trim}" stroke-width="4"/>
    <path d="M40 66 Q30 84 34 98 M88 66 Q98 84 94 98" stroke="${INK}" stroke-width="2" fill="none" opacity=".5"/>
    ${emblem || ''}
    <circle cx="64" cy="44" r="18" fill="${skin}" ${S(2.6)}/>
    <circle cx="58" cy="46" r="2" fill="${INK}"/><circle cx="70" cy="46" r="2" fill="${INK}"/>
    <path d="M60 53 Q64 55 68 53" stroke="${INK}" stroke-width="1.6" fill="none"/>
    ${hats[hat]}${hold || ''}`;
}
const birdEmblem = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-13" y="-13" width="26" height="26" rx="2" fill="#f7edd0" ${S(1.6)}/><path d="M-8 4 Q-2 -8 6 -6 L10 -9 L8 -4 Q4 6 -8 4 Z M-2 4 L-4 9 M2 4 L2 9" fill="#e9eef2" stroke="${INK}" stroke-width="1.4"/><circle cx="6" cy="-7" r="1.6" fill="#d8473a"/></g>`;
const beastEmblem = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-13" y="-13" width="26" height="26" rx="2" fill="#f7edd0" ${S(1.6)}/><path d="M-9 6 L-9 -1 Q-6 -6 2 -4 L4 -8 L7 -4 Q10 -2 9 2 L9 6 M-6 6 V9 M5 6 V9" fill="#f3b04a" stroke="${INK}" stroke-width="1.4"/><path d="M-4 -2 V3 M0 -3 V3 M4 -2 V3" stroke="${INK}" stroke-width="1.2"/></g>`;

art('mg', 'hue-mg-trav-vua', 128, 128, (d) => person(d, { robe: C.yellow, trim: '#a5261f', hat: 'crown', emblem: `<circle cx="64" cy="86" r="12" fill="#ffe9a8" ${S(1.6)}/><path d="M56 88 Q60 78 66 84 Q72 90 74 82" stroke="#a5261f" stroke-width="2.4" fill="none"/>` }));
art('mg', 'hue-mg-trav-van', 128, 128, (d) => person(d, { robe: ['#5f8fd6', '#2c5aa8', '#173469'], trim: '#f4b93a', hat: 'canh', emblem: birdEmblem(64, 86), hold: `<rect x="86" y="70" width="6" height="30" rx="2" fill="#f7edd0" ${S(1.6)}/>` }));
art('mg', 'hue-mg-trav-vo', 128, 128, (d) => person(d, { robe: C.red, trim: '#f4b93a', hat: 'vo', emblem: beastEmblem(64, 86), hold: `<path d="M98 40 L98 120" ${S(5)}/><path d="M98 40 L98 120" stroke="#8a5228" stroke-width="3"/><path d="M93 40 L98 22 L103 40 Z" fill="#d9dde2" ${S(2)}/>` }));
art('mg', 'hue-mg-trav-linh', 128, 128, (d) => person(d, { robe: ['#4f8a72', '#2d5446', '#1a3229'], trim: '#d8473a', hat: 'nondau', hold: `<path d="M100 26 L100 120" ${S(5)}/><path d="M100 26 L100 120" stroke="#8a5228" stroke-width="3"/><path d="M96 28 L100 14 L104 28 Z" fill="#d9dde2" ${S(2)}/><path d="M96 34 L104 34" stroke="#d8473a" stroke-width="4"/>` }));
art('mg', 'hue-mg-trav-voi', 128, 128, (d) => {
  const g = grad(d, ['#b9b4b0', '#8c8580', '#5e5752']);
  return `${shadow(64, 120, 46, 6)}
    <path d="M24 70 Q22 40 56 36 Q96 34 104 64 L104 104 L92 104 L90 86 L40 86 L38 104 L26 104 Z" fill="${g}" ${S(3)}/>
    <path d="M30 64 Q12 70 14 96 Q16 112 24 112 Q22 96 30 84" fill="${g}" ${S(3)}/>
    <path d="M40 50 Q30 40 38 30 Q50 30 52 46" fill="${g}" ${S(2.4)}/>
    <circle cx="34" cy="58" r="2.6" fill="${INK}"/>
    <path d="M28 76 Q22 82 18 78" stroke="#f7f0e0" stroke-width="4" stroke-linecap="round"/>
    <path d="M52 36 L90 36 L94 60 L50 60 Z" fill="${grad(d, C.red)}" ${S(2.4)}/>
    <path d="M54 40 H90" stroke="${grad(d, GOLD)}" stroke-width="3"/>
    <path d="M60 36 L64 22 L80 22 L84 36" fill="${grad(d, C.yellow)}" ${S(2.4)}/>`;
});
art('mg', 'hue-mg-trav-ngua', 128, 128, (d) => {
  const g = grad(d, ['#c08552', '#8a5228', '#5a3216']);
  return `${shadow(64, 120, 44, 6)}
    <path d="M30 60 Q34 50 52 52 L92 52 Q104 54 104 70 L102 84 L96 84 L96 112 L88 112 L88 86 L46 86 L46 112 L38 112 L38 84 Q30 80 30 70 Z" fill="${g}" ${S(3)}/>
    <path d="M34 62 Q24 40 30 26 Q38 18 46 24 L52 52" fill="${g}" ${S(3)}/>
    <path d="M30 26 Q22 30 20 40 Q24 44 30 40" fill="${g}" ${S(2.4)}/>
    <circle cx="32" cy="32" r="2.4" fill="${INK}"/>
    <path d="M44 24 Q50 30 52 44 M40 22 L44 12 L48 22" stroke="#2a1a10" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M104 60 Q118 66 112 92" stroke="#2a1a10" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M56 50 L86 50 L84 66 L58 66 Z" fill="${grad(d, C.red)}" ${S(2.2)}/>`;
});
art('mg', 'hue-mg-botu-chim', 64, 64, (d) => birdEmblem(32, 32, 2.1));
art('mg', 'hue-mg-botu-thu', 64, 64, (d) => beastEmblem(32, 32, 2.1));
art('mg', 'hue-mg-pham-son', 96, 120, (d) => {
  const st = grad(d, C.stone, { x2: 1, y2: 0.3 });
  return `${shadow(48, 114, 34, 5)}<rect x="22" y="96" width="52" height="18" rx="3" fill="${grad(d, C.stone)}" ${S(2.6)}/>
    <path d="M30 96 L30 22 Q48 6 66 22 L66 96 Z" fill="${st}" ${S(3)}/><rect x="38" y="28" width="20" height="60" rx="2" fill="none" stroke="#7f735f" stroke-width="2"/>`;
});
art('mg', 'hue-mg-thai-hoa', 720, 150, (d) => {
  const roof = grad(d, C.yellow);
  const red = grad(d, C.red);
  return `<rect x="40" y="90" width="640" height="56" fill="${red}" ${S(3)}/>
    ${range(11).map((i) => `<rect x="${52 + i * 60}" y="88" width="12" height="60" fill="${grad(d, ['#e2584a', '#8a1d16'], { x2: 1, y2: 0 })}" ${S(2)}/>`).join('')}
    ${range(10).map((i) => `<rect x="${70 + i * 60}" y="100" width="36" height="40" fill="#5a1d14" stroke="${grad(d, GOLD)}" stroke-width="2"/>`).join('')}
    <path d="M10 92 Q360 70 710 92 L640 52 Q360 40 80 52 Z" fill="${roof}" ${S(3)}/>
    <path d="M80 50 Q360 36 640 50 L590 18 Q360 6 130 18 Z" fill="${roof}" ${S(3)}/>
    <path d="M330 8 Q360 -4 390 8" stroke="#f4b93a" stroke-width="6" fill="none"/>
    <rect x="300" y="56" width="120" height="26" rx="2" fill="${grad(d, C.red)}" stroke="${grad(d, GOLD)}" stroke-width="3"/>`;
});

// ---- Nhã nhạc instruments
art('mg', 'hue-mg-inst-trong', 160, 160, (d) => `${shadow(80, 146, 56, 7)}
  <path d="M28 52 Q80 34 132 52 L132 116 Q80 134 28 116 Z" fill="${grad(d, C.red, { x2: 1, y2: 0 })}" ${S(3.5)}/>
  <ellipse cx="80" cy="52" rx="52" ry="18" fill="${rgrad(d, ['#fff3d6', '#e8cf9c', '#b9915a'])}" ${S(3.5)}/>
  ${medallion(80, 52, 10, '#d8473a')}
  ${range(11).map((i) => `<circle cx="${32 + i * 9.6}" cy="${60 + Math.sin((i / 10) * Math.PI) * 8}" r="2.4" fill="#ffe28a" ${S(0.8)}/>`).join('')}
  <path d="M40 84 Q80 96 120 84" stroke="#ffe28a" stroke-width="3" fill="none"/>`);
art('mg', 'hue-mg-inst-senh', 160, 160, (d) => {
  const w = grad(d, C.wood, { x2: 1, y2: 0 });
  const coin = (x, y) => `<circle cx="${x}" cy="${y}" r="7" fill="${grad(d, GOLD)}" ${S(1.6)}/><rect x="${x - 2.5}" y="${y - 2.5}" width="5" height="5" fill="${INK}"/>`;
  return `${shadow(80, 146, 50, 6)}
    <g transform="rotate(-14 80 80)"><rect x="34" y="24" width="22" height="116" rx="6" fill="${w}" ${S(3)}/>${coin(45, 50)}${coin(45, 70)}${coin(45, 90)}</g>
    <g transform="rotate(14 80 80)"><rect x="104" y="24" width="22" height="116" rx="6" fill="${w}" ${S(3)}/>${coin(115, 50)}${coin(115, 70)}${coin(115, 90)}</g>
    <path d="M70 20 Q80 10 90 20" stroke="#d8473a" stroke-width="4" fill="none"/>`;
});
art('mg', 'hue-mg-inst-nguyet', 160, 160, (d) => {
  const w = grad(d, ['#d79a5c', '#a5642e', '#6a3a17'], { x2: 1, y2: 1 });
  return `${shadow(80, 150, 44, 6)}
    <g transform="rotate(-30 80 80)">
    <rect x="74" y="0" width="12" height="96" rx="3" fill="${grad(d, C.darkwood)}" ${S(2.6)}/>
    ${range(6).map((i) => `<path d="M72 ${16 + i * 12} H88" stroke="#f3e6c4" stroke-width="2"/>`).join('')}
    <path d="M70 6 L66 2 M90 6 L94 2 M70 14 L64 12 M90 14 L96 12" ${S(4)}/>
    <circle cx="80" cy="118" r="38" fill="${w}" ${S(3.5)}/>
    <rect x="64" y="128" width="32" height="6" rx="2" fill="${INK}"/>
    <path d="M77 4 L77 130 M83 4 L83 130" stroke="#fff6cf" stroke-width="1.2"/>
    ${medallion(80, 104, 7, grad(d, GOLD))}</g>`;
});
art('mg', 'hue-mg-inst-sao', 160, 160, (d) => {
  const b = grad(d, ['#f1d58a', '#c9a24c', '#8a6a24']);
  return `${shadow(80, 132, 62, 6)}
    <g transform="rotate(-20 80 80)"><rect x="8" y="70" width="144" height="20" rx="10" fill="${b}" ${S(3)}/>
    ${[30, 100, 112, 124, 136].map((x) => `<ellipse cx="${x}" cy="80" rx="4" ry="5" fill="${INK}"/>`).join('')}
    ${[50, 80].map((x) => `<path d="M${x} 70 V90" stroke="#8a6a24" stroke-width="2.4"/>`).join('')}
    <path d="M14 76 H146" stroke="#fff6cf" stroke-width="2" opacity=".6"/>
    <path d="M152 80 Q160 92 150 108" stroke="#d8473a" stroke-width="4" fill="none"/></g>`;
});

// ---- Cửu Đỉnh: urn face + 12 relief motifs
art('mg', 'hue-mg-dinh-face', 480, 480, (d) => {
  const b = grad(d, C.bronze, { x2: 1, y2: 0.4 });
  const panel = grad(d, ['#6e4a22', '#4e3216']);
  return `${shadow(240, 466, 190, 12)}
    <path d="M70 410 L58 470 L96 470 L110 420 Z M410 410 L422 470 L384 470 L370 420 Z" fill="${b}" ${S(4)}/>
    <path d="M44 70 Q30 300 110 400 Q170 444 240 444 Q310 444 370 400 Q450 300 436 70 Z" fill="${b}" ${S(5)}/>
    <ellipse cx="240" cy="70" rx="200" ry="34" fill="${b}" ${S(5)}/>
    <ellipse cx="240" cy="70" rx="168" ry="20" fill="#3a2410"/>
    <path d="M30 40 Q4 30 10 90 Q16 120 44 116" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>
    <path d="M30 40 Q4 30 10 90 Q16 120 44 116" fill="none" stroke="${b}" stroke-width="13" stroke-linecap="round"/>
    <path d="M450 40 Q476 30 470 90 Q464 120 436 116" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round"/>
    <path d="M450 40 Q476 30 470 90 Q464 120 436 116" fill="none" stroke="${b}" stroke-width="13" stroke-linecap="round"/>
    ${range(3).map((r) => range(3).map((c) => `<rect x="${102 + c * 96}" y="${112 + r * 96}" width="84" height="84" rx="6" fill="${panel}" ${S(3)}/>`).join('')).join('')}
    <path d="M70 110 Q90 300 150 380" stroke="#fff3c8" stroke-width="6" fill="none" opacity=".25"/>`;
});
const MOTIF_DRAW = {
  'mat-troi': () => `<circle cx="56" cy="56" r="18"/>${range(12).map((i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M${56 + Math.cos(a) * 24} ${56 + Math.sin(a) * 24} L${56 + Math.cos(a) * 34} ${56 + Math.sin(a) * 34}" stroke-width="5"/>`; }).join('')}`,
  may: () => `<path d="M18 70 Q14 54 30 52 Q32 36 50 40 Q60 28 74 40 Q94 38 92 56 Q100 68 88 74 Z"/><path d="M30 62 Q44 56 54 64 Q64 54 78 62" fill="none"/>`,
  nui: () => `<path d="M10 86 L38 34 L52 56 L68 26 L102 86 Z"/><path d="M62 38 L68 26 L74 38" fill="none"/>`,
  song: () => `<path d="M10 40 Q30 28 50 40 T90 40 T102 40 M10 60 Q30 48 50 60 T90 60 T102 60 M10 80 Q30 68 50 80 T90 80 T102 80" fill="none" stroke-width="6"/>`,
  thuyen: () => `<path d="M14 66 L98 66 L86 84 L26 84 Z"/><path d="M56 66 V22 L82 58 Z"/><path d="M50 26 L32 58 L52 58 Z"/>`,
  voi: () => `<path d="M24 70 Q22 42 54 40 Q90 38 94 64 L94 88 L84 88 L82 76 L44 76 L42 88 L30 88 Z M28 64 Q14 72 18 92 L26 90 Q24 78 32 72 Z"/><circle cx="36" cy="54" r="3" fill="#2a1a0a"/>`,
  ho: () => `<path d="M16 74 Q20 54 40 52 L76 52 Q96 50 98 66 L98 84 L88 84 L86 72 L42 72 L36 84 L26 84 Z M16 74 L10 60 L22 62 Z M98 62 Q108 50 104 40" /><path d="M48 54 V70 M60 54 V70 M72 54 V70" fill="none"/>`,
  chim: () => `<path d="M20 64 Q40 30 76 42 L96 34 L88 50 Q80 76 44 76 Z"/><path d="M40 60 Q56 48 76 52" fill="none"/><path d="M44 76 L40 92 M54 76 L54 92" fill="none"/>`,
  ca: () => `<path d="M16 56 Q44 28 80 56 Q44 84 16 56 Z M80 56 L100 40 L98 72 Z"/><circle cx="32" cy="52" r="3" fill="#2a1a0a"/><path d="M44 46 Q52 56 44 66 M56 44 Q64 56 56 68" fill="none"/>`,
  hoa: () => `${range(6).map((i) => `<ellipse cx="56" cy="34" rx="10" ry="20" transform="rotate(${i * 60} 56 56)"/>`).join('')}<circle cx="56" cy="56" r="10"/>`,
  sung: () => `<path d="M18 52 L86 40 L90 58 L22 70 Z"/><circle cx="40" cy="78" r="14"/><circle cx="40" cy="78" r="4" fill="#2a1a0a"/><path d="M86 40 L96 38 L98 56 L90 58" />`,
  cay: () => `<path d="M52 96 L52 56 M52 70 L36 56 M52 64 L70 50" fill="none" stroke-width="7"/><circle cx="52" cy="38" r="22"/><circle cx="32" cy="50" r="14"/><circle cx="74" cy="46" r="14"/>`,
};
for (const [m, draw] of Object.entries(MOTIF_DRAW)) {
  art('mg', `hue-mg-motif-${m}`, 112, 112, (d) => {
    const relief = grad(d, ['#f6dc96', '#d9b26a', '#9a6b33'], { x2: 0.6, y2: 1 });
    return `<g fill="${relief}" stroke="#2a1a0a" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round" transform="translate(0 0)">${draw()}</g>`;
  });
}

// ---- poem wall panels
const PAINT = {
  sen: (d) => `<path d="M80 190 Q76 140 80 110" stroke="#2f6a3a" stroke-width="4" fill="none"/><ellipse cx="54" cy="160" rx="26" ry="10" fill="#3f9c45" ${S(2)}/><ellipse cx="108" cy="172" rx="22" ry="8" fill="#3f9c45" ${S(2)}/>
    ${[-40, -15, 15, 40].map((r) => `<ellipse cx="80" cy="90" rx="11" ry="26" transform="rotate(${r} 80 112)" fill="#f29bb8" ${S(2)}/>`).join('')}`,
  nui: (d) => `<path d="M14 180 L58 80 L82 120 L110 60 L150 180 Z" fill="#4f8a72" ${S(2.4)}/><path d="M100 76 L110 60 L120 78" fill="#fff" ${S(1.6)}/><circle cx="124" cy="44" r="12" fill="#e2584a"/><path d="M14 180 Q80 168 150 180" stroke="#2c5aa8" stroke-width="3" fill="none"/>`,
  thuyen: (d) => `<path d="M10 150 Q80 140 150 150 M10 168 Q80 158 150 168" stroke="#2c5aa8" stroke-width="3" fill="none"/><path d="M30 132 L130 132 L116 150 L44 150 Z" fill="#8a5228" ${S(2.4)}/><path d="M80 132 V60 L116 120 Z" fill="#f6ecd0" ${S(2.4)}/><path d="M58 132 Q60 110 74 110 L74 132" fill="#d8473a" ${S(2)}/>`,
  truc: (d) => `${[50, 84, 112].map((x, i) => `<path d="M${x} 190 L${x + i * 4} 30" stroke="#3f8a45" stroke-width="8"/>${range(4).map((k) => `<path d="M${x - 4} ${170 - k * 36} h10" stroke="#1f5c2c" stroke-width="3"/>`).join('')}`).join('')}${range(7).map((i) => `<path d="M${60 + (i % 3) * 28} ${50 + i * 18} q14 -6 26 -2" stroke="#2f8a4a" stroke-width="6" stroke-linecap="round" fill="none"/>`).join('')}`,
  mai: (d) => `<path d="M20 190 Q50 140 70 120 Q100 90 140 70 M70 120 Q60 90 80 60" stroke="#4a2a16" stroke-width="6" fill="none" stroke-linecap="round"/>${[[70, 118], [100, 92], [130, 74], [78, 64], [48, 150], [116, 84]].map(([x, y]) => `<g transform="translate(${x} ${y})">${range(5).map((i) => `<circle cx="${Math.cos((i / 5) * 6.28) * 6}" cy="${Math.sin((i / 5) * 6.28) * 6}" r="5" fill="#ffd23a" stroke="${INK}" stroke-width="1"/>`).join('')}<circle r="3" fill="#d8473a"/></g>`).join('')}`,
  trang: (d) => `<rect x="10" y="12" width="140" height="120" fill="#1f2a4a"/><circle cx="104" cy="52" r="24" fill="#fff3c0" ${S(2)}/><path d="M10 132 L50 90 L80 118 L110 96 L150 132 Z" fill="#2d5446" ${S(2)}/><path d="M10 160 Q80 150 150 160" stroke="#2c5aa8" stroke-width="3" fill="none"/>`,
};
function panelFrame(d, inner) {
  const f = grad(d, C.red);
  const g = grad(d, GOLD);
  return `<rect x="2" y="2" width="156" height="196" rx="6" fill="${f}" ${S(3)}/>
    <rect x="10" y="10" width="140" height="180" rx="3" fill="${grad(d, ['#f8efd6', '#e9dab2'])}" stroke="${g}" stroke-width="3"/>
    <g>${inner}</g>
    <rect x="10" y="10" width="140" height="180" rx="3" fill="none" stroke="${INK}" stroke-width="2"/>`;
}
for (const [k, fn] of Object.entries(PAINT)) art('mg', `hue-mg-hoa-${k}`, 160, 200, (d) => panelFrame(d, `<svg x="0" y="10" width="160" height="180" viewBox="0 0 160 200">${fn(d)}</svg>`));
art('mg', 'hue-mg-tho', 160, 200, (d) => panelFrame(d, `${range(4).map((i) => `<path d="M${36 + i * 30} 22 V178" stroke="#c9b48a" stroke-width="1.4" stroke-dasharray="3 5"/>`).join('')}`));
art('mg', 'hue-mg-slot', 160, 200, (d) => `<rect x="4" y="4" width="152" height="192" rx="6" fill="#2a1410" opacity=".55" stroke="#f3c75a" stroke-width="3" stroke-dasharray="10 8"/>`);

// ---- calendar page + seal
art('mg', 'hue-mg-lich-page', 480, 360, (d) => {
  const p = grad(d, ['#fff9e8', '#f1e3bd'], { x2: 1, y2: 1 });
  return `<path d="M10 14 Q240 4 470 14 L466 348 Q240 356 14 346 Z" fill="${p}" ${S(3)}/>
    <rect x="30" y="30" width="420" height="300" fill="none" stroke="#a5261f" stroke-width="5"/>
    <rect x="40" y="40" width="400" height="280" fill="none" stroke="#a5261f" stroke-width="1.6"/>
    ${range(11).map((i) => `<path d="M${76 + i * 34} 48 V312" stroke="#c9b48a" stroke-width="1.2"/>`).join('')}
    ${range(12).map((i) => range(9).map((j) => ((i * 7 + j * 3) % 5 === 0 ? '' : `<path d="M${54 + i * 34} ${62 + j * 28} h10 m-5 -5 v12" stroke="#3a2618" stroke-width="2.4" opacity=".65"/>`)).join('')).join('')}`;
});
art('mg', 'hue-mg-an', 140, 140, (d) => {
  const jade = grad(d, C.jade, { x2: 1, y2: 1 });
  const g = grad(d, GOLD, { x2: 1, y2: 1 });
  return `${shadow(70, 128, 46, 8, 0.35)}
    <path d="M26 84 L114 84 L114 118 Q70 126 26 118 Z" fill="${jade}" ${S(3.5)}/>
    <path d="M26 84 Q70 74 114 84 Q70 94 26 84 Z" fill="${grad(d, ['#bfe8cf', '#6fbf96'])}" ${S(3)}/>
    <path d="M30 104 Q70 112 110 104" stroke="#1f5c43" stroke-width="2" fill="none"/>
    <!-- gold knob (núm ấn) with a cloud-scroll pattern -->
    <path d="M44 84 Q40 58 52 44 Q70 24 88 44 Q100 58 96 84 Z" fill="${g}" ${S(3.5)}/>
    <path d="M56 70 q-6 -10 4 -14 q10 -2 8 8 M84 70 q6 -10 -4 -14 q-10 -2 -8 8 M62 52 q8 -8 16 0" stroke="#9a6b12" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <ellipse cx="70" cy="40" rx="9" ry="6" fill="${g}" ${S(2.4)}/>
    <!-- red silk cord + tassel -->
    <path d="M70 36 Q60 22 72 16 Q86 14 82 30" stroke="#c8281e" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M96 66 Q112 60 116 70 L120 96" stroke="#c8281e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M116 94 L114 112 M120 94 L120 114 M124 94 L126 112" stroke="#c8281e" stroke-width="3" stroke-linecap="round"/>
    <circle cx="120" cy="94" r="4" fill="${g}" ${S(1.6)}/>
    <path d="M50 52 Q56 42 64 40" stroke="#fff6cf" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>`;
});
art('mg', 'hue-mg-an-dau', 120, 120, (d) => {
  const ink = '#c8281e';
  const strokes = ['M26 30 H54 M40 22 V58 M26 46 H54 M30 58 L50 58', 'M66 26 V58 M66 26 H94 V58 M66 42 H94 M74 50 L86 56', 'M26 70 H54 V96 H26 Z M32 82 H48', 'M66 66 L94 66 M80 66 V98 M68 80 Q80 90 92 80 M70 96 H90'];
  return `<rect x="10" y="10" width="100" height="100" rx="4" fill="none" stroke="${ink}" stroke-width="8"/>
    <rect x="18" y="18" width="84" height="84" fill="none" stroke="${ink}" stroke-width="2"/>
    ${strokes.map((s) => `<path d="${s}" stroke="${ink}" stroke-width="5" fill="none" stroke-linecap="square"/>`).join('')}`;
});

// ---- bánh bèo: cup states + step icons
for (const k of range(6)) art('mg', `hue-mg-chen-${k}`, 160, 120, (d) => cup(d, 80, 60, 2.6, k));
art('mg', 'hue-mg-step-bot', 112, 112, (d) => `${shadow(56, 96, 34, 6)}
  <path d="M22 50 Q56 40 90 50 L82 92 Q56 100 30 92 Z" fill="${grad(d, C.porcelain)}" ${S(3)}/>
  <ellipse cx="56" cy="50" rx="34" ry="10" fill="#f1ead6" ${S(2.6)}/>
  <path d="M74 14 L64 52" ${S(6)}/><path d="M74 14 L64 52" stroke="#c58a52" stroke-width="3"/><ellipse cx="62" cy="54" rx="10" ry="5" fill="#c58a52" ${S(2)}/>`);
art('mg', 'hue-mg-step-hap', 112, 112, (d) => `${shadow(56, 100, 40, 6)}
  ${range(3).map((i) => `<rect x="18" y="${44 + i * 16}" width="76" height="16" rx="5" fill="${grad(d, ['#e6c98c', '#b98d4a'])}" ${S(2.6)}/><path d="M24 ${50 + i * 16} H88" stroke="#8a6a24" stroke-width="1.4"/>`).join('')}
  <path d="M18 44 Q56 22 94 44" fill="${grad(d, ['#f0d9a0', '#c9a24c'])}" ${S(2.6)}/>
  ${[38, 56, 74].map((x) => `<path d="M${x} 28 q-8 -8 0 -14 q8 -6 0 -14" stroke="#ffffff" stroke-width="4" fill="none" opacity=".85" stroke-linecap="round"/>`).join('')}`);
art('mg', 'hue-mg-step-tom', 112, 112, (d) => `${shadow(56, 96, 38, 6)}
  <ellipse cx="56" cy="74" rx="40" ry="18" fill="${grad(d, C.porcelain)}" ${S(3)}/>
  ${range(22).map((i) => `<circle cx="${30 + (i * 37) % 52}" cy="${64 + (i * 13) % 14}" r="4" fill="#ef7a3a" ${S(1)}/>`).join('')}`);
art('mg', 'hue-mg-step-mo', 112, 112, (d) => `${shadow(56, 96, 38, 6)}
  <ellipse cx="56" cy="74" rx="40" ry="18" fill="${grad(d, C.porcelain)}" ${S(3)}/>
  ${range(12).map((i) => `<rect x="${28 + (i * 29) % 50}" y="${62 + (i * 11) % 14}" width="10" height="7" rx="2" fill="#f3c75a" stroke="#9a6b33" stroke-width="1.4"/>`).join('')}
  ${range(6).map((i) => `<path d="M${34 + i * 8} ${66 + (i % 2) * 6} l4 -4" stroke="#3f9c45" stroke-width="3" stroke-linecap="round"/>`).join('')}`);
art('mg', 'hue-mg-step-mam', 112, 112, (d) => `${shadow(56, 100, 30, 6)}
  <path d="M34 40 Q30 92 56 96 Q82 92 78 40 Z" fill="${grad(d, C.porcelain)}" ${S(3)}/>
  <ellipse cx="56" cy="40" rx="22" ry="7" fill="#c9782a" ${S(2.4)}/>
  <path d="M78 46 Q96 44 98 30 L90 28" fill="none" ${S(5)}/><path d="M78 46 Q96 44 98 30" fill="none" stroke="#e8eef6" stroke-width="2.4"/>
  ${range(3).map((i) => `<circle cx="${50 + i * 6}" cy="${40 - (i % 2) * 2}" r="1.8" fill="#d8473a"/>`).join('')}`);

// ---- HUD: night-watch drum
art('mg', 'hue-ui-trong-canh', 64, 64, (d) => `
  <path d="M10 22 Q32 14 54 22 L54 46 Q32 54 10 46 Z" fill="${grad(d, C.red, { x2: 1, y2: 0 })}" ${S(2.6)}/>
  <ellipse cx="32" cy="22" rx="22" ry="8" fill="${rgrad(d, ['#fff3d6', '#c9a46a'])}" ${S(2.6)}/>
  ${range(6).map((i) => `<circle cx="${14 + i * 7.2}" cy="${28 + Math.sin((i / 5) * Math.PI) * 3}" r="1.5" fill="#ffe28a"/>`).join('')}
  <path d="M50 4 L38 18" ${S(5)}/><path d="M50 4 L38 18" stroke="#e8cf9c" stroke-width="2.4" stroke-linecap="round"/>`);

// ================================================================== render + pack
const SUB = { prop: 'props', station: 'stations', mg: 'minigames' };
const rendered = [];
for (const a of ARTS) {
  const defs = [];
  const body = a.draw(defs);
  const src = svg(a.w, a.h, defs, body);
  const srcFile = path.join(SRC, `${a.name}.svg`);
  ensure(srcFile);
  fs.writeFileSync(srcFile, src);
  const png = await sharp(Buffer.from(src), { density: 72 }).resize(a.w, a.h).png().toBuffer();
  const out = path.join(OUT, SUB[a.kind], `${a.name}.png`);
  ensure(out);
  fs.writeFileSync(out, png);
  if (a.kind === 'mg') {
    const pub = path.join(PUB, 'minigames', `${a.name}.webp`);
    ensure(pub);
    await sharp(png).webp({ quality: 90, alphaQuality: 100 }).toFile(pub);
  }
  rendered.push({ ...a, png });
}

// shelf-pack props + stations into one atlas (<= 2048 wide)
const packed = rendered.filter((a) => a.kind !== 'mg').sort((x, y) => y.h - x.h);
const MAXW = 2048, PAD = 2;
let x = 0, y = 0, rowH = 0, W = 0;
const frames = {};
const comps = [];
for (const a of packed) {
  if (x + a.w > MAXW) { x = 0; y += rowH + PAD; rowH = 0; }
  frames[a.name] = { frame: { x, y, w: a.w, h: a.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: a.w, h: a.h }, sourceSize: { w: a.w, h: a.h } };
  comps.push({ input: a.png, left: x, top: y });
  x += a.w + PAD; rowH = Math.max(rowH, a.h); W = Math.max(W, x);
}
const H = y + rowH;
const ATLAS = 'maps/co-do-hue/atlas/hue-bansoc-0';
const atlasPng = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(comps).png().toBuffer();
for (const base of [path.join(ROOT, 'assets'), path.join(ROOT, 'apps/web/public/assets')]) {
  const j = path.join(base, `${ATLAS}.json`);
  ensure(j);
  fs.writeFileSync(j, JSON.stringify({ frames, meta: { app: 'tools/ui-art/draw-hue-bansoc.mjs', image: 'hue-bansoc-0.webp', format: 'RGBA8888', size: { w: W, h: H }, scale: '1' } }));
}
fs.writeFileSync(path.join(ROOT, 'assets', `${ATLAS}.png`), atlasPng);
await sharp(atlasPng).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(ROOT, 'apps/web/public/assets', `${ATLAS}.webp`));

// manifest
for (const base of [path.join(ROOT, 'assets'), path.join(ROOT, 'apps/web/public/assets')]) {
  const mf = path.join(base, 'maps/co-do-hue/co-do-hue.assets.json');
  if (!fs.existsSync(mf)) continue;
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.story = 'nam-canh-truoc-binh-minh';
  m.atlases = [...(m.atlases ?? []).filter((a) => a.name !== 'hue-bansoc-0'), { name: 'hue-bansoc-0', file: ATLAS, size: [W, H] }];
  m.props = Object.fromEntries(rendered.filter((a) => a.kind === 'prop').map((a) => [a.name, { atlas: 'hue-bansoc-0', size: [a.w, a.h], anchor: [0.5, 1], footprint: [48, 48] }]));
  m.stations = rendered.filter((a) => a.kind === 'station').map((a) => ({ key: a.name, atlas: 'hue-bansoc-0', size: [a.w, a.h], display: [52, 52], hitbox: [96, 96] }));
  m.minigames = Object.fromEntries(rendered.filter((a) => a.kind === 'mg').map((a) => [a.name, { file: `maps/co-do-hue/minigames/${a.name}.webp`, size: [a.w, a.h] }]));
  fs.writeFileSync(mf, JSON.stringify(m, null, 1) + '\n');
}
console.log(`[bansoc] ${rendered.length} images, atlas ${W}x${H} (${packed.length} frames)`);
