import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME, PREP_TASK_IDS, dealTasks } from '@hidden-truth/shared';
import { ArrestHold, Delivery, recentActivities, type Activity } from './delivery';

const HOME = { x: 100, y: 100 };
/** three drivers a/b/c (counted) and the cop k (fake list) */
const fresh = (per = 2) => {
  const d = new Delivery();
  d.reset(dealTasks(['a', 'b', 'c', 'k'], per), ['a', 'b', 'c'], HOME);
  return d;
};
const finishAll = (d: Delivery, id: string) => {
  for (const t of d.tasksOf(id)) d.complete(id, t.id);
};

test('deal: every player gets their own distinct stations, spread across the map', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];
  const deal = dealTasks(ids, 3);
  for (const id of ids) {
    assert.equal(deal[id].length, 3);
    assert.equal(new Set(deal[id]).size, 3, `${id}: no repeats`);
  }
  const load = new Map<string, number>();
  for (const id of ids) for (const t of deal[id]) load.set(t, (load.get(t) ?? 0) + 1);
  const counts = PREP_TASK_IDS.map((t) => load.get(t) ?? 0);
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `balanced: ${counts}`);
  assert.equal(dealTasks(['a'], 99).a.length, PREP_TASK_IDS.length, 'capped at the station count');
  assert.equal(dealTasks(['a'], 0).a.length, 1, 'at least one');
});

test('a player can only open and finish stations on their own list', () => {
  const d = fresh();
  const [mine] = d.tasksOf('a');
  const other = PREP_TASK_IDS.find((t) => !d.tasksOf('a').some((x) => x.id === t))!;
  assert.equal(d.canOpen('a', other), false);
  assert.equal(d.complete('a', other), false);
  assert.equal(d.canOpen('a', mine.id), true);
  assert.equal(d.complete('a', mine.id), true);
  assert.equal(d.complete('a', mine.id), false, 'already done');
  assert.equal(d.canOpen('a', mine.id), false);
  assert.equal(d.done, 1);
  assert.equal(d.target, 6);
});

test('the cop ticks off a fake list that never moves the bar', () => {
  const d = fresh();
  finishAll(d, 'k');
  assert.ok(d.tasksOf('k').every((t) => t.done));
  assert.equal(d.done, 0);
});

test('handoff opens only when every driver finished their list', () => {
  const d = fresh();
  finishAll(d, 'a');
  finishAll(d, 'b');
  assert.equal(d.handoffOpen, false);
  assert.equal(d.canOpen('a', 'handoff_package'), false);
  finishAll(d, 'c');
  assert.equal(d.handoffOpen, true);
  assert.equal(d.canOpen('a', 'handoff_package'), true);
});

test('a driver who leaves hands their unfinished stations to the others', () => {
  const d = fresh(3);
  const [first] = d.tasksOf('a');
  d.complete('a', first.id);
  const moved = d.reassign('a', ['b', 'c']);
  assert.equal(moved.length, 2);
  assert.equal(d.target, 9, 'nothing lost, their finished one stays counted');
  assert.equal(d.tasksOf('b').length + d.tasksOf('c').length, 8);
  finishAll(d, 'b');
  finishAll(d, 'c');
  assert.equal(d.handoffOpen, true);
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
  d.complete('a', d.tasksOf('a')[0].id);
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
    { taskId: 'pack_cooler', at: 1_000, status: 'done' },
    { taskId: 'brew_coffee', at: 2_000, status: 'failed' },
    { taskId: 'brew_coffee', at: 3_000, status: 'done' },
    { taskId: 'tape_box', at: 9_000, status: 'done' },
  ];
  const r = recentActivities(log, 12_000, GAME.inspectEntries);
  assert.deepEqual(
    r.map((e) => [e.taskId, e.agoSec, e.status]),
    [
      ['tape_box', 3, 'done'],
      ['brew_coffee', 9, 'done'],
      ['brew_coffee', 10, 'failed'],
    ],
  );
  for (const e of r) assert.deepEqual(Object.keys(e).sort(), ['agoSec', 'status', 'taskId']);
});
