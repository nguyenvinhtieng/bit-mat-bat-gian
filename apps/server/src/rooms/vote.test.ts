import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAME } from '@giao-keo/shared';
import { GameRoom } from './GameRoom';
import { Player } from './schema';

for (const { label, votes, ejected } of [
  { label: 'all skip', votes: ['skip', 'skip', 'skip'], ejected: null },
  { label: 'tied candidates', votes: ['b', 'a', 'skip'], ejected: null },
  { label: 'candidate tied with skip', votes: ['b', 'skip', undefined], ejected: null },
  { label: 'no votes', votes: [undefined, undefined, undefined], ejected: null },
  { label: 'majority ejects a player', votes: ['b', 'b', 'skip'], ejected: 'b' },
] as const) {
  test(`vote reveal duration: ${label}`, () => {
    const room = Object.create(GameRoom.prototype) as any;
    const ids = ['a', 'b', 'c'];
    let phase: unknown;
    let result: any;
    Object.assign(room, {
      state: { phase: 'meeting', players: new Map(ids.map(id => [id, Object.assign(new Player(), { id, name: id, alive: true })])) },
      secrets: new Map(ids.map((id, i) => [id, { vote: votes[i], faction: i === 0 ? 'killer' : 'crew' }])),
      dropPackage: () => {},
      system: () => {},
      broadcast: (type: string, payload: unknown) => { if (type === 'vote:result') result = payload; },
      setPhase: (name: string, ms: number) => { phase = [name, ms]; },
    });
    room.resolveVotes();
    assert.equal(result.ejected, ejected);
    assert.deepEqual(phase, ['reveal', ejected ? GAME.revealSec * 1000 : 4000]);
  });
}

for (const { label, alive, winner } of [
  { label: '1 killer vs 1 crew → killer wins', alive: { k: true, c1: true, c2: false }, winner: 'killer' },
  { label: '1 killer vs 2 crew → game continues', alive: { k: true, c1: true, c2: true }, winner: null },
  { label: 'no killers left → crew wins', alive: { k: false, c1: true, c2: false }, winner: 'crew' },
] as const) {
  test(`checkWin: ${label}`, () => {
    const room = Object.create(GameRoom.prototype) as any;
    let won: unknown = null;
    const ids = Object.keys(alive) as (keyof typeof alive)[];
    Object.assign(room, {
      state: { phase: 'reveal', mapSlug: 'game', players: new Map(ids.map(id => [id, Object.assign(new Player(), { id, name: id, alive: alive[id] })])) },
      secrets: new Map(ids.map(id => [id, { faction: id === 'k' ? 'killer' : 'crew' }])),
      delivery: { state: 'idle' },
      finishGame: (w: string) => { won = w; return true; },
    });
    assert.equal(room.checkWin(), winner !== null);
    assert.equal(won, winner);
  });
}
