#!/usr/bin/env node
/**
 * Procedural (vector) UI art for the HUD — no AI / API key needed.
 *   node tools/ui-art/draw-ui.mjs [repoRoot]
 * Writes:
 *   assets/_src/maps/common/ui/<name>.svg           (editable vector source)
 *   assets/maps/common/ui/<name>.png                (packed PNG)
 *   apps/web/public/assets/maps/common/ui/<name>.webp (runtime)
 *
 * Assets:
 *   btn-kill / btn-report / btn-task / btn-bell  round lacquer action buttons (256px)
 *   frame-task-panel       9-slice, 384px, slice 72  (dark wood + gold, jade gem corners)
 *   frame-modal            9-slice, 512px, slice 96  (red-brown lacquer + gold scroll corners)
 *   frame-chat             9-slice, 384px, slice 60, edges repeat "round" (bamboo + brass lotus studs)
 *   frame-area-door        1280x400 Huế location plate: yellow-glazed eave + red lacquer cuốn thư plaque (text is HTML)
 * If you change sizes/slices here, update the matching numbers in apps/web/src/styles.css.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const SRC0 = path.join(ROOT, 'assets/_src/maps/common/ui');
const OUT0 = path.join(ROOT, 'assets/maps/common/ui');
const PUB0 = path.join(ROOT, 'apps/web/public/assets/maps/common/ui');

const INK = '#22100a';
const GOLD_STOPS = `<stop offset="0" stop-color="#fff2bf"/><stop offset=".32" stop-color="#f3c75a"/><stop offset=".68" stop-color="#c58b26"/><stop offset="1" stop-color="#7d4f12"/>`;
const goldDefs = (id = 'gold', x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${GOLD_STOPS}</linearGradient>`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;

/* ------------------------------------------------------------------ round buttons */
function roundButton({ disc, icon }) {
  const studs = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const x = 128 + Math.cos(a) * 110, y = 128 + Math.sin(a) * 110;
    return `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" rx="1.5" transform="rotate(${(a * 180) / Math.PI + 45} ${x} ${y})" fill="#6a3d0c" stroke="#ffe7a0" stroke-width="1.2"/>`;
  }).join('');
  const dots = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    return `<circle cx="${128 + Math.cos(a) * 81}" cy="${128 + Math.sin(a) * 81}" r="1.8" fill="#fff" opacity=".22"/>`;
  }).join('');
  return svg(256, 256, `
  <defs>
    ${goldDefs('gold', 1, 1)}
    <radialGradient id="disc" cx=".42" cy=".34" r=".72">
      <stop offset="0" stop-color="${disc[0]}"/><stop offset=".55" stop-color="${disc[1]}"/><stop offset="1" stop-color="${disc[2]}"/>
    </radialGradient>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e9eef2"/><stop offset=".51" stop-color="#b9c4cc"/><stop offset="1" stop-color="#d7dee4"/>
    </linearGradient>
    <linearGradient id="horn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1dcb8"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="126" fill="${INK}"/>
  <circle cx="128" cy="128" r="122" fill="url(#gold)"/>
  <circle cx="128" cy="128" r="119" fill="none" stroke="#fff6cf" stroke-width="2" opacity=".55"/>
  ${studs}
  <circle cx="128" cy="128" r="101" fill="${INK}"/>
  <circle cx="128" cy="128" r="97" fill="url(#disc)"/>
  <circle cx="128" cy="128" r="89" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".9"/>
  ${dots}
  <ellipse cx="128" cy="80" rx="66" ry="38" fill="url(#gloss)"/>
  ${icon}`);
}

const DAGGER = `
  <g transform="rotate(40 128 128) translate(0 6)" stroke="${INK}" stroke-width="5" stroke-linejoin="round" paint-order="stroke">
    <path d="M128 40 C138 66 145 100 143 140 L113 140 C111 100 118 66 128 40 Z" fill="url(#steel)"/>
    <path d="M128 52 L128 134" stroke="#8d9aa4" stroke-width="2.5" fill="none"/>
    <path d="M88 146 Q92 133 107 139 L149 139 Q164 133 168 146 Q164 159 149 153 L107 153 Q92 159 88 146 Z" fill="url(#gold)"/>
    <rect x="119" y="153" width="18" height="36" rx="5" fill="#5a1710"/>
    <path d="M119 162 H137 M119 171 H137 M119 180 H137" stroke="#e8b54a" stroke-width="2.5"/>
    <circle cx="128" cy="196" r="11" fill="url(#gold)"/>
  </g>`;

