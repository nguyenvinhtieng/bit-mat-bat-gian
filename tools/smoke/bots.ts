/**
 * Headless end-to-end smoke test against a running server (pnpm dev:server).
 * N bot clients: create/join by code, start, walk to a station (server-validated movement),
 * prep tasks, undercover arrest (hold), abandoned-bike report, vote, end reveal.
 *   pnpm smoke            (default 4 bots)
 */
import { Client, type Room } from 'colyseus.js';
import {
  GAME,
  GAME_STATIONS,
  type Pt,
  ROOM_NAME,
  SIM_DT,
  getGrid,
  stepMovement,
  type PrivateInfo,
  type TaskData,
  type Vec,
} from '@hidden-truth/shared';

const N = Number(process.argv[2] || 4);
const URL = process.env.SERVER_URL || 'ws://localhost:2567';
const grid = getGrid();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log('[smoke]', ...a);

type Bot = { room: Room<any>; name: string; me?: PrivateInfo; seq: number; task?: TaskData; lastResult?: any; end?: any; voteResult?: any };

/** BFS path on tile grid -> list of waypoints. */
function path(from: Vec, to: Vec): Vec[] {
  const T = 48;
  const s = [Math.floor(from.x / T), Math.floor(from.y / T)];
  const g = [Math.floor(to.x / T), Math.floor(to.y / T)];
  const key = (x: number, y: number) => y * grid.w + x;
  const prev = new Map<number, number>();
  const q = [s];
  prev.set(key(s[0], s[1]), -1);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === g[0] && y === g[1]) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (grid.solid[key(nx, ny)] || prev.has(key(nx, ny)) || nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
      prev.set(key(nx, ny), key(x, y));
      q.push([nx, ny]);
    }
  }
  const out: Vec[] = [];
  let k = key(g[0], g[1]);
  if (!prev.has(k)) throw new Error('no path');
  while (k !== -1) {
    out.unshift({ x: (k % grid.w) * T + 24, y: Math.floor(k / grid.w) * T + 24 });
    k = prev.get(k)!;
  }
  out.push(to);
  return out;
}

async function walkTo(b: Bot, target: Vec) {
  const p = b.room.state.players.get(b.room.sessionId);
  let pos = { x: p.x, y: p.y };
  for (const wp of path(pos, target)) {
    for (let i = 0; i < 200; i++) {
      const cmds = [];
      for (let j = 0; j < 3; j++) {
        const dx = Math.abs(wp.x - pos.x) > 3 ? Math.sign(wp.x - pos.x) : 0;
        const dy = Math.abs(wp.y - pos.y) > 3 ? Math.sign(wp.y - pos.y) : 0;
        if (!dx && !dy) break;
        const cmd = { seq: ++b.seq, dx, dy };
        pos = stepMovement(grid, pos, cmd, SIM_DT);
        cmds.push(cmd);
      }
      if (!cmds.length) break;
      b.room.send('input', cmds);
      await sleep(100);
    }
  }
  await sleep(300);
  const sp = b.room.state.players.get(b.room.sessionId);
  return Math.hypot(sp.x - target.x, sp.y - target.y);
}

const pk = (p: Pt) => `${p.x},${p.y}`;
/** BFS through the free cells visiting each stop in order, never reusing a cell. */
function solveRoute(d: Extract<TaskData, { taskId: 'plan_route' }>): Pt[] {
  const blocked = new Set([...d.flooded, ...d.deadEnds].map(pk));
  const out: Pt[] = [d.start];
  const used = new Set([pk(d.start)]);
  for (const goal of [...d.stops, d.end]) {
    const from = out.at(-1)!;
    const prev = new Map<string, Pt | null>([[pk(from), null]]);
    const q = [from];
    while (q.length) {
      const c = q.shift()!;
      if (c.x === goal.x && c.y === goal.y) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (n.x < 0 || n.y < 0 || n.x >= d.w || n.y >= d.h || blocked.has(pk(n)) || used.has(pk(n)) || prev.has(pk(n))) continue;
        prev.set(pk(n), c);
        q.push(n);
      }
    }
    const leg: Pt[] = [];
    for (let c: Pt | null | undefined = goal; c && pk(c) !== pk(from); c = prev.get(pk(c))) leg.unshift(c);
    for (const c of leg) used.add(pk(c));
    out.push(...leg);
  }
  return out;
}

