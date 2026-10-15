#!/usr/bin/env node
/**
 * Vector props + FX strips for the report / emergency-meeting cinematics — no AI / API key needed.
 *   node tools/ui-art/draw-fx-meeting.mjs [repoRoot]
 * Props (single images):
 *   cine-bell-frame  red-lacquer bell pavilion (posts, curved beam, tiled roof, hook at 260,96)
 *   cine-bell        bronze temple bell (Ngũ Phụng style), hanger loop at top-centre
 *   cine-bell-log    wooden striker log hanging from two ropes
 *   cine-seal        red cinnabar seal with a "!" mark, stamped edge
 * Strips (8 frames x 256px, the `.fx` layout):
 *   fx-bell-wave     gold sound rings + motes spreading from a bell hit
 *   fx-stamp-burst   ink splats + dust ring when the seal slams down
 *   fx-shock-lines   manga focus lines closing in (the "spotted the body" startle)
 * Writes assets/_src/common/ui/fx/*.svg, assets/common/ui/fx/*.png, apps/web/public/assets/common/ui/fx/*.webp
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const SRC = path.join(ROOT, 'assets/_src/common/ui/fx');
const OUT = path.join(ROOT, 'assets/common/ui/fx');
const PUB = path.join(ROOT, 'apps/web/public/assets/common/ui/fx');
for (const d of [SRC, OUT, PUB]) fs.mkdirSync(d, { recursive: true });

const F = 256, N = 8;
const r1 = (n) => Math.round(n * 10) / 10;
const op = (n) => Math.round(Math.max(0, Math.min(1, n)) * 100) / 100;
const ease = (t) => 1 - (1 - t) ** 3;
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const DEFS = `<defs>
  <filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="b6" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="7"/></filter>
  <linearGradient id="bronze" x1="0" x2="1"><stop offset="0" stop-color="#3e2608"/><stop offset=".22" stop-color="#9a6a26"/><stop offset=".42" stop-color="#f2d58c"/><stop offset=".6" stop-color="#b8853a"/><stop offset="1" stop-color="#3a2206"/></linearGradient>
  <linearGradient id="bronzeD" x1="0" x2="1"><stop offset="0" stop-color="#2a1804"/><stop offset=".42" stop-color="#a87a32"/><stop offset="1" stop-color="#26160a"/></linearGradient>
  <linearGradient id="lacq" x1="0" x2="1"><stop offset="0" stop-color="#5a0e08"/><stop offset=".45" stop-color="#b8241a"/><stop offset="1" stop-color="#4a0a06"/></linearGradient>
  <linearGradient id="lacqV" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#c8301f"/><stop offset="1" stop-color="#6a1208"/></linearGradient>
  <linearGradient id="wood" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#c49058"/><stop offset=".45" stop-color="#8a5a2c"/><stop offset="1" stop-color="#4a2c12"/></linearGradient>
  <linearGradient id="tile" y1="0" y2="1" x1="0" x2="0"><stop offset="0" stop-color="#3a5a4a"/><stop offset="1" stop-color="#1a2e26"/></linearGradient>
  <radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffd36a" stop-opacity=".6"/><stop offset="1" stop-color="#ffb02e" stop-opacity="0"/></radialGradient>
</defs>`;
const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${DEFS}${body}</svg>`;

/* ---------- bell pavilion: two red posts on stone bases, gold-trimmed beam with upturned ends, tiled roof */
function bellFrame() {
  const W = 520, H = 480;
  let s = '';
  // roof
  s += `<path d="M20 70 Q60 58 90 40 L430 40 Q460 58 500 70 Q470 76 440 66 L80 66 Q50 76 20 70Z" fill="url(#tile)" stroke="#0e1a14" stroke-width="3"/>`;
  for (let x = 100; x <= 420; x += 20) s += `<path d="M${x} 42 L${x - 4} 64" stroke="#5a8a72" stroke-width="3" opacity=".6"/>`;
  s += `<path d="M86 40 L434 40" stroke="#c9a24a" stroke-width="4"/>`;
  s += `<path d="M14 72 q-8 -18 6 -28" fill="none" stroke="#c9a24a" stroke-width="5" stroke-linecap="round"/><path d="M506 72 q8 -18 -6 -28" fill="none" stroke="#c9a24a" stroke-width="5" stroke-linecap="round"/>`;
  // beam
  s += `<path d="M30 74 Q40 98 60 90 L460 90 Q480 98 490 74 L490 112 L30 112Z" fill="url(#lacqV)" stroke="#2a0604" stroke-width="3"/>`;
  s += `<path d="M44 100 L476 100" stroke="#e8c060" stroke-width="2.5"/>`;
  for (let x = 120; x <= 400; x += 70) s += `<circle cx="${x}" cy="101" r="5" fill="#e8c060"/>`;
  // posts
  for (const x of [40, 452]) {
    s += `<rect x="${x}" y="110" width="28" height="330" fill="url(#lacq)" stroke="#2a0604" stroke-width="3"/>`;
    s += `<rect x="${x - 2}" y="118" width="32" height="10" fill="#e8c060"/><rect x="${x - 2}" y="410" width="32" height="8" fill="#e8c060"/>`;
    s += `<path d="M${x - 14} 470 L${x - 6} 438 L${x + 34} 438 L${x + 42} 470Z" fill="#8f8a80" stroke="#3a3630" stroke-width="3"/>`;
  }
  // bracket corbels
  s += `<path d="M68 112 Q100 112 104 140 Q86 128 68 140Z" fill="#9a1c12" stroke="#2a0604" stroke-width="2"/>`;
  s += `<path d="M452 112 Q420 112 416 140 Q434 128 452 140Z" fill="#9a1c12" stroke="#2a0604" stroke-width="2"/>`;
  // hook
  s += `<rect x="252" y="110" width="16" height="16" fill="#3a2206"/><path d="M260 124 L260 140" stroke="#2a1804" stroke-width="6"/>`;
  return wrap(W, H, s);
}

