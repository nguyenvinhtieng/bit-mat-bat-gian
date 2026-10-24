import { Client, type Room } from 'colyseus.js';
import { GAME, PLAYER_COLORS, ROOM_NAME, type ArrestHoldMsg, type ClientMessages, type Cinematic, type InspectResult, type SayMsg, type VoteResult } from '@giao-keo/shared';
import { useStore, type Connecting, type RoomView } from './store';

function endpoint(): string {
  const env = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (env) return env;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  if (import.meta.env.DEV) return `${proto}://${location.hostname}:2567`;
  return `${proto}://${location.host}`;
}

export const client = new Client(endpoint());
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let room: Room<any> | null = null;
type Listener = (r: Room) => void;
const roomListeners = new Set<Listener>();
export function onRoom(cb: Listener) {
  roomListeners.add(cb);
  if (room) cb(room);
  return () => roomListeners.delete(cb);
}

let arrestSentAt = 0;
/** undercover: arrest the nearest driver now (the server checks range and cooldown); a double tap sends once */
export function arrest() {
  const now = Date.now();
  if (now - arrestSentAt < 400) return;
  arrestSentAt = now;
  send('arrest', { on: true });
}

/** arrest:heard listeners (GameScene plays the sound + a marker) */
type Heard = (at: { x: number; y: number }) => void;
const heardListeners = new Set<Heard>();
export function onHeard(cb: Heard) {
  heardListeners.add(cb);
  return () => heardListeners.delete(cb);
}

/** speech bubbles (GameScene draws them over the speaker's head) */
type Say = (m: SayMsg) => void;
const sayListeners = new Set<Say>();
export function onSay(cb: Say) {
  sayListeners.add(cb);
  return () => sayListeners.delete(cb);
}

export function send<K extends keyof ClientMessages>(type: K, payload: ClientMessages[K]) {
  room?.send(type, payload);
}

const TOKEN_KEY = 'tht:reconnect';
const ROOM_KEY = 'tht:room';
const PID_KEY = 'tht:pid';

/**
 * Seat keys survive the browser being killed (mobile) in production; dev keeps them per tab so several tabs can
 * play as different players. Storage can throw (private mode, blocked site data) — then we just can't resume.
 */
const seatStore = () => (import.meta.env.DEV ? sessionStorage : localStorage);
const kv = {
  get: (k: string) => {
    try {
      return seatStore().getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      seatStore().setItem(k, v);
    } catch {}
  },
  del: (k: string) => {
    try {
      seatStore().removeItem(k);
    } catch {}
  },
};
const forgetSeat = () => {
  kv.del(TOKEN_KEY);
  kv.del(ROOM_KEY);
};

/** this device's id: the server gives its seat back to it (reload, lost token) instead of adding a duplicate */
function pid(): string {
  let id = kv.get(PID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    kv.set(PID_KEY, id);
  }
  return id;
}
const savedName = () => {
  try {
    return localStorage.getItem('tht:name') ?? '';
  } catch {
    return '';
  }
};
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
const untilVisible = () =>
  new Promise<void>((res) => {
    if (!document.hidden) return res();
    const on = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', on);
      res();
    };
    document.addEventListener('visibilitychange', on);
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapshot(state: any): RoomView {
  const players: RoomView['players'] = [];
  state.players.forEach((p: any) =>
    players.push({
      id: p.id,
      name: p.name,
      color: PLAYER_COLORS[p.color] ?? 0xffffff,
      ready: p.ready,
      connected: p.connected,
      tasksDone: p.tasksDone,
      voted: p.voted,
      voteFor: p.voteFor ?? '',
      emergencyUsed: p.emergencyUsed,
      alive: p.alive,
      body: p.body,
      bodyX: p.bodyX,
      bodyY: p.bodyY,
      micOn: !!p.micOn,
    }),
  );
  const stations: RoomView['stations'] = {};
  state.stations?.forEach((v: any, k: string) => (stations[k] = { need: v.need, done: v.done }));
  return {
    code: state.code,
    mapSlug: state.mapSlug,
    hostId: state.hostId,
    isPublic: state.isPublic ?? true,
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    progress: state.progress,
    progressTarget: state.progressTarget,
    nightStartAt: state.nightStartAt ?? 0,
    nightPausedAt: state.nightPausedAt ?? 0,
    meetingReason: state.meetingReason,
    stations,
    handoffOpen: !!state.handoffOpen,
    packageState: state.packageState ?? 'home',
    packageCarrier: state.packageCarrier ?? '',
    packageX: state.packageX ?? 0,
    packageY: state.packageY ?? 0,
    tasksPerPlayer: state.tasksPerPlayer ?? GAME.tasksPerPlayerDefault,
    nightMin: state.nightMin ?? 8,
    cops: state.cops ?? GAME.copsDefault,
    crewAlive: state.crewAlive ?? 0,
    killersAlive: state.killersAlive ?? 0,
    players,
  };
}

/** rooms this tab left, newest first — quick-match tries every other room before coming back to these */
const LEFT_KEY = 'tht:left';
const leftRooms = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(LEFT_KEY) ?? '[]');
  } catch {
    return [];
  }
};
const rememberLeft = (id: string) => {
  try {
    sessionStorage.setItem(LEFT_KEY, JSON.stringify([id, ...leftRooms().filter((x) => x !== id)].slice(0, 10)));
  } catch {}
};

