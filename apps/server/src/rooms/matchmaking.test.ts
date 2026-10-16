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
