#!/usr/bin/env node
/**
 * Procedural (vector) art for the home screen + map catalog — no AI / API key needed.
 *   node tools/ui-art/draw-home.mjs [repoRoot]
 *
 * Per map (slug listed in packages/shared/src/maps/catalog.ts):
 *   assets/maps/<slug>/meta/home-bg.png   1920x1080 home-screen background
 *   assets/maps/<slug>/meta/thumb.png     640x360  map card / lobby / opening thumbnail
 *   -> apps/web/public/assets/maps/<slug>/meta/*.webp
 *   co-do-hue   Ngọ Môn at night, lotus lanterns floating on the moat (Đêm Hội Hoàng Cung)
 *   hoi-an      Phố cổ Hội An at dusk: yellow houses, Chùa Cầu, lantern strings, river boats   (coming soon)
 *   thang-long  Hồ Gươm at night: Tháp Rùa, Thê Húc bridge, willows                           (coming soon)
 *
 * Home UI (assets/maps/common/ui/home/*):
 *   frame-home        512x512 9-slice, slice 120 (black lacquer + gold double line + lotus corners)
 *   home-crest        560x170 lotus crown that sits on top of the frame (title is HTML)
 *   map-card          256x256 9-slice, slice 48 (idle)       map-card-active (jade glow, selected)
 *   ribbon-soon       300x300 corner sash for "coming soon" maps (text is HTML)
 *   lock              96x96   padlock badge
 *   btn-primary       480x112 3-slice, slice 64 (gold plaque button)
 *   input             256x96  3-slice, slice 40 (inset field)
 *   lang-track / lang-knob / globe   VI|EN switch (track 240x72, knob 116x60, icon 64x64)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const INK = '#1c0f08';
const GOLD_STOPS = `<stop offset="0" stop-color="#fff2bf"/><stop offset=".32" stop-color="#f3c75a"/><stop offset=".68" stop-color="#c58b26"/><stop offset="1" stop-color="#7d4f12"/>`;
const gold = (id = 'gold', x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${GOLD_STOPS}</linearGradient>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const r1 = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ================================================================== scene helpers */
const W = 1920, H = 1080;
const skyGrad = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const glowGrad = (id, c, o = 0.8) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset=".4" stop-color="${c}" stop-opacity="${o * 0.35}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
function stars(seed, n, yMax, op = 0.9) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * yMax, rad = 0.8 + r() * 1.8;
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(rad)}" fill="#fff6dc" opacity="${r1((0.3 + r() * 0.7) * op)}"/>`;
  }
  return s;
}
const moon = (x, y, r, c = '#fff1c4') => `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="url(#moonGlow)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>
  <circle cx="${x - r * 0.3}" cy="${y - r * 0.2}" r="${r * 0.18}" fill="#000" opacity=".06"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.3}" r="${r * 0.12}" fill="#000" opacity=".06"/>`;
