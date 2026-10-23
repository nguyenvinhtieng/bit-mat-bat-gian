import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuietShutter, stepQuietShutter, replayQuietShutter, isQuietShutterComplete } from './quiet-shutter';

const config = { quietSpeed: .12, noiseGain: 3, cooldownRate: .30, alarmMs: 1400 };
const quiet = Array.from({ length: 100 }, () => ({ dtMs: 100, rise: .01 }));
test('quiet shutter: steady slow lifting finishes quietly', () => {
  const state = replayQuietShutter(quiet, config)!;
  assert.ok(isQuietShutterComplete(state));
  assert.equal(state.alarms, 0);
});
test('quiet shutter: fast lifting raises noise; pausing cools it', () => {
  const state = stepQuietShutter(createQuietShutter(), { dtMs: 100, rise: .08 }, config);
  assert.ok(state.noise > 0);
  const cooled = stepQuietShutter(state, { dtMs: 100, rise: 0 }, config);
  assert.ok(cooled.noise < state.noise);
});
test('quiet shutter: overload loses progress and blocks lifting during alarm', () => {
  let state = { ...createQuietShutter(), lift: .5, noise: .99 };
  state = stepQuietShutter(state, { dtMs: 100, rise: .08 }, config);
  assert.equal(state.alarms, 1);
  assert.ok(state.lift < .5);
  const blocked = stepQuietShutter(state, { dtMs: 100, rise: .08 }, config);
  assert.equal(blocked.lift, state.lift);
  assert.ok(blocked.alarmMs < state.alarmMs);
  assert.equal(isQuietShutterComplete({ ...state, lift: 1 }), false);
});
test('quiet shutter: replay rejects malformed, impossible, and unbounded input', () => {
  for (const samples of [null, [], [{ dtMs: 0, rise: .01 }], [{ dtMs: 101, rise: 0 }], [{ dtMs: 100, rise: NaN }], [{ dtMs: 10, rise: .08 }], [{ dtMs: 100, rise: -.01 }], Array(6001).fill({ dtMs: 100, rise: 0 })]) {
    assert.equal(replayQuietShutter(samples, config), null);
  }
  assert.equal(isQuietShutterComplete(replayQuietShutter([{ dtMs: 100, rise: .08 }], config)!), false);
});
