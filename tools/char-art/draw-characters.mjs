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
 *   sai-gon     áo khoác CRAB xanh (fixed) + nón bảo hiểm (tinted), jean, dép tổ ong + tất xanh;
 *               bigger rig (c.rig): 64x88 frames, 8 walk + 4 idle (idle-<dir>-<i>) per direction, 132x88 actions
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

/* ------------------------------------------------------------ rig size (per costume)
 * Everything is drawn in the 48x64 design space; `s` scales it up into a bigger frame (anchor bottom-centre),
 * `walk` frames per direction, optional `idle` row per direction, `aw` = action frame width.
 */
const RIG = { s: 1, fw: FW, fh: FH, walk: 4, idle: 0, aw: 96 };
const rigOf = (c) => ({ ...RIG, ...c.rig });
// map a design-space frame (w x h, bottom-centre anchor) into an output frame `ow` wide, r.fh tall
const scaled = (r, w, h, ow, inner) => (r.s === 1 ? inner : `<g transform="translate(${ow / 2} ${r.fh}) scale(${r.s}) translate(${-w / 2} ${-h})">${inner}</g>`);

/* ------------------------------------------------------------ walk cycle */
// 4 frames: 0 = contact, 1 = passing (left leg forward), 2 = contact, 3 = passing (right leg forward).
// Longer cycles sample the same sine, so the stride is continuous (legs/arms/bob read p.stride as a -1..1 amount).
function pose(i, n = 4) {
  if (n === 4) {
    const stride = [0, 1, 0, -1][i];
    return { i, stride, bob: [0, -0.8, 0, -0.8][i], sway: [0, 1, 0, -1][i] };
  }
  const stride = Math.round(Math.sin((2 * Math.PI * i) / n) * 1e4) / 1e4;
  return { i, stride, bob: -0.8 * Math.abs(stride), sway: stride };
}
// idle: 0 rest · 1 breathe in · 2 shrug · 3 scratch the hat (costumes read p.idle for the arms)
const idlePose = (j) => ({ i: j, stride: 0, bob: [0, -0.5, -0.4, 0][j], sway: 0, idle: j });

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

/* ---------- Sài Gòn: áo khoác CRAB xanh lá (fixed) + nón bảo hiểm (tinted), jean, dép tổ ong + tất xanh ----------
 * Bigger rig: the same 48x64 design scaled x1.375 into 64x88 frames, 8 walk frames, 4 idle frames per direction. */
const CRAB = { hi: '#63d483', main: '#23a94d', shade: '#17893b', deep: '#0e6a2b', logo: '#f3fbf1' };
const JEAN = { main: '#46689a', shade: '#324f78', hem: '#5b7fb3', seam: '#d6a446' };
const SOCK = { main: '#36c35b', shade: '#239f45' };
const DEP = { sole: '#eef2f5', side: '#a9bccb', strap: '#3b8fd4' };
const STRAP = '#262422';
const J_HEM = 48.6;

/** Smooth limb: a polygon of radius `r` around a polyline (round joins hide the corners). */
function tube(k, line, r, c, o = {}) {
  const L = [], R = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
    L.push([p[0] + nx * r, p[1] + ny * r]);
    R.push([p[0] - nx * r, p[1] - ny * r]);
  });
  return k.P(pts(L.concat(R.reverse())), c, o);
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Jacket sleeve shoulder -> elbow -> hand, ribbed cuff, hand on top. */
function sleeve(k, sh, el, hd, far = false) {
  let s = tube(k, [sh, el, hd], 1.45, far ? CRAB.shade : CRAB.main);
  s += tube(k, [lerp2(el, hd, 0.72), hd], 1.55, CRAB.deep, { sw: 0.7 });
  return s + handE(k, hd[0], hd[1] + 0.2);
}
/** Little white crab (logo): shell, two claws, legs, eye dots. */
function crabLogo(k, cx, cy, sc = 1) {
  const { E, L } = k;
  const c = CRAB.logo;
  let s = L(`M${cx - 1.6 * sc} ${cy + 0.4 * sc}l-1.2 ${0.9 * sc}M${cx - 1.3 * sc} ${cy + 0.9 * sc}l-0.8 ${1.1 * sc}M${cx + 1.6 * sc} ${cy + 0.4 * sc}l1.2 ${0.9 * sc}M${cx + 1.3 * sc} ${cy + 0.9 * sc}l0.8 ${1.1 * sc}`, c, { sw: 0.5 });
  s += L(`M${cx - 1.4 * sc} ${cy - 0.4 * sc}q-0.9 -0.8 -1.1 ${-1.8 * sc}M${cx + 1.4 * sc} ${cy - 0.4 * sc}q0.9 -0.8 1.1 ${-1.8 * sc}`, c, { sw: 0.55 });
  s += E(cx - 2.6 * sc, cy - 2.3 * sc, 0.75 * sc, 0.65 * sc, c, { stroke: false });
  s += E(cx + 2.6 * sc, cy - 2.3 * sc, 0.75 * sc, 0.65 * sc, c, { stroke: false });
  s += E(cx, cy, 2 * sc, 1.3 * sc, c, { stroke: false });
  s += E(cx - 0.6 * sc, cy - 0.3 * sc, 0.22 * sc, 0.22 * sc, CRAB.deep, { stroke: false }) + E(cx + 0.6 * sc, cy - 0.3 * sc, 0.22 * sc, 0.22 * sc, CRAB.deep, { stroke: false });
  return s;
}
/** "CRAB" in block strokes, 4 letters of w x h centred at cx (body coords: x is stretched x1.6 later, so letters are drawn narrow). */
function crabWord(k, cx, y, w = 2.3, h = 2.9, gap = 0.45) {
  let x = cx - (4 * w + 3 * gap) / 2;
  const m = h / 2;
  const G4 = [
    `M${x + w} ${y + 0.2}C${x + 0.2} ${y - 0.3} ${x} ${y + 0.6} ${x} ${y + m}S${x + 0.2} ${y + h + 0.3} ${x + w} ${y + h - 0.2}`,
    `M${(x += w + gap)} ${y + h}V${y}H${x + w * 0.62}C${x + w * 1.05} ${y} ${x + w * 1.05} ${y + m} ${x + w * 0.62} ${y + m}H${x}M${x + w * 0.5} ${y + m}L${x + w} ${y + h}`,
    `M${(x += w + gap)} ${y + h}L${x + w / 2} ${y}L${x + w} ${y + h}M${x + w * 0.24} ${y + h * 0.64}H${x + w * 0.76}`,
    `M${(x += w + gap)} ${y + h}V${y}H${x + w * 0.58}C${x + w} ${y} ${x + w} ${y + m} ${x + w * 0.58} ${y + m}H${x}M${x + w * 0.58} ${y + m}C${x + w * 1.06} ${y + m} ${x + w * 1.06} ${y + h} ${x + w * 0.58} ${y + h}H${x}`,
  ];
  return G4.map((d) => k.L(d, CRAB.logo, { sw: 0.95 })).join('');
}

