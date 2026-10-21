#!/usr/bin/env node
/**
 * Procedural (vector) FX sprite strips + small world icons — no AI / API key needed.
 *   node tools/ui-art/draw-fx.mjs [repoRoot]
 * Writes:
 *   assets/_src/maps/common/ui/fx/<name>.svg             (editable vector source)
 *   assets/maps/common/ui/fx/<name>.png                  (packed PNG)
 *   apps/web/public/assets/maps/common/ui/fx/<name>.webp (runtime)
 *
 * Strips are 6 frames x 256px laid out horizontally (1536x256) — the layout the `.fx` CSS class
 * (apps/web/src/styles.css) and the Phaser spritesheets in GameScene expect.
 *   fx-kill-slash     crimson crescent blade slash + spark shards          (kill)
 *   fx-report-burst   lacquer-red "!" medallion + gold shockwave            (report)
 *   fx-witness        quick shock bubble with "!" + shock lines             (witnessing a kill)
 *   fx-shield-block   Hue round shield: blade hits, jade/gold ripple, cracks (guardian shield block)
 * Icons (single image):
 *   shield.png        128px guardian shield icon
 *   body-marker.png   96px red lacquer pin with skull (dead body marker in the world)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const SRC = path.join(ROOT, 'assets/_src/maps/common/ui/fx');
const OUT = path.join(ROOT, 'assets/maps/common/ui/fx');
const PUB = path.join(ROOT, 'apps/web/public/assets/maps/common/ui/fx');
const ICON_OUT = path.join(ROOT, 'assets/maps/common/ui');
const ICON_PUB = path.join(ROOT, 'apps/web/public/assets/maps/common/ui');

const INK = '#22100a';
const F = 256; // frame size
const N = 6; // frames per strip
const GOLD_STOPS = `<stop offset="0" stop-color="#fff2bf"/><stop offset=".32" stop-color="#f3c75a"/><stop offset=".68" stop-color="#c58b26"/><stop offset="1" stop-color="#7d4f12"/>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const r1 = (n) => Math.round(n * 10) / 10;

/** deterministic rng so every run produces the same art */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** 4-point twinkle star */
const star = (x, y, r, fill, op = 1) =>
  `<path d="M${r1(x)} ${r1(y - r)} Q${r1(x + r * 0.18)} ${r1(y - r * 0.18)} ${r1(x + r)} ${r1(y)} Q${r1(x + r * 0.18)} ${r1(y + r * 0.18)} ${r1(x)} ${r1(y + r)} Q${r1(x - r * 0.18)} ${r1(y + r * 0.18)} ${r1(x - r)} ${r1(y)} Q${r1(x - r * 0.18)} ${r1(y - r * 0.18)} ${r1(x)} ${r1(y - r)} Z" fill="${fill}" opacity="${op}"/>`;

/** elongated diamond shard pointing along angle a */
function shard(x, y, a, len, wid, fill, op = 1) {
  const c = Math.cos(a), s = Math.sin(a);
  const p = [
    [x + c * len, y + s * len],
    [x - s * wid, y + c * wid],
    [x - c * len * 0.45, y - s * len * 0.45],
    [x + s * wid, y - c * wid],
  ];
  return `<path d="M${p.map(([u, v]) => `${r1(u)} ${r1(v)}`).join(' L')} Z" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" opacity="${op}"/>`;
}

/** "!" glyph built from shapes (no font) centred at (x,y), height h */
function bang(x, y, h, fill, stroke = INK) {
  const w = h * 0.26;
  return `<g stroke="${stroke}" stroke-width="${r1(h * 0.07)}" stroke-linejoin="round" paint-order="stroke">
    <path d="M${r1(x - w / 2)} ${r1(y - h / 2)} H${r1(x + w / 2)} L${r1(x + w * 0.32)} ${r1(y + h * 0.18)} H${r1(x - w * 0.32)} Z" fill="${fill}"/>
    <circle cx="${r1(x)}" cy="${r1(y + h * 0.38)}" r="${r1(w * 0.52)}" fill="${fill}"/>
  </g>`;
}

