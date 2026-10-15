#!/usr/bin/env node
/**
 * Procedural (vector) art for mobile / collapsible-lobby UI — no AI / API key needed.
 *   node tools/ui-art/draw-mobile.mjs [repoRoot]
 * Writes assets/_src/common/ui/mobile/<name>.svg, assets/common/ui/mobile/<name>.png,
 *        apps/web/public/assets/common/ui/mobile/<name>.webp
 *
 * Assets (final px — keep styles.css in sync):
 *   btn-chat        256x256 round lacquer button with a speech scroll (collapsed lobby chat)
 *   joy-base        320x320 joystick ring (bronze rim, translucent jade well, 4 direction notches)
 *   joy-knob        160x160 gold joystick knob with lotus boss
 *   rotate-phone    512x320 "rotate to landscape" illustration (phone + curved arrow)
 *   tab-slide       96x192  lacquer pull-tab for the slide-away lobby panel (arrow drawn in CSS)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const SRC = path.join(ROOT, 'assets/_src/common/ui/mobile');
const OUT = path.join(ROOT, 'assets/common/ui/mobile');
const PUB = path.join(ROOT, 'apps/web/public/assets/common/ui/mobile');

const INK = '#22100a';
const GOLD_STOPS = `<stop offset="0" stop-color="#fff2bf"/><stop offset=".32" stop-color="#f3c75a"/><stop offset=".68" stop-color="#c58b26"/><stop offset="1" stop-color="#7d4f12"/>`;
const gold = (id = 'gold', x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${GOLD_STOPS}</linearGradient>`;
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const gloss = `<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;

function studRing(c, r, n, size = 9) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
    return `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" rx="1.5" transform="rotate(${(a * 180) / Math.PI + 45} ${x} ${y})" fill="#6a3d0c" stroke="#ffe7a0" stroke-width="1.2"/>`;
  }).join('');
}

/* ------------------------------------------------------------------ chat button */
function btnChat() {
  return svg(256, 256, `
  <defs>${gold('gold', 1, 1)}${gloss}
    <radialGradient id="disc" cx=".42" cy=".34" r=".72"><stop offset="0" stop-color="#d8523c"/><stop offset=".55" stop-color="#8a1f15"/><stop offset="1" stop-color="#3e0b06"/></radialGradient>
    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#ead6ad"/></linearGradient>
  </defs>
  <circle cx="128" cy="128" r="126" fill="${INK}"/>
  <circle cx="128" cy="128" r="122" fill="url(#gold)"/>
  <circle cx="128" cy="128" r="119" fill="none" stroke="#fff6cf" stroke-width="2" opacity=".55"/>
  ${studRing(128, 110, 12)}
  <circle cx="128" cy="128" r="101" fill="${INK}"/>
  <circle cx="128" cy="128" r="97" fill="url(#disc)"/>
  <circle cx="128" cy="128" r="89" fill="none" stroke="url(#gold)" stroke-width="3" opacity=".9"/>
  <ellipse cx="128" cy="80" rx="66" ry="38" fill="url(#gloss)"/>
  <g stroke="${INK}" stroke-width="5" stroke-linejoin="round" paint-order="stroke">
    <path d="M62 86 Q62 72 78 72 H178 Q194 72 194 86 V150 Q194 164 178 164 H122 L90 192 L96 164 H78 Q62 164 62 150 Z" fill="url(#pg)"/>
  </g>
  <g fill="#8a1f15" stroke="${INK}" stroke-width="2.5">
    <circle cx="98" cy="118" r="10"/><circle cx="128" cy="118" r="10"/><circle cx="158" cy="118" r="10"/>
  </g>
  <path d="M74 84 H182" stroke="#c58b26" stroke-width="3" stroke-linecap="round" opacity=".7"/>`);
}

