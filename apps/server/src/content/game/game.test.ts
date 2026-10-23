import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TASK_IDS, type LotBike, type TaskData } from '@hidden-truth/shared';
import { GAME_CONTENT } from './index';
import type { Pending } from '../common/util';

/** Build a task and a Pending opened just long enough ago to pass the minimum solve time. */
function open<T extends TaskData['taskId']>(taskId: T) {
  const built = GAME_CONTENT.buildTask(taskId);
  assert.ok(built, `buildTask(${taskId}) returned null`);
  const p: Pending = { taskId, expected: built.expected, openedAt: Date.now() - (built.minMs ?? 0) - 10, minMs: built.minMs };
  return { data: built.data as Extract<TaskData, { taskId: T }>, p, built };
}
const ok = (p: Pending, a: unknown) => GAME_CONTENT.verifyTask(p, a);

function packCooler(d: Extract<TaskData, { taskId: 'pack_cooler' }>) {
  const free = [...d.slots];
  return Object.fromEntries(d.items.map((it) => [it.id, free.splice(free.findIndex((s) => s.kind === it.need), 1)[0].id]));
}

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
  const built = GAME_CONTENT.buildTask('pack_cooler')!;
  const p: Pending = { taskId: 'pack_cooler', expected: built.expected, openedAt: Date.now(), minMs: built.minMs };
  assert.equal(ok(p, packCooler(built.data as Extract<TaskData, { taskId: 'pack_cooler' }>)), false);
});

test('pack cooler: every item in a slot of its kind passes; a drink on the shelf fails', () => {
  const { data, p } = open('pack_cooler');
  const a = packCooler(data);
  assert.equal(ok(p, a), true);
  const cup = data.items.find((i) => i.need === 'cup')!;
  const shelf = data.items.find((i) => i.need === 'shelf')!;
  assert.equal(ok(p, { ...a, [cup.id]: a[shelf.id], [shelf.id]: a[cup.id] }), false);
  assert.equal(ok(p, { ...a, [cup.id]: a[data.items.find((i) => i !== cup && i.need === 'cup')!.id] }), false); // two in one slot
});

test('charger: release every peg in order and plug in', () => {
  const { data, p } = open('untangle_charger');
  const released = data.pegs.map((peg) => peg.id);
  assert.equal(ok(p, { released, plugged: true }), true);
  assert.equal(ok(p, { released: [...released].reverse(), plugged: true }), false);
  assert.equal(ok(p, { released: released.slice(1), plugged: true }), false);
  assert.equal(ok(p, { released, plugged: false }), false);
});

test('shutter: every rusty bolt must be oiled or twisted a full turn before full lift', () => {
  const { data, p } = open('stuck_shutter');
  assert.equal(data.bolts.length, data.jams.length);
  const cleared = data.jams.map((_, i) => i);
  assert.equal(ok(p, { cleared, freed: ['oil', 'oil'], lift: 1 }), true);
  assert.equal(ok(p, { cleared, freed: [data.turnDeg, 'oil'], lift: 1 }), true);
  assert.equal(ok(p, { cleared: cleared.slice(1), freed: ['oil'], lift: 1 }), false);
  assert.equal(ok(p, { cleared, freed: [data.turnDeg - 1, 'oil'], lift: 1 }), false);
  assert.equal(ok(p, { cleared, freed: ['grease', 'oil'], lift: 1 }), false);
  assert.equal(ok(p, { cleared, freed: ['oil', 'oil'], lift: 0.9 }), false);
});

test('antenna: both arms tuned, with a steady hold; invalid angles or short holds fail', () => {
  const { data, p } = open('tune_antenna');
  assert.equal(ok(p, { angles: data.target, heldMs: data.holdMs }), true);
  assert.equal(ok(p, { angles: data.target, heldMs: data.holdMs - 1 }), false);
  assert.equal(ok(p, { angles: [data.target[0] + data.tolerance + 1, data.target[1]], heldMs: data.holdMs }), false);
  assert.equal(ok(p, { angles: [NaN, data.target[1]], heldMs: data.holdMs }), false);
});

