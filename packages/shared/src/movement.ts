import { BODY_HH, BODY_HW, PLAYER_SPEED, SIM_DT, TILE } from './constants';
import { isSolidTile, type LayoutGrid } from './layout';

export type Vec = { x: number; y: number };
export type InputDir = { dx: number; dy: number };

function collides(g: LayoutGrid, x: number, y: number): boolean {
  const x0 = Math.floor((x - BODY_HW) / TILE);
  const x1 = Math.floor((x + BODY_HW - 0.001) / TILE);
  const y0 = Math.floor((y - BODY_HH) / TILE);
  const y1 = Math.floor((y + BODY_HH - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolidTile(g, tx, ty)) return true;
  return false;
}

/**
 * Deterministic fixed-step movement shared by server (authoritative) and client (prediction).
 * Axis-separated collision against the tile grid.
 */
export function stepMovement(g: LayoutGrid, pos: Vec, input: InputDir, dt = SIM_DT): Vec {
  let dx = Math.sign(input.dx);
  let dy = Math.sign(input.dy);
  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  const sx = dx * PLAYER_SPEED * dt;
  const sy = dy * PLAYER_SPEED * dt;
  let { x, y } = pos;

  if (sx !== 0) {
    const nx = x + sx;
    if (!collides(g, nx, y)) x = nx;
    else if (sx > 0) x = Math.floor((nx + BODY_HW) / TILE) * TILE - BODY_HW;
    else x = (Math.floor((nx - BODY_HW) / TILE) + 1) * TILE + BODY_HW;
    if (collides(g, x, y)) x = pos.x;
  }
  if (sy !== 0) {
    const ny = y + sy;
    if (!collides(g, x, ny)) y = ny;
    else if (sy > 0) y = Math.floor((ny + BODY_HH) / TILE) * TILE - BODY_HH;
    else y = (Math.floor((ny - BODY_HH) / TILE) + 1) * TILE + BODY_HH;
    if (collides(g, x, y)) y = pos.y;
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