/* ================================================================== kill slash */
/** variable-width crescent along a quadratic curve, between curve params s0..s1 */
function crescent(s0, s1, W, fill, extra = '') {
  const P0 = [34, 52], C = [190, 40], P1 = [214, 214];
  const pt = (s) => [
    (1 - s) ** 2 * P0[0] + 2 * (1 - s) * s * C[0] + s * s * P1[0],
    (1 - s) ** 2 * P0[1] + 2 * (1 - s) * s * C[1] + s * s * P1[1],
  ];
  const tan = (s) => [2 * (1 - s) * (C[0] - P0[0]) + 2 * s * (P1[0] - C[0]), 2 * (1 - s) * (C[1] - P0[1]) + 2 * s * (P1[1] - C[1])];
  const steps = 28, L = [], R = [];
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, s = s0 + (s1 - s0) * u;
    const [x, y] = pt(s), [tx, ty] = tan(s), tl = Math.hypot(tx, ty);
    const nx = -ty / tl, ny = tx / tl;
    const w = W * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.8; // thick near the leading edge
    L.push([x + nx * w * 0.25, y + ny * w * 0.25]);
    R.push([x - nx * w, y - ny * w]);
  }
  const pts = [...L, ...R.reverse()];
  return `<path d="M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z" fill="${fill}" ${extra}/>`;
}