/** Vietnamese curved roof with upturned eave tips: ridge (x1..x2,y), eave (x0..x3, yb) */
function roof(cx, y, ridgeW, eaveW, h, fill, { lip = 22, ridge = '#3a1d10', stroke = INK, sw = 4, tiles = true } = {}) {
  const x1 = cx - ridgeW / 2, x2 = cx + ridgeW / 2, x0 = cx - eaveW / 2, x3 = cx + eaveW / 2, yb = y + h;
  const d = `M${x1} ${y} L${x2} ${y} Q${x3 - eaveW * 0.06} ${yb - h * 0.2} ${x3 + 6} ${yb - lip} Q${x3 - 4} ${yb + 4} ${x3 - eaveW * 0.08} ${yb} L${x0 + eaveW * 0.08} ${yb} Q${x0 + 4} ${yb + 4} ${x0 - 6} ${yb - lip} Q${x0 + eaveW * 0.06} ${yb - h * 0.2} ${x1} ${y} Z`;
  let t = '';
  if (tiles) {
    const n = Math.max(4, Math.round(eaveW / 26));
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const xb = x0 + eaveW * 0.08 + (eaveW * 0.84) * u, xt = x1 + ridgeW * u;
      t += `<path d="M${r1(xt)} ${y + 3} L${r1(xb)} ${yb - 3}" stroke="#000" stroke-opacity=".18" stroke-width="3"/>`;
    }
  }
  return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>${t}
    <rect x="${x1 - 6}" y="${y - 7}" width="${ridgeW + 12}" height="10" rx="4" fill="${ridge}" stroke="${stroke}" stroke-width="${sw * 0.75}"/>`;
}
/** round silk lantern with glow */
function lantern(x, y, r, color, { glow = true, string = 0, tassel = true } = {}) {
  const ry = r * 1.15;
  return `${string ? `<path d="M${x} ${y - ry - string} V${y - ry - 4}" stroke="${INK}" stroke-width="2"/>` : ''}
    ${glow ? `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="url(#lg-${color.slice(1)})"/>` : ''}
    <ellipse cx="${x}" cy="${y}" rx="${r}" ry="${ry}" fill="${color}" stroke="${INK}" stroke-width="${Math.max(2, r * 0.12)}"/>
    <ellipse cx="${x}" cy="${y}" rx="${r * 0.55}" ry="${ry}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="${Math.max(1.5, r * 0.08)}"/>
    <ellipse cx="${x - r * 0.3}" cy="${y - r * 0.3}" rx="${r * 0.28}" ry="${r * 0.45}" fill="#fff" opacity=".35"/>
    <rect x="${x - r * 0.45}" y="${y - ry - r * 0.18}" width="${r * 0.9}" height="${r * 0.3}" rx="${r * 0.08}" fill="#e3ad48" stroke="${INK}" stroke-width="${Math.max(1.5, r * 0.08)}"/>
    <rect x="${x - r * 0.45}" y="${y + ry - r * 0.12}" width="${r * 0.9}" height="${r * 0.3}" rx="${r * 0.08}" fill="#e3ad48" stroke="${INK}" stroke-width="${Math.max(1.5, r * 0.08)}"/>
    ${tassel ? `<path d="M${x} ${y + ry + r * 0.18} V${y + ry + r * 0.9}" stroke="#c4241b" stroke-width="${Math.max(2, r * 0.14)}" stroke-linecap="round"/>` : ''}`;
}
/** lantern string drooping between two points */
function lanternString(xa, ya, xb, yb, sag, n, colors, r, seed) {
  const rnd = rng(seed);
  const mx = (xa + xb) / 2, my = (ya + yb) / 2 + sag;
  let s = `<path d="M${xa} ${ya} Q${mx} ${my + sag} ${xb} ${yb}" fill="none" stroke="${INK}" stroke-width="3"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = (1 - t) ** 2 * xa + 2 * (1 - t) * t * mx + t * t * xb;
    const y = (1 - t) ** 2 * ya + 2 * (1 - t) * t * (my + sag) + t * t * yb;
    const rr = r * (0.85 + rnd() * 0.3);
    s += lantern(x, y + rr * 1.6, rr, colors[i % colors.length], { string: rr * 0.5 });
  }
  return s;
}
/** horizontal shimmer lines for water */
function shimmer(seed, y0, y1, n, color, op = 0.35) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const y = y0 + r() * (y1 - y0), x = r() * W, w = 30 + r() * 140;
    s += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="3" rx="1.5" fill="${color}" opacity="${r1(op * (0.4 + r() * 0.6))}"/>`;
  }
  return s;
}
/** floating lotus lantern (hoa đăng) */
function hoaDang(x, y, s, color = '#ff8fa8') {
  const petals = [-50, -25, 0, 25, 50]
    .map((a) => `<path transform="rotate(${a} ${x} ${y})" d="M${x} ${y} C${x - 9 * s} ${y - 8 * s} ${x - 6 * s} ${y - 20 * s} ${x} ${y - 26 * s} C${x + 6 * s} ${y - 20 * s} ${x + 9 * s} ${y - 8 * s} ${x} ${y} Z" fill="${color}" stroke="${INK}" stroke-width="${2 * s}"/>`)
    .join('');
  return `<ellipse cx="${x}" cy="${y + 14 * s}" rx="${70 * s}" ry="${12 * s}" fill="url(#lg-ffcf6a)" opacity=".8"/>
    <circle cx="${x}" cy="${y - 10 * s}" r="${46 * s}" fill="url(#lg-ffcf6a)"/>
    <ellipse cx="${x}" cy="${y + 2 * s}" rx="${26 * s}" ry="${7 * s}" fill="#2f7a54" stroke="${INK}" stroke-width="${2 * s}"/>
    ${petals}
    <ellipse cx="${x}" cy="${y - 12 * s}" rx="${4 * s}" ry="${7 * s}" fill="#fff4c2"/>
    <ellipse cx="${x}" cy="${y - 16 * s}" rx="${2.4 * s}" ry="${4 * s}" fill="#ffb02e"/>`;
}
const lanternDefs = ['#ff3b2a', '#ffcf6a', '#ff8a2a', '#e8241b', '#ffd94a', '#ff5a8a', '#3fd0a0', '#c43bd6', '#ffb02e'].map((c) => glowGrad(`lg-${c.slice(1)}`, c, 0.75)).join('');
function tree(x, y, s, fill) {
  return `<g fill="${fill}" stroke="${INK}" stroke-width="3">
    <circle cx="${x}" cy="${y}" r="${60 * s}"/><circle cx="${x - 55 * s}" cy="${y + 25 * s}" r="${45 * s}"/><circle cx="${x + 55 * s}" cy="${y + 22 * s}" r="${48 * s}"/>
    <circle cx="${x + 10 * s}" cy="${y + 40 * s}" r="${50 * s}"/></g>`;
}
function fireflies(seed, n, box, color = '#ffe07a') {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(6 + r() * 6)}" fill="url(#lg-ffcf6a)"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(1.4 + r() * 1.4)}" fill="${color}"/>`;
  }
  return s;
}
const vignette = `<rect width="${W}" height="${H}" fill="url(#vig)"/>`;
const vigDef = `<radialGradient id="vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>`;

