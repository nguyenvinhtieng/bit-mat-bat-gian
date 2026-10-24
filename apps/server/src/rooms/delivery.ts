import { GAME, PREP_TASK_IDS, dist, type PrepTaskId, type Pt, type TaskId } from '@hidden-truth/shared';

/**
 * Cuốc Cuối rules, free of Colyseus so they can be unit-tested:
 * personal preparation lists, the 50-million package, the arrest hold and the veteran's activity log.
 * The room mirrors them into public state.
 */
export type PackageState = 'home' | 'carried' | 'dropped' | 'delivered';

export type Job = { id: PrepTaskId; done: boolean };

export class Delivery {
  /** personal prep lists; only `counted` players (the drivers) feed the bar — the cop's list is cover */
  jobs = new Map<string, Job[]>();
  counted = new Set<string>();
  state: PackageState = 'home';
  carrier = '';
  x = 0;
  y = 0;

  reset(deal: Record<string, readonly PrepTaskId[]>, counted: readonly string[], home: Pt) {
    this.jobs.clear();
    for (const [id, list] of Object.entries(deal)) this.jobs.set(id, list.map((t) => ({ id: t, done: false })));
    this.counted = new Set(counted);
    this.state = 'home';
    this.carrier = '';
    this.x = home.x;
    this.y = home.y;
  }

  tasksOf(id: string): readonly Job[] {
    return this.jobs.get(id) ?? [];
  }

  private countedJobs() {
    return [...this.counted].flatMap((id) => this.jobs.get(id) ?? []);
  }
  get done() {
    return this.countedJobs().filter((j) => j.done).length;
  }
  get target() {
    return this.countedJobs().length;
  }
  get handoffOpen() {
    return this.target > 0 && this.done >= this.target;
  }

  /** per station, over the drivers' lists: how many were dealt / finished (public, no names) */
  stationTotals() {
    const out = new Map<PrepTaskId, { need: number; done: number }>(PREP_TASK_IDS.map((t) => [t, { need: 0, done: 0 }]));
    for (const j of this.countedJobs()) {
      const row = out.get(j.id)!;
      row.need++;
      if (j.done) row.done++;
    }
    return out;
  }

  /** one of this player's unfinished stations, or the handoff once preparation is full */
  canOpen(id: string, taskId: TaskId) {
    if (taskId === 'handoff_package') return this.handoffOpen;
    return this.tasksOf(id).some((j) => j.id === taskId && !j.done);
  }

  /** ticks the station off this player's list. Returns true if it was on it and still open. */
  complete(id: string, taskId: TaskId) {
    const j = this.jobs.get(id)?.find((x) => x.id === taskId && !x.done);
    if (!j) return false;
    j.done = true;
    return true;
  }

  /**
   * A driver left mid-game: their unfinished stations go to `to` (whoever has the fewest open ones,
   * preferring someone who doesn't hold that station yet). Returns the receivers, one per moved station.
   */
  reassign(from: string, to: readonly string[]) {
    const list = this.jobs.get(from);
    const heirs = to.filter((x) => x !== from && this.jobs.has(x));
    if (!list || !heirs.length) return [];
    const open = (x: string) => this.tasksOf(x).filter((j) => !j.done).length;
    const got: string[] = [];
    for (const j of list.filter((x) => !x.done)) {
      const free = heirs.filter((x) => !this.canOpen(x, j.id));
      const pick = (free.length ? free : heirs).reduce((a, b) => (open(b) < open(a) ? b : a));
      this.jobs.get(pick)!.push({ id: j.id, done: false });
      got.push(pick);
    }
    this.jobs.set(from, list.filter((x) => x.done));
    return got;
  }

  /** the same player came back on a new session id */
  rekey(from: string, to: string) {
    const list = this.jobs.get(from);
    if (list) {
      this.jobs.set(to, list);
      this.jobs.delete(from);
    }
    if (this.counted.delete(from)) this.counted.add(to);
    if (this.carrier === from) this.carrier = to;
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
