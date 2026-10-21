#!/usr/bin/env node
/**
 * Vector FX strips for the kill / shield cinematics and world FX — no AI / API key needed.
 *   node tools/ui-art/draw-fx-action.mjs [repoRoot]
 * Strips are 8 frames x 256px (2048x256), the layout of the `.fx` CSS class and the Phaser FX spritesheets:
 *   fx-dash-smear   ink speed streaks trailing a lunge (drawn trailing to the RIGHT, flip for the other way)
 *   fx-soul-rise    pale soul wisp leaving a fallen body, rising and dissolving
 *   fx-shield-dome  jade hex-lattice dome: pops up, ripples from the blade hit on the left, shatters to motes
 * Writes assets/_src/maps/common/ui/fx/*.svg, assets/maps/common/ui/fx/*.png, apps/web/public/assets/maps/common/ui/fx/*.webp
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const SRC = path.join(ROOT, 'assets/_src/maps/common/ui/fx');
const OUT = path.join(ROOT, 'assets/maps/common/ui/fx');
const PUB = path.join(ROOT, 'apps/web/public/assets/maps/common/ui/fx');
for (const d of [SRC, OUT, PUB]) fs.mkdirSync(d, { recursive: true });

const F = 256, N = 8;
const r1 = (n) => Math.round(n * 10) / 10;
const ease = (t) => 1 - (1 - t) ** 3;
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const DEFS = `<defs>
  <filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="b12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="12"/></filter>
  <radialGradient id="soul" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d8f4ff"/><stop offset="1" stop-color="#7fd0ff" stop-opacity="0"/></radialGradient>
  <radialGradient id="dome" cx=".5" cy=".75" r=".75"><stop offset="0" stop-color="#d9fff0" stop-opacity=".05"/><stop offset=".7" stop-color="#5fe0b0" stop-opacity=".28"/><stop offset="1" stop-color="#bfffe6" stop-opacity=".75"/></radialGradient>
</defs>`;

/* ---------- dash smear: brush streaks that stretch out then thin and fade */
function dashFrame(i) {
  const t = i / (N - 1);
  const R = rng(7);
  let s = '';
  for (let k = 0; k < 9; k++) {
    const y = 70 + R() * 130, len = (80 + R() * 130) * ease(Math.min(1, t * 1.8)), x0 = 30 + R() * 40 + t * 60;
    const w = (3 + R() * 9) * (1 - t * 0.85), op = (0.55 + R() * 0.45) * (1 - t ** 1.6);
    const col = k % 3 === 0 ? '#c8231a' : k % 3 === 1 ? '#2a140c' : '#f5e6c8';
    s += `<path d="M${r1(x0)} ${r1(y)} Q${r1(x0 + len * 0.5)} ${r1(y - w * 0.6)} ${r1(x0 + len)} ${r1(y + 1)} Q${r1(x0 + len * 0.5)} ${r1(y + w)} ${r1(x0)} ${r1(y)}Z" fill="${col}" opacity="${r1(op * 100) / 100}"/>`;
  }
  // dust puff at the heel
  const pr = 18 + t * 40;
  s += `<ellipse cx="${r1(60 + t * 30)}" cy="210" rx="${r1(pr * 1.6)}" ry="${r1(pr * 0.5)}" fill="#e8d2a8" opacity="${r1((1 - t) * 0.5 * 100) / 100}" filter="url(#b6)"/>`;
  return s;
}

/* ---------- soul wisp: forms over the body, rises in an S curve, tail flickers, dissolves into motes */
function soulFrame(i) {
  const t = i / (N - 1);
  const cy = 200 - ease(t) * 130, sway = Math.sin(t * Math.PI * 2) * 14;
  const grow = Math.min(1, t * 3), fade = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
  const r = 30 * grow;
  let s = '';
  s += `<ellipse cx="${r1(128 + sway)}" cy="${r1(cy)}" rx="${r1(r * 1.9)}" ry="${r1(r * 2.2)}" fill="#8fdcff" opacity="${r1(0.35 * fade * 100) / 100}" filter="url(#b12)"/>`;
  // tail
  const tx = 128 - sway * 1.4;
  s += `<path d="M${r1(128 + sway - r * 0.9)} ${r1(cy)} C${r1(tx - 20)} ${r1(cy + 40)} ${r1(tx + 26)} ${r1(cy + 60)} ${r1(tx)} ${r1(Math.min(250, cy + 90 * grow))} C${r1(tx + 10)} ${r1(cy + 50)} ${r1(128 + sway + 22)} ${r1(cy + 30)} ${r1(128 + sway + r * 0.9)} ${r1(cy)}Z" fill="url(#soul)" opacity="${r1(0.85 * fade * 100) / 100}" filter="url(#b2)"/>`;
  s += `<circle cx="${r1(128 + sway)}" cy="${r1(cy)}" r="${r1(r)}" fill="url(#soul)" opacity="${r1(fade * 100) / 100}"/>`;
  // two dark eyes, kawaii ghost
  if (grow > 0.6 && fade > 0.25) {
    for (const dx of [-9, 9]) s += `<ellipse cx="${r1(128 + sway + dx)}" cy="${r1(cy - 2)}" rx="3.2" ry="4.4" fill="#27425a" opacity="${r1(fade * 0.9 * 100) / 100}"/>`;
  }
  const R = rng(31 + i);
  for (let k = 0; k < 14; k++) {
    const a = R() * Math.PI * 2, d = 20 + R() * 70 * t;
    s += `<circle cx="${r1(128 + Math.cos(a) * d)}" cy="${r1(cy + 20 + Math.sin(a) * d * 0.8)}" r="${r1(1.5 + R() * 3)}" fill="#e6fbff" opacity="${r1(R() * t * fade * 100) / 100}"/>`;
  }
  return s;
}