/* ================================================================== Huế: Ngọ Môn + hoa đăng */
function sceneHue() {
  const gx = 1380; // gate centre
  const baseY = 610, baseW = 900, baseH = 190;
  const arch = (x, w, h) => `<path d="M${x - w / 2} ${baseY + baseH} V${baseY + baseH - h + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w / 2} ${baseY + baseH - h + w / 2} V${baseY + baseH} Z" fill="url(#archGlow)" stroke="${INK}" stroke-width="4"/>`;
  const pillars = (x0, x1, y0, y1, n) =>
    Array.from({ length: n }, (_, i) => {
      const x = x0 + ((x1 - x0) * i) / (n - 1);
      return `<rect x="${x - 7}" y="${y0}" width="14" height="${y1 - y0}" fill="#b8281f" stroke="${INK}" stroke-width="3"/>`;
    }).join('');
  const pav = (cx, w, y, h, roofFill) => `
    <rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h}" fill="#5a1d12" stroke="${INK}" stroke-width="4"/>
    <rect x="${cx - w / 2 + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="url(#windowGlow)"/>
    ${pillars(cx - w / 2 + 6, cx + w / 2 - 6, y, y + h, Math.max(4, Math.round(w / 60)))}
    <rect x="${cx - w / 2 - 6}" y="${y + h - 8}" width="${w + 12}" height="12" fill="#7a3a1c" stroke="${INK}" stroke-width="3"/>`;
  const ridgeDeco = (cx, y, w) => `<g stroke="${INK}" stroke-width="3" stroke-linejoin="round">
    <path d="M${cx - w / 2} ${y - 4} q-22 -2 -24 -22 q10 2 12 10" fill="none" stroke="#e3ad48" stroke-width="6" stroke-linecap="round"/>
    <path d="M${cx + w / 2} ${y - 4} q22 -2 24 -22 q-10 2 -12 10" fill="none" stroke="#e3ad48" stroke-width="6" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${y - 18}" r="10" fill="url(#gold)"/><path d="M${cx} ${y - 40} l7 12 h-14 z" fill="#ff8a2a"/></g>`;
  const flagTower = `<g transform="translate(260 0)">
    <path d="M-120 820 L-100 600 L100 600 L120 820 Z" fill="#6b4a3a" stroke="${INK}" stroke-width="4"/>
    <path d="M-100 650 H100 M-108 720 H108" stroke="#000" stroke-opacity=".2" stroke-width="4"/>
    <path d="M0 600 V250" stroke="${INK}" stroke-width="12"/><path d="M0 600 V250" stroke="#d9c8a0" stroke-width="6"/>
    <path d="M-70 262 H70" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M-70 262 H70" stroke="#e3ad48" stroke-width="5" stroke-linecap="round"/>
    <path d="M-56 268 H56 V500 L0 470 L-56 500 Z" fill="#c4241b" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M-44 280 H44 V478 L0 456 L-44 478 Z" fill="none" stroke="#f3c34a" stroke-width="3"/>
    <circle cx="0" cy="340" r="26" fill="url(#gold)" stroke="${INK}" stroke-width="3"/>
    ${[-50, -25, 0, 25, 50].map((a) => `<path transform="rotate(${a} 0 352)" d="M0 352 C-6 344 -4 332 0 326 C4 332 6 344 0 352 Z" fill="#c4241b" stroke="${INK}" stroke-width="1.6"/>`).join('')}
    <path d="M-30 400 H30 M-30 420 H30" stroke="#f3c34a" stroke-width="3" opacity=".8"/>
    ${lantern(-70, 300, 16, '#ffcf6a', { string: 24 })}${lantern(70, 300, 16, '#ffcf6a', { string: 24 })}
  </g>`;
  const lotusLeaves = (() => {
    const r = rng(5);
    let s = '';
    for (let i = 0; i < 16; i++) {
      const x = r() * W, y = 900 + r() * 170, rr = 26 + r() * 30;
      s += `<path d="M${r1(x)} ${r1(y)} m${r1(-rr)} 0 a${r1(rr)} ${r1(rr * 0.35)} 0 1 0 ${r1(rr * 2)} 0 a${r1(rr)} ${r1(rr * 0.35)} 0 1 0 ${r1(-rr * 2)} 0 Z" fill="#1f5a44" stroke="${INK}" stroke-width="3"/>
        <path d="M${r1(x)} ${r1(y)} l${r1(rr * 0.9)} ${r1(-rr * 0.12)}" stroke="#0e3326" stroke-width="3"/>`;
    }
    return s;
  })();
  const hoa = [[150, 960, 1.15, '#ff8fa8'], [470, 1010, 1.4, '#ffd1dc'], [760, 930, 0.9, '#ff8fa8'], [980, 1035, 1.25, '#ffd1dc'], [1200, 950, 1, '#ff8fa8'], [1480, 1000, 1.35, '#ff9fb4'], [1760, 945, 1.05, '#ffd1dc'], [1880, 1050, 1.3, '#ff8fa8'], [640, 1060, 1.1, '#ff9fb4']]
    .map(([x, y, s, c]) => hoaDang(x, y, s, c)).join('');
  return svg(W, H, `<defs>${gold()}${lanternDefs}${vigDef}
    ${skyGrad('sky', [[0, '#0b0f2e'], [0.5, '#1d2458'], [0.8, '#57306a'], [1, '#a2475a']])}
    ${skyGrad('water', [[0, '#1a1f45'], [1, '#090b1c']])}
    ${glowGrad('moonGlow', '#fff1c4', 0.35)}
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a3c"/><stop offset="1" stop-color="#5a3626"/></linearGradient>
    <linearGradient id="archGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffcf6a"/><stop offset="1" stop-color="#ff6a2a"/></linearGradient>
    <linearGradient id="windowGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#f08a2a"/></linearGradient>
    <linearGradient id="roofY" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3c34a"/><stop offset="1" stop-color="#b8861c"/></linearGradient>
    <linearGradient id="roofG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fae7a"/><stop offset="1" stop-color="#256b4a"/></linearGradient>
    ${glowGrad('gateHalo', '#ff9a3a', 0.45)}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars(3, 160, 560)}
  ${moon(560, 190, 62)}
  <!-- distant city & trees -->
  <path d="M0 700 Q120 640 240 680 Q360 620 520 670 Q700 610 880 680 Q1060 630 1240 680 Q1500 620 1700 670 Q1820 640 1920 660 V760 H0 Z" fill="#1a1838" stroke="${INK}" stroke-width="3"/>
  ${tree(80, 700, 1.1, '#173a30')}${tree(680, 720, 0.9, '#173a30')}${tree(1880, 690, 1, '#173a30')}
  <!-- Ngọ Môn -->
  <circle cx="${gx}" cy="560" r="560" fill="url(#gateHalo)"/>
  <path d="M${gx - baseW / 2 - 40} ${baseY + baseH} L${gx - baseW / 2} ${baseY} H${gx + baseW / 2} L${gx + baseW / 2 + 40} ${baseY + baseH} Z" fill="url(#wall)" stroke="${INK}" stroke-width="5"/>
  ${Array.from({ length: 6 }, (_, i) => `<path d="M${gx - baseW / 2 - 6 * i} ${baseY + 30 * (i + 1)} H${gx + baseW / 2 + 6 * i}" stroke="#000" stroke-opacity=".15" stroke-width="3"/>`).join('')}
  <rect x="${gx - baseW / 2 - 10}" y="${baseY - 18}" width="${baseW + 20}" height="22" fill="#6b3a24" stroke="${INK}" stroke-width="4"/>
  ${arch(gx, 110, 150)}${arch(gx - 200, 80, 120)}${arch(gx + 200, 80, 120)}${arch(gx - 350, 64, 96)}${arch(gx + 350, 64, 96)}
  <!-- Lầu Ngũ Phụng: wings + centre two-tier -->
  ${pav(gx - 300, 220, 500, 100)}${roof(gx - 300, 448, 180, 290, 60, 'url(#roofG)', { lip: 20 })}
  ${pav(gx + 300, 220, 500, 100)}${roof(gx + 300, 448, 180, 290, 60, 'url(#roofG)', { lip: 20 })}
  ${pav(gx, 300, 470, 130)}${roof(gx, 410, 250, 400, 70, 'url(#roofY)', { lip: 24 })}
  ${pav(gx, 200, 330, 80)}${roof(gx, 268, 160, 290, 70, 'url(#roofY)', { lip: 24 })}
  ${ridgeDeco(gx, 268, 160)}
  ${lanternString(gx - 160, 492, gx + 160, 492, 8, 6, ['#ff3b2a', '#ffcf6a'], 13, 2)}
  ${flagTower}
  <!-- moat -->
  <rect y="800" width="${W}" height="${H - 800}" fill="url(#water)"/>
  <path d="M0 800 H${W}" stroke="#4a3a6a" stroke-width="5"/>
  <g opacity=".35" transform="translate(0 1600) scale(1 -1)">
    <path d="M${gx - baseW / 2 - 40} ${baseY + baseH} L${gx - baseW / 2} ${baseY} H${gx + baseW / 2} L${gx + baseW / 2 + 40} ${baseY + baseH} Z" fill="#3a2440"/>
    <circle cx="${gx}" cy="${baseY + 120}" r="60" fill="url(#lg-ffcf6a)"/>
  </g>
  <ellipse cx="560" cy="860" rx="40" ry="180" fill="#fff1c4" opacity=".08"/>
  ${shimmer(9, 812, 1070, 90, '#ffcf8a', 0.4)}
  ${lotusLeaves}${hoa}
  ${lanternString(-20, 60, 760, 110, 60, 9, ['#ff3b2a', '#ffcf6a', '#ff8a2a', '#e8241b'], 24, 4)}
  ${fireflies(13, 26, [0, 420, W, 880])}
  ${vignette}`);
}