/** unrolled paper scroll with a red brush tick — "do the task here" */
const SCROLL_TICK = `
  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">
    <path d="M78 74 L178 74 L178 182 L78 182 Z" fill="url(#horn)"/>
    <path d="M94 98 H160 M94 116 H150 M94 134 H140" stroke="#b89a70" stroke-width="5" fill="none"/>
    <rect x="64" y="62" width="128" height="16" rx="8" fill="#8a4b16"/>
    <rect x="64" y="178" width="128" height="16" rx="8" fill="#8a4b16"/>
    <circle cx="62" cy="70" r="7" fill="#f3c75a"/><circle cx="194" cy="70" r="7" fill="#f3c75a"/>
    <circle cx="62" cy="186" r="7" fill="#f3c75a"/><circle cx="194" cy="186" r="7" fill="#f3c75a"/>
  </g>
  <path d="M104 142 L128 166 L184 102" fill="none" stroke="${INK}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M104 142 L128 166 L184 102" fill="none" stroke="#d8261c" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M110 144 L128 160" fill="none" stroke="#ff8a70" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;

const MEGAPHONE = `
  <g transform="translate(-12 4)" stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">
    <path d="M104 146 L98 182 Q98 188 104 188 L116 188 Q121 188 121 182 L124 146 Z" fill="#7a2a10"/>
    <path d="M80 108 L118 108 L170 76 Q178 128 170 180 L118 148 L80 148 Q72 148 72 140 L72 116 Q72 108 80 108 Z" fill="url(#horn)"/>
    <path d="M118 108 L118 148" stroke="#c4382b" stroke-width="7" fill="none"/>
    <ellipse cx="171" cy="128" rx="11" ry="52" fill="#f6e3c4"/>
    <rect x="62" y="112" width="16" height="32" rx="5" fill="#c4382b"/>
    <path d="M196 102 Q208 128 196 154" fill="none" stroke="#fff4d8" stroke-width="8"/>
    <path d="M211 88 Q230 128 211 168" fill="none" stroke="#fff4d8" stroke-width="8"/>
  </g>
  <g stroke="${INK}" stroke-width="3" paint-order="stroke">
    <circle cx="182" cy="74" r="17" fill="#d8261c"/>
    <path d="M182 63 L182 77" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
    <circle cx="182" cy="84" r="2.6" fill="#fff" stroke="none"/>
  </g>`;

/** bronze temple bell swinging on its lacquered beam, with ring-out arcs — "call a meeting" */
const BELL = `
  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">
    <rect x="70" y="52" width="116" height="14" rx="6" fill="#8a4b16"/>
    <path d="M128 66 L128 78" stroke="${INK}" stroke-width="9" fill="none"/>
    <g transform="rotate(-10 128 70)">
      <path d="M112 78 Q128 66 144 78 L144 86 L112 86 Z" fill="url(#gold)"/>
      <path d="M100 92 Q100 84 112 84 L144 84 Q156 84 156 92 L162 158 Q168 166 176 170 L176 180 L80 180 L80 170 Q88 166 94 158 Z" fill="url(#gold)"/>
      <path d="M98 112 H158 M96 136 H160" stroke="#7d4f12" stroke-width="4" fill="none"/>
      <path d="M110 92 L108 154" stroke="#fff2bf" stroke-width="5" fill="none" opacity=".75"/>
      <circle cx="128" cy="124" r="9" fill="#c4241b"/>
      <circle cx="128" cy="192" r="11" fill="#7d4f12"/>
    </g>
  </g>
  <g fill="none" stroke="#fff4d8" stroke-width="7" stroke-linecap="round">
    <path d="M64 108 Q54 128 64 148"/><path d="M48 98 Q34 128 48 158"/>
    <path d="M192 108 Q202 128 192 148"/><path d="M208 98 Q222 128 208 158"/>
  </g>`;

/* ------------------------------------------------------------------ 9-slice frames */
function lozenge(cx, cy, r, gem) {
  return `<g stroke="${INK}" stroke-width="2.5" stroke-linejoin="round">
    <path d="M${cx} ${cy - r} L${cx + r} ${cy} L${cx} ${cy + r} L${cx - r} ${cy} Z" fill="url(#gold)"/>
    <path d="M${cx} ${cy - r * 0.5} L${cx + r * 0.5} ${cy} L${cx} ${cy + r * 0.5} L${cx - r * 0.5} ${cy} Z" fill="${gem}" stroke-width="1.6"/>
    <circle cx="${cx - r * 0.12}" cy="${cy - r * 0.16}" r="${r * 0.12}" fill="#fff" stroke="none" opacity=".7"/>
  </g>`;
}
/** corner piece drawn for top-left, mirrored to the others */
const corners = (S, piece) =>
  [
    '',
    `transform="translate(${S} 0) scale(-1 1)"`,
    `transform="translate(0 ${S}) scale(1 -1)"`,
    `transform="translate(${S} ${S}) scale(-1 -1)"`,
  ]
    .map((t) => `<g ${t}>${piece}</g>`)
    .join('');
const ring = (S, inset, extra) => `<rect x="${inset}" y="${inset}" width="${S - 2 * inset}" height="${S - 2 * inset}" ${extra}/>`;
const band = (S, outer, inner, rx = 8) =>
  `M${outer + rx} ${outer} H${S - outer - rx} Q${S - outer} ${outer} ${S - outer} ${outer + rx} V${S - outer - rx} Q${S - outer} ${S - outer} ${S - outer - rx} ${S - outer} H${outer + rx} Q${outer} ${S - outer} ${outer} ${S - outer - rx} V${outer + rx} Q${outer} ${outer} ${outer + rx} ${outer} Z ` +
  `M${inner} ${inner} V${S - inner} H${S - inner} V${inner} Z`;

function frameTaskPanel() {
  const S = 192, B = 36;
  return svg(S, S, `
  <defs>${goldDefs()}</defs>
  <path d="${band(S, 1, B)}" fill="${INK}" fill-rule="evenodd"/>
  <path d="${band(S, 3.5, B - 2.5, 6)}" fill="#3d2414" fill-rule="evenodd"/>
  ${ring(S, 5, 'fill="none" stroke="#6a4326" stroke-width="2" rx="5"')}
  ${ring(S, 10, 'fill="none" stroke="url(#gold)" stroke-width="2.6" rx="3"')}
  ${ring(S, B - 8, 'fill="none" stroke="#d9a441" stroke-width="1.6" opacity=".85"')}
  ${ring(S, B - 1.5, `fill="none" stroke="${INK}" stroke-width="3"`)}
  ${corners(S, `
    <path d="M10 24 Q10 10 24 10" fill="none" stroke="url(#gold)" stroke-width="3"/>
    ${lozenge(18, 18, 14, '#2f8a64')}
`)}
  `);
}

function frameModal() {
  const S = 256, B = 48;
  const scroll = `
    <path d="M3 3 H46 Q43 13 33 15 Q20 17 17 30 Q15 42 3 46 Z" fill="url(#gold)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M12 12 m8 4 a4.5 4.5 0 1 1 -4 -6 q9 1 9 10 q0 9 -10 10" fill="none" stroke="#7d4f12" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M30 8 q8 2 10 -2 M8 30 q2 8 -2 10" fill="none" stroke="#7d4f12" stroke-width="2" stroke-linecap="round"/>
    <circle cx="25" cy="25" r="4.5" fill="#b8281f" stroke="${INK}" stroke-width="1.5"/>
    <circle cx="23.8" cy="23.6" r="1.4" fill="#fff" opacity=".7"/>`;
  return svg(S, S, `
  <defs>${goldDefs()}
    <linearGradient id="lac" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6e2016"/><stop offset="1" stop-color="#3e100b"/></linearGradient>
  </defs>
  <path d="${band(S, 1, B, 10)}" fill="${INK}" fill-rule="evenodd"/>
  <path d="${band(S, 4, B - 3, 8)}" fill="url(#lac)" fill-rule="evenodd"/>
  ${ring(S, 7, 'fill="none" stroke="#a5452f" stroke-width="1.5" rx="6" opacity=".8"')}
  ${ring(S, 13, 'fill="none" stroke="url(#gold)" stroke-width="3" rx="3"')}
  ${ring(S, 19, 'fill="none" stroke="url(#gold)" stroke-width="1.5"')}
  ${ring(S, B - 9, 'fill="none" stroke="#e3ad48" stroke-width="2"')}
  ${ring(S, B - 2, `fill="none" stroke="${INK}" stroke-width="4"`)}
  ${corners(S, scroll)}
  `);
}

function frameChat() {
  const S = 192, B = 30, mid = S / 2;
  // bamboo tube: each edge drawn separately so the shading runs across the tube
  const tube = (x, y, w, h, vertical) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${vertical ? 'bamV' : 'bamH'})"/>`;
  const t = 4, tw = B - 8; // tube from 4..26
  const node = (x, y, vertical) =>
    vertical
      ? `<g><rect x="${x}" y="${y - 3}" width="${tw}" height="6" fill="#8a6a2c"/><path d="M${x} ${y - 3} h${tw} M${x} ${y + 3} h${tw}" stroke="#3b2a10" stroke-width="1.6"/><path d="M${x + 3} ${y} h${tw - 6}" stroke="#f3e2a6" stroke-width="1.2" opacity=".7"/></g>`
      : `<g><rect x="${x - 3}" y="${y}" width="6" height="${tw}" fill="#8a6a2c"/><path d="M${x - 3} ${y} v${tw} M${x + 3} ${y} v${tw}" stroke="#3b2a10" stroke-width="1.6"/><path d="M${x} ${y + 3} v${tw - 6}" stroke="#f3e2a6" stroke-width="1.2" opacity=".7"/></g>`;
  const stud = `
    <g stroke="${INK}" stroke-width="1.8" stroke-linejoin="round">
      <circle cx="15" cy="15" r="13" fill="#3b2a10"/>
      ${[0, 72, 144, 216, 288].map((a) => `<path d="M15 15 Q10 6 15 2 Q20 6 15 15 Z" fill="url(#brass)" transform="rotate(${a} 15 15)"/>`).join('')}
      <circle cx="15" cy="15" r="4.5" fill="#3f8f6e"/>
      <circle cx="13.8" cy="13.8" r="1.3" fill="#fff" stroke="none" opacity=".8"/>
    </g>`;
  return svg(S, S, `
  <defs>${goldDefs('brass', 1, 1)}
    <linearGradient id="bamH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3e18"/><stop offset=".3" stop-color="#c9a457"/><stop offset=".55" stop-color="#a98232"/><stop offset="1" stop-color="#4a3212"/></linearGradient>
    <linearGradient id="bamV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3e18"/><stop offset=".3" stop-color="#c9a457"/><stop offset=".55" stop-color="#a98232"/><stop offset="1" stop-color="#4a3212"/></linearGradient>
  </defs>
  <path d="${band(S, 1, B, 8)}" fill="${INK}" fill-rule="evenodd"/>
  ${tube(t, t, S - 2 * t, tw, false)}${tube(t, S - t - tw, S - 2 * t, tw, false)}
  ${tube(t, t, tw, S - 2 * t, true)}${tube(S - t - tw, t, tw, S - 2 * t, true)}
  ${node(mid, t, false)}${node(mid, S - t - tw, false)}${node(t, mid, true)}${node(S - t - tw, mid, true)}
  ${ring(S, B - 3.5, 'fill="none" stroke="#3f8f6e" stroke-width="3"')}
  ${ring(S, B - 1, `fill="none" stroke="${INK}" stroke-width="2"`)}
  ${corners(S, stud)}
  `);
}

