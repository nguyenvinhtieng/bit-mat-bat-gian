import { Client, type Room } from 'colyseus.js';
import { GAME, PLAYER_COLORS, ROOM_NAME, type ArrestHoldMsg, type ClientMessages, type Cinematic, type InspectResult, type SayMsg, type VoteResult } from '@hidden-truth/shared';
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

let arresting = false;
/** undercover: press / release the arrest button (the server times the hold) */
export function arrest(on: boolean) {
  if (arresting === on) return;
  arresting = on;
  send('arrest', { on });
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
/** set by leaveRoom() so onLeave can tell our own exit from the server closing the room */
let leaving = false;

function bind(r: Room) {
  room = r;
  const st = useStore.getState();
  st.set({ screen: 'room', sessionId: r.sessionId, error: '', connecting: false, end: null, me: null, chat: [], voteResult: null, ejectedNames: [] });
  sessionStorage.setItem(TOKEN_KEY, r.reconnectionToken);
  history.replaceState(null, '', `/join/${r.roomId}`);

  let last = '';
  let lastPhase = '';
  r.onStateChange((state) => {
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
    if (!m.on && m.youAre === 'actor') arresting = false;
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
  r.onMessage('pong', (t: number) => useStore.getState().set({ ping: Math.round(performance.now() - t) }));
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = setInterval(() => r.send('ping', performance.now()), 3000);
  r.send('ping', performance.now());

  r.onLeave((code) => {
    if (room !== r) return; // a newer room already replaced this one
    room = null;
    if (pingTimer) clearInterval(pingTimer);
    useStore.getState().set({ ping: 0 });
    const self = leaving;
    leaving = false;
    if (!self && code > 1000 && code !== 4000 && code !== 4001 && sessionStorage.getItem(TOKEN_KEY)) {
      // unexpected disconnect (network blip, phone backgrounded) -> keep retrying while the server holds our seat
      recover();
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      rememberLeft(r.roomId);
      // 4000 we didn't ask for = the server closed the room (restart/deploy); 4001 = kicked (server toasts why)
      const error = !self && code === 4000 ? 'Phòng đã đóng (máy chủ vừa khởi động lại). Hãy tạo hoặc vào phòng mới.' : '';
      useStore.getState().set({ screen: 'home', room: null, reconnecting: false, error });
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
  if (override) sessionStorage.removeItem(TOKEN_KEY);
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

export const createRoom = (name: string, map?: string) => connect('create', () => client.create(ROOM_NAME, { name, map }));

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
        return await client.joinById(id, { name });
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

export const joinRoom = (code: string, name: string) => connect('join', () => client.joinById(code.trim().toUpperCase(), { name }));

function dropStale() {
  const r = room;
  room = null; // onLeave then sees room !== r and stays quiet
  if (pingTimer) clearInterval(pingTimer);
  r?.leave(true);
}

/**
 * resume a saved seat (page reload); silent — a dead token just means we start at home.
 * After the app is killed on mobile the server may still think the old socket is alive for a few seconds,
 * and until it notices, the token reads as expired — so keep retrying briefly. Join/create cancel this.
 */
export async function reconnect(): Promise<boolean> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token || room || useStore.getState().connecting) return false;
  const seq = ++opSeq;
  useStore.getState().set({ connecting: 'reconnect', error: '' });
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      const r = await attempt(() => client.reconnect(token), 8_000);
      if (seq !== opSeq || room) {
        r.leave(true);
        return false;
      }
      bind(r);
      return true;
    } catch {
      if (seq !== opSeq) return false;
      if (Date.now() > deadline || !navigator.onLine) break;
      await new Promise((res) => setTimeout(res, 1500));
      if (seq !== opSeq) return false;
    }
  }
  sessionStorage.removeItem(TOKEN_KEY);
  useStore.getState().set({ connecting: false });
  return false;
}

/** after an unexpected drop: retry with backoff while the server keeps the seat (45s in game, 20s in lobby) */
async function recover() {
  const s = useStore.getState();
  s.set({ reconnecting: true });
  const deadline = Date.now() + 40_000;
  for (let i = 0; Date.now() < deadline; i++) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token || room) break;
    if (navigator.onLine) {
      try {
        bind(await attempt(() => client.reconnect(token), 8_000));
        useStore.getState().set({ reconnecting: false });
        return;
      } catch (e) {
        if (rejected(e)) break;
      }
    }
    await new Promise((res) => setTimeout(res, Math.min(1000 * 2 ** i, 5000)));
  }
  if (room) return useStore.getState().set({ reconnecting: false });
  sessionStorage.removeItem(TOKEN_KEY);
  useStore.getState().set({ screen: 'home', room: null, reconnecting: false, error: 'Mất kết nối với phòng. Hãy vào lại bằng mã phòng.' });
  history.replaceState(null, '', '/');
}

export function leaveRoom() {
  sessionStorage.removeItem(TOKEN_KEY);
  if (room) leaving = true;
  room?.leave(true);
}
