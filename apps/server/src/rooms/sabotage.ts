import { SABOTAGE, dist, type Pt, type SabotageKind, type WARD_SPOTS } from '@hidden-truth/shared';

export type WardSpot = (typeof WARD_SPOTS)[number];
export type SabotageEvent = { type: 'ended'; kind: 'blind' } | { type: 'fixed'; by: string } | { type: 'expired' };

const S = 1000;

/**
 * Common killer-sabotage rules, free of Colyseus so they can be unit-tested.
 * One sabotage at a time; all killers share `readyAt`. The room maps events to state, chat and endings.
 */
export class Sabotage {
  kind: SabotageKind | null = null;
  endsAt = 0;
  spot: WardSpot | null = null;
  readyAt = 0;
  /** player id -> when they started holding the fix button */
  private fixers = new Map<string, number>();

  /** new round: nothing running, first use at `readyAt` */
  reset(readyAt: number) {
    this.interrupt();
    this.readyAt = readyAt;
  }

  start(kind: SabotageKind, now: number, spot?: WardSpot): 'ok' | 'cooldown' | 'busy' {
    if (this.kind || (kind === 'ward' && !spot)) return 'busy';
    if (now < this.readyAt) return 'cooldown';
    this.kind = kind;
    this.spot = kind === 'ward' ? spot! : null;
    this.endsAt = now + (kind === 'ward' ? SABOTAGE.wardSec : SABOTAGE.blindSec) * S;
    this.readyAt = now + SABOTAGE.cooldownSec * S;
    return 'ok';
  }

  fixStart(id: string, now: number, pos: Pt): boolean {
    if (this.kind !== 'ward' || !this.spot || dist(pos, this.spot) > SABOTAGE.fixRange) return false;
    if (!this.fixers.has(id)) this.fixers.set(id, now);
    return true;
  }

  fixStop(id: string) {
    this.fixers.delete(id);
  }

  /** `posOf` returns null for players who can no longer fix (gone or dead). */
  tick(now: number, posOf: (id: string) => Pt | null): SabotageEvent | null {
    if (!this.kind) return null;
    if (this.spot) {
      for (const [id, since] of this.fixers) {
        const pos = posOf(id);
        if (!pos || dist(pos, this.spot) > SABOTAGE.fixRange) this.fixers.delete(id);
        else if (now - since >= SABOTAGE.fixHoldSec * S) {
          this.interrupt();
          return { type: 'fixed', by: id };
        }
      }
    }
    if (now < this.endsAt) return null;
    const kind = this.kind;
    this.interrupt();
    return kind === 'blind' ? { type: 'ended', kind } : { type: 'expired' };
  }

  /** a meeting (or the end of the round) clears whatever is running; the cooldown is kept */
  interrupt() {
    this.kind = null;
    this.spot = null;
    this.endsAt = 0;
    this.fixers.clear();
  }

  /** push the next use back to at least `until` */
  cooldown(until: number) {
    this.readyAt = Math.max(this.readyAt, until);
  }
}