/* ------------------------------------------------------------------ Huế location plate: yellow-glazed eave + cuốn thư plaque */
// plaque text rect (CSS aligns text to it): 640x200 art
export const DOOR = { w: 640, h: 200, plaque: { x: 140, y: 96, w: 360, h: 74 } };
function frameAreaDoor() {
  const { w: W, h: H, plaque: P } = DOOR;
  const c = W / 2;
  // tile ribs on the yellow glazed roof (hoàng lưu ly)
  const ribs = Array.from({ length: 31 }, (_, i) => {
    const x = 100 + i * 14.6;
    return `<path d="M${(x + (x - c) * -0.12).toFixed(1)} 30 L${(x + (x - c) * 0.16).toFixed(1)} 58" stroke="#a8741a" stroke-width="3" stroke-linecap="round" opacity=".55"/>`;
  }).join('');
  const tileEnds = Array.from({ length: 27 }, (_, i) => {
    const x = 128 + i * 14.6;
    return `<circle cx="${x.toFixed(1)}" cy="60" r="3.6" fill="#3f8f6e" stroke="${INK}" stroke-width="1.2"/>`;
  }).join('');
  // hồi văn (Greek-key) motif used on Huế lacquer boards
  const hoiVan = (x, y, s, flip = 1) =>
    `<path d="M${x} ${y} h${8 * s * flip} v${6 * s} h${-5 * s * flip} v${-3 * s} h${2 * s * flip}" fill="none" stroke="url(#gold)" stroke-width="${1.8 * s}" stroke-linecap="square"/>`;
  const roll = (x) => `<g stroke="${INK}" stroke-width="2.4">
      <rect x="${x - 9}" y="${P.y - 8}" width="18" height="${P.h + 16}" rx="8" fill="url(#rollG)"/>
      <ellipse cx="${x}" cy="${P.y - 8}" rx="9" ry="4" fill="url(#gold)"/><ellipse cx="${x}" cy="${P.y + P.h + 8}" rx="9" ry="4" fill="url(#gold)"/>
      <path d="M${x - 4} ${P.y + 2} V${P.y + P.h - 2}" stroke="#fff3c8" stroke-width="1.4" opacity=".55"/>
    </g>`;
  const cord = (x) => `<path d="M${x} 68 L${x} ${P.y - 4}" stroke="${INK}" stroke-width="4"/><path d="M${x} 68 L${x} ${P.y - 4}" stroke="#d9a441" stroke-width="2"/>
    <circle cx="${x}" cy="${P.y - 4}" r="3.4" fill="url(#gold)" stroke="${INK}" stroke-width="1.4"/>`;
  return svg(W, H, `
  <defs>${goldDefs()}
    <linearGradient id="glaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".45" stop-color="#f2bf3e"/><stop offset="1" stop-color="#b8801e"/></linearGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a2a1a"/><stop offset="1" stop-color="#4a120c"/></linearGradient>
    <linearGradient id="lacq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a2a1c"/><stop offset=".55" stop-color="#6e170f"/><stop offset="1" stop-color="#3e0b07"/></linearGradient>
    <linearGradient id="rollG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d4f12"/><stop offset=".4" stop-color="#e8b54a"/><stop offset="1" stop-color="#6a3d0c"/></linearGradient>
    <radialGradient id="sun" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffd257"/><stop offset="1" stop-color="#d0601a"/></radialGradient>
    <clipPath id="roofClip"><path d="M70 60 Q60 50 44 44 Q70 42 96 30 H544 Q570 42 596 44 Q580 50 570 60 Z"/></clipPath>
  </defs>
  <!-- roof: short yellow-glazed eave with upturned dragon-tail tips -->
  <path d="M70 60 Q60 50 44 44 Q70 42 96 30 H544 Q570 42 596 44 Q580 50 570 60 Z" fill="url(#glaze)" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
  <g clip-path="url(#roofClip)">${ribs}</g>
  <path d="M44 44 Q34 40 30 30 Q28 22 36 22 Q40 24 38 30" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M44 44 Q34 40 30 30 Q28 22 36 22 Q40 24 38 30" fill="none" stroke="url(#gold)" stroke-width="4" stroke-linecap="round"/>
  <path d="M596 44 Q606 40 610 30 Q612 22 604 22 Q600 24 602 30" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M596 44 Q606 40 610 30 Q612 22 604 22 Q600 24 602 30" fill="none" stroke="url(#gold)" stroke-width="4" stroke-linecap="round"/>
  <!-- ridge with "lưỡng long chầu nhật" simplified: two cloud scrolls facing a flaming sun -->
  <rect x="104" y="22" width="432" height="10" rx="3" fill="#3f8f6e" stroke="${INK}" stroke-width="2.6"/>
  <path d="M110 26.5 H530" stroke="#bfe8c8" stroke-width="1.2" opacity=".6"/>
  <g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M${c} 0 L${c + 6} 7 L${c + 14} 5 L${c + 12} 13 L${c + 19} 17 L${c + 11} 22 H${c - 11} L${c - 19} 17 L${c - 12} 13 L${c - 14} 5 L${c - 6} 7 Z" fill="#f08a2a"/>
    <circle cx="${c}" cy="14" r="7.5" fill="url(#sun)"/>
  </g>
  <path d="M${c - 22} 21 Q${c - 40} 21 ${c - 44} 13 Q${c - 46} 6 ${c - 39} 7 Q${c - 35} 9 ${c - 38} 13" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M${c - 22} 21 Q${c - 40} 21 ${c - 44} 13 Q${c - 46} 6 ${c - 39} 7 Q${c - 35} 9 ${c - 38} 13" fill="none" stroke="url(#gold)" stroke-width="3.4" stroke-linecap="round"/>
  <path d="M${c + 22} 21 Q${c + 40} 21 ${c + 44} 13 Q${c + 46} 6 ${c + 39} 7 Q${c + 35} 9 ${c + 38} 13" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M${c + 22} 21 Q${c + 40} 21 ${c + 44} 13 Q${c + 46} 6 ${c + 39} 7 Q${c + 35} 9 ${c + 38} 13" fill="none" stroke="url(#gold)" stroke-width="3.4" stroke-linecap="round"/>
  ${tileEnds}
  <!-- lacquered beam -->
  <rect x="96" y="62" width="448" height="9" rx="2" fill="url(#beam)" stroke="${INK}" stroke-width="2.4"/>
  <path d="M100 66.5 H540" stroke="#e3ad48" stroke-width="1.2" opacity=".8"/>
  ${cord(170)}${cord(470)}
  <!-- cuốn thư plaque: red lacquer board between two gilded scroll rolls -->
  <rect x="${P.x - 4}" y="${P.y - 6}" width="${P.w + 8}" height="${P.h + 12}" rx="4" fill="${INK}"/>
  <rect x="${P.x - 1}" y="${P.y - 3}" width="${P.w + 2}" height="${P.h + 6}" rx="3" fill="url(#gold)"/>
  <rect x="${P.x + 3}" y="${P.y + 1}" width="${P.w - 6}" height="${P.h - 2}" rx="2" fill="url(#lacq)" stroke="${INK}" stroke-width="1.6"/>
  <rect x="${P.x + 8}" y="${P.y + 6}" width="${P.w - 16}" height="${P.h - 12}" fill="none" stroke="#d9a441" stroke-width="1.2" opacity=".85"/>
  ${hoiVan(P.x + 11, P.y + 9, 1)}${hoiVan(P.x + P.w - 11, P.y + 9, 1, -1)}
  <g transform="translate(0 ${2 * P.y + P.h}) scale(1 -1)">${hoiVan(P.x + 11, P.y + 9, 1)}${hoiVan(P.x + P.w - 11, P.y + 9, 1, -1)}</g>
  <ellipse cx="${c}" cy="${P.y + 10}" rx="${P.w / 2 - 30}" ry="4" fill="#fff" opacity=".08"/>
  ${roll(P.x - 10)}${roll(P.x + P.w + 10)}
  <!-- small tassels under the rolls -->
  ${[P.x - 10, P.x + P.w + 10].map((x) => `<path d="M${x} ${P.y + P.h + 12} V${P.y + P.h + 24} M${x - 3} ${P.y + P.h + 13} L${x - 4} ${P.y + P.h + 22} M${x + 3} ${P.y + P.h + 13} L${x + 4} ${P.y + P.h + 22}" stroke="#c4241b" stroke-width="2" stroke-linecap="round"/>`).join('')}
  `);
}