let pingTimer: ReturnType<typeof setInterval> | undefined;
/** last sign of life from the server (pong or state patch) — a socket can die without ever firing onclose */
let lastSeen = 0;
const FIRST_STATE_MS = 8_000;
const SILENT_MS = 12_000;

function bind(r: Room) {
  room = r;
  // saved first: whatever happens next, a reload or recover() can get this exact seat back
  kv.set(TOKEN_KEY, r.reconnectionToken);
  kv.set(ROOM_KEY, r.roomId);
  lastSeen = Date.now();
  const st = useStore.getState();
  // `connecting` stays on until the first state arrives — till then the home screen is showing, so keep its spinner
  st.set({ screen: 'room', sessionId: r.sessionId, error: '', end: null, me: null, chat: [], voteResult: null, ejectedNames: [] });
  history.replaceState(null, '', `/join/${r.roomId}`);

  let last = '';
  let lastPhase = '';
  let gotState = false;
  // joined, but the full state never came (socket stalled right after the handshake): resume the same seat
  setTimeout(() => {
    if (room === r && !gotState) dropDead(r);
  }, FIRST_STATE_MS);
  r.onStateChange((state) => {
    lastSeen = Date.now();
    if (!gotState) {
      gotState = true;
      useStore.getState().set({ connecting: false });
    }
    const snap = snapshot(state);
    const key = JSON.stringify(snap);
    if (key === last) return;
    last = key;
    const s = useStore.getState();
    if (snap.phase !== lastPhase) {
      if (snap.phase === 'meeting') s.set({ task: null, taskResult: null, voteResult: null, arrestHold: null });
      // time ran out or a side won: drop any open task so it can't reappear over the results
      if (snap.phase !== 'explore') s.set({ task: null, taskResult: null });
      // the result screen survives the return to the lobby (closed by each player); a new game drops it
      if (snap.phase === 'lobby') s.set({ me: null, voteResult: null, ejectedNames: [], inspect: null, inspectOpen: false, arrestHold: null });
      if (snap.phase === 'explore') s.set({ end: null });
      lastPhase = snap.phase;
    }
    s.set({ room: snap });
  });

  r.onMessage('time', (serverNow: number) => useStore.getState().set({ timeOffset: serverNow - Date.now() }));
  r.onMessage('private', (me) => {
    const s = useStore.getState();
    const first = !s.me && me;
    s.set({ me });
    if (first && s.room?.phase === 'explore') s.set({ introOpen: true, introQuick: false });
  });
  r.onMessage('intro', () => useStore.getState().set({ introOpen: true, introQuick: false }));
  r.onMessage('chat:history', (list) => useStore.getState().set({ chat: list }));
  r.onMessage('chat', (m) => {
    const s = useStore.getState();
    s.set({ chat: [...s.chat, m].slice(-200) });
    // in the lobby a board message also pops over the sender's head
    if (!m.system && s.room?.phase === 'lobby') for (const cb of sayListeners) cb({ from: m.from, text: m.text });
  });
  r.onMessage('say', (m: SayMsg) => {
    for (const cb of sayListeners) cb(m);
  });
  r.onMessage('toast', (t) => useStore.getState().toast(t));
  r.onMessage('task:data', (task) => {
    const s = useStore.getState();
    if (s.room?.phase === 'explore' && !s.end) s.set({ task, taskResult: null });
  });
  r.onMessage('task:result', (res: { ok: boolean; text: string; fact?: string; headline?: string }) => {
    const s = useStore.getState();
    if (res.ok) s.set({ taskResult: res });
    else {
      s.toast({ text: res.text, kind: 'warn' });
      s.set({ taskAttempt: s.taskAttempt + 1 });
    }
  });
  r.onMessage('arrest:hold', (m: ArrestHoldMsg) => {
    useStore.getState().set({ arrestHold: m.on ? m : null });
  });
  r.onMessage('arrest:heard', (m: { at: { x: number; y: number } }) => {
    for (const cb of heardListeners) cb(m.at);
  });
  r.onMessage('inspect:result', (inspect: InspectResult) => useStore.getState().set({ inspect, inspectOpen: true }));
  r.onMessage('task:close', () => useStore.getState().set({ task: null, taskResult: null }));
  r.onMessage('vote:result', (voteResult: VoteResult) => {
    const s = useStore.getState();
    s.set({ voteResult, ejectedNames: voteResult.ejected ? [...s.ejectedNames, voteResult.ejected] : s.ejectedNames });
  });
  r.onMessage('cinematic', (c: Cinematic) => useStore.getState().set({ cinematic: { ...c, id: Date.now() } }));
  r.onMessage('end', (end) => useStore.getState().set({ end, task: null, taskResult: null }));
  r.onMessage('teleport', () => {});
  r.onMessage('pong', (t: number) => {
    lastSeen = Date.now();
    useStore.getState().set({ ping: Math.round(performance.now() - t) });
  });
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    if (Date.now() - lastSeen > SILENT_MS && !document.hidden) return dropDead(r);
    r.send('ping', performance.now());
  }, 3000);
  r.send('ping', performance.now());

  r.onLeave((code) => {
    if (room !== r) return; // a newer room already replaced this one
    room = null;
    if (pingTimer) clearInterval(pingTimer);
    useStore.getState().set({ ping: 0 });
    // our own exit never gets here: leaveRoom() unbinds first
    if (code > 1000 && code !== 4000 && code !== 4001 && code !== 4003 && kv.get(ROOM_KEY)) {
      // unexpected disconnect (network blip, phone backgrounded) -> keep retrying while the server holds our seat
      recover();
    } else {
      // 4003 = this device took the seat over on a newer connection (another tab): that one keeps the keys
      if (code !== 4003) forgetSeat();
      rememberLeft(r.roomId);
      // 4000 we didn't ask for = the server closed the room (restart/deploy); 4001 = kicked (server toasts why)
      const error =
        code === 4000
          ? 'Phòng đã đóng (máy chủ vừa khởi động lại). Hãy tạo hoặc vào phòng mới.'
          : code === 4003
            ? 'Bạn đã vào phòng này từ một tab hoặc kết nối khác.'
            : '';
      useStore.getState().set({ screen: 'home', room: null, reconnecting: false, connecting: false, error });
      history.replaceState(null, '', '/');
    }
  });
  for (const cb of roomListeners) cb(r);
}