const SAI_GON = {
  slug: 'sai-gon',
  prefix: 'sg',
  // walk/idle frames are wider: the driver rides a scooter (see `ride`); actions stay on foot
  rig: { s: 1.375, fw: 80, fh: 88, walk: 8, idle: 4, aw: 132 },
  trouser: JEAN.main,
  trouserShade: JEAN.shade,
  fringe: true,
  // nón bảo hiểm nửa đầu: the shell is the tinted part (it's how you tell players apart — every jacket is green)
  hatFront(y, { P, L, E }, back) {
    const top = y - 14.4, bot = y - 3.4;
    let s = '';
    // chin strap under the shell, down the cheeks
    if (!back) s += L(`M12.6 ${bot + 0.4}C12.8 ${y + 4} 14.6 ${y + 8.4} 19.4 ${y + 10.2}M35.4 ${bot + 0.4}C35.2 ${y + 4} 33.4 ${y + 8.4} 28.6 ${y + 10.2}`, STRAP, { sw: 0.7 });
    s += P(`M10.6 ${bot + 0.2}C9.8 ${top + 3.4} 15 ${top} 24 ${top}S38.2 ${top + 3.4} 37.4 ${bot + 0.2}C33 ${bot + 1.6} 15 ${bot + 1.6} 10.6 ${bot + 0.2}Z`, G.main, { tint: true });
    s += P(`M30.4 ${top + 0.9}C35 ${top + 2.6} 37.8 ${top + 5.8} 37.4 ${bot + 0.2}C35.8 ${bot + 0.9} 33.8 ${bot + 1.2} 31.8 ${bot + 1.3}C32.8 ${top + 6.4} 32.2 ${top + 3.2} 30.4 ${top + 0.9}Z`, G.shade, { tint: true, stroke: false });
    s += P(`M15.4 ${top + 3.8}C17.6 ${top + 1.6} 20.8 ${top + 0.9} 23.2 ${top + 1}C20.6 ${top + 2.2} 18.2 ${top + 4} 16.8 ${top + 6}Z`, G.hi, { tint: true, stroke: false });
    s += L(`M11.2 ${bot - 1}C16 ${bot + 0.5} 32 ${bot + 0.5} 36.8 ${bot - 1}`, G.line, { tint: true, sw: 0.7 });
    if (!back) {
      // short visor + a tiny brand sticker
      s += P(`M14 ${bot}C18 ${bot + 3} 30 ${bot + 3} 34 ${bot}C30 ${bot + 1.3} 18 ${bot + 1.3} 14 ${bot}Z`, G.deep, { tint: true, sw: 0.8 });
      s += L(`M21.6 ${top + 2.6}h4.8`, G.line, { tint: true, sw: 0.6 });
    } else {
      s += L(`M19.6 ${top + 3}c1.4 -0.6 7.4 -0.6 8.8 0M19 ${top + 5.2}c1.6 -0.6 8.4 -0.6 10 0`, G.line, { tint: true, sw: 0.6 });
      s += P(`M21 ${bot - 3.4}h6v1.7h-6Z`, '#f2b33b', { sw: 0.5 }); // reflective sticker
    }
    return s;
  },
  hatSide(y, { P, L }) {
    const top = y - 14.2, bot = y - 3.6;
    let s = L(`M27.6 ${bot + 1.2}C27.8 ${y + 4.6} 25 ${y + 9.4} 20.4 ${y + 10.4}`, STRAP, { sw: 0.7 }); // ear -> under the chin
    s += P(`M11.8 ${bot + 0.8}C10.8 ${top + 3.4} 16 ${top} 24.6 ${top}S38 ${top + 3.6} 36.8 ${bot}C30 ${bot + 1.4} 18 ${bot + 1.4} 11.8 ${bot + 0.8}Z`, G.main, { tint: true });
    s += P(`M29 ${top + 0.6}C34 ${top + 1.8} 37.6 ${top + 4.8} 36.8 ${bot}C34.4 ${bot + 0.8} 32 ${bot + 1.1} 30.4 ${bot + 1.2}C31.6 ${top + 6} 31 ${top + 2.6} 29 ${top + 0.6}Z`, G.shade, { tint: true, stroke: false });
    s += P(`M14.6 ${top + 4.6}C16 ${top + 2.2} 19 ${top + 0.8} 21.6 ${top + 0.8}C19.4 ${top + 2} 17.4 ${top + 4} 16.2 ${top + 6}Z`, G.hi, { tint: true, stroke: false });
    s += L(`M12.4 ${bot - 0.4}C18 ${bot + 0.6} 30 ${bot + 0.4} 36.2 ${bot - 1}`, G.line, { tint: true, sw: 0.7 });
    s += P(`M15.6 ${bot + 0.6}C13 ${bot + 0.9} 10.4 ${bot + 1.6} 9.2 ${bot + 2.8}C12 ${bot + 3.1} 15 ${bot + 2.6} 17.4 ${bot + 1.4}Z`, G.deep, { tint: true, sw: 0.8 });
    s += P(`M31.4 ${bot - 3.4}h4v1.6h-4.2Z`, '#f2b33b', { sw: 0.5 });
    return s;
  },
  feetFront(x, y, k) {
    const { P, L } = k;
    let s = P(`M${x - 1.9} ${y - 2.2}h3.8v2.1c0 0.7 -3.8 0.7 -3.8 0Z`, SOCK.main, { sw: 0.7 }); // the green socks
    s += P(`M${x - 2.5} ${y + 0.1}c0 -1 5 -1 5 0c0 1.1 -5 1.1 -5 0Z`, DEP.sole, { sw: 0.7 });
    s += P(`M${x - 2.1} ${y - 1.3}h4.2v1h-4.2Z`, DEP.strap, { sw: 0.5 });
    return s + L(`M${x - 1.2} ${y - 0.8}h0.4M${x + 0.8} ${y - 0.8}h0.4`, '#ffffff', { sw: 0.4 }); // dép tổ ong holes
  },
  feetSide(x, y, k, far) {
    const { P, E } = k;
    let s = P(`M${x - 1.6} ${y - 2.6}h3.4v2.2h-3.4Z`, far ? SOCK.shade : SOCK.main, { sw: 0.7 });
    s += E(x - 1.7, y - 0.8, 1.6, 1, far ? SOCK.shade : SOCK.main, { sw: 0.7 });
    s += P(`M${x + 2.2} ${y - 0.3}v1h-5.8c-0.5 0 -0.7 -0.6 -0.2 -1Z`, far ? DEP.side : DEP.sole, { sw: 0.6 });
    return s + P(`M${x - 2.8} ${y - 1.6}h2.6v1h-2.6Z`, DEP.strap, { sw: 0.45 });
  },
  front(p, k, back) {
    const { P, L, E } = k;
    const b = p.bob, w = p.sway * 0.6;
    let s = '';
    for (const side of p.ride ? [] : [-1, 1]) {
      const v = side === -1 ? p.stride : -p.stride, lift = 2 * Math.max(0, v), x = 24 + side * 2.6;
      s += P(`M${x - 2.3} 46.2h4.6l0.2 ${11.6 - lift}h-5Z`, v > 0.2 ? JEAN.shade : JEAN.main);
      s += P(`M${x - 2.5} ${57.4 - lift}h5v1.3h-5Z`, JEAN.hem, { sw: 0.6 }); // rolled-up hem: shows off the socks
      s += L(`M${x + side * 1.1} 47v${9.6 - lift}`, JEAN.seam, { sw: 0.4 });
      s += this.feetFront(x, 60.6 - lift, k);
    }
    // jacket: zip-up, ribbed waistband, collar up
    s += P(`M17.4 ${35 + b}C19.6 ${33.4 + b} 28.4 ${33.4 + b} 30.6 ${35 + b}L29.9 ${45.4 + b}C30 ${46.6} 30.1 ${47.6} ${30.3 + w} ${J_HEM}C27 ${J_HEM + 0.9} 21 ${J_HEM + 0.9} ${17.7 + w} ${J_HEM}C17.9 ${47.6} 18 ${46.6} 18.1 ${45.4 + b}Z`, CRAB.main);
    s += P(`M27.6 ${35.2 + b}C28.8 ${35.4 + b} 29.8 ${35.8 + b} 30.4 ${36.4 + b}L29.7 ${45.4 + b}C29.8 ${46.6} 29.9 ${47.6} ${30 + w} ${J_HEM - 0.3}C29 ${J_HEM + 0.4} 28 ${J_HEM + 0.6} 27.2 ${J_HEM + 0.7}C27.4 ${44} 27.2 ${40} 27.6 ${35.2 + b}Z`, CRAB.shade, { stroke: false });
    s += P(`M${17.9 + w} ${J_HEM - 1.5}C21 ${J_HEM - 0.8} 27 ${J_HEM - 0.8} ${30.1 + w} ${J_HEM - 1.5}L${30.3 + w} ${J_HEM}C27 ${J_HEM + 0.9} 21 ${J_HEM + 0.9} ${17.7 + w} ${J_HEM}Z`, CRAB.deep, { sw: 0.6 });
    if (!back) {
      s += L(`M24 ${34.8 + b}V${J_HEM + 0.6}`, CRAB.deep, { sw: 0.7 });
      s += P(`M24.2 ${37 + b}h0.9v1.8h-0.9Z`, '#d9dde0', { sw: 0.35 }); // zip pull
      s += L(`M19.6 ${43.4 + b}l1.4 2M28.4 ${43.4 + b}l-1.4 2`, CRAB.deep, { sw: 0.6 }); // slash pockets
      s += crabLogo(k, 27.2, 38.4 + b, 0.42);
      s += P(`M20.2 ${32.4 + b}l3.8 2.8l3.8 -2.8l0.7 1.6l-4.5 3l-4.5 -3Z`, CRAB.deep, { sw: 0.7 });
      s += P(`M21.8 ${33.2 + b}C22.6 ${34.8 + b} 25.4 ${34.8 + b} 26.2 ${33.2 + b}Z`, SKIN.shade, { sw: 0.6 });
    } else {
      // the back everyone recognises: crab + CRAB
      s += crabLogo(k, 24, 38.4 + b, 0.85);
      s += crabWord(k, 24, 41.6 + b);
      s += P(`M20.2 ${32.2 + b}C22 ${33.6 + b} 26 ${33.6 + b} 27.8 ${32.2 + b}l0.4 1.8C26 ${35 + b} 22 ${35 + b} 19.8 ${34 + b}Z`, CRAB.deep, { sw: 0.7 });
    }
    if (!p.ride) s += this.armsFront(p, k, back);
    return s;
  },
  armsFront(p, k) {
    const b = p.bob;
    let s = '';
    for (const side of [-1, 1]) {
      if (p.hands || (p.idle === 3 && side === 1)) continue; // raised arms are drawn over the head in `over`
      const sh = [24 + side * 5.6, 35.6 + b];
      if (p.idle === 2) {
        // shrug: elbows in, palms out
        s += sleeve(k, sh, [24 + side * 7.8, 40.4 + b], [24 + side * 10, 39.6 + b]);
        continue;
      }
      const sw = -p.stride * side * 1.3;
      s += sleeve(k, sh, [24 + side * 7.1, 40.2 + b + sw * 0.3], [24 + side * 7.5, 44.4 + b + sw * 0.5]);
    }
    return s;
  },
  over(p, k, dir) {
    if (p.hands) {
      // surrender (front view): 'half' = palms out at the shoulders, 'up' = both hands up beside the helmet
      const up = p.hands === 'up';
      return [-1, 1].map((sd) => sleeve(k, [24 + sd * 5.6, 35.6 + p.bob], [24 + sd * (up ? 10.4 : 9), (up ? 31.4 : 38.6) + p.bob], [24 + sd * (up ? 11.2 : 10.6), (up ? 23.6 : 33.4) + p.bob])).join('');
    }
    if (p.idle !== 3) return '';
    const b = p.bob;
    if (dir === 'left' || dir === 'right') return sleeve(k, [24, 36.4 + b], [29.8, 31.4 + b], [28.4, 25.6 + b]);
    return sleeve(k, [29.6, 35.6 + b], [35.8, 31 + b], [33.4, 24.6 + b]);
  },
  hipY: 46.4,
  /** Walk/idle frames on a xe tay ga: design coords (no body stretch); bike panels take the player colour. */
  ride(p, { kd, kb, kh }, dir) {
    const { P, E, L } = kd;
    const q = { ...p, ride: true, stride: 0, sway: 0, idle: undefined };
    const b = p.bob, bb = p.bob * 0.4; // rider bob, bike bounce
    const moving = p.idle === undefined;
    const TIRE = '#2b2b2e', RIM = '#c9ced3', CHROME = '#9aa3aa', SEAT = '#2d2a2a', LAMP = '#fff4c2';
    const jeanTube = (line, far) => tube(kd, line, 2, far ? JEAN.shade : JEAN.main);
    const arm = (sh, el, hd, far) => tube(kd, [sh, el, hd], 1.9, far ? CRAB.shade : CRAB.main) + tube(kd, [lerp2(el, hd, 0.7), hd], 2, CRAB.deep, { sw: 0.7 }) + E(hd[0], hd[1] + 0.2, 1.5, 1.6, SKIN.main);
    const at = (dy, inner) => `<g transform="translate(0 ${f(dy)})">${inner}</g>`;
    if (dir === 'left' || dir === 'right') {
      // facing left: front wheel at small x
      const wheel = (cx) => {
        const cy = 57.4, a = moving ? p.i * 27 : 0; // 5 spokes, 27°/frame loops over 8 frames
        let w = E(cx, cy, 5, 5, TIRE) + E(cx, cy, 3.2, 3.2, RIM, { sw: 0.6 });
        for (let j = 0; j < 5; j++) {
          const t = ((a + j * 72) * Math.PI) / 180;
          w += L(`M${cx} ${cy}L${f(cx + Math.cos(t) * 3)} ${f(cy + Math.sin(t) * 3)}`, '#7b838a', { sw: 0.7 });
        }
        return w + E(cx, cy, 1.1, 1.1, '#6f767c', { sw: 0.5 });
      };
      let s = wheel(40.4) + wheel(8.8);
      let bike = tube(kd, [[9.6, 55.6], [14.8, 39.4]], 0.9, CHROME); // fork
      bike += P('M30.4 56.2h9.4c1.2 0 1.2 2 0 2h-9.4Z', CHROME, { sw: 0.6 }); // exhaust
      bike += P('M3.6 55C5 51 12 49.6 14.6 54.2l-1 0.8C11.6 51.8 6.4 52.4 4.8 55.4Z', G.shade, { tint: true, sw: 0.7 }); // front fender
      // body: apron, floorboard, step-through, rear body up to the tail
      bike += P('M12.6 38.6C10.6 43 11 48.6 14.4 53.2L16.4 56H29C30.2 53.2 31.6 51.4 33.6 51L46.4 50.2C48.4 49.6 49.4 47.6 48.6 46L45.6 45.2L27 45.6C25.2 47.6 24.8 51 24.4 54.4H18C17.2 49 17 44 17.4 39.2Z', G.main, { tint: true });
      bike += P('M16.4 56H29C30.2 53.2 31.6 51.4 33.6 51L46.4 50.2C47.6 49.8 48.4 49 48.8 48.2C44 49.6 36 50.2 32.4 50.4C30.6 51.6 29.4 53.6 28.6 55H16.4Z', G.shade, { tint: true, stroke: false });
      bike += L('M13.4 44.4C13 47 13.8 50 15.6 52.4', G.hi, { tint: true, sw: 0.7 });
      bike += P('M24.2 45.6C24.4 43.2 27 42.4 30 42.6L44.2 43.2C46 43.4 46.8 44.4 46.6 45.4Z', SEAT, { sw: 0.8 }); // seat
      bike += P('M47.2 45.6h1.8v2.2h-1.6Z', '#e53935', { sw: 0.5 }); // tail light
      s += at(bb, bike);
      // rider: torso leans toward the bars, sits on the front of the seat
      const lean = `rotate(-12 28.4 46.4) translate(4 0)`;
      s += `<g transform="${lean}">${bodyG(this.sideParts(q, kb).front)}${headG(headSide(q, kh, this))}</g>`;
      // near leg: hip -> knee over the step-through -> foot on the floorboard
      s += jeanTube([[28.4, 46.6 + b], [20.6, 46.6 + b * 0.5], [19.8, 53.2]]);
      s += P('M17.4 53.6h3.8v1.4h-3.8Z', SOCK.main, { sw: 0.6 }) + P('M16.4 55h5.6c0.4 0 0.4 0.9 0 0.9h-5.6Z', DEP.sole, { sw: 0.5 });
      // bars: cowl + headlight + mirror, then the hand on the grip
      let bars = L('M15.4 37.6L13.8 32.4', CHROME, { sw: 0.7 }) + E(13.6, 31.8, 1.1, 0.8, '#3a3a3e', { sw: 0.5 });
      bars += P('M10.4 37.6C11.6 36.4 15.6 36.2 17.6 37.2L17.2 40C15 40.4 12 40.4 10.6 40Z', G.shade, { tint: true });
      bars += E(10.6, 38.8, 1.1, 1.2, LAMP, { sw: 0.6 });
      s += at(bb, bars);
      const sh = [25.4, 35.4 + b];
      s += arm(sh, [20.4, 39.6 + b], [16.2, 38.4 + bb]);
      return s;
    }
    const back = dir === 'up';
    const wheelV = () => {
      let w = P('M22.2 54.4C22.2 51.6 25.8 51.6 25.8 54.4V60.6C25.8 63.2 22.2 63.2 22.2 60.6Z', TIRE);
      for (let j = 0; j < 3; j++) w += L(`M22.8 ${f(54.4 + j * 2.6 + (moving ? (p.i % 2) * 1.3 : 0))}h2.4`, '#4a4a50', { sw: 0.5 });
      return w;
    };
    const mirrors = [-1, 1].map((sd) => L(`M${24 + sd * 10.6} 38.2L${24 + sd * 11.8} 32.8`, CHROME, { sw: 0.7 }) + E(24 + sd * 12, 32.2, 1.6, 1.1, back ? '#3a3a3e' : '#9fc7e0', { sw: 0.5 })).join('');
    const knees = [-1, 1].map((sd) => E(24 + sd * 7.6, 46.6 + b * 0.5, 2.4, 2.8, JEAN.main)).join('');
    const sh = (sd) => [24 + sd * 8.6, 34.4 + b];
    const arms = [-1, 1].map((sd) => arm(sh(sd), [24 + sd * 11.6, 37.4 + b], [24 + sd * 11.4, 39 + bb])).join('');
    const torso = bodyG(this.front(q, kb, back)), head = headG(headFront(q, kh, this, back));
    if (!back) {
      let s = wheelV() + at(bb, P('M20.4 54.4Q24 50.6 27.6 54.4v1.4Q24 52.6 20.4 55.8Z', G.shade, { tint: true, sw: 0.7 }));
      s += knees + torso + head;
      let bike = P('M16.6 40.4C15.8 45.6 17.4 51.4 21 53.6H27C30.6 51.4 32.2 45.6 31.4 40.4C28 39.4 20 39.4 16.6 40.4Z', G.main, { tint: true }); // leg shield
      bike += P('M27 53.6C30.6 51.4 32.2 45.6 31.4 40.4C30.4 40.1 29.4 40 28.4 39.9C29.4 45 28.8 50.6 26.2 53.6Z', G.shade, { tint: true, stroke: false });
      bike += L('M20.6 44.2C22.6 45.4 25.4 45.4 27.4 44.2', G.line, { tint: true, sw: 0.6 });
      bike += mirrors + L('M12.4 38.8H35.6', '#3a3a3e', { sw: 1.4 });
      bike += P('M18.2 37.4C20 36.2 28 36.2 29.8 37.4L29.4 40.4C27 41 21 41 18.6 40.4Z', G.shade, { tint: true }); // cowl
      bike += E(24, 39, 2.6, 1.3, LAMP, { sw: 0.6 }) + E(18.8, 38.9, 0.7, 0.6, '#f2a33b', { sw: 0.4 }) + E(29.2, 38.9, 0.7, 0.6, '#f2a33b', { sw: 0.4 });
      return s + at(bb, bike) + arms;
    }
    // back view: bars + mirrors behind, rider, rear body over the hips, tail light + plate
    let s = at(bb, mirrors + L('M12.4 38.8H35.6', '#3a3a3e', { sw: 1.4 }));
    s += arms + at(bb, P('M18.4 46.2C18.6 43.6 29.4 43.6 29.6 46.2Z', SEAT, { sw: 0.8 }));
    s += knees + torso + head + wheelV();
    let bike = P('M17.4 45.8C16.8 50.2 18.6 55.2 22.2 56.6H25.8C29.4 55.2 31.2 50.2 30.6 45.8C27.4 44.8 20.6 44.8 17.4 45.8Z', G.main, { tint: true });
    bike += P('M25.8 56.6C29.4 55.2 31.2 50.2 30.6 45.8C29.8 45.5 28.8 45.3 27.8 45.2C28.8 49.6 28.2 54 25 56.6Z', G.shade, { tint: true, stroke: false });
    bike += P('M20.4 48h7.2v1.9h-7.2Z', '#e53935', { sw: 0.6 }) + L('M21 48.5h2.2', '#ff9b8f', { sw: 0.5 });
    bike += P('M21.4 51.2h5.2v2.8h-5.2Z', '#f2f2ee', { sw: 0.5 }) + L('M22.2 52.6h3.6', '#6b6f73', { sw: 0.5 });
    return s + at(bb, bike);
  },
  side(p, k) {
    const q = this.sideParts(p, k);
    return q.farArm + q.farLeg + q.back + q.nearLeg + q.front + q.arm;
  },
  sideParts(p, k) {
    const { P, L } = k;
    const b = p.bob, st = p.stride;
    const leg = (ph) => {
      const dx = -st * ph * 2.3, lift = 0.8 * Math.max(0, st * ph), x = 24 + dx;
      let s = P(`M${x - 2.1} 46.2h4.2l0.2 ${11.4 - lift}h-4.6Z`, ph < 0 ? JEAN.shade : JEAN.main);
      s += P(`M${x - 2.3} ${57.2 - lift}h4.6v1.3h-4.6Z`, JEAN.hem, { sw: 0.6 });
      return s + this.feetSide(x, 60.6 - lift, k, ph < 0);
    };
    let s = '';
    s += P(`M19.8 ${35 + b}C21.4 ${33.6 + b} 26.8 ${33.6 + b} 28.4 ${35.2 + b}L28.2 ${45.4 + b}C28.3 ${46.6} 28.5 ${47.6} ${28.8 + st * 0.5} ${J_HEM}C25.6 ${J_HEM + 0.8} 22.4 ${J_HEM + 0.8} ${19.2 - st * 0.5} ${J_HEM}C19.4 ${47.6} 19.6 ${46.6} 19.8 ${43 + b}Z`, CRAB.main);
    s += P(`M25.6 ${34.2 + b}C27 ${34.2 + b} 28 ${34.6 + b} 28.4 ${35.2 + b}L28.2 ${45.4 + b}C28.3 ${46.6} 28.5 ${47.6} ${28.8 + st * 0.5} ${J_HEM}C27.6 ${J_HEM + 0.5} 26.6 ${J_HEM + 0.7} 25.8 ${J_HEM + 0.8}Z`, CRAB.shade, { stroke: false });
    s += P(`M${19.4 - st * 0.5} ${J_HEM - 1.5}C22.4 ${J_HEM - 0.8} 25.6 ${J_HEM - 0.8} ${28.6 + st * 0.5} ${J_HEM - 1.5}L${28.8 + st * 0.5} ${J_HEM}C25.6 ${J_HEM + 0.8} 22.4 ${J_HEM + 0.8} ${19.2 - st * 0.5} ${J_HEM}Z`, CRAB.deep, { sw: 0.6 });
    s += L(`M20.6 ${35.4 + b}V${J_HEM - 1.4}`, CRAB.deep, { sw: 0.6 });
    s += P(`M21.2 ${32.4 + b}h5.4l0.4 2c-2 0.8 -4.2 0.8 -6.2 0Z`, CRAB.deep, { sw: 0.7 });
    const sw = st * 2.4;
    let arm, farArm;
    if (p.idle === 2) {
      arm = sleeve(k, [24, 36.4 + b], [21.8, 40.6 + b], [19.6, 39.8 + b]);
      farArm = sleeve(k, [24.8, 36.4 + b], [27.4, 40.4 + b], [29.4, 39.4 + b], true);
    } else {
      arm = p.idle === 3 ? '' : sleeve(k, [24, 36.4 + b], [24 + sw * 0.45, 40.6 + b], [23.6 + sw, 44.6 + b - Math.abs(sw) * 0.3]);
      farArm = sleeve(k, [24.8, 36.4 + b], [24.8 - sw * 0.45, 40.6 + b], [24.4 - sw, 44.4 + b - Math.abs(sw) * 0.3], true);
    }
    return { farLeg: leg(-1), back: '', nearLeg: leg(1), front: s, arm, farArm };
  },
  // hanging-hand props (pre-rotation, hand at ~23.6,44.8): công an mời lên phường
  props: {
    badge(k) {
      const { P, E, L } = k;
      let s = P('M21 44.6h5.2v4.2h-5.2Z', '#3a2a22', { sw: 0.55 });
      s += P('M21.5 45.1h4.2v3.2h-4.2Z', '#e9eef6', { sw: 0.4 });
      s += P('M21.5 45.1h4.2v0.9h-4.2Z', '#c6312b', { stroke: false });
      s += E(23.6, 47.2, 0.85, 0.85, '#e3b53a', { sw: 0.35 });
      return s + L('M23.6 46.6v1.2M23 47.2h1.2', '#c6312b', { sw: 0.35 });
    },
    cuffs(k) {
      const { L } = k;
      let s = '';
      for (const [cx, cy] of [[23.4, 46.6], [24.6, 50.4]]) s += L(ell(cx, cy, 1.25, 1.25), INK, { sw: 1.1 }) + L(ell(cx, cy, 1.25, 1.25), '#cfd6dc', { sw: 0.6 });
      return s + L('M23.9 47.8l0.4 1.4', '#9aa4ac', { sw: 0.5 });
    },
  },
  // strike: rút thẻ ngành rồi còng · die: giơ tay đầu hàng, mặt méo (no blood) · guard: lách người quẹo hẻm
  poses: {
    strike: [
      { torso: 6, head: 4, arm: -42, farArm: 12, near: 6, far: -6, dx: 2, brow: true },
      { torso: -10, head: -4, arm: 72, farArm: -10, near: 18, far: -14, dx: -2, prop: 'badge', brow: true },
      { torso: -16, head: -8, arm: 112, farArm: -20, near: 26, far: -22, dx: -6, prop: 'badge', brow: true, grin: true },
      { torso: -12, head: -4, arm: 86, farArm: -16, near: 22, far: -20, dx: -6, prop: 'cuffs', brow: true, grin: true },
    ],
    die: [
      { front: true, hands: 'half', gasp: true, tilt: 4 },
      { front: true, hands: 'up', meo: true, bob: -0.6 },
      { front: true, hands: 'up', meo: true, tilt: -5, dx: -1 },
      { front: true, hands: 'up', meo: true, closed: true, whole: 90, wx: -20, wy: -16 },
    ],
    guard: [
      { torso: 8, head: 6, arm: 40, farArm: -20, near: 10, far: -8, dx: 2, gasp: true },
      { torso: 24, head: 14, arm: -30, farArm: 30, near: -14, far: 20, dx: 7, wince: true },
      { torso: -20, head: -10, arm: -60, farArm: 40, near: 30, far: -26, dx: -6, brow: true },
      { torso: 0, head: 0, arm: 0, farArm: 0, near: 0, far: 0, grin: true },
    ],
  },
};

