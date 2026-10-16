/** The bits of a matchMaker room listing that quick-match needs. */
export type RoomListing = {
  roomId: string;
  clients: number;
  maxClients: number;
  locked: boolean;
  private: boolean;
  metadata?: { phase?: string; public?: boolean } | null;
};

/**
 * Quick-match: a public room still in its lobby with a free seat (and someone in it).
 * The fullest one wins so games fill up and start sooner. `exclude` = ids that just refused us.
 */
export function pickOpenRoom(rooms: readonly RoomListing[], exclude: readonly string[] = []): string | null {
  const open = rooms.filter(
    (r) =>
      !r.private &&
      !r.locked &&
      r.metadata?.public === true &&
      r.metadata?.phase === 'lobby' &&
      r.clients > 0 &&
      r.clients < r.maxClients &&
      !exclude.includes(r.roomId),
  );
  open.sort((a, b) => b.clients - a.clients);
  return open[0]?.roomId ?? null;
}