test('pipes: every corner connects and valve opens; initial scramble never passes', () => {
  for (let i = 0; i < 20; i++) {
    const { data, p } = open('water_pipes');
    assert.equal(ok(p, { rotations: data.solution, opened: true }), true);
    assert.equal(ok(p, { rotations: data.rotations, opened: true }), false);
    assert.equal(ok(p, { rotations: data.solution, opened: false }), false);
    assert.equal(ok(p, { rotations: [...data.solution, 0], opened: true }), false);
  }
});

test('new tasks enforce minimum solve time and removed tasks are unavailable', () => {
  for (const id of ['untangle_charger', 'stuck_shutter', 'tune_antenna', 'water_pipes'] as const) {
    const { built, p } = open(id);
    assert.ok((built.minMs ?? 0) >= 1200);
    const data = built.data;
    const answer = data.taskId === 'untangle_charger' ? { released: data.pegs.map((peg) => peg.id), plugged: true }
      : data.taskId === 'stuck_shutter' ? { cleared: data.jams.map((_, i) => i), freed: data.jams.map(() => 'oil'), lift: 1 }
      : data.taskId === 'tune_antenna' ? { angles: data.target, heldMs: data.holdMs }
      : data.taskId === 'water_pipes' ? { rotations: data.solution, opened: true } : {};
    assert.equal(ok(p, answer), true);
    p.openedAt = Date.now();
    assert.equal(ok(p, answer), false);
  }
  assert.equal(GAME_CONTENT.buildTask('dodge_sellers' as TaskData['taskId']), null);
  assert.equal(GAME_CONTENT.buildTask('find_ticket' as TaskData['taskId']), null);
});

test('brew coffee: both pours inside their bands', () => {
  const { data, p } = open('brew_coffee');
  const mid = ([lo, hi]: [number, number]) => (lo + hi) / 2;
  assert.equal(ok(p, { milk: mid(data.milk), coffee: mid(data.coffee) }), true);
  assert.equal(ok(p, { milk: data.milk[1] + 0.05, coffee: mid(data.coffee) }), false);
  assert.equal(ok(p, { milk: mid(data.milk), coffee: 1 }), false);
});

test('wifi hunt: parking on the hot spot passes, far away fails', () => {
  const { data, p } = open('wifi_hunt');
  assert.equal(ok(p, data.spot), true);
  assert.equal(ok(p, { x: data.spot.x + data.radius * 0.8, y: data.spot.y }), true);
  assert.equal(ok(p, { x: data.spot.x > 0.5 ? 0 : 1, y: data.spot.y }), false);
});

test('pump tyre: stop in the green with a believable hold time; over-pump fails', () => {
  const { data, p } = open('pump_tyre');
  const psi = (data.green[0] + data.green[1]) / 2, heldMs = (psi / data.rate) * 1000;
  assert.equal(ok(p, { psi, heldMs }), true);
  assert.equal(ok(p, { psi: data.green[1] + 1, heldMs: heldMs * 2 }), false);
  assert.equal(ok(p, { psi: data.green[0] - 1, heldMs }), false);
  assert.equal(ok(p, { psi, heldMs: heldMs / 2 }), false);
  assert.equal(ok(p, { psi }), false);
});

test('patch tube: exactly the leaks', () => {
  const { data, p } = open('patch_tube');
  assert.equal(ok(p, { patched: [...data.leaks].reverse() }), true);
  assert.equal(ok(p, { patched: data.leaks.slice(0, 1) }), false);
  assert.equal(ok(p, { patched: [...data.leaks, 7] }), false);
});

test('connect wires: exactly four unique matching colours', () => {
  const { data, p } = open('connect_wires');
  assert.deepEqual([...data.left].sort(), ['amber', 'blue', 'mint', 'red']);
  assert.deepEqual([...data.right].sort(), [...data.left].sort());
  assert.notDeepEqual(data.left, data.right);
  const connections = data.left.map((color) => ({ from: color, to: color }));
  assert.equal(ok(p, { connections: [...connections].reverse() }), true);
  assert.equal(ok(p, { connections: connections.slice(0, 3) }), false);
  assert.equal(ok(p, { connections: [...connections, connections[0]] }), false);
  assert.equal(ok(p, { connections: connections.map(() => connections[0]) }), false);
  assert.equal(ok(p, { connections: connections.map((c, i) => ({ ...c, to: data.left[(i + 1) % 4] })) }), false);
  assert.equal(ok(p, { connections: connections.map((c, i) => i ? c : { from: 'unknown', to: 'unknown' }) }), false);
});