/* ================================================================== Hội An: dusk old town */
function sceneHoiAn() {
  const house = (x, w, h, wall, roofC = '#8a3a22', up = 0) => {
    const yb = 760, yt = yb - h - up;
    const r = roof(x + w / 2, yt - 50, w * 0.8, w + 40, 56, roofC, { lip: 12, ridge: '#5a2414', tiles: true });
    return `<rect x="${x}" y="${yt}" width="${w}" height="${yb - yt}" fill="${wall}" stroke="${INK}" stroke-width="4"/>
      <rect x="${x + w * 0.18}" y="${yt + 30}" width="${w * 0.64}" height="${(yb - yt) * 0.32}" fill="#5a2e1a" stroke="${INK}" stroke-width="3"/>
      <rect x="${x + w * 0.22}" y="${yt + 36}" width="${w * 0.56}" height="${(yb - yt) * 0.32 - 12}" fill="url(#shopGlow)"/>
      ${Array.from({ length: 4 }, (_, i) => `<path d="M${x + w * 0.22 + (w * 0.56 * (i + 1)) / 5} ${yt + 36} V${yt + 24 + (yb - yt) * 0.32}" stroke="#5a2e1a" stroke-width="4"/>`).join('')}
      <rect x="${x + w * 0.3}" y="${yb - 90}" width="${w * 0.4}" height="90" fill="#3a1d10" stroke="${INK}" stroke-width="3"/>
      <rect x="${x + w * 0.34}" y="${yb - 84}" width="${w * 0.32}" height="84" fill="url(#shopGlow)" opacity=".85"/>
      ${r}`;
  };
  const colors = ['#ff3b2a', '#ffd94a', '#ff8a2a', '#c43bd6', '#3fd0a0', '#ff5a8a', '#ffb02e'];
  const bridgeX = 1320;
  const bridge = `
    <path d="M${bridgeX - 320} 830 Q${bridgeX} 700 ${bridgeX + 320} 830 L${bridgeX + 320} 860 Q${bridgeX} 740 ${bridgeX - 320} 860 Z" fill="#7a3a22" stroke="${INK}" stroke-width="5"/>
    <rect x="${bridgeX - 260}" y="690" width="520" height="70" fill="#9a4a2a" stroke="${INK}" stroke-width="4"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="${bridgeX - 250 + i * 61}" y="700" width="12" height="56" fill="#5a2414" stroke="${INK}" stroke-width="2"/>`).join('')}
    <rect x="${bridgeX - 240}" y="706" width="480" height="40" fill="url(#shopGlow)" opacity=".5"/>
    ${roof(bridgeX, 610, 420, 600, 84, '#a6452a', { lip: 26, ridge: '#5a2414' })}
    <path d="M${bridgeX - 200} 778 Q${bridgeX} 740 ${bridgeX + 200} 778" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="4"/>
    <!-- small pagoda roof on top -->
    <rect x="${bridgeX - 60}" y="560" width="120" height="50" fill="#9a4a2a" stroke="${INK}" stroke-width="4"/>
    ${roof(bridgeX, 520, 100, 190, 46, '#a6452a', { lip: 16, ridge: '#5a2414' })}
    <circle cx="${bridgeX}" cy="586" r="14" fill="url(#gold)" stroke="${INK}" stroke-width="3"/>`;
  const boat = (x, y, s, lamp) => `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-120 0 Q-130 -20 -150 -26 L150 -26 Q130 -20 120 0 Q0 26 -120 0 Z" fill="#5a2e1a" stroke="${INK}" stroke-width="4"/>
    <path d="M-110 -18 H110" stroke="#c4241b" stroke-width="6"/>
    <path d="M-60 -26 Q0 -96 60 -26 Z" fill="#7a5a3a" stroke="${INK}" stroke-width="4"/>
    <circle cx="-138" cy="-14" r="6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="-138" cy="-14" r="2.4" fill="${INK}"/>
    ${lantern(80, -60, 14, lamp, { string: 22 })}
  </g>`;
  return svg(W, H, `<defs>${gold()}${lanternDefs}${vigDef}
    ${skyGrad('sky', [[0, '#2a1850'], [0.45, '#8a3a6a'], [0.75, '#f08a4a'], [1, '#ffd27a']])}
    ${skyGrad('water', [[0, '#3a2a5a'], [0.4, '#2a1d40'], [1, '#100a1c']])}
    ${glowGrad('moonGlow', '#fff1c4', 0.25)}
    <linearGradient id="shopGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#ff9a3a"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars(21, 60, 300, 0.7)}
  ${moon(1650, 170, 46)}
  <path d="M0 640 Q200 600 380 630 Q560 590 760 630 Q980 590 1180 630 Q1420 590 1640 630 Q1800 600 1920 620 V780 H0 Z" fill="#4a2a5a" opacity=".7"/>
  ${tree(1820, 640, 1, '#2a3a3a')}${tree(980, 660, 0.8, '#2a3a3a')}
  ${house(-20, 230, 260, '#f2c14e')}${house(220, 200, 230, '#e8a93a', '#7a3020', 30)}${house(430, 240, 280, '#f6d36a')}${house(680, 210, 240, '#e9b44a', '#8a3a22', 10)}
  <rect x="0" y="756" width="960" height="40" fill="#6a4a3a" stroke="${INK}" stroke-width="4"/>
  ${lanternString(0, 520, 480, 540, 50, 7, colors, 20, 31)}${lanternString(480, 540, 940, 520, 50, 7, colors.slice(2), 20, 32)}
  <rect y="790" width="${W}" height="${H - 790}" fill="url(#water)"/>
  ${bridge}
  <g opacity=".3" transform="translate(0 1600) scale(1 -1)">${house(430, 240, 280, '#f6d36a')}${house(-20, 230, 260, '#f2c14e')}</g>
  ${shimmer(41, 800, 1070, 110, '#ffd27a', 0.45)}
  ${[[180, 930], [560, 1010], [900, 960], [1240, 1040], [1640, 980]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="38" fill="url(#lg-${colors[i].slice(1)})"/>` + hoaDang(x, y, 0.75, ['#ff8fa8', '#ffd94a', '#ff9fb4'][i % 3])).join('')}
  ${boat(420, 905, 1.1, '#ff3b2a')}${boat(1660, 1000, 0.9, '#ffd94a')}
  ${lanternString(1000, -20, 1940, 40, 70, 9, colors, 22, 33)}
  ${fireflies(43, 18, [0, 380, W, 760])}
  ${vignette}`);
}

