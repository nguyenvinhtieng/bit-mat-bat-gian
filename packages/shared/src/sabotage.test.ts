import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AREA_IDS, MAP_SKINS, MEETING_POINT, SABOTAGE, WARD_SPOTS, areaAt, getGrid, isSolidTile, TILE } from './index';

test('ward spots are walkable, inside their area, one per room, away from the meeting table', () => {
  const g = getGrid();
  assert.ok(WARD_SPOTS.length >= 3);
  assert.equal(new Set(WARD_SPOTS.map((s) => s.area)).size, WARD_SPOTS.length);
  for (const s of WARD_SPOTS) {
    assert.ok((AREA_IDS as readonly string[]).includes(s.area), s.area);
    assert.equal(areaAt(g, s.x, s.y), s.area, `${s.area} spot lies in another area`);
    assert.equal(isSolidTile(g, Math.floor(s.x / TILE), Math.floor(s.y / TILE)), false, `${s.area} spot is solid`);
    assert.ok(Math.hypot(s.x - MEETING_POINT.x, s.y - MEETING_POINT.y) > SABOTAGE.fixRange * 3, `${s.area} spot too close to the table`);
  }
});

test('ward spots never overlap a task station on any map', () => {
  for (const skin of Object.values(MAP_SKINS)) {
    for (const s of WARD_SPOTS) {
      for (const st of skin.stations) {
        const d = Math.hypot(s.x - st.x, s.y - st.y);
        assert.ok(d > SABOTAGE.fixRange * 2, `${skin.slug}: ${s.area} ward spot overlaps ${st.id} (${Math.round(d)}px)`);
      }
    }
  }
});

test('every skin names both sabotages and has a sabotage ending', () => {
  for (const skin of Object.values(MAP_SKINS)) {
    for (const k of ['blind', 'ward'] as const) {
      const sk = skin.sabotage[k];
      assert.ok(sk.name.vi && sk.name.en && sk.alert.vi && sk.alert.en, `${skin.slug} ${k}`);
    }
    assert.ok(skin.sabotage.ward.fix.vi && skin.sabotage.ward.fix.en, `${skin.slug} fix label`);
    assert.ok(skin.sabotage.ward.alert.vi.includes('{area}'), `${skin.slug} ward alert names the area`);
    assert.ok(skin.story.endings.sabotage, `${skin.slug} sabotage ending`);
  }
});

test('sabotage timings leave room to react', () => {
  assert.ok(SABOTAGE.fixHoldSec * 4 < SABOTAGE.wardSec);
  assert.ok(SABOTAGE.blindSec < SABOTAGE.cooldownSec);
  assert.ok(SABOTAGE.blindVision > 0 && SABOTAGE.blindVision < 1);
});