function killSlashFrame(i) {
  const head = [0.32, 0.78, 1, 1, 1, 1][i];
  const tail = [0, 0, 0.05, 0.3, 0.55, 0.78][i];
  const W = [14, 28, 34, 28, 18, 9][i];
  const op = [1, 1, 1, 0.9, 0.7, 0.4][i];
  const rnd = rng(7);
  let sparks = '';
  if (i >= 2) {
    const k = (i - 1) / 4; // 0.25 .. 1
    for (let j = 0; j < 14; j++) {
      const a = -0.6 + rnd() * 2.6, d = 30 + rnd() * 60;
      const len = 12 + rnd() * 14;
      const x = 150 + Math.cos(a) * d * (0.4 + k), y = 120 + Math.sin(a) * d * (0.4 + k);
      const col = ['#ff3b2a', '#ff8a2a', '#ffd36b', '#c4182b'][j % 4];
      sparks += shard(x, y, a, len * (1.2 - k * 0.5), 4.5, col, Math.max(0, 1.15 - k));
    }
    for (let j = 0; j < 6; j++) sparks += star(70 + rnd() * 130, 50 + rnd() * 150, 5 + rnd() * 6, '#fff4d8', Math.max(0, 1 - k * 0.9));
  }
  const flash = i === 2 ? `<circle cx="150" cy="118" r="70" fill="url(#ksFlash)"/>` : i === 3 ? `<circle cx="150" cy="118" r="50" fill="url(#ksFlash)" opacity=".5"/>` : '';
  return `${flash}
  <g opacity="${op}">
    ${crescent(tail, head, W * 1.9, '#ff2a1a', 'filter="url(#ksGlow)" opacity=".75"')}
    ${crescent(tail, head, W * 1.15, '#b0101a', `stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"`)}
    ${crescent(tail, head, W * 0.75, '#ff5a3a')}
    ${crescent(tail + (head - tail) * 0.08, head, W * 0.38, '#fff6e8')}
  </g>
  ${sparks}`;
}
const killDefs = `
  <filter id="ksGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>
  <radialGradient id="ksFlash"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".45" stop-color="#ffb08a" stop-opacity=".55"/><stop offset="1" stop-color="#ff3b2a" stop-opacity="0"/></radialGradient>`;

/* ================================================================== report burst */
function medallion(cx, cy, R) {
  const notches = Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    return `<circle cx="${r1(cx + Math.cos(a) * R * 0.9)}" cy="${r1(cy + Math.sin(a) * R * 0.9)}" r="${r1(R * 0.045)}" fill="#fff2bf" stroke="${INK}" stroke-width="1.2"/>`;
  }).join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r1(R + 4)}" fill="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#rbGold)"/>
    ${notches}
    <circle cx="${cx}" cy="${cy}" r="${r1(R * 0.78)}" fill="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${r1(R * 0.74)}" fill="url(#rbDisc)"/>
    <ellipse cx="${cx}" cy="${r1(cy - R * 0.38)}" rx="${r1(R * 0.5)}" ry="${r1(R * 0.24)}" fill="#fff" opacity=".28"/>
    ${bang(cx, cy - R * 0.04, R * 1.0, '#fff8e8')}`;
}
function reportFrame(i) {
  const sc = [0.28, 0.72, 1.12, 1, 1, 0.94][i];
  const op = [1, 1, 1, 1, 0.85, 0.45][i];
  const rnd = rng(11);
  let lines = '';
  if (i >= 1 && i <= 4) {
    const k = [0, 0.4, 1, 0.75, 0.35][i];
    for (let j = 0; j < 16; j++) {
      const a = (j / 16) * Math.PI * 2 + 0.1;
      const r0 = 62 + (j % 2) * 10 + i * 6, r2 = r0 + 22 + (j % 3) * 8;
      lines += `<path d="M${r1(128 + Math.cos(a) * r0)} ${r1(128 + Math.sin(a) * r0)} L${r1(128 + Math.cos(a) * r2)} ${r1(128 + Math.sin(a) * r2)}" stroke="${j % 2 ? '#ffd36b' : '#ff6a55'}" stroke-width="${j % 2 ? 4 : 6}" stroke-linecap="round" opacity="${k}"/>`;
    }
  }
  const ring = (r, o, w) => `<circle cx="128" cy="128" r="${r}" fill="none" stroke="#ffd36b" stroke-width="${w}" opacity="${o}"/><circle cx="128" cy="128" r="${r}" fill="none" stroke="#ff3b2a" stroke-width="${w * 0.35}" opacity="${o}"/>`;
  const rings = i === 3 ? ring(84, 0.9, 10) : i === 4 ? ring(104, 0.6, 7) : i === 5 ? ring(118, 0.3, 4) : '';
  let sparkles = '';
  if (i >= 3) for (let j = 0; j < 8; j++) {
    const a = rnd() * Math.PI * 2, d = 70 + (i - 3) * 18 + rnd() * 20;
    sparkles += star(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 5 + rnd() * 5, j % 2 ? '#fff4d8' : '#ffd36b', i === 5 ? 0.45 : 1);
  }
  const glow = i >= 1 && i <= 3 ? `<circle cx="128" cy="128" r="${80 * sc}" fill="url(#rbGlow)"/>` : '';
  return `${glow}${lines}${rings}${sparkles}
  <g opacity="${op}" transform="translate(128 128) scale(${sc}) translate(-128 -128)">${medallion(128, 128, 58)}</g>`;
}
const reportDefs = `
  <linearGradient id="rbGold" x1="0" y1="0" x2="1" y2="1">${GOLD_STOPS}</linearGradient>
  <radialGradient id="rbDisc" cx=".42" cy=".34" r=".72"><stop offset="0" stop-color="#ff6a4a"/><stop offset=".55" stop-color="#c4241b"/><stop offset="1" stop-color="#5a0d0a"/></radialGradient>
  <radialGradient id="rbGlow"><stop offset="0" stop-color="#ffd36b" stop-opacity=".7"/><stop offset="1" stop-color="#ff3b2a" stop-opacity="0"/></radialGradient>`;