/* ================================================================== Thăng Long: Hồ Gươm */
function sceneThangLong() {
  const tx = 600, ty = 660; // Tháp Rùa base
  const towerLevel = (y, w, h, arches) => `<rect x="${tx - w / 2}" y="${y}" width="${w}" height="${h}" fill="#d9c8a0" stroke="${INK}" stroke-width="4"/>
    <rect x="${tx - w / 2}" y="${y}" width="${w}" height="${h}" fill="url(#mossy)" opacity=".5"/>
    ${Array.from({ length: arches }, (_, i) => {
      const aw = (w - 30) / arches - 10, ax = tx - w / 2 + 20 + i * ((w - 30) / arches);
      return `<path d="M${ax} ${y + h - 8} V${y + 22 + aw / 2} A${aw / 2} ${aw / 2} 0 0 1 ${ax + aw} ${y + 22 + aw / 2} V${y + h - 8} Z" fill="url(#winG)" stroke="${INK}" stroke-width="3"/>`;
    }).join('')}
    <rect x="${tx - w / 2 - 12}" y="${y - 12}" width="${w + 24}" height="14" rx="3" fill="#b8a27a" stroke="${INK}" stroke-width="3"/>`;
  const willow = (x, y, s, flip = 1) => {
    let d = '';
    for (let i = 0; i < 14; i++) {
      const sx = x + flip * i * 18 * s, sy = y + Math.sin(i) * 10;
      d += `<path d="M${sx} ${sy} Q${sx + flip * 20 * s} ${sy + 120 * s} ${sx + flip * 4 * s} ${sy + (180 + (i % 4) * 30) * s}" fill="none" stroke="#2f6a3a" stroke-width="${6 * s}" stroke-linecap="round"/>`;
    }
    return `<path d="M${x - flip * 40} 1080 Q${x - flip * 20} ${y + 200} ${x} ${y}" stroke="${INK}" stroke-width="${26 * s}" fill="none"/>
      <path d="M${x - flip * 40} 1080 Q${x - flip * 20} ${y + 200} ${x} ${y}" stroke="#4a2e1c" stroke-width="${18 * s}" fill="none"/>
      <path d="M${x} ${y} Q${x + flip * 120 * s} ${y - 40 * s} ${x + flip * 260 * s} ${y + 10 * s}" stroke="#4a2e1c" stroke-width="${10 * s}" fill="none"/>
      <ellipse cx="${x + flip * 120 * s}" cy="${y - 10 * s}" rx="${200 * s}" ry="${60 * s}" fill="#2a5a32" stroke="${INK}" stroke-width="3"/>
      ${d}`;
  };
  const bx = 1500;
  const bridge = `
    <path d="M${bx - 420} 800 Q${bx} 640 ${bx + 420} 760" fill="none" stroke="${INK}" stroke-width="34"/>
    <path d="M${bx - 420} 800 Q${bx} 640 ${bx + 420} 760" fill="none" stroke="#d42a1e" stroke-width="24"/>
    <path d="M${bx - 420} 790 Q${bx} 630 ${bx + 420} 750" fill="none" stroke="#ff5a3a" stroke-width="5" opacity=".7"/>
    ${Array.from({ length: 15 }, (_, i) => {
      const t = i / 14, x = (1 - t) ** 2 * (bx - 420) + 2 * (1 - t) * t * bx + t * t * (bx + 420), y = (1 - t) ** 2 * 800 + 2 * (1 - t) * t * 640 + t * t * 760;
      return `<rect x="${r1(x - 5)}" y="${r1(y - 52)}" width="10" height="44" fill="#d42a1e" stroke="${INK}" stroke-width="2.5"/>`;
    }).join('')}
    <path d="M${bx - 420} 748 Q${bx} 588 ${bx + 420} 708" fill="none" stroke="${INK}" stroke-width="12"/>
    <path d="M${bx - 420} 748 Q${bx} 588 ${bx + 420} 708" fill="none" stroke="#e8402a" stroke-width="6"/>
    ${Array.from({ length: 6 }, (_, i) => {
      const t = (i + 0.5) / 6, x = (1 - t) ** 2 * (bx - 420) + 2 * (1 - t) * t * bx + t * t * (bx + 420), y = (1 - t) ** 2 * 800 + 2 * (1 - t) * t * 640 + t * t * 760;
      return `<path d="M${r1(x)} ${r1(y)} V1080" stroke="${INK}" stroke-width="14"/><path d="M${r1(x)} ${r1(y)} V1080" stroke="#8a1a12" stroke-width="8"/>`;
    }).join('')}
    <!-- Ngọc Sơn gate (Đắc Nguyệt lầu) -->
    <rect x="${bx + 360}" y="600" width="150" height="170" fill="#e8d2a0" stroke="${INK}" stroke-width="4"/>
    <path d="M${bx + 405} 770 V680 A30 30 0 0 1 ${bx + 465} 680 V770 Z" fill="url(#winG)" stroke="${INK}" stroke-width="3"/>
    ${roof(bx + 435, 540, 120, 220, 60, '#8a3a22', { lip: 18 })}
    ${lantern(bx + 380, 640, 14, '#ff3b2a', { string: 10 })}${lantern(bx + 490, 640, 14, '#ff3b2a', { string: 10 })}`;
  return svg(W, H, `<defs>${gold()}${lanternDefs}${vigDef}
    ${skyGrad('sky', [[0, '#081a2a'], [0.55, '#14405a'], [0.85, '#2f6a74'], [1, '#6aa08a']])}
    ${skyGrad('water', [[0, '#1a4a50'], [1, '#061418']])}
    ${glowGrad('moonGlow', '#fff1c4', 0.35)}
    <linearGradient id="winG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#ff9a3a"/></linearGradient>
    <linearGradient id="mossy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8aa070" stop-opacity="0"/><stop offset="1" stop-color="#4a6a3a"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${stars(51, 150, 520)}
  ${moon(1180, 200, 70)}
  <path d="M0 690 Q160 660 300 676 L330 600 H380 L400 676 Q700 650 1000 680 Q1200 640 1400 670 L1420 580 H1480 L1500 668 Q1700 650 1920 676 V760 H0 Z" fill="#0f2a38" stroke="${INK}" stroke-width="3"/>
  ${tree(1000, 690, 0.8, '#123a32')}${tree(80, 680, 1, '#123a32')}
  <rect y="760" width="${W}" height="${H - 760}" fill="url(#water)"/>
  <ellipse cx="1180" cy="900" rx="44" ry="200" fill="#fff1c4" opacity=".1"/>
  <!-- Tháp Rùa island -->
  <ellipse cx="${tx}" cy="${ty + 150}" rx="230" ry="34" fill="#1d3a28" stroke="${INK}" stroke-width="4"/>
  ${tree(tx - 170, ty + 90, 0.55, '#2a5a32')}
  ${towerLevel(ty - 10, 240, 160, 3)}${towerLevel(ty - 130, 190, 120, 2)}${towerLevel(ty - 230, 140, 100, 1)}
  <path d="M${tx - 50} ${ty - 242} Q${tx} ${ty - 300} ${tx + 50} ${ty - 242} Z" fill="#b8a27a" stroke="${INK}" stroke-width="4"/>
  <path d="M${tx} ${ty - 300} V${ty - 330}" stroke="${INK}" stroke-width="6"/><circle cx="${tx}" cy="${ty - 334}" r="8" fill="url(#gold)" stroke="${INK}" stroke-width="2"/>
  <g opacity=".28" transform="translate(0 ${2 * (ty + 150)}) scale(1 -1)">
    <rect x="${tx - 120}" y="${ty - 10}" width="240" height="160" fill="#d9c8a0"/><rect x="${tx - 95}" y="${ty - 130}" width="190" height="120" fill="#d9c8a0"/><rect x="${tx - 70}" y="${ty - 230}" width="140" height="100" fill="#d9c8a0"/>
  </g>
  ${bridge}
  ${shimmer(61, 770, 1070, 100, '#bfe8d0', 0.35)}
  ${willow(110, 160, 1.2, 1)}
  ${[[300, 960], [900, 1010], [1180, 980]].map(([x, y]) => hoaDang(x, y, 0.8, '#ffd1dc')).join('')}
  ${fireflies(71, 20, [0, 300, W, 760], '#d8ffd0')}
  ${vignette}`);
}

