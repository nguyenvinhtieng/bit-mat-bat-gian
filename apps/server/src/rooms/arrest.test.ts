import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '@hidden-truth/shared';
import { GameRoom } from './GameRoom';
import { Player } from './schema';

// Exercise room methods without starting Colyseus networking or simulation timers.
function fixture() {
  const room = Object.create(GameRoom.prototype) as any;
  const players = new Map<string, Player>();
  const secrets = new Map<string, any>();
  const messages = new Map<string, Array<{ type: string; payload: any }>>();
  const clients = new Map<string, any>();
  for (const [id, x, faction] of [
    ['cop', 0, 'killer'], ['driver', GAME.arrestRange, 'crew'],
    ['witness', 0, 'crew'], ['heard', 0, 'crew'],
  ] as const) {
    const player = Object.assign(new Player(), { id, name: id, x, y: 0 });
    players.set(id, player);
    secrets.set(id, { faction, arrestReadyAt: 0, pending: { task: 'test' } });
    messages.set(id, []);
    clients.set(id, { sessionId: id, send: (type: string, payload: any) => messages.get(id)!.push({ type, payload }) });
  }
  // Keep observers out of capture selection while retaining them for event routing.
  players.get('witness')!.x = GAME.arrestRange + 1;
  players.get('heard')!.x = GAME.arrestRange + 2;
  Object.assign(room, {
    state: { phase: 'explore', players }, secrets,
    clients: { getById: (id: string) => clients.get(id) },
    bystanders: () => [players.get('witness')],
    dropPackage: () => {}, sendPrivate: () => {}, checkWin: () => {},
  });
  return { room, players, secrets, messages, cop: clients.get('cop') };
}

test('arrest press captures immediately, leaves bike, and routes only victim/witness cinematics', () => {
  const { room, players, secrets, messages, cop } = fixture();
  room.arrestStart(cop);
  const target = players.get('driver')!;
  assert.equal(target.alive, false);
  assert.equal(target.body, true);
  assert.equal(target.bodyX, GAME.arrestRange);
  assert.equal(secrets.get('driver').pending, undefined);
  assert.ok(secrets.get('cop').arrestReadyAt > Date.now());
  assert.deepEqual(messages.get('cop'), []);
  assert.equal(messages.get('driver')!.find(m => m.type === 'cinematic')!.payload.kind, 'kill');
  assert.equal(messages.get('witness')!.find(m => m.type === 'cinematic')!.payload.kind, 'witness');
  assert.deepEqual(messages.get('heard'), [{ type: 'arrest:heard', payload: { at: { x: GAME.arrestRange, y: 0 } } }]);
  assert.ok([...messages.values()].flat().every(m => m.type !== 'arrest:hold'));
});

test('arrest rejects invalid phase, faction, actor, cooldown and targets', () => {
  const cases: Array<(f: ReturnType<typeof fixture>) => void> = [
    f => { f.room.state.phase = 'meeting'; },
    f => { f.secrets.get('cop').faction = 'crew'; },
    f => { f.players.get('cop')!.alive = false; },
    f => { f.players.get('cop')!.connected = false; },
    f => { f.secrets.get('cop').arrestReadyAt = Date.now() + 10000; },
    f => { f.players.get('driver')!.x = GAME.arrestRange + 1; },
    f => { f.players.get('driver')!.alive = false; },
    f => { f.players.get('driver')!.connected = false; },
    f => { f.secrets.get('driver').faction = 'killer'; },
  ];
  for (const change of cases) {
    const f = fixture();
    change(f);
    let captures = 0;
    f.room.doArrest = () => captures++;
    f.room.arrestStart(f.cop);
    assert.equal(captures, 0);
  }
});

test('legacy release messages are harmless before and after a capture', () => {
  const f = fixture();
  const handlers = new Map<string, (client: any, payload: any) => void>();
  f.room.onMessage = (type: string, handler: any) => handlers.set(type, handler);
  f.room.registerMessages();
  const arrest = handlers.get('arrest')!;
  arrest(f.cop, { on: false });
  assert.equal(f.players.get('driver')!.alive, true);
  arrest(f.cop, { on: true });
  arrest(f.cop, { on: false });
  assert.equal(f.players.get('driver')!.alive, false);
  assert.equal(f.messages.get('driver')!.filter(m => m.type === 'cinematic').length, 1);
});