/* ---------- bronze bell: dragon-loop hanger, flared body, studs, bands, lotus strike boss, verdigris */
function bell() {
  const W = 240, H = 320;
  let s = '';
  // hanger loop (bồ lao)
  s += `<path d="M84 52 Q84 6 120 6 Q156 6 156 52" fill="none" stroke="url(#bronzeD)" stroke-width="16" stroke-linecap="round"/>`;
  s += `<path d="M90 50 Q92 16 120 14 Q148 16 150 50" fill="none" stroke="#f2d58c" stroke-width="3" opacity=".6"/>`;
  // body
  const body = 'M66 64 Q66 46 120 44 Q174 46 174 64 L180 230 Q184 262 206 280 L34 280 Q56 262 60 230Z';
  s += `<path d="${body}" fill="url(#bronze)" stroke="#2a1604" stroke-width="4"/>`;
  // crown band + studs
  s += `<path d="M66 70 L174 70" stroke="#2a1604" stroke-width="3"/><path d="M68 120 L172 120" stroke="#2a1604" stroke-width="4"/>`;
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 5; k++) {
      const x = 82 + k * 19, y = 82 + row * 13;
      s += `<circle cx="${x}" cy="${y}" r="4.2" fill="#d4ab5c" stroke="#3a2206" stroke-width="1.5"/>`;
    }
  // lower bands + vertical panels
  s += `<path d="M64 196 L176 196" stroke="#2a1604" stroke-width="4"/><path d="M58 236 L182 236" stroke="#2a1604" stroke-width="3"/>`;
  s += `<path d="M120 120 L120 196" stroke="#2a1604" stroke-width="3"/>`;
  // inscription marks (abstract)
  for (let k = 0; k < 4; k++) s += `<path d="M${80 + k * 9} 132 l0 ${40 + (k % 2) * 10}" stroke="#4a2e0e" stroke-width="3" opacity=".55" stroke-linecap="round"/>`;
  // lotus strike boss
  s += `<circle cx="150" cy="214" r="15" fill="#e2bd6e" stroke="#2a1604" stroke-width="3"/>`;
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    s += `<ellipse cx="${r1(150 + Math.cos(a) * 9)}" cy="${r1(214 + Math.sin(a) * 9)}" rx="4" ry="2.2" transform="rotate(${r1((a * 180) / Math.PI)} ${r1(150 + Math.cos(a) * 9)} ${r1(214 + Math.sin(a) * 9)})" fill="#8a5a20"/>`;
  }
  // lip + mouth
  s += `<path d="M34 280 Q120 300 206 280 L206 286 Q120 308 34 286Z" fill="url(#bronzeD)" stroke="#2a1604" stroke-width="3"/>`;
  // verdigris + highlight
  s += `<ellipse cx="80" cy="250" rx="16" ry="7" fill="#4fa088" opacity=".35" filter="url(#b2)"/><ellipse cx="162" cy="150" rx="8" ry="16" fill="#4fa088" opacity=".28" filter="url(#b2)"/>`;
  s += `<path d="M98 60 Q92 150 84 262" fill="none" stroke="#fff3c8" stroke-width="6" opacity=".35" filter="url(#b2)"/>`;
  return wrap(W, H, s);
}