/* ================================================================== home UI */
const band = (S, outer, inner, rx = 8) =>
  `M${outer + rx} ${outer} H${S - outer - rx} Q${S - outer} ${outer} ${S - outer} ${outer + rx} V${S - outer - rx} Q${S - outer} ${S - outer} ${S - outer - rx} ${S - outer} H${outer + rx} Q${outer} ${S - outer} ${outer} ${S - outer - rx} V${outer + rx} Q${outer} ${outer} ${outer + rx} ${outer} Z ` +
  `M${inner} ${inner} V${S - inner} H${S - inner} V${inner} Z`;
const ring = (S, inset, extra) => `<rect x="${inset}" y="${inset}" width="${S - 2 * inset}" height="${S - 2 * inset}" ${extra}/>`;
const corners = (S, piece) =>
  ['', `transform="translate(${S} 0) scale(-1 1)"`, `transform="translate(0 ${S}) scale(1 -1)"`, `transform="translate(${S} ${S}) scale(-1 -1)"`].map((t) => `<g ${t}>${piece}</g>`).join('');

function frameHome() {
  const S = 256, B = 60;
  const lotusCorner = `
    <path d="M3 18 Q3 3 18 3 H70 Q62 14 50 16 Q34 18 30 30 Q26 46 14 52 L3 70 Z" fill="url(#gD)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <g transform="translate(30 30) rotate(-45)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round">
      <path d="M0 8 C-12 0 -10 -14 0 -20 C10 -14 12 0 0 8 Z" fill="#e8605a"/>
      <path d="M0 8 C-18 6 -20 -6 -14 -12 C-6 -6 -2 2 0 8 Z" fill="#c4241b"/>
      <path d="M0 8 C18 6 20 -6 14 -12 C6 -6 2 2 0 8 Z" fill="#c4241b"/>
      <circle cx="0" cy="-4" r="3" fill="#ffd94a" stroke-width="1"/>
    </g>`;
  return svg(S, S, `<defs>${gold()}${gold('gD', 1, 1).replace('#fff2bf', '#f8dc8a')}
    <linearGradient id="lac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a1a12"/><stop offset=".5" stop-color="#1e0d08"/><stop offset="1" stop-color="#120705"/></linearGradient>
  </defs>
  <path d="${band(S, 1, B, 14)}" fill="${INK}" fill-rule="evenodd"/>
  <path d="${band(S, 4, B - 3, 12)}" fill="url(#lac)" fill-rule="evenodd"/>
  ${ring(S, 10, 'fill="none" stroke="url(#gold)" stroke-width="3.4" rx="6"')}
  ${ring(S, 16, 'fill="none" stroke="#9a2318" stroke-width="2.4" rx="4"')}
  ${ring(S, 21, 'fill="none" stroke="url(#gold)" stroke-width="1.4" rx="3"')}
  ${ring(S, B - 10, 'fill="none" stroke="#e3ad48" stroke-width="2"')}
  ${ring(S, B - 2, `fill="none" stroke="${INK}" stroke-width="4"`)}
  ${corners(S, lotusCorner)}`);
}
function homeCrest() {
  const Wc = 280, Hc = 85, c = Wc / 2;
  const cloud = (k) => `<g ${k}><path d="M${c - 52} 70 Q${c - 90} 72 ${c - 110} 56 Q${c - 128} 40 ${c - 112} 30 Q${c - 96} 22 ${c - 92} 38 Q${c - 104} 40 ${c - 100} 48 Q${c - 88} 60 ${c - 52} 58 Z" fill="url(#g)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M${c - 112} 54 Q${c - 136} 62 ${c - 136} 76 Q${c - 124} 78 ${c - 120} 70" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round"/></g>`;
  const petal = (a, len, w, fill) => `<path transform="rotate(${a} ${c} 70)" d="M${c} 70 C${c - w} ${70 - len * 0.4} ${c - w * 0.6} ${70 - len * 0.85} ${c} ${70 - len} C${c + w * 0.6} ${70 - len * 0.85} ${c + w} ${70 - len * 0.4} ${c} 70 Z" fill="${fill}" stroke="${INK}" stroke-width="2.2"/>`;
  return svg(Wc, Hc, `<defs>${gold('g', 1, 1)}<radialGradient id="pet" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffd1a0"/><stop offset=".6" stop-color="#e8605a"/><stop offset="1" stop-color="#9a2318"/></radialGradient></defs>
  ${cloud('')}${cloud(`transform="translate(${Wc} 0) scale(-1 1)"`)}
  ${petal(-62, 44, 14, 'url(#g)')}${petal(62, 44, 14, 'url(#g)')}${petal(-36, 56, 16, 'url(#pet)')}${petal(36, 56, 16, 'url(#pet)')}${petal(0, 66, 18, 'url(#pet)')}
  <rect x="${c - 64}" y="65" width="128" height="10" rx="5" fill="url(#g)" stroke="${INK}" stroke-width="2.4"/>
  <circle cx="${c}" cy="24" r="6" fill="#2f8a64" stroke="${INK}" stroke-width="2"/><circle cx="${c - 1.6}" cy="22.4" r="1.8" fill="#fff" opacity=".7"/>`);
}
function mapCard(active) {
  const S = 128, B = 24;
  const accent = active ? '#3fd0a0' : '#8a6a3c';
  const piece = `<path d="M5 20 V10 Q5 5 10 5 H20" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
    <path d="M5 20 V10 Q5 5 10 5 H20" fill="none" stroke="${active ? 'url(#gold)' : '#a8875a'}" stroke-width="3" stroke-linecap="round"/>
    ${active ? `<path d="M12 12 l4 4 l-4 4 l-4 -4 Z" fill="#3fd0a0" stroke="${INK}" stroke-width="1.4"/>` : ''}`;
  return svg(S, S, `<defs>${gold()}</defs>
    ${active ? `<rect x="1" y="1" width="${S - 2}" height="${S - 2}" rx="10" fill="none" stroke="#3fd0a0" stroke-width="2" opacity=".55"/>` : ''}
    <rect x="3" y="3" width="${S - 6}" height="${S - 6}" rx="8" fill="${INK}"/>
    <rect x="5" y="5" width="${S - 10}" height="${S - 10}" rx="7" fill="${active ? '#14261e' : '#1f140c'}"/>
    ${ring(S, 9, `fill="none" stroke="${active ? 'url(#gold)' : '#6a4a2c'}" stroke-width="${active ? 2.4 : 2}" rx="4"`)}
    ${ring(S, 13, `fill="none" stroke="${accent}" stroke-width="1.2" rx="3" opacity=".7"`)}
    ${corners(S, piece)}`);
}
const ribbonSoon = () => svg(150, 150, `<defs>${gold()}<linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5a6a"/><stop offset="1" stop-color="#2a2a36"/></linearGradient></defs>
  <path d="M38 0 H78 L150 72 V112 Z" fill="#14141c"/>
  <path d="M30 0 H74 L150 76 V120 Z" fill="${INK}"/>
  <path d="M35 0 H72 L150 78 V115 Z" fill="url(#r)"/>
  <path d="M40 0 L150 110 M68 0 L150 82" stroke="url(#gold)" stroke-width="2.2"/>`);
