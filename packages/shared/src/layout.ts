import { TILE, type AreaId } from './constants';

/**
 * Common layout (one for every map). Rects are in tile units: [x, y, w, h].
 * Topology follows the room diagram in prompts/map/co-do-hue.md.
 */
export const LAYOUT_W = 42;
export const LAYOUT_H = 32;

export type Rect = [number, number, number, number];

export const AREA_RECTS: Record<AreaId, Rect[]> = {
  courtyard_checkin: [[15, 1, 12, 6]],
  exhibition: [[2, 8, 11, 10]],
  coordination: [[29, 8, 11, 10]],
  corridor: [
    [19, 7, 4, 12], // central hall: courtyard -> editing
    [13, 11, 6, 3], // west hall -> exhibition
    [23, 11, 6, 3], // east hall -> coordination
    [15, 25, 3, 1], // editing -> archive
    [24, 25, 3, 1], // editing -> storage
    [9, 18, 3, 8], // west loop: exhibition -> archive
    [33, 18, 3, 8], // east loop: coordination -> storage
  ],
  editing: [[14, 19, 14, 6]],
  archive: [[4, 26, 15, 5]],
  artifact_storage: [[23, 26, 15, 5]],
};

/** Furniture slots that block movement (tile rects). Skins decide which prop art sits on each slot. */
export const FURNITURE_SLOTS: Record<string, Rect> = {
  meeting_table: [19, 3, 4, 2],
  exhibition_panel: [5, 11, 2, 1],
  editing_printer: [14, 20, 2, 1],
  editing_scanner: [26, 20, 2, 1],
  editing_desk: [19, 22, 3, 1],
  archive_shelf: [5, 26, 4, 1],
  storage_copy_stand: [32, 27, 2, 1],
  storage_crate: [26, 29, 1, 1], // the station cell (25,30) sits between lantern + censer: keep 25,29 open
  coord_whiteboard: [30, 8, 3, 1],
  coord_desk: [33, 7, 2, 1],
  courtyard_bench: [24, 1, 3, 1],
  // decor footprints (columns, lanterns, plants, shelves…) — keep every station reachable (movement.test.ts)
  decor_cy_urn_w: [15, 1, 1, 1],
  decor_cy_urn_e: [26, 6, 1, 1],
  decor_cy_flag: [16, 3, 1, 1],
  decor_ex_throne: [6, 9, 3, 1],
  decor_ex_crane_w: [5, 9, 1, 1],
  decor_ex_crane_e: [9, 9, 1, 1],
  decor_ex_col_nw: [3, 9, 1, 1],
  decor_ex_col_ne: [11, 9, 1, 1],
  decor_ex_lamp_w: [3, 14, 1, 1],
  decor_ex_lamp_e: [11, 14, 1, 1],
  decor_ex_vase_w: [2, 8, 1, 1],
  decor_ex_vase_e: [12, 8, 1, 1],
  decor_co_plant_n: [19, 8, 1, 1],
  decor_co_plant_s: [22, 17, 1, 1],
  decor_th_bench_w: [30, 16, 2, 1],
  decor_th_bench_e: [37, 16, 2, 1],
  decor_th_zither: [38, 12, 2, 1],
  decor_th_col_nw: [29, 10, 1, 1],
  decor_th_col_sw: [29, 14, 1, 1],
  decor_th_col_ne: [39, 10, 1, 1],
  decor_th_vase: [39, 8, 1, 1],
  decor_ob_shelf_w: [17, 19, 2, 1],
  decor_ob_shelf_e: [23, 19, 2, 1],
  decor_ob_scope: [27, 19, 1, 1],
  decor_ob_globe: [14, 19, 1, 1],
  decor_ob_sundial: [14, 24, 1, 1],
  decor_ob_lamp: [27, 24, 1, 1],
  decor_ar_desk: [15, 28, 2, 1],
  decor_ar_chest_e: [17, 30, 2, 1],
  decor_ar_chest_m: [10, 30, 2, 1],
  decor_ar_jar_w: [4, 30, 1, 1],
  decor_ar_jar_e: [18, 26, 1, 1],
  decor_ar_lamp: [4, 26, 1, 1],
  decor_st_urn_m: [29, 27, 2, 1],
  decor_st_tree: [36, 29, 1, 1],
  decor_st_lantern_w: [24, 30, 1, 1],
  decor_st_lantern_n: [23, 26, 1, 1],
  decor_st_censer: [26, 30, 1, 1],
};

