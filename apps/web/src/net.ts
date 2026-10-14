import { Client, type Room } from 'colyseus.js';
import { PLAYER_COLORS, ROOM_NAME, type ClientMessages, type Clue } from '@hidden-truth/shared';
import { useStore, type RoomView } from './store';

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

export function send<K extends keyof ClientMessages>(type: K, payload: ClientMessages[K]) {
  room?.send(type, payload);
}

const TOKEN_KEY = 'tht:reconnect';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snapshot(state: any): RoomView {
  const players: RoomView['players'] = [];
  state.players.forEach((p: any) =>
    players.push({ id: p.id, name: p.name, color: PLAYER_COLORS[p.color] ?? 0xffffff, ready: p.ready, connected: p.connected, tasksDone: p.tasksDone, voted: p.voted, emergencyUsed: p.emergencyUsed }),
  );
  const board: RoomView['board'] = [];
  state.board.forEach((c: any) =>
    board.push({ id: c.id, title: c.title, body: c.body, source: c.source, art: c.art || undefined, trace: c.trace || undefined, diff: c.diff ? JSON.parse(c.diff) : undefined, by: c.by }),
  );
  return {
    code: state.code,
    hostId: state.hostId,
    phase: state.phase,
    round: state.round,
    maxRounds: state.maxRounds,
    phaseEndsAt: state.phaseEndsAt,
    progress: state.progress,
    progressTarget: state.progressTarget,
    finalMeeting: state.finalMeeting,
    meetingReason: state.meetingReason,
    variantChoice: state.variantChoice,
    quick: state.quick,
    players,
    board,
  };
}

function bind(r: Room) {
  room = r;
  const st = useStore.getState();
  st.set({ screen: 'room', sessionId: r.sessionId, error: '', connecting: false, end: null, me: null, chat: [] });
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
      if (snap.phase === 'meeting' || snap.phase === 'conclusion') s.set({ task: null, taskResult: null, ability: null, abilityResult: null, notebookOpen: false });
      if (snap.phase === 'lobby') s.set({ end: null, me: null });
      lastPhase = snap.phase;
    }
    s.set({ room: snap });
  });

  r.onMessage('time', (serverNow: number) => useStore.getState().set({ timeOffset: serverNow - Date.now() }));
  r.onMessage('private', (me) => {
    const s = useStore.getState();
    const first = !s.me && me;
    s.set({ me });
    if (first && s.room?.phase === 'explore') s.set({ introOpen: true });
  });
  r.onMessage('intro', () => useStore.getState().set({ introOpen: true }));
  r.onMessage('chat:history', (list) => useStore.getState().set({ chat: list }));
  r.onMessage('chat', (m) => useStore.getState().set({ chat: [...useStore.getState().chat, m].slice(-200) }));
  r.onMessage('toast', (t) => useStore.getState().toast(t));
  r.onMessage('task:data', (task) => useStore.getState().set({ task, taskResult: null }));
  r.onMessage('task:result', (res: { ok: boolean; text: string; clues?: Clue[] }) => {
    const s = useStore.getState();
    if (res.ok) s.set({ taskResult: res });
    else s.toast({ text: res.text, kind: 'warn' });
  });
  r.onMessage('task:close', () => useStore.getState().set({ task: null, taskResult: null, ability: null, abilityResult: null }));
  r.onMessage('ability:data', (ability) => useStore.getState().set({ ability, abilityResult: null }));
  r.onMessage('ability:result', (res) => useStore.getState().set({ abilityResult: res }));
  r.onMessage('end', (end) => useStore.getState().set({ end }));
  r.onMessage('teleport', () => {});

  r.onLeave((code) => {
    room = null;
    if (code > 1000) {
      // unexpected disconnect -> try to reconnect once
      reconnect().then((ok) => {
        if (!ok) useStore.getState().set({ screen: 'home', room: null, error: 'Mất kết nối với phòng.' });
      });
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      useStore.getState().set({ screen: 'home', room: null });
      history.replaceState(null, '', '/');
    }
  });
  for (const cb of roomListeners) cb(r);
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not found|invalid/i.test(msg)) return 'Không tìm thấy phòng với mã này.';
  if (/locked|full/i.test(msg)) return 'Phòng đã đầy hoặc đang chơi.';
  if (/ECONNREFUSED|Failed to fetch|NetworkError|connect/i.test(msg)) return 'Không kết nối được game server (cổng 2567).';
  return msg;
}

export async function createRoom(name: string) {
  useStore.getState().set({ connecting: true, error: '' });
  try {
    bind(await client.create(ROOM_NAME, { name }));
  } catch (e) {
    useStore.getState().set({ connecting: false, error: friendly(e) });
  }
}

export async function joinRoom(code: string, name: string) {
  useStore.getState().set({ connecting: true, error: '' });
  try {
    bind(await client.joinById(code.trim().toUpperCase(), { name }));
  } catch (e) {
    useStore.getState().set({ connecting: false, error: friendly(e) });
  }
}

export async function reconnect(): Promise<boolean> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    bind(await client.reconnect(token));
    return true;
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    return false;
  }
}

export function leaveRoom() {
  sessionStorage.removeItem(TOKEN_KEY);
  room?.leave(true);
}