const lockIcon = () => svg(48, 48, `<defs>${gold('g', 1, 1)}</defs>
  <circle cx="24" cy="24" r="23" fill="${INK}" opacity=".75"/>
  <path d="M16 22 V16 A8 8 0 0 1 32 16 V22" fill="none" stroke="${INK}" stroke-width="7"/>
  <path d="M16 22 V16 A8 8 0 0 1 32 16 V22" fill="none" stroke="#c9ccd4" stroke-width="3.5"/>
  <rect x="11" y="21" width="26" height="19" rx="4" fill="url(#g)" stroke="${INK}" stroke-width="2.4"/>
  <circle cx="24" cy="29" r="3" fill="${INK}"/><path d="M24 30 V35" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`);
function btnPrimary() {
  const Wb = 240, Hb = 56;
  return svg(Wb, Hb, `<defs>${gold()}
    <linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".5" stop-color="#e9b54a"/><stop offset="1" stop-color="#b8801e"/></linearGradient></defs>
  <path d="M18 3 H${Wb - 18} L${Wb - 3} 18 V${Hb - 18} L${Wb - 18} ${Hb - 3} H18 L3 ${Hb - 18} V18 Z" fill="${INK}"/>
  <path d="M19 6 H${Wb - 19} L${Wb - 6} 19 V${Hb - 19} L${Wb - 19} ${Hb - 6} H19 L6 ${Hb - 19} V19 Z" fill="#7a1a12"/>
  <path d="M21 9 H${Wb - 21} L${Wb - 9} 21 V${Hb - 21} L${Wb - 21} ${Hb - 11} H21 L9 ${Hb - 21} V21 Z" fill="url(#face)"/>
  <path d="M22 12 H${Wb - 22}" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
  <path d="M14 28 l5 -5 l5 5 l-5 5 Z M${Wb - 14} 28 l-5 -5 l-5 5 l5 5 Z" fill="#9a2318" stroke="${INK}" stroke-width="1.6"/>`);
}
const inputField = () => svg(128, 48, `<defs><linearGradient id="in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0805"/><stop offset="1" stop-color="#21140c"/></linearGradient>${gold()}</defs>
  <rect x="1" y="1" width="126" height="46" rx="8" fill="${INK}"/>
  <rect x="3" y="3" width="122" height="42" rx="7" fill="#6a4a2c"/>
  <rect x="5" y="5" width="118" height="38" rx="6" fill="url(#in)"/>
  <path d="M8 42 H120" stroke="#c58b26" stroke-width="1.4" opacity=".6"/>`);


