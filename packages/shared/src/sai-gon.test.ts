import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGrid, areaAt, SPAWNS, isSolidTile } from './layout';
import { TILE, TASK_IDS } from './constants';
import { MAP_SKINS, SG_STATIONS, SG_TASK_IDS } from './index';

test('SG stations sit inside their area and are reachable from spawn', () => {
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
  for (const st of SG_STATIONS) {
    assert.equal(areaAt(g, st.x, st.y), st.area, st.id);
    assert.ok(seen.has(Math.floor(st.y / TILE) * g.w + Math.floor(st.x / TILE)), `${st.id} unreachable`);
  }
});

test('SG has one station per task id, all registered in TASK_IDS', () => {
  assert.deepEqual(SG_STATIONS.map((s) => s.id).sort(), [...SG_TASK_IDS].sort());
  for (const id of SG_TASK_IDS) assert.ok((TASK_IDS as readonly string[]).includes(id), id);
});

test('the Sài Gòn skin never leaks Huế / Thăng Long names', () => {
  const text = JSON.stringify(MAP_SKINS['sai-gon']);
  for (const w of ['Âm Binh', 'Ngự Lâm', 'Huế', 'Thăng Long', 'canh năm', 'Shadow', 'hue-', 'tl-']) assert.ok(!text.includes(w), w);
});

test('the Sài Gòn body is a painted prop (bike + tinted helmet), not the die pose', () => {
  assert.equal(MAP_SKINS['sai-gon'].art.body, 'sg-body');
  for (const slug of ['co-do-hue', 'thang-long']) assert.equal(MAP_SKINS[slug].art.body, undefined, slug);
});