/* ------------------------------------------------------------ frame assembly */
const HEAD_S = 1.26, BODY_SX = 1.6, BODY_SY = 1.06;
const headG = (inner) => `<g transform="translate(24 33.4) scale(${HEAD_S}) translate(-24 -33.4)">${inner}</g>`;
const bodyG = (inner) => `<g transform="translate(24 62.4) scale(${BODY_SX} ${BODY_SY}) translate(-24 -62.4)">${inner}</g>`;
function frameSvg(c, dir, p, mode) {
  const r = rigOf(c);
  const kb = painter(mode, Math.sqrt(BODY_SX * BODY_SY) * r.s);
  const kh = painter(mode, HEAD_S * r.s);
  let s = '';
  if (c.ride) s += c.ride(p, { kd: painter(mode, r.s), kb, kh }, dir);
  else if (dir === 'down' || dir === 'up') {
    const back = dir === 'up';
    s += bodyG(c.front(p, kb, back));
    s += headG(headFront(p, kh, c, back));
  } else {
    s += bodyG(c.side(p, kb));
    s += headG(headSide(p, kh, c));
  }
  // parts that pass in front of the head (a hand scratching the hat)
  if (c.over && !c.ride) s += bodyG(c.over(p, kb, dir));
  if (dir === 'right') s = `<g transform="translate(${FW} 0) scale(-1 1)">${s}</g>`;
  s = scaled(r, FW, FH, r.fw, s);
  const bg = mode === 'mask' ? `<rect width="${r.fw}" height="${r.fh}" fill="#000"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.fw * SS}" height="${r.fh * SS}" viewBox="0 0 ${r.fw} ${r.fh}">${bg}${s}</svg>`;
}