/** server-side rejections (room not found, full, token expired…) — retrying won't help */
const rejected = (e: unknown) => typeof (e as { code?: unknown })?.code === 'number' && (e as { code: number }).code >= 4000;

const NO_ROOMS = 'no-open-rooms';

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (!navigator.onLine) return 'Thiết bị đang mất mạng. Kiểm tra Wi-Fi/4G rồi thử lại.';
  if (msg === NO_ROOMS) return 'Hiện chưa có phòng công khai nào đang chờ người chơi. Hãy tạo phòng mới hoặc thử lại sau.';
  if (/timeout/i.test(msg)) return 'Máy chủ phản hồi quá lâu. Thử lại sau giây lát.';
  if (/not found|invalid|expired/i.test(msg)) return 'Không tìm thấy phòng với mã này.';
  if (/locked|full/i.test(msg)) return 'Phòng đã đầy hoặc đang chơi.';
  if (/đang chơi|already|started/i.test(msg)) return msg;
  if (!rejected(e)) return 'Không kết nối được máy chủ game. Thử lại sau giây lát.';
  return msg || 'Có lỗi xảy ra, thử lại nhé.';
}

const OP_TIMEOUT = 12_000;
let opSeq = 0;

/** race a matchmaking call against a timeout; a room that arrives after we gave up is left right away */
async function attempt(fn: () => Promise<Room>, ms = OP_TIMEOUT): Promise<Room> {
  const p = fn();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<never>((_, rej) => (timer = setTimeout(() => rej(new Error('timeout')), ms)))]);
  } catch (e) {
    p.then((late) => late.leave(true), () => {});
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** single in-flight create/join/reconnect; stale results (superseded or already in a room) are discarded */
async function connect(kind: Connecting, fn: () => Promise<Room>, quiet = false, ms = OP_TIMEOUT): Promise<boolean> {
  const st = useStore.getState();
  // bound but no state ever arrived (socket died mid-join, e.g. mobile app killed) -> Home is showing; drop the zombie
  if (room && !st.room?.phase) dropStale();
  // the user picking join/create overrides a silent resume still waiting on its old seat
  const override = st.connecting === 'reconnect' && kind !== 'reconnect';
  if (override) forgetSeat();
  if ((st.connecting && !override) || room) return false;
  if (!navigator.onLine && !quiet) {
    st.set({ error: friendly(null) });
    return false;
  }
  const seq = ++opSeq;
  st.set({ connecting: kind, error: '' });
  try {
    const r = await attempt(fn, ms);
    if (seq !== opSeq || room) {
      r.leave(true);
      return false;
    }
    bind(r);
    return true;
  } catch (e) {
    if (seq === opSeq) useStore.getState().set({ connecting: false, error: quiet ? '' : friendly(e) });
    return false;
  }
}

export const createRoom = (name: string, map?: string) => connect('create', () => client.create(ROOM_NAME, { name, map, pid: pid() }));

/** false only when the server says the room is gone; network errors resolve true so we never drop a valid invite */
export async function roomExists(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${httpBase()}/rooms/${encodeURIComponent(code.trim().toUpperCase())}`);
    if (!res.ok) return true;
    return (await res.json())?.exists !== false;
  } catch {
    return true;
  }
}

export const httpBase = () => endpoint().replace(/^ws/, 'http').replace(/\/$/, '');

const FIND_MS = 25_000;
const FIND_POLL_MS = 2_000;
let findSeq = 0;

/**
 * Quick-match into a public lobby with free seats. A room can fill up or start between the lookup and the join,
 * so a refused room is excluded and we ask again (a few times). Rooms we left before are only offered as a last resort.
 * With nothing open we keep polling for a while — the home screen shows a search overlay meanwhile.
 */
export const findRoom = (name: string) => {
  const mine = ++findSeq;
  const deadline = Date.now() + FIND_MS - 3_000;
  const search = async () => {
    const tried: string[] = [];
    for (;;) {
      if (mine !== findSeq) throw new Error('cancelled');
      const q = `exclude=${encodeURIComponent(tried.join(','))}&avoid=${encodeURIComponent(leftRooms().join(','))}`;
      const res = await fetch(`${httpBase()}/rooms/find?${q}`);
      const id = res.ok ? ((await res.json())?.roomId as string | null) : null;
      if (!id) {
        if (Date.now() + FIND_POLL_MS > deadline) throw new Error(NO_ROOMS);
        await new Promise((r) => setTimeout(r, FIND_POLL_MS));
        continue;
      }
      try {
        return await client.joinById(id, { name, pid: pid() });
      } catch (e) {
        if (!rejected(e) || tried.length >= 4) throw e;
        tried.push(id);
      }
    }
  };
  return connect('find', search, false, FIND_MS);
};

/** stop a quick-match that is still searching (a room that answers late is left by connect) */
export function cancelFind() {
  if (useStore.getState().connecting !== 'find') return;
  findSeq++;
  opSeq++;
  useStore.getState().set({ connecting: false, error: '' });
}

export const joinRoom = (code: string, name: string) => connect('join', () => client.joinById(code.trim().toUpperCase(), { name, pid: pid() }));

function dropStale() {
  const r = room;
  room = null; // onLeave then sees room !== r and stays quiet
  if (pingTimer) clearInterval(pingTimer);
  r?.leave(true);
}

/** the saved room is gone for good (closed, game started without us, full) — retrying won't help */
class SeatGone extends Error {}

/**
 * One try at getting back into the saved room: the held seat by reconnection token, else the same device's seat by
 * pid. The token reads as expired while the server still thinks a dead old socket is alive (phone app killed,
 * backgrounded) — the pid join takes the seat over right away instead of waiting for the server to notice.
 */
async function resumeOnce(): Promise<Room> {
  const token = kv.get(TOKEN_KEY);
  const roomId = kv.get(ROOM_KEY);
  if (!roomId) throw new SeatGone();
  if (token) {
    try {
      return await attempt(() => client.reconnect(token), 8_000);
    } catch {}
  }
  try {
    return await attempt(() => client.joinById(roomId, { name: savedName(), pid: pid() }), 8_000);
  } catch (e) {
    throw rejected(e) ? new SeatGone() : e;
  }
}

/** a socket that looks open but is dead (no state / pongs): drop it without consent — the server holds the seat */
function dropDead(r: Room) {
  if (room !== r) return;
  room = null; // its late onLeave sees room !== r and stays quiet
  if (pingTimer) clearInterval(pingTimer);
  try {
    r.connection.close();
  } catch {}
  recover();
}

/** resume a saved seat (page reload); silent — a dead seat just means we start at home. Join/create cancel this. */
export async function reconnect(): Promise<boolean> {
  if (!kv.get(ROOM_KEY) || room || useStore.getState().connecting) return false;
  const seq = ++opSeq;
  useStore.getState().set({ connecting: 'reconnect', error: '' });
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      const r = await resumeOnce();
      if (seq !== opSeq || room) {
        r.leave(true);
        return false;
      }
      bind(r);
      return true;
    } catch (e) {
      if (seq !== opSeq) return false;
      if (e instanceof SeatGone || Date.now() > deadline || !navigator.onLine) break;
      await sleep(1500);
      if (seq !== opSeq) return false;
    }
  }
  forgetSeat();
  useStore.getState().set({ connecting: false });
  return false;
}

/** the server holds a dropped seat 60s in the lobby / 120s in a game; the pid join covers the rest */
const RECOVER_MS = 110_000;
let recovering = false;

/**
 * After an unexpected drop: retry with backoff. Time spent with the page hidden (phone switched to another app,
 * timers frozen) doesn't count — on coming back we always get a fresh run of attempts.
 */
async function recover() {
  if (recovering) return;
  recovering = true;
  useStore.getState().set({ reconnecting: true });
  let deadline = Date.now() + RECOVER_MS;
  try {
    for (let i = 0; !room && kv.get(ROOM_KEY); i++) {
      if (document.hidden) {
        await untilVisible();
        deadline = Math.max(deadline, Date.now() + 20_000);
        i = 0;
      }
      if (Date.now() > deadline) break;
      if (navigator.onLine) {
        try {
          const r = await resumeOnce();
          if (room || !kv.get(ROOM_KEY)) {
            r.leave(true);
            break;
          }
          bind(r);
          return;
        } catch (e) {
          if (e instanceof SeatGone) break;
        }
      }
      await sleep(Math.min(1000 * 2 ** i, 5000));
    }
    if (room) return;
    // no saved room any more = the player left on purpose meanwhile
    const lost = !!kv.get(ROOM_KEY);
    forgetSeat();
    useStore.getState().set({ screen: 'home', room: null, connecting: false, error: lost ? 'Mất kết nối với phòng. Hãy vào lại bằng mã phòng.' : '' });
    history.replaceState(null, '', '/');
  } finally {
    recovering = false;
    useStore.getState().set({ reconnecting: false });
  }
}

/** back from another app / network back: the socket may have died silently while we were away — probe it */
function probe() {
  const r = room;
  if (!r || document.hidden) return;
  const asked = Date.now();
  r.send('ping', performance.now());
  setTimeout(() => {
    if (room === r && lastSeen < asked) dropDead(r);
  }, 4_000);
}
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', probe);
  window.addEventListener('online', probe);
  window.addEventListener('pageshow', (e) => e.persisted && probe());
}

/** Back home right away: the server's goodbye can take ages (or never come) on a slow or half-dead socket. */
export function leaveRoom() {
  forgetSeat();
  const r = room;
  room = null; // its late onLeave sees room !== r and stays quiet
  if (pingTimer) clearInterval(pingTimer);
  if (r) rememberLeft(r.roomId);
  useStore.getState().set({ screen: 'home', room: null, ping: 0, reconnecting: false, connecting: false, error: '' });
  history.replaceState(null, '', '/');
  r?.leave(true);
}
