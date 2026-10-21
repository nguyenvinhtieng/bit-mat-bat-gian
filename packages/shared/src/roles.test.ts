import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_PLAYERS, ROLE_IDS, ROLE_INFO, MAP_SKINS, GAME_SLUG } from './index';

test('a game needs at least 4 players', () => {
  assert.equal(MIN_PLAYERS, 4);
});

test('exactly the three Cuốc Cuối roles, all in CRAB uniform', () => {
  assert.deepEqual([...ROLE_IDS].sort(), ['driver', 'undercover', 'veteran_driver']);
  assert.equal(ROLE_INFO.undercover.faction, 'killer');
  assert.equal(ROLE_INFO.driver.faction, 'crew');
  assert.equal(ROLE_INFO.veteran_driver.faction, 'crew');
  for (const id of ROLE_IDS) assert.ok(MAP_SKINS[GAME_SLUG].roles[id].name, id);
});