/* ---------- striker log on two ropes */
function bellLog() {
  const W = 280, H = 140;
  let s = '';
  s += `<path d="M70 0 L80 92 M210 0 L200 92" stroke="#c8a870" stroke-width="5"/><path d="M70 0 L80 92 M210 0 L200 92" stroke="#6a4a20" stroke-width="5" stroke-dasharray="4 5"/>`;
  s += `<rect x="18" y="88" width="250" height="40" rx="20" fill="url(#wood)" stroke="#2a1606" stroke-width="3"/>`;
  for (let k = 0; k < 5; k++) s += `<path d="M${50 + k * 44} 96 q20 3 34 0" fill="none" stroke="#5a3814" stroke-width="2" opacity=".6"/>`;
  s += `<rect x="72" y="86" width="14" height="44" fill="#b8241a" stroke="#2a0604" stroke-width="2"/><rect x="194" y="86" width="14" height="44" fill="#b8241a" stroke="#2a0604" stroke-width="2"/>`;
  s += `<ellipse cx="22" cy="108" rx="10" ry="19" fill="#d8b07a" stroke="#2a1606" stroke-width="3"/><ellipse cx="22" cy="108" rx="5" ry="10" fill="none" stroke="#8a5a2c" stroke-width="2"/>`;
  return wrap(W, H, s);
}

/* ---------- cinnabar seal: rough-edged red square, double border, bold "!" in negative space */
function seal() {
  const W = 240, H = 240;
  let s = `<g filter="url(#rough)">`;
  s += `<rect x="16" y="16" width="208" height="208" rx="18" fill="#c4161c"/>`;
  s += `<rect x="32" y="32" width="176" height="176" rx="10" fill="none" stroke="#fff4e4" stroke-width="7"/>`;
  s += `<rect x="44" y="44" width="152" height="152" rx="6" fill="none" stroke="#fff4e4" stroke-width="2.5"/>`;
  s += `<path d="M104 64 L136 64 L128 152 L112 152Z" fill="#fff4e4"/><circle cx="120" cy="176" r="14" fill="#fff4e4"/>`;
  // seal-script flourishes at the corners
  s += `<path d="M58 70 q10 -10 20 0 t20 0 M142 70 q10 10 20 0 t20 0 M58 178 l18 0 l0 -14 M182 178 l-18 0 l0 -14" fill="none" stroke="#fff4e4" stroke-width="4" stroke-linecap="round"/>`;
  s += `</g>`;
  // ink voids for a hand-stamped look
  const R = rng(11);
  for (let k = 0; k < 26; k++) s += `<circle cx="${r1(24 + R() * 192)}" cy="${r1(24 + R() * 192)}" r="${r1(1 + R() * 3.5)}" fill="#fff4e4" opacity="${op(0.25 + R() * 0.5)}"/>`;
  return wrap(W, H, s);
}

