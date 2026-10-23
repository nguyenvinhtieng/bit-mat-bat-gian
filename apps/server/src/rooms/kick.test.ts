import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom } from './GameRoom';
import { Player } from './schema';

// Exercise the kick paths without Colyseus networking: the socket close never arrives here,
// just like a backgrounded phone whose close handshake lags for ~30s.
function fixture() {
  const room = Object.create(GameRoom.prototype) as any;
  const players = new Map<string, Player>();
  const left: Array<[string, number]> = [];
  const clients = ['host', 'guest'].map((id) => {
    players.set(id, Object.assign(new Player(), { id, name: id, connected: true }));
    return { sessionId: id, send: () => {}, leave: (code: number) => left.push([id, code]) };
  });
  const messages = new Map<string, (client: any, msg: any) => void>();
  Object.assign(room, {
    state: { phase: 'lobby', players, hostId: 'host' },
    clients,
    kicked: new Set<string>(),
    lastActive: new Map<string, number>(),
    moves: new Map<string, unknown>(clients.map((c) => [c.sessionId, {}])),
    onMessage: (type: string, cb: (client: any, msg: any) => void) => messages.set(type, cb),
    syncMeta: () => {},
    system: () => {},
  });
  room.registerMessages();
  return { room, players, left, clients, messages };
}

test('host kick removes the player from the list right away, before the socket closes', () => {
  const { room, players, left, clients, messages } = fixture();
  messages.get('host:kick')!(clients[0], { target: 'guest' });
  assert.equal(players.has('guest'), false);
  assert.equal(room.moves.has('guest'), false);
  assert.deepEqual(left, [['guest', 4001]]);
});

test('AFK kick removes the idle player right away', () => {
  const { room, players, left } = fixture();
  room.lastActive.set('guest', 0);
  room.kickAfk();
  assert.equal(players.has('guest'), false);
  assert.deepEqual(left, [['guest', 4001]]);
});

test('the late socket close of a kicked player is a no-op and leaves no stale kicked entry', async () => {
  const { room, players, clients, messages } = fixture();
  messages.get('host:kick')!(clients[0], { target: 'guest' });
  await room.onLeave(clients[1], false);
  assert.equal(room.kicked.size, 0);
  assert.equal(players.size, 1);
});
