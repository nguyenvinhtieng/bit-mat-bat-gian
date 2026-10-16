import { timingSafeEqual } from 'node:crypto';

/**
 * Admin write actions: with ADMIN_TOKEN set the request must send it (x-admin-token);
 * without one only dev is open — production refuses until a token is configured.
 */
export function adminAuth({ prod, token, sent }: { prod: boolean; token?: string; sent?: string }): 'ok' | 'denied' | 'unconfigured' {
  if (!token) return prod ? 'unconfigured' : 'ok';
  if (!sent) return 'denied';
  const a = Buffer.from(token);
  const b = Buffer.from(sent);
  return a.length === b.length && timingSafeEqual(a, b) ? 'ok' : 'denied';
}

/** why a room can't be removed by an admin right now (null = it can): only rooms with nobody online */
export function closeBlocker(room?: { clients: number; metadata?: { online?: number } }): 'missing' | 'occupied' | null {
  if (!room) return 'missing';
  return (room.metadata?.online ?? room.clients) > 0 ? 'occupied' : null;
}
