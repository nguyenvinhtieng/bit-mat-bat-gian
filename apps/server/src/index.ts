import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GAME_URL, ROOM_NAME } from '@hidden-truth/shared';
import { GameRoom } from './rooms/GameRoom';
import { pickOpenRoom } from './rooms/matchmaking';

const PORT = Number(process.env.PORT || 2567);
const PROD = process.env.NODE_ENV === 'production';

/**
 * Production only accepts the game domain (+ extra ALLOWED_ORIGINS, comma-separated);
 * dev stays open so LAN phones can connect. Requests without an Origin (bots, curl) pass.
 */
const ALLOWED = new Set([GAME_URL, ...(process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [])]);
const originOk = (origin?: string) => !PROD || !origin || ALLOWED.has(origin);

const app = express();
app.set('trust proxy', true); // behind nginx / Caddy / platform proxies
app.use(cors({ origin: (origin, cb) => cb(null, originOk(origin)) }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
// quick-match: a public lobby with free seats; ?exclude=ID1,ID2 skips rooms that just refused the client
app.get('/rooms/find', async (req, res) => {
  const exclude = String(req.query.exclude ?? '').split(',').filter(Boolean);
  const rooms = await matchMaker.query({ name: ROOM_NAME, private: false });
  res.json({ roomId: pickOpenRoom(rooms, exclude) });
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
    online: rooms.reduce((n, r) => n + r.clients, 0),
    roomCount: rooms.length,
    rooms: rooms.map((r) => ({
      code: r.roomId,
      clients: r.clients,
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