/** Sài Gòn: steel handcuffs + a police whistle on a cobalt disc — "Bắt lên đồn" */
const CUFFS = `
  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">
    <g transform="rotate(-18 128 128)">
      <circle cx="96" cy="140" r="34" fill="none" stroke="${INK}" stroke-width="22"/>
      <circle cx="96" cy="140" r="34" fill="none" stroke="url(#steel)" stroke-width="13"/>
      <circle cx="166" cy="114" r="34" fill="none" stroke="${INK}" stroke-width="22"/>
      <circle cx="166" cy="114" r="34" fill="none" stroke="url(#steel)" stroke-width="13"/>
      <rect x="114" y="98" width="20" height="26" rx="4" fill="url(#steel)"/>
      <rect x="128" y="118" width="20" height="26" rx="4" fill="url(#steel)"/>
      <path d="M126 116 L136 124" stroke="#8d9aa4" stroke-width="6" fill="none"/>
      <path d="M74 122 Q80 110 92 108" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/>
      <path d="M146 94 Q152 84 164 82" stroke="#fff" stroke-width="4" fill="none" opacity=".8"/>
    </g>
  </g>
  <g transform="translate(150 150) rotate(-24)" stroke="${INK}" stroke-width="4" stroke-linejoin="round" paint-order="stroke">
    <path d="M0 0 H40 Q52 0 52 14 Q52 30 34 30 Q18 30 14 18 L0 18 Z" fill="url(#gold)"/>
    <circle cx="34" cy="15" r="6" fill="#7d4f12" stroke="none"/>
    <rect x="-6" y="2" width="8" height="14" rx="2" fill="#c4241b"/>
  </g>
  <g fill="#ffe082" stroke="${INK}" stroke-width="3" paint-order="stroke">
    <path d="M72 66 L78 80 L92 82 L81 91 L84 105 L72 97 L60 105 L63 91 L52 82 L66 80 Z"/>
  </g>`;

