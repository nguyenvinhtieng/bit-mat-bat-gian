/**
 * Headless end-to-end smoke test against a running server (pnpm dev:server).
 * N bot clients: create/join by code, start, walk to a station (server-validated movement),
 * solve a task, use ability, meeting chat + share clues, conclude, check end reveal.
 *   pnpm smoke            (default 4 bots)
 */
import { Client, type Room } from 'colyseus.js';
import {
  HUE_ROLE_STATIONS,
  HUE_STATIONS,
  MEETING_POINT,
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

type Bot = { room: Room<any>; name: string; me?: PrivateInfo; seq: number; task?: TaskData; lastResult?: any; end?: any };

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

function solve(t: TaskData): unknown {
  switch (t.taskId) {
    case 'task_print_checklist':
      return t.items.filter((i) => i.log === 'ok').map((i) => i.id);
    case 'task_scan_footnote':
      return { held: true };
    case 'task_update_floor_plan':
      return t.sequence;
    case 'task_check_lights_labels':
      return t.lights;
    case 'task_seal_box':
      return t.sealNumber;
    case 'task_return_shelf_a':
      return t.bookCode.split('/ ')[1];
  }
}

function wire(b: Bot) {
  b.room.onMessage('private', (m) => (b.me = m));
  b.room.onMessage('task:data', (t) => (b.task = t));
  b.room.onMessage('task:result', (r) => (b.lastResult = r));
  b.room.onMessage('ability:data', () => {});
  b.room.onMessage('ability:result', (r) => (b.lastResult = r));
  b.room.onMessage('end', (e) => (b.end = e));
  for (const t of ['chat', 'chat:history', 'toast', 'intro', 'teleport', 'task:close', 'time']) b.room.onMessage(t, () => {});
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
  log('room code', code, '(roomId', host.room.roomId + ')');
  const bots = [host];
  for (let i = 1; i < N; i++) {
    const b: Bot = { room: await new Client(URL).joinById(code, { name: `Bot-${i}` }), name: `Bot-${i}`, seq: 0 };
    wire(b);
    bots.push(b);
  }
  await until(() => host.room.state.players.size === N, 3000, 'players joined');
  log('players', host.room.state.players.size);

  // collision check: try to walk north into the wall
  const p0 = host.room.state.players.get(host.room.sessionId);
  host.room.send('input', Array.from({ length: 10 }, () => ({ seq: ++host.seq, dx: 0, dy: -1 })));
  await sleep(600);
  const p1 = host.room.state.players.get(host.room.sessionId);
  log('moved north', p0.y, '->', p1.y, '(wall top of courtyard at y>=55)');
  if (p1.y < 48 + 7 - 0.1) throw new Error('walked through wall');

  host.room.send('configure', { variant: 'HUE-A', quick: true });
  await sleep(200);
  host.room.send('start', {});
  await until(() => host.room.state.phase === 'explore' && bots.every((b) => b.me), 4000, 'explore + private');
  log('roles', bots.map((b) => `${b.name}:${b.me!.role}`).join(', '));

  // every bot does one task at a different station; host also does the ability
  await Promise.all(
    bots.map(async (b, i) => {
      const st = HUE_STATIONS[i % HUE_STATIONS.length];
      const d = await walkTo(b, st);
      b.room.send('task:open', { taskId: st.id });
      await until(() => b.task, 4000, `${b.name} task:data (dist ${d.toFixed(1)})`);
      if (b.task!.taskId === 'task_scan_footnote') await sleep(1800);
      b.room.send('task:submit', { taskId: st.id, answer: solve(b.task!) });
      await until(() => b.lastResult?.ok, 4000, `${b.name} task result`);
      log(`${b.name} completed ${st.id} -> clue "${b.lastResult.clues[0].title}"`);
      b.lastResult = undefined;
      const rs = HUE_ROLE_STATIONS[b.me!.role];
      await walkTo(b, rs);
      b.room.send('ability:use', { option: b.me!.role === 'forger' ? 'plant_note' : b.me!.role === 'broker' ? 'hold' : 'use' });
      await until(() => b.lastResult?.clue, 4000, `${b.name} ability`);
      log(`${b.name} ability(${b.me!.role}) -> "${b.lastResult.clue.title}"`);
    }),
  );
  log('progress', host.room.state.progress, '/', host.room.state.progressTarget);

  // emergency meeting from the table
  await walkTo(host, { x: MEETING_POINT.x, y: MEETING_POINT.y + 60 });
  host.room.send('emergency', {});
  await until(() => host.room.state.phase === 'meeting', 4000, 'meeting');
  log('meeting:', host.room.state.meetingReason);
  for (const b of bots) {
    b.room.send('chat', { text: `${b.name}: tôi có ${b.me!.notebook.length} manh mối` });
    for (const cl of b.me!.notebook) b.room.send('clue:share', { clueId: cl.id });
  }
  await sleep(500);
  log('board size', host.room.state.board.length);

  // skip to round 2, then final meeting -> conclusion
  host.room.send('host:skip', {});
  await until(() => host.room.state.phase === 'explore' && host.room.state.round === 2, 3000, 'round 2');
  host.room.send('host:skip', {});
  await until(() => host.room.state.phase === 'meeting' && host.room.state.finalMeeting, 3000, 'final meeting');
  host.room.send('host:skip', {});
  await until(() => host.room.state.phase === 'conclusion', 3000, 'conclusion');
  for (const b of bots) b.room.send('conclude', { sentence: 3, type: 'translation', responsible: 'tuan', when: 'night_before' });
  await until(() => bots.every((b) => b.end), 4000, 'end');
  log('winner', host.end.winner, JSON.stringify(host.end.correct));
  if (host.end.winner !== 'investigation') throw new Error('expected investigation to win with correct HUE-A conclusion');

  host.room.send('host:restart', {});
  await until(() => host.room.state.phase === 'lobby', 3000, 'lobby');
  log('back to lobby ✓');
  for (const b of bots) b.room.leave();
  log('ALL OK');
  process.exit(0);
}

main().catch((e) => {
  console.error('[smoke] FAIL', e);
  process.exit(1);
});
