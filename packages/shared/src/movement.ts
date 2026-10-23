import { BODY_HH, BODY_HW, BODY_OY, PLAYER_SPEED, SIM_DT, TILE } from './constants';
import type { LayoutGrid, PxBox } from './layout';

export type Vec = { x: number; y: number };
export type InputDir = { dx: number; dy: number };

/** Every obstacle the body box at feet (x, y) overlaps: wall tiles (as boxes) + prop footprints. */
function blockers(g: LayoutGrid, x: number, y: number): PxBox[] {
  const l = x - BODY_HW, r = x + BODY_HW, t = y + BODY_OY - BODY_HH, b = y + BODY_OY + BODY_HH;
  const walls = g.walls ?? g.solid;
  const out: PxBox[] = [];
  for (let ty = Math.floor(t / TILE); ty <= Math.floor((b - 0.001) / TILE); ty++)
    for (let tx = Math.floor(l / TILE); tx <= Math.floor((r - 0.001) / TILE); tx++)
      if (tx < 0 || ty < 0 || tx >= g.w || ty >= g.h || walls[ty * g.w + tx] === 1)
        out.push([tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE]);
  for (const k of g.boxes ?? []) if (k[0] < r && k[2] > l && k[1] < b && k[3] > t) out.push(k);
  return out;
}

/**
 * Deterministic fixed-step movement shared by server (authoritative) and client (prediction).
 * Axis-separated collision against wall tiles and prop footprints; a blocked axis snaps flush to the obstacle.
 */
export function stepMovement(g: LayoutGrid, pos: Vec, input: InputDir, dt = SIM_DT): Vec {
  // keys send ±1 per axis, the touch stick sends any vector — both are capped to the unit circle
  let dx = Number.isFinite(input.dx) ? input.dx : 0;
  let dy = Number.isFinite(input.dy) ? input.dy : 0;
  const len = Math.hypot(dx, dy);
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  const sx = dx * PLAYER_SPEED * dt;
  const sy = dy * PLAYER_SPEED * dt;
  let { x, y } = pos;

  if (sx !== 0) {
    const nx = x + sx;
    const hits = blockers(g, nx, y);
    if (!hits.length) x = nx;
    else if (sx > 0) x = Math.min(...hits.map((h) => h[0])) - BODY_HW;
    else x = Math.max(...hits.map((h) => h[2])) + BODY_HW;
    if (blockers(g, x, y).length) x = pos.x;
  }
  if (sy !== 0) {
    const ny = y + sy;
    const hits = blockers(g, x, ny);
    if (!hits.length) y = ny;
    else if (sy > 0) y = Math.min(...hits.map((h) => h[1])) - BODY_OY - BODY_HH;
    else y = Math.max(...hits.map((h) => h[3])) - BODY_OY + BODY_HH;
    if (blockers(g, x, y).length) y = pos.y;
  }
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/** 0=down 1=left 2=right 3=up (matches sprite sheet rows). */
export function dirFromInput(input: InputDir, prev: number): number {
  if (input.dy > 0 && Math.abs(input.dy) >= Math.abs(input.dx)) return 0;
  if (input.dy < 0 && Math.abs(input.dy) >= Math.abs(input.dx)) return 3;
  if (input.dx < 0) return 1;
  if (input.dx > 0) return 2;
  return prev;
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