/* ---------- jade shield dome with hex lattice */
function hexLattice(cx, cy, R, op) {
  let s = '';
  const h = 22;
  for (let row = -6; row <= 6; row++)
    for (let col = -6; col <= 6; col++) {
      const x = cx + col * h * 1.5, y = cy + row * h * 1.732 + (col & 1 ? h * 0.866 : 0);
      if (Math.hypot(x - cx, (y - cy) * 1.05) > R - 6 || y > cy + 4) continue;
      const pts = Array.from({ length: 6 }, (_, k) => [x + Math.cos((k * Math.PI) / 3) * h * 0.92, y + Math.sin((k * Math.PI) / 3) * h * 0.92]);
      s += `<path d="M${pts.map(([u, v]) => `${r1(u)} ${r1(v)}`).join(' L')}Z" fill="none" stroke="#c9ffe8" stroke-width="1.6" opacity="${r1(op * 100) / 100}"/>`;
    }
  return s;
}
function domeFrame(i) {
  const cx = 128, cy = 214;
  const pop = [0.35, 0.85, 1.06, 1, 1, 1, 1.02, 1.1][i];
  const op = [0.5, 1, 1, 1, 0.95, 0.8, 0.5, 0.15][i];
  const R = 110 * pop;
  let s = `<g opacity="${op}">`;
  s += `<path d="M${cx - R} ${cy} A${R} ${R * 1.02} 0 0 1 ${cx + R} ${cy} Z" fill="url(#dome)"/>`;
  s += hexLattice(cx, cy, R, 0.55 * (i === 1 || i === 2 ? 1.4 : 1));
  s += `<path d="M${cx - R} ${cy} A${R} ${R * 1.02} 0 0 1 ${cx + R} ${cy}" fill="none" stroke="#eafff6" stroke-width="5" filter="url(#b2)"/>`;
  s += `<path d="M${cx - R} ${cy} A${R} ${R * 1.02} 0 0 1 ${cx + R} ${cy}" fill="none" stroke="#ffd56a" stroke-width="2"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${r1(R)}" ry="${r1(R * 0.18)}" fill="none" stroke="#9ff5d0" stroke-width="3" opacity=".7"/>`;
  s += '</g>';
  // impact ripple on the left face (frames 2..5)
  if (i >= 2 && i <= 5) {
    const k = (i - 2) / 3, ix = cx - R * 0.72, iy = cy - R * 0.62;
    for (const m of [1, 0.6]) s += `<ellipse cx="${r1(ix)}" cy="${r1(iy)}" rx="${r1(10 + k * 60 * m)}" ry="${r1(14 + k * 80 * m)}" fill="none" stroke="#fff6c8" stroke-width="${r1(6 * (1 - k))}" opacity="${r1((1 - k) * 100) / 100}" transform="rotate(-38 ${r1(ix)} ${r1(iy)})"/>`;
    if (i === 2) s += `<circle cx="${r1(ix)}" cy="${r1(iy)}" r="26" fill="#fffbe0" filter="url(#b6)"/>`;
  }
  // shatter motes at the end
  if (i >= 6) {
    const R2 = rng(5);
    for (let k = 0; k < 26; k++) {
      const a = Math.PI + R2() * Math.PI, d = R * (0.8 + R2() * 0.4) + (i - 5) * 10;
      s += `<rect x="${r1(cx + Math.cos(a) * d)}" y="${r1(cy + Math.sin(a) * d)}" width="5" height="5" fill="#c9ffe8" opacity="${r1((i === 6 ? 0.9 : 0.4) * 100) / 100}" transform="rotate(${r1(R2() * 90)} ${r1(cx + Math.cos(a) * d)} ${r1(cy + Math.sin(a) * d)})"/>`;
    }
  }
  return s;
}

const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}</svg>`;

async function writeStrip(name, frameFn) {
  let body = '';
  for (let i = 0; i < N; i++) body += `<g transform="translate(${i * F} 0)"><svg width="${F}" height="${F}" viewBox="0 0 ${F} ${F}" overflow="hidden">${frameFn(i)}</svg></g>`;
  const svgStr = wrap(F * N, F, body);
  fs.writeFileSync(path.join(SRC, `${name}.svg`), svgStr);
  const png = await sharp(Buffer.from(svgStr)).png().toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  await sharp(png).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  console.log('[fx-action]', name);
}

await writeStrip('fx-dash-smear', dashFrame);
await writeStrip('fx-soul-rise', soulFrame);
await writeStrip('fx-shield-dome', domeFrame);
