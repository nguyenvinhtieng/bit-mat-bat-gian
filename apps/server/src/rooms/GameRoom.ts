import { Room, type Client } from '@colyseus/core';
import {
  playableMap,
  GAME,
  INTERACT_RADIUS,
  MAX_PLAYERS,
  MEETING_POINT,
  PATCH_MS,
  PLAYER_COLORS,
  ROLE_INFO,
  SIM_DT,
  SIM_HZ,
  SPAWNS,
  TASK_IDS,
  autoNightMin,
  canhMs as canhMsFor,
  HUE_STATIONS,
  HUE_CANH,
  HUE_ENDINGS,
  dirFromInput,
  dist,
  getGrid,
  hasLineOfSight,
  killersFor,
  stepMovement,
  type ChatMsg,
  type EndReveal,
  type Faction,
  type PrivateInfo,
  type RoleId,
  type TaskId,
  type TaskResultMsg,
  type VoteResult,
} from '@hidden-truth/shared';
import { FUN_FACTS, buildTask, verifyTask, type Pending } from '../content/co-do-hue.content';
import { GameState, Player } from './schema';

type Secret = {
  role: RoleId;
  faction: Faction;
  objective: string;
  tasks: TaskId[];
  completed: Set<TaskId>;
  pending?: Pending;
  vote?: string;
  shield: boolean;
  killReadyAt: number;
};
type MoveState = { queue: { seq: number; dx: number; dy: number }[]; budget: number; lastQueued: number };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const AFK_LOBBY_MS = 3 * 60_000;
const activeCodes = new Set<string>();
const grid = getGrid();