/* ------------------------------------------------------------------ language switch (fixed size: 240x72 track, 116x60 knob) */
const langTrack = () => svg(120, 36, `<defs>${gold()}<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f0805"/><stop offset="1" stop-color="#2a1610"/></linearGradient></defs>
  <rect x="1" y="1" width="118" height="34" rx="17" fill="${INK}"/>
  <rect x="2.5" y="2.5" width="115" height="31" rx="15.5" fill="url(#gold)"/>
  <rect x="5" y="5" width="110" height="26" rx="13" fill="url(#t)" stroke="${INK}" stroke-width="1.4"/>
  <path d="M60 9 V27" stroke="#6a4a2c" stroke-width="1.4" stroke-dasharray="2 3"/>
  <circle cx="5" cy="18" r="2" fill="#9a2318" stroke="${INK}" stroke-width="1"/><circle cx="115" cy="18" r="2" fill="#9a2318" stroke="${INK}" stroke-width="1"/>`);
const langKnob = () => svg(58, 30, `<defs>${gold('g', 0, 1)}<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4452f"/><stop offset=".55" stop-color="#9a2318"/><stop offset="1" stop-color="#5e130c"/></linearGradient></defs>
  <rect x="1" y="1" width="56" height="28" rx="14" fill="${INK}"/>
  <rect x="2.5" y="2.5" width="53" height="25" rx="12.5" fill="url(#g)"/>
  <rect x="4.5" y="4.5" width="49" height="21" rx="10.5" fill="url(#f)"/>
  <path d="M10 8 H48" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/>`);
const globe = () => svg(32, 32, `<defs>${gold('g', 1, 1)}<radialGradient id="o" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#5fd0a6"/><stop offset="1" stop-color="#0c3d31"/></radialGradient></defs>
  <circle cx="16" cy="16" r="15" fill="${INK}"/><circle cx="16" cy="16" r="13.5" fill="url(#g)"/><circle cx="16" cy="16" r="11" fill="url(#o)" stroke="${INK}" stroke-width="1.2"/>
  <g fill="none" stroke="#e8f6d8" stroke-width="1.3" opacity=".9"><ellipse cx="16" cy="16" rx="4.5" ry="11"/><path d="M5 16 H27 M7 10.5 H25 M7 21.5 H25 M16 5 V27"/></g>`);

/* ================================================================== render */
async function emit(rel, code, w, h, { quality = 92, srcDir } = {}) {
  const src = path.join(ROOT, srcDir ?? path.join('assets/_src', path.dirname(rel)), `${path.basename(rel)}.svg`);
  fs.mkdirSync(path.dirname(src), { recursive: true });
  fs.writeFileSync(src, code);
  const vw = Number(code.match(/width="(\d+)"/)[1]);
  const png = await sharp(Buffer.from(code), { density: 72 * (w / vw) }).resize(w, h, { fit: 'cover' }).png().toBuffer();
  const out = path.join(ROOT, 'assets', `${rel}.png`), pub = path.join(ROOT, 'apps/web/public/assets', `${rel}.webp`);
  for (const f of [out, pub]) fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(out, png);
  await sharp(png).webp({ quality, alphaQuality: 100 }).toFile(pub);
  console.log('[home-art]', rel, `${w}x${h}`);
}

const SCENES = { 'co-do-hue': sceneHue, 'hoi-an': sceneHoiAn, 'thang-long': sceneThangLong };
for (const [slug, fn] of Object.entries(SCENES)) {
  const code = fn();
  await emit(`maps/${slug}/meta/home-bg`, code, 1920, 1080, { quality: 86 });
  await emit(`maps/${slug}/meta/thumb`, code, 640, 360, { quality: 88 });
}
const UI = [
  ['frame-home', frameHome(), 512, 512],
  ['home-crest', homeCrest(), 560, 170],
  ['map-card', mapCard(false), 256, 256],
  ['map-card-active', mapCard(true), 256, 256],
  ['ribbon-soon', ribbonSoon(), 300, 300],
  ['lock', lockIcon(), 96, 96],
  ['btn-primary', btnPrimary(), 480, 112],
  ['input', inputField(), 256, 96],
  ['lang-track', langTrack(), 240, 72],
  ['lang-knob', langKnob(), 116, 60],
  ['globe', globe(), 64, 64],
];
for (const [name, code, w, h] of UI) await emit(`maps/common/ui/home/${name}`, code, w, h);
