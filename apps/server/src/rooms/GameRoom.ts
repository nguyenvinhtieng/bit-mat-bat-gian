import { Room, type Client } from '@colyseus/core';
import {
  AREA_ORDER,
  HUE_AREAS,
  HUE_ROLE_STATIONS,
  HUE_STATIONS,
  INTERACT_RADIUS,
  MAX_PLAYERS,
  MEETING_POINT,
  PATCH_MS,
  PLAYER_COLORS,
  ROLE_INFO,
  SIM_DT,
  SIM_HZ,
  SPAWNS,
  TIMINGS,
  dirFromInput,
  dist,
  getGrid,
  stepMovement,
  type AbilityData,
  type ChatMsg,
  type Clue,
  type ConclusionVote,
  type EndReveal,
  type Faction,
  type PrivateInfo,
  type RoleId,
  type TaskData,
  type TaskId,
} from '@hidden-truth/shared';
import { FORGER_OPTIONS, LEARNED, NPC_NAMES, VARIANTS, type VariantId } from '../content/co-do-hue.content';
import { GameState, Player, SharedClue } from './schema';

type PendingTask = { taskId: TaskId; expected: unknown; openedAt: number };
type Secret = {
  role: RoleId;
  faction: Faction;
  objective: string;
  abilityUsedRound: number;
  notebook: Clue[];
  completedTasks: Set<TaskId>;
  pending?: PendingTask;
  vote?: ConclusionVote;
  extra: string[];
};
type MoveState = { queue: { seq: number; dx: number; dy: number }[]; budget: number; lastQueued: number };

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const activeCodes = new Set<string>();
const grid = getGrid();

