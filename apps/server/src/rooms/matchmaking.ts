/** The bits of a matchMaker room listing that quick-match needs. */
export type RoomListing = {
  roomId: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  private: boolean;
  metadata?: { phase?: string; public?: boolean; online?: number } | null;
};

/**
 * Quick-match: a public room still in its lobby with a free seat (and someone online in it).
 * The fullest one wins so games fill up and start sooner. `exclude` = ids that just refused us (never picked);
 * `avoid` = rooms the player left earlier — only picked once no other room is open.
 */
export function pickOpenRoom(rooms: readonly RoomListing[], exclude: readonly string[] = [], avoid: readonly string[] = []): string | null {
  const open = rooms.filter(
    (r) =>
      !r.private &&
      !r.locked &&
      r.metadata?.public === true &&
      r.metadata?.phase === 'lobby' &&
      r.clients > 0 &&
      (r.metadata?.online ?? r.clients) > 0 &&
      r.clients < r.maxClients &&
      !exclude.includes(r.roomId),
  );
  open.sort((a, b) => Number(avoid.includes(a.roomId)) - Number(avoid.includes(b.roomId)) || b.clients - a.clients);
  return open[0]?.roomId ?? null;
}
