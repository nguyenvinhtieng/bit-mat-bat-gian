import { test } from 'node:test';
import assert from 'node:assert/strict';
import { voiceGain } from './voice';

const base = { meAlive: true, otherAlive: true, dist: 0, radius: 300, seen: true };

test('lobby and the end screen: everyone hears everyone at full volume', () => {
  assert.equal(voiceGain({ ...base, phase: 'lobby', dist: 5000, seen: false }), 1);
  assert.equal(voiceGain({ ...base, phase: 'ended', otherAlive: false, seen: false }), 1);
});

test('explore: only players in sight are heard, quieter toward the edge of sight', () => {
  const near = voiceGain({ ...base, phase: 'explore', dist: 30 });
  const far = voiceGain({ ...base, phase: 'explore', dist: 250 });
  assert.ok(near > 0.9 && near <= 1);
  assert.ok(far > 0 && far < near);
  assert.equal(voiceGain({ ...base, phase: 'explore', dist: 30, seen: false }), 0);
  assert.equal(voiceGain({ ...base, phase: 'explore', dist: 400 }), 0);
});

test('meeting and reveal: the living hear each other fully', () => {
  assert.equal(voiceGain({ ...base, phase: 'meeting', dist: 5000, seen: false }), 1);
  assert.equal(voiceGain({ ...base, phase: 'reveal', dist: 5000, seen: false }), 1);
});

test('the living never hear ghosts outside the lobby', () => {
  for (const phase of ['explore', 'meeting', 'reveal'])
    assert.equal(voiceGain({ ...base, phase, otherAlive: false }), 0);
});

test('ghosts hear each other anywhere, and the living by distance (walls do not block them)', () => {
  assert.equal(voiceGain({ ...base, phase: 'explore', meAlive: false, otherAlive: false, dist: 5000, seen: false }), 1);
  assert.ok(voiceGain({ ...base, phase: 'explore', meAlive: false, dist: 100, seen: false }) > 0);
  assert.equal(voiceGain({ ...base, phase: 'explore', meAlive: false, dist: 400 }), 0);
  assert.equal(voiceGain({ ...base, phase: 'meeting', meAlive: false, dist: 5000, seen: false }), 1);
});
