import { Client, type Room } from 'colyseus.js';
import { PLAYER_COLORS, ROOM_NAME, type ClientMessages, type Cinematic } from '@hidden-truth/shared';
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

/** press / release the sabotage fix button (the server times the hold) */
export function fix(on: boolean) {
  if (useStore.getState().fixing === on) return;
  useStore.getState().set({ fixing: on });
  send('sabotage:fix', { on });
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
    }),
  );
  return {
    code: state.code,
    mapSlug: state.mapSlug,
    hostId: state.hostId,
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    progress: state.progress,
    progressTarget: state.progressTarget,
    nightStartAt: state.nightStartAt ?? 0,
    nightPausedAt: state.nightPausedAt ?? 0,
    meetingReason: state.meetingReason,
    sabotage: state.sabotage ?? '',
    sabotageEndsAt: state.sabotageEndsAt ?? 0,
    sabotageArea: state.sabotageArea ?? '',
    sabotageX: state.sabotageX ?? 0,
    sabotageY: state.sabotageY ?? 0,
    killers: state.killers,
    tasksPerPlayer: state.tasksPerPlayer,
    nightMin: state.nightMin ?? 5,
    nightAuto: state.nightAuto ?? true,
    crewAlive: state.crewAlive ?? 0,
    killersAlive: state.killersAlive ?? 0,
    players,
  };
}

let pingTimer: ReturnType<typeof setInterval> | undefined;
/** set by leaveRoom() so onLeave can tell our own exit from the server closing the room */
let leaving = false;

function bind(r: Room) {
  room = r;
  const st = useStore.getState();
  st.set({ screen: 'room', sessionId: r.sessionId, error: '', connecting: false, end: null, me: null, chat: [], voteResult: null });
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
      if (snap.phase === 'meeting') s.set({ task: null, taskResult: null, voteResult: null });
      if (snap.phase === 'lobby') s.set({ end: null, me: null, voteResult: null });
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
  r.onMessage('chat', (m) => useStore.getState().set({ chat: [...useStore.getState().chat, m].slice(-200) }));
  r.onMessage('toast', (t) => useStore.getState().toast(t));
  r.onMessage('task:data', (task) => useStore.getState().set({ task, taskResult: null }));
  r.onMessage('task:result', (res: { ok: boolean; text: string; fact?: string; headline?: string }) => {
    const s = useStore.getState();
    if (res.ok) s.set({ taskResult: res });
    else {
      s.toast({ text: res.text, kind: 'warn' });
      s.set({ taskAttempt: s.taskAttempt + 1 });
    }
  });
  r.onMessage('canh', (c: { canh: number; text: string }) => {
    const s = useStore.getState();
    s.set({ canh: { n: c.canh, text: c.text, id: Date.now() } });
  });
  r.onMessage('task:close', () => useStore.getState().set({ task: null, taskResult: null }));
  r.onMessage('vote:result', (voteResult) => useStore.getState().set({ voteResult }));
  r.onMessage('cinematic', (c: Cinematic) => useStore.getState().set({ cinematic: { ...c, id: Date.now() } }));
  r.onMessage('end', (end) => useStore.getState().set({ end }));
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

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  if (!navigator.onLine) return 'Thiết bị đang mất mạng. Kiểm tra Wi-Fi/4G rồi thử lại.';
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
async function connect(kind: Connecting, fn: () => Promise<Room>, quiet = false): Promise<boolean> {
  const st = useStore.getState();
  if (st.connecting || room) return false;
  if (!navigator.onLine && !quiet) {
    st.set({ error: friendly(null) });
    return false;
  }
  const seq = ++opSeq;
  st.set({ connecting: kind, error: '' });
  try {
    const r = await attempt(fn);
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

export const joinRoom = (code: string, name: string) => connect('join', () => client.joinById(code.trim().toUpperCase(), { name }));

/** resume a saved seat (page reload); silent — a dead token just means we start at home */
export async function reconnect(): Promise<boolean> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  const ok = await connect('reconnect', () => client.reconnect(token), true);
  if (!ok && !room) sessionStorage.removeItem(TOKEN_KEY);
  return ok;
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
