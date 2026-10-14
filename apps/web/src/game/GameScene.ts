import Phaser from 'phaser';
import { getStateCallbacks, type Room } from 'colyseus.js';
import {
  AREA_ORDER,
  HUE_AREAS,
  HUE_PROPS,
  HUE_ROLE_STATIONS,
  HUE_STATIONS,
  HUE_TILESET_ORDER,
  INTERACT_RADIUS,
  LAYOUT_H,
  LAYOUT_W,
  MEETING_POINT,
  PLAYER_COLORS,
  SIM_DT,
  TILE,
  areaAt,
  dirFromInput,
  dist,
  getGrid,
  stepMovement,
  type TaskId,
} from '@hidden-truth/shared';
import { onRoom, room, send } from '../net';
import { uiBlocksMovement, useStore, type Nearby } from '../store';

const A = '/assets';
const DIRS = ['down', 'left', 'right', 'up'] as const;
const INTERP_MS = 100;

type Snap = { t: number; x: number; y: number };
type Avatar = {
  c: Phaser.GameObjects.Container;
  base: Phaser.GameObjects.Sprite;
  tint: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  buf: Snap[];
  dir: number;
  moving: boolean;
  lastMoveAt: number;
};

export class GameScene extends Phaser.Scene {
  private grid = getGrid();
  private avatars = new Map<string, Avatar>();
  private stationSprites = new Map<TaskId, { icon: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image }>();
  private roleMarker?: Phaser.GameObjects.Container;
  private roleMarkerRole = '';
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  // prediction
  private pred = { x: 0, y: 0 };
  private renderOffset = { x: 0, y: 0 };
  private pending: { seq: number; dx: number; dy: number }[] = [];
  private outbox: { seq: number; dx: number; dy: number }[] = [];
  private seq = 0;
  private acc = 0;
  private myDir = 0;
  private myMoving = false;
  private lastSentZero = true;
  private hasServerPos = false;
  private unbind: (() => void)[] = [];
  private lastNearbyKey = '';
  private lastArea = '';

  constructor() {
    super('game');
  }

  preload() {
    this.load.spritesheet('hue-tiles', `${A}/maps/co-do-hue/tileset/hue-interior-48.webp`, { frameWidth: TILE, frameHeight: TILE });
    this.load.atlas('hue', `${A}/maps/co-do-hue/atlas/hue-gameplay-0.webp`, `${A}/maps/co-do-hue/atlas/hue-gameplay-0.json`);
    this.load.atlas('player', `${A}/common/characters/player-atlas.webp`, `${A}/common/characters/player-atlas.json`);
    this.load.atlas('player-tint', `${A}/common/characters/player-tint-atlas.webp`, `${A}/common/characters/player-tint-atlas.json`);
    this.load.image('shadow', `${A}/common/characters/shadow.webp`);
  }

  create() {
    this.buildMap();
    this.buildProps();
    this.buildStations();
    for (const tex of ['player', 'player-tint'])
      DIRS.forEach((d) =>
        this.anims.create({
          key: `${tex}-walk-${d}`,
          frames: [0, 1, 2, 3].map((i) => ({ key: tex, frame: `walk-${d}-${i}` })),
          frameRate: 9,
          repeat: -1,
        }),
      );

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE', false) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-SPACE', () => this.interact());

    const cam = this.cameras.main;
    cam.setBounds(0, 0, LAYOUT_W * TILE, LAYOUT_H * TILE);
    cam.setBackgroundColor('#1b120d');
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', () => this.fitZoom());