/** Solve a mini-game from the client payload only (what a skilled player can see on screen). */
function solve(t: TaskData): unknown {
  switch (t.taskId) {
    case 'receive_package': {
      const key = (c: string[]) => [...c].sort().join('|');
      return t.boxes.find((b) => key(b.codes) === key(t.slip))!.id;
    }
    case 'check_seal':
      return Object.fromEntries(t.pieces.map((p) => [p.id, (4 - p.rot) % 4]));
    case 'decode_address': {
      const said = t.messages.filter((m) => m.from === 'Khách').map((m) => m.text).join(' ');
      const value = (l: string) => l.replace(/^(Hẻm|Gần|Nhà|Trước nhà có) /, '');
      return t.cards.find((c) => c.lines.every((l) => said.includes(value(l))))!.id;
    }
    case 'plan_route':
      return solveRoute(t);
    case 'prepare_bike':
      return { pumps: Math.ceil(t.green[0] / t.perPump), order: [...t.straps].sort((a, b) => a.n - b.n).map((s) => s.id) };
    case 'pack_disguise': {
      const [boxLine, labelLine, layerLine] = t.note;
      const byName = (xs: { id: string; name: string }[], n: string) => xs.find((x) => x.name === n.trim())!.id;
      const box = byName(t.boxes, boxLine.replace(/^Thùng ngoài: /, '').replace(/\.$/, ''));
      const label = byName(t.labels, labelLine.match(/“(.+)”/)![1]);
      const layers = layerLine.replace(/^Lót từ dưới lên: /, '').replace(/\.$/, '').split(' → ').map((n) => byName(t.layers, n));
      return { box, label, layers };
    }
    case 'confirm_recipient': {
      const phrase = t.message.match(/“(.+)”/)![1];
      return t.callers.find((c) => t.message.includes(c.code4) && c.phrase === phrase)!.id;
    }
    case 'handoff_package':
      return { code: t.message.match(/\d{4}/)![0] };
  }
}

const MIN_MS = 3600;

function wire(b: Bot) {
  b.room.onMessage('private', (m) => (b.me = m));
  b.room.onMessage('task:data', (t) => (b.task = t));
  b.room.onMessage('task:result', (r) => (b.lastResult = r));
  b.room.onMessage('vote:result', (r) => (b.voteResult = r));
  b.room.onMessage('end', (e) => (b.end = e));
  for (const t of ['chat', 'chat:history', 'toast', 'intro', 'teleport', 'task:close', 'time', 'cinematic', 'pong', 'arrest:hold', 'arrest:heard', 'inspect:result', 'voice:signal']) b.room.onMessage(t, () => {});
}