test('tape box: requires both closed flaps and both distinct strips', () => {
  const { p } = open('tape_box');
  assert.equal(ok(p, { flaps: ['left', 'right'], strips: ['seam', 'cross'] }), true);
  for (const answer of [
    { laps: 2 },
    { flaps: ['left'], strips: ['seam', 'cross'] },
    { flaps: ['left', 'right'], strips: ['seam'] },
    { flaps: ['left', 'left'], strips: ['seam', 'cross'] },
    { flaps: ['left', 'right'], strips: ['cross', 'cross'] },
  ]) assert.equal(ok(p, answer), false);
});

test('stack rack: centred drops pass, a box hanging past its support fails', () => {
  const { data, p } = open('stack_rack');
  assert.equal(ok(p, { offsets: data.boxes.map(() => 0) }), true);
  assert.equal(ok(p, { offsets: data.boxes.map((_, i) => (i === 2 ? 200 : 0)) }), false);
  assert.equal(ok(p, { offsets: [0, 0] }), false);
});

/** BFS over single-cell moves (what the client sends). */
function solveLot(d: Extract<TaskData, { taskId: 'unpark_bike' }>) {
  const occ = (bs: LotBike[], skip: number) => {
    const s = new Set<string>();
    bs.forEach((b, j) => {
      if (j !== skip) for (let k = 0; k < b.len; k++) s.add(b.dir === 'h' ? `${b.x + k},${b.y}` : `${b.x},${b.y + k}`);
    });
    return s;
  };
  type Node = { bs: LotBike[]; moves: { id: string; d: number }[] };
  const sig = (bs: LotBike[]) => bs.map((b) => `${b.x},${b.y}`).join('|');
  const q: Node[] = [{ bs: d.bikes, moves: [] }];
  const seen = new Set([sig(d.bikes)]);
  while (q.length) {
    const { bs, moves } = q.shift()!;
    const me = bs.find((b) => b.mine)!;
    if (me.x + me.len === d.w) return moves;
    bs.forEach((b, i) => {
      const o = occ(bs, i);
      for (const dd of [-1, 1]) {
        const n = { ...b, x: b.dir === 'h' ? b.x + dd : b.x, y: b.dir === 'v' ? b.y + dd : b.y };
        const cells = Array.from({ length: n.len }, (_, k) => (n.dir === 'h' ? [n.x + k, n.y] : [n.x, n.y + k]));
        if (cells.some(([x, y]) => x < 0 || y < 0 || x >= d.w || y >= d.h || o.has(`${x},${y}`))) continue;
        const nbs = bs.map((x, j) => (j === i ? n : x));
        if (seen.has(sig(nbs))) continue;
        seen.add(sig(nbs));
        q.push({ bs: nbs, moves: [...moves, { id: b.id, d: dd }] });
      }
    });
  }
  return null;
}

test('unpark bike: always solvable; a move into another bike fails', () => {
  for (let i = 0; i < 15; i++) {
    const { data, p } = open('unpark_bike');
    const moves = solveLot(data);
    assert.ok(moves && moves.length >= 2, 'lot should need a few moves');
    assert.equal(ok(p, { moves }), true);
    assert.equal(ok(p, { moves: [] }), false);
    const me = data.bikes.find((b) => b.mine)!;
    assert.equal(ok(p, { moves: Array.from({ length: data.w }, () => ({ id: me.id, d: 1 })) }), false);
  }
});

test('dodge potholes: changing lane before each hazard passes, staying put fails when one is in the middle lane', () => {
  const { data, p } = open('dodge_potholes');
  const moves = data.obstacles.map((o) => ({ at: o.at - 200, lane: (o.lane + 1) % 3 }));
  assert.equal(ok(p, { moves }), true);
  const hitsMiddle = data.obstacles.some((o) => o.lane === 1);
  assert.equal(ok(p, { moves: [] }), !hitsMiddle);
  assert.equal(ok(p, { moves: [{ at: 0, lane: 5 }] }), false);
});

test('handoff: ring, a centred photo and the slide', () => {
  const { data, p } = open('handoff_package');
  assert.equal(ok(p, { rang: true, photo: 0, slid: true }), true);
  assert.equal(ok(p, { rang: true, photo: data.tolerance + 5, slid: true }), false);
  assert.equal(ok(p, { rang: false, photo: 0, slid: true }), false);
});
