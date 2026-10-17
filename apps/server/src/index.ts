import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GAME_URL, ROOM_NAME } from '@hidden-truth/shared';
import { GameRoom } from './rooms/GameRoom';
import { pickOpenRoom } from './rooms/matchmaking';
import { adminAuth, closeBlocker } from './rooms/admin';

const PORT = Number(process.env.PORT || 2567);
const PROD = process.env.NODE_ENV === 'production';

/**
 * Production only accepts the game domain (+ extra ALLOWED_ORIGINS, comma-separated);
 * dev stays open so LAN phones can connect. Requests without an Origin (bots, curl) pass.
 */
const ALLOWED = new Set([GAME_URL, ...(process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [])]);
const originOk = (origin?: string) => !PROD || !origin || ALLOWED.has(origin);

/**
 * Voice chat ICE servers. STUN alone fails behind carrier NAT (3G/4G) and UDP-blocking office
 * networks, so with TURN_SECRET set we also hand out our coturn relay (deployment/coturn/setup.sh)
 * using its time-limited "TURN REST" credentials: username = expiry:tag, password = HMAC-SHA1(secret).
 */
const TURN_TTL_S = 12 * 3600;
const STUN: RTCIceServerJson = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] };
type RTCIceServerJson = { urls: string[]; username?: string; credential?: string };
function iceServers(): RTCIceServerJson[] {
  const secret = process.env.TURN_SECRET;
  const host = process.env.TURN_HOST;
  if (!secret || !host) return [STUN];
  const username = `${Math.floor(Date.now() / 1000) + TURN_TTL_S}:voice`;
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64');
  const tls = process.env.TURN_TLS_HOST;
  const urls = [`turn:${host}:3478?transport=udp`, `turn:${host}:3478?transport=tcp`, `turn:${host}:443?transport=tcp`];
  if (tls) urls.push(`turns:${tls}:443?transport=tcp`);
  return [STUN, { urls, username, credential }];
}

const app = express();
app.set('trust proxy', true); // behind nginx / Caddy / platform proxies
app.use(cors({ origin: (origin, cb) => cb(null, originOk(origin)) }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/ice', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ iceServers: iceServers(), ttl: TURN_TTL_S });
});
// quick-match: a public lobby with free seats; ?exclude=ID1,ID2 skips rooms that just refused the client,
// ?avoid=ID3 deprioritises rooms the client left before
app.get('/rooms/find', async (req, res) => {
  const ids = (q: unknown) => String(q ?? '').split(',').filter(Boolean);
  const rooms = await matchMaker.query({ name: ROOM_NAME, private: false });
  res.json({ roomId: pickOpenRoom(rooms, ids(req.query.exclude), ids(req.query.avoid)) });
});
app.get('/rooms/:code', async (req, res) => {
  const rooms = await matchMaker.query({ roomId: req.params.code.toUpperCase() });
  const r = rooms[0];
  res.json(r ? { exists: true, clients: r.clients, maxClients: r.maxClients, locked: r.locked } : { exists: false });
});

// admin stats (public for now). Read-only HTTP: viewing it never joins a room, so the admin isn't counted.
app.get('/admin/stats', async (_req, res) => {
  const rooms = await matchMaker.query({ name: ROOM_NAME });
  res.json({
    online: rooms.reduce((n, r) => n + (r.metadata?.online ?? r.clients), 0),
    roomCount: rooms.length,
    rooms: rooms.map((r) => ({
      code: r.roomId,
      clients: r.clients,
      online: r.metadata?.online ?? r.clients,
      maxClients: r.maxClients,
      locked: r.locked,
      public: !r.private,
      phase: r.metadata?.phase ?? '',
      map: r.metadata?.map ?? '',
      creator: r.metadata?.creator ?? '',
      createdAt: r.metadata?.createdAt ?? 0,
    })),
  });
});

// admin: remove a room nobody is online in (stale/ghost rooms that would fail anyone joining).
// Needs ADMIN_TOKEN (header x-admin-token) in production.
app.delete('/admin/rooms/:code', async (req, res) => {
  const auth = adminAuth({ prod: PROD, token: process.env.ADMIN_TOKEN, sent: req.get('x-admin-token') });
  if (auth === 'unconfigured') return res.status(403).json({ error: 'ADMIN_TOKEN chưa được cấu hình trên server' });
  if (auth === 'denied') return res.status(401).json({ error: 'Sai mã quản trị' });
  const code = req.params.code.toUpperCase();
  const [room] = await matchMaker.query({ name: ROOM_NAME, roomId: code });
  const blocker = closeBlocker(room);
  if (blocker === 'missing') return res.status(404).json({ error: 'Phòng không tồn tại' });
  if (blocker === 'occupied') return res.status(409).json({ error: 'Phòng vẫn còn người chơi online' });
  try {
    await matchMaker.remoteRoomCall(code, 'adminClose');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String((e as Error).message ?? e) });
  }
});

// Production: serve the built web client from the same origin.
const webDist = path.resolve(import.meta.dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(join\/.*|admin\/?)?$/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server, verifyClient: ({ origin }: { origin?: string }) => originOk(origin) }),
});
gameServer.define(ROOM_NAME, GameRoom);

gameServer.listen(PORT).then(() => console.log(`[server] Colyseus listening on :${PORT}` + (PROD ? ` — ${GAME_URL}` : ` — ws://localhost:${PORT}`)));
