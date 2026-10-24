import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameRoom } from './GameRoom';
import { Delivery } from './delivery';
import { Player } from './schema';

// Same device (pid) back with a new session: reload, lost reconnection token, socket stuck mid-join.
// The seat moves to the new session instead of a duplicate being added.
function fixture(phase = 'lobby') {
  const room = Object.create(GameRoom.prototype) as any;
  const players = new Map<string, Player>();
  const left: Array<[string, number]> = [];
  const sent: Array<[string, string, unknown]> = [];
  const mk = (id: string) => ({ sessionId: id, send: (t: string, m: unknown) => sent.push([id, t, m]), leave: (code: number) => left.push([id, code]) });
  const clients: any = ['host', 'guest'].map((id) => {
    players.set(id, Object.assign(new Player(), { id, name: id, connected: true }));
    return mk(id);
  });
  clients.getById = (id: string) => clients.find((c: any) => c.sessionId === id);
  const delivery = new Delivery();
  Object.assign(room, {
    state: { phase, players, hostId: 'guest', stations: new Map() },
    clients,
    kicked: new Set<string>(),
    pids: new Map([
      ['host', 'pid-host'],
      ['guest', 'pid-guest'],
    ]),
    secrets: new Map(),
    lastActive: new Map<string, number>(),
    lastChat: new Map<string, number>(),
    lastSay: new Map<string, number>(),
    moves: new Map<string, unknown>(clients.map((c: any) => [c.sessionId, { queue: [], budget: 0, lastQueued: 0 }])),
    delivery,
    chatLog: [],
    syncMeta: () => {},
    system: () => {},
  });
  const join = (id: string, pid?: string) => {
    const c = mk(id);
    clients.push(c);
    room.onJoin(c, { name: 'new', pid });
    return c;
  };
  return { room, players, left, sent, clients, delivery, join };
}

test('lobby: the same device rejoining takes its held seat instead of adding a duplicate', () => {
  const { room, players, join } = fixture();
  players.get('guest')!.connected = false;
  players.get('guest')!.ready = true;
  join('guest2', 'pid-guest');
  assert.deepEqual([...players.keys()].sort(), ['guest2', 'host']);
  const p = players.get('guest2')!;
  assert.equal(p.id, 'guest2');
  assert.equal(p.name, 'guest');
  assert.equal(p.connected, true);
  assert.equal(p.ready, true);
  assert.equal(room.state.hostId, 'guest2');
  assert.equal(room.moves.has('guest'), false);
  assert.equal(room.moves.has('guest2'), true);
  assert.equal(room.pids.get('guest2'), 'pid-guest');
});

test('lobby: a still-open old socket of the same device is closed, the seat moves', () => {
  const { players, left, join } = fixture();
  join('guest2', 'pid-guest');
  assert.deepEqual(left, [['guest', 4003]]);
  assert.equal(players.size, 2);
});

test('a different or missing pid joins as a new player', () => {
  const { players, join } = fixture();
  join('x', 'pid-other');
  join('y');
  assert.equal(players.size, 4);
});

test('mid-game: an unknown device is still refused', () => {
  const { join } = fixture('explore');
  assert.throws(() => join('x', 'pid-other'));
  assert.throws(() => join('y'));
});

test('mid-game: the same device takes its seat back with role, tasks, package and votes', () => {
  const { room, players, delivery, sent, join } = fixture('meeting');
  room.secrets.set('guest', { role: 'driver', faction: 'crew', objective: '', done: 1, log: [], arrestReadyAt: 0, inspectLeft: false });
  room.secrets.set('host', { role: 'undercover', faction: 'killer', objective: '', done: 0, log: [], arrestReadyAt: 0, inspectLeft: false, vote: 'guest' });
  players.get('host')!.voteFor = 'guest';
  delivery.reset({ guest: ['pack_cooler'], host: ['brew_coffee'] }, ['guest'], { x: 0, y: 0 });
  delivery.state = 'carried';
  delivery.carrier = 'guest';
  room.chatLog.push({ from: 'guest', name: 'guest', color: 0, text: 'hi', t: 0 });
  players.get('guest')!.connected = false;

  join('guest2', 'pid-guest');

  assert.equal(players.has('guest'), false);
  assert.equal(players.get('guest2')!.connected, true);
  assert.equal(room.secrets.has('guest'), false);
  assert.equal(room.secrets.get('guest2').done, 1);
  assert.equal(room.secrets.get('host').vote, 'guest2');
  assert.equal(players.get('host')!.voteFor, 'guest2');
  assert.deepEqual(delivery.tasksOf('guest2').map((j) => j.id), ['pack_cooler']);
  assert.equal(delivery.counted.has('guest2'), true);
  assert.equal(delivery.carrier, 'guest2');
  assert.equal(room.chatLog[0].from, 'guest2');
  assert.ok(sent.some(([to, type]) => to === 'guest2' && type === 'private'));
});

test('the old session timing out after its seat moved is a no-op', async () => {
  const { room, players, join } = fixture();
  const old = room.clients.getById('guest');
  room.allowReconnection = () => new Promise((_, rej) => setTimeout(() => rej(new Error('expired')), 5));
  const gone = room.onLeave(old, false);
  join('guest2', 'pid-guest');
  await gone;
  assert.deepEqual([...players.keys()].sort(), ['guest2', 'host']);
  assert.equal(players.get('guest2')!.connected, true);
});

test('the old session reconnecting after its seat moved is sent away', async () => {
  const { room, players, join } = fixture();
  const old = room.clients.getById('guest');
  const rcLeft: number[] = [];
  let resolve!: (c: unknown) => void;
  room.allowReconnection = () => new Promise((r) => (resolve = r));
  const gone = room.onLeave(old, false);
  join('guest2', 'pid-guest');
  resolve({ sessionId: 'guest', send: () => {}, leave: (code: number) => rcLeft.push(code) });
  await gone;
  assert.deepEqual(rcLeft, [4003]);
  assert.equal(players.size, 2);
});

test('the last online player dropping (a lone host pressing F5) still gets its seat held', async () => {
  const { room, players } = fixture();
  players.get('host')!.connected = false;
  let closed = false;
  room.disconnect = () => (closed = true);
  let held = 0;
  room.allowReconnection = (_c: unknown, s: number) => ((held = s), new Promise(() => {}));
  room.onLeave(room.clients.getById('guest'), false);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(closed, false);
  assert.ok(held > 0);
  assert.equal(players.has('guest'), true);
});
