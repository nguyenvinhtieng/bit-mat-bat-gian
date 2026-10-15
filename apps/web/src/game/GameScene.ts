import Phaser from 'phaser';
import { getStateCallbacks, type Room } from 'colyseus.js';
import {
  AREA_ORDER,
  HUE_AREAS,
  HUE_ATLAS,
  HUE_DECOR_ATLAS,
  HUE_FLOOR_BAKE,
  HUE_PROPS,
  HUE_STATIONS,
  HUE_TILESET_ORDER,
  GAME,
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
  hasLineOfSight,
  playerArt,
  stepMovement,
  type TaskId,
} from '@hidden-truth/shared';
import { onRoom, room, send } from '../net';
import { uiBlocksMovement, useStore, type Nearby } from '../store';

const A = '/assets';
const DIRS = ['down', 'left', 'right', 'up'] as const;
const INTERP_MS = 140; // > 2 patch intervals (PATCH_MS=50) to absorb network jitter
/** FX strips: 8 frames x 256px, painted per pixel (tools/paint/fx.py). rate = fps, size = on-screen px in world units */
const FX_FRAMES = 8;
const FX = {
  'fx-kill-slash': { rate: 18, size: 170 },
  'fx-shield-block': { rate: 13, size: 140 },
  'fx-witness': { rate: 16, size: 72 },
  'fx-report-burst': { rate: 12, size: 150 },
} as const;
type FxKey = keyof typeof FX;

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
  name: string;
  alive: boolean;
};

export class GameScene extends Phaser.Scene {
  private grid = getGrid();
  private avatars = new Map<string, Avatar>();
  private stationSprites = new Map<TaskId, { icon: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image }>();
  private bodies = new Map<string, Phaser.GameObjects.Container>();
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
  private fog?: Phaser.GameObjects.RenderTexture;
  private fogBrush?: Phaser.GameObjects.Image;

  constructor() {
    super('game');
  }