    this.unbind.push(onRoom((r) => this.bindRoom(r)));
    this.unbind.push(useStore.subscribe((s, prev) => s.me?.role !== prev.me?.role && this.refreshRoleMarker()));
    this.unbind.push(useStore.subscribe((s, prev) => s.me?.completedTasks !== prev.me?.completedTasks && this.refreshStations()));
    this.events.once('shutdown', () => this.unbind.forEach((u) => u()));
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const z = Phaser.Math.Clamp(Math.min(width / 960, height / 640), 0.7, 1.6);
    this.cameras.main.setZoom(Math.round(z * 4) / 4 || 1);
  }

  // ------------------------------------------------------------ world
  private buildMap() {
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: LAYOUT_W, height: LAYOUT_H });
    const ts = map.addTilesetImage('hue-tiles', 'hue-tiles', TILE, TILE, 0, 0)!;
    const layer = map.createBlankLayer('floor', ts, 0, 0)!;
    const cols = HUE_TILESET_ORDER.length * 2;
    const idx = (name: string, x: number, y: number) => {
      const i = HUE_TILESET_ORDER.indexOf(name as (typeof HUE_TILESET_ORDER)[number]);
      return (y % 2) * cols + i * 2 + (x % 2);
    };
    const g = this.grid;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const a = g.area[y * g.w + x];
        if (a >= 0) {
          const info = HUE_AREAS[AREA_ORDER[a]];
          const t = layer.putTileAt(idx(info.floor, x, y), x, y);
          if (info.tint) t.tint = info.tint;
        } else {
          const below = y + 1 < g.h ? g.area[(y + 1) * g.w + x] : -1;
          layer.putTileAt(idx(below >= 0 ? 'wall-face' : 'wall-top', x, y), x, y);
        }
      }
    layer.setDepth(-10);
  }

  private buildProps() {
    for (const p of HUE_PROPS) {
      const img = this.add.image(p.x, p.y, 'hue', p.key).setOrigin(0.5, 1);
      img.setDepth(p.wall ? -5 : p.y);
    }
  }

  private buildStations() {
    for (const st of HUE_STATIONS) {
      const ring = this.add.image(st.x, st.y, 'hue', 'task-marker').setDisplaySize(84, 84).setDepth(-4).setAlpha(0.9);
      const key = `hue-station-${['print-checklist', 'scan-footnote', 'floor-plan', 'lights-labels', 'seal-box', 'return-shelf'][st.frame]}`;
      const icon = this.add.image(st.x, st.y - 6, 'hue', key).setDisplaySize(52, 52).setDepth(st.y - 20);
      icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tryTask(st.id));
      this.tweens.add({ targets: ring, alpha: 0.45, scale: ring.scale * 1.08, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
      this.stationSprites.set(st.id, { icon, ring });
    }
  }

  private refreshStations() {
    const done = new Set(useStore.getState().me?.completedTasks ?? []);
    for (const [id, s] of this.stationSprites) {
      const isDone = done.has(id);
      s.icon.setTint(isDone ? 0x777777 : 0xffffff).setAlpha(isDone ? 0.7 : 1);
      s.ring.setVisible(!isDone);
    }
  }

  private refreshRoleMarker() {
    const role = useStore.getState().me?.role;
    if (role === this.roleMarkerRole) return;
    this.roleMarker?.destroy();
    this.roleMarker = undefined;
    this.roleMarkerRole = role ?? '';
    if (!role) return;
    const st = HUE_ROLE_STATIONS[role];
    const ring = this.add.image(0, 0, 'hue', 'task-marker').setDisplaySize(72, 72).setTint(0xa8e6ff);
    const icon = this.add.image(0, -6, 'hue', `ability-${role}`).setDisplaySize(40, 40);
    this.roleMarker = this.add.container(st.x, st.y, [ring, icon]).setDepth(st.y - 20);
    this.tweens.add({ targets: ring, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
    icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.interact());
  }

  // ------------------------------------------------------------ network
  private bindRoom(r: Room) {
    for (const a of this.avatars.values()) a.c.destroy();
    this.avatars.clear();
    this.pending = [];
    this.hasServerPos = false;
    const $ = getStateCallbacks(r);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = $(r.state as any).players as any;
    players.onAdd((p: any, id: string) => {
      const av = this.makeAvatar(p.name, PLAYER_COLORS[p.color] ?? 0xffffff);
      av.c.setPosition(p.x, p.y);
      av.buf.push({ t: performance.now(), x: p.x, y: p.y });
      this.avatars.set(id, av);
      if (id === r.sessionId) {
        this.pred = { x: p.x, y: p.y };
        this.hasServerPos = true;
        this.cameras.main.startFollow(av.c, true, 0.18, 0.18);
      }
      $(p).onChange(() => {
        av.label.setText(p.name);
        av.c.setAlpha(p.connected ? 1 : 0.4);
        if (id === r.sessionId) this.reconcile(p.x, p.y, p.lastSeq);
        else {
          av.buf.push({ t: performance.now(), x: p.x, y: p.y });
          if (av.buf.length > 30) av.buf.shift();
          av.dir = p.dir;
          av.moving = p.moving;
        }
      });
    }, true);
    players.onRemove((_p: unknown, id: string) => {
      this.avatars.get(id)?.c.destroy();
      this.avatars.delete(id);
    });
    this.refreshRoleMarker();
    this.refreshStations();
  }

  private makeAvatar(name: string, color: number): Avatar {
    const shadow = this.add.image(0, -2, 'shadow').setDisplaySize(34, 14);
    const base = this.add.sprite(0, 0, 'player', 'walk-down-0').setOrigin(0.5, 1);
    const tint = this.add.sprite(0, 0, 'player-tint', 'walk-down-0').setOrigin(0.5, 1).setTint(color);
    const label = this.add
      .text(0, -68, name, { fontFamily: 'Be Vietnam Pro, system-ui, sans-serif', fontSize: '13px', color: '#fff8e8', stroke: '#2a1a10', strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setResolution(2);
    const c = this.add.container(0, 0, [shadow, base, tint, label]);
    return { c, base, tint, label, buf: [], dir: 0, moving: false, lastMoveAt: 0 };
  }

  private reconcile(sx: number, sy: number, lastSeq: number) {
    const before = { ...this.pred };
    this.pending = this.pending.filter((i) => i.seq > lastSeq);
    let p = { x: sx, y: sy };
    for (const i of this.pending) p = stepMovement(this.grid, p, i, SIM_DT);
    this.pred = p;
    const ex = before.x - p.x, ey = before.y - p.y;
    if (!this.hasServerPos || Math.hypot(ex, ey) > 96) this.renderOffset = { x: 0, y: 0 };
    else {
      this.renderOffset.x += ex;
      this.renderOffset.y += ey;
    }
    this.hasServerPos = true;
  }

  // ------------------------------------------------------------ input / interaction
  private readInput() {
    const ae = document.activeElement;
    const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
    const phase = useStore.getState().room?.phase;
    if (typing || uiBlocksMovement() || (phase !== 'lobby' && phase !== 'explore')) return { dx: 0, dy: 0 };
    const k = this.keys;
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    const joy = (window as unknown as { __joy?: { dx: number; dy: number } }).__joy;
    if (!dx && !dy && joy) return joy;
    return { dx, dy };
  }

  private tryTask(id: TaskId) {
    const s = useStore.getState();
    if (s.room?.phase !== 'explore' || uiBlocksMovement()) return;
    const st = HUE_STATIONS.find((x) => x.id === id)!;
    if (dist(this.pred, st) > INTERACT_RADIUS) return s.toast({ text: `Lại gần “${st.title}” để làm nhiệm vụ.`, kind: 'info' });
    send('task:open', { taskId: id });
  }

  private interact() {
    const s = useStore.getState();
    const n = s.nearby;
    if (!n || uiBlocksMovement()) return;
    if (n.kind === 'task') this.tryTask(n.id);
    else if (n.kind === 'ability') send('ability:open', {});
    else if (n.kind === 'emergency') send('emergency', {});
  }

  private computeNearby(): Nearby {
    const s = useStore.getState();
    if (s.room?.phase !== 'explore') return null;
    let best: Nearby = null;
    let bestD = INTERACT_RADIUS;
    const done = new Set(s.me?.completedTasks ?? []);
    for (const st of HUE_STATIONS) {
      const d = dist(this.pred, st);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'task', id: st.id, title: st.title, done: done.has(st.id) };
      }
    }
    if (s.me) {
      const rs = HUE_ROLE_STATIONS[s.me.role];
      const d = dist(this.pred, rs);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'ability', title: rs.title, used: s.me.abilityUsedRound >= (s.room?.round ?? 0) };
      }
    }
    const me = s.room?.players.find((p) => p.id === s.sessionId);
    if (dist(this.pred, MEETING_POINT) < INTERACT_RADIUS + 50 && bestD >= INTERACT_RADIUS) {
      best = { kind: 'emergency', title: 'Rung chuông gọi họp khẩn', used: !!me?.emergencyUsed };
    }
    return best;
  }

  // ------------------------------------------------------------ loop
  update(_t: number, dtMs: number) {
    const r = room;
    if (!r) return;
    this.acc += Math.min(dtMs, 250) / 1000;
    while (this.acc >= SIM_DT) {
      this.acc -= SIM_DT;
      const input = this.readInput();
      const zero = !input.dx && !input.dy;
      if (zero && this.lastSentZero) {
        this.myMoving = false;
        continue;
      }
      this.lastSentZero = zero;
      const cmd = { seq: ++this.seq, dx: input.dx, dy: input.dy };
      this.pending.push(cmd);
      this.outbox.push(cmd);
      const next = stepMovement(this.grid, this.pred, cmd, SIM_DT);
      this.myMoving = next.x !== this.pred.x || next.y !== this.pred.y;
      this.pred = next;
      this.myDir = dirFromInput(input, this.myDir);
    }
    if (this.outbox.length) {
      r.send('input', this.outbox);
      this.outbox = [];
    }

    // own avatar
    const mine = this.avatars.get(r.sessionId);
    if (mine && this.hasServerPos) {
      this.renderOffset.x *= 0.82;
      this.renderOffset.y *= 0.82;
      mine.c.setPosition(this.pred.x + this.renderOffset.x, this.pred.y + this.renderOffset.y);
      this.animate(mine, this.myDir, this.myMoving);
    }
    // others — interpolate
    const renderT = performance.now() - INTERP_MS;
    for (const [id, av] of this.avatars) {
      if (id === r.sessionId) continue;
      const b = av.buf;
      let x = av.c.x, y = av.c.y;
      if (b.length) {
        while (b.length >= 2 && b[1].t <= renderT) b.shift();
        if (b.length >= 2 && b[0].t <= renderT) {
          const k = (renderT - b[0].t) / Math.max(1, b[1].t - b[0].t);
          x = b[0].x + (b[1].x - b[0].x) * k;
          y = b[0].y + (b[1].y - b[0].y) * k;
        } else {
          x = b[0].x;
          y = b[0].y;
        }
      }
      const vx = x - av.c.x, vy = y - av.c.y;
      const moving = Math.hypot(vx, vy) > 0.15;
      if (moving) av.lastMoveAt = performance.now();
      av.c.setPosition(x, y);
      // keep the walk anim through tiny network gaps
      this.animate(av, av.dir, moving || performance.now() - av.lastMoveAt < 120);
    }
    for (const av of this.avatars.values()) av.c.setDepth(av.c.y);

    // UI bridge (only on change)
    const nearby = this.computeNearby();
    const nk = JSON.stringify(nearby);
    if (nk !== this.lastNearbyKey) {
      this.lastNearbyKey = nk;
      useStore.getState().set({ nearby });
    }
    const area = areaAt(this.grid, this.pred.x, this.pred.y) ?? '';
    if (area && area !== this.lastArea) {
      this.lastArea = area;
      useStore.getState().set({ area });
    }
  }

  private animate(av: Avatar, dir: number, moving: boolean) {
    const d = DIRS[dir] ?? 'down';
    if (moving) {
      const key = `player-walk-${d}`;
      if (av.base.anims.currentAnim?.key !== key || !av.base.anims.isPlaying) {
        av.base.play(key);
        av.tint.play(`player-tint-walk-${d}`);
      }
    } else {
      av.base.anims.stop();
      av.tint.anims.stop();
      av.base.setFrame(`walk-${d}-0`);
      av.tint.setFrame(`walk-${d}-0`);
    }
  }
}
