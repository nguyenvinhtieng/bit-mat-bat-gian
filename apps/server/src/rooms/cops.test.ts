import { test } from 'node:test';
import assert from 'node:assert/strict';
import { copsFor, copsValid, maxCops } from '@hidden-truth/shared';

test('cops must be fewer than half the civilians', () => {
  // cops < (n - cops) / 2  <=>  3 * cops < n
  assert.equal(maxCops(4), 1);
  assert.equal(maxCops(6), 1);
  assert.equal(maxCops(7), 2);
  assert.equal(maxCops(10), 3);
  assert.equal(copsValid(1, 4), true);
  assert.equal(copsValid(2, 6), false);
  assert.equal(copsValid(2, 7), true);
  assert.equal(copsValid(0, 7), false);
});

test('copsFor clamps to at least 1 and at most the allowed count', () => {
  assert.equal(copsFor(3, 7), 2);
  assert.equal(copsFor(0, 7), 1);
  assert.equal(copsFor(2, 1), 1);
  assert.equal(copsFor(2.7, 10), 2);
});
