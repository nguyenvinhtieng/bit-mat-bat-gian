/**
 * Headless end-to-end smoke test against a running server (pnpm dev:server).
 * N bot clients: create/join by code, start, walk to a station (server-validated movement),
 * killer hunts a villager, body report, vote, end reveal.
 *   pnpm smoke            (default 4 bots)
 */
import { Client, type Room } from 'colyseus.js';
import {
  GAME,
  GAME_STATIONS,
  type GameTurn,
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

function finalTurn(say: string): GameTurn {
  const s = say.toLowerCase();
  const last = Math.max(s.lastIndexOf('trái'), s.lastIndexOf('phải'), s.lastIndexOf('chạy thẳng'));
  if (last === s.lastIndexOf('chạy thẳng') && last >= 0) return 'thang';
  if (s.lastIndexOf('trái') > s.lastIndexOf('phải')) return 'trai';
  if (s.lastIndexOf('phải') > s.lastIndexOf('trái')) return 'phai';
  return 'thang';
}

/** Solve a mini-game from the client payload only (what a skilled player can see on screen). */
function solve(t: TaskData): unknown {
  switch (t.taskId) {
    case 'task_chi_duong':
      return t.steps.map((s) => finalTurn(s.say));
    case 'task_com_tam': {
      const want = new Set<string>();
      for (const line of t.order) {
        const low = line.toLowerCase();
        for (const item of t.tray) {
          const n = item.name.toLowerCase();
          if (!low.includes(n)) continue;
          if (low.includes(`bỏ ${n}`)) continue;
          want.add(item.kind);
        }
      }
      return [...want].slice(0, t.want);
    }
    case 'task_tieng_rao': {
      const legend = new Map(t.legend.map((l) => [l.text.toLowerCase(), l.means]));
      return Object.fromEntries(t.calls.map((c) => {
        const key = t.legend.find((l) => c.text.includes(l.text))!;
        return [c.id, key.means];
      }));
    }
    case 'task_ca_phe_phin':
      return { milk: t.line };
    case 'task_do_xang':
      return { holdMs: (t.target / (t.pricePerLiter * t.litersPerSec)) * 1000 };
    case 'task_va_vo':
      return { patches: t.leaks };
    case 'task_so_hui': {
      const out: Record<string, string> = {};
      for (const row of t.rows) {
        const msg = t.messages.find((m) => m.text.includes(row.name) || m.from === row.name);
        const amt = t.amounts.find((a) => msg && msg.text.includes(a.label));
        if (amt) out[row.id] = amt.id;
      }
      return out;
    }
    case 'task_dem_tien': {
      const stacks = Object.fromEntries(t.notes.map((n) => [n.id, n.value]));
      const total = t.notes.reduce((s, n) => s + n.value, 0);
      return { stacks, total };
    }
    case 'task_khui_hui': {
      const best = [...t.envelopes].sort((a, b) => parseInt(b.bid, 10) - parseInt(a.bid, 10))[0];
      return best.id;
    }
    case 'task_xep_xe':
      throw new Error('xep_xe bot solver not implemented');
  }
}

const MIN_MS: Partial<Record<TaskData['taskId'], number>> = {
  task_com_tam: 9000,
  task_ca_phe_phin: 3500,
  task_do_xang: 2500,
  task_va_vo: 3500,
  task_khui_hui: 5000,
};

function wire(b: Bot) {
  b.room.onMessage('private', (m) => (b.me = m));
  b.room.onMessage('task:data', (t) => (b.task = t));
  b.room.onMessage('task:result', (r) => (b.lastResult = r));
  b.room.onMessage('vote:result', (r) => (b.voteResult = r));
  b.room.onMessage('end', (e) => (b.end = e));
  for (const t of ['chat', 'chat:history', 'toast', 'intro', 'teleport', 'task:close', 'time', 'canh', 'cinematic', 'pong', 'private:refresh']) b.room.onMessage(t, () => {});
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

  host.room.send('configure', { tasksPerPlayer: 3 });
  for (const b of bots) b.room.send('ready', { ready: true });
  await sleep(200);
  host.room.send('start', {});
  await until(() => host.room.state.phase === 'explore' && bots.every((b) => b.me), 4000, 'explore + private');
  log('roles', bots.map((b) => `${b.name}:${b.me!.role}`).join(', '));
  const killer = bots.find((b) => b.me!.faction === 'killer')!;
  const crew = bots.filter((b) => b.me!.faction === 'crew');
  if (!killer) throw new Error('no killer assigned');
  if (killer.me!.tasks.length === 0) throw new Error('killer has no fake task list');

  // a crew member plays EVERY assigned mini-game -> shared progress goes up, night-watch drum strikes
  const worker = crew[0];
  let canh = 0;
  host.room.onMessage('canh', (c: { canh: number }) => (canh = c.canh));
  for (const tid of worker.me!.tasks) {
    const st = GAME_STATIONS.find((x) => x.id === tid)!;
    await walkTo(worker, st);
    worker.task = undefined;
    worker.lastResult = undefined;
    worker.room.send('task:open', { taskId: tid });
    await until(() => worker.task, 4000, `task:data ${tid}`);
    // a wrong answer must be rejected
    worker.room.send('task:submit', { taskId: tid, answer: { wrong: true } });
    await until(() => worker.lastResult, 4000, `reject ${tid}`);
    if (worker.lastResult!.ok) throw new Error(`${tid}: wrong answer accepted`);
    worker.lastResult = undefined;
    await sleep((MIN_MS[tid] ?? 2500) + 100);
    worker.room.send('task:submit', { taskId: tid, answer: solve(worker.task!) });
    await until(() => worker.lastResult, 4000, `task result ${tid}`);
    if (!worker.lastResult!.ok) throw new Error(`${tid}: correct answer rejected`);
    log('task done', tid, '-> progress', host.room.state.progress, '/', host.room.state.progressTarget, 'canh', canh);
  }
  if (host.room.state.progress < worker.me!.tasks.length) throw new Error('progress did not increase');

  // killer walks to a victim and kills (server validates range + cooldown)
  const victim = crew[crew.length - 1];
  const vp = victim.room.state.players.get(victim.room.sessionId);
  await walkTo(killer, { x: vp.x + 20, y: vp.y });
  log('waiting for kill cooldown…');
  let killed = false;
  for (let i = 0; i < 6 && !killed; i++) {
    await sleep(3000);
    killer.room.send('kill', {});
    await sleep(300);
    killed = [...host.room.state.players.values()].some((p: any) => !p.alive);
  }
  if (!killed) throw new Error('kill never landed (guardian shield may have absorbed one; check logs)');
  const dead = [...host.room.state.players.values()].find((p: any) => !p.alive) as any;
  log('killed', dead.name, 'body', dead.body);

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
  log('ALL OK (cooldown', GAME.killCooldownSec, 's, quick mode shortens it)');
  process.exit(0);
}

main().catch((e) => {
  console.error('[smoke] FAIL', e);
  process.exit(1);
});