/* ================================================================== witness (quick) */
function bubblePath(cx, cy, R, spikes) {
  if (!spikes) return `<circle cx="${cx}" cy="${cy}" r="${R}"/>`;
  const pts = [];
  const n = 14;
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * Math.PI * 2;
    const r = k % 2 ? R * 0.84 : R * 1.08;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return `<path d="M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' L')} Z"/>`;
}
function witnessFrame(i) {
  const sx = [0.22, 1.18, 1, 1.08, 0.98, 1][i];
  const sy = [0.22, 1.18, 1, 0.9, 1.03, 1][i];
  const op = [1, 1, 1, 1, 1, 0.5][i];
  const spikes = i >= 1 && i <= 3;
  const cx = 128, cy = 116, R = 62;
  const tail = `<path d="M${cx - 18} ${cy + 50} L${cx - 34} ${cy + 86} L${cx + 8} ${cy + 56} Z"/>`;
  let shock = '';
  if (i >= 2) {
    const k = [0, 0, 1, 0.9, 0.7, 0.3][i], off = [0, 0, 0, 6, 10, 14][i];
    for (let j = 0; j < 6; j++) {
      const a = -Math.PI / 2 + (j - 2.5) * 0.48;
      const r0 = R + 18 + off, r2 = r0 + 26;
      shock += `<path d="M${r1(cx + Math.cos(a) * r0)} ${r1(cy + Math.sin(a) * r0)} L${r1(cx + Math.cos(a) * r2)} ${r1(cy + Math.sin(a) * r2)}" stroke="${INK}" stroke-width="10" stroke-linecap="round" opacity="${k}"/>
        <path d="M${r1(cx + Math.cos(a) * r0)} ${r1(cy + Math.sin(a) * r0)} L${r1(cx + Math.cos(a) * r2)} ${r1(cy + Math.sin(a) * r2)}" stroke="#ff5a3a" stroke-width="5" stroke-linecap="round" opacity="${k}"/>`;
    }
  }
  return `${shock}
  <g opacity="${op}" transform="translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})">
    <g fill="${INK}" transform="translate(0 4)">${bubblePath(cx, cy, R + 6, spikes)}${tail}</g>
    <g fill="#fff8ec">${bubblePath(cx, cy, R, spikes)}${tail}</g>
    <circle cx="${cx}" cy="${cy}" r="${R * 0.66}" fill="url(#wGlow)"/>
    ${bang(cx, cy - 2, 70, '#e8241b')}
  </g>`;
}
const witnessDefs = `<radialGradient id="wGlow"><stop offset="0" stop-color="#ffd36b" stop-opacity=".55"/><stop offset="1" stop-color="#ffd36b" stop-opacity="0"/></radialGradient>`;