const shuffle = <T>(arr: T[]): T[] => {
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
  private variant: VariantId = 'HUE-A';
  private forgerEdits = new Map<TaskId, (typeof FORGER_OPTIONS)[number]>();
  private brokerHeld = false;
  private lastChat = new Map<string, number>();
  private chatLog: ChatMsg[] = [];

  onCreate(options: { name?: string }) {
    this.setState(new GameState());
    let code = '';
    do code = Array.from({ length: 6 }, () => pick(CODE_ALPHABET.split(''))).join('');
    while (activeCodes.has(code));
    activeCodes.add(code);
    this.roomId = code;
    this.state.code = code;
    this.state.maxRounds = TIMINGS.rounds;
    this.setPatchRate(PATCH_MS);
    this.setSimulationInterval((dt) => this.update(dt), 1000 / SIM_HZ);
    this.setMetadata({ map: 'co-do-hue', creator: options?.name ?? '' });
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
    if (!this.state.hostId) this.state.hostId = client.sessionId;
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
    } else p.connected = false;
    this.system(`${p.name} đã rời phòng.`);
    if (this.state.hostId === client.sessionId) {
      const next = [...this.state.players.values()].find((x) => x.connected);
      this.state.hostId = next?.id ?? '';
    }
    if (this.state.phase === 'conclusion') this.maybeFinishConclusion();
  }

  // ---------------------------------------------------------------- messages
  private registerMessages() {
    this.onMessage('input', (client, list: unknown) => {
      const m = this.moves.get(client.sessionId);
      if (!m || !Array.isArray(list)) return;
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

    this.onMessage('ready', (client, msg: { ready: boolean }) => {
      const p = this.state.players.get(client.sessionId);
      if (p && this.state.phase === 'lobby') p.ready = !!msg?.ready;
    });

    this.onMessage('configure', (client, msg: { variant?: string; quick?: boolean }) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      if (['random', 'HUE-A', 'HUE-B', 'HUE-C'].includes(msg?.variant ?? '')) this.state.variantChoice = msg.variant!;
      if (typeof msg?.quick === 'boolean') this.state.quick = msg.quick;
    });

    this.onMessage('start', (client) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'lobby') return;
      this.startGame();
    });

    this.onMessage('task:open', (client, msg: { taskId: TaskId }) => this.openTask(client, msg?.taskId));
    this.onMessage('task:submit', (client, msg: { taskId: TaskId; answer: unknown }) => this.submitTask(client, msg));
    this.onMessage('ability:open', (client) => this.openAbility(client));
    this.onMessage('ability:use', (client, msg: { option?: string }) => this.useAbility(client, msg?.option));

    this.onMessage('emergency', (client) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || this.state.phase !== 'explore' || p.emergencyUsed) return;
      if (dist(p, MEETING_POINT) > INTERACT_RADIUS + 60) return client.send('toast', { text: 'Hãy đến bàn họp ở Sân hiên để gọi họp.', kind: 'warn' });
      p.emergencyUsed = true;
      this.startMeeting(`${p.name} rung chuông gọi họp khẩn`);
    });

    this.onMessage('chat', (client, msg: { text: string }) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      if (this.state.phase === 'explore') return client.send('toast', { text: 'Chỉ trò chuyện được khi họp.', kind: 'warn' });
      const now = Date.now();
      if (now - (this.lastChat.get(client.sessionId) ?? 0) < 400) return;
      this.lastChat.set(client.sessionId, now);
      const text = String(msg?.text ?? '').trim().slice(0, 240);
      if (!text) return;
      this.pushChat({ from: p.id, name: p.name, color: p.color, text, t: now });
    });

    this.onMessage('clue:share', (client, msg: { clueId: string }) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.secrets.get(client.sessionId);
      if (!p || !s || !['meeting', 'conclusion'].includes(this.state.phase)) return;
      const clue = s.notebook.find((c) => c.id === msg?.clueId);
      if (!clue) return;
      if (this.state.board.some((b) => b.id === clue.id)) return client.send('toast', { text: 'Manh mối này đã có trên bảng.', kind: 'info' });
      const sc = new SharedClue();
      sc.id = clue.id;
      sc.title = clue.title;
      sc.body = clue.body;
      sc.source = clue.source;
      sc.art = clue.art ?? '';
      sc.trace = clue.trace ?? '';
      sc.diff = clue.diff ? JSON.stringify(clue.diff) : '';
      sc.by = p.name;
      this.state.board.push(sc);
      this.system(`${p.name} đã đưa manh mối “${clue.title}” lên bảng.`);
    });

    this.onMessage('conclude', (client, vote: ConclusionVote) => {
      const p = this.state.players.get(client.sessionId);
      const s = this.secrets.get(client.sessionId);
      if (!p || !s || this.state.phase !== 'conclusion') return;
      s.vote = {
        sentence: Number(vote?.sentence) || 0,
        type: vote?.type,
        responsible: String(vote?.responsible ?? ''),
        when: String(vote?.when ?? ''),
      };
      p.voted = true;
      this.maybeFinishConclusion();
    });

    this.onMessage('host:skip', (client) => {
      if (client.sessionId !== this.state.hostId) return;
      if (['explore', 'meeting', 'conclusion'].includes(this.state.phase)) this.advancePhase();
    });

    this.onMessage('host:restart', (client) => {
      if (client.sessionId !== this.state.hostId || this.state.phase !== 'ended') return;
      this.resetToLobby();
    });
  }

  // ---------------------------------------------------------------- simulation
  private update(dtMs: number) {
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
  }

  // ---------------------------------------------------------------- phases
  private timing() {
    const q = this.state.quick;
    return {
      explore: (q ? 90 : TIMINGS.exploreSec) * 1000,
      meeting: (q ? 45 : TIMINGS.meetingSec) * 1000,
      finalMeeting: (q ? 60 : TIMINGS.finalMeetingSec) * 1000,
      conclusion: (q ? 60 : TIMINGS.conclusionSec) * 1000,
    };
  }

  private startGame() {
    const players = [...this.state.players.values()];
    const n = players.length;
    this.variant = this.state.variantChoice === 'random' ? pick(['HUE-A', 'HUE-B', 'HUE-C'] as const) : (this.state.variantChoice as VariantId);
    const v = VARIANTS[this.variant];
    const secretCount = n >= 6 ? 2 : n >= 3 ? 1 : 0;
    const secretRoles = shuffle<RoleId>(['forger', 'broker']).slice(0, secretCount);
    const invRoles = shuffle<RoleId>(['historian', 'conservator', 'local_guide', 'archivist']);
    const roles: RoleId[] = [...secretRoles];
    for (let i = 0; roles.length < n; i++) roles.push(invRoles[i % invRoles.length]);
    const assigned = shuffle(roles);

    this.secrets.clear();
    this.forgerEdits.clear();
    this.brokerHeld = false;
    this.state.board.clear();
    players.forEach((p, i) => {
      const role = assigned[i];
      const faction = ROLE_INFO[role].faction;
      this.secrets.set(p.id, {
        role,
        faction,
        objective: faction === 'secret' ? v.objectives[role as 'forger' | 'broker'] : v.objectives.investigation,
        abilityUsedRound: 0,
        notebook: [],
        completedTasks: new Set(),
        extra: role === 'broker' ? [v.brokerSecret] : [],
      });
      p.tasksDone = 0;
      p.voted = false;
      p.emergencyUsed = false;
      p.ready = false;
    });
    this.state.progress = 0;
    this.state.progressTarget = Math.max(4, Math.ceil(n * 6 * 0.6));
    this.state.round = 1;
    this.state.finalMeeting = false;
    this.state.event = '';
    this.teleportToSpawns();
    this.setPhase('explore', this.timing().explore);
    for (const p of players) this.sendPrivate(p.id);
    this.broadcast('intro', { variantHidden: true });
    this.system(`Ván bắt đầu — vòng 1/${this.state.maxRounds}. Làm nhiệm vụ để tăng tiến độ triển lãm, thu thập manh mối.`);
    if (n < 4) this.system(`Lưu ý: game thiết kế cho 4–10 người; với ${n} người, phe Bí Mật ${secretCount ? 'có ' + secretCount + ' người' : 'không có'}.`);
  }

  private setPhase(phase: GameState['phase'], durationMs: number) {
    this.state.phase = phase;
    this.state.phaseEndsAt = durationMs > 0 ? Date.now() + durationMs : 0;
  }

  private advancePhase() {
    const ph = this.state.phase;
    if (ph === 'explore') {
      this.startMeeting(this.state.round >= this.state.maxRounds ? 'Hết giờ — họp kết luận trước giờ mở cửa' : `Hết vòng ${this.state.round} — họp tổng hợp`);
    } else if (ph === 'meeting') {
      if (this.state.finalMeeting) {
        this.setPhase('conclusion', this.timing().conclusion);
        for (const p of this.state.players.values()) p.voted = false;
        this.system('Bỏ phiếu kết luận: chọn câu lệch, loại sai lệch, người chịu trách nhiệm chính và thời điểm.');
      } else {
        this.state.round += 1;
        this.state.meetingReason = '';
        this.setPhase('explore', this.timing().explore);
        this.system(`Vòng ${this.state.round}/${this.state.maxRounds} — năng lực role đã được làm mới.`);
        for (const id of this.secrets.keys()) this.sendPrivate(id);
      }
    } else if (ph === 'conclusion') {
      this.finishGame();
    }
  }

  private startMeeting(reason: string) {
    const final = this.state.round >= this.state.maxRounds || this.state.progress >= this.state.progressTarget || this.state.finalMeeting;
    this.state.finalMeeting = final;
    this.state.meetingReason = reason;
    this.teleportToSpawns();
    for (const s of this.secrets.values()) s.pending = undefined;
    this.broadcast('task:close', {});
    this.setPhase('meeting', final ? this.timing().finalMeeting : this.timing().meeting);
    this.system(`Họp: ${reason}.${final ? ' Đây là cuộc họp cuối — sau đó nhóm bỏ phiếu kết luận.' : ''}`);
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

  private maybeFinishConclusion() {
    const active = [...this.state.players.values()].filter((p) => p.connected);
    if (active.length && active.every((p) => p.voted)) this.finishGame();
  }

  private finishGame() {
    if (this.state.phase === 'ended') return;
    const v = VARIANTS[this.variant];
    const votes = [...this.secrets.values()].map((s) => s.vote).filter(Boolean) as ConclusionVote[];
    const plural = <K extends keyof ConclusionVote>(k: K): ConclusionVote[K] | null => {
      const counts = new Map<string, number>();
      for (const vt of votes) counts.set(String(vt[k]), (counts.get(String(vt[k])) ?? 0) + 1);
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      if (!sorted.length || (sorted[1] && sorted[1][1] === sorted[0][1])) return null;
      const raw = sorted[0][0];
      return (k === 'sentence' ? Number(raw) : raw) as ConclusionVote[K];
    };
    const team = votes.length
      ? { sentence: plural('sentence') ?? 0, type: plural('type') ?? ('' as never), responsible: plural('responsible') ?? '', when: plural('when') ?? '' }
      : null;
    const correct = {
      sentence: team?.sentence === v.truth.sentence,
      type: team?.type === v.truth.type,
      responsible: team?.responsible === v.truth.responsible,
      when: team?.when === v.truth.when,
      evidence: this.state.board.length >= 3,
    };
    const invWin = correct.sentence && correct.type && correct.responsible && correct.when && correct.evidence;
    const goalMet = (goal: Partial<{ type: string; responsible: string }>) => {
      if (!team) return true;
      if (goal.type) return team.type === goal.type;
      if (goal.responsible?.startsWith('!')) return team.responsible !== goal.responsible.slice(1);
      return false;
    };
    const reveal: EndReveal = {
      winner: invWin ? 'investigation' : 'secret',
      variantId: v.id,
      truthSummary: v.summary,
      truthSteps: v.steps,
      correct,
      teamConclusion: team,
      sharedClueCount: this.state.board.length,
      roles: [...this.state.players.values()].map((p) => {
        const s = this.secrets.get(p.id)!;
        return {
          name: p.name,
          role: s.role,
          faction: s.faction,
          objective: s.objective,
          objectiveMet: s.faction === 'secret' ? goalMet(v.secretGoal[s.role as 'forger' | 'broker']) : invWin,
        };
      }),
      metaQuestion: v.metaQuestion,
      learned: LEARNED,
    };
    this.setPhase('ended', 0);
    this.broadcast('end', reveal);
    this.system(invWin ? 'Phe Điều Tra đã tái dựng đúng sự việc!' : 'Kết luận chưa khớp bằng chứng — phe Bí Mật thắng ván này.');
  }

  private resetToLobby() {
    this.secrets.clear();
    this.state.board.clear();
    this.state.round = 0;
    this.state.progress = 0;
    this.state.event = '';
    this.state.meetingReason = '';
    this.state.finalMeeting = false;
    for (const [id, p] of this.state.players) {
      if (!p.connected) this.state.players.delete(id);
      else {
        p.ready = false;
        p.voted = false;
        p.tasksDone = 0;
        p.emergencyUsed = false;
      }
    }
    this.teleportToSpawns();
    this.setPhase('lobby', 0);
    this.broadcast('private', null);
  }

  // ---------------------------------------------------------------- tasks
  private near(p: Player, x: number, y: number) {
    return dist(p, { x, y }) <= INTERACT_RADIUS + 24;
  }

  private openTask(client: Client, taskId: TaskId) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    const st = HUE_STATIONS.find((x) => x.id === taskId);
    if (!p || !s || !st || this.state.phase !== 'explore') return;
    if (!this.near(p, st.x, st.y)) return client.send('toast', { text: 'Bạn cần đứng gần điểm nhiệm vụ.', kind: 'warn' });
    if (s.completedTasks.has(taskId)) return client.send('toast', { text: 'Bạn đã hoàn thành nhiệm vụ này.', kind: 'info' });

    let data: TaskData;
    let expected: unknown;
    switch (taskId) {
      case 'task_print_checklist': {
        const labels = ['Font tiêu đề', 'Logo đối tác', 'Đoạn giới thiệu VI', 'Đoạn giới thiệu EN', 'Chú thích nguồn', 'Ảnh kiến trúc'];
        let items = labels.map((label, i) => ({ id: `i${i}`, label, log: (Math.random() < 0.6 ? 'ok' : 'error') as 'ok' | 'error' }));
        if (items.every((i) => i.log === 'ok')) items[3].log = 'error';
        if (items.every((i) => i.log === 'error')) items[0].log = 'ok';
        items = shuffle(items);
        data = { taskId, items };
        expected = items.filter((i) => i.log === 'ok').map((i) => i.id).sort();
        break;
      }
      case 'task_scan_footnote':
        data = { taskId, holdMs: 1800 };
        expected = 1800;
        break;
      case 'task_update_floor_plan': {
        const rooms = AREA_ORDER.filter((a) => a !== 'corridor').map((a) => HUE_AREAS[a].name);
        const sequence = shuffle(rooms).slice(0, 4);
        data = { taskId, rooms: shuffle(rooms), sequence };
        expected = sequence;
        break;
      }
      case 'task_check_lights_labels': {
        const lights = shuffle(['Đèn spot trái', 'Đèn spot phải', 'Đèn bảng chính', 'Đèn nhãn phụ']);
        data = { taskId, lights };
        expected = [...lights];
        break;
      }
      case 'task_seal_box': {
        const sealNumber = `${String(Math.floor(1000 + Math.random() * 9000))}-HUE`;
        data = { taskId, sealNumber, slipNote: 'Đối chiếu số niêm trên phiếu bàn giao, nhập đúng số để niêm phong lại.' };
        expected = sealNumber;
        break;
      }
      case 'task_return_shelf_a': {
        const slots = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
        const target = pick(slots);
        data = { taskId, bookCode: `HUE-04 / ${target}`, slots };
        expected = target;
        break;
      }
      default:
        return;
    }
    s.pending = { taskId, expected, openedAt: Date.now() };
    client.send('task:data', data);
  }

  private submitTask(client: Client, msg: { taskId: TaskId; answer: unknown }) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    if (!p || !s || this.state.phase !== 'explore' || !s.pending || s.pending.taskId !== msg?.taskId) return;
    const { taskId, expected, openedAt } = s.pending;
    const st = HUE_STATIONS.find((x) => x.id === taskId)!;
    if (!this.near(p, st.x, st.y)) return client.send('toast', { text: 'Bạn đã rời khỏi điểm nhiệm vụ.', kind: 'warn' });
    let ok = false;
    const a = msg.answer;
    switch (taskId) {
      case 'task_print_checklist':
        ok = Array.isArray(a) && JSON.stringify([...a].map(String).sort()) === JSON.stringify(expected);
        break;
      case 'task_scan_footnote':
        ok = Date.now() - openedAt >= (expected as number) - 250;
        break;
      case 'task_update_floor_plan':
      case 'task_check_lights_labels':
        ok = JSON.stringify(a) === JSON.stringify(expected);
        break;
      case 'task_seal_box':
        ok = String(a ?? '').trim().toUpperCase() === expected;
        break;
      case 'task_return_shelf_a':
        ok = a === expected;
        break;
    }
    if (!ok) return client.send('task:result', { ok: false, text: 'Chưa đúng — thử lại.' });

    s.pending = undefined;
    s.completedTasks.add(taskId);
    p.tasksDone = s.completedTasks.size;
    this.state.progress += 1;
    const clues = [this.clueForTask(taskId)];
    if (taskId === 'task_seal_box') {
      const meta = VARIANTS[this.variant].meta;
      clues.push({ ...meta, source: 'Hộp tư liệu cũ (Kho hiện vật)', art: 'hue-clue-handnote' });
    }
    for (const c of clues) this.addClue(s, c);
    client.send('task:result', { ok: true, text: `Hoàn thành: ${st.title}. Tiến độ triển lãm +1.`, clues });
    this.sendPrivate(client.sessionId);

    if (this.state.progress >= this.state.progressTarget && !this.state.event) {
      this.state.event = 'opening_soon';
      this.broadcast('toast', { text: '⏰ 30 phút trước khai mạc! Giám tuyển triệu tập họp kết luận.', kind: 'warn' });
      this.state.finalMeeting = true;
      this.clock.setTimeout(() => {
        if (this.state.phase === 'explore') this.startMeeting('30 phút trước khai mạc — tiến độ triển lãm đã đủ');
      }, 2500);
    }
  }

  private clueForTask(taskId: TaskId): Clue {
    const base = VARIANTS[this.variant].tasks[taskId];
    const st = HUE_STATIONS.find((x) => x.id === taskId)!;
    const edit = this.forgerEdits.get(taskId);
    return {
      ...base,
      id: edit ? `${taskId}-${edit.id}` : taskId,
      body: edit ? base.body + edit.addition : base.body,
      trace: edit ? edit.trace : undefined,
      source: `${st.title} · ${HUE_AREAS[st.area].name}`,
    };
  }

  private addClue(s: Secret, c: Clue) {
    if (!s.notebook.some((x) => x.id === c.id)) s.notebook.push(c);
  }

  // ---------------------------------------------------------------- abilities
  private abilityCheck(client: Client) {
    const p = this.state.players.get(client.sessionId);
    const s = this.secrets.get(client.sessionId);
    if (!p || !s || this.state.phase !== 'explore') return null;
    const st = HUE_ROLE_STATIONS[s.role];
    if (!this.near(p, st.x, st.y)) {
      client.send('toast', { text: `Năng lực dùng tại: ${st.title} (${HUE_AREAS[st.area].name}).`, kind: 'warn' });
      return null;
    }
    if (s.abilityUsedRound >= this.state.round) {
      client.send('toast', { text: 'Bạn đã dùng năng lực trong vòng này.', kind: 'info' });
      return null;
    }
    return { p, s, st };
  }

  private openAbility(client: Client) {
    const c = this.abilityCheck(client);
    if (!c) return;
    const { s, st } = c;
    const data: AbilityData = { role: s.role, title: `${ROLE_INFO[s.role].name} — ${ROLE_INFO[s.role].ability}`, prompt: st.title };
    if (s.role === 'forger') {
      data.prompt = 'Chọn MỘT chi tiết để tác động. Người nhận manh mối này sau bạn sẽ thấy phiên bản đã sửa — nhưng luôn kèm một dấu vết có thể phát hiện.';
      data.options = FORGER_OPTIONS.filter((o) => !this.forgerEdits.has(o.target)).map((o) => ({ id: o.id, label: o.label }));
    } else if (s.role === 'broker') {
      data.prompt = 'Giữ lại một mẩu tin khỏi nhóm chat (bản sao lưu vẫn còn trong kho), đồng thời biết hai người đang nắm manh mối liên quan.';
      data.options = [{ id: 'hold', label: 'Giữ tin “ai yêu cầu câu tiếng Anh mạnh hơn”' }];
    } else {
      data.options = [{ id: 'use', label: ROLE_INFO[s.role].ability }];
    }
    client.send('ability:data', data);
  }

  private useAbility(client: Client, option?: string) {
    const c = this.abilityCheck(client);
    if (!c) return;
    const { s } = c;
    const v = VARIANTS[this.variant];
    const source = `Năng lực ${ROLE_INFO[s.role].name} · vòng ${this.state.round}`;
    let clue: Clue | null = null;
    if (s.role === 'forger') {
      const opt = FORGER_OPTIONS.find((o) => o.id === option && !this.forgerEdits.has(o.target));
      if (!opt) return;
      this.forgerEdits.set(opt.target, opt);
      clue = { id: `forger-${opt.id}`, title: 'Bạn đã tác động hồ sơ', body: `${opt.label}.\nAi nhận manh mối này từ giờ sẽ thấy bản đã sửa.`, trace: opt.trace, source };
    } else if (s.role === 'broker') {
      this.brokerHeld = true;
      const holders = [...this.secrets.entries()]
        .filter(([id, x]) => id !== client.sessionId && x.notebook.length > 0)
        .sort((a, b) => b[1].notebook.length - a[1].notebook.length)
        .slice(0, 2)
        .map(([id]) => this.state.players.get(id)?.name ?? '?');
      clue = {
        id: `broker-${this.state.round}`,
        title: 'Mẩu tin bạn đang giữ',
        body: `${v.brokerSecret}\n\nNgười đang nắm manh mối liên quan: ${holders.length ? holders.join(', ') : 'chưa ai có manh mối'}.`,
        source,
      };
    } else {
      const base = v.roles[s.role as keyof typeof v.roles];
      let body = base.body;
      let trace: string | undefined;
      if (s.role === 'historian' && this.brokerHeld) body += '\n[Một email trong chuỗi đã bị chuyển khỏi nhóm chat — bản sao lưu đêm qua vẫn còn trong máy lưu trữ.]';
      if (s.role === 'archivist' && this.brokerHeld) trace = `Bản sao lưu đêm qua còn một tin bị ẩn khỏi nhóm: ${v.brokerSecret.replace('Tin bạn đang giữ: ', '')}`;
      if (s.role === 'archivist' && this.forgerEdits.size) {
        trace = [trace, `Lịch sử chỉnh sửa có ${this.forgerEdits.size} thay đổi lúc 01:1x bởi tài khoản “bientap-chung”, sau khi bản in đã xong.`].filter(Boolean).join('\n');
      }
      if (s.role === 'conservator' && this.forgerEdits.size) {
        trace = 'Dấu vết vật lý: một mẩu giấy / nhãn trong phòng biên tập mới hơn hẳn các tài liệu khác.';
      }
      clue = { ...base, body, trace, id: `role-${s.role}-${this.state.round}`, source };
    }
    s.abilityUsedRound = this.state.round;
    if (clue) this.addClue(s, clue);
    client.send('ability:result', { clue });
    this.sendPrivate(client.sessionId);
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
      abilityUsedRound: s.abilityUsedRound,
      notebook: s.notebook,
      completedTasks: [...s.completedTasks],
      extra: s.extra,
    };
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

export { NPC_NAMES };
