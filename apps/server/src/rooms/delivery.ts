import { GAME, PREP_TASK_IDS, dist, type PrepTaskId, type Pt, type TaskId } from '@hidden-truth/shared';

/**
 * Cuốc Cuối rules, free of Colyseus so they can be unit-tested:
 * shared preparation turns, the 50-million package, the arrest hold and the veteran's activity log.
 * The room mirrors them into public state.
 */
export type PackageState = 'home' | 'carried' | 'dropped' | 'delivered';

export class Delivery {
  need = new Map<PrepTaskId, number>();
  doneBy = new Map<PrepTaskId, number>();
  state: PackageState = 'home';
  carrier = '';
  x = 0;
  y = 0;

  reset(plan: Record<PrepTaskId, number>, home: Pt) {
    this.need.clear();
    this.doneBy.clear();
    for (const id of PREP_TASK_IDS) {
      this.need.set(id, plan[id]);
      this.doneBy.set(id, 0);
    }
    this.state = 'home';
    this.carrier = '';
    this.x = home.x;
    this.y = home.y;
  }

  get done() {
    let n = 0;
    for (const v of this.doneBy.values()) n += v;
    return n;
  }
  get target() {
    let n = 0;
    for (const v of this.need.values()) n += v;
    return n;
  }
  get handoffOpen() {
    return this.target > 0 && this.done >= this.target;
  }

  /** a prep station with turns left, or the handoff once preparation is full */
  canOpen(taskId: TaskId) {
    if (taskId === 'handoff_package') return this.handoffOpen;
    return (this.doneBy.get(taskId) ?? 0) < (this.need.get(taskId) ?? 0);
  }

  /** `real` = a driver did it (the undercover's fake never counts). Returns true if a turn was used up. */
  complete(taskId: TaskId, real: boolean) {
    if (!real || taskId === 'handoff_package' || !this.canOpen(taskId)) return false;
    this.doneBy.set(taskId, (this.doneBy.get(taskId) ?? 0) + 1);
    return true;
  }

  pick(id: string, at: Pt): 'ok' | 'far' | 'taken' | 'gone' {
    if (this.state === 'delivered') return 'gone';
    if (this.state === 'carried') return this.carrier === id ? 'ok' : 'taken';
    if (dist(at, this) > GAME.packageRange) return 'far';
    this.state = 'carried';
    this.carrier = id;
    return 'ok';
  }

  drop(id: string, at: Pt) {
    if (this.state !== 'carried' || this.carrier !== id) return false;
    this.state = 'dropped';
    this.carrier = '';
    this.x = at.x;
    this.y = at.y;
    return true;
  }

  /** the carrier was arrested / voted out / left: the box falls where they stood */
  onGone(id: string, at: Pt) {
    this.drop(id, at);
  }

  deliver(id: string) {
    if (this.state !== 'carried' || this.carrier !== id) return false;
    this.state = 'delivered';
    return true;
  }
}

export type ArrestEvent = { type: 'done' | 'cancel'; actor: string; target: string };

/** One cop holds the arrest button next to one target; the server times the hold. */
export class ArrestHold {
  private hold: { actor: string; target: string; startedAt: number } | null = null;

  get active() {
    return !!this.hold;
  }
  get target() {
    return this.hold?.target ?? '';
  }
  get endsAt() {
    return this.hold ? this.hold.startedAt + GAME.arrestHoldSec * 1000 : 0;
  }

  start(actor: string, target: string, now: number) {
    if (this.hold) return false;
    this.hold = { actor, target, startedAt: now };
    return true;
  }

  release(actor: string): ArrestEvent | null {
    if (!this.hold || this.hold.actor !== actor) return null;
    return this.end('cancel');
  }

  /** `inRange` re-checks both players each tick (alive, connected, within arrest range) */
  tick(now: number, inRange: (actor: string, target: string) => boolean): ArrestEvent | null {
    if (!this.hold) return null;
    if (!inRange(this.hold.actor, this.hold.target)) return this.end('cancel');
    return now >= this.endsAt ? this.end('done') : null;
  }

  /** meetings / game end */
  clear() {
    this.hold = null;
  }

  private end(type: ArrestEvent['type']): ArrestEvent {
    const { actor, target } = this.hold!;
    this.hold = null;
    return { type, actor, target };
  }
}

export type Activity = { taskId: TaskId; at: number; status: 'done' | 'failed' };

/** The veteran's view: newest first, relative seconds, nothing about roles or fake tasks. */
export const recentActivities = (log: readonly Activity[], now: number, n: number) =>
  [...log]
    .sort((a, b) => b.at - a.at)
    .slice(0, n)
    .map((a) => ({ taskId: a.taskId, agoSec: Math.max(0, Math.round((now - a.at) / 1000)), status: a.status }));
