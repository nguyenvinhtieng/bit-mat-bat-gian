#!/usr/bin/env node
/**
 * Procedural (vector) player characters per map — no AI / API key needed.
 *   node tools/char-art/draw-characters.mjs [repoRoot] [--only=<slug>]
 *
 * Each map gets its own costume, same rig + frame layout as the common player atlas
 * (4 rows down/left/right/up x 4 walk frames, 48x64 per frame, anchor bottom-centre):
 *   assets/maps/<slug>/characters/<prefix>-player-atlas.png      base (skin, hair, headwear, trousers…)
 *   assets/maps/<slug>/characters/<prefix>-player-tint-atlas.png greyscale garment the engine tints per player colour
 *   assets/maps/<slug>/characters/<prefix>-player-atlas.json     frames walk-<dir>-<i>
 *   assets/_src/maps/<slug>/characters/<prefix>-player-preview.png  8x preview sheet (base+sample tints)
 *   assets/maps/<slug>/characters/<prefix>-player-action(-tint).png  strike/die/guard poses (96x64 frames, see ACTION_POSES)
 *   -> apps/web/public/assets/maps/<slug>/characters/*.webp + .json
 *
 *   co-do-hue   áo dài ngũ thân (tinted) + khăn đóng vàng nghệ, quần trắng, hài mũi cong
 *   hoi-an      áo bà ba (tinted) + nón lá, quần lụa đen, guốc mộc
 *   thang-long  áo the dài (tinted) + khăn xếp đen, quần trắng, giày Gia Định
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ARGS = process.argv.slice(2);
const ROOT = path.resolve(ARGS.find((a) => !a.startsWith('--')) || path.join(path.dirname(new URL(import.meta.url).pathname), '../..'));
const ONLY = ARGS.find((a) => a.startsWith('--only='))?.slice(7);

const FW = 48, FH = 64, SS = 8; // supersample, then lanczos down to 48x64
const DIRS = ['down', 'left', 'right', 'up'];
const INK = '#2a1d18';
const OW = 1.05; // outline width (frame px)

/* ------------------------------------------------------------ palette helpers */
// garment greys: the tint sprite multiplies these by the player colour.
const G = { hi: '#ffffff', main: '#eeeeee', shade: '#cdcdcd', deep: '#a8a8a8', line: '#8c8c8c' };
const SKIN = { main: '#f7d6b5', shade: '#e9b892', blush: '#f29a8a' };
const HAIR = { main: '#2f2a2e', hi: '#4b4450' };

/**
 * Painter: in 'color' mode emits real colours; in 'mask' mode garment parts (tint=true) are white,
 * everything else black — the mask decides which pixels go to the tint atlas.
 */
