import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TL_TASK_IDS, type Pt, type TaskData } from '@hidden-truth/shared';
import { TL_CONTENT } from './index';
import type { Pending } from '../common/util';

/** Build a task and a Pending that is old enough to pass the minimum solve time. */
function open<T extends TaskData['taskId']>(taskId: T) {
  const built = TL_CONTENT.buildTask(taskId);
  assert.ok(built, `buildTask(${taskId}) returned null`);
  const p: Pending = { taskId, expected: built.expected, openedAt: 0, minMs: built.minMs };
  return { data: built.data as Extract<TaskData, { taskId: T }>, p, built };
}
const ok = (p: Pending, a: unknown) => TL_CONTENT.verifyTask(p, a);

test('every TL task builds, has a fact + done line, and rejects garbage', () => {
  for (const id of TL_TASK_IDS) {
    const { data, p, built } = open(id);
    assert.equal(data.taskId, id);
    assert.ok(built.fact.headline && built.fact.text, `${id} fact`);
    assert.ok(built.done, `${id} done`);
    for (const junk of [null, undefined, 42, 'x', [], {}]) assert.equal(ok(p, junk), false, `${id} accepted ${JSON.stringify(junk)}`);
  }
});

test('answers are rejected when submitted too fast', () => {
  const built = TL_CONTENT.buildTask('task_dong_ho')!;
  const p: Pending = { taskId: 'task_dong_ho', expected: built.expected, openedAt: Date.now(), minMs: built.minMs };
  assert.equal(ok(p, built.expected), false);
});

test('Huế ids are not built by the TL content', () => {
  assert.equal(TL_CONTENT.buildTask('task_banh_beo'), null);
});

test('bánh chưng: correct layers + ties pass, wrong order fails', () => {
  const { data, p } = open('task_banh_chung');
  const exp = p.expected as { layers: string[]; ties: number };
  assert.equal(data.slots, exp.layers.length);
  for (const k of exp.layers) assert.ok(data.tray.some((t) => t.kind === k), `tray lacks ${k}`);
  assert.equal(ok(p, { layers: exp.layers, ties: data.ties }), true);
  assert.equal(ok(p, { layers: [...exp.layers].reverse(), ties: data.ties }), false);
  assert.equal(ok(p, { layers: exp.layers, ties: data.ties - 1 }), false);
});

test('Đông Hồ: right colour sources pass, a swap fails', () => {
  const { data, p } = open('task_dong_ho');
  const exp = p.expected as Record<string, string>;
  assert.deepEqual(Object.keys(exp).sort(), data.colors.map((c) => c.id).sort());
  assert.equal(ok(p, exp), true);
  const [a, b] = Object.keys(exp);
  assert.equal(ok(p, { ...exp, [a]: exp[b], [b]: exp[a] }), false);
});

test('cho chữ: tracing the strokes passes (with jitter), wrong order / missing stroke fails', () => {
  const { data, p } = open('task_cho_chu');
  const jitter = (s: Pt[]) => s.map((q, i) => ({ x: q.x + (i % 2 ? 0.02 : -0.02), y: q.y + 0.015 }));
  assert.equal(ok(p, data.strokes), true);
  assert.equal(ok(p, data.strokes.map(jitter)), true);
  assert.equal(ok(p, data.strokes.slice(0, -1)), false);
  assert.equal(ok(p, [...data.strokes].reverse()), false);
  assert.equal(ok(p, data.strokes.map((s) => s.map((q) => ({ x: 1 - q.x, y: 1 - q.y })))), false);
});

test('cây nêu: right ornaments upright pass; a decoy or too much tilt fails', () => {
  const { data, p } = open('task_cay_neu');
  const exp = p.expected as { ids: string[] };
  assert.equal(exp.ids.length, data.need);
  assert.equal(ok(p, { ornaments: exp.ids, tilt: 1.5 }), true);
  assert.equal(ok(p, { ornaments: exp.ids, tilt: data.maxTilt + 4 }), false);
  const decoy = data.tray.find((t) => !exp.ids.includes(t.id))!;
  assert.equal(ok(p, { ornaments: [...exp.ids.slice(1), decoy.id], tilt: 0 }), false);
});