export type Point = { x: number; y: number };
const px = (tx: number, ty: number): Point => ({ x: Math.round(tx * TILE), y: Math.round(ty * TILE) });

/** Meeting table centre and 10 spawn slots around it (pixel, feet position). */
export const MEETING_POINT = px(21, 4);
export const SPAWNS: Point[] = [
  px(18, 2.6), px(18, 4.2), px(18, 5.8), px(20, 5.5), px(22, 5.5),
  px(24, 5.8), px(24, 4.2), px(24, 2.6), px(16.4, 4.2), px(25.6, 4.2),
];

/** Where a `ward` sabotage can strike: one open spot per room (feet position, px), well clear of every task station. The meeting courtyard is safe. */
export const WARD_SPOTS: { area: AreaId; x: number; y: number }[] = [
  { area: 'exhibition', ...px(9.5, 16.5) },
  { area: 'coordination', ...px(34.5, 13.5) },
  { area: 'editing', ...px(21.5, 20.5) },
  { area: 'archive', ...px(17.5, 27.5) },
  { area: 'artifact_storage', ...px(30.5, 28.5) },
];

export type LayoutGrid = {
  w: number;
  h: number;
  /** area index per cell (-1 = wall/void) */
  area: Int8Array;
  solid: Uint8Array;
};

export function buildGrid(): LayoutGrid {
  const w = LAYOUT_W;
  const h = LAYOUT_H;
  const area = new Int8Array(w * h).fill(-1);
  const solid = new Uint8Array(w * h).fill(1);
  const ids = Object.keys(AREA_RECTS) as AreaId[];
  ids.forEach((id, idx) => {
    for (const [x, y, rw, rh] of AREA_RECTS[id]) {
      for (let j = y; j < y + rh; j++)
        for (let i = x; i < x + rw; i++) {
          area[j * w + i] = idx;
          solid[j * w + i] = 0;
        }
    }
  });
  for (const [x, y, rw, rh] of Object.values(FURNITURE_SLOTS)) {
    for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) solid[j * w + i] = 1;
  }
  return { w, h, area, solid };
}

export const AREA_ORDER = Object.keys(AREA_RECTS) as AreaId[];

let cached: LayoutGrid | null = null;
export function getGrid(): LayoutGrid {
  return (cached ??= buildGrid());
}

/** Lobby only: the courtyard's one exit (top of the central hall) is gated so everyone waits in the courtyard.
 *  Two rows: the gate art (roof + stone step) reaches a tile into the courtyard, so players must stop in front of it. */
export const LOBBY_GATE: Rect = [19, 6, 4, 2];

/** The lobby gate was removed: the lobby uses the normal grid. */
export function getLobbyGrid(): LayoutGrid {
  return getGrid();
}

export function isSolidTile(g: LayoutGrid, tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return true;
  return g.solid[ty * g.w + tx] === 1;
}

export function areaAt(g: LayoutGrid, x: number, y: number): AreaId | null {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h) return null;
  const i = g.area[ty * g.w + tx];
  return i >= 0 ? AREA_ORDER[i] : null;
}

/** Grid raycast: true when no solid tile lies between two pixel points. */
export function hasLineOfSight(g: LayoutGrid, a: Point, b: Point): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.ceil(d / (TILE / 4));
  for (let i = 1; i < steps; i++) {
    const k = i / steps;
    if (isSolidTile(g, Math.floor((a.x + (b.x - a.x) * k) / TILE), Math.floor((a.y + (b.y - a.y) * k) / TILE))) return false;
  }
  return true;
}

/** silhouette sample heights (px above the feet): head, chest, knees */
const SIGHT_OFFSETS = [30, 18, 6];

/**
 * Can someone standing at `eye` (feet) see a player standing at `target` (feet)?
 * Within `radius`, and any of a few rays between the two silhouettes clears the walls —
 * a single head-to-head ray loses players whose head just grazes a wall corner.
 */
export function canSeePoint(g: LayoutGrid, eye: Point, target: Point, radius: number): boolean {
  if (Math.hypot(target.x - eye.x, target.y - eye.y) > radius) return false;
  for (const a of SIGHT_OFFSETS)
    for (const b of SIGHT_OFFSETS)
      if (hasLineOfSight(g, { x: eye.x, y: eye.y - a }, { x: target.x, y: target.y - b })) return true;
  return false;
}