function painter(mode, ss = 1) {
  const fill = (c, tint) => (mode === 'mask' ? (tint ? '#fff' : '#000') : c);
  const P = (d, c, { tint = false, stroke = true, sw = OW, op = 1 } = {}) => {
    sw /= ss;
    return (
    `<path d="${d}" fill="${fill(c, tint)}" ${op < 1 && mode === 'color' ? `fill-opacity="${op}"` : ''} ${stroke ? `stroke="${mode === 'mask' ? '#000' : INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"` : ''}/>`);
  };
  const E = (cx, cy, rx, ry, c, o = {}) => P(ell(cx, cy, rx, ry), c, o);
  // detail line (fold / seam). On a garment it stays in the tint (as a darker grey), elsewhere black.
  const L = (d, c, { tint = false, sw = 0.6 } = {}) =>
    `<path d="${d}" fill="none" stroke="${mode === 'mask' ? (tint ? '#fff' : '#000') : c}" stroke-width="${sw / ss}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return { P, E, L, mode };
}
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
const f = (n) => Math.round(n * 100) / 100;
const pts = (arr) => arr.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + 'Z';

/* ------------------------------------------------------------ walk cycle */
// frame 0 = idle/contact, 1 = passing (left leg forward), 2 = contact, 3 = passing (right leg forward)
function pose(i) {
  const stride = [0, 1, 0, -1][i];
  return { i, stride, bob: [0, -0.8, 0, -0.8][i], sway: [0, 1, 0, -1][i] };
}

/* ------------------------------------------------------------ shared body parts (pre-scale coords) */
const HEM = 54.2;
function legsFront(p, k, c, back) {
  const { P } = k;
  let s = '';
  for (const side of [-1, 1]) {
    const lifted = side === -1 ? p.stride > 0 : p.stride < 0;
    const lift = lifted ? 2 : 0;
    const x = 24 + side * 2.5;
    s += P(`M${x - 2} 48h4v${11 - lift}a2 1.1 0 0 1 -4 0Z`, lifted ? c.trouserShade : c.trouser);
    s += c.shoeFront(x, 60.3 - lift, k, back);
  }
  return s;
}
function legSide(p, k, c, ph) {
  // ph 1 = near leg, -1 = far leg; facing left so "forward" is -x
  const dx = -p.stride * ph * 2.3;
  const lift = p.stride && ph * p.stride > 0 ? 0.8 : 0;
  const x = 24 + dx;
  return k.P(`M${x - 1.9} 48h3.8v${11.4 - lift}a1.9 1.1 0 0 1 -3.8 0Z`, ph < 0 ? c.trouserShade : c.trouser) + c.shoeSide(x, 60.4 - lift, k, ph < 0);
}
function handE(k, x, y) {
  return k.E(x, y, 1.15, 1.7, SKIN.main);
}

/* ------------------------------------------------------------ heads (scaled by HEAD_S around the neck) */
function headFront(p, k, c, back = false) {
  const { P, E, L } = k;
  const y = 22 + p.bob;
  let s = '';
  s += P(`M21.8 ${y + 9}h4.4v3.6h-4.4Z`, SKIN.shade);
  if (back) {
    s += P(`M11.5 ${y + 1}C11 ${y - 9} 17 ${y - 12.5} 24 ${y - 12.5}S37 ${y - 9} 36.5 ${y + 1}C36.5 ${y + 6} 32.6 ${y + 10.6} 24 ${y + 10.8}C15.4 ${y + 10.6} 11.5 ${y + 6} 11.5 ${y + 1}Z`, HAIR.main);
    s += L(`M17.4 ${y + 1.6}c0.8 2.6 1.6 4.6 3 6.6M24 ${y + 1}v8.4M30.6 ${y + 1.6}c-0.8 2.6 -1.6 4.6 -3 6.6`, HAIR.hi, { sw: 0.7 });
    if (c.bun) s += E(24, y + 9.4, 3.2, 2.4, HAIR.main);
  } else {
    s += E(11.8, y + 2, 1.9, 2.3, SKIN.main);
    s += E(36.2, y + 2, 1.9, 2.3, SKIN.main);
    // hair behind the face (short, ends at the cheeks)
    s += P(`M11.6 ${y + 1}C11 ${y - 9} 17 ${y - 12.5} 24 ${y - 12.5}S37 ${y - 9} 36.4 ${y + 1}C36.4 ${y + 4} 35.6 ${y + 6} 34.6 ${y + 6.4}L13.4 ${y + 6.4}C12.4 ${y + 6} 11.6 ${y + 4} 11.6 ${y + 1}Z`, HAIR.main);
    if (c.longHair) s += P(`M12 ${y + 2}C11 ${y + 8} 13 ${y + 11} 15.6 ${y + 11.4}L32.4 ${y + 11.4}C35 ${y + 11} 37 ${y + 8} 36 ${y + 2}Z`, HAIR.main);
    s += P(`M13 ${y - 1}C13 ${y - 5} 17 ${y - 7} 24 ${y - 7}S35 ${y - 5} 35 ${y - 1}C35 ${y + 6} 30.5 ${y + 10.5} 24 ${y + 10.5}S13 ${y + 6} 13 ${y - 1}Z`, SKIN.main);
    if (c.fringe !== false)
      s += P(`M13 ${y + 0.5}C12.8 ${y - 6} 17 ${y - 8.5} 24 ${y - 8.5}S35.2 ${y - 6} 35 ${y + 0.5}C33 ${y - 2.5} 31 ${y - 3} 29.5 ${y - 1.6}C28.5 ${y - 3.6} 26 ${y - 4} 24 ${y - 2.4}C22 ${y - 4} 19 ${y - 3.6} 18 ${y - 1.4}C16.4 ${y - 3} 14.6 ${y - 2.4} 13 ${y + 0.5}Z`, HAIR.main, { sw: 0.8 });
    s += E(19.3, y + 2.8, 1.5, 1.95, INK, { stroke: false });
    s += E(28.7, y + 2.8, 1.5, 1.95, INK, { stroke: false });
    s += E(19.85, y + 2, 0.55, 0.55, '#fff', { stroke: false });
    s += E(29.25, y + 2, 0.55, 0.55, '#fff', { stroke: false });
    s += E(16.6, y + 5.6, 1.7, 1, SKIN.blush, { stroke: false, op: 0.55 });
    s += E(31.4, y + 5.6, 1.7, 1, SKIN.blush, { stroke: false, op: 0.55 });
    s += L(`M22.7 ${y + 6.6}q1.3 1 2.6 0`, INK, { sw: 0.7 });
  }
  s += c.hatFront(y, k, back);
  return s;
}
function headSide(p, k, c) {
  // facing LEFT (-x)
  const { P, E, L } = k;
  const y = 22 + p.bob;
  let s = '';
  s += P(`M22.6 ${y + 9}h4.4v3.6h-4.4Z`, SKIN.shade);
  s += P(`M12.2 ${y}C12.2 ${y - 7} 17 ${y - 11.5} 24 ${y - 11.5}S35.6 ${y - 7} 35.6 ${y}C35.6 ${y + 7} 31 ${y + 10.5} 24 ${y + 10.5}C18 ${y + 10.5} 12.2 ${y + 7.5} 12.2 ${y}Z`, SKIN.main);
  s += P(`M20 ${y - 9}C26 ${y - 13} 36.2 ${y - 9} 35.8 ${y + 1}C35.6 ${y + 6} 33.8 ${y + 9} 31 ${y + 10.3}C29.6 ${y + 7} 28.6 ${y + 4} 25.6 ${y + 2.4}C24 ${y - 2} 22 ${y - 4.6} 16.5 ${y - 3}C15 ${y - 6} 17 ${y - 8} 20 ${y - 9}Z`, HAIR.main);
  if (c.longHair) s += P(`M29 ${y + 4}C33 ${y + 4} 36 ${y + 6} 35 ${y + 11.4}L28.6 ${y + 11.4}C28 ${y + 8} 28 ${y + 6} 29 ${y + 4}Z`, HAIR.main);
  if (c.bun) s += E(34.6, y + 7.4, 2.6, 2.2, HAIR.main);
  if (c.fringe !== false) s += P(`M12.6 ${y - 1}C13 ${y - 6} 17 ${y - 9} 22 ${y - 8.6}C20.6 ${y - 6.6} 19 ${y - 4.4} 16 ${y - 2.6}C15 ${y - 1.6} 13.8 ${y - 1} 12.6 ${y - 1}Z`, HAIR.main, { sw: 0.8 });
  s += E(27.4, y + 2.4, 1.8, 2.3, SKIN.main);
  s += L(`M27.2 ${y + 1.4}q-0.8 1 0 2`, SKIN.shade, { sw: 0.6 });
  s += E(16.4, y + 2.8, 1.4, 1.9, INK, { stroke: false });
  s += E(16, y + 2, 0.5, 0.5, '#fff', { stroke: false });
  s += E(18.8, y + 5.6, 1.6, 0.95, SKIN.blush, { stroke: false, op: 0.55 });
  s += L(`M13.6 ${y + 6.8}q1 0.6 2 0`, INK, { sw: 0.65 });
  s += c.hatSide(y, k);
  return s;
}

/* ================================================================== COSTUMES */

/* ---------- long tunic (áo dài / áo the): shared garment, details vary per map ---------- */
function longTunicFront(p, k, back, o) {
  const { P, L, E } = k;
  const b = p.bob, w = p.sway;
  let s = '';
  // back panel (tà sau) visible at the side slits
  s += P(`M19 ${43.6 + b}L${17.4 - w * 0.4} ${HEM - 0.4}C21 ${HEM + 0.6} 27 ${HEM + 0.6} ${30.6 - w * 0.4} ${HEM - 0.4}L29 ${43.6 + b}Z`, G.shade, { tint: true });
  // bodice + front panel (tà trước)
  s += P(`M17.6 ${35.2 + b}C19.6 ${33.6 + b} 28.4 ${33.6 + b} 30.4 ${35.2 + b}L28.9 ${43.6 + b}C29.2 ${47} 29.6 ${51} ${30 + w} ${HEM}C27 ${HEM + 1.1} 21 ${HEM + 1.1} ${18 + w} ${HEM}C18.4 ${51} 18.8 ${47} 19.1 ${43.6 + b}Z`, G.main, { tint: true });
  if (!back) {
    s += P(`M27.4 ${35.6 + b}C28.6 ${35.8 + b} 29.6 ${36.1 + b} 30.1 ${36.8 + b}L28.7 ${43.6 + b}C29 ${47} 29.4 ${51} ${29.7 + w} ${HEM - 0.3}C28.6 ${HEM + 0.4} 27.6 ${HEM + 0.6} 26.8 ${HEM + 0.7}C27 ${49} 26.9 ${43} 27.4 ${35.6 + b}Z`, G.shade, { tint: true, stroke: false });
    // raglan seam + buttons (collar -> right armpit): the áo dài signature
    s += L(`M26 ${35.4 + b}C27.2 ${36.2 + b} 28.2 ${37.4 + b} 29 ${39 + b}`, G.line, { tint: true, sw: 0.7 });
    if (o.buttons) for (const [bx, by] of [[27, 36.2], [28.2, 37.5]]) s += E(bx, by + b, 0.42, 0.42, G.deep, { tint: true, stroke: false });
    s += L(`M19.2 ${44.4 + b}l0.5 1.2M28.8 ${44.4 + b}l-0.5 1.2`, G.line, { tint: true, sw: 0.55 });
    if (o.belt) s += P(`M19.1 ${43.2 + b}h9.8v1.4h-9.8Z`, o.belt, { sw: 0.6 });
  } else {
    s += L(`M24 ${36 + b}v${HEM - 36.5 - b}`, G.shade, { tint: true, sw: 0.7 });
    if (o.belt) s += P(`M19.1 ${43.2 + b}h9.8v1.4h-9.8Z`, o.belt, { sw: 0.6 });
  }
  // stand collar (cổ đứng)
  s += P(`M21.2 ${32.4 + b}h5.6v2.4c-1.9 0.7 -3.7 0.7 -5.6 0Z`, G.main, { tint: true, sw: 0.8 });
  if (o.piping) s += L(`M21.4 ${32.9 + b}h5.2`, o.piping, { sw: 0.6 });
  return s;
}
function sleevesFront(p, k) {
  const { P } = k;
  const b = p.bob;
  let s = '';
  for (const side of [-1, 1]) {
    const sw = -p.stride * side * 1.2; // arms swing opposite to the legs
    const sx = 24 + side * 5.6, hx = 24 + side * 7.4;
    const hy = 44.4 + b + sw * 0.5;
    s += P(`M${sx} ${35 + b}C${sx + side * 1.8} ${35.4 + b} ${hx + side * 1.4} ${38.6 + b} ${hx + side * 1.2} ${hy - 1}L${hx - side * 1.3} ${hy - 0.8}C${hx - side * 1.2} ${40.6 + b} ${sx - side * 0.2} ${38.6 + b} ${sx - side * 1} ${37 + b}Z`, G.main, { tint: true });
    s += handE(k, hx, hy + 0.3);
  }
  return s;
}
function longTunicSideBack(p, k) {
  const b = p.bob, st = p.stride;
  return k.P(`M26.6 ${43.4 + b}C27.8 ${47} 28.8 ${50.6} ${30 + st * 1.4} ${HEM - 0.4}C28.4 ${HEM + 0.5} 26.4 ${HEM + 0.6} 24.4 ${HEM + 0.2}L24.4 ${43.4 + b}Z`, G.shade, { tint: true });
}
function longTunicSideFront(p, k, o) {
  const { P, L } = k;
  const b = p.bob, st = p.stride;
  let s = '';
  s += P(`M20.2 ${35.4 + b}C21.6 ${34 + b} 26.4 ${34 + b} 27.8 ${35.6 + b}L27 ${43.8 + b}L20.6 ${43.8 + b}Z`, G.main, { tint: true });
  s += P(`M20.6 ${43.4 + b}L25 ${43.4 + b}C24.9 ${47} 24.8 ${51} 24.7 ${HEM + 0.4}C22.6 ${HEM + 1} 20.4 ${HEM + 0.8} ${18 - st * 1.4} ${HEM}C18.6 ${51} 19.6 ${47} 20.6 ${43.4 + b}Z`, G.main, { tint: true });
  s += L(`M21.2 ${45 + b}C20.8 ${48} 20.3 ${51} 19.8 ${HEM - 0.4}`, G.shade, { tint: true, sw: 0.6 });
  if (o.belt) s += P(`M20.5 ${43.1 + b}h6.6v1.4h-6.6Z`, o.belt, { sw: 0.6 });
  s += P(`M21.6 ${32.6 + b}h4.8v2.2c-1.6 0.6 -3.2 0.6 -4.8 0Z`, G.main, { tint: true, sw: 0.8 });
  if (o.piping) s += L(`M21.8 ${33.1 + b}h4.4`, o.piping, { sw: 0.6 });
  s += L(`M21.6 ${35.2 + b}C21 ${36.8 + b} 20.7 ${38.2 + b} 20.6 ${39.6 + b}`, G.line, { tint: true, sw: 0.65 });
  return s;
}
function sleeveSide(p, k) {
  const { P } = k;
  const b = p.bob, sw = p.stride * 2.2;
  const hx = 23.6 + sw, hy = 44.4 + b - Math.abs(sw) * 0.3;
  let s = P(`M22 ${35.2 + b}C24.6 ${34.6 + b} 26.4 ${36 + b} 26.2 ${37.6 + b}C${hx + 2} ${40.6 + b} ${hx + 1.4} ${hy - 2} ${hx + 1.3} ${hy - 0.8}L${hx - 1.3} ${hy - 0.8}C${hx - 1.4} ${40.6 + b} 21.2 ${38.6 + b} 22 ${35.2 + b}Z`, G.main, { tint: true });
  s += handE(k, hx, hy + 0.4);
  return s;
}

/* ---------- Huế: áo dài ngũ thân + khăn đóng vàng ---------- */
const KHAN = { main: '#dba23c', fold: '#a56d1c', hi: '#f7d77f', inner: '#5a3a14' };
const HUE = {
  slug: 'co-do-hue',
  prefix: 'hue',
  trouser: '#f6f2e8',
  trouserShade: '#d9d1c0',
  fringe: true,
  tunic: { buttons: true, piping: '#e2b04a' },
  shoeFront(x, y, { P }) {
    return P(`M${x - 2.4} ${y}c0 -1.6 4.8 -1.6 4.8 0c0 1.3 -4.8 1.3 -4.8 0Z`, '#3b2420');
  },
  shoeSide(x, y, { P }, far) {
    // hài mũi cong: toe curls up at the front (left)
    return P(`M${x + 2.2} ${y - 0.9}c0 1.6 -1 2 -3.2 2c-1.4 0 -2 -0.4 -2.4 -1.3l-0.5 -1.3c0.9 0.4 1.6 0.4 2.2 0.1Z`, far ? '#2b1915' : '#3b2420');
  },
  hatFront(y, { P, L }, back) {
    const top = y - 12.6, bot = y - 4.2;
    const dip = back ? 0.6 : 2; // front: the wraps meet in a "chữ nhân" point on the forehead
    let s = P(`M11.8 ${bot}C11.2 ${top + 2} 15 ${top - 0.8} 24 ${top - 0.8}S36.8 ${top + 2} 36.2 ${bot}C33 ${bot + 1.2} 28 ${bot + 0.3} 24 ${bot + dip}C20 ${bot + 0.3} 15 ${bot + 1.2} 11.8 ${bot}Z`, KHAN.main);
    s += P(`M15.6 ${top + 1.6}C17 ${top - 0.2} 31 ${top - 0.2} 32.4 ${top + 1.6}C30 ${top + 2.8} 18 ${top + 2.8} 15.6 ${top + 1.6}Z`, KHAN.inner, { sw: 0.6 });
    if (back) {
      s += L(`M12.4 ${top + 5}C18 ${top + 6.6} 30 ${top + 6.6} 35.6 ${top + 5}M12.2 ${top + 7.4}C18 ${top + 9} 30 ${top + 9} 35.8 ${top + 7.4}`, KHAN.fold, { sw: 0.75 });
    } else {
      s += L(`M13 ${top + 4.6}C17 ${top + 5.6} 21 ${top + 7.4} 24 ${bot + 1.6}M35 ${top + 4.6}C31 ${top + 5.6} 27 ${top + 7.4} 24 ${bot + 1.6}`, KHAN.fold, { sw: 0.8 });
      s += L(`M12.4 ${top + 7}C16 ${top + 7.6} 19.5 ${top + 8.6} 22 ${bot + 1.2}M35.6 ${top + 7}C32 ${top + 7.6} 28.5 ${top + 8.6} 26 ${bot + 1.2}`, KHAN.fold, { sw: 0.75 });
      s += L(`M17 ${top + 2.8}C20 ${top + 3.6} 28 ${top + 3.6} 31 ${top + 2.8}`, KHAN.hi, { sw: 0.75 });
    }
    return s;
  },
  hatSide(y, { P, L }) {
    const top = y - 12.6, bot = y - 4.4;
    let s = P(`M13 ${bot + 0.8}C12 ${top + 3} 16 ${top - 0.6} 24 ${top - 0.6}S36.6 ${top + 2} 36 ${bot - 0.4}C30 ${bot + 0.8} 24 ${bot + 0.6} 18 ${bot + 1.4}C16 ${bot + 1.6} 14 ${bot + 1.4} 13 ${bot + 0.8}Z`, KHAN.main);
    s += P(`M17 ${top + 1.2}C20 ${top - 0.4} 30 ${top - 0.4} 33 ${top + 1.4}C30 ${top + 2.4} 20 ${top + 2.4} 17 ${top + 1.2}Z`, KHAN.inner, { sw: 0.6 });
    s += L(`M13.4 ${top + 5.4}C19 ${top + 4.4} 27 ${top + 5.6} 35.6 ${top + 4.2}M13 ${top + 7.8}C19 ${top + 6.8} 28 ${top + 8} 35.8 ${top + 6.6}`, KHAN.fold, { sw: 0.75 });
    s += L(`M14 ${bot}C16 ${top + 6} 18 ${top + 4} 21 ${top + 2.4}`, KHAN.fold, { sw: 0.75 });
    s += L(`M18 ${top + 2.6}C22 ${top + 2} 28 ${top + 2.2} 32 ${top + 2.4}`, KHAN.hi, { sw: 0.7 });
    return s;
  },
  front(p, k, back) {
    return legsFront(p, k, this, back) + longTunicFront(p, k, back, this.tunic) + sleevesFront(p, k);
  },
  hipY: 48,
  sideParts(p, k) {
    return { farLeg: legSide(p, k, this, -1), back: longTunicSideBack(p, k), nearLeg: legSide(p, k, this, 1), front: longTunicSideFront(p, k, this.tunic), arm: sleeveSide(p, k) };
  },
  side(p, k) {
    const q = this.sideParts(p, k);
    return q.farLeg + q.back + q.nearLeg + q.front + q.arm;
  },
};


/* ---------- Thăng Long: áo the (long tunic) + khăn xếp đen ---------- */
const XEP = { main: '#3b3552', fold: '#7a7399', hi: '#9d97bb', inner: '#221e31' };
const THANG_LONG = {
  ...HUE,
  slug: 'thang-long',
  prefix: 'tl',
  tunic: { buttons: true, piping: null },
  shoeFront(x, y, { P }) {
    return P(`M${x - 2.4} ${y}c0 -1.6 4.8 -1.6 4.8 0c0 1.3 -4.8 1.3 -4.8 0Z`, '#1f1b1d');
  },
  shoeSide(x, y, { P }, far) {
    return P(`M${x + 2.2} ${y - 0.9}v1.2c0 0.6 -0.6 0.9 -1.6 0.9h-2.6c-1.2 0 -1.6 -0.8 -1 -1.6c0.6 -0.6 2 -0.5 2.6 -0.5Z`, far ? '#151214' : '#1f1b1d');
  },
  // khăn xếp: a ready-made pleated band, rounder and lower than the khăn đóng, flat crown
  hatFront(y, { P, L }, back) {
    const top = y - 12, bot = y - 4.6;
    let s = P(`M11.6 ${bot}C11 ${top + 1.6} 15 ${top - 0.6} 24 ${top - 0.6}S37 ${top + 1.6} 36.4 ${bot}C32 ${bot + 1} 16 ${bot + 1} 11.6 ${bot}Z`, XEP.main);
    s += P(`M16 ${top + 1}C18 ${top - 0.4} 30 ${top - 0.4} 32 ${top + 1}C30 ${top + 2} 18 ${top + 2} 16 ${top + 1}Z`, XEP.inner, { sw: 0.6 });
    for (const dy of [3, 5, 7]) s += L(`M12.2 ${top + dy}C18 ${top + dy + 1.2} 30 ${top + dy + 1.2} 35.8 ${top + dy}`, XEP.fold, { sw: 0.7 });
    if (!back) s += L(`M17 ${top + 2.2}C21 ${top + 2.8} 27 ${top + 2.8} 31 ${top + 2.2}`, XEP.hi, { sw: 0.6 });
    return s;
  },
  hatSide(y, { P, L }) {
    const top = y - 12, bot = y - 4.8;
    let s = P(`M12.6 ${bot + 0.6}C12 ${top + 2.6} 16 ${top - 0.4} 24 ${top - 0.4}S36.6 ${top + 2} 36 ${bot}C30 ${bot + 1} 18 ${bot + 1.2} 12.6 ${bot + 0.6}Z`, XEP.main);
    s += P(`M17 ${top + 1}C20 ${top - 0.2} 30 ${top - 0.2} 33 ${top + 1.2}C30 ${top + 2} 20 ${top + 2} 17 ${top + 1}Z`, XEP.inner, { sw: 0.6 });
    for (const dy of [3, 5, 7]) s += L(`M13 ${top + dy}C19 ${top + dy + 0.6} 29 ${top + dy + 0.6} 35.8 ${top + dy - 0.4}`, XEP.fold, { sw: 0.7 });
    return s;
  },
};

/* ---------- Hội An: áo bà ba + nón lá ---------- */
const LA = { main: '#ecd59a', shade: '#cfae66', rib: '#b58f48', band: '#c0392b' };
const BB_HEM = 47.6;
const HOI_AN = {
  slug: 'hoi-an',
  prefix: 'hoian',
  trouser: '#34303a',
  trouserShade: '#24212a',
  fringe: true,
  bun: true,
  shoeFront(x, y, { P }) {
    // guốc mộc
    return P(`M${x - 2.3} ${y - 0.6}h4.6v1.2c0 0.6 -4.6 0.6 -4.6 0Z`, '#9a6a3a');
  },
  shoeSide(x, y, { P }, far) {
    return P(`M${x + 2} ${y - 0.8}v1.3h-4.6c-0.4 0 -0.6 -0.4 -0.4 -0.8l0.4 -0.5Z`, far ? '#7a5230' : '#9a6a3a');
  },
  // nón lá: wide cone, the brim shades the eyes a little in the front view
  hatFront(y, { P, L, E }, back) {
    const apexY = y - 17.6, brimY = y - 4.6;
    let s = P(`M24 ${apexY}L${6.4} ${brimY}C10 ${brimY + 3.2} 38 ${brimY + 3.2} 41.6 ${brimY}Z`, LA.main);
    s += P(`M24 ${apexY}L41.6 ${brimY}C39 ${brimY + 2.2} 33 ${brimY + 2.8} 28 ${brimY + 3}Z`, LA.shade, { stroke: false });
    for (const t of [0.35, 0.62, 0.86]) s += L(`M${24 - 17.6 * t} ${apexY + (brimY - apexY) * t + 1.4 * t}C${24 - 6 * t} ${apexY + (brimY - apexY) * t + 3 * t} ${24 + 6 * t} ${apexY + (brimY - apexY) * t + 3 * t} ${24 + 17.6 * t} ${apexY + (brimY - apexY) * t + 1.4 * t}`, LA.rib, { sw: 0.6 });
    return s;
  },
  hatSide(y, { P, L }) {
    const apexY = y - 17.6, brimY = y - 4.2;
    let s = P(`M24.6 ${apexY}L${7} ${brimY - 1}C11 ${brimY + 2.6} 37 ${brimY + 2.6} 41.2 ${brimY + 0.4}Z`, LA.main);
    s += P(`M24.6 ${apexY}L41.2 ${brimY + 0.4}C38 ${brimY + 2} 33 ${brimY + 2.4} 29 ${brimY + 2.6}Z`, LA.shade, { stroke: false });
    for (const t of [0.35, 0.62, 0.86]) s += L(`M${24.6 - 17.6 * t} ${apexY + (brimY - 1 - apexY) * t + t}C${24 - 6 * t} ${apexY + (brimY - apexY) * t + 2.4 * t} ${25 + 6 * t} ${apexY + (brimY - apexY) * t + 2.4 * t} ${24.6 + 16.6 * t} ${apexY + (brimY + 0.4 - apexY) * t + t}`, LA.rib, { sw: 0.6 });
    return s;
  },
  front(p, k, back) {
    const { P, L, E } = k;
    const b = p.bob, w = p.sway * 0.6;
    let s = '';
    // wide silk trousers (quần lụa) — longer, so draw as a single flared shape per leg
    for (const side of [-1, 1]) {
      const lifted = side === -1 ? p.stride > 0 : p.stride < 0;
      const lift = lifted ? 2 : 0, x = 24 + side * 2.6;
      s += P(`M${x - 2.4} 45h4.8l0.4 ${14 - lift}c-1.4 0.8 -4.2 0.8 -5.6 0Z`, lifted ? this.trouserShade : this.trouser);
      s += this.shoeFront(x, 60.4 - lift, k);
    }
    // áo bà ba: hip-length, side slits, centre button placket
    s += P(`M17.6 ${35.2 + b}C19.6 ${33.6 + b} 28.4 ${33.6 + b} 30.4 ${35.2 + b}L29.4 ${43 + b}C29.6 ${45} 29.8 ${46.4} ${30 + w} ${BB_HEM}C27 ${BB_HEM + 1} 21 ${BB_HEM + 1} ${18 + w} ${BB_HEM}C18.2 ${46.4} 18.4 ${45} 18.6 ${43 + b}Z`, G.main, { tint: true });
    if (!back) {
      s += P(`M27.4 ${35.6 + b}C28.6 ${35.8 + b} 29.6 ${36.1 + b} 30.1 ${36.8 + b}L29.2 ${43 + b}C29.4 ${45} 29.6 ${46.4} ${29.7 + w} ${BB_HEM - 0.3}C28.6 ${BB_HEM + 0.4} 27.6 ${BB_HEM + 0.6} 26.8 ${BB_HEM + 0.7}C27 ${44} 26.9 ${40} 27.4 ${35.6 + b}Z`, G.shade, { tint: true, stroke: false });
      s += L(`M24 ${35 + b}V${BB_HEM + 0.6}`, G.line, { tint: true, sw: 0.65 });
      for (const by of [37.4, 40.4, 43.4]) s += E(24.9, by + b, 0.42, 0.42, G.deep, { tint: true, stroke: false });
      // pockets
      s += L(`M19.8 ${44 + b}h2.8M25.4 ${44 + b}h2.8`, G.line, { tint: true, sw: 0.55 });
      // round neck
      s += P(`M21.6 ${33.2 + b}C22.6 ${35.4 + b} 25.4 ${35.4 + b} 26.4 ${33.2 + b}Z`, SKIN.shade, { sw: 0.7 });
    } else {
      s += L(`M24 ${36 + b}v${BB_HEM - 36.5 - b}`, G.shade, { tint: true, sw: 0.7 });
    }
    s += sleevesFront(p, k);
    return s;
  },
  hipY: 45,
  side(p, k) {
    const q = this.sideParts(p, k);
    return q.farLeg + q.back + q.nearLeg + q.front + q.arm;
  },
  sideParts(p, k) {
    const { P, L } = k;
    const b = p.bob, st = p.stride;
    const leg = (ph) => {
      const dx = -st * ph * 2.3, lift = st && ph * st > 0 ? 0.8 : 0, x = 24 + dx;
      return P(`M${x - 2.2} 45h4.4l0.4 ${14.2 - lift}c-1.4 0.8 -3.8 0.8 -5.2 0Z`, ph < 0 ? this.trouserShade : this.trouser) + this.shoeSide(x, 60.4 - lift, k, ph < 0);
    };
    let s = '';
    s += P(`M20.2 ${35.4 + b}C21.6 ${34 + b} 26.4 ${34 + b} 27.8 ${35.6 + b}L27.6 ${43 + b}C27.8 ${45} 28 ${46.4} ${28.4 + st * 0.6} ${BB_HEM}C25.6 ${BB_HEM + 0.8} 22.4 ${BB_HEM + 0.8} ${19.4 - st * 0.6} ${BB_HEM}C19.6 ${46.4} 19.8 ${45} 20.2 ${43 + b}Z`, G.main, { tint: true });
    s += L(`M21 ${36 + b}V${BB_HEM}`, G.line, { tint: true, sw: 0.6 });
    return { farLeg: leg(-1), back: '', nearLeg: leg(1), front: s, arm: sleeveSide(p, k) };
  },
};

/* ------------------------------------------------------------ frame assembly */
const HEAD_S = 1.26, BODY_SX = 1.6, BODY_SY = 1.06;
const headG = (inner) => `<g transform="translate(24 33.4) scale(${HEAD_S}) translate(-24 -33.4)">${inner}</g>`;
const bodyG = (inner) => `<g transform="translate(24 62.4) scale(${BODY_SX} ${BODY_SY}) translate(-24 -62.4)">${inner}</g>`;
function frameSvg(c, dir, i, mode) {
  const kb = painter(mode, Math.sqrt(BODY_SX * BODY_SY));
  const kh = painter(mode, HEAD_S);
  const p = pose(i);
  let s = '';
  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    s += bodyG(c.front(p, kb, back));
    s += headG(headFront(p, kh, c, back));
  } else {
    s += bodyG(c.side(p, kb));
    s += headG(headSide(p, kh, c));
    if (dir === 'right') s = `<g transform="translate(${FW} 0) scale(-1 1)">${s}</g>`;
  }
  const bg = mode === 'mask' ? `<rect width="${FW}" height="${FH}" fill="#000"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FW * SS}" height="${FH * SS}" viewBox="0 0 ${FW} ${FH}">${bg}${s}</svg>`;
}

