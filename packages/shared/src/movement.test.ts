import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, areaAt, SPAWNS, isSolidTile } from './layout';
import { stepMovement } from './movement';
import { PLAYER_SPEED, SIM_DT, TILE } from './constants';
import { HUE_STATIONS } from './maps/co-do-hue';

test('spawns are walkable and inside the courtyard', () => {
  const g = getGrid();
  for (const s of SPAWNS) {
    assert.equal(isSolidTile(g, Math.floor(s.x / TILE), Math.floor(s.y / TILE)), false, JSON.stringify(s));
    assert.equal(areaAt(g, s.x, s.y), 'courtyard_checkin');
  }
});

test('stations sit inside their area', () => {
  const g = getGrid();
  for (const st of HUE_STATIONS) assert.equal(areaAt(g, st.x, st.y), st.area, st.id);
});

test('walls block movement', () => {
  const g = getGrid();
  let p = { x: 21 * TILE, y: 3 * TILE - 30 }; // courtyard, north of table
  for (let i = 0; i < 200; i++) p = stepMovement(g, p, { dx: 0, dy: -1 });
  assert.ok(p.y >= 1 * TILE + 7 - 0.01, `y=${p.y}`);
});

test('analog input: speed is capped, direction is kept, keyboard diagonals unchanged', () => {
  const g = getGrid();
  const p0 = { x: SPAWNS[0].x, y: SPAWNS[0].y };
  // positions are quantised to 0.01px, hence the tolerances
  const len = (q: { x: number; y: number }) => Math.hypot(q.x - p0.x, q.y - p0.y);
  const full = PLAYER_SPEED * SIM_DT;
  // keyboard diagonal (1,1) still moves at full speed, not sqrt(2)x
  assert.ok(Math.abs(len(stepMovement(g, p0, { dx: 1, dy: 1 })) - full) < 0.02);
  // over-long analog vectors are clamped to the unit circle
  assert.ok(Math.abs(len(stepMovement(g, p0, { dx: 5, dy: -5 })) - full) < 0.02);
  // a half-tilted stick walks at half speed
  assert.ok(Math.abs(len(stepMovement(g, p0, { dx: 0.5, dy: 0 })) - full / 2) < 0.02);
  // a 30° stick keeps its angle (both axes move, x more than y)
  const a = (30 * Math.PI) / 180;
  const q = stepMovement(g, p0, { dx: Math.cos(a), dy: Math.sin(a) });
  assert.ok(Math.abs(Math.atan2(q.y - p0.y, q.x - p0.x) - a) < 0.01);
});

test('every area is reachable from spawn', () => {
  const g = getGrid();
  const start = [Math.floor(SPAWNS[0].x / TILE), Math.floor(SPAWNS[0].y / TILE)];
  const seen = new Set<number>([start[1] * g.w + start[0]]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (isSolidTile(g, nx, ny) || seen.has(ny * g.w + nx)) continue;
      seen.add(ny * g.w + nx);
      q.push([nx, ny]);
    }
  }
  for (const st of HUE_STATIONS) {
    assert.ok(seen.has(Math.floor(st.y / TILE) * g.w + Math.floor(st.x / TILE)), `${st.id} unreachable`);
  }
});

test('decor never seals off floor: every walkable cell is reachable from spawn', () => {
  const g = getGrid();
  const start = [Math.floor(SPAWNS[0].x / TILE), Math.floor(SPAWNS[0].y / TILE)];
  const seen = new Set<number>([start[1] * g.w + start[0]]);
  const q = [start];
  while (q.length) {
    const [x, y] = q.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (isSolidTile(g, nx, ny) || seen.has(ny * g.w + nx)) continue;
      seen.add(ny * g.w + nx);
      q.push([nx, ny]);
    }
  }
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) if (!isSolidTile(g, x, y)) assert.ok(seen.has(y * g.w + x), `pocket at ${x},${y}`);
});