/** Rasterise a (mode => svg) frame: base colours + the tint layer (garment pixels only, via the mask render). */
async function raster(svg, w, h) {
  const col = await sharp(Buffer.from(svg('color'))).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
  const mask = await sharp(Buffer.from(svg('mask'))).resize(w, h, { kernel: 'lanczos3' }).greyscale().raw().toBuffer();
  const tint = Buffer.from(col);
  for (let px = 0; px < w * h; px++) {
    const m = mask[px] / 255;
    tint[px * 4 + 3] = Math.round(col[px * 4 + 3] * (m > 0.97 ? 1 : m < 0.05 ? 0 : m));
  }
  const toPng = (raw) => sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return { base: await toPng(col), tint: await toPng(tint) };
}
const renderFrame = (c, dir, p) => raster((mode) => frameSvg(c, dir, p, mode), rigOf(c).fw, rigOf(c).fh);

/** Frames laid out on a grid: `cells` = [col, row] per buffer. */
const grid = (bufs, cells, w, h, cols, rows) =>
  sharp({ create: { width: w * cols, height: h * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(bufs.map((b, n) => ({ input: b, left: cells[n][0] * w, top: cells[n][1] * h })))
    .png()
    .toBuffer();

/** Walk rows (one per direction, `walk` frames), then idle rows (one per direction, `idle` frames). */
function walkLayout(r) {
  const cells = [], names = [];
  DIRS.forEach((d, row) => {
    for (let i = 0; i < r.walk; i++) cells.push([i, row]), names.push(`walk-${d}-${i}`);
  });
  if (r.idle)
    DIRS.forEach((d, row) => {
      for (let i = 0; i < r.idle; i++) cells.push([i, 4 + row]), names.push(`idle-${d}-${i}`);
    });
  return { cells, names, cols: Math.max(r.walk, r.idle), rows: r.idle ? 8 : 4 };
}

function atlasJson(image, r) {
  const L = walkLayout(r), W = r.fw, H = r.fh;
  const frames = {};
  L.names.forEach((n, k) => {
    const [x, y] = L.cells[k];
    frames[n] = {
      frame: { x: x * W, y: y * H, w: W, h: H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: W, h: H },
      sourceSize: { w: W, h: H },
    };
  });
  const meta = { app: 'the-hidden-truth/char-art', image, size: { w: W * L.cols, h: H * L.rows }, scale: '1' };
  // idle loop for the engine (frame indices + fps): mostly breathing, a shrug and a hat-scratch now and then
  if (r.idle) meta.anim = { idle: [0, 1, 0, 1, 2, 2, 0, 1, 0, 1, 3, 3], idleFps: 3 };
  return { frames, meta };
}

/** Preview: tinted with a few player colours, upscaled (nearest) for review. */
async function preview(baseSheet, tintSheet) {
  const COLORS = [0xe8524a, 0x3f7fd9, 0x3fae5a, 0xf2c230, 0xa05bd6, 0xf4f0e6];
  const { data: b, info } = await sharp(baseSheet).raw().toBuffer({ resolveWithObject: true });
  const { data: t } = await sharp(tintSheet).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
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
  const Z = W > 300 ? 2 : 3; // big rigs: keep the review sheet a sane size
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
    { torso: 16, head: 12, arm: 70, near: -8, far: 14, dx: 5, wince: true },
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

/** Front-facing action frame (a pose that reads badly in profile, e.g. both hands up): body + head + `over`, optional tilt / whole-body turn. */
function frontActionSvg(c, a, mode, r, kb, kh) {
  const p = { ...pose(0), bob: a.bob || 0, hands: a.hands };
  const y = 22 + p.bob;
  let head = headFront(p, kh, c, false);
  const mouth = () => kh.E(24, y + 6.9, 2.2, 1.3, SKIN.main, { stroke: false });
  if (a.closed) for (const ex of [19.3, 28.7]) head += kh.E(ex, y + 2.8, 1.9, 2.3, SKIN.main, { stroke: false }) + kh.L(`M${ex - 1.5} ${y + 3}q1.5 1.1 3 0`, INK, { sw: 0.7 });
  if (a.gasp) head += mouth() + kh.E(24, y + 7.1, 0.85, 1.15, '#5a2420', { sw: 0.5 });
  if (a.meo)
    head += mouth() + kh.L(`M21.6 ${y + 7.3}q0.6 -0.8 1.2 0t1.2 0t1.2 0t1.2 0`, INK, { sw: 0.65 }) + kh.L(`M17.4 ${y - 0.3}l3 -0.9M30.6 ${y - 0.3}l-3 -0.9`, INK, { sw: 0.7 }) +
      kh.P(`M34.6 ${y - 0.6}c0.9 1.2 1.3 2 1.3 2.6a1.3 1.3 0 0 1 -2.6 0c0 -0.6 0.4 -1.4 1.3 -2.6Z`, '#bfe6ff', { sw: 0.45 });
  let s = bodyG(c.front(p, kb, false)) + headG(head) + (c.over ? bodyG(c.over(p, kb, 'down')) : '');
  s = `<g transform="translate(${f(AX + (a.dx || 0))} 0)">${rot(a.tilt || 0, 24, 62, s)}</g>`;
  if (a.whole) s = `<g transform="translate(${a.wx} ${a.wy}) rotate(${a.whole} ${AW / 2} 62)">${s}</g>`;
  s = scaled(r, AW, FH, r.aw, s);
  const bg = mode === 'mask' ? `<rect width="${r.aw}" height="${r.fh}" fill="#000"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.aw * SS}" height="${r.fh * SS}" viewBox="0 0 ${r.aw} ${r.fh}">${bg}${s}</svg>`;
}

function actionSvg(c, a, mode) {
  const r = rigOf(c);
  const kb = painter(mode, Math.sqrt(BODY_SX * BODY_SY) * r.s);
  const kh = painter(mode, HEAD_S * r.s);
  if (a.front) return frontActionSvg(c, a, mode, r, kb, kh);
  const p = pose(0);
  const q = c.sideParts(p, kb);
  const hipY = c.hipY;
  // legs swing at their own hip; the arm (and blade) at the shoulder
  const leg = (part, ang) => rot(ang, 24, hipY, part);
  const arm = rot(a.arm, 24, 36.2, q.arm + (a.blade ? dao(kb) : '') + (a.prop ? c.props[a.prop](kb) : ''));
  // optional far arm (behind the torso), e.g. both hands up
  const farArm = q.farArm ? bodyG(rot(a.farArm || 0, 24.8, 36.2, q.farArm)) : '';
  // keep the feet on the ground: spread legs shorten vertically
  const legLen = 60.4 - hipY;
  const drop = legLen * (1 - Math.cos((Math.max(Math.abs(a.near), Math.abs(a.far)) * Math.PI) / 180)) * BODY_SY;
  const hx = 24, hy = fy(hipY);
  let head = headSide(p, kh, c);
  const y = 22;
  if (a.closed) head += kh.E(16.4, y + 2.8, 1.8, 2.2, SKIN.main, { stroke: false }) + kh.L(`M14.9 ${y + 3.2}q1.5 1.1 3 0`, INK, { sw: 0.7 });
  // X eyes only for the one actually cut down (die row); a pushed-back guard / repelled striker just squeezes them shut
  else if (a.hurt) head += kh.E(16.4, y + 2.8, 1.7, 2.1, SKIN.main, { stroke: false }) + kh.L(`M15 ${y + 1.8}l2.8 2.2M17.8 ${y + 1.8}l-2.8 2.2`, INK, { sw: 0.7 });
  else if (a.wince) head += kh.E(16.4, y + 2.8, 1.7, 2.1, SKIN.main, { stroke: false }) + kh.L(`M17.8 ${y + 1.7}l-2.6 1.3l2.6 1.3`, INK, { sw: 0.7 });
  if (a.brow) head += kh.L(`M14.6 ${y - 0.4}l3.6 1.4`, INK, { sw: 0.8 });
  // mouths (cover the default smile first): gasp "o", wobbly "mặt méo" + worried brow + sweat drop, toothy grin
  const mouth = () => kh.E(14.6, y + 7, 1.7, 1.2, SKIN.main, { stroke: false });
  if (a.gasp) head += mouth() + kh.E(14.5, y + 7.2, 0.75, 1.05, '#5a2420', { sw: 0.5 });
  if (a.meo)
    head += mouth() + kh.L(`M13 ${y + 7.4}q0.6 -0.8 1.2 0t1.2 0t1.2 0`, INK, { sw: 0.65 }) + kh.L(`M14.8 ${y - 0.2}l3.2 -1.2`, INK, { sw: 0.75 }) +
      kh.P(`M20.6 ${y - 3.4}c0.9 1.2 1.3 2 1.3 2.6a1.3 1.3 0 0 1 -2.6 0c0 -0.6 0.4 -1.4 1.3 -2.6Z`, '#bfe6ff', { sw: 0.45 });
  if (a.grin) head += mouth() + kh.P(`M13 ${y + 6.2}q1.6 2.2 3.2 0Z`, '#7a2f2a', { sw: 0.55 }) + kh.L(`M13.3 ${y + 6.5}h2.6`, '#fff', { sw: 0.5 });
  const upper = (inner) => rot(a.torso, hx, hy, inner);
  let s = '';
  s += bodyG(leg(q.farLeg, a.far));
  s += upper(farArm + bodyG(q.back));
  s += bodyG(leg(q.nearLeg, a.near));
  s += upper(bodyG(q.front) + rot(a.head, 24, 33.4, headG(head)) + bodyG(arm));
  s = `<g transform="translate(${f(AX + (a.dx || 0))} ${f(drop)})">${s}</g>`;
  if (a.whole) s = `<g transform="translate(${a.wx} ${a.wy}) rotate(${a.whole} ${AW / 2} 62)">${s}</g>`;
  s = scaled(r, AW, FH, r.aw, s);
  const bg = mode === 'mask' ? `<rect width="${r.aw}" height="${r.fh}" fill="#000"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r.aw * SS}" height="${r.fh * SS}" viewBox="0 0 ${r.aw} ${r.fh}">${bg}${s}</svg>`;
}
const renderAction = (c, a) => raster((mode) => actionSvg(c, a, mode), rigOf(c).aw, rigOf(c).fh);

const actionCells = () => ACTION_ROWS.flatMap((_, ri) => [0, 1, 2, 3].map((i) => [i, ri]));
const actionSheet = (bufs, r) => grid(bufs, actionCells(), r.aw, r.fh, 4, ACTION_ROWS.length);

function actionJson(image, r) {
  const frames = {};
  const W = r.aw, H = r.fh;
  ACTION_ROWS.forEach((row, ri) => {
    for (let c = 0; c < 4; c++)
      frames[`${row}-${c}`] = {
        frame: { x: c * W, y: ri * H, w: W, h: H },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: W, h: H },
        sourceSize: { w: W, h: H },
      };
  });
  return { frames, meta: { app: 'the-hidden-truth/char-art', image, size: { w: W * 4, h: H * ACTION_ROWS.length }, scale: '1' } };
}

const COSTUMES = [HUE, HOI_AN, THANG_LONG, SAI_GON];

for (const c of COSTUMES) {
  if (ONLY && c.slug !== ONLY) continue;
  const r = rigOf(c);
  const L = walkLayout(r);
  const base = [], tint = [];
  for (const n of L.names) {
    const [, d, i] = n.split('-');
    const x = await renderFrame(c, d, n.startsWith('idle') ? idlePose(+i) : pose(+i, r.walk));
    base.push(x.base);
    tint.push(x.tint);
  }
  const bs = await grid(base, L.cells, r.fw, r.fh, L.cols, L.rows), ts = await grid(tint, L.cells, r.fw, r.fh, L.cols, L.rows);
  const rel = `maps/${c.slug}/characters`;
  const name = `${c.prefix}-player-atlas`, tname = `${c.prefix}-player-tint-atlas`;
  const OUT = path.join(ROOT, 'assets', rel), PUB = path.join(ROOT, 'apps/web/public/assets', rel), SRC = path.join(ROOT, 'assets/_src', rel);
  for (const d of [OUT, PUB, SRC]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${name}.png`), bs);
  fs.writeFileSync(path.join(OUT, `${tname}.png`), ts);
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(atlasJson(`${name}.png`, r), null, 1));
  await sharp(bs).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${name}.webp`));
  await sharp(ts).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${tname}.webp`));
  fs.writeFileSync(path.join(PUB, `${name}.json`), JSON.stringify(atlasJson(`${name}.webp`, r)));
  fs.writeFileSync(path.join(PUB, `${tname}.json`), JSON.stringify(atlasJson(`${tname}.webp`, r)));
  fs.writeFileSync(path.join(SRC, `${c.prefix}-player-preview.png`), await preview(bs, ts));
  console.log(`[char-art] ${c.slug}: ${name} + ${tname} (${r.fw}x${r.fh}, walk ${r.walk}, idle ${r.idle})`);

  const ab = [], at = [];
  for (const row of ACTION_ROWS)
    for (const a of (c.poses ?? ACTION_POSES)[row]) {
      const x = await renderAction(c, a);
      ab.push(x.base);
      at.push(x.tint);
    }
  const abs = await actionSheet(ab, r), ats = await actionSheet(at, r);
  const an = `${c.prefix}-player-action`, atn = `${c.prefix}-player-action-tint`;
  fs.writeFileSync(path.join(OUT, `${an}.png`), abs);
  fs.writeFileSync(path.join(OUT, `${atn}.png`), ats);
  await sharp(abs).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${an}.webp`));
  await sharp(ats).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(PUB, `${atn}.webp`));
  fs.writeFileSync(path.join(PUB, `${an}.json`), JSON.stringify(actionJson(`${an}.webp`, r)));
  fs.writeFileSync(path.join(PUB, `${atn}.json`), JSON.stringify(actionJson(`${atn}.webp`, r)));
  fs.writeFileSync(path.join(SRC, `${c.prefix}-player-action-preview.png`), await sharp(abs).resize(r.aw * 4 * 3, r.fh * 3 * 3, { kernel: 'nearest' }).flatten({ background: '#b5643c' }).png().toBuffer());
  console.log(`[char-art] ${c.slug}: ${an} + ${atn} (${r.aw}x${r.fh})`);
}
