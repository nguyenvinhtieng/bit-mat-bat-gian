#!/usr/bin/env node
/**
 * Asset pipeline (prompts/assets.md §0, §1, §6):
 *   assets/_src/**  (raw ChatGPT Image output)
 *     -> background removal (magenta chroma key or edge flood-fill), slicing, resize to spec sizes
 *     -> assets/**            PNG sources at spec size
 *     -> apps/web/public/assets/**  WebP for shipping + atlases (<= 2048) + manifest
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const SRC = path.join(ROOT, 'assets/_src');
const OUT = path.join(ROOT, 'assets');
const PUB = path.join(ROOT, 'apps/web/public/assets');
const WEBP_Q = 88;

const ensure = (p) => fs.mkdirSync(path.dirname(p), { recursive: true });
const exists = (p) => fs.existsSync(p);
const log = (...a) => console.log('[pack]', ...a);

// ---------- raw image helpers ----------
async function loadRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
const toSharp = (img) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } });

function hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, mx === 0 ? 0 : d / mx, mx / 255];
}
/** magenta-ness 0..1 (hue 295-340 deg, saturated) — models render "#FF00FF" anywhere from pink-magenta to violet. */
function magentaScore(r, g, b) {
  const [h, s, v] = hsv(r, g, b);
  if (h < 288 || h > 342 || v < 0.28) return 0;
  return Math.max(0, Math.min(1, (s - 0.38) / 0.22));
}
function isMagenta(r, g, b) {
  return magentaScore(r, g, b) > 0.9;
}

/** Remove background. Magenta -> global chroma key with soft edges + despill. Otherwise flood fill from borders. */
function removeBackground(img) {
  const { data, w, h } = img;
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  const magentaBg = corners.filter(([r, g, b]) => isMagenta(r, g, b)).length >= 2;
  if (magentaBg) {
    for (let i = 0; i < w * h; i++) {
      const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      const m = magentaScore(r, g, b);
      const a = Math.round(255 * (1 - m));
      if (m > 0) {
        // despill: pull red/blue toward green
        const cap = g + 40;
        data[i * 4] = Math.min(r, cap + 30);
        data[i * 4 + 2] = Math.min(b, cap);
      }
      data[i * 4 + 3] = Math.min(data[i * 4 + 3], a);
    }
    return img;
  }
  // flood fill from borders using average corner colour
  const bg = corners.reduce((s, c) => [s[0] + c[0] / 4, s[1] + c[1] / 4, s[2] + c[2] / 4], [0, 0, 0]);
  const distOf = (i) => Math.max(Math.abs(data[i * 4] - bg[0]), Math.abs(data[i * 4 + 1] - bg[1]), Math.abs(data[i * 4 + 2] - bg[2]));
  const T = 28;
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    const d = distOf(i);
    if (d > T) continue;
    data[i * 4 + 3] = d < T * 0.6 ? 0 : Math.round(255 * ((d - T * 0.6) / (T * 0.4)));
    const x = i % w, y = (i / w) | 0;
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  return img;
}

function bboxOf(img, x0 = 0, y0 = 0, x1 = img.w, y1 = img.h, thr = 24) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++)
      if (img.data[(y * img.w + x) * 4 + 3] > thr) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function crop(img, b) {
  const out = Buffer.alloc(b.w * b.h * 4);
  for (let y = 0; y < b.h; y++) img.data.copy(out, y * b.w * 4, ((b.y + y) * img.w + b.x) * 4, ((b.y + y) * img.w + b.x + b.w) * 4);
  return { data: out, w: b.w, h: b.h };
}

/** Split a sheet into cols x rows cells, returning the trimmed content of each cell. */
function sliceGrid(img, cols, rows) {
  const cw = img.w / cols, ch = img.h / rows;
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const b = bboxOf(img, Math.round(c * cw), Math.round(r * ch), Math.round((c + 1) * cw), Math.round((r + 1) * ch));
      cells.push(b ? crop(img, b) : null);
    }
  return cells;
}

/** Fit image into WxH (transparent), keep aspect; align bottom (props/characters) or centre. */
async function fitTo(img, W, H, { align = 'bottom', scale = null, pad = 0 } = {}) {
  const s = scale ?? Math.min((W - pad * 2) / img.w, (H - pad * 2) / img.h);
  const nw = Math.max(1, Math.round(img.w * s)), nh = Math.max(1, Math.round(img.h * s));
  const resized = await toSharp(img).resize(nw, nh, { kernel: 'lanczos3' }).png().toBuffer();
  const left = Math.round((W - nw) / 2);
  const top = align === 'bottom' ? H - nh - pad : Math.round((H - nh) / 2);
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: Math.max(0, left), top: Math.max(0, top) }])
    .png()
    .toBuffer();
}

