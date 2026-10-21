import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_TASK_IDS, type Pt, type TaskData } from '@hidden-truth/shared';
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

test('every SG task builds, has a fact + done line, and rejects garbage', () => {
  for (const id of GAME_TASK_IDS) {
    const { data, p, built } = open(id);
    assert.equal(data.taskId, id);
    assert.ok(built.fact.headline && built.fact.text, `${id} fact`);
    assert.ok(built.done, `${id} done`);
    for (const junk of [null, undefined, 42, 'x', [], {}]) assert.equal(ok(p, junk), false, `${id} accepted ${JSON.stringify(junk)}`);
  }
});

test('answers are rejected when submitted too fast', () => {
  const built = GAME_CONTENT.buildTask('task_so_hui')!;
  const p: Pending = { taskId: 'task_so_hui', expected: built.expected, openedAt: Date.now(), minMs: built.minMs };
  assert.equal(ok(p, built.expected), false);
});

test('Huế / Thăng Long ids are not built by the SG content', () => {
  assert.equal(GAME_CONTENT.buildTask('task_banh_beo'), null);
  assert.equal(GAME_CONTENT.buildTask('task_banh_chung'), null);
});

test('chỉ đường: the final turns pass, one wrong turn fails', () => {
  const { data, p } = open('task_chi_duong');
  const exp = p.expected as string[];
  assert.equal(exp.length, data.steps.length);
  assert.equal(ok(p, exp), true);
  assert.equal(ok(p, [...exp.slice(0, -1), exp.at(-1) === 'trai' ? 'phai' : 'trai']), false);
});

test('cơm tấm: exact plate passes (any order), missing or extra item fails', () => {
  const { data, p } = open('task_com_tam');
  const exp = p.expected as string[];
  for (const k of exp) assert.ok(data.tray.some((t) => t.kind === k), `tray lacks ${k}`);
  assert.equal(ok(p, [...exp].reverse()), true);
  assert.equal(ok(p, exp.slice(1)), false);
  const extra = data.tray.find((t) => !exp.includes(t.kind));
  if (extra) assert.equal(ok(p, [...exp, extra.kind]), false);
});

test('tiếng rao: right verdicts pass, a flipped verdict fails', () => {
  const { data, p } = open('task_tieng_rao');
  const exp = p.expected as Record<string, 'safe' | 'stranger'>;
  assert.deepEqual(Object.keys(exp).sort(), data.calls.map((c) => c.id).sort());
  assert.equal(ok(p, exp), true);
  const k = data.calls[0].id;
  assert.equal(ok(p, { ...exp, [k]: exp[k] === 'safe' ? 'stranger' : 'safe' }), false);
});

test('cà phê phin: milk on the line passes, overpour fails, too fast fails', () => {
  const { data, p } = open('task_ca_phe_phin');
  assert.equal(ok(p, { milk: data.line }), true);
  assert.equal(ok(p, { milk: data.line + data.tolerance * 0.9 }), true);
  assert.equal(ok(p, { milk: data.line + data.tolerance * 2 }), false);
  assert.equal(ok({ ...p, openedAt: Date.now() }, { milk: data.line }), false);
});

test('đổ xăng: releasing on 50k passes, overfilling fails, hold longer than open time fails', () => {
  const built = GAME_CONTENT.buildTask('task_do_xang')!;
  const data = built.data as Extract<TaskData, { taskId: 'task_do_xang' }>;
  const holdMs = (data.target / (data.pricePerLiter * data.litersPerSec)) * 1000;
  const p: Pending = { taskId: 'task_do_xang', expected: built.expected, openedAt: Date.now() - holdMs - 500, minMs: built.minMs };
  assert.equal(ok(p, { holdMs }), true);
  assert.equal(ok(p, { holdMs: holdMs * 1.2 }), false);
  assert.equal(ok({ ...p, openedAt: Date.now() - (built.minMs ?? 0) - 10 }, { holdMs }), holdMs <= (built.minMs ?? 0) + 10);
});

test('vá vỏ: patching the leak passes, nothing, a wrong sector or an extra patch fails', () => {
  const { data, p } = open('task_va_vo');
  assert.equal(data.leaks.length, 1);
  assert.equal(ok(p, { patches: data.leaks }), true);
  assert.equal(ok(p, { patches: [] }), false);
  assert.equal(ok(p, { patches: [(data.leaks[0] + 1) % data.sectors] }), false);
  assert.equal(ok(p, { patches: [data.leaks[0], (data.leaks[0] + 1) % data.sectors] }), false);
});

test('sổ hụi: right amounts pass, a swap fails', () => {
  const { data, p } = open('task_so_hui');
  const exp = p.expected as Record<string, string>;
  assert.deepEqual(Object.keys(exp).sort(), data.rows.map((r) => r.id).sort());
  for (const v of Object.values(exp)) assert.ok(data.amounts.some((a) => a.id === v));
  assert.equal(ok(p, exp), true);
  const [a, b] = Object.keys(exp);
  assert.equal(ok(p, { ...exp, [a]: exp[b], [b]: exp[a] }), false);
});

test('đếm tiền: right stacks + total pass, wrong total or misplaced note fails', () => {
  const { data, p } = open('task_dem_tien');
  const stacks = Object.fromEntries(data.notes.map((n) => [n.id, n.value]));
  const total = data.notes.reduce((s, n) => s + n.value, 0);
  assert.ok(data.choices.includes(total));
  assert.equal(ok(p, { stacks, total }), true);
  assert.equal(ok(p, { stacks, total: total + data.values[0] }), false);
  const n = data.notes[0];
  assert.equal(ok(p, { stacks: { ...stacks, [n.id]: data.values.find((v) => v !== n.value) }, total }), false);
});

test('khui hụi: the highest bid passes, another bid or a late pick fails', () => {
  const { data, p } = open('task_khui_hui');
  const exp = p.expected as { id: string; limitMs: number };
  assert.ok(data.envelopes.some((e) => e.id === exp.id));
  assert.equal(ok(p, exp.id), true);
  assert.equal(ok(p, data.envelopes.find((e) => e.id !== exp.id)!.id), false);
  assert.equal(ok({ ...p, openedAt: Date.now() - data.limitMs - 5000 }, exp.id), false);
});

test('xếp xe: the generated packing passes, overlap / pillar / off-lot fails', () => {
  const { data, p } = open('task_xep_xe');
  const sol = (p.expected as { solution: Record<string, { x: number; y: number; vertical: boolean }> }).solution;
  assert.deepEqual(Object.keys(sol).sort(), data.bikes.map((b) => b.id).sort());
  assert.equal(ok(p, sol), true);
  const [a, b] = data.bikes;
  assert.equal(ok(p, { ...sol, [b.id]: sol[a.id] }), false, 'overlap');
  const pillar: Pt | undefined = data.blocked[0];
  if (pillar) assert.equal(ok(p, { ...sol, [a.id]: { x: pillar.x, y: pillar.y, vertical: false } }), false, 'pillar');
  assert.equal(ok(p, { ...sol, [a.id]: { x: data.w - 1, y: 0, vertical: false } }), false, 'off-lot');
});