test('câu đối: matching pairs pass, a swap fails; 2 pairs, no decoy, every first line hints its pair', () => {
  const { data, p } = open('task_cau_doi');
  const exp = p.expected as Record<string, string>;
  assert.equal(data.tops.length, 2);
  assert.equal(data.bottoms.length, data.tops.length);
  for (const t of data.tops) assert.ok(t.hint && t.hint.includes('↔'), `hint for ${t.text}`);
  assert.equal(ok(p, exp), true);
  const [a, b] = Object.keys(exp);
  assert.equal(ok(p, { ...exp, [a]: exp[b], [b]: exp[a] }), false);
});

test('ngũ quả: both regions accept the right tray and reject a wrong one', () => {
  for (let i = 0; i < 40; i++) {
    const { data, p } = open('task_ngu_qua');
    const kinds = data.fruits.map((f) => f.kind);
    if (data.region === 'nam') {
      const want = ['mang_cau', 'sung', 'dua', 'du_du', 'xoai'];
      assert.equal(ok(p, want), true);
      assert.equal(ok(p, [want[1], want[0], ...want.slice(2)]), false);
    } else {
      const ring = kinds.filter((k) => !['chuoi', 'buoi', 'phat_thu'].includes(k)).slice(0, 3);
      const center = kinds.includes('buoi') ? 'buoi' : 'phat_thu';
      assert.equal(ok(p, { base: 'chuoi', center, ring }), true);
      assert.equal(ok(p, { base: center, center: 'chuoi', ring }), false);
      assert.equal(ok(p, { base: 'chuoi', center, ring: ring.slice(0, 2) }), false);
    }
  }
});

test('ca trù: taps on the beat pass (with a constant lag), an off beat fails', () => {
  const { data, p } = open('task_ca_tru');
  const lag = 900; // first tap happens whenever the player starts — only relative timing matters
  assert.equal(ok(p, data.beats.map((b, i) => b + lag + (i % 2 ? 40 : -30))), true);
  const off = data.beats.map((b) => b + lag);
  off[3] += data.tolerance * 3;
  assert.equal(ok(p, off), false);
  assert.equal(ok(p, data.beats.slice(1)), false);
});

test('rối nước: a path through every mark at legal speed passes; skipping or teleporting fails', () => {
  const { data, p } = open('task_roi_nuoc');
  const path: { x: number; y: number; t: number }[] = [];
  let t = 0;
  let cur = data.start;
  path.push({ ...cur, t });
  for (const m of data.marks) {
    const steps = 20;
    const dist = Math.hypot(m.x - cur.x, m.y - cur.y);
    const dt = ((dist / data.speed) * 1000) / steps / 0.8; // 80% of max speed
    for (let s = 1; s <= steps; s++) {
      t += dt;
      path.push({ x: cur.x + ((m.x - cur.x) * s) / steps, y: cur.y + ((m.y - cur.y) * s) / steps, t });
    }
    cur = m;
  }
  assert.equal(ok(p, path), true);
  // teleport: same points, almost no time
  assert.equal(ok(p, path.map((q, i) => ({ ...q, t: i }))), false);
  // skip the last mark
  const last = data.marks[data.marks.length - 1];
  assert.equal(ok(p, path.filter((q) => Math.hypot(q.x - last.x, q.y - last.y) > data.radius * 1.5)), false);
});

test('easy mode: forgiving thresholds and visual cues (playable without sound)', () => {
  const neu = open('task_cay_neu').data;
  assert.ok(neu.maxTilt >= 12);
  assert.equal(neu.tray.length, 5);
  assert.ok(!neu.tray.some((t) => /pháo/i.test(t.name)), 'firecrackers are a confusing decoy');
  for (const t of neu.tray) assert.ok(t.desc, `${t.name} desc`);

  for (const s of open('task_dong_ho').data.sources) assert.match(s.hex ?? '', /^#[0-9a-f]{6}$/i);

  for (let i = 0; i < 20; i++) {
    const ct = open('task_ca_tru').data;
    assert.ok(ct.tolerance >= 250);
    assert.ok(ct.beats.length >= 6 && ct.beats.length <= 7, `${ct.beats.length} beats`);
    for (let k = 1; k < ct.beats.length; k++) assert.ok(ct.beats[k] - ct.beats[k - 1] >= 350, 'beats too close');
  }

  const rn = open('task_roi_nuoc').data;
  assert.ok(rn.radius >= 0.1 && rn.speed >= 0.6);

  const { data, p } = open('task_cho_chu');
  const wobble = data.strokes.map((s) => s.map((q, i) => ({ x: q.x + (i % 2 ? 0.06 : -0.06), y: q.y + 0.04 })));
  assert.equal(ok(p, wobble), true, 'a shaky hand still passes');
});
