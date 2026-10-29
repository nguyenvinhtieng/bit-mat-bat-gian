import { Room, ServerError, type Client } from '@colyseus/core';
import {
  mapMeta,
  mapSkin,
  playableMap,
  GAME,
  INTERACT_RADIUS,
  MAX_PLAYERS,
  MEETING_POINT,
  PATCH_MS,
  PLAYER_COLORS,
  PREP_TASK_IDS,
  ROLE_INFO,
  SIM_DT,
  SIM_HZ,
  SPAWNS,
  areaAt,
  dirFromInput,
  dist,
  getGrid,
  getLobbyGrid,
  canSeePoint,
  SAY_MAX,
  NAME_MAX,
  MIN_PLAYERS,
  dealTasks,
  copsFor,
  copsValid,
  maxCops,
  stepMovement,
  type ChatMsg,
  type EndReveal,
  type Faction,
  type InspectResult,
  type PrivateInfo,
  type RoleId,
  type TaskId,
  type TaskResultMsg,
  type VoteResult,
} from '@giao-keo/shared';
import { contentFor, type Pending } from '../content';
import { Delivery, recentActivities, type Activity } from './delivery';
import { GameState, Player, StationState } from './schema';

/** dev: the host alone can ready up and start (no 4-player minimum, others needn't be ready) */
const DEV = process.env.NODE_ENV !== 'production';

type Secret = {
  role: RoleId;
  faction: Faction;
  objective: string;
  /** tasks this player finished (real or faked) — shown on the end screen */
  done: number;
  /** what the veteran may read: every submit, success or not */
  log: Activity[];
  pending?: Pending;
  vote?: string;
  arrestReadyAt: number;
  inspectLeft: boolean;
};
type MoveState = { queue: { seq: number; dx: number; dy: number }[]; budget: number; lastQueued: number };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AFK_LOBBY_MS = 3 * 60_000;
/** how long a dropped seat is held (a phone off to Zalo to share the code, a 4G hand-over) */
const HOLD_LOBBY_S = 60;
const HOLD_GAME_S = 120;
/** close code for a session whose seat was taken over by the same device on a newer session */
const REPLACED = 4003;
const activeCodes = new Set<string>();
const grid = getGrid();
const lobbyGrid = getLobbyGrid();