async function writeBoth(rel, pngBuf, { webp = true } = {}) {
  const png = path.join(OUT, rel);
  ensure(png);
  fs.writeFileSync(png, pngBuf);
  if (webp) {
    const wp = path.join(PUB, rel.replace(/\.png$/, '.webp'));
    ensure(wp);
    await sharp(pngBuf).webp({ quality: WEBP_Q, alphaQuality: 100 }).toFile(wp);
  }
}

// ---------- atlas ----------
async function buildAtlas(name, items, relDir) {
  // items: { key, buf, w, h }
  const PADDING = 2, MAXW = 2048;
  const sorted = [...items].sort((a, b) => b.h - a.h);
  let x = 0, y = 0, rowH = 0, width = 0;
  for (const it of sorted) {
    if (x + it.w > MAXW) {
      x = 0;
      y += rowH + PADDING;
      rowH = 0;
    }
    it.x = x;
    it.y = y;
    x += it.w + PADDING;
    rowH = Math.max(rowH, it.h);
    width = Math.max(width, x);
  }
  const height = y + rowH;
  if (height > 2048) throw new Error(`atlas ${name} exceeds 2048 (${height})`);
  const W = Math.ceil(width / 4) * 4, H = Math.ceil(height / 4) * 4;
  const sheet = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(sorted.map((it) => ({ input: it.buf, left: it.x, top: it.y })))
    .png()
    .toBuffer();
  const frames = {};
  for (const it of sorted)
    frames[it.key] = {
      frame: { x: it.x, y: it.y, w: it.w, h: it.h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: it.w, h: it.h },
      sourceSize: { w: it.w, h: it.h },
    };
  const json = { frames, meta: { app: 'the-hidden-truth/assets-pack', image: `${name}.webp`, format: 'RGBA8888', size: { w: W, h: H }, scale: '1' } };
  const pngPath = path.join(OUT, relDir, `${name}.png`);
  ensure(pngPath);
  fs.writeFileSync(pngPath, sheet);
  fs.writeFileSync(path.join(OUT, relDir, `${name}.json`), JSON.stringify({ ...json, meta: { ...json.meta, image: `${name}.png` } }, null, 1));
  const pub = path.join(PUB, relDir, `${name}.webp`);
  ensure(pub);
  await sharp(sheet).webp({ quality: WEBP_Q, alphaQuality: 100 }).toFile(pub);
  fs.writeFileSync(path.join(PUB, relDir, `${name}.json`), JSON.stringify(json));
  log(`atlas ${name} ${W}x${H} (${items.length} frames)`);
  return { name, size: [W, H], frames: Object.keys(frames) };
}

// ---------- pipeline steps ----------
const manifest = {
  mapSlug: 'co-do-hue',
  mapVersion: 1,
  layoutVersion: 1,
  tileSize: 48,
  skin: 'hue',
  generatedBy: 'ChatGPT Image (OpenAI gpt-5.4-image-2 / gpt-5-image-mini) -> tools/assets-pack',
  atlases: [],
  textures: {},
  areas: ['courtyard_checkin', 'exhibition', 'corridor', 'coordination', 'editing', 'archive', 'artifact_storage'],
  props: {},
  stations: [],
  clues: {},
  npc: {},
  ui: {},
  roles: {},
};

