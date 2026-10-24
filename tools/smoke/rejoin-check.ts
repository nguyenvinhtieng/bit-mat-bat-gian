import { Client } from 'colyseus.js';
import { ROOM_NAME } from '@hidden-truth/shared';

const c = new Client(process.env.SERVER_URL || 'ws://localhost:2567');
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const names = (r: any) => [...r.state.players.values()].map((p: any) => `${p.name}${p.connected ? '' : '(off)'}`).join(',');

const host = await c.create(ROOM_NAME, { name: 'host', pid: 'pid-host-00001' });
const a = await c.joinById(host.roomId, { name: 'phone', pid: 'pid-phone-0001' });
let aCode = 0;
a.onLeave((code) => (aCode = code));
a.onError((code) => console.log('[a error]', code));
await wait(300);
// zombie: same device joins again while the old socket is still open
const b = await c.joinById(host.roomId, { name: 'phone', pid: 'pid-phone-0001' });
b.onError((code) => console.log('[b error]', code));
await wait(500);
console.log('lobby after dup join:', names(host), '| old closed with', aCode);

// mid-game: start (dev: host alone can start), then the phone drops and comes back on a new session
host.send('ready', { ready: true });
await wait(200);
host.send('start');
await wait(500);
console.log('phase:', host.state.phase);
b.connection.close();
await wait(500);
console.log('after drop:', names(host));
const b2 = await c.joinById(host.roomId, { name: 'x', pid: 'pid-phone-0001' });
b2.onError((code) => console.log('[b2 error]', code));
b2.onLeave((code) => console.log('[b2 leave]', code));
await wait(500);
console.log('after mid-game takeover:', names(host), '| new session sees phase', b2.state.phase);
try {
  await c.joinById(host.roomId, { name: 'stranger', pid: 'pid-stranger-01' });
  console.log('stranger joined (BAD)');
} catch (e) {
  console.log('stranger refused:', (e as Error).message);
}
await b2.leave();
await host.leave();
process.exit(0);
