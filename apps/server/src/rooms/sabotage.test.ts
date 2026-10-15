import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SABOTAGE, WARD_SPOTS, type Pt } from '@hidden-truth/shared';
import { Sabotage } from './sabotage';

const S = 1000;
const spot = WARD_SPOTS[0];
const at = (p: Pt | null) => () => p;

test('cannot start before the cooldown, nor while another runs', () => {
  const sab = new Sabotage();
  sab.reset(10 * S);
  assert.equal(sab.start('blind', 5 * S), 'cooldown');
  assert.equal(sab.start('blind', 10 * S), 'ok');
  assert.equal(sab.kind, 'blind');
  assert.equal(sab.endsAt, 10 * S + SABOTAGE.blindSec * S);
  assert.equal(sab.start('ward', 11 * S, spot), 'busy');
  assert.equal(sab.readyAt, 10 * S + SABOTAGE.cooldownSec * S, 'shared cooldown starts at launch');
});

test('ward needs a spot', () => {
  const sab = new Sabotage();
  assert.equal(sab.start('ward', 0), 'busy');
  assert.equal(sab.kind, null);
});

test('blind ends by itself', () => {
  const sab = new Sabotage();
  sab.start('blind', 0);
  assert.equal(sab.tick(SABOTAGE.blindSec * S - 1, at(null)), null);
  assert.deepEqual(sab.tick(SABOTAGE.blindSec * S, at(null)), { type: 'ended', kind: 'blind' });
  assert.equal(sab.kind, null);
});

test('ward expires into a loss when nobody fixes it', () => {
  const sab = new Sabotage();
  sab.start('ward', 0, spot);
  assert.equal(sab.spot, spot);
  assert.equal(sab.tick(SABOTAGE.wardSec * S - 1, at(null)), null);
  assert.deepEqual(sab.tick(SABOTAGE.wardSec * S, at(null)), { type: 'expired' });
  assert.equal(sab.kind, null);
});

test('holding at the spot for the full time fixes the ward', () => {
  const sab = new Sabotage();
  sab.start('ward', 0, spot);
  assert.equal(sab.fixStart('a', 1 * S, spot), true);
  assert.equal(sab.tick(1 * S + SABOTAGE.fixHoldSec * S - 1, at(spot)), null, 'too short');
  assert.deepEqual(sab.tick(1 * S + SABOTAGE.fixHoldSec * S, at(spot)), { type: 'fixed', by: 'a' });
  assert.equal(sab.kind, null);
});

test('fixing is refused far from the spot, during blind, or with nothing running', () => {
  const sab = new Sabotage();
  const far = { x: spot.x + SABOTAGE.fixRange + 1, y: spot.y };
  assert.equal(sab.fixStart('a', 0, spot), false);
  sab.start('blind', 0);
  assert.equal(sab.fixStart('a', 0, spot), false);
  sab.tick(SABOTAGE.blindSec * S, at(null));
  sab.reset(0);
  sab.start('ward', 0, spot);
  assert.equal(sab.fixStart('a', 0, far), false);
});

test('walking away, dying or letting go cancels the hold', () => {
  const sab = new Sabotage();
  const far = { x: spot.x + SABOTAGE.fixRange + 1, y: spot.y };
  const done = SABOTAGE.fixHoldSec * S;
  sab.start('ward', 0, spot);

  sab.fixStart('a', 0, spot);
  assert.equal(sab.tick(1, at(far)), null);
  assert.equal(sab.tick(done, at(spot)), null, 'moved away: hold dropped');

  sab.fixStart('a', done, spot);
  assert.equal(sab.tick(done + 1, at(null)), null, 'dead/gone');
  assert.equal(sab.tick(2 * done, at(spot)), null);

  sab.fixStart('a', 2 * done, spot);
  sab.fixStop('a');
  assert.equal(sab.tick(3 * done, at(spot)), null, 'released');
  assert.equal(sab.kind, 'ward');
});

test('a meeting clears the sabotage; cooldown only ever extends', () => {
  const sab = new Sabotage();
  sab.start('ward', 0, spot);
  sab.fixStart('a', 0, spot);
  sab.interrupt();
  assert.equal(sab.kind, null);
  assert.equal(sab.spot, null);
  assert.equal(sab.tick(SABOTAGE.wardSec * S, at(spot)), null);
  const r = sab.readyAt;
  sab.cooldown(r - 1);
  assert.equal(sab.readyAt, r);
  sab.cooldown(r + 5 * S);
  assert.equal(sab.readyAt, r + 5 * S);
});