/* ================================================================== shield block */
function shieldArt(cx, cy, R, { cracks = 0 } = {}) {
  const studs = Array.from({ length: 12 }, (_, k) => {
    const a = (k / 12) * Math.PI * 2;
    return `<circle cx="${r1(cx + Math.cos(a) * R * 0.86)}" cy="${r1(cy + Math.sin(a) * R * 0.86)}" r="${r1(R * 0.055)}" fill="url(#shGold)" stroke="${INK}" stroke-width="1.5"/>`;
  }).join('');
  // lotus emblem: 5 petals + centre
  const petals = [-60, -30, 0, 30, 60]
    .map((deg) => `<path transform="rotate(${deg} ${cx} ${cy + R * 0.22})" d="M${cx} ${r1(cy + R * 0.22)} C${r1(cx - R * 0.16)} ${r1(cy - R * 0.02)} ${r1(cx - R * 0.1)} ${r1(cy - R * 0.32)} ${cx} ${r1(cy - R * 0.42)} C${r1(cx + R * 0.1)} ${r1(cy - R * 0.32)} ${r1(cx + R * 0.16)} ${r1(cy - R * 0.02)} ${cx} ${r1(cy + R * 0.22)} Z" fill="url(#shGold)" stroke="${INK}" stroke-width="2"/>`)
    .join('');
  const crackPaths = [
    `M${cx - R * 0.2} ${cy - R * 0.62} L${cx - R * 0.05} ${cy - R * 0.3} L${cx - R * 0.22} ${cy - R * 0.08} L${cx + R * 0.02} ${cy + R * 0.18}`,
    `M${cx - R * 0.05} ${cy - R * 0.3} L${cx + R * 0.3} ${cy - R * 0.36} L${cx + R * 0.5} ${cy - R * 0.12}`,
    `M${cx - R * 0.22} ${cy - R * 0.08} L${cx - R * 0.52} ${cy + R * 0.1}`,
    `M${cx + R * 0.02} ${cy + R * 0.18} L${cx + R * 0.12} ${cy + R * 0.55}`,
  ]
    .slice(0, cracks)
    .map((d) => `<path d="${d.replace(/(\d+\.\d+)/g, (m) => r1(+m))}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><path d="${d.replace(/(\d+\.\d+)/g, (m) => r1(+m))}" fill="none" stroke="#bff3ff" stroke-width="1.5" stroke-linecap="round"/>`)
    .join('');
  return `<circle cx="${cx}" cy="${cy}" r="${r1(R + 4)}" fill="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#shGold)"/>
    ${studs}
    <circle cx="${cx}" cy="${cy}" r="${r1(R * 0.76)}" fill="${INK}"/>
    <circle cx="${cx}" cy="${cy}" r="${r1(R * 0.72)}" fill="url(#shJade)"/>
    <circle cx="${cx}" cy="${cy}" r="${r1(R * 0.62)}" fill="none" stroke="url(#shGold)" stroke-width="3"/>
    ${petals}
    <circle cx="${cx}" cy="${r1(cy + R * 0.22)}" r="${r1(R * 0.1)}" fill="#c4241b" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="${r1(cx - R * 0.18)}" cy="${r1(cy - R * 0.44)}" rx="${r1(R * 0.36)}" ry="${r1(R * 0.16)}" fill="#fff" opacity=".3" transform="rotate(-20 ${cx} ${cy})"/>
    ${crackPaths}`;
}
function shieldFrame(i) {
  const sc = [0.55, 1.08, 1, 0.97, 1, 0.98][i];
  const op = [0.9, 1, 1, 1, 1, 0.45][i];
  const cracks = [0, 0, 1, 3, 4, 4][i];
  const rnd = rng(23);
  // incoming blade streak (upper-left) hitting the shield
  const blade = i <= 2
    ? `<path d="M${[20, 44, 66][i]} ${[30, 52, 70][i]} L${[70, 92, 96][i]} ${[86, 98, 100][i]}" stroke="#ff5a3a" stroke-width="${[10, 9, 6][i]}" stroke-linecap="round" opacity=".75" filter="url(#shBlur)"/>
       <path d="M${[20, 44, 66][i]} ${[30, 52, 70][i]} L${[70, 92, 96][i]} ${[86, 98, 100][i]}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`
    : '';
  let impact = '';
  if (i >= 1 && i <= 3) {
    const k = [0, 0.6, 1, 0.6][i];
    impact += `<circle cx="96" cy="98" r="${[0, 26, 48, 36][i]}" fill="url(#shFlash)" opacity="${k}"/>`;
    impact += star(96, 98, [0, 22, 38, 24][i], '#ffffff', k);
    impact += star(96, 98, [0, 12, 22, 14][i], '#bff3ff', k);
  }
  const ring = (r, o, w) => `<circle cx="128" cy="128" r="${r}" fill="none" stroke="#7fe0ff" stroke-width="${w}" opacity="${o}"/><circle cx="128" cy="128" r="${r - w * 0.6}" fill="none" stroke="#ffe7a0" stroke-width="${w * 0.4}" opacity="${o}"/>`;
  const rings = i === 2 ? ring(94, 0.9, 9) : i === 3 ? ring(110, 0.6, 7) : i === 4 ? ring(122, 0.3, 4) : '';
  let shards = '';
  if (i >= 2) {
    const k = (i - 2) / 3;
    for (let j = 0; j < 12; j++) {
      const a = Math.PI * (0.85 + rnd() * 0.9), d = 40 + rnd() * 30 + k * 50;
      shards += shard(96 + Math.cos(a) * d, 98 + Math.sin(a) * d, a, 7 + rnd() * 7, 2.5, j % 3 ? '#ffd36b' : '#7fe0ff', Math.max(0, 1 - k * 0.8));
    }
  }
  const aura = `<circle cx="128" cy="128" r="${r1(96 * sc)}" fill="url(#shAura)" opacity="${[0.6, 1, 1, 0.8, 0.6, 0.3][i]}"/>`;
  return `${aura}${rings}
  <g opacity="${op}" transform="translate(128 128) scale(${sc}) translate(-128 -128)">${shieldArt(128, 128, 70, { cracks })}</g>
  ${blade}${impact}${shards}`;
}
const shieldDefs = `
  <linearGradient id="shGold" x1="0" y1="0" x2="1" y2="1">${GOLD_STOPS}</linearGradient>
  <radialGradient id="shJade" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#5fd0a6"/><stop offset=".55" stop-color="#1f8a6a"/><stop offset="1" stop-color="#0c3d31"/></radialGradient>
  <radialGradient id="shAura"><stop offset=".55" stop-color="#7fe0ff" stop-opacity=".45"/><stop offset="1" stop-color="#7fe0ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="shFlash"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".5" stop-color="#bff3ff" stop-opacity=".6"/><stop offset="1" stop-color="#7fe0ff" stop-opacity="0"/></radialGradient>
  <filter id="shBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`;

