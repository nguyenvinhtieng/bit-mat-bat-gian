import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSeePoint, type LayoutGrid } from './layout';
import { TILE } from './constants';

/** 10x5 open grid with the given solid cells */
function grid(solid: [number, number][]): LayoutGrid {
  const g: LayoutGrid = { w: 10, h: 5, area: new Int8Array(50), solid: new Uint8Array(50) };
  for (const [x, y] of solid) g.solid[y * 10 + x] = 1;
  return g;
}

test('a pillar covering the whole silhouette blocks sight', () => {
  const g = grid([[4, 2]]);
  assert.equal(canSeePoint(g, { x: 1.5 * TILE, y: 2 * TILE + 40 }, { x: 7.5 * TILE, y: 2 * TILE + 40 }, 400), false);
});

test('only the head behind a wall edge: the body is still seen', () => {
  const g = grid([[4, 1]]);
  assert.equal(canSeePoint(g, { x: 1.5 * TILE, y: 2 * TILE + 20 }, { x: 7.5 * TILE, y: 2 * TILE + 20 }, 400), true);
});

test('beyond the radius nothing is seen, even in the open', () => {
  const g = grid([]);
  assert.equal(canSeePoint(g, { x: 1 * TILE, y: 2 * TILE }, { x: 9 * TILE, y: 2 * TILE }, 200), false);
  assert.equal(canSeePoint(g, { x: 1 * TILE, y: 2 * TILE }, { x: 5 * TILE, y: 2 * TILE }, 200), true);
});

test('props (solid but not walls) do not block sight', () => {
  const g = grid([[4, 2]]);
  g.walls = new Uint8Array(50); // the pillar is a prop, not a wall
  assert.equal(canSeePoint(g, { x: 1.5 * TILE, y: 2 * TILE + 40 }, { x: 7.5 * TILE, y: 2 * TILE + 40 }, 400), true);
});
