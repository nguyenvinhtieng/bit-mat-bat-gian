/** What a listener knows about one speaker when mixing proximity voice. */
export type VoiceInput = {
  phase: string;
  meAlive: boolean;
  otherAlive: boolean;
  /** feet-to-feet distance, px */
  dist: number;
  /** current sight radius (blind sabotage included) */
  radius: number;
  /** speaker is in the listener's line of sight */
  seen: boolean;
};

/** 1 at your feet, fading to 0 at the edge of sight */
const falloff = (dist: number, radius: number) => (radius > 0 && dist < radius ? 1 - (dist / radius) ** 2 : 0);

/**
 * Speaker volume 0..1 for a listener.
 * Lobby / end: everyone hears everyone. Explore: only who you can see, quieter with distance.
 * Meeting / reveal: the living hear each other fully. The living never hear ghosts;
 * ghosts hear each other anywhere and the living by distance (they see through walls).
 */
export function voiceGain(v: VoiceInput): number {
  if (v.phase === 'lobby' || v.phase === 'ended') return 1;
  if (!v.otherAlive) return v.meAlive ? 0 : 1;
  const explore = v.phase === 'explore';
  if (!v.meAlive) return explore ? falloff(v.dist, v.radius) : 1;
  if (!explore) return 1;
  return v.seen ? falloff(v.dist, v.radius) : 0;
}