  preload() {
    this.load.spritesheet('hue-tiles', `${A}/maps/co-do-hue/tileset/hue-interior-48.webp`, { frameWidth: TILE, frameHeight: TILE });
    this.load.atlas('hue', `${A}/maps/co-do-hue/atlas/hue-gameplay-0.webp`, `${A}/maps/co-do-hue/atlas/hue-gameplay-0.json`);
    // Đêm Ban Sóc props + station icons (tools/ui-art/draw-hue-bansoc.mjs)
    this.load.atlas('hue-bansoc', `${A}/${HUE_ATLAS}.webp`, `${A}/${HUE_ATLAS}.json`);
    // painted (raster) props + room decor, and the pre-rendered floor/wall bake (tools/paint/*.py)
    this.load.atlas('hue-decor', `${A}/${HUE_DECOR_ATLAS}.webp`, `${A}/${HUE_DECOR_ATLAS}.json`);
    this.load.image('hue-floor', `${A}/${HUE_FLOOR_BAKE}.webp`);
    // costume follows the map (Huế: áo dài + khăn đóng…), common avatar otherwise
    const art = playerArt(useStore.getState().room?.mapSlug);
    this.load.atlas('player', `${A}/${art.atlas}.webp`, `${A}/${art.atlas}.json`);
    this.load.atlas('player-tint', `${A}/${art.tint}.webp`, `${A}/${art.tint}.json`);
    this.load.image('shadow', `${A}/common/characters/shadow.webp`);
    this.load.image('body-marker', `${A}/common/ui/body-marker.webp`);
    for (const k of Object.keys(FX)) this.load.spritesheet(k, `${A}/common/ui/fx/${k}.webp`, { frameWidth: 256, frameHeight: 256 });
    for (const k of ['spark', 'ink-drop', 'ink-splat']) this.load.image(k, `${A}/common/ui/fx/${k}.webp`);
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

    for (const [k, v] of Object.entries(FX)) this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(k, { start: 0, end: FX_FRAMES - 1 }), frameRate: v.rate });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE', false) as Record<string, Phaser.Input.Keyboard.Key>;
    // Clicking the map releases focus from any HTML input (e.g. chat) so movement keys work again.
    this.input.on('pointerdown', () => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && ae !== document.body && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) ae.blur();
    });
    kb.on('keydown-E', () => this.interact());
    kb.on('keydown-SPACE', () => this.interact());
    kb.on('keydown-K', () => this.doKill());
    kb.on('keydown-R', () => this.doReport());

    this.buildFog();
    const cam = this.cameras.main;
    cam.setBounds(0, 0, LAYOUT_W * TILE, LAYOUT_H * TILE);
    cam.setBackgroundColor('#1b120d');
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', () => this.fitZoom());

    this.unbind.push(onRoom((r) => this.bindRoom(r)));
    this.unbind.push(useStore.subscribe((s, prev) => s.cinematic && s.cinematic !== prev.cinematic && this.onCinematic(s.cinematic)));
    this.unbind.push(useStore.subscribe((s, prev) => (s.me?.completedTasks !== prev.me?.completedTasks || s.me?.tasks !== prev.me?.tasks) && this.refreshStations()));
    this.events.once('shutdown', () => this.unbind.forEach((u) => u()));
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const z = Phaser.Math.Clamp(Math.min(width / 960, height / 640), 0.7, 1.6);
    this.cameras.main.setZoom(Math.round(z * 4) / 4 || 1);
  }

  // ------------------------------------------------------------ world
  private buildMap() {
    if (this.textures.exists('hue-floor')) {
      this.add.image(0, 0, 'hue-floor').setOrigin(0).setDepth(-10);
      return;
    }
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

  /** Dark overlay with a soft circular hole around me; limits what a living player can see. */
  private buildFog() {
    const R = GAME.visionRadius;
    const size = R * 2 + 64;
    const tex = this.textures.createCanvas('fog-brush', size, size)!;
    const ctx = tex.getContext();
    const gr = ctx.createRadialGradient(size / 2, size / 2, R * 0.55, size / 2, size / 2, R + 24);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    this.fogBrush = this.make.image({ key: 'fog-brush', add: false }).setOrigin(0.5);
    this.fog = this.add.renderTexture(0, 0, LAYOUT_W * TILE, LAYOUT_H * TILE).setOrigin(0).setDepth(100000).setVisible(false);
  }

  private updateFog(me: { x: number; y: number } | null, show: boolean) {
    const fog = this.fog;
    if (!fog) return;
    fog.setVisible(show && !!me);
    if (!show || !me) return;
    fog.fill(0x0a0605, 0.94);
    fog.erase(this.fogBrush!, me.x, me.y - 30);
  }

  /** Tall props (columns, trees…) fade when a player walks behind them so nobody hides in the art. */
  private tallProps: Phaser.GameObjects.Image[] = [];

  private buildProps() {
    const decor = this.textures.get('hue-decor');
    for (const p of HUE_PROPS) {
      const atlas = decor.has(p.key) ? 'hue-decor' : 'hue-bansoc';
      const img = this.add.image(p.x, p.y, atlas, p.key).setOrigin(0.5, 1);
      img.setDepth(p.wall ? -5 : p.y);
      if (!p.wall && img.height >= 150) this.tallProps.push(img);
    }
  }

  private fadeTallProps(x: number, y: number) {
    for (const img of this.tallProps) {
      const b = img.getBounds();
      const behind = y < img.y - 4 && y > b.top + 10 && x > b.left + 6 && x < b.right - 6;
      const a = behind ? 0.45 : 1;
      if (Math.abs(img.alpha - a) > 0.01) img.setAlpha(img.alpha + (a - img.alpha) * 0.2);
    }
  }

  private buildStations() {
    for (const st of HUE_STATIONS) {
      const ring = this.add.image(st.x, st.y, 'hue', 'task-marker').setDisplaySize(84, 84).setDepth(-4).setAlpha(0.9);
      const icon = this.add.image(st.x, st.y - 6, 'hue-bansoc', st.icon).setDisplaySize(52, 52).setDepth(st.y - 20);
      icon.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tryTask(st.id));
      this.tweens.add({ targets: ring, alpha: 0.45, scale: ring.scale * 1.08, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
      this.stationSprites.set(st.id, { icon, ring });
    }
  }

  /** Highlight only the stations assigned to me; finished / foreign stations are dimmed. */
  private refreshStations() {
    const me = useStore.getState().me;
    const mine = new Set(me?.tasks ?? []);
    const done = new Set(me?.completedTasks ?? []);
    for (const [id, s] of this.stationSprites) {
      const active = mine.has(id) && !done.has(id);
      s.icon.setTint(active ? 0xffffff : 0x777777).setAlpha(active ? 1 : 0.55);
      s.ring.setVisible(active);
    }
  }

  // ------------------------------------------------------------ network
  private bindRoom(r: Room) {
    for (const a of this.avatars.values()) a.c.destroy();
    this.avatars.clear();
    for (const b of this.bodies.values()) b.destroy();
    this.bodies.clear();
    this.pending = [];
    this.hasServerPos = false;
    const $ = getStateCallbacks(r);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players = $(r.state as any).players as any;
    players.onAdd((p: any, id: string) => {
      const av = this.makeAvatar(p.name, PLAYER_COLORS[p.color] ?? 0xffffff);
      av.name = p.name;
      av.alive = p.alive;
      av.c.setPosition(p.x, p.y);
      av.buf.push({ t: performance.now(), x: p.x, y: p.y });
      this.avatars.set(id, av);
      if (id === r.sessionId) {
        this.pred = { x: p.x, y: p.y };
        this.hasServerPos = true;
        this.cameras.main.startFollow(av.c, true, 0.18, 0.18);
      }
      this.syncBody(id, p, false);
      $(p).onChange(() => {
        av.label.setText(p.name);
        av.name = p.name;
        av.alive = p.alive;
        this.syncBody(id, p, true);
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
      this.bodies.get(id)?.destroy();
      this.bodies.delete(id);
    });
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
    return { c, base, tint, label, buf: [], dir: 0, moving: false, lastMoveAt: 0, name, alive: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private syncBody(id: string, p: any, live: boolean) {
    const existing = this.bodies.get(id);
    if (!p.body) {
      existing?.destroy();
      this.bodies.delete(id);
      return;
    }
    if (existing) return;
    const fresh = live && useStore.getState().room?.phase === 'explore';
    const splat = this.add.image(0, -4, 'ink-splat').setDisplaySize(96, 56).setAlpha(0.9);
    const shadow = this.add.image(0, -2, 'shadow').setDisplaySize(40, 16);
    const base = this.add.sprite(0, -6, 'player', 'walk-down-0').setOrigin(0.5, 1).setAngle(90).setAlpha(0.95);
    const tint = this.add.sprite(0, -6, 'player-tint', 'walk-down-0').setOrigin(0.5, 1).setAngle(90).setTint(PLAYER_COLORS[p.color] ?? 0xffffff).setAlpha(0.95);
    const mark = this.add.image(0, -30, 'body-marker').setDisplaySize(30, 30).setOrigin(0.5, 1);
    const c = this.add.container(p.bodyX, p.bodyY, [splat, shadow, base, tint, mark]).setDepth(p.bodyY - 1);
    this.tweens.add({ targets: mark, y: -40, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    this.bodies.set(id, c);
    if (!fresh || !this.canSee(p.bodyX, p.bodyY)) return;
    // ---- fresh kill on screen: blade flash -> victim topples -> ink bursts and pools
    const x = p.bodyX, y = p.bodyY;
    this.playFx('fx-kill-slash', x, y - 36);
    for (const s of [base, tint]) {
      s.setAngle(0);
      this.tweens.add({ targets: s, angle: 90, duration: 420, delay: 140, ease: 'Bounce.easeOut' });
    }
    mark.setAlpha(0);
    this.tweens.add({ targets: mark, alpha: 1, delay: 650, duration: 250 });
    splat.setScale(0.05);
    this.tweens.add({ targets: splat, scaleX: 96 / 256, scaleY: 56 / 256, delay: 260, duration: 520, ease: 'Cubic.easeOut' });
    this.burst('ink-drop', x, y - 30, { count: 26, speed: [90, 260], life: 650, scale: [0.35, 0.1], gravity: 520, tint: 0xffffff, add: false, delay: 160 });
    this.burst('spark', x, y - 34, { count: 14, speed: [120, 300], life: 380, scale: [0.6, 0], gravity: 0, tint: 0xff6a40, add: true, delay: 120 });
    this.shockRing(x, y - 20, 0xff3b2a, 90, 520);
    const cam = this.cameras.main;
    cam.flash(140, 255, 70, 50);
    cam.shake(260, 0.007);
    this.zoomPunch(1.1, 380);
    this.hitStop(110);
  }

  /** Particle explosion that cleans itself up. */
  private burst(
    tex: string,
    x: number,
    y: number,
    o: { count: number; speed: [number, number]; life: number; scale: [number, number]; gravity: number; tint: number; add: boolean; delay?: number },
  ) {
    const fire = () => {
      const em = this.add.particles(x, y, tex, {
        speed: { min: o.speed[0], max: o.speed[1] },
        angle: { min: 0, max: 360 },
        lifespan: o.life,
        scale: { start: o.scale[0], end: o.scale[1] },
        alpha: { start: 1, end: 0 },
        gravityY: o.gravity,
        tint: o.tint,
        blendMode: o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
        emitting: false,
      });
      em.setDepth(y + 10001);
      em.explode(o.count);
      this.time.delayedCall(o.life + 100, () => em.destroy());
    };
    if (o.delay) this.time.delayedCall(o.delay, fire);
    else fire();
  }

  private shockRing(x: number, y: number, color: number, radius: number, ms: number) {
    const ring = this.add.circle(x, y, 8).setStrokeStyle(5, color, 0.9).setDepth(y + 9999);
    ring.setScale(0.2, 0.12);
    this.tweens.add({ targets: ring, scaleX: radius / 8, scaleY: (radius / 8) * 0.55, alpha: 0, duration: ms, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  private zoomPunch(k: number, ms: number) {
    const cam = this.cameras.main;
    const z = cam.zoom;
    this.tweens.add({ targets: cam, zoom: z * k, duration: ms * 0.35, yoyo: true, hold: ms * 0.3, ease: 'Quad.easeOut', onComplete: () => cam.setZoom(z) });
  }

  /** A few frames of near-freeze to sell the impact. */
  private hitStop(ms: number) {
    this.tweens.timeScale = 0.15;
    this.anims.globalTimeScale = 0.15;
    setTimeout(() => {
      this.tweens.timeScale = 1;
      this.anims.globalTimeScale = 1;
    }, ms);
  }

  /** One-shot FX sprite in the world; destroyed when the animation ends. */
  private playFx(key: FxKey, x: number, y: number, follow?: Phaser.GameObjects.Container) {
    const fx = this.add.sprite(x, y, key, 0).setDisplaySize(FX[key].size, FX[key].size).setDepth(y + 10000);
    fx.play(key);
    const tick = follow ? () => fx.setPosition(follow.x, follow.y - 84) : null;
    if (tick) this.events.on('postupdate', tick);
    fx.once('animationcomplete', () => {
      if (tick) this.events.off('postupdate', tick);
      fx.destroy();
    });
  }

  /** Server cinematics -> matching in-world FX (the React overlay handles the full-screen part). */
  private onCinematic(c: { kind: string; at?: { x: number; y: number } }) {
    const me = room ? this.avatars.get(room.sessionId) : undefined;
    if (c.kind === 'shield' && c.at) {
      const { x, y } = c.at;
      this.playFx('fx-shield-block', x, y - 34);
      this.burst('spark', x, y - 34, { count: 22, speed: [140, 320], life: 520, scale: [0.7, 0], gravity: 120, tint: 0xffd36a, add: true });
      this.shockRing(x, y - 20, 0xffd36a, 110, 600);
      this.cameras.main.flash(160, 255, 220, 120);
      this.cameras.main.shake(180, 0.005);
      this.zoomPunch(1.06, 320);
    } else if (c.kind === 'witness' && me) {
      this.playFx('fx-witness', me.c.x, me.c.y - 84, me.c);
      this.cameras.main.shake(140, 0.004);
    } else if (c.kind === 'report') {
      // burst over the reported body (or over me when the body is out of view)
      const at = c.at && this.canSee(c.at.x, c.at.y) ? c.at : me ? { x: me.c.x, y: me.c.y } : null;
      if (!at) return;
      this.playFx('fx-report-burst', at.x, at.y - 46);
      this.shockRing(at.x, at.y - 10, 0xff5a3a, 120, 700);
      this.time.delayedCall(180, () => this.shockRing(at.x, at.y - 10, 0xffc04a, 150, 800));
      this.burst('spark', at.x, at.y - 40, { count: 16, speed: [100, 240], life: 600, scale: [0.6, 0], gravity: 0, tint: 0xffa040, add: true });
      this.cameras.main.shake(200, 0.004);
      this.zoomPunch(1.08, 420);
    }
  }

  /** Same rule as the fog: a living player only sees within vision radius and line of sight. */
  private canSee(x: number, y: number) {
    const r = room;
    const mine = r ? this.avatars.get(r.sessionId) : undefined;
    const iAmGhost = mine ? !mine.alive : false;
    const lobby = useStore.getState().room?.phase !== 'explore';
    if (iAmGhost || lobby || !mine) return true;
    const eye = { x: this.pred.x, y: this.pred.y - 30 };
    return Math.hypot(x - this.pred.x, y - this.pred.y) <= GAME.visionRadius && hasLineOfSight(this.grid, eye, { x, y: y - 30 });
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
    if (!s.me?.tasks.includes(id)) return s.toast({ text: 'Đây không phải nhiệm vụ của bạn.', kind: 'info' });
    if (dist(this.pred, st) > INTERACT_RADIUS) return s.toast({ text: `Lại gần “${st.title}” để làm nhiệm vụ.`, kind: 'info' });
    send('task:open', { taskId: id });
  }

  private interact() {
    const s = useStore.getState();
    const n = s.nearby;
    if (!n || uiBlocksMovement()) return;
    if (n.kind === 'task') this.tryTask(n.id);
    else if (n.kind === 'report') send('report', {});
    else if (n.kind === 'emergency') send('emergency', {});
  }

  private doKill() {
    const s = useStore.getState();
    if (s.me?.faction !== 'killer' || s.room?.phase !== 'explore' || uiBlocksMovement()) return;
    send('kill', {});
  }

  private doReport() {
    const s = useStore.getState();
    if (s.room?.phase !== 'explore' || uiBlocksMovement()) return;
    send('report', {});
  }

  private myView() {
    const s = useStore.getState();
    return s.room?.players.find((p) => p.id === s.sessionId);
  }

  private computeNearby(): Nearby {
    const s = useStore.getState();
    if (s.room?.phase !== 'explore') return null;
    const me = this.myView();
    const alive = me?.alive !== false;
    if (alive) {
      const body = s.room.players.find((p) => p.body && dist(this.pred, { x: p.bodyX, y: p.bodyY }) <= GAME.reportRange);
      if (body) return { kind: 'report', title: `Báo cáo thi thể của ${body.name}` };
    }
    let best: Nearby = null;
    let bestD = INTERACT_RADIUS;
    const done = new Set(s.me?.completedTasks ?? []);
    const mine = new Set(s.me?.tasks ?? []);
    for (const st of HUE_STATIONS) {
      if (!mine.has(st.id)) continue;
      const d = dist(this.pred, st);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'task', id: st.id, title: st.title, done: done.has(st.id) };
      }
    }
    if (alive && dist(this.pred, MEETING_POINT) < INTERACT_RADIUS + 50 && bestD >= INTERACT_RADIUS) {
      best = { kind: 'emergency', title: 'Đánh chuông Ngũ Phụng (họp khẩn)', used: !!me?.emergencyUsed };
    }
    return best;
  }

  /** Is someone killable within range? (client hint only; the server decides) */
  private computeKillTarget(): boolean {
    const s = useStore.getState();
    if (s.me?.faction !== 'killer' || s.room?.phase !== 'explore') return false;
    const me = this.myView();
    if (!me?.alive) return false;
    const mates = new Set(s.me.mates ?? []);
    for (const [id, av] of this.avatars) {
      if (id === s.sessionId || !av.alive || mates.has(av.name)) continue;
      if (dist(this.pred, { x: av.c.x, y: av.c.y }) <= GAME.killRange) return true;
    }
    return false;
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
      const dts = Math.min(dtMs, 100) / 1000;
      const decay = Math.exp(-dts * 12);
      this.renderOffset.x *= decay;
      this.renderOffset.y *= decay;
      const tx = this.pred.x + this.renderOffset.x, ty = this.pred.y + this.renderOffset.y;
      // pred advances in 30Hz steps; ease the sprite toward it every frame so motion is smooth at any fps
      const gap = Math.hypot(tx - mine.c.x, ty - mine.c.y);
      if (gap > 96) mine.c.setPosition(tx, ty);
      else {
        const k = 1 - Math.exp(-dts * 30);
        mine.c.setPosition(mine.c.x + (tx - mine.c.x) * k, mine.c.y + (ty - mine.c.y) * k);
      }
      this.animate(mine, this.myDir, this.myMoving);
      this.fadeTallProps(mine.c.x, mine.c.y);
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
    const iAmGhost = mine ? !mine.alive : false;
    const lobby = useStore.getState().room?.phase !== 'explore';
    const limited = !iAmGhost && !lobby && !!mine;
    const eye = { x: this.pred.x, y: this.pred.y - 30 };
    const canSee = (x: number, y: number) =>
      !limited || (Math.hypot(x - this.pred.x, y - this.pred.y) <= GAME.visionRadius && hasLineOfSight(this.grid, eye, { x, y: y - 30 }));
    for (const [id, av] of this.avatars) {
      av.c.setDepth(av.c.y);
      if (id === r.sessionId) av.c.setVisible(true).setAlpha(av.alive ? 1 : 0.5);
      else if (!av.alive) av.c.setVisible(iAmGhost).setAlpha(0.45);
      else av.c.setVisible(canSee(av.c.x, av.c.y)).setAlpha(1);
    }
    for (const b of this.bodies.values()) b.setVisible(canSee(b.x, b.y));
    this.updateFog(limited ? this.pred : null, limited);

    // UI bridge (only on change)
    const nearby = this.computeNearby();
    const nk = JSON.stringify(nearby);
    if (nk !== this.lastNearbyKey) {
      this.lastNearbyKey = nk;
      useStore.getState().set({ nearby });
    }
    const kt = this.computeKillTarget();
    if (kt !== useStore.getState().killTarget) useStore.getState().set({ killTarget: kt });
    const px = Math.round((this.pred.x / TILE) * 2) / 2;
    const py = Math.round((this.pred.y / TILE) * 2) / 2;
    const cur = useStore.getState().pos;
    if (!cur || cur.x !== px || cur.y !== py) useStore.getState().set({ pos: { x: px, y: py } });
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