async function packPlayer() {
  const f = path.join(SRC, 'common/player-sheet.png');
  if (!exists(f)) return log('skip player (missing src)');
  const img = removeBackground(await loadRaw(f));
  const cells = sliceGrid(img, 4, 4);
  const FW = 48, FH = 64;
  const maxH = Math.max(...cells.filter(Boolean).map((c) => c.h));
  const maxW = Math.max(...cells.filter(Boolean).map((c) => c.w));
  const s = Math.min((FH - 2) / maxH, (FW - 2) / maxW);
  const frames = [];
  const tintFrames = [];
  for (const c of cells) {
    const buf = await fitTo(c, FW, FH, { scale: s, align: 'bottom', pad: 1 });
    frames.push(buf);
    // tint mask: low-saturation light pixels (white clothing) -> separate overlay that the engine tints.
    const raw = await sharp(buf).raw().toBuffer();
    const mask = Buffer.from(raw);
    for (let i = 0; i < FW * FH; i++) {
      const r = raw[i * 4], g = raw[i * 4 + 1], b = raw[i * 4 + 2], a = raw[i * 4 + 3];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const light = mx / 255, sat = mx === 0 ? 0 : (mx - mn) / mx;
      const isCloth = a > 0 && sat < 0.12 && light > 0.62;
      if (!isCloth) mask[i * 4 + 3] = 0;
    }
    tintFrames.push(await sharp(mask, { raw: { width: FW, height: FH, channels: 4 } }).png().toBuffer());
  }
  const sheetOf = async (list) =>
    sharp({ create: { width: FW * 4, height: FH * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(list.map((b, i) => ({ input: b, left: (i % 4) * FW, top: Math.floor(i / 4) * FH })))
      .png()
      .toBuffer();
  await writeBoth('common/characters/player-atlas.png', await sheetOf(frames));
  await writeBoth('common/characters/player-tint-atlas.png', await sheetOf(tintFrames));
  const dirs = ['down', 'left', 'right', 'up'];
  const atlas = { frames: {}, meta: { image: 'player-atlas.webp', size: { w: FW * 4, h: FH * 4 }, scale: '1' } };
  dirs.forEach((d, r) => {
    for (let c = 0; c < 4; c++)
      atlas.frames[`walk-${d}-${c}`] = {
        frame: { x: c * FW, y: r * FH, w: FW, h: FH },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: FW, h: FH },
        sourceSize: { w: FW, h: FH },
      };
  });
  fs.writeFileSync(path.join(OUT, 'common/characters/player-atlas.json'), JSON.stringify(atlas, null, 1));
  fs.writeFileSync(path.join(PUB, 'common/characters/player-atlas.json'), JSON.stringify(atlas));
  fs.writeFileSync(
    path.join(PUB, 'common/characters/player-tint-atlas.json'),
    JSON.stringify({ ...atlas, meta: { ...atlas.meta, image: 'player-tint-atlas.webp' } }),
  );
  // Shadow (32x16 soft ellipse) — technical alpha mask, not illustrated art.
  const shadowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><defs><radialGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="16" cy="8" rx="16" ry="8" fill="url(#g)"/></svg>`;
  await writeBoth('common/characters/shadow.png', await sharp(Buffer.from(shadowSvg)).png().toBuffer());
  manifest.textures.player = { atlas: 'common/characters/player-atlas', tint: 'common/characters/player-tint-atlas', frame: [FW, FH], anchor: [0.5, 1] };
  log('player atlas');
}

const UI_NAMES = [
  ['task-marker', 64], ['task-complete', 32], ['meeting-bell', 48], ['clue', 48],
  ['chat', 32], ['timer', 32], ['meeting-table', 48], ['alert', 48],
  ['progress-star', 32], ['notebook', 48], ['vote', 48], ['leave', 32],
];
async function packUi() {
  const f = path.join(SRC, 'common/ui-sheet.png');
  if (!exists(f)) return log('skip ui');
  const cells = sliceGrid(removeBackground(await loadRaw(f)), 4, 3);
  for (let i = 0; i < UI_NAMES.length; i++) {
    const [name, size] = UI_NAMES[i];
    if (!cells[i]) continue;
    const out = Math.max(size, 64); // ship 64px (crisp at 2x for 32px slots)
    await writeBoth(`common/ui/${name}.png`, await fitTo(cells[i], out, out, { align: 'center', pad: 1 }));
    manifest.ui[name] = { file: `common/ui/${name}.webp`, size };
  }
  log('ui icons');
}

const ROLES = ['historian', 'conservator', 'local_guide', 'archivist', 'forger', 'broker'];
async function packRoles() {
  const f = path.join(SRC, 'common/role-icons.png');
  if (!exists(f)) return log('skip roles');
  const cells = sliceGrid(removeBackground(await loadRaw(f)), 3, 2);
  for (let i = 0; i < ROLES.length; i++) {
    if (!cells[i]) continue;
    await writeBoth(`common/ui/roles/${ROLES[i]}.png`, await fitTo(cells[i], 96, 96, { align: 'center' })); // 48dp @2x
    await writeBoth(`common/ui/abilities/${ROLES[i]}.png`, await fitTo(cells[i], 64, 64, { align: 'center' })); // 32dp @2x
    manifest.roles[ROLES[i]] = { icon: `common/ui/roles/${ROLES[i]}.webp`, ability: `common/ui/abilities/${ROLES[i]}.webp` };
  }
  log('role icons');
}

const TILE_ORDER = ['wood', 'carpet', 'cream', 'terracotta', 'stone', 'jade', 'wall-face', 'wall-top'];
async function packTileset() {
  const T = 48;
  const comps = [];
  for (let i = 0; i < TILE_ORDER.length; i++) {
    const name = TILE_ORDER[i];
    const f = path.join(SRC, `maps/co-do-hue/tex-${name.startsWith('wall') ? name : 'floor-' + name}.png`);
    if (!exists(f)) {
      log('missing texture', name);
      continue;
    }
    if (name === 'wall-face') {
      // whole wall face fits one tile height; repeat for all four slots
      const tile = await sharp(f).resize(T, T, { fit: 'fill' }).png().toBuffer();
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) comps.push({ input: tile, left: (i * 2 + dx) * T, top: dy * T });
    } else {
      const block = await sharp(f).resize(T * 2, T * 2, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
      comps.push({ input: block, left: i * 2 * T, top: 0 });
    }
  }
  const sheet = await sharp({ create: { width: TILE_ORDER.length * 2 * T, height: 2 * T, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } } })
    .composite(comps)
    .png()
    .toBuffer();
  await writeBoth('maps/co-do-hue/tileset/hue-interior-48.png', sheet);
  manifest.textures.tileset = { file: 'maps/co-do-hue/tileset/hue-interior-48.webp', tile: T, order: TILE_ORDER, layout: '2x2 tiles per texture, columns' };
  log('tileset');
}

const PROP_SIZES = {
  'hue-prop-exhibition-panel-bilingual': [96, 192],
  'hue-prop-exhibition-photo-wall': [192, 128],
  'hue-prop-exhibition-spotlight': [64, 64],
  'hue-prop-editing-printer': [96, 80],
  'hue-prop-editing-scanner': [80, 64],
  'hue-prop-editing-desk-papers': [128, 64],
  'hue-prop-archive-shelf-a': [192, 128],
  'hue-prop-archive-box-hue04': [64, 48],
  'hue-prop-storage-sealed-box': [80, 64],
  'hue-prop-storage-copy-stand': [96, 96],
  'hue-prop-coord-whiteboard': [128, 96],
  'hue-prop-coord-monitor': [80, 64],
  'hue-prop-corridor-plant': [48, 64],
  'hue-prop-courtyard-banner': [128, 192],
  'hue-prop-courtyard-bench': [128, 48],
  'hue-prop-courtyard-meeting-table': [144, 96],
};
const STATION_FILES = ['print-checklist', 'scan-footnote', 'floor-plan', 'lights-labels', 'seal-box', 'return-shelf'];
const STATION_TASKS = ['task_print_checklist', 'task_scan_footnote', 'task_update_floor_plan', 'task_check_lights_labels', 'task_seal_box', 'task_return_shelf_a'];

async function activeVariant(buf) {
  // highlight: gold outer glow (from blurred alpha) + brighten
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const glow = Buffer.alloc(data.length);
  for (let i = 0; i < info.width * info.height; i++) {
    glow[i * 4] = 255;
    glow[i * 4 + 1] = 214;
    glow[i * 4 + 2] = 90;
    glow[i * 4 + 3] = data[i * 4 + 3];
  }
  const glowPng = await sharp(glow, { raw: { width: info.width, height: info.height, channels: 4 } }).blur(3).png().toBuffer();
  const bright = await sharp(buf).modulate({ brightness: 1.15 }).png().toBuffer();
  return sharp(glowPng).composite([{ input: glowPng }, { input: bright }]).png().toBuffer();
}

async function packGameplayAtlas() {
  const items = [];
  for (const [key, [w, h]] of Object.entries(PROP_SIZES)) {
    const f = path.join(SRC, `maps/co-do-hue/props/${key}.png`);
    if (!exists(f)) {
      log('missing prop', key);
      continue;
    }
    const img = removeBackground(await loadRaw(f));
    const b = bboxOf(img);
    const buf = await fitTo(crop(img, b), w, h, { align: 'bottom' });
    await writeBoth(`maps/co-do-hue/props/${key}.png`, buf, { webp: false });
    items.push({ key, buf, w, h });
    manifest.props[key] = { atlas: 'hue-gameplay-0', size: [w, h], anchor: [0.5, 1], footprint: [48, 48] };
  }
  const sf = path.join(SRC, 'maps/co-do-hue/stations/hue-stations-sheet.png');
  if (exists(sf)) {
    const cells = sliceGrid(removeBackground(await loadRaw(sf)), 3, 2);
    for (let i = 0; i < 6; i++) {
      if (!cells[i]) continue;
      const key = `hue-station-${STATION_FILES[i]}`;
      const buf = await fitTo(cells[i], 64, 64, { align: 'center', pad: 4 });
      const act = await activeVariant(buf);
      await writeBoth(`maps/co-do-hue/stations/${key}.png`, buf, { webp: false });
      await writeBoth(`maps/co-do-hue/stations/${key}-active.png`, act, { webp: false });
      items.push({ key, buf, w: 64, h: 64 }, { key: `${key}-active`, buf: act, w: 64, h: 64 });
      manifest.stations.push({ taskId: STATION_TASKS[i], key, activeKey: `${key}-active`, size: [64, 64], hitbox: [96, 96] });
    }
  }
  // task marker ring also lives in the gameplay atlas
  const marker = path.join(OUT, 'common/ui/task-marker.png');
  if (exists(marker)) items.push({ key: 'task-marker', buf: fs.readFileSync(marker), w: 64, h: 64 });
  for (const role of ROLES) {
    const p = path.join(OUT, `common/ui/abilities/${role}.png`);
    if (exists(p)) items.push({ key: `ability-${role}`, buf: await sharp(p).resize(48, 48).png().toBuffer(), w: 48, h: 48 });
  }
  const a = await buildAtlas('hue-gameplay-0', items, 'maps/co-do-hue/atlas');
  manifest.atlases.push({ name: a.name, file: 'maps/co-do-hue/atlas/hue-gameplay-0', size: a.size });
}

const CLUE_SIZES = {
  'hue-clue-paper': [640, 480],
  'hue-ui-checklist-paper': [400, 520],
  'hue-ui-scan-page': [480, 640],
  'hue-ui-floor-plan': [560, 400],
  'hue-ui-photo-board': [480, 360],
  'hue-ui-seal-record': [400, 360],
  'hue-ui-loan-slip': [400, 300],
  'hue-ui-doc-diff-bg': [640, 480],
  'hue-ui-email-thread': [520, 400],
  'hue-ui-chat-fragment': [360, 280],
  'hue-ui-tour-script': [480, 320],
  'hue-clue-handnote': [360, 280],
  'hue-clue-print-proof': [640, 480],
};
async function packClues() {
  for (const [key, [w, h]] of Object.entries(CLUE_SIZES)) {
    const f = path.join(SRC, `maps/co-do-hue/clues/${key}.png`);
    if (!exists(f)) continue;
    const buf = await sharp(f).resize(w, h, { fit: 'cover' }).png().toBuffer();
    await writeBoth(`maps/co-do-hue/clues/${key}.png`, buf);
    manifest.clues[key] = { file: `maps/co-do-hue/clues/${key}.webp`, size: [w, h] };
  }
  log('clues', Object.keys(manifest.clues).length);
}

async function packMeta() {
  const list = [
    ['meta/hue-lobby-thumb', 640, 360],
    ['meta/hue-map-icon', 128, 128],
    ['meta/hue-loading', 1920, 1080],
  ];
  for (const [rel, w, h] of list) {
    const f = path.join(SRC, `maps/co-do-hue/${rel}.png`);
    if (!exists(f)) continue;
    await writeBoth(`maps/co-do-hue/${rel}.png`, await sharp(f).resize(w, h, { fit: 'cover' }).png().toBuffer());
    manifest.textures[path.basename(rel)] = { file: `maps/co-do-hue/${rel}.webp`, size: [w, h] };
  }
  const npcDir = path.join(SRC, 'maps/co-do-hue/npc');
  if (exists(npcDir))
    for (const file of fs.readdirSync(npcDir)) {
      const img = removeBackground(await loadRaw(path.join(npcDir, file)));
      const key = file.replace('.png', '');
      await writeBoth(`maps/co-do-hue/npc/${key}.png`, await fitTo(crop(img, bboxOf(img)), 256, 256, { align: 'bottom' }));
      manifest.npc[key.replace('hue-npc-', '')] = { file: `maps/co-do-hue/npc/${key}.webp`, size: [256, 256] };
    }
  log('meta + npc');
}

await packPlayer();
// map costume (tools/char-art/draw-characters.mjs) overrides the common avatar in-game
if (exists(path.join(PUB, 'maps/co-do-hue/characters/hue-player-atlas.webp')))
  manifest.textures.mapPlayer = { atlas: 'maps/co-do-hue/characters/hue-player-atlas', tint: 'maps/co-do-hue/characters/hue-player-tint-atlas', frame: [48, 64], anchor: [0.5, 1], costume: 'áo dài + khăn đóng' };
await packUi();
await packRoles();
await packTileset();
await packGameplayAtlas();
await packClues();
await packMeta();

const mf = path.join(OUT, 'manifests/co-do-hue.assets.json');
ensure(mf);
fs.writeFileSync(mf, JSON.stringify(manifest, null, 2));
ensure(path.join(PUB, 'manifests/x'));
fs.writeFileSync(path.join(PUB, 'manifests/co-do-hue.assets.json'), JSON.stringify(manifest, null, 2));
log('manifest written');
