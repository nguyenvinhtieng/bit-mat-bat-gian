import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adminAuth, closeBlocker } from './admin';

test('admin auth: dev without a token is open, prod without a token is closed', () => {
  assert.equal(adminAuth({ prod: false }), 'ok');
  assert.equal(adminAuth({ prod: true }), 'unconfigured');
  assert.equal(adminAuth({ prod: true, sent: 'x' }), 'unconfigured');
});

test('admin auth: a configured token must match exactly', () => {
  assert.equal(adminAuth({ prod: true, token: 's3cret', sent: 's3cret' }), 'ok');
  assert.equal(adminAuth({ prod: false, token: 's3cret', sent: 's3cret' }), 'ok');
  assert.equal(adminAuth({ prod: true, token: 's3cret', sent: 'nope' }), 'denied');
  assert.equal(adminAuth({ prod: false, token: 's3cret' }), 'denied');
  assert.equal(adminAuth({ prod: true, token: 's3cret', sent: 's3cret!' }), 'denied');
});

test('close: only an empty room (nobody online) may be removed', () => {
  assert.equal(closeBlocker(undefined), 'missing');
  assert.equal(closeBlocker({ clients: 3, metadata: { online: 1 } }), 'occupied');
  assert.equal(closeBlocker({ clients: 2, metadata: { online: 0 } }), null);
  // no metadata yet -> fall back to the raw client count
  assert.equal(closeBlocker({ clients: 1 }), 'occupied');
  assert.equal(closeBlocker({ clients: 0 }), null);
});