const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export class GameRoom extends Room<GameState> {
  maxClients = MAX_PLAYERS;
  private secrets = new Map<string, Secret>();
  private moves = new Map<string, MoveState>();
  private lastChat = new Map<string, number>();
  private chatLog: ChatMsg[] = [];
  private lastActive = new Map<string, number>();

  onCreate(options: { name?: string; map?: string }) {
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
    this.setMetadata({ map: this.state.mapSlug, creator: options?.name ?? '' });
    this.registerMessages();
  }

  onDispose() {
    activeCodes.delete(this.roomId);
  }

  onJoin(client: Client, options: { name?: string }) {
    if (this.state.phase !== 'lobby') throw new Error('Ván đang diễn ra — không thể vào giữa chừng.');
    const p = new Player();
    p.id = client.sessionId;
    p.name = (options?.name ?? '').toString().replace(/[<>]/g, '').trim().slice(0, 16) || `Khách ${this.state.players.size + 1}`;
    const used = new Set([...this.state.players.values()].map((x) => x.color));
    p.color = PLAYER_COLORS.findIndex((_, i) => !used.has(i));
    const spawn = SPAWNS[this.state.players.size % SPAWNS.length];
    p.x = spawn.x;
    p.y = spawn.y;
    this.state.players.set(client.sessionId, p);
    this.moves.set(client.sessionId, { queue: [], budget: 0, lastQueued: 0 });
    this.lastActive.set(client.sessionId, Date.now());
    if (!this.state.hostId) this.state.hostId = client.sessionId;
    this.refreshNight();
    this.system(`${p.name} đã vào phòng.`);
    client.send('time', Date.now());
    client.send('chat:history', this.chatLog.slice(-40));
  }

  async onLeave(client: Client, consented: boolean) {
    const p = this.state.players.get(client.sessionId);
    if (!p) return;
    if (!consented && this.state.phase !== 'lobby') {
      p.connected = false;
      try {
        const rc = await this.allowReconnection(client, 45);
        p.connected = true;
        rc.send('time', Date.now());
        this.sendPrivate(client.sessionId);
        rc.send('chat:history', this.chatLog.slice(-40));
        return;
      } catch {
        /* fallthrough */
      }
    }
    if (this.state.phase === 'lobby') {
      this.state.players.delete(client.sessionId);
      this.moves.delete(client.sessionId);
      this.refreshNight();
    } else {
      p.connected = false;
      p.alive = false;
      this.syncAlive();
    }
    this.system(`${p.name} đã rời phòng.`);
    if (this.state.hostId === client.sessionId) {
      const next = [...this.state.players.values()].find((x) => x.connected);
      this.state.hostId = next?.id ?? '';
    }
    if (this.state.phase === 'meeting') this.maybeResolveVotes();
    else if (this.state.phase === 'explore') this.checkWin();
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
        const dx = Math.max(-1, Math.min(1, Math.round(Number(raw.dx) || 0)));
        const dy = Math.max(-1, Math.min(1, Math.round(Number(raw.dy) || 0)));
        m.lastQueued = seq;
        m.queue.push({ seq, dx, dy });
      }
      if (m.queue.length > 30) m.queue.splice(0, m.queue.length - 30);
    });

    this.onMessage('ping', (client, t: number) => client.send('pong', t));

    this.onMessage('ready', (client, msg: { ready: boolean }) => {
      this.lastActive.set(client.sessionId, Date.now());
      const p = this.state.players.get(client.sessionId);
      if (p && this.state.phase === 'lobby') p.ready = !!msg?.ready;
    });

    this.onMessage('configure', (client, msg: { killers?: number; tasksPerPlayer?: number; nightMin?: number; nightAuto?: boolean }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      if (Number.isFinite(msg?.tasksPerPlayer)) {
        this.state.tasksPerPlayer = Math.max(1, Math.min(TASK_IDS.length, Math.floor(msg.tasksPerPlayer!)));
      }
      if (Number.isFinite(msg?.killers)) {
        const maxK = Math.max(1, Math.floor(this.state.players.size / 2));
        this.state.killers = Math.max(1, Math.min(maxK, Math.floor(msg.killers!)));
      }
      if (msg?.nightAuto === true) this.state.nightAuto = true;
      else if (Number.isFinite(msg?.nightMin)) {
        this.state.nightAuto = false;
        this.state.nightMin = Math.max(GAME.nightMinMin, Math.min(GAME.nightMinMax, Math.floor(msg.nightMin!)));
      }
      this.refreshNight();
    });

    this.onMessage('start', (client) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      this.startGame();
    });

    this.onMessage('task:open', (client, msg: { taskId: TaskId }) => this.openTask(client, msg?.taskId));
    this.onMessage('task:submit', (client, msg: { taskId: TaskId; answer: unknown }) => this.submitTask(client, msg));
    this.onMessage('kill', (client) => this.kill(client));
    this.onMessage('report', (client) => this.report(client));

    this.onMessage('emergency', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !p.alive || this.state.phase !== 'explore' || p.emergencyUsed) return;
      if (dist(p, MEETING_POINT) > INTERACT_RADIUS + 60) return client.send('toast', { text: 'Hãy đến Án Ban Lịch ở Sân Ngọ Môn để đánh chuông Ngũ Phụng.', kind: 'warn' });
      p.emergencyUsed = true;
      this.broadcast('cinematic', { kind: 'emergency', actor: { name: p.name, color: p.color } });
      this.startMeeting(`${p.name} đánh chuông Ngũ Phụng gọi họp khẩn`);
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
      this.maybeResolveVotes();
    });

    this.onMessage('host:skip', (client) => {
      if (client.sessionId !== this.state.hostId) return;
      if (this.state.phase === 'meeting' || this.state.phase === 'reveal') this.advancePhase();
    });

    this.onMessage('host:restart', (client) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'ended') return;
      this.resetToLobby();
    });

    this.onMessage('host:kick', (client, msg: { target: string }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      const target = String(msg?.target ?? '');
      if (!target || target === client.sessionId) return;
      const victim = this.clients.find((c) => c.sessionId === target);
      if (!victim) return;
      const name = this.state.players.get(target)?.name ?? '';
      victim.send('toast', { text: 'Bạn đã bị chủ phòng mời ra khỏi phòng.', kind: 'warn' });
      this.lastActive.delete(target);
      victim.leave(4001);
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
        client.send('toast', { text: 'Bạn bị mời ra khỏi phòng vì không hoạt động.', kind: 'warn' });
        this.lastActive.delete(client.sessionId);
        client.leave(4001);
      }
    }
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
          const next = stepMovement(grid, p, inp, SIM_DT);
          if (next.x !== p.x || next.y !== p.y) moved = true;
          p.x = next.x;
          p.y = next.y;
          p.dir = dirFromInput(inp, p.dir);
        }
        p.lastSeq = inp.seq;
      }
      p.moving = moved;
    }
    if (this.state.phaseEndsAt && Date.now() >= this.state.phaseEndsAt) this.advancePhase();
    if (this.state.phase === 'explore') this.tickNight();
  }

  // ---------------------------------------------------------------- phases
  private cfg() {
    return {
      tasksPerPlayer: this.state.tasksPerPlayer,
      meetingMs: GAME.meetingSec * 1000,
      killCd: GAME.killCooldownSec * 1000,
      firstCd: GAME.firstKillCooldownSec * 1000,
      postMeetingCd: GAME.postMeetingCooldownSec * 1000,
    };
  }

  private startGame() {
    const players = [...this.state.players.values()];
    const n = players.length;
    const c = this.cfg();
    const killers = this.plannedKillers(n);
    const crew = n - killers;
    const roles: RoleId[] = [];
    for (let i = 0; i < killers; i++) roles.push('killer');
    if (crew >= 3) roles.push('guardian');
    while (roles.length < n) roles.push('villager');
    const assigned = shuffle(roles);
    const tpp = Math.min(c.tasksPerPlayer, TASK_IDS.length);

    this.secrets.clear();
    const now = Date.now();
    // the night (and the first kill cooldown) only starts once the role reveal is over
    const dusk = now + GAME.introSec * 1000;
    players.forEach((p, i) => {
      const role = assigned[i];
      const faction = ROLE_INFO[role].faction;
      this.secrets.set(p.id, {
        role,
        faction,
        objective:
          faction === 'killer'
            ? 'Hạ gục người trong đoàn cho tới khi số Âm Binh bằng hoặc nhiều hơn số người còn sống. Đừng để bị phát hiện và bị bỏ phiếu loại.'
            : 'Hoàn thành mọi nhiệm vụ trước canh năm để Lễ Ban Sóc diễn ra lúc bình minh — hoặc tìm ra Âm Binh trong cuộc họp và bỏ phiếu loại họ.',
        tasks: shuffle(TASK_IDS).slice(0, tpp),
        completed: new Set(),
        shield: role === 'guardian',
        killReadyAt: dusk + c.firstCd,
      });
      p.tasksDone = 0;
      p.voted = false;
      p.emergencyUsed = false;
      p.alive = true;
      p.body = false;
    });
    this.state.progress = 0;
    this.state.progressTarget = Math.max(1, n * tpp);
    this.canh = 0;
    this.state.nightStartAt = dusk;
    this.state.nightPausedAt = 0;
    this.state.meetingReason = '';
    this.teleportToSpawns();
    this.setPhase('explore', 0);
    this.syncAlive();
    for (const p of players) this.sendPrivate(p.id);
    this.broadcast('intro', {});
    this.system(`Ván bắt đầu — ${killers} Âm Binh đang trà trộn trong đoàn. Làm nhiệm vụ, giữ khoảng cách và quan sát!`);
    if (n < 4) this.system(`Lưu ý: game thiết kế cho 4–10 người; với ${n} người có ${killers} Âm Binh.`);
  }

  private setPhase(phase: GameState['phase'], durationMs: number) {
    this.state.phase = phase;
    this.state.phaseEndsAt = durationMs > 0 ? Date.now() + durationMs : 0;
  }

  private advancePhase() {
    const ph = this.state.phase;
    if (ph === 'meeting') {
      this.resolveVotes();
    } else if (ph === 'reveal') {
      if (this.checkWin()) return;
      const now = Date.now();
      for (const s of this.secrets.values()) if (s.faction === 'killer') s.killReadyAt = now + this.cfg().postMeetingCd;
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
      result.ejected = p.name;
      result.ejectedColor = p.color;
      result.wasKiller = this.secrets.get(ejectedId)?.faction === 'killer';
    }
    result.killersLeft = this.aliveKillers();
    this.syncAlive();
    this.broadcast('vote:result', result);
    this.system(
      result.ejected
        ? `${result.ejected} bị loại khỏi đoàn.`
        : tie
          ? 'Hoà phiếu — không ai bị loại.'
          : 'Không ai bị loại.',
    );
    for (const p of this.state.players.values()) p.voted = false;
    this.setPhase('reveal', GAME.revealSec * 1000);
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
    // only the crew's tasks count (killers fake theirs); ghosts keep working, so their tasks stay in the target
    let done = 0;
    let target = 0;
    for (const s of this.secrets.values()) {
      if (s.faction !== 'crew') continue;
      done += s.completed.size;
      target += s.tasks.length;
    }
    this.state.progress = done;
    this.state.progressTarget = Math.max(1, target);
    this.syncAlive();
    const total = this.totalKillers();
    const k = this.aliveKillers();
    const c = this.aliveCrew();
    if (total > 0 && k === 0) return this.finishGame('crew', HUE_ENDINGS.vote);
    if (total > 0 && k >= c) return this.finishGame('killer', HUE_ENDINGS.killer);
    if (this.state.progress >= this.state.progressTarget) return this.finishGame('crew', HUE_ENDINGS.tasks);
    return false;
  }

  private finishGame(winner: Faction, reason: string): boolean {
    if (this.state.phase === 'ended') return true;
    const reveal: EndReveal = {
      winner,
      reason,
      fact: pick(FUN_FACTS),
      roles: [...this.state.players.values()].map((p) => {
        const s = this.secrets.get(p.id)!;
        return { name: p.name, color: p.color, role: s.role, faction: s.faction, alive: p.alive, tasksDone: s.completed.size };
      }),
    };
    this.setPhase('ended', 0);
    this.state.nightPausedAt ||= Date.now();
    this.broadcast('end', reveal);
    this.system(winner === 'crew' ? `Phe Người Dân thắng! ${reason}` : `Âm Binh thắng! ${reason}`);
    return true;
  }

  private resetToLobby() {
    this.secrets.clear();
    this.syncAlive();
    this.state.progress = 0;
    this.state.meetingReason = '';
    this.state.nightStartAt = 0;
    this.state.nightPausedAt = 0;
    for (const [id, p] of this.state.players) {
      if (!p.connected) this.state.players.delete(id);
      else {
        p.ready = false;
        p.voted = false;
        p.tasksDone = 0;
        p.emergencyUsed = false;
        p.alive = true;
        p.body = false;
      }
    }
    this.teleportToSpawns();
    this.setPhase('lobby', 0);
    this.broadcast('private', null);
    this.chatLog = [];
    this.broadcast('chat:history', []);
  }

  // ---------------------------------------------------------------- kill / report
  private kill(client: Client) {
    const me = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    if (!me || !s || s.faction !== 'killer' || !me.alive || this.state.phase !== 'explore') return;
    const now = Date.now();
    if (now < s.killReadyAt) return client.send('toast', { text: 'Kỹ năng đang hồi — chờ một chút.', kind: 'info' });
    let target: Player | undefined;
    let best = GAME.killRange;
    for (const p of this.state.players.values()) {
      if (p.id === me.id || !p.alive || this.secrets.get(p.id)?.faction === 'killer') continue;
      const d = dist(me, p);
      if (d <= best) {
        best = d;
        target = p;
      }
    }
    if (!target) return client.send('toast', { text: 'Không có ai trong tầm tay.', kind: 'warn' });
    const ts = this.secrets.get(target.id)!;
    s.killReadyAt = now + this.cfg().killCd;
    if (ts.shield) {
      ts.shield = false;
      const sh = { kind: 'shield', actor: { name: me.name, color: me.color }, victim: { name: target.name, color: target.color }, at: { x: target.x, y: target.y } };
      client.send('cinematic', { ...sh, youAre: 'actor' });
      this.clients.getById(target.id)?.send('cinematic', { ...sh, youAre: 'victim' });
      client.send('toast', { text: 'Đòn đánh bị chặn bởi lá chắn của Lính Ngự Lâm!', kind: 'warn' });
      this.clients.getById(target.id)?.send('toast', { text: '🛡️ Lá chắn của bạn đã cứu bạn khỏi một đòn hạ gục!', kind: 'success' });
      this.sendPrivate(target.id);
      this.sendPrivate(me.id);
      return;
    }
    const at = { x: target.x, y: target.y };
    this.clients.getById(me.id)?.send('cinematic', { kind: 'kill', actor: { name: me.name, color: me.color }, victim: { name: target.name, color: target.color }, youAre: 'actor', at });
    this.clients.getById(target.id)?.send('cinematic', { kind: 'kill', actor: { name: me.name, color: me.color }, victim: { name: target.name, color: target.color }, youAre: 'victim', at });
    for (const w of this.state.players.values()) {
      if (w.id === me.id || w.id === target.id || !w.alive) continue;
      if (dist(w, target) > GAME.visionRadius || !hasLineOfSight(grid, { x: w.x, y: w.y - 30 }, { x: target.x, y: target.y - 30 })) continue;
      this.clients.getById(w.id)?.send('cinematic', { kind: 'witness', actor: { name: me.name, color: me.color }, victim: { name: target.name, color: target.color }, at });
    }
    target.alive = false;
    target.body = true;
    target.bodyX = target.x;
    target.bodyY = target.y;
    this.clients.getById(target.id)?.send('toast', { text: 'Bạn đã bị hạ gục! Bạn vẫn có thể làm nhiệm vụ như một hồn ma.', kind: 'warn' });
    this.sendPrivate(me.id);
    this.checkWin();
  }

  private report(client: Client) {
    const me = this.state.players.get(client.sessionId);
    if (!me || !me.alive || this.state.phase !== 'explore') return;
    const body = [...this.state.players.values()].find((p) => p.body && dist(me, { x: p.bodyX, y: p.bodyY }) <= GAME.reportRange);
    if (!body) return client.send('toast', { text: 'Không có thi thể nào ở gần.', kind: 'info' });
    this.broadcast('cinematic', { kind: 'report', actor: { name: me.name, color: me.color }, victim: { name: body.name, color: body.color }, at: { x: body.bodyX, y: body.bodyY } });
    this.startMeeting(`${me.name} phát hiện thi thể của ${body.name}`);
  }

  // ---------------------------------------------------------------- night watch (5 canh)
  private canh = 0;

  private nightElapsed() {
    const { nightStartAt, nightPausedAt } = this.state;
    return nightStartAt ? (nightPausedAt || Date.now()) - nightStartAt : 0;
  }

  /** Shift the start forward by the paused span so meetings don't eat the night. */
  private resumeNight() {
    if (!this.state.nightPausedAt) return;
    this.state.nightStartAt += Date.now() - this.state.nightPausedAt;
    this.state.nightPausedAt = 0;
  }

  /** killers the next game will get (manual count clamped to ½ room, else auto) */
  private plannedKillers(n = this.state.players.size) {
    const maxK = Math.max(1, Math.floor(n / 2));
    return Math.min(this.state.killers > 0 ? Math.min(this.state.killers, maxK) : killersFor(n), n);
  }

  /** auto night length follows the lobby (players, killers, tasks) until the host sets it by hand */
  private refreshNight() {
    if (!this.state.nightAuto) return;
    const n = this.state.players.size;
    this.state.nightMin = autoNightMin(n, this.plannedKillers(n), Math.min(this.state.tasksPerPlayer, TASK_IDS.length));
  }

  /** The clock runs on time: the drum strikes each new canh; when canh năm runs out the Shadows win. */
  private tickNight() {
    if (!this.state.nightStartAt || this.state.nightPausedAt) return;
    const canhMs = canhMsFor(this.state.nightMin);
    const elapsed = this.nightElapsed();
    if (elapsed < 0) return; // role reveal still showing
    if (elapsed >= canhMs * GAME.canhCount) {
      this.broadcast('canh', { canh: GAME.canhCount + 1, text: HUE_ENDINGS.timeout });
      this.finishGame('killer', HUE_ENDINGS.timeout);
      return;
    }
    const c = Math.min(GAME.canhCount, Math.floor(elapsed / canhMs) + 1);
    while (this.canh < c) {
      this.canh++;
      const text = HUE_CANH[this.canh - 1];
      this.broadcast('canh', { canh: this.canh, text });
      this.system(text);
    }
  }

  // ---------------------------------------------------------------- tasks
  private near(p: Player, x: number, y: number) {
    return dist(p, { x, y }) <= INTERACT_RADIUS + 24;
  }

  private openTask(client: Client, taskId: TaskId) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    const st = HUE_STATIONS.find((x) => x.id === taskId);
    // ghosts of the crew keep working: their tasks still count toward dawn
    if (!p || !s || !st || this.state.phase !== 'explore' || (!p.alive && s.faction !== 'crew')) return;
    if (!s.tasks.includes(taskId)) return client.send('toast', { text: 'Đây không phải nhiệm vụ của bạn.', kind: 'info' });
    if (!this.near(p, st.x, st.y)) return client.send('toast', { text: 'Bạn cần đứng gần điểm nhiệm vụ.', kind: 'warn' });
    if (s.completed.has(taskId)) return client.send('toast', { text: 'Bạn đã hoàn thành nhiệm vụ này.', kind: 'info' });
    const built = buildTask(taskId);
    s.pending = { expected: built.expected, openedAt: Date.now(), reward: built.fact, done: built.done, taskId, minMs: built.minMs };
    client.send('task:data', built.data);
  }

  private submitTask(client: Client, msg: { taskId: TaskId; answer: unknown }) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    if (!p || !s || (!p.alive && s.faction !== 'crew') || this.state.phase !== 'explore' || !s.pending || s.pending.taskId !== msg?.taskId) return;
    const { taskId, reward, done } = s.pending;
    const st = HUE_STATIONS.find((x) => x.id === taskId)!;
    if (!this.near(p, st.x, st.y)) return client.send('toast', { text: 'Bạn đã rời khỏi điểm nhiệm vụ.', kind: 'warn' });
    const ok = verifyTask(s.pending, msg.answer);
    if (!ok) return client.send('task:result', { ok: false, text: 'Chưa đúng — thử lại nhé.' } satisfies TaskResultMsg);

    s.pending = undefined;
    s.completed.add(taskId);
    p.tasksDone = s.completed.size;
    // only the crew advances the shared bar (checkWin recounts it)
    client.send('task:result', { ok: true, text: done ?? `Hoàn thành: ${st.title}.`, fact: reward?.text, headline: reward?.headline } satisfies TaskResultMsg);
    this.sendPrivate(client.sessionId);
    this.checkWin();
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
      tasks: s.tasks,
      completedTasks: [...s.completed],
    };
    if (s.faction === 'killer') {
      info.killReadyAt = s.killReadyAt;
      info.mates = [...this.secrets.entries()]
        .filter(([pid, x]) => pid !== id && x.faction === 'killer')
        .map(([pid]) => this.state.players.get(pid)?.name ?? '?');
    }
    if (s.role === 'guardian') info.shield = s.shield;
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
