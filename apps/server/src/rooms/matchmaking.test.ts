import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickOpenRoom, type RoomListing } from './matchmaking';

const room = (roomId: string, over: Partial<RoomListing> = {}): RoomListing => ({
  roomId,
  clients: 2,
  maxClients: 10,
  locked: false,
  private: false,
  metadata: { phase: 'lobby', public: true },
  ...over,
});

test('no rooms -> null', () => {
  assert.equal(pickOpenRoom([]), null);
});

test('skips private, full, locked and in-game rooms', () => {
  const rooms = [
    room('PRIV', { private: true, metadata: { phase: 'lobby', public: false } }),
    room('FULL', { clients: 10 }),
    room('LOCK', { locked: true }),
    room('PLAY', { metadata: { phase: 'explore', public: true } }),
    room('EMPTY', { clients: 0 }),
  ];
  assert.equal(pickOpenRoom(rooms), null);
});

test('prefers the room closest to full', () => {
  const rooms = [room('A', { clients: 2 }), room('B', { clients: 7 }), room('C', { clients: 5 })];
  assert.equal(pickOpenRoom(rooms), 'B');
});

test('respects excluded ids (rooms that just rejected us)', () => {
  const rooms = [room('A', { clients: 2 }), room('B', { clients: 7 })];
  assert.equal(pickOpenRoom(rooms, ['B']), 'A');
});

test('prefers rooms the player has not left before, even if emptier', () => {
  const rooms = [room('OLD', { clients: 8 }), room('NEW', { clients: 2 })];
  assert.equal(pickOpenRoom(rooms, [], ['OLD']), 'NEW');
});

test('falls back to previously left rooms when nothing else is open', () => {
  const rooms = [room('OLD1', { clients: 3 }), room('OLD2', { clients: 6 })];
  assert.equal(pickOpenRoom(rooms, [], ['OLD1', 'OLD2']), 'OLD2');
});

test('excluded rooms stay excluded even as a fallback', () => {
  assert.equal(pickOpenRoom([room('OLD')], ['OLD'], ['OLD']), null);
});

test('skips rooms where nobody is online (seats only held for reconnects)', () => {
  const rooms = [room('GHOST', { clients: 5, metadata: { phase: 'lobby', public: true, online: 0 } }), room('LIVE', { clients: 1 })];
  assert.equal(pickOpenRoom(rooms), 'LIVE');
});
