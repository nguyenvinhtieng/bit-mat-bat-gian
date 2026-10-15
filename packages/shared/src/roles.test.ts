import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PLAYERS, MIN_PLAYERS, clampKillers, killersFor, maxKillersFor } from './index';

test('a game needs at least 4 players', () => {
  assert.equal(MIN_PLAYERS, 4);
});

test('the killer cap keeps the crew at least twice the killers', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    const k = maxKillersFor(n);
    assert.ok(k >= 1, `${n} players: at least one killer`);
    assert.ok(n - k >= 2 * k, `${n} players: ${k} killers is too many`);
  }
  assert.equal(maxKillersFor(4), 1);
  assert.equal(maxKillersFor(6), 1);
  assert.equal(maxKillersFor(7), 2);
  assert.equal(maxKillersFor(10), 3);
});

test('auto and manual killer counts stay within 1..cap', () => {
  for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n++) {
    assert.ok(killersFor(n) >= 1 && killersFor(n) <= maxKillersFor(n), `auto ${n}`);
    assert.equal(clampKillers(0, n), 1);
    assert.equal(clampKillers(99, n), maxKillersFor(n));
  }
  assert.equal(clampKillers(2, 6), 1);
  assert.equal(clampKillers(2, 8), 2);
});