/* ---------- bell wave: flash at the boss, three gold rings spread and thin, motes drift out */
function bellWaveFrame(i) {
  const t = i / (N - 1);
  let s = '';
  if (t < 0.4) s += `<circle cx="128" cy="128" r="${r1(40 + t * 80)}" fill="url(#glow)" opacity="${op(1 - t / 0.4)}"/>`;
  for (let k = 0; k < 3; k++) {
    const tt = t - k * 0.14;
    if (tt <= 0) continue;
    const r = 20 + ease(Math.min(1, tt / 0.86)) * 104, w = 9 * (1 - tt) + 1;
    s += `<circle cx="128" cy="128" r="${r1(r)}" fill="none" stroke="${k === 1 ? '#fff0b0' : '#ffc94a'}" stroke-width="${r1(w)}" opacity="${op((1 - tt) * 1.1)}"/>`;
  }
  const R = rng(5);
  for (let k = 0; k < 16; k++) {
    const a = R() * Math.PI * 2, d = 24 + ease(t) * (60 + R() * 50);
    s += `<circle cx="${r1(128 + Math.cos(a) * d)}" cy="${r1(128 + Math.sin(a) * d)}" r="${r1(2 + R() * 3)}" fill="#fff3b8" opacity="${op((1 - t) * (0.6 + R() * 0.4))}"/>`;
  }
  return s;
}

/* ---------- stamp burst: radial ink splats + flat dust ring at the base */
function stampBurstFrame(i) {
  const t = i / (N - 1);
  let s = '';
  const dr = 30 + ease(t) * 96;
  s += `<ellipse cx="128" cy="190" rx="${r1(dr * 1.1)}" ry="${r1(dr * 0.28)}" fill="#e8d6b4" opacity="${op((1 - t) * 0.7)}" filter="url(#b6)"/>`;
  const R = rng(23);
  for (let k = 0; k < 14; k++) {
    const a = -Math.PI + (k / 13) * Math.PI + (R() - 0.5) * 0.3, d = 40 + ease(Math.min(1, t * 1.4)) * (40 + R() * 50);
    const x = 128 + Math.cos(a) * d * 1.3, y = 150 + Math.sin(a) * d * 0.9 + t * t * 30, r = (3 + R() * 7) * (1 - t * 0.6);
    s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${k % 4 === 0 ? '#2a0806' : '#b8121a'}" opacity="${op(1 - t ** 2)}"/>`;
  }
  if (t < 0.45)
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, r0 = 50 + t * 60, r2 = r0 + 26 * (1 - t);
      s += `<path d="M${r1(128 + Math.cos(a) * r0)} ${r1(128 + Math.sin(a) * r0)} L${r1(128 + Math.cos(a) * r2)} ${r1(128 + Math.sin(a) * r2)}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="${op(1 - t / 0.45)}"/>`;
    }
  return s;
}

/* ---------- focus lines: wedge streaks from the frame edge toward the centre, flickering */
function shockFrame(i) {
  const t = i / (N - 1);
  const R = rng(100 + i);
  let s = '';
  const inner = 70 - Math.sin(t * Math.PI) * 26, fade = t < 0.15 ? t / 0.15 : 1 - Math.max(0, t - 0.55) / 0.45;
  for (let k = 0; k < 34; k++) {
    const a = (k / 34) * Math.PI * 2 + (R() - 0.5) * 0.12, w = 0.02 + R() * 0.035, r0 = inner + R() * 24;
    const p = (ang, r) => `${r1(128 + Math.cos(ang) * r)} ${r1(128 + Math.sin(ang) * r)}`;
    s += `<path d="M${p(a - w, 190)} L${p(a, r0)} L${p(a + w, 190)}Z" fill="${k % 5 === 0 ? '#ff6a4a' : '#ffffff'}" opacity="${op(fade * (0.5 + R() * 0.5))}"/>`;
  }
  return s;
}

async function save(name, svgStr) {
  fs.writeFileSync(path.join(SRC, `${name}.svg`), svgStr);
  const png = await sharp(Buffer.from(svgStr)).png().toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  await sharp(png).webp({ quality: 88, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  console.log('wrote', name);
}
async function writeStrip(name, frameFn) {
  let body = '';
  for (let i = 0; i < N; i++) body += `<g transform="translate(${i * F} 0)"><svg width="${F}" height="${F}" viewBox="0 0 ${F} ${F}" overflow="hidden">${frameFn(i)}</svg></g>`;
  await save(name, wrap(F * N, F, body));
}

await save('cine-bell-frame', bellFrame());
await save('cine-bell', bell());
await save('cine-bell-log', bellLog());
await save('cine-seal', seal());
await writeStrip('fx-bell-wave', bellWaveFrame);
await writeStrip('fx-stamp-burst', stampBurstFrame);
await writeStrip('fx-shock-lines', shockFrame);