/* ------------------------------------------------------------------ joystick */
function joyBase() {
  const S = 320, c = 160;
  const notch = (deg) =>
    `<path d="M${c} 34 L${c + 13} 54 H${c - 13} Z" transform="rotate(${deg} ${c} ${c})" fill="url(#gold)" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  return svg(S, S, `
  <defs>${gold('gold', 1, 1)}
    <radialGradient id="well" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2f8a64" stop-opacity=".22"/><stop offset=".8" stop-color="#0a3a2e" stop-opacity=".45"/><stop offset="1" stop-color="#05201a" stop-opacity=".6"/></radialGradient>
  </defs>
  <circle cx="${c}" cy="${c}" r="156" fill="${INK}" opacity=".55"/>
  <circle cx="${c}" cy="${c}" r="151" fill="none" stroke="url(#gold)" stroke-width="10"/>
  <circle cx="${c}" cy="${c}" r="145" fill="url(#well)"/>
  <circle cx="${c}" cy="${c}" r="140" fill="none" stroke="#fff6cf" stroke-width="1.5" opacity=".45"/>
  <circle cx="${c}" cy="${c}" r="96" fill="none" stroke="#e3ad48" stroke-width="2" stroke-dasharray="6 10" opacity=".55"/>
  ${[0, 90, 180, 270].map(notch).join('')}`);
}

function joyKnob() {
  const S = 160, c = 80;
  const petals = Array.from({ length: 8 }, (_, i) =>
    `<path d="M${c} ${c - 6} Q${c + 12} ${c - 26} ${c} ${c - 40} Q${c - 12} ${c - 26} ${c} ${c - 6} Z" transform="rotate(${i * 45} ${c} ${c})"/>`).join('');
  return svg(S, S, `
  <defs>${gold('gold', 1, 1)}${gloss}
    <radialGradient id="boss" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#e0a93b"/><stop offset="1" stop-color="#7d4f12"/></radialGradient>
  </defs>
  <circle cx="${c}" cy="${c + 4}" r="74" fill="#000" opacity=".35"/>
  <circle cx="${c}" cy="${c}" r="74" fill="${INK}"/>
  <circle cx="${c}" cy="${c}" r="70" fill="url(#boss)"/>
  <circle cx="${c}" cy="${c}" r="60" fill="none" stroke="#7d4f12" stroke-width="2.5"/>
  <g fill="#c4241b" stroke="${INK}" stroke-width="2" stroke-linejoin="round" opacity=".9">${petals}</g>
  <circle cx="${c}" cy="${c}" r="12" fill="url(#gold)" stroke="${INK}" stroke-width="2.5"/>
  <ellipse cx="${c}" cy="${c - 34}" rx="44" ry="22" fill="url(#gloss)"/>`);
}

/* ------------------------------------------------------------------ rotate-to-landscape */
function rotatePhone() {
  const W = 512, H = 320;
  const phone = (x, y, w, h, op) => `<g opacity="${op}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#2a1a10" stroke="url(#gold)" stroke-width="6"/>
    <rect x="${x + 10}" y="${y + 14}" width="${w - 20}" height="${h - 28}" rx="6" fill="url(#scr)"/>
  </g>`;
  return svg(W, H, `
  <defs>${gold('gold', 1, 1)}
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f8f6e"/><stop offset="1" stop-color="#0a3a2e"/></linearGradient>
    <marker id="ah" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="#f3c75a"/></marker>
  </defs>
  ${phone(54, 60, 110, 200, 0.45)}
  <path d="M74 140 h70 M74 160 h50" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".25"/>
  <path d="M190 92 Q256 30 322 92" fill="none" stroke="#f3c75a" stroke-width="9" stroke-linecap="round" marker-end="url(#ah)"/>
  ${phone(232, 120, 240, 130, 1)}
  <g transform="translate(352 185)">
    <circle r="30" fill="#f3c75a" stroke="${INK}" stroke-width="3"/>
    <path d="M-8 -14 L14 0 L-8 14 Z" fill="${INK}"/>
  </g>`);
}

/* ------------------------------------------------------------------ slide tab */
function tabSlide() {
  const W = 48, H = 96;
  return svg(W, H, `
  <defs>${gold('gold', 1, 0)}
    <linearGradient id="lac" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a120b"/><stop offset=".5" stop-color="#8a1f15"/><stop offset="1" stop-color="#c03a28"/></linearGradient>
  </defs>
  <path d="M0 2 H34 Q46 2 46 14 V82 Q46 94 34 94 H0 Z" fill="${INK}"/>
  <path d="M0 5 H33 Q43 5 43 15 V81 Q43 91 33 91 H0 Z" fill="url(#lac)"/>
  <path d="M0 10 H31 Q38 10 38 17 V79 Q38 86 31 86 H0" fill="none" stroke="url(#gold)" stroke-width="2.4"/>
  <circle cx="24" cy="20" r="3" fill="#f3c75a"/><circle cx="24" cy="76" r="3" fill="#f3c75a"/>`);
}

/* ------------------------------------------------------------------ render */
const JOBS = [
  ['btn-chat', btnChat(), 256, 256],
  ['joy-base', joyBase(), 320, 320],
  ['joy-knob', joyKnob(), 160, 160],
  ['rotate-phone', rotatePhone(), 512, 320],
  ['tab-slide', tabSlide(), 96, 192],
];

for (const dir of [SRC, OUT, PUB]) fs.mkdirSync(dir, { recursive: true });
for (const [name, code, w, h] of JOBS) {
  fs.writeFileSync(path.join(SRC, `${name}.svg`), code);
  const vw = Number(code.match(/width="(\d+)"/)[1]);
  const png = await sharp(Buffer.from(code), { density: 72 * (w / vw) }).resize(w, h).png().toBuffer();
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  await sharp(png).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  console.log('[mobile-art]', name, `${w}x${h}`);
}