const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const cleanName = (raw: unknown) => (raw ?? '').toString().replace(/[<>]/g, '').trim().slice(0, NAME_MAX);
const cleanPid = (raw: unknown) => (typeof raw === 'string' && /^[\w-]{8,64}$/.test(raw) ? raw : '');
const rekey = <V>(map: Map<string, V>, from: string, to: string) => {
  if (!map.has(from)) return;
  map.set(to, map.get(from)!);
  map.delete(from);
};

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private secrets = new Map<string, Secret>();
  private moves = new Map<string, MoveState>();
  private lastChat = new Map<string, number>();
  private lastSay = new Map<string, number>();
  private chatLog: ChatMsg[] = [];
  private lastActive = new Map<string, number>();
  private delivery = new Delivery();
  /** set once the room closes itself (nobody online) so late reconnect timeouts don't touch a dead room */
  private closing = false;
  /** sessions the server itself removed (host kick / AFK): their close is never "unexpected", so no seat is held */
  private kicked = new Set<string>();
  /** device id per session (random, kept in the client's storage): a reload or lost token can take its seat back */
  private pids = new Map<string, string>();

  private get skin() {
    return mapSkin(this.state.mapSlug);
  }
  private get content() {
    return contentFor(this.state.mapSlug);
  }
  private station(taskId: TaskId) {
    return this.skin.stations.find((x) => x.id === taskId);
  }

  onCreate(options: { name?: string; map?: string; public?: boolean }) {
    this.setState(new GameState());
    this.state.mapSlug = playableMap(options?.map);
    let code = '';
    do code = Array.from({ length: 6 }, () => pick(CODE_ALPHABET.split(''))).join('');
    while (activeCodes.has(code));
    activeCodes.add(code);
    this.roomId = code;
    this.state.code = code;
    this.setPatchRate(PATCH_MS);
    this.setSimulationInterval((dt) => this.update(dt), 1000 / SIM_HZ);
    // public unless the creator explicitly asks for a private room
    this.state.isPublic = options?.public !== false;
    this.setPrivate(!this.state.isPublic);
    this.setMetadata({ map: this.state.mapSlug, creator: options?.name ?? '', createdAt: Date.now() });
    this.syncMeta();
    this.registerMessages();
  }

  /** admin panel: drop a room nobody is online in (index.ts checks that before calling) */
  adminClose() {
    this.closing = true;
    this.disconnect();
  }

  onDispose() {
    activeCodes.delete(this.roomId);
  }

  onJoin(client: Client, options: { name?: string; pid?: string; resumeOnly?: boolean }) {
    const pid = cleanPid(options?.pid);
    const prev = pid ? [...this.pids].find(([id, v]) => v === pid && this.state.players.has(id))?.[0] : undefined;
    if (prev) return this.takeOver(prev, client, pid);
    // Recovery must never turn an expired or kicked seat into a new player.
    if (options?.resumeOnly) throw new ServerError(4004, 'Chỗ cũ không còn. Hãy vào lại phòng bằng mã phòng.');
    if (this.state.phase !== 'lobby') throw new Error('Ván đang diễn ra — không thể vào giữa chừng.');
    const p = new Player();
    p.id = client.sessionId;
    p.name = cleanName(options?.name) || `Khách ${this.state.players.size + 1}`;
    const used = new Set([...this.state.players.values()].map((x) => x.color));
    p.color = PLAYER_COLORS.findIndex((_, i) => !used.has(i));
    const spawn = SPAWNS[this.state.players.size % SPAWNS.length];
    p.x = spawn.x;
    p.y = spawn.y;
    this.state.players.set(client.sessionId, p);
    this.moves.set(client.sessionId, { queue: [], budget: 0, lastQueued: 0 });
    this.lastActive.set(client.sessionId, Date.now());
    if (pid) this.pids.set(client.sessionId, pid);
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    this.syncMeta();
    this.system(`${p.name} đã vào phòng.`);
    client.send('time', Date.now());
    client.send('chat:history', this.chatLog.slice(-40));
  }

  async onLeave(client: Client, consented: boolean) {
    const kicked = this.kicked.delete(client.sessionId);
    const p = this.state.players.get(client.sessionId);
    if (!p) return; // evicted: the seat is already gone
    if (!consented && !kicked) {
      // flaky mobile networks / app switching: hold the seat (shorter in the lobby so a dead player doesn't block the start)
      p.connected = false;
      // don't leave the room captained by a dead socket. Nobody online at all (a lone host pressing F5, every phone
      // asleep) still holds the seat: the room closes once the last hold lapses
      if ([...this.state.players.values()].some((x) => x.connected)) this.keepOnlineHost();
      try {
        const rc = await this.allowReconnection(client, this.state.phase === 'lobby' ? HOLD_LOBBY_S : HOLD_GAME_S);
        // the same device came back on a new session meanwhile and already owns the seat
        if (this.state.players.get(client.sessionId) !== p) return rc.leave(REPLACED);
        p.connected = true;
        this.syncMeta();
        rc.send('time', Date.now());
        this.sendPrivate(client.sessionId);
        rc.send('chat:history', this.chatLog.slice(-40));
        return;
      } catch {
        if (this.closing || this.state.players.get(client.sessionId) !== p) return;
      }
    }
    if (this.state.phase === 'lobby') {
      this.state.players.delete(client.sessionId);
      this.moves.delete(client.sessionId);
      this.pids.delete(client.sessionId);
      // dropped below the minimum: nobody can stay ready for a game that can't start
      if (!DEV && this.state.players.size < MIN_PLAYERS) for (const x of this.state.players.values()) x.ready = false;
    } else {
      p.connected = false;
      p.alive = false; // counter catches up at the next vote — syncing now would reveal the leaver's side
      this.dropPackage(p.id, p);
      this.handOverTasks(p.id);
    }
    if (!kicked) this.system(`${p.name} đã rời phòng.`);
    if (!this.keepOnlineHost()) return;
    if (this.state.phase === 'meeting') this.maybeResolveVotes();
    else if (this.state.phase === 'explore') this.checkWin();
  }

  /**
   * The same device is back on a new session (reload, lost reconnection token, socket stuck mid-join): move its
   * seat — role, tasks, package, votes — to the new session instead of adding a duplicate. Works mid-game too
   * (a seat given up after the hold comes back as a spectator). A still-open old socket is closed.
   */
  private takeOver(oldId: string, client: Client, pid: string) {
    const id = client.sessionId;
    const old = this.state.players.get(oldId)!;
    const p = Object.assign(new Player(), old.toJSON(), { id, connected: true });
    this.state.players.delete(oldId);
    this.state.players.set(id, p);
    for (const m of [this.secrets, this.moves, this.lastChat, this.lastSay, this.pids] as Map<string, unknown>[]) rekey(m, oldId, id);
    this.pids.set(id, pid);
    this.lastActive.delete(oldId);
    this.lastActive.set(id, Date.now());
    this.kicked.delete(oldId);
    if (this.state.hostId === oldId) this.state.hostId = id;
    for (const x of this.state.players.values()) if (x.voteFor === oldId) x.voteFor = id;
    for (const s of this.secrets.values()) if (s.vote === oldId) s.vote = id;
    for (const m of this.chatLog) if (m.from === oldId) m.from = id;
    this.delivery.rekey(oldId, id);
    this.syncDelivery();
    this.clients.getById(oldId)?.leave(REPLACED);
    this.syncMeta();
    client.send('time', Date.now());
    client.send('chat:history', this.chatLog.slice(-40));
    // cops see each other's ids: refresh theirs too
    const killer = this.secrets.get(id)?.faction === 'killer';
    for (const [x, s] of this.secrets) if (x === id || (killer && s.faction === 'killer')) this.sendPrivate(x);
  }

  // ---------------------------------------------------------------- messages
  private registerMessages() {
    this.onMessage('input', (client, list: unknown) => {
      const m = this.moves.get(client.sessionId);
      if (!m || !Array.isArray(list)) return;
      if (list.some((r) => r?.dx || r?.dy)) this.lastActive.set(client.sessionId, Date.now());
      for (const raw of list.slice(0, 12)) {
        const seq = Number(raw?.seq);
        if (!Number.isInteger(seq) || seq <= m.lastQueued) continue;
        // analog (touch stick) allowed; stepMovement caps the vector length at 1 so no speed gain is possible
        const dx = Math.max(-1, Math.min(1, Math.round((Number(raw.dx) || 0) * 100) / 100));
        const dy = Math.max(-1, Math.min(1, Math.round((Number(raw.dy) || 0) * 100) / 100));
        m.lastQueued = seq;
        m.queue.push({ seq, dx, dy });
      }
      if (m.queue.length > 30) m.queue.splice(0, m.queue.length - 30);
    });

    this.onMessage('ping', (client, t: number) => client.send('pong', t));

    // voice chat: peer-to-peer WebRTC; the server only relays the handshake between two players of this room
    this.onMessage('voice:signal', (client, msg: { to?: unknown; data?: unknown }) => {
      const to = typeof msg?.to === 'string' ? msg.to : '';
      if (!to || to === client.sessionId || !this.state.players.has(client.sessionId) || !this.state.players.has(to)) return;
      if (!msg.data || typeof msg.data !== 'object' || JSON.stringify(msg.data).length > 16_000) return;
      this.clients.getById(to)?.send('voice:signal', { from: client.sessionId, data: msg.data });
    });
    this.onMessage('voice:mic', (client, msg: { on?: unknown }) => {
      const p = this.state.players.get(client.sessionId);
      if (p) p.micOn = msg?.on === true;
    });

    this.onMessage('ready', (client, msg: { ready: boolean }) => {
      this.lastActive.set(client.sessionId, Date.now());
      const p = this.state.players.get(client.sessionId);
      if (!p || this.state.phase !== 'lobby') return;
      const n = this.state.players.size;
      if (!DEV && msg?.ready && n < MIN_PLAYERS) return client.send('toast', { text: `Cần đủ ${MIN_PLAYERS} người mới sẵn sàng được (hiện có ${n}).`, kind: 'warn' });
      p.ready = !!msg?.ready;
    });

    this.onMessage('rename', (client, msg: { name?: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || this.state.phase !== 'lobby') return;
      const name = cleanName(msg?.name);
      if (!name || name === p.name) return;
      this.lastActive.set(client.sessionId, Date.now());
      const prev = p.name;
      p.name = name;
      this.system(`${prev} đã đổi tên thành ${name}.`);
    });

    this.onMessage('configure', (client, msg: { tasksPerPlayer?: number; timeMin?: number; cops?: number }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      if (Number.isFinite(msg?.tasksPerPlayer)) {
        this.state.tasksPerPlayer = Math.max(GAME.tasksPerPlayerMin, Math.min(GAME.tasksPerPlayerMax, Math.floor(msg.tasksPerPlayer!)));
      }
      if (Number.isFinite(msg?.timeMin)) {
        const min = DEV ? GAME.timeMinMinDev : GAME.timeMinMin;
        this.state.nightMin = Math.max(min, Math.min(GAME.timeMinMax, Math.floor(msg.timeMin!)));
      }
      if (Number.isFinite(msg?.cops)) {
        const cops = Math.max(GAME.copsMin, Math.min(GAME.copsMax, Math.floor(msg.cops!)));
        const n = Math.max(this.state.players.size, MIN_PLAYERS);
        if (!copsValid(cops, n)) {
          client.send('toast', { text: `${cops} công an là quá nhiều cho ${n} người (tối đa ${maxCops(n)}: phải ít hơn 1/2 số dân).`, kind: 'warn' });
        } else this.state.cops = cops;
      }
    });

    this.onMessage('start', (client) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      const n = this.state.players.size;
      if (DEV) {
        if (!this.state.players.get(client.sessionId)?.ready) return client.send('toast', { text: 'Bạn chưa sẵn sàng.', kind: 'warn' });
        return this.startGame();
      }
      if (n < MIN_PLAYERS) return client.send('toast', { text: `Cần ít nhất ${MIN_PLAYERS} người để bắt đầu (hiện có ${n}).`, kind: 'warn' });
      if (!copsValid(this.state.cops, n)) {
        return client.send('toast', { text: `${this.state.cops} công an là quá nhiều cho ${n} người (tối đa ${maxCops(n)}: phải ít hơn 1/2 số dân).`, kind: 'warn' });
      }
      const waiting = [...this.state.players.values()].filter((p) => !p.ready).length;
      if (waiting) return client.send('toast', { text: `Còn ${waiting} người chưa sẵn sàng.`, kind: 'warn' });
      this.startGame();
    });

    this.onMessage('task:open', (client, msg: { taskId: TaskId }) => this.openTask(client, msg?.taskId));
    this.onMessage('task:submit', (client, msg: { taskId: TaskId; answer: unknown }) => this.submitTask(client, msg));
    this.onMessage('task:cancel', (client) => this.cancelTask(client));
    this.onMessage('arrest', (client, msg: { on: boolean }) => {
      if (msg?.on === true) this.arrestStart(client);
    });
    this.onMessage('report', (client) => this.report(client));
    this.onMessage('package:pick', (client) => this.pickPackage(client));
    this.onMessage('package:drop', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (p && this.state.phase === 'explore' && this.delivery.drop(p.id, p)) this.syncDelivery();
    });
    this.onMessage('skill:inspect', (client, msg: { target: string }) => this.inspect(client, String(msg?.target ?? '')));

    this.onMessage('emergency', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !p.alive || this.state.phase !== 'explore' || p.emergencyUsed) return;
      if (dist(p, MEETING_POINT) > INTERACT_RADIUS + 60) return client.send('toast', { text: `Hãy đến bàn họp ở ${this.skin.areas[areaAt(grid, MEETING_POINT.x, MEETING_POINT.y)!].name} để đánh ${this.skin.emergency.vi}.`, kind: 'warn' });
      p.emergencyUsed = true;
      this.broadcast('cinematic', { kind: 'emergency', actor: { name: p.name, color: p.color } });
      this.startMeeting(`${p.name} đánh ${this.skin.emergency.vi} gọi họp khẩn`);
    });

    this.onMessage('chat', (client, msg: { text: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const phase = this.state.phase;
      if (phase === 'explore' || phase === 'reveal') return client.send('toast', { text: 'Chỉ trò chuyện được khi họp.', kind: 'warn' });
      if (!p.alive && phase === 'meeting') return client.send('toast', { text: 'Hồn ma không thể nói trong cuộc họp.', kind: 'warn' });
      const now = Date.now();
      if (now - (this.lastChat.get(client.sessionId) ?? 0) < 400) return;
      this.lastChat.set(client.sessionId, now);
      const text = String(msg?.text ?? '').trim().slice(0, 240);
      if (!text) return;
      this.pushChat({ from: p.id, name: p.name, color: p.color, text, t: now });
    });

    // speech bubble while exploring: only the speaker, ghosts and drivers who can see them get it (no peeking through walls)
    this.onMessage('say', (client, msg: { text: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !p.alive || this.state.phase !== 'explore') return;
      const now = Date.now();
      if (now - (this.lastSay.get(client.sessionId) ?? 0) < 800) return;
      this.lastSay.set(client.sessionId, now);
      const text = String(msg?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, SAY_MAX);
      if (!text) return;
      for (const c of this.clients) {
        const w = this.state.players.get(c.sessionId);
        if (!w) continue;
        if (w.id === p.id || !w.alive || canSeePoint(grid, w, p, GAME.sightRadius * 1.15)) c.send('say', { from: p.id, text });
      }
    });

    this.onMessage('vote', (client, msg: { target: string }) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.secrets.get(client.sessionId);
      if (!p || !s || !p.alive || this.state.phase !== 'meeting' || p.voted) return;
      const target = String(msg?.target ?? '');
      if (target !== 'skip') {
        // you can never vote yourself out
        if (target === client.sessionId) return client.send('toast', { text: 'Bạn không thể bỏ phiếu cho chính mình.', kind: 'warn' });
        const t = this.state.players.get(target);
        if (!t || !t.alive) return;
      }
      s.vote = target;
      p.voted = true;
      p.voteFor = target;
      this.maybeResolveVotes();
    });

    this.onMessage('host:skip', (client) => {
      if (client.sessionId !== this.state.hostId) return;
      // host may only skip the result screen — never cut a vote short (unfair to the others)
      if (this.state.phase === 'reveal') this.advancePhase();
    });

    // the game is over: anyone may head back to the lobby (room code, map and settings stay); the others keep
    // reading their result screen until they leave it themselves
    this.onMessage('lobby:return', (client) => {
      if (this.state.phase !== 'ended' || !this.state.players.has(client.sessionId)) return;
      this.resetToLobby();
    });

    this.onMessage('host:map', (client, msg: { map: string }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      const slug = playableMap(String(msg?.map ?? ''));
      if (slug === this.state.mapSlug) return;
      this.state.mapSlug = slug;
      this.syncMeta();
      this.system(`Chủ phòng đã đổi bản đồ: ${mapMeta(slug).name.vi}.`);
    });

    this.onMessage('host:visibility', (client, msg: { public: boolean }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      const pub = !!msg?.public;
      if (pub === this.state.isPublic) return;
      this.state.isPublic = pub;
      // private rooms drop out of the matchmaker entirely; the room code still works as the invite
      this.setPrivate(!pub);
      this.syncMeta();
      this.system(pub ? 'Chủ phòng đã mở phòng công khai — người chơi khác có thể tìm thấy phòng.' : 'Chủ phòng đã chuyển phòng sang riêng tư — chỉ vào được bằng mã mời.');
    });

    this.onMessage('host:kick', (client, msg: { target: string }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      const target = String(msg?.target ?? '');
      if (!target || target === client.sessionId) return;
      const victim = this.clients.find((c) => c.sessionId === target);
      if (!victim) return;
      const name = this.state.players.get(target)?.name ?? '';
      this.evict(victim, 'Bạn đã bị chủ phòng mời ra khỏi phòng.');
      this.system(`Chủ phòng đã mời ${name} ra khỏi phòng.`);
    });
  }

  /** Kick non-host players idle in the lobby for too long. */
  private kickAfk() {
    const now = Date.now();
    for (const client of this.clients) {
      if (client.sessionId === this.state.hostId) continue;
      const last = this.lastActive.get(client.sessionId) ?? now;
      if (now - last > AFK_LOBBY_MS) {
        const name = this.state.players.get(client.sessionId)?.name ?? '';
        this.evict(client, 'Bạn bị mời ra khỏi phòng vì không hoạt động.');
        this.system(`${name} bị mời ra vì không hoạt động.`);
      }
    }
  }

  /** Lobby removal by the server (host kick / AFK): the seat goes now — a backgrounded phone's socket close can lag ~30s. */
  private evict(client: Client, text: string) {
    const id = client.sessionId;
    client.send('toast', { text, kind: 'warn' });
    this.lastActive.delete(id);
    this.kicked.add(id);
    this.state.players.delete(id);
    this.moves.delete(id);
    this.pids.delete(id);
    if (!DEV && this.state.players.size < MIN_PLAYERS) for (const x of this.state.players.values()) x.ready = false;
    this.syncMeta();
    client.leave(4001);
  }

  // ---------------------------------------------------------------- simulation
  private update(dtMs: number) {
    if (this.state.phase === 'lobby') this.kickAfk();
    const canMove = this.state.phase === 'lobby' || this.state.phase === 'explore';
    for (const [id, m] of this.moves) {
      const p = this.state.players.get(id);
      if (!p) continue;
      m.budget = Math.min(m.budget + (dtMs / 1000) * SIM_HZ, 8);
      let moved = false;
      while (m.queue.length && m.budget >= 1) {
        const inp = m.queue.shift()!;
        m.budget -= 1;
        if (canMove) {
          const next = stepMovement(this.state.phase === 'lobby' ? lobbyGrid : grid, p, inp, SIM_DT);
          if (next.x !== p.x || next.y !== p.y) moved = true;
          p.x = next.x;
          p.y = next.y;
          p.dir = dirFromInput(inp, p.dir);
        }
        p.lastSeq = inp.seq;
      }
      p.moving = moved;
    }
    if (this.delivery.state === 'carried') {
      const c = this.state.players.get(this.delivery.carrier);
      if (c) {
        this.state.packageX = this.delivery.x = c.x;
        this.state.packageY = this.delivery.y = c.y;
      }
    }
    if (this.state.phaseEndsAt && Date.now() >= this.state.phaseEndsAt) this.advancePhase();
    if (this.state.phase === 'explore') this.tickClock();
  }

  // ---------------------------------------------------------------- phases
  private cfg() {
    return {
      meetingMs: GAME.meetingSec * 1000,
      arrestCd: GAME.arrestCooldownSec * 1000,
      firstCd: GAME.firstArrestCooldownSec * 1000,
      postMeetingCd: GAME.postMeetingCooldownSec * 1000,
    };
  }

  private startGame() {
    const players = [...this.state.players.values()];
    const n = players.length;
    const c = this.cfg();
    // the host's cop count (clamped for small dev rooms) and one veteran; everyone else is a plain CRAB driver
    const roles: RoleId[] = [...Array<RoleId>(copsFor(this.state.cops, n)).fill('undercover'), 'veteran_driver'];
    while (roles.length < n) roles.push('driver');
    const assigned = shuffle(roles);

    this.secrets.clear();
    // the countdown (and the first arrest cooldown) only starts once the role reveal is over
    const dusk = Date.now() + GAME.introSec * 1000;
    players.forEach((p, i) => {
      const role = assigned[i];
      const faction = ROLE_INFO[role].faction;
      this.secrets.set(p.id, {
        role,
        faction,
        objective: faction === 'killer' ? this.skin.story.objective.killer : this.skin.story.objective.crew,
        done: 0,
        log: [],
        arrestReadyAt: dusk + c.firstCd,
        inspectLeft: role === 'veteran_driver',
      });
      p.tasksDone = 0;
      p.voted = false;
      p.voteFor = '';
      p.emergencyUsed = false;
      p.alive = true;
      p.body = false;
    });
    // everyone gets a personal list (the cop's is cover); only the drivers' lists fill the bar
    const deal = dealTasks(players.map((p) => p.id), this.state.tasksPerPlayer);
    const drivers = players.filter((p) => this.secrets.get(p.id)!.faction === 'crew').map((p) => p.id);
    this.delivery.reset(deal, drivers, this.skin.delivery.packageHome);
    this.syncDelivery();
    this.state.nightStartAt = dusk;
    this.state.nightPausedAt = 0;
    this.state.meetingReason = '';
    this.teleportToSpawns();
    this.setPhase('explore', 0);
    this.syncAlive();
    for (const p of players) this.sendPrivate(p.id);
    this.broadcast('intro', {});
    this.system(`Ván bắt đầu — một ${this.skin.killerName.vi} đang trà trộn trong ${this.skin.crewName.vi}. Chuẩn bị Cuốc Cuối và bàn giao trước khi trời sáng!`);
  }

  private setPhase(phase: GameState['phase'], durationMs: number) {
    this.state.phase = phase;
    this.state.phaseEndsAt = durationMs > 0 ? Date.now() + durationMs : 0;
    this.syncMeta();
  }

  /** listing info read by quick-match (/rooms/find) */
  private syncMeta() {
    const online = [...this.state.players.values()].filter((x) => x.connected).length;
    this.setMetadata({ ...this.metadata, map: this.state.mapSlug, phase: this.state.phase, public: this.state.isPublic, online });
  }

  /**
   * The captain must be someone still online: hand the role to the first connected player if needed.
   * With nobody online the room is closed right away. Returns false when the room is closing.
   */
  private keepOnlineHost(): boolean {
    const online = [...this.state.players.values()].filter((x) => x.connected);
    if (!online.length) {
      this.closing = true;
      this.disconnect();
      return false;
    }
    if (!online.some((x) => x.id === this.state.hostId)) {
      this.state.hostId = online[0].id;
      this.system(`${online[0].name} giờ là trưởng phòng.`);
    }
    this.syncMeta();
    return true;
  }

  private advancePhase() {
    const ph = this.state.phase;
    if (ph === 'meeting') {
      this.resolveVotes();
    } else if (ph === 'reveal') {
      if (this.checkWin()) return;
      const now = Date.now();
      for (const s of this.secrets.values()) if (s.faction === 'killer') s.arrestReadyAt = Math.max(s.arrestReadyAt, now + this.cfg().postMeetingCd);
      this.state.meetingReason = '';
      this.setPhase('explore', 0);
      this.resumeNight();
      for (const id of this.secrets.keys()) this.sendPrivate(id);
      this.system('Cuộc họp kết thúc — mọi người trở lại làm việc.');
    }
  }

  private startMeeting(reason: string) {
    this.state.meetingReason = reason;
    for (const p of this.state.players.values()) {
      p.body = false;
      p.voted = false;
      p.voteFor = '';
    }
    for (const s of this.secrets.values()) {
      s.pending = undefined;
      s.vote = undefined;
    }
    this.teleportToSpawns();
    this.broadcast('task:close', {});
    if (!this.state.nightPausedAt) this.state.nightPausedAt = Date.now();
    this.setPhase('meeting', this.cfg().meetingMs);
    this.system(`Họp khẩn: ${reason}. Thảo luận và bỏ phiếu loại người đáng ngờ (hoặc bỏ qua).`);
  }

  private teleportToSpawns() {
    let i = 0;
    for (const p of this.state.players.values()) {
      const s = SPAWNS[i++ % SPAWNS.length];
      p.x = s.x;
      p.y = s.y;
      p.dir = 0;
      const m = this.moves.get(p.id);
      if (m) {
        m.queue.length = 0;
        p.lastSeq = m.lastQueued;
      }
    }
    this.broadcast('teleport', {});
  }

  // ---------------------------------------------------------------- voting
  private maybeResolveVotes() {
    const voters = [...this.state.players.values()].filter((p) => p.alive && p.connected);
    if (voters.length && voters.every((p) => p.voted)) this.resolveVotes();
  }

  private resolveVotes() {
    if (this.state.phase !== 'meeting') return;
    const counts = new Map<string, number>();
    let skips = 0;
    for (const [id, s] of this.secrets) {
      const p = this.state.players.get(id);
      if (!p?.alive || !s.vote) continue;
      if (s.vote === 'skip') skips++;
      else counts.set(s.vote, (counts.get(s.vote) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted[0];
    const tie = sorted[1] && sorted[1][1] === top[1];
    const ejectedId = top && !tie && top[1] > skips ? top[0] : null;

    const result: VoteResult = {
      ejected: null,
      killersLeft: 0,
      skips,
      tally: sorted.map(([id, votes]) => {
        const p = this.state.players.get(id)!;
        return { name: p.name, color: p.color, votes };
      }),
    };
    if (ejectedId) {
      const p = this.state.players.get(ejectedId)!;
      p.alive = false;
      this.dropPackage(p.id, p);
      result.ejected = p.name;
      result.ejectedColor = p.color;
      result.wasKiller = this.secrets.get(ejectedId)?.faction === 'killer';
    }
    result.killersLeft = this.aliveKillers();
    this.syncAlive();
    this.broadcast('vote:result', result);
    this.system(
      result.ejected
        ? `${result.ejected} bị loại khỏi ${this.skin.crewName.vi}.`
        : tie
          ? (this.skin.phrases?.tie.vi ?? 'Hoà phiếu — không ai bị loại.')
          : 'Không ai bị loại.',
    );
    for (const p of this.state.players.values()) {
      p.voted = false;
      p.voteFor = '';
    }
    this.setPhase('reveal', result.ejected !== null ? GAME.revealSec * 1000 : 4000);
  }

  // ---------------------------------------------------------------- win conditions
  private aliveKillers() {
    let n = 0;
    for (const [id, s] of this.secrets) if (s.faction === 'killer' && this.state.players.get(id)?.alive) n++;
    return n;
  }

  private aliveCrew() {
    let n = 0;
    for (const [id, s] of this.secrets) if (s.faction === 'crew' && this.state.players.get(id)?.alive) n++;
    return n;
  }

  /** Public alive counter: only at game start and after a vote, so kills stay hidden until the meeting. */
  private syncAlive() {
    this.state.crewAlive = this.aliveCrew();
    this.state.killersAlive = this.aliveKillers();
  }

  private totalKillers() {
    let n = 0;
    for (const s of this.secrets.values()) if (s.faction === 'killer') n++;
    return n;
  }

  /** Returns true if the game ended. */
  private checkWin(): boolean {
    if (this.state.phase === 'ended' || this.state.phase === 'lobby') return false;
    // no syncAlive() here: an arrest must not show on the public counter — it updates after each vote
    if (this.delivery.state === 'delivered') return this.finishGame('crew', this.skin.story.endings.tasks);
    if (this.totalKillers() > 0 && this.aliveKillers() === 0) return this.finishGame('crew', this.skin.story.endings.vote);
    // parity: once killers match the crew, a vote can never eject them (ties eject nobody)
    if (this.aliveKillers() >= this.aliveCrew()) return this.finishGame('killer', this.skin.story.endings.killer);
    return false;
  }

  private finishGame(winner: Faction, reason: string): boolean {
    if (this.state.phase === 'ended') return true;
    const reveal: EndReveal = {
      winner,
      reason,
      fact: pick(this.content.funFacts),
      roles: [...this.state.players.values()].map((p) => {
        const s = this.secrets.get(p.id)!;
        return { name: p.name, color: p.color, role: s.role, faction: s.faction, alive: p.alive, tasksDone: s.done };
      }),
    };
    this.setPhase('ended', 0);
    this.state.nightPausedAt ||= Date.now();
    this.broadcast('end', reveal);
    this.system(`${winner === 'crew' ? this.skin.crewName.vi : this.skin.killerName.vi} thắng! ${reason}`);
    return true;
  }

  private resetToLobby() {
    this.secrets.clear();
    this.syncAlive();
    this.state.progress = 0;
    this.state.meetingReason = '';
    this.state.nightStartAt = 0;
    this.state.nightPausedAt = 0;
    this.delivery.reset({}, [], this.skin.delivery.packageHome);
    this.syncDelivery();
    for (const [id, p] of this.state.players) {
      if (!p.connected) {
        this.state.players.delete(id);
        this.pids.delete(id);
      } else {
        p.ready = false;
        p.voted = false;
        p.voteFor = '';
        p.tasksDone = 0;
        p.emergencyUsed = false;
        p.alive = true;
        p.body = false;
      }
    }
    // a whole game (plus the result screen) without walking must not count as lobby-idle -> the AFK kick would
    // throw everyone out the moment the room is back in the lobby
    const now = Date.now();
    for (const id of this.state.players.keys()) this.lastActive.set(id, now);
    this.teleportToSpawns();
    this.setPhase('lobby', 0);
    this.broadcast('private', null);
    this.chatLog = [];
    this.broadcast('chat:history', []);
  }

  // ---------------------------------------------------------------- arrest / report
  /** A valid press captures the nearest driver immediately. Legacy release messages are ignored. */
  private arrestStart(client: Client) {
    const me = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    if (!me || !s || s.faction !== 'killer' || !me.alive || !me.connected || this.state.phase !== 'explore') return;
    const now = Date.now();
    if (now < s.arrestReadyAt) return client.send('toast', { text: 'Còng tay đang hồi — chờ một chút.', kind: 'info' });
    let target: Player | undefined;
    let best = GAME.arrestRange;
    for (const p of this.state.players.values()) {
      if (p.id === me.id || !p.alive || !p.connected || this.secrets.get(p.id)?.faction === 'killer') continue;
      const d = dist(me, p);
      if (d <= best) {
        best = d;
        target = p;
      }
    }
    if (!target) return client.send('toast', { text: 'Không có ai trong tầm tay.', kind: 'warn' });
    this.doArrest(me.id, target.id);
  }

  private doArrest(actorId: string, targetId: string) {
    const me = this.state.players.get(actorId);
    const target = this.state.players.get(targetId);
    const s = this.secrets.get(actorId);
    if (!me || !target || !s) return;
    const at = { x: target.x, y: target.y };
    const cine = { actor: { name: me.name, color: me.color }, victim: { name: target.name, color: target.color }, at };
    // Only the arrested driver and visible witnesses receive a cinematic.
    this.clients.getById(target.id)?.send('cinematic', { kind: 'kill', ...cine, youAre: 'victim' });
    const seen = new Set<string>([me.id, target.id]);
    for (const w of this.bystanders(me, target)) {
      seen.add(w.id);
      this.clients.getById(w.id)?.send('cinematic', { kind: 'witness', ...cine });
    }
    // out of sight but within earshot: only the siren/handcuff sound, no names
    for (const p of this.state.players.values()) {
      if (seen.has(p.id) || !p.alive || dist(p, at) > GAME.arrestHearRadius) continue;
      this.clients.getById(p.id)?.send('arrest:heard', { at });
    }
    target.alive = false;
    target.body = true;
    target.bodyX = at.x;
    target.bodyY = at.y;
    this.dropPackage(target.id, at);
    s.arrestReadyAt = Date.now() + this.cfg().arrestCd;
    const ts = this.secrets.get(target.id);
    if (ts) ts.pending = undefined;
    this.clients.getById(target.id)?.send('task:close', {});
    this.clients.getById(target.id)?.send('toast', { text: 'Bạn đã bị bắt! Giờ bạn chỉ có thể theo dõi — không làm nhiệm vụ, không bỏ phiếu.', kind: 'warn' });
    this.sendPrivate(me.id);
    this.checkWin();
  }

  private report(client: Client) {
    const me = this.state.players.get(client.sessionId);
    if (!me || !me.alive || this.state.phase !== 'explore') return;
    const body = [...this.state.players.values()].find((p) => p.body && dist(me, { x: p.bodyX, y: p.bodyY }) <= GAME.reportRange);
    if (!body) return client.send('toast', { text: 'Không có xe CRAB bỏ lại nào ở gần.', kind: 'info' });
    this.broadcast('cinematic', { kind: 'report', actor: { name: me.name, color: me.color }, victim: { name: body.name, color: body.color }, at: { x: body.bodyX, y: body.bodyY } });
    this.startMeeting(`${me.name} phát hiện xe CRAB bỏ lại của ${body.name}`);
  }

  // ---------------------------------------------------------------- countdown
  private nightElapsed() {
    const { nightStartAt, nightPausedAt } = this.state;
    return nightStartAt ? (nightPausedAt || Date.now()) - nightStartAt : 0;
  }

  /** Shift the start forward by the paused span so meetings don't eat the clock. */
  private resumeNight() {
    if (!this.state.nightPausedAt) return;
    this.state.nightStartAt += Date.now() - this.state.nightPausedAt;
    this.state.nightPausedAt = 0;
  }

  /** one countdown; when it runs out before the handoff, the undercover wins */
  private tickClock() {
    if (!this.state.nightStartAt || this.state.nightPausedAt) return;
    if (this.nightElapsed() >= this.state.nightMin * 60_000) this.finishGame('killer', this.skin.story.endings.timeout);
  }

  // ---------------------------------------------------------------- package
  private pickPackage(client: Client) {
    const p = this.state.players.get(client.sessionId);
    if (!p || !p.alive || this.state.phase !== 'explore') return;
    const r = this.delivery.pick(p.id, p);
    if (r === 'far') return client.send('toast', { text: 'Bạn cần đứng sát kiện hàng.', kind: 'warn' });
    if (r === 'taken') return client.send('toast', { text: 'Kiện hàng đang ở trong tay người khác.', kind: 'info' });
    if (r === 'ok') this.syncDelivery();
  }

  /** the carrier was arrested / voted out / left: the box falls where they stood */
  private dropPackage(id: string, at: { x: number; y: number }) {
    if (this.delivery.carrier !== id) return;
    this.delivery.onGone(id, at);
    this.syncDelivery();
  }

  /** mirror the delivery engine into public state (no roles, no who-did-what) */
  private syncDelivery() {
    const st = this.state;
    const d = this.delivery;
    const totals = d.stationTotals();
    for (const id of PREP_TASK_IDS) {
      let row = st.stations.get(id);
      if (!row) {
        row = new StationState();
        st.stations.set(id, row);
      }
      row.need = totals.get(id)!.need;
      row.done = totals.get(id)!.done;
    }
    st.progress = d.done;
    st.progressTarget = Math.max(1, d.target);
    st.handoffOpen = d.handoffOpen;
    st.packageState = d.state;
    st.packageCarrier = d.carrier;
    st.packageX = d.x;
    st.packageY = d.y;
  }

  // ---------------------------------------------------------------- veteran
  private inspect(client: Client, targetId: string) {
    const me = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    const target = this.state.players.get(targetId);
    const ts = this.secrets.get(targetId);
    if (!me || !s || s.role !== 'veteran_driver' || !me.alive || !s.inspectLeft) return;
    if (this.state.phase !== 'explore' && this.state.phase !== 'meeting') return;
    if (!target || !ts || target.id === me.id || !target.alive) return client.send('toast', { text: 'Chọn một tài xế khác còn trong đoàn.', kind: 'info' });
    s.inspectLeft = false;
    const entries = recentActivities(ts.log, Date.now(), GAME.inspectEntries).map((e) => {
      const st = this.station(e.taskId);
      return { ...e, title: st?.title ?? e.taskId, area: st ? this.skin.areas[st.area].name : '' };
    });
    client.send('inspect:result', { target: target.name, color: target.color, entries } satisfies InspectResult);
    this.sendPrivate(me.id);
  }

  /** living players (other than the two involved) who can see the target right now */
  private bystanders(actor: Player, target: Player) {
    return [...this.state.players.values()].filter(
      (w) => w.id !== actor.id && w.id !== target.id && w.alive && canSeePoint(grid, w, target, GAME.sightRadius),
    );
  }

  // ---------------------------------------------------------------- tasks
  private near(p: Player, x: number, y: number) {
    return dist(p, { x, y }) <= INTERACT_RADIUS + 24;
  }

  private openTask(client: Client, taskId: TaskId) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    const st = this.station(taskId);
    if (!p || !s || !st || this.state.phase !== 'explore' || !this.canWork(p, s, taskId)) return;
    if (!this.near(p, st.x, st.y)) return client.send('toast', { text: 'Bạn cần đứng gần điểm nhiệm vụ.', kind: 'warn' });
    if (taskId === 'handoff_package') {
      if (!this.delivery.handoffOpen) return client.send('toast', { text: 'Chưa chuẩn bị xong — bàn giao còn khoá.', kind: 'info' });
      if (this.delivery.carrier !== p.id) return client.send('toast', { text: 'Bạn cần cầm kiện hàng tới đây.', kind: 'info' });
    } else if (!this.delivery.canOpen(p.id, taskId)) {
      const mine = this.delivery.tasksOf(p.id).some((j) => j.id === taskId);
      return client.send('toast', { text: mine ? 'Bạn đã xong trạm này rồi.' : 'Trạm này không có trong danh sách của bạn.', kind: 'info' });
    }
    // one worker per station, so players can't move in a pack and cover each other
    if (s.pending?.taskId !== taskId && this.workersAt(taskId, p.id) > 0) {
      return client.send('toast', { text: 'Trạm này đang có người làm — đợi chút hoặc đi trạm khác.', kind: 'info' });
    }
    const built = this.content.buildTask(taskId);
    if (!built) return;
    s.pending = { expected: built.expected, openedAt: Date.now(), reward: built.fact, done: built.done, taskId, minMs: built.minMs };
    client.send('task:data', built.data);
  }

  private submitTask(client: Client, msg: { taskId: TaskId; answer: unknown }) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    if (!p || !s || this.state.phase !== 'explore' || !s.pending || s.pending.taskId !== msg?.taskId || !this.canWork(p, s, msg.taskId)) return;
    const { taskId, reward, done } = s.pending;
    const st = this.station(taskId)!;
    if (!this.near(p, st.x, st.y)) return client.send('toast', { text: 'Bạn đã rời khỏi điểm nhiệm vụ.', kind: 'warn' });
    const now = Date.now();
    const ok = this.content.verifyTask(s.pending, msg.answer);
    if (!ok) {
      s.log.push({ taskId, at: now, status: 'failed' });
      // the client remounts the game for the retry: timed games start their clock again
      s.pending.openedAt = now;
      return client.send('task:result', { ok: false, text: 'Chưa đúng — thử lại nhé.' } satisfies TaskResultMsg);
    }
    s.pending = undefined;

    if (taskId === 'handoff_package') {
      // the cop can never trigger the delivery win
      if (s.faction !== 'crew' || !this.delivery.deliver(p.id)) return client.send('task:close', {});
      s.log.push({ taskId, at: now, status: 'done' });
      s.done++;
      p.tasksDone = s.done;
      client.send('task:result', { ok: true, text: done ?? `Hoàn thành: ${st.title}.`, fact: reward?.text, headline: reward?.headline } satisfies TaskResultMsg);
      this.syncDelivery();
      this.checkWin();
      return;
    }

    // the cop ticks off a fake list: logged like anyone's but never moves the bar
    if (!this.delivery.complete(p.id, taskId)) return client.send('task:close', {});
    s.log.push({ taskId, at: now, status: 'done' });
    s.done++;
    p.tasksDone = s.done;
    client.send('task:result', { ok: true, text: done ?? `Hoàn thành: ${st.title}.`, fact: reward?.text, headline: reward?.headline } satisfies TaskResultMsg);
    this.syncDelivery();
    this.sendPrivate(client.sessionId);
    this.checkWin();
  }

  /**
   * Free players with this station open and still standing at it. Arrested runners are unseen,
   * so they neither hold a slot nor reveal themselves by blocking one.
   */
  private workersAt(taskId: TaskId, except: string) {
    const st = this.station(taskId);
    if (!st) return 0;
    let n = 0;
    for (const [id, s] of this.secrets) {
      const p = this.state.players.get(id);
      if (id !== except && s.pending?.taskId === taskId && p?.alive && p.connected && this.near(p, st.x, st.y)) n++;
    }
    return n;
  }

  private cancelTask(client: Client) {
    const s = this.secrets.get(client.sessionId);
    if (s) s.pending = undefined;
  }

  /**
   * Free players do everything; an arrested driver still has one phone call — the "runner" they send
   * (unseen by free players) may finish their own prep list, but never touch the package or the handoff.
   */
  private canWork(p: Player, s: Secret, taskId: TaskId) {
    return p.alive || (s.faction === 'crew' && p.connected && taskId !== 'handoff_package');
  }

  /** a driver left mid-game: nobody can finish their list, so it goes to the drivers still online */
  private handOverTasks(id: string) {
    if (this.secrets.get(id)?.faction !== 'crew') return;
    const heirs = [...this.state.players.values()].filter((x) => x.connected && x.id !== id && this.secrets.get(x.id)?.faction === 'crew').map((x) => x.id);
    const got = this.delivery.reassign(id, heirs);
    if (!got.length) return;
    this.syncDelivery();
    for (const x of new Set(got)) this.sendPrivate(x);
    this.system(`Phần chuẩn bị còn dở của ${this.state.players.get(id)?.name ?? ''} đã được chia cho anh em còn lại.`);
  }

  // ---------------------------------------------------------------- utils
  private sendPrivate(id: string) {
    const s = this.secrets.get(id);
    const client = this.clients.getById(id);
    if (!s || !client) return;
    const info: PrivateInfo = {
      role: s.role,
      faction: s.faction,
      objective: s.objective,
      tasks: this.delivery.tasksOf(id).map((j) => ({ id: j.id, done: j.done })),
    };
    if (s.faction === 'killer') {
      info.arrestReadyAt = s.arrestReadyAt;
      // cops know each other
      info.killerIds = [...this.secrets].filter(([, x]) => x.faction === 'killer').map(([k]) => k);
    }
    if (s.role === 'veteran_driver') info.inspectLeft = s.inspectLeft;
    client.send('private', info);
  }

  private pushChat(m: ChatMsg) {
    this.chatLog.push(m);
    if (this.chatLog.length > 200) this.chatLog.shift();
    this.broadcast('chat', m);
  }

  private system(text: string) {
    this.pushChat({ from: '', name: 'Hệ thống', color: 0, text, t: Date.now(), system: true });
  }
}