async function until(fn: () => unknown, ms = 5000, label = 'condition') {
  const t0 = Date.now();
  while (!fn()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${label}`);
    await sleep(50);
  }
}

async function main() {
  const c = new Client(URL);
  const host: Bot = { room: await c.create(ROOM_NAME, { name: 'Bot-Host' }), name: 'Bot-Host', seq: 0 };
  wire(host);
  await until(() => host.room.state.code, 3000, 'code');
  const code = host.room.state.code as string;
  log('room code', code);
  const bots = [host];
  for (let i = 1; i < N; i++) {
    const b: Bot = { room: await new Client(URL).joinById(code, { name: `Bot-${i}` }), name: `Bot-${i}`, seq: 0 };
    wire(b);
    bots.push(b);
  }
  await until(() => host.room.state.players.size === N, 3000, 'players joined');

  host.room.send('configure', { tasksPerPlayer: 1 });
  for (const b of bots) b.room.send('ready', { ready: true });
  await sleep(200);
  host.room.send('start', {});
  await until(() => host.room.state.phase === 'explore' && bots.every((b) => b.me), 4000, 'explore + private');
  log('roles', bots.map((b) => `${b.name}:${b.me!.role}`).join(', '));
  const killer = bots.find((b) => b.me!.faction === 'killer')!;
  const crew = bots.filter((b) => b.me!.faction === 'crew');
  if (!killer) throw new Error('no killer assigned');

  // every driver plays the stations on their own list -> shared progress goes up; a wrong answer is rejected first
  for (const worker of crew) for (const { id: tid } of worker.me!.tasks) {
    const st = GAME_STATIONS.find((x) => x.id === tid)!;
    await walkTo(worker, st);
    worker.task = undefined;
    worker.lastResult = undefined;
    worker.room.send('task:open', { taskId: tid });
    await until(() => worker.task, 4000, `task:data ${tid}`);
    worker.room.send('task:submit', { taskId: tid, answer: { wrong: true } });
    await until(() => worker.lastResult, 4000, `reject ${tid}`);
    if (worker.lastResult!.ok) throw new Error(`${tid}: wrong answer accepted`);
    worker.task = undefined;
    worker.lastResult = undefined;
    worker.room.send('task:open', { taskId: tid });
    await until(() => worker.task, 4000, `task:data retry ${tid}`);
    await sleep(MIN_MS);
    worker.room.send('task:submit', { taskId: tid, answer: solve(worker.task!) });
    await until(() => worker.lastResult, 4000, `task result ${tid}`);
    if (!worker.lastResult!.ok) throw new Error(`${tid}: correct answer rejected`);
    log('task done', tid, '-> progress', host.room.state.progress, '/', host.room.state.progressTarget);
  }
  if (host.room.state.progress < host.room.state.progressTarget) throw new Error('progress did not reach the target');

  // killer walks to a victim and kills (server validates range + cooldown)
  const victim = crew[crew.length - 1];
  const vp = victim.room.state.players.get(victim.room.sessionId);
  await walkTo(killer, { x: vp.x + 20, y: vp.y });
  log('waiting for arrest cooldown…');
  let killed = false;
  for (let i = 0; i < 6 && !killed; i++) {
    await sleep(3000);
    killer.room.send('arrest', { on: true });
    await sleep(GAME.arrestHoldSec * 1000 + 400);
    killer.room.send('arrest', { on: false });
    killed = [...host.room.state.players.values()].some((p: any) => !p.alive);
  }
  if (!killed) throw new Error('arrest never landed');
  const dead = [...host.room.state.players.values()].find((p: any) => !p.alive) as any;
  log('arrested', dead.name, 'body', dead.body);

  // report -> meeting -> everyone votes for the killer -> crew wins (or tie-safe)
  const reporter = bots.find((b) => b.room.state.players.get(b.room.sessionId).alive && b !== killer)!;
  const rp = reporter.room.state.players.get(reporter.room.sessionId);
  await walkTo(reporter, { x: dead.bodyX, y: dead.bodyY });
  reporter.room.send('report', {});
  await until(() => host.room.state.phase === 'meeting', 4000, 'meeting');
  log('meeting:', host.room.state.meetingReason, `(reporter was at ${Math.round(rp.x)},${Math.round(rp.y)})`);
  const killerId = killer.room.sessionId;
  for (const b of bots) b.room.send('vote', { target: b.room.sessionId === killerId ? 'skip' : killerId });
  await until(() => host.room.state.phase === 'reveal', 4000, 'reveal');
  log('vote result', JSON.stringify(host.voteResult));
  if (!host.voteResult?.wasKiller) throw new Error('killer should have been ejected');
  await until(() => bots.every((b) => b.end), 9000, 'end');
  log('winner', host.end.winner, '-', host.end.reason);
  if (host.end.winner !== 'crew') throw new Error('crew should win after ejecting the only killer');

  host.room.send('lobby:return', {});
  await until(() => host.room.state.phase === 'lobby', 3000, 'lobby');
  log('back to lobby ✓');
  for (const b of bots) b.room.leave();
  log('ALL OK (arrest cooldown', GAME.arrestCooldownSec, 's)');
  process.exit(0);
}

main().catch((e) => {
  console.error('[smoke] FAIL', e);
  process.exit(1);
});
