import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME, PREP_TASK_IDS, prepPlan } from '@hidden-truth/shared';
import { ArrestHold, Delivery, recentActivities, type Activity } from './delivery';

const HOME = { x: 100, y: 100 };
const fresh = (drivers = 3, turns = 1) => {
  const d = new Delivery();
  d.reset(prepPlan(drivers, turns), HOME);
  return d;
};

test('prep plan: every prep task at least once, total = max(7, turns × drivers)', () => {
  const sum = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0);
  assert.equal(sum(prepPlan(3, 2)), 7);
  assert.equal(sum(prepPlan(5, 2)), 10);
  assert.equal(sum(prepPlan(9, 2)), 18);
  for (const id of PREP_TASK_IDS) assert.ok(prepPlan(3, 1)[id] >= 1, id);
});

test('only real (driver) completions advance preparation, each turn once', () => {
  const d = fresh();
  assert.equal(d.complete('check_seal', false), false, 'undercover fake task');
  assert.equal(d.done, 0);
  assert.equal(d.complete('check_seal', true), true);
  assert.equal(d.complete('check_seal', true), false, 'station already finished');
  assert.equal(d.done, 1);
  assert.equal(d.target, 7);
});

test('handoff stays locked until preparation reaches 100%', () => {
  const d = fresh();
  for (const id of PREP_TASK_IDS.slice(0, -1)) d.complete(id, true);
  assert.equal(d.handoffOpen, false);
  assert.equal(d.canOpen('handoff_package'), false);
  d.complete('confirm_recipient', true);
  assert.equal(d.handoffOpen, true);
  assert.equal(d.canOpen('handoff_package'), true);
  assert.equal(d.canOpen('check_seal'), false, 'finished prep stations close');
});

test('package: pick up in range, follow nobody else, drop on arrest, pick up again', () => {
  const d = fresh();
  assert.equal(d.pick('a', { x: 500, y: 500 }), 'far');
  assert.equal(d.pick('a', { x: 110, y: 100 }), 'ok');
  assert.equal(d.carrier, 'a');
  assert.equal(d.pick('b', { x: 110, y: 100 }), 'taken');
  d.onGone('a', { x: 300, y: 320 });
  assert.equal(d.state, 'dropped');
  assert.deepEqual({ x: d.x, y: d.y }, { x: 300, y: 320 });
  assert.equal(d.pick('b', { x: 300, y: 300 }), 'ok');
  assert.equal(d.drop('a', { x: 0, y: 0 }), false, 'only the carrier drops');
  assert.equal(d.drop('b', { x: 50, y: 60 }), true);
  assert.equal(d.state, 'dropped');
});

test('a dropped package keeps preparation progress', () => {
  const d = fresh();
  d.complete('receive_package', true);
  d.pick('a', HOME);
  d.onGone('a', HOME);
  assert.equal(d.done, 1);
});

test('arrest hold: completes after the hold, cancels when the target leaves range', () => {
  const h = new ArrestHold();
  const ms = GAME.arrestHoldSec * 1000;
  assert.equal(h.start('cop', 'v', 0), true);
  const near = () => true;
  assert.equal(h.tick(ms - 1, near), null);
  assert.deepEqual(h.tick(ms, near), { type: 'done', actor: 'cop', target: 'v' });
  assert.equal(h.active, false);

  h.start('cop', 'v', 0);
  assert.deepEqual(h.tick(100, () => false), { type: 'cancel', actor: 'cop', target: 'v' });
  assert.equal(h.tick(ms, near), null);
});

test('arrest hold: release cancels, a second start while holding is refused', () => {
  const h = new ArrestHold();
  h.start('cop', 'v', 0);
  assert.equal(h.start('cop', 'w', 10), false);
  assert.deepEqual(h.release('cop'), { type: 'cancel', actor: 'cop', target: 'v' });
  assert.equal(h.release('cop'), null);
});

test('veteran sees at most 3 latest activities, newest first, with relative time and no role info', () => {
  const log: Activity[] = [
    { taskId: 'receive_package', at: 1_000, status: 'done' },
    { taskId: 'check_seal', at: 2_000, status: 'failed' },
    { taskId: 'check_seal', at: 3_000, status: 'done' },
    { taskId: 'plan_route', at: 9_000, status: 'done' },
  ];
  const r = recentActivities(log, 12_000, GAME.inspectEntries);
  assert.deepEqual(
    r.map((e) => [e.taskId, e.agoSec, e.status]),
    [
      ['plan_route', 3, 'done'],
      ['check_seal', 9, 'done'],
      ['check_seal', 10, 'failed'],
    ],
  );
  for (const e of r) assert.deepEqual(Object.keys(e).sort(), ['agoSec', 'status', 'taskId']);
});