/* ================================================================== icons */
const shieldIcon = () => svg(160, 160, `<defs>${shieldDefs}</defs><g transform="translate(-48 -48)">${shieldArt(128, 128, 74)}</g>`);
function bodyMarker() {
  return svg(96, 96, `<defs>
    <radialGradient id="bmDisc" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ff6a4a"/><stop offset=".6" stop-color="#b8201a"/><stop offset="1" stop-color="#5a0d0a"/></radialGradient>
    <linearGradient id="bmGold" x1="0" y1="0" x2="1" y2="1">${GOLD_STOPS}</linearGradient></defs>
  <path d="M48 92 C40 76 14 62 14 38 C14 18 30 5 48 5 C66 5 82 18 82 38 C82 62 56 76 48 92 Z" fill="${INK}"/>
  <path d="M48 85 C41 72 18 59 18 38 C18 21 32 9 48 9 C64 9 78 21 78 38 C78 59 55 72 48 85 Z" fill="url(#bmGold)"/>
  <circle cx="48" cy="38" r="25" fill="${INK}"/>
  <circle cx="48" cy="38" r="22.5" fill="url(#bmDisc)"/>
  <g stroke="${INK}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M34 36 C34 26 41 21 48 21 C55 21 62 26 62 36 C62 42 58 44 57 47 L57 51 L39 51 L39 47 C38 44 34 42 34 36 Z" fill="#fff8ec"/>
    <path d="M42 51 V55 M48 51 V55 M54 51 V55" stroke-width="2.4"/>
  </g>
  <ellipse cx="42" cy="37" rx="4.4" ry="5" fill="${INK}"/><ellipse cx="54" cy="37" rx="4.4" ry="5" fill="${INK}"/>
  <path d="M48 41 L46 45 H50 Z" fill="${INK}"/>
  <ellipse cx="40" cy="19" rx="12" ry="5" fill="#fff" opacity=".25"/>`);
}

/* ================================================================== render */
const STRIPS = [
  ['fx-kill-slash', killDefs, killSlashFrame],
  ['fx-report-burst', reportDefs, reportFrame],
  ['fx-witness', witnessDefs, witnessFrame],
  ['fx-shield-block', shieldDefs, shieldFrame],
];

for (const dir of [SRC, OUT, PUB, ICON_OUT, ICON_PUB]) fs.mkdirSync(dir, { recursive: true });

async function emit(name, code, w, h, outDir, pubDir) {
  fs.writeFileSync(path.join(SRC, `${name}.svg`), code);
  const png = await sharp(Buffer.from(code)).resize(w, h).png().toBuffer();
  fs.writeFileSync(path.join(outDir, `${name}.png`), png);
  await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(pubDir, `${name}.webp`));
  console.log('[fx-art]', name, `${w}x${h}`);
}

for (const [name, defs, frame] of STRIPS) {
  const body = Array.from({ length: N }, (_, i) => `<g transform="translate(${i * F} 0)"><svg x="0" y="0" width="${F}" height="${F}" viewBox="0 0 ${F} ${F}" overflow="hidden">${frame(i)}</svg></g>`).join('\n');
  await emit(name, svg(F * N, F, `<defs>${defs}</defs>${body}`), F * N, F, OUT, PUB);
}
await emit('shield', shieldIcon(), 128, 128, ICON_OUT, ICON_PUB);
await emit('body-marker', bodyMarker(), 96, 96, ICON_OUT, ICON_PUB);
