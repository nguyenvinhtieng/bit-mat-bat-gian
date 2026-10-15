import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, areaAt, SPAWNS, isSolidTile } from './layout';
import { stepMovement } from './movement';
import { TILE } from './constants';
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