/** Sài Gòn arrest FX: a lone pair of cuffs (no disc), snapped shut over the victim. */
function cuffsFx() {
  const ring = (cx, cy) => `
      <circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="${INK}" stroke-width="26"/>
      <circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="url(#steel)" stroke-width="15"/>
      <path d="M${cx - 30} ${cy - 22} Q${cx - 22} ${cy - 34} ${cx - 8} ${cy - 37}" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>`;
  return svg(256, 256, `
  <defs>
    <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e3e9ee"/><stop offset=".55" stop-color="#9eabb5"/><stop offset="1" stop-color="#d7dee4"/>
    </linearGradient>
  </defs>
  <g transform="rotate(-14 128 128)" stroke-linejoin="round">
    ${ring(78, 136)}
    ${ring(178, 120)}
    <rect x="108" y="112" width="20" height="28" rx="4" fill="url(#steel)" stroke="${INK}" stroke-width="5"/>
    <rect x="128" y="104" width="20" height="28" rx="4" fill="url(#steel)" stroke="${INK}" stroke-width="5"/>
  </g>`);
}

/* ------------------------------------------------------------------ render */
const JOBS = [
  ['btn-kill', roundButton({ disc: ['#ef5a45', '#a8231d', '#540d0a'], icon: DAGGER }), 256, 256],
  ['btn-report', roundButton({ disc: ['#ffc25c', '#e07a12', '#7e3505'], icon: MEGAPHONE }), 256, 256],
  ['btn-task', roundButton({ disc: ['#6fe0a8', '#1f8a5c', '#0b3d27'], icon: SCROLL_TICK }), 256, 256],
  ['btn-bell', roundButton({ disc: ['#e0574a', '#9c1f17', '#4a0906'], icon: BELL }), 256, 256],
  ['frame-task-panel', frameTaskPanel(), 384, 384],
  // per-map buttons land in that map's ui/ folder (see MapSkin.killButton)
  ['sg-btn-kill', roundButton({ disc: ['#ff5a4a', '#c41e18', '#5a0806'], icon: CUFFS }), 256, 256, 'maps/sai-gon/ui'],
  ['sg-fx-cuffs', cuffsFx(), 256, 256, 'maps/sai-gon/ui'],
  ['frame-modal', frameModal(), 512, 512],
  ['frame-chat', frameChat(), 384, 384],
  ['frame-area-door', frameAreaDoor(), 1280, 400],
];

// optional filter: UI_ART_ONLY=btn-task,frame-chat node tools/ui-art/draw-ui.mjs
const ONLY = process.env.UI_ART_ONLY?.split(',');
for (const [name, code, w, h, sub] of JOBS.filter(([n]) => !ONLY || ONLY.includes(n))) {
  const [SRC, OUT, PUB] = sub ? ['assets/_src', 'assets', 'apps/web/public/assets'].map((d) => path.join(ROOT, d, sub)) : [SRC0, OUT0, PUB0];
  for (const dir of [SRC, OUT, PUB]) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(SRC, `${name}.svg`), code);
  const png = await sharp(Buffer.from(code), { density: 72 * (w / Number(code.match(/width="(\d+)"/)[1])) })
    .resize(w, h)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  console.log('[ui-art]', name, `${w}x${h}`);
}
