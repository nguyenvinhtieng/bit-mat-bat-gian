import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TASK_IDS, type Pt, type TaskData } from '@hidden-truth/shared';
import { GAME_CONTENT } from './index';
import type { Pending } from '../common/util';

const CTX = { handoffCode: '4721' };

/** Build a task and a Pending opened just long enough ago to pass the minimum solve time. */
function open<T extends TaskData['taskId']>(taskId: T) {
  const built = GAME_CONTENT.buildTask(taskId, CTX);
  assert.ok(built, `buildTask(${taskId}) returned null`);
  const p: Pending = { taskId, expected: built.expected, openedAt: Date.now() - (built.minMs ?? 0) - 10, minMs: built.minMs };
  return { data: built.data as Extract<TaskData, { taskId: T }>, p, built };
}
const ok = (p: Pending, a: unknown) => GAME_CONTENT.verifyTask(p, a);

test('every task builds, has a story card + done line, and rejects garbage', () => {
  for (const id of TASK_IDS) {
    const { data, p, built } = open(id);
    assert.equal(data.taskId, id);
    assert.ok(built.fact.headline && built.fact.text, `${id} fact`);
    assert.ok(built.done, `${id} done`);
    for (const junk of [null, undefined, 42, 'x', [], {}]) assert.equal(ok(p, junk), false, `${id} accepted ${JSON.stringify(junk)}`);
  }
});

test('answers are rejected when submitted too fast', () => {
  const built = GAME_CONTENT.buildTask('receive_package', CTX)!;
  const p: Pending = { taskId: 'receive_package', expected: built.expected, openedAt: Date.now(), minMs: built.minMs };
  assert.equal(ok(p, built.expected), false);
});

test('receive package: exactly one box matches the slip', () => {
  for (let i = 0; i < 30; i++) {
    const { data, p } = open('receive_package');
    const key = (codes: string[]) => [...codes].sort().join('|');
    const match = data.boxes.filter((b) => key(b.codes) === key(data.slip));
    assert.equal(match.length, 1);
    assert.equal(ok(p, match[0].id), true);
    for (const b of data.boxes) if (b !== match[0]) assert.equal(ok(p, b.id), false);
  }
});

test('check seal: turning every piece upright passes, one piece off fails', () => {
  const { data, p } = open('check_seal');
  assert.ok(data.pieces.some((x) => x.rot !== 0), 'something to fix');
  const fix = Object.fromEntries(data.pieces.map((x) => [x.id, (4 - x.rot) % 4]));
  assert.equal(ok(p, fix), true);
  assert.equal(ok(p, { ...fix, [data.pieces[0].id]: fix[data.pieces[0].id] + 4 }), true, 'a full extra turn is fine');
  assert.equal(ok(p, { ...fix, [data.pieces[0].id]: fix[data.pieces[0].id] + 1 }), false);
});

test('decode address: the right card only; decoys differ from it', () => {
  const { data, p } = open('decode_address');
  assert.equal(data.cards.length, 4);
  const right = data.cards.filter((c) => ok(p, c.id));
  assert.equal(right.length, 1);
  for (const c of data.cards) if (c !== right[0]) assert.notDeepEqual(c.lines, right[0].lines);
});

const step = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
/** BFS through the free cells visiting stops in order (stops are on a valid path by construction). */
function solveRoute(d: Extract<TaskData, { taskId: 'plan_route' }>): Pt[] {
  const blocked = new Set([...d.flooded, ...d.deadEnds].map((q) => `${q.x},${q.y}`));
  const legs = [d.start, ...d.stops, d.end];
  const path: Pt[] = [d.start];
  const used = new Set([`${d.start.x},${d.start.y}`]);
  for (let i = 1; i < legs.length; i++) {
    const goal = legs[i];
    const prev = new Map<string, Pt | null>([[`${path.at(-1)!.x},${path.at(-1)!.y}`, null]]);
    const q = [path.at(-1)!];
    while (q.length) {
      const c = q.shift()!;
      if (c.x === goal.x && c.y === goal.y) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        const k = `${n.x},${n.y}`;
        if (n.x < 0 || n.y < 0 || n.x >= d.w || n.y >= d.h || blocked.has(k) || used.has(k) || prev.has(k)) continue;
        prev.set(k, c);
        q.push(n);
      }
    }
    const leg: Pt[] = [];
    for (let c: Pt | null | undefined = goal; c && !(c.x === path.at(-1)!.x && c.y === path.at(-1)!.y); c = prev.get(`${c.x},${c.y}`)) leg.unshift(c);
    for (const c of leg) used.add(`${c.x},${c.y}`);
    path.push(...leg);
  }
  return path;
}

test('plan route: a legal path through the stops passes; shortcuts through floods or skipping a stop fail', () => {
  for (let i = 0; i < 20; i++) {
    const { data, p } = open('plan_route');
    assert.ok(data.stops.length >= 2);
    const path = solveRoute(data);
    assert.ok(path.every((c, j) => j === 0 || step(path[j - 1], c)));
    assert.equal(ok(p, path), true, JSON.stringify({ data, path }));
    assert.equal(ok(p, path.slice(0, -1)), false, 'must reach the end');
    const flooded = data.flooded[0];
    assert.equal(ok(p, [...path.slice(0, -1), flooded, path.at(-1)]), false, 'no flooded cells');
  }
});

test('prepare bike: pumps inside the green zone + straps in number order', () => {
  const { data, p } = open('prepare_bike');
  const pumps = Math.ceil(data.green[0] / data.perPump);
  assert.ok(pumps * data.perPump <= data.green[1], 'a pump count lands in the green');
  const order = [...data.straps].sort((a, b) => a.n - b.n).map((s) => s.id);
  assert.equal(ok(p, { pumps, order }), true);
  assert.equal(ok(p, { pumps: pumps + 50, order }), false, 'over-pumped');
  assert.equal(ok(p, { pumps, order: [...order].reverse() }), false);
});

test('pack disguise: box, label and layers must follow the note', () => {
  const { p } = open('pack_disguise');
  const exp = p.expected as { box: string; label: string; layers: string[] };
  assert.equal(ok(p, exp), true);
  assert.equal(ok(p, { ...exp, layers: [...exp.layers].reverse() }), false);
  assert.equal(ok(p, { ...exp, label: 'nope' }), false);
});

test('confirm recipient: only the caller with both the code and the passphrase; the code is the handoff code', () => {
  const { data, p } = open('confirm_recipient');
  const right = data.callers.filter((c) => ok(p, c.id));
  assert.equal(right.length, 1);
  assert.equal(right[0].code4, CTX.handoffCode);
  assert.ok(data.message.includes(CTX.handoffCode));
});

test('handoff: the verified code opens it, anything else fails', () => {
  const { data, p } = open('handoff_package');
  assert.equal(data.digits, 4);
  assert.equal(ok(p, { code: CTX.handoffCode }), true);
  assert.equal(ok(p, { code: '0000' }), false);
});