async function renderFrame(c, dir, i) {
  const col = await sharp(Buffer.from(frameSvg(c, dir, i, 'color'))).resize(FW, FH, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  const mask = await sharp(Buffer.from(frameSvg(c, dir, i, 'mask'))).resize(FW, FH, { kernel: 'lanczos3' }).greyscale().raw().toBuffer();
  const tint = Buffer.from(col);
  for (let px = 0; px < FW * FH; px++) {
    const m = mask[px] / 255;
    tint[px * 4 + 3] = Math.round(col[px * 4 + 3] * (m > 0.97 ? 1 : m < 0.05 ? 0 : m));
  }
  const toPng = (raw) => sharp(raw, { raw: { width: FW, height: FH, channels: 4 } }).png().toBuffer();
  return { base: await toPng(col), tint: await toPng(tint) };
}

const sheet = (bufs) =>
  sharp({ create: { width: FW * 4, height: FH * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(bufs.map((b, n) => ({ input: b, left: (n % 4) * FW, top: Math.floor(n / 4) * FH })))
    .png()
    .toBuffer();

function atlasJson(image) {
  const frames = {};
  DIRS.forEach((d, r) => {
    for (let c = 0; c < 4; c++)
      frames[`walk-${d}-${c}`] = {
        frame: { x: c * FW, y: r * FH, w: FW, h: FH },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: FW, h: FH },
        sourceSize: { w: FW, h: FH },
      };
  });
  return { frames, meta: { app: 'the-hidden-truth/char-art', image, size: { w: FW * 4, h: FH * 4 }, scale: '1' } };
}

/** Preview: tinted with a few player colours, upscaled (nearest) for review. */
async function preview(baseSheet, tintSheet) {
  const COLORS = [0xe8524a, 0x3f7fd9, 0x3fae5a, 0xf2c230, 0xa05bd6, 0xf4f0e6];
  const { data: b } = await sharp(baseSheet).raw().toBuffer({ resolveWithObject: true });
  const { data: t } = await sharp(tintSheet).raw().toBuffer({ resolveWithObject: true });
  const W = FW * 4, H = FH * 4;
  const tiles = [];
  for (const col of COLORS) {
    const out = Buffer.from(b);
    const cr = (col >> 16) & 255, cg = (col >> 8) & 255, cb = col & 255;
    for (let i = 0; i < W * H; i++) {
      const a = t[i * 4 + 3] / 255;
      if (!a) continue;
      for (const [o, cc] of [[0, cr], [1, cg], [2, cb]]) out[i * 4 + o] = Math.round(out[i * 4 + o] * (1 - a) + ((t[i * 4 + o] * cc) / 255) * a);
    }
    tiles.push(await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer());
  }
  const Z = 3;
  const cw = W * Z, ch = H * Z;
  const scaled = await Promise.all(tiles.map((x) => sharp(x).resize(cw, ch, { kernel: 'nearest' }).png().toBuffer()));
  return sharp({ create: { width: cw * 3 + 40, height: ch * 2 + 30, channels: 4, background: '#b5643c' } })
    .composite(scaled.map((x, n) => ({ input: x, left: 10 + (n % 3) * (cw + 10), top: 10 + Math.floor(n / 3) * (ch + 10) })))
    .png()
    .toBuffer();
}

/* ------------------------------------------------------------ action poses (cinematics + world FX)
 * Side view facing LEFT, 96x64 frames (anchor bottom-centre at x=48 so lunges / lying bodies fit), 4 cols:
 *   row 0 strike  windup · dash · slash · follow-through   (Âm Binh, with a đao)
 *   row 1 die     hit · stagger · collapse · lying
 *   row 2 guard   raise · brace · pushed · relief
 * Built from the walk rig: legs rotate at the hip, torso+head lean around the hip, the arm swings at the shoulder.
 * Angles in degrees, SVG sense (+ = clockwise): torso/head + leans BACK, arm + swings FORWARD, leg + kicks FORWARD.
 */
const AW = 96, AX = (AW - FW) / 2;
const ACTION_ROWS = ['strike', 'die', 'guard'];
const ACTION_POSES = {
  strike: [
    { torso: 14, head: 6, arm: -165, near: 18, far: -14, dx: 4, blade: true, brow: true },
    { torso: -24, head: -10, arm: -70, near: 36, far: -32, dx: -3, blade: true, brow: true },
    { torso: -18, head: -6, arm: 100, near: 32, far: -28, dx: -7, blade: true, brow: true },
    { torso: -28, head: -4, arm: 32, near: 30, far: -30, dx: -7, blade: true, brow: true },
  ],
  die: [
    { torso: 18, head: 16, arm: -55, near: -6, far: 10, dx: 3, hurt: true },
    { torso: 30, head: 24, arm: -95, near: 12, far: -18, dx: 6, hurt: true },
    { torso: 14, head: 18, arm: -120, near: 20, far: -6, whole: 52, wx: -8, wy: -11, hurt: true },
    { torso: 4, head: 6, arm: -160, near: 6, far: -4, whole: 90, wx: -24, wy: -17, closed: true },
  ],
  guard: [
    { torso: 6, head: 4, arm: 150, near: 12, far: -10, dx: 1 },
    { torso: -10, head: -4, arm: 122, near: 24, far: -20, dx: -2, brow: true },
    { torso: 16, head: 12, arm: 70, near: -8, far: 14, dx: 5, hurt: true },
    { torso: 0, head: 0, arm: 0, near: 0, far: 0 },
  ],
};
// body groups scale around (24, 62.4): map a pre-scale y to frame y
const fy = (y) => 62.4 + (y - 62.4) * BODY_SY;
const rot = (a, x, y, inner) => (a ? `<g transform="rotate(${a} ${f(x)} ${f(y)})">${inner}</g>` : inner);

/** Curved đao held in the hand of a hanging arm (pre-scale coords): edge faces forward (-x). */
function dao(k) {
  const { P, L } = k;
  let s = P('M22.9 42.6h1.5v4.4h-1.5Z', '#4a2b1a', { sw: 0.5 });
  s += P('M21.6 46.9h4.1v1h-4.1Z', '#d9a63a', { sw: 0.45 });
  s += P('M22.6 47.9h2.2C25.4 52 25 56 23.4 60.4C22.6 61.6 21.2 61.8 20.4 61.4C21.8 57 22.4 52.6 22.6 47.9Z', '#dfe6ee', { sw: 0.55 });
  s += L('M24.2 48.6C24.6 52 24.2 56 23 59.6', '#ffffff', { sw: 0.5 });
  return s;
}

function actionSvg(c, a, mode) {
  const kb = painter(mode, Math.sqrt(BODY_SX * BODY_SY));
  const kh = painter(mode, HEAD_S);
  const p = pose(0);
  const q = c.sideParts(p, kb);
  const hipY = c.hipY;
  // legs swing at their own hip; the arm (and blade) at the shoulder
  const leg = (part, ang) => rot(ang, 24, hipY, part);
  const arm = rot(a.arm, 24, 36.2, q.arm + (a.blade ? dao(kb) : ''));
  // keep the feet on the ground: spread legs shorten vertically
  const legLen = 60.4 - hipY;
  const drop = legLen * (1 - Math.cos((Math.max(Math.abs(a.near), Math.abs(a.far)) * Math.PI) / 180)) * BODY_SY;
  const hx = 24, hy = fy(hipY);
  let head = headSide(p, kh, c);
  const y = 22;
  if (a.closed) head += kh.E(16.4, y + 2.8, 1.8, 2.2, SKIN.main, { stroke: false }) + kh.L(`M14.9 ${y + 3.2}q1.5 1.1 3 0`, INK, { sw: 0.7 });
  else if (a.hurt) head += kh.E(16.4, y + 2.8, 1.7, 2.1, SKIN.main, { stroke: false }) + kh.L(`M15 ${y + 1.8}l2.8 2.2M17.8 ${y + 1.8}l-2.8 2.2`, INK, { sw: 0.7 });
  if (a.brow) head += kh.L(`M14.6 ${y - 0.4}l3.6 1.4`, INK, { sw: 0.8 });
  const upper = (inner) => rot(a.torso, hx, hy, inner);
  let s = '';
  s += bodyG(leg(q.farLeg, a.far));
  s += upper(bodyG(q.back));
  s += bodyG(leg(q.nearLeg, a.near));
  s += upper(bodyG(q.front) + rot(a.head, 24, 33.4, headG(head)) + bodyG(arm));
  s = `<g transform="translate(${f(AX + (a.dx || 0))} ${f(drop)})">${s}</g>`;
  if (a.whole) s = `<g transform="translate(${a.wx} ${a.wy}) rotate(${a.whole} ${AW / 2} 62)">${s}</g>`;
  const bg = mode === 'mask' ? `<rect width="${AW}" height="${FH}" fill="#000"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${AW * SS}" height="${FH * SS}" viewBox="0 0 ${AW} ${FH}">${bg}${s}</svg>`;
}

async function renderAction(c, a) {
  const col = await sharp(Buffer.from(actionSvg(c, a, 'color'))).resize(AW, FH, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  const mask = await sharp(Buffer.from(actionSvg(c, a, 'mask'))).resize(AW, FH, { kernel: 'lanczos3' }).greyscale().raw().toBuffer();
  const tint = Buffer.from(col);
  for (let px = 0; px < AW * FH; px++) {
    const m = mask[px] / 255;
    tint[px * 4 + 3] = Math.round(col[px * 4 + 3] * (m > 0.97 ? 1 : m < 0.05 ? 0 : m));
  }
  const toPng = (raw) => sharp(raw, { raw: { width: AW, height: FH, channels: 4 } }).png().toBuffer();
  return { base: await toPng(col), tint: await toPng(tint) };
}

const actionSheet = (bufs) =>
  sharp({ create: { width: AW * 4, height: FH * ACTION_ROWS.length, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(bufs.map((b, n) => ({ input: b, left: (n % 4) * AW, top: Math.floor(n / 4) * FH })))
    .png()
    .toBuffer();

function actionJson(image) {
  const frames = {};
  ACTION_ROWS.forEach((r, ri) => {
    for (let c = 0; c < 4; c++)
      frames[`${r}-${c}`] = {
        frame: { x: c * AW, y: ri * FH, w: AW, h: FH },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: AW, h: FH },
        sourceSize: { w: AW, h: FH },
      };
  });
  return { frames, meta: { app: 'the-hidden-truth/char-art', image, size: { w: AW * 4, h: FH * ACTION_ROWS.length }, scale: '1' } };
}

const COSTUMES = [HUE, HOI_AN, THANG_LONG];

for (const c of COSTUMES) {
  if (ONLY && c.slug !== ONLY) continue;
  const base = [], tint = [];
  for (const d of DIRS)
    for (let i = 0; i < 4; i++) {
      const r = await renderFrame(c, d, i);
      base.push(r.base);
      tint.push(r.tint);
    }
  const bs = await sheet(base), ts = await sheet(tint);
  const rel = `maps/${c.slug}/characters`;
  const name = `${c.prefix}-player-atlas`, tname = `${c.prefix}-player-tint-atlas`;
  const OUT = path.join(ROOT, 'assets', rel), PUB = path.join(ROOT, 'apps/web/public/assets', rel), SRC = path.join(ROOT, 'assets/_src', rel);
  for (const d of [OUT, PUB, SRC]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.png`), bs);
  fs.writeFileSync(path.join(OUT, `${tname}.png`), ts);
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(atlasJson(`${name}.png`), null, 1));
  await sharp(bs).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  await sharp(ts).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${tname}.webp`));
  fs.writeFileSync(path.join(PUB, `${name}.json`), JSON.stringify(atlasJson(`${name}.webp`)));
  fs.writeFileSync(path.join(PUB, `${tname}.json`), JSON.stringify(atlasJson(`${tname}.webp`)));
  fs.writeFileSync(path.join(SRC, `${c.prefix}-player-preview.png`), await preview(bs, ts));
  console.log(`[char-art] ${c.slug}: ${name} + ${tname}`);

  const ab = [], at = [];
  for (const r of ACTION_ROWS)
    for (const a of ACTION_POSES[r]) {
      const x = await renderAction(c, a);
      ab.push(x.base);
      at.push(x.tint);
    }
  const abs = await actionSheet(ab), ats = await actionSheet(at);
  const an = `${c.prefix}-player-action`, atn = `${c.prefix}-player-action-tint`;
  fs.writeFileSync(path.join(OUT, `${an}.png`), abs);
  fs.writeFileSync(path.join(OUT, `${atn}.png`), ats);
  await sharp(abs).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${an}.webp`));
  await sharp(ats).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${atn}.webp`));
  fs.writeFileSync(path.join(PUB, `${an}.json`), JSON.stringify(actionJson(`${an}.webp`)));
  fs.writeFileSync(path.join(PUB, `${atn}.json`), JSON.stringify(actionJson(`${atn}.webp`)));
  fs.writeFileSync(path.join(SRC, `${c.prefix}-player-action-preview.png`), await sharp(await actionSheet(ab)).resize(AW * 4 * 3, FH * 3 * 3, { kernel: 'nearest' }).flatten({ background: '#b5643c' }).png().toBuffer());
  console.log(`[char-art] ${c.slug}: ${an} + ${atn}`);
}
