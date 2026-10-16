import Phaser from 'phaser';
import { getStateCallbacks, type Room } from 'colyseus.js';
import {
  AREA_ORDER,
  GAME,
  SABOTAGE,
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
  LOBBY_GATE,
  getGrid,
  getLobbyGrid,
  hasLineOfSight,
  mapSkin,
  playerArt,
  stepMovement,
  type TaskId,
} from '@hidden-truth/shared';
import { fix, onRoom, room, send } from '../net';
import { KILLER_NAME_COLOR, uiBlocksMovement, useStore, type Nearby } from '../store';

const NAME_COLOR = '#fff8e8';
/** lobby: a ready player's nameplate turns jade */
const READY_NAME_COLOR = '#8dffb4';

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
  'fx-shield-dome': { rate: 9, size: 120 },
  'fx-soul-rise': { rate: 7, size: 110 },
} as const;
/** Action-sheet rows (tools/char-art): 4 frames each, drawn facing left. */
const POSES = { strike: 14, die: 8, guard: 10 } as const;
type Pose = keyof typeof POSES;
type FxKey = keyof typeof FX;

/** Hand-held oil lamp (tools/paint/lantern.py): where the hand is per facing, and whether the body hides it. */
const LAMP_SCALE = 0.38;
const LAMP_GRIP: Record<(typeof DIRS)[number], { x: number; y: number; behind: boolean }> = {
  down: { x: 14, y: -29, behind: false },
  left: { x: -9, y: -29, behind: false },
  right: { x: 9, y: -29, behind: false },
  up: { x: -14, y: -29, behind: true },
};
const GLOW_SIZE = 230;

type Snap = { t: number; x: number; y: number };
type Avatar = {
  c: Phaser.GameObjects.Container;
  base: Phaser.GameObjects.Sprite;
  tint: Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.Text;
  /** rounded backing behind the name, redrawn whenever the text or its colour changes */
  plate: Phaser.GameObjects.Graphics;
  lamp: Phaser.GameObjects.Image;
  /** warm pool on the floor under the lamp; lives outside the container so it sits below every sprite */
  glow: Phaser.GameObjects.Image;
  /** per-avatar phase so the flames don't flicker in sync */
  seed: number;
  buf: Snap[];
  dir: number;
  moving: boolean;
  lastMoveAt: number;
  name: string;
  alive: boolean;
  /** while performance.now() < posedUntil an action pose owns the sprites and animate() keeps off */
  posedUntil: number;
};

export class GameScene extends Phaser.Scene {
  private grid = getGrid();
  private lobbyGrid = getLobbyGrid();
  private lobbyGate?: Phaser.GameObjects.Image;
  /** phase + ready ids last painted onto the nameplates/gate */
  private lobbyKey = '';
  private avatars = new Map<string, Avatar>();
  private stationSprites = new Map<TaskId, { icon: Phaser.GameObjects.Image; ring: Phaser.GameObjects.Image; top: number; fx: Phaser.GameObjects.GameObject[]; marker: Phaser.GameObjects.Container }>();
  /** Props as placed, so a station can adopt the object standing on it. */
  private propImgs: Phaser.GameObjects.Image[] = [];
  /** Bouncing "tap me" badge over the task station I'm standing at. */
  private tapBadge?: Phaser.GameObjects.Container;
  private tapBadgeFor: TaskId | null = null;
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
  /** warm wash over my whole sight circle: the room reads as lit by my lamp, not by daylight */
  private myLight?: Phaser.GameObjects.Image;

  constructor() {
    super('game');
  }

  private skin = mapSkin(useStore.getState().room?.mapSlug);

  preload() {
    this.skin = mapSkin(useStore.getState().room?.mapSlug);
    // the scene is remounted when the lobby switches map (PhaserGame key), so the skin is fixed for its lifetime
    const art = this.skin.art;
    if (art.tileset) this.load.spritesheet('map-tiles', `${A}/${art.tileset.file}.webp`, { frameWidth: TILE, frameHeight: TILE });
    // station icons (+ the task-marker ring, maybe in its own atlas)
    this.load.atlas('map-stations', `${A}/${art.stations}.webp`, `${A}/${art.stations}.json`);
    if (art.marker) this.load.atlas('map-marker', `${A}/${art.marker}.webp`, `${A}/${art.marker}.json`);
    // painted (raster) props + room decor, and the pre-rendered floor/wall bake (tools/paint/*.py)
    this.load.atlas('map-decor', `${A}/${art.decor}.webp`, `${A}/${art.decor}.json`);
    this.load.image('map-floor', `${A}/${art.floorBake}.webp`);
    // costume follows the map (Huế: áo dài + khăn đóng…), common avatar otherwise
    const pa = playerArt(this.skin.slug);
    this.load.atlas('player', `${A}/${pa.atlas}.webp`, `${A}/${pa.atlas}.json`);
    this.load.atlas('player-tint', `${A}/${pa.tint}.webp`, `${A}/${pa.tint}.json`);
    this.load.atlas('player-action', `${A}/${pa.action}.webp`, `${A}/${pa.action}.json`);
    this.load.atlas('player-action-tint', `${A}/${pa.actionTint}.webp`, `${A}/${pa.actionTint}.json`);
    this.load.image('shadow', `${A}/common/characters/shadow.webp`);
    this.load.image('lantern', `${A}/common/characters/lantern.webp`);
    this.load.image('lantern-glow', `${A}/common/characters/lantern-glow.webp`);
    // 2x raster of a 208x108 SVG, shown at 1x so it stays crisp on hi-dpi
    this.load.svg('lobby-gate', `${A}/common/props/lobby-gate.svg`, { width: 416, height: 216 });
    this.load.image('body-marker', `${A}/common/ui/body-marker.webp`);
    for (const k of Object.keys(FX)) this.load.spritesheet(k, `${A}/common/ui/fx/${k}.webp`, { frameWidth: 256, frameHeight: 256 });
    for (const k of ['spark', 'ink-drop', 'ink-splat']) this.load.image(k, `${A}/common/ui/fx/${k}.webp`);
  }

  create() {
    this.buildMap();
    this.buildProps();
    this.buildStations();
    this.buildLobbyGate();
    for (const tex of ['player', 'player-tint'])
      DIRS.forEach((d) =>
        this.anims.create({
          key: `${tex}-walk-${d}`,
          frames: [0, 1, 2, 3].map((i) => ({ key: tex, frame: `walk-${d}-${i}` })),
          frameRate: 9,
          repeat: -1,
        }),
      );

    for (const tex of ['player-action', 'player-action-tint'])
      for (const [row, rate] of Object.entries(POSES))
        this.anims.create({ key: `${tex}-${row}`, frames: [0, 1, 2, 3].map((i) => ({ key: tex, frame: `${row}-${i}` })), frameRate: rate });

    for (const [k, v] of Object.entries(FX)) this.anims.create({ key: k, frames: this.anims.generateFrameNumbers(k, { start: 0, end: FX_FRAMES - 1 }), frameRate: v.rate });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,J,SPACE', false) as Record<string, Phaser.Input.Keyboard.Key>;
    // Clicking the map releases focus from any HTML input (e.g. chat) so movement keys work again.
    this.input.on('pointerdown', () => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && ae !== document.body && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) ae.blur();
    });
    // one key per action, under the right hand while the left one is on WASD: J task/fix, K kill, L report, I sabotage, B bell; E/Space/R/Q stay as aliases
    kb.on('keydown-J', (e: KeyboardEvent) => !e.repeat && this.interact());
    kb.on('keydown-E', (e: KeyboardEvent) => !e.repeat && this.interact());
    kb.on('keydown-SPACE', (e: KeyboardEvent) => !e.repeat && this.interact());
    kb.on('keyup-J', () => fix(false));
    kb.on('keyup-E', () => fix(false));
    kb.on('keyup-SPACE', () => fix(false));
    kb.on('keydown-K', () => this.doKill());
    kb.on('keydown-L', () => this.doReport());
    kb.on('keydown-R', () => this.doReport());
    kb.on('keydown-B', (e: KeyboardEvent) => !e.repeat && this.ringBell());

    this.buildFog();
    const cam = this.cameras.main;
    cam.setBounds(0, 0, LAYOUT_W * TILE, LAYOUT_H * TILE);
    cam.setBackgroundColor('#1b120d');
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', () => this.onResize());

    this.unbind.push(onRoom((r) => this.bindRoom(r)));
    this.unbind.push(useStore.subscribe((s, prev) => s.cinematic && s.cinematic !== prev.cinematic && this.onCinematic(s.cinematic)));
    this.unbind.push(useStore.subscribe((s, prev) => s.me?.killerIds !== prev.me?.killerIds && this.refreshNameColors()));
    this.unbind.push(useStore.subscribe((s) => this.lobbyKeyOf(s.room) !== this.lobbyKey && this.refreshNameColors()));
    this.unbind.push(useStore.subscribe((s, prev) => (s.room?.sabotage ?? '') !== (prev.room?.sabotage ?? '') && this.onSabotage(s.room?.sabotage ?? '')));
    this.unbind.push(useStore.subscribe((s, prev) => (s.me?.completedTasks !== prev.me?.completedTasks || s.me?.tasks !== prev.me?.tasks) && this.refreshStations()));
    this.events.once('shutdown', () => this.unbind.forEach((u) => u()));
  }

  /** Phaser only resizes a camera that still matched the previous game size; the burst of resizes during a phone
   *  rotation can break that, leaving a portrait-sized viewport on a landscape canvas (player off-screen). */
  private onResize() {
    const { width, height } = this.scale;
    const cam = this.cameras.main;
    cam.setViewport(0, 0, width, height);
    this.fitZoom();
    const me = room ? this.avatars.get(room.sessionId) : undefined;
    if (me) cam.centerOn(me.c.x, me.c.y);
  }

  private fitZoom() {
    const { width, height } = this.scale;
    const z = Phaser.Math.Clamp(Math.min(width / 960, height / 640), 0.7, 1.6);
    this.cameras.main.setZoom(Math.round(z * 4) / 4 || 1);
  }

  // ------------------------------------------------------------ world
  private buildMap() {
    if (this.textures.exists('map-floor')) {
      this.add.image(0, 0, 'map-floor').setOrigin(0).setDepth(-10);
      return;
    }
    const order = this.skin.art.tileset?.order;
    if (!order || !this.textures.exists('map-tiles')) return;
    const map = this.make.tilemap({ tileWidth: TILE, tileHeight: TILE, width: LAYOUT_W, height: LAYOUT_H });
    const ts = map.addTilesetImage('map-tiles', 'map-tiles', TILE, TILE, 0, 0)!;
    const layer = map.createBlankLayer('floor', ts, 0, 0)!;
    const cols = order.length * 2;
    const idx = (name: string, x: number, y: number) => {
      const i = order.indexOf(name);
      return (y % 2) * cols + i * 2 + (x % 2);
    };
    const g = this.grid;
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const a = g.area[y * g.w + x];
        if (a >= 0) {
          const info = this.skin.areas[AREA_ORDER[a]];
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
    // lamp falloff: bright near the flame, a long dim shoulder, black just past the vision radius
    const gr = ctx.createRadialGradient(size / 2, size / 2, R * 0.3, size / 2, size / 2, R + 24);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.55, 'rgba(255,255,255,0.86)');
    gr.addColorStop(0.85, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    this.fogBrush = this.make.image({ key: 'fog-brush', add: false }).setOrigin(0.5);
    this.fog = this.add.renderTexture(0, 0, LAYOUT_W * TILE, LAYOUT_H * TILE).setOrigin(0).setDepth(100000).setVisible(false);
    this.myLight = this.add.image(0, 0, 'lantern-glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(99999).setVisible(false);
  }

  private updateFog(me: { x: number; y: number } | null, show: boolean) {
    const fog = this.fog;
    if (!fog) return;
    fog.setVisible(show && !!me);
    this.myLight?.setVisible(show && !!me);
    if (!show || !me) return;
    fog.fill(0x0a0605, 0.94);
    // the lamp flame breathes the edge of the light a little (cosmetic; canSee() uses the steady radius)
    const t = performance.now() / 1000;
    this.fogBrush!.setScale(this.vis * (1 + Math.sin(t * 11) * 0.012 + Math.sin(t * 4.1) * 0.01));
    fog.erase(this.fogBrush!, me.x, me.y - 30);
    const d = GAME.visionRadius * 2 * this.fogBrush!.scaleX;
    this.myLight!.setPosition(me.x, me.y - 30).setDisplaySize(d, d).setAlpha(0.2 + Math.sin(t * 7.3) * 0.015);
  }

  // ------------------------------------------------------------ sabotage
  /** 1 = normal vision; eased toward SABOTAGE.blindVision during a blind sabotage */
  private vis = 1;
  private wardMark?: Phaser.GameObjects.Container;

  private onSabotage(kind: string) {
    const cam = this.cameras.main;
    const killer = useStore.getState().me?.faction === 'killer';
    if (kind === 'blind' && !killer) {
      cam.flash(520, 255, 244, 214);
      cam.shake(420, 0.008);
    } else if (kind === 'ward') cam.flash(260, 200, 40, 30);
    this.wardMark?.destroy();
    this.wardMark = undefined;
    const r = useStore.getState().room;
    if (kind !== 'ward' || !r) return;
    // the broken lime ring on the floor: dashed arcs with a gap, over a red pulse
    const g = this.add.graphics();
    g.fillStyle(0xd23a2a, 0.22).fillCircle(0, 0, 54);
    g.lineStyle(7, 0xf3efe0, 0.95);
    for (let a = 0; a < 360; a += 30) {
      if (a >= 210 && a < 300) continue;
      g.beginPath();
      g.arc(0, 0, 40, Phaser.Math.DegToRad(a), Phaser.Math.DegToRad(a + 18));
      g.strokePath();
    }
    const pulse = this.add.circle(0, 0, 40).setStrokeStyle(3, 0xff5a3c, 0.9);
    this.tweens.add({ targets: pulse, scale: 1.7, alpha: 0, duration: 1100, repeat: -1 });
    this.wardMark = this.add.container(r.sabotageX, r.sabotageY, [g, pulse]).setScale(1, 0.62).setDepth(r.sabotageY - 48);
  }

  /** Tall props (columns, trees…) fade when a player walks behind them so nobody hides in the art. */
  private tallProps: Phaser.GameObjects.Image[] = [];

  private buildProps() {
    const decor = this.textures.get('map-decor');
    for (const p of this.skin.props) {
      const atlas = decor.has(p.key) ? 'map-decor' : 'map-stations';
      const img = this.add.image(p.x, p.y, atlas, p.key).setOrigin(0.5, 1);
      img.setDepth(p.wall ? -5 : p.y);
      if (!p.wall && img.height >= 150) this.tallProps.push(img);
      if (!p.wall) this.propImgs.push(img);
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
    this.makeBeamTexture();
    const markerAtlas = this.skin.art.marker ? 'map-marker' : 'map-stations';
    for (const st of this.skin.stations) {
      const ring = this.add.image(st.x, st.y, markerAtlas, 'task-marker').setDisplaySize(84, 84).setDepth(-4).setAlpha(0.9);
      const icon = this.add.image(st.x, st.y - 6, 'map-stations', st.icon).setDisplaySize(52, 52).setDepth(st.y - 20);
      // the object standing on the station (bia, bàn khắc…) is the station: the floating icon would just cover it
      const prop = this.propImgs.find((img) => Math.abs(img.x - st.x) < 24 && img.y - st.y > -8 && img.y - st.y < 40);
      const hit = prop ?? icon;
      if (prop) icon.setVisible(false);
      hit.setInteractive({ useHandCursor: true, pixelPerfect: false }).on('pointerdown', () => this.tryTask(st.id));
      this.tweens.add({ targets: ring, alpha: 0.6, scale: ring.scale * 1.12, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
      const top = prop ? prop.getBounds().top : st.y - 34;
      // active stations shout a bit: a light shaft, a ripple on the floor and a bobbing "!" so nobody walks past them
      // drawn in front (additive, soft) so walls and the prop itself never hide it
      const beam = this.add.image(st.x, st.y + 10, 'station-beam').setOrigin(0.5, 1).setDepth(st.y + 40).setBlendMode(Phaser.BlendModes.ADD);
      beam.setDisplaySize(70, st.y + 10 - top + 150);
      this.tweens.add({ targets: beam, alpha: { from: 0.75, to: 0.35 }, yoyo: true, repeat: -1, duration: 1100, ease: 'Sine.inOut' });
      const ripple = this.add.ellipse(st.x, st.y + 6, 60, 26).setStrokeStyle(4, 0xffa928, 1).setDepth(-4);
      this.tweens.add({ targets: ripple, scale: { from: 0.6, to: 1.9 }, alpha: { from: 1, to: 0 }, repeat: -1, duration: 1500, ease: 'Cubic.easeOut' });
      const marker = this.buildMarker(st.x, top - 10);
      this.stationSprites.set(st.id, { icon, ring, top, fx: [beam, ripple], marker });
    }
    this.buildTapBadge();
  }

  /** Soft vertical light shaft, drawn once to a canvas texture. */
  private makeBeamTexture() {
    if (this.textures.exists('station-beam')) this.textures.remove('station-beam');
    const tex = this.textures.createCanvas('station-beam', 64, 256);
    if (!tex) return;
    const c = tex.getContext();
    const v = c.createLinearGradient(0, 0, 0, 256);
    v.addColorStop(0, 'rgba(255,214,110,0)');
    v.addColorStop(0.35, 'rgba(255,190,70,0.5)');
    v.addColorStop(1, 'rgba(255,170,40,0.8)');
    c.fillStyle = v;
    c.fillRect(0, 0, 64, 256);
    // fade the sides so it reads as a beam, not a box
    c.globalCompositeOperation = 'destination-in';
    const h = c.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, 'rgba(0,0,0,0)');
    h.addColorStop(0.5, 'rgba(0,0,0,1)');
    h.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = h;
    c.fillRect(0, 0, 64, 256);
    tex.refresh();
  }

  /** Golden "!" diamond bobbing over a station. */
  private buildMarker(x: number, y: number) {
    const glow = this.add.circle(0, 0, 20, 0xffd36e, 0.35);
    const gem = this.add.rectangle(0, 0, 24, 24, 0xffd36e).setStrokeStyle(3, 0x7a3e10).setAngle(45);
    const bang = this.add.text(0, 1, '!', { fontFamily: 'Be Vietnam Pro, system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#5a2a08' }).setOrigin(0.5);
    const inner = this.add.container(0, 0, [glow, gem, bang]);
    const marker = this.add.container(x, y, [inner]).setDepth(99990).setScale(1.4);
    this.tweens.add({ targets: inner, y: -10, yoyo: true, repeat: -1, duration: 650, ease: 'Sine.inOut' });
    this.tweens.add({ targets: glow, scale: { from: 0.8, to: 1.4 }, alpha: { from: 0.45, to: 0 }, repeat: -1, duration: 1100 });
    return marker;
  }

  private buildTapBadge() {
    const touch = this.sys.game.device.input.touch;
    const label = this.add
      // a quiet hint, not a button: the real action is the task button / J key
      .text(0, 0, touch ? 'Làm nhiệm vụ' : 'J · Làm nhiệm vụ', {
        fontFamily: 'Be Vietnam Pro, system-ui, sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: '#ffe08a',
        backgroundColor: 'rgba(27, 18, 13, 0.72)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1);
    const tip = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 4, 0x1b120d, 0.72).setOrigin(0.5, 0);
    const inner = this.add.container(0, 0, [tip, label]);
    this.tapBadge = this.add.container(0, 0, [inner]).setDepth(100001).setVisible(false);
    label.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.tapBadgeFor && this.tryTask(this.tapBadgeFor));
    this.tweens.add({ targets: inner, y: -4, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
  }

  /** Show the tap badge over the task station in reach (not done yet); hide it otherwise. */
  private updateTapBadge(n: Nearby) {
    const id = n?.kind === 'task' && !n.done ? n.id : null;
    this.tapBadgeFor = id;
    if (!this.tapBadge) return;
    const s = id && this.stationSprites.get(id);
    this.refreshStations();
    if (!s) return void this.tapBadge.setVisible(false);
    this.tapBadge.setPosition(s.ring.x, s.top - 6).setVisible(true);
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
      for (const o of s.fx) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(active);
      // the tap badge takes the "!" spot while the player stands at the station
      s.marker.setVisible(active && this.tapBadgeFor !== id);
    }
  }

  // ------------------------------------------------------------ network
  private bindRoom(r: Room) {
    for (const a of this.avatars.values()) this.dropAvatar(a);
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
      this.refreshNameColors();
      if (id === r.sessionId) {
        this.pred = { x: p.x, y: p.y };
        this.hasServerPos = true;
        this.cameras.main.startFollow(av.c, true, 0.18, 0.18);
      }
      this.syncBody(id, p, false);
      $(p).onChange(() => {
        if (av.name !== p.name) {
          av.label.setText(p.name);
          this.drawPlate(av);
        }
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
      const av = this.avatars.get(id);
      if (av) this.dropAvatar(av);
      this.avatars.delete(id);
      this.bodies.get(id)?.destroy();
      this.bodies.delete(id);
    });
    this.refreshStations();
  }

  private lobbyKeyOf(r: ReturnType<typeof useStore.getState>['room']) {
    if (r?.phase !== 'lobby') return r?.phase ?? '';
    return 'lobby:' + r.players.filter((p) => p.ready).map((p) => p.id).join(',');
  }

  /** Âm Binh see every Âm Binh's nameplate in red; in the lobby ready players go jade; otherwise the default colour. */
  private refreshNameColors() {
    const s = useStore.getState();
    this.lobbyKey = this.lobbyKeyOf(s.room);
    const lobby = s.room?.phase === 'lobby';
    this.lobbyGate?.setVisible(lobby);
    const killers = s.me?.killerIds ?? [];
    const ready = new Set(lobby ? s.room!.players.filter((p) => p.ready).map((p) => p.id) : []);
    for (const [id, av] of this.avatars) {
      av.label.setColor(killers.includes(id) ? KILLER_NAME_COLOR : ready.has(id) ? READY_NAME_COLOR : NAME_COLOR);
      this.drawPlate(av, ready.has(id));
    }
  }

  private drawPlate(av: Avatar, ready = av.label.style.color === READY_NAME_COLOR) {
    const { label: l, plate: g } = av;
    const w = l.width + 16;
    const h = l.height + 4;
    g.clear();
    g.fillStyle(ready ? 0x12301f : 0x1a0f08, 0.78);
    g.fillRoundedRect(-w / 2, l.y - h + 2, w, h, h / 2);
    g.lineStyle(1.5, ready ? 0x6fe3a0 : 0xc89a4a, ready ? 0.95 : 0.55);
    g.strokeRoundedRect(-w / 2, l.y - h + 2, w, h, h / 2);
  }

  /** Closed gate on the courtyard's only exit while the lobby waits (LOBBY_GATE is solid in the lobby grid). */
  private buildLobbyGate() {
    const [gx, gy, gw] = LOBBY_GATE;
    const feet = (gy + 1) * TILE - 8;
    this.lobbyGate = this.add
      .image((gx + gw / 2) * TILE, feet, 'lobby-gate')
      .setOrigin(0.5, 104 / 108)
      .setDisplaySize(196, 102)
      .setDepth(feet)
      .setVisible(useStore.getState().room?.phase === 'lobby');
    // whoever waits right behind it stays visible
    this.tallProps.push(this.lobbyGate);
  }

  private makeAvatar(name: string, color: number): Avatar {
    const shadow = this.add.image(0, -2, 'shadow').setDisplaySize(34, 14);
    const base = this.add.sprite(0, 0, 'player', 'walk-down-0').setOrigin(0.5, 1);
    const tint = this.add.sprite(0, 0, 'player-tint', 'walk-down-0').setOrigin(0.5, 1).setTint(color);
    const label = this.add
      .text(0, -70, name, { fontFamily: '"Be Vietnam Pro", system-ui, sans-serif', fontSize: '13px', fontStyle: '600', color: NAME_COLOR })
      .setOrigin(0.5, 1)
      .setShadow(0, 1, 'rgba(0,0,0,0.6)', 2)
      .setResolution(2);
    const plate = this.add.graphics();
    const lamp = this.add.image(0, 0, 'lantern').setOrigin(0.5, 0.05).setScale(LAMP_SCALE).setVisible(false);
    const glow = this.add.image(0, 0, 'lantern-glow').setDisplaySize(GLOW_SIZE, GLOW_SIZE * 0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(-5).setVisible(false);
    const c = this.add.container(0, 0, [shadow, base, tint, lamp, plate, label]);
    const av: Avatar = { c, base, tint, label, plate, lamp, glow, seed: Math.random() * 100, buf: [], dir: 0, moving: false, lastMoveAt: 0, name, alive: true, posedUntil: 0 };
    this.drawPlate(av, false);
    return av;
  }

  private dropAvatar(av: Avatar) {
    av.c.destroy();
    av.glow.destroy();
  }

  /** In the dark every living player carries an oil lamp: it swings with the stride, the flame flickers and lights the floor. */
  private updateLamp(av: Avatar, dir: number, moving: boolean, on: boolean, now: number) {
    const show = on && av.alive && av.c.visible && !av.posedUntil;
    av.lamp.setVisible(show);
    av.glow.setVisible(show);
    if (!show) return;
    const d = DIRS[dir] ?? 'down';
    const g = LAMP_GRIP[d];
    const t = now / 1000 + av.seed;
    // pendulum: big swing while walking (sideways when walking up/down, fore-aft is just a small bob when walking sideways)
    const swing = moving ? (d === 'left' || d === 'right' ? 7 : 16) : 3;
    av.lamp.setAngle(Math.sin(t * (moving ? 9 : 1.6)) * swing);
    av.lamp.setPosition(g.x, g.y + (moving ? Math.abs(Math.sin(t * 9)) * -1.5 : 0));
    // behind the body when walking away from the camera, in front otherwise
    if (g.behind) av.c.moveBelow(av.lamp, av.base);
    else av.c.moveAbove(av.lamp, av.tint);
    const flick = 0.92 + Math.sin(t * 13) * 0.04 + Math.sin(t * 29.7) * 0.03 + Math.sin(t * 5.3) * 0.02;
    av.glow.setPosition(av.c.x + g.x, av.c.y + g.y + 18).setAlpha(0.42 * flick);
    av.glow.setDisplaySize(GLOW_SIZE * flick, GLOW_SIZE * 0.8 * flick);
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
    const base = this.add.sprite(0, 2, 'player-action', 'die-3').setOrigin(0.5, 1).setAlpha(0.95);
    const tint = this.add.sprite(0, 2, 'player-action-tint', 'die-3').setOrigin(0.5, 1).setTint(PLAYER_COLORS[p.color] ?? 0xffffff).setAlpha(0.95);
    const mark = this.add.image(0, -30, 'body-marker').setDisplaySize(30, 30).setOrigin(0.5, 1);
    const c = this.add.container(p.bodyX, p.bodyY, [splat, shadow, base, tint, mark]).setDepth(p.bodyY - 1);
    this.tweens.add({ targets: mark, y: -40, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    this.bodies.set(id, c);
    if (!fresh || !this.canSee(p.bodyX, p.bodyY)) return;
    // ---- fresh kill on screen: blade flash -> victim topples -> ink bursts and pools
    const x = p.bodyX, y = p.bodyY;
    this.playFx('fx-kill-slash', x, y - 36);
    // hit -> stagger -> collapse -> lying (die-3 is the last frame, so the anim rests on it); the soul leaves after
    base.play('player-action-die');
    tint.play('player-action-tint-die');
    this.time.delayedCall(560, () => this.playFx('fx-soul-rise', x, y - 46));
    mark.setAlpha(0);
    this.tweens.add({ targets: mark, alpha: 1, delay: 650, duration: 250 });
    splat.setScale(0.05);
    this.tweens.add({ targets: splat, scaleX: 96 / 256, scaleY: 56 / 256, delay: 260, duration: 520, ease: 'Cubic.easeOut' });
    this.burst('ink-drop', x, y - 30, { count: 26, speed: [90, 260], life: 650, scale: [0.35, 0.1], gravity: 520, tint: 0xffffff, add: false, delay: 160 });
    // no red flash / shake / zoom: bystanders must only see the act itself, so a kill in a crowd can go unnoticed
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
  private onCinematic(c: { kind: string; at?: { x: number; y: number }; actor?: { name: string }; victim?: { name: string } }) {
    const me = room ? this.avatars.get(room.sessionId) : undefined;
    const byName = (n?: string) => (n ? [...this.avatars.values()].find((a) => a.name === n && a.alive) : undefined);
    const attacker = byName(c.actor?.name);
    // attacker swings toward the target (or toward where the hit landed)
    const target = byName(c.victim?.name);
    const tx = target?.c.x ?? c.at?.x;
    if ((c.kind === 'kill' || c.kind === 'witness' || c.kind === 'shield') && attacker && tx !== undefined) this.pose(attacker, 'strike', tx > attacker.c.x, 520);
    // the attacker dashes in for the blow (sprite offset only; the container follows the server)
    if ((c.kind === 'kill' || c.kind === 'witness') && attacker && tx !== undefined) {
      const toward = tx > attacker.c.x ? 1 : -1;
      this.tweens.add({ targets: [attacker.base, attacker.tint], x: 18 * toward, duration: 110, yoyo: true, hold: 160, ease: 'Cubic.easeOut' });
    }
    if (c.kind === 'shield' && c.at) {
      const { x, y } = c.at;
      if (target && attacker) {
        this.pose(target, 'guard', attacker.c.x > target.c.x, 700);
        // the dome throws the attacker back a step (sprite offset only; the container follows the server)
        const away = attacker.c.x < target.c.x ? -1 : 1;
        this.tweens.add({ targets: [attacker.base, attacker.tint], x: 12 * away, duration: 140, delay: 90, yoyo: true, hold: 220, ease: 'Cubic.easeOut' });
      }
      this.playFx('fx-shield-dome', x, y - 30);
      this.playFx('fx-shield-block', x, y - 34);
      this.burst('spark', x, y - 34, { count: 22, speed: [140, 320], life: 520, scale: [0.7, 0], gravity: 120, tint: 0xffd36a, add: true });
      this.shockRing(x, y - 20, 0xffd36a, 110, 600);
      this.cameras.main.flash(160, 255, 220, 120);
      this.cameras.main.shake(180, 0.005);
      this.zoomPunch(1.06, 320);
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
    return Math.hypot(x - this.pred.x, y - this.pred.y) <= GAME.visionRadius * this.vis && hasLineOfSight(this.grid, eye, { x, y: y - 30 });
  }

  /** must match the server: the lobby gate is solid only while phase is 'lobby' */
  private moveGrid() {
    return useStore.getState().room?.phase === 'lobby' ? this.lobbyGrid : this.grid;
  }

  private reconcile(sx: number, sy: number, lastSeq: number) {
    const before = { ...this.pred };
    this.pending = this.pending.filter((i) => i.seq > lastSeq);
    let p = { x: sx, y: sy };
    for (const i of this.pending) p = stepMovement(this.moveGrid(), p, i, SIM_DT);
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
    const st = this.skin.stations.find((x) => x.id === id)!;
    if (!s.me?.tasks.includes(id)) return s.toast({ text: 'Đây không phải nhiệm vụ của bạn.', kind: 'info' });
    if (dist(this.pred, st) > INTERACT_RADIUS) return s.toast({ text: `Lại gần “${st.title}” để làm nhiệm vụ.`, kind: 'info' });
    send('task:open', { taskId: id });
  }

  private interact() {
    const s = useStore.getState();
    const n = s.nearby;
    if (!n || uiBlocksMovement()) return;
    if (n.kind === 'task') this.tryTask(n.id);
    else if (n.kind === 'fix') fix(true);
  }

  private ringBell() {
    const n = useStore.getState().nearby;
    if (n?.kind === 'emergency' && !uiBlocksMovement()) send('emergency', {});
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
      const r = s.room;
      if (r.sabotage === 'ward' && dist(this.pred, { x: r.sabotageX, y: r.sabotageY }) <= SABOTAGE.fixRange) return { kind: 'fix', title: this.skin.sabotage.ward.fix.vi };
    }
    let best: Nearby = null;
    let bestD = INTERACT_RADIUS;
    const done = new Set(s.me?.completedTasks ?? []);
    const mine = new Set(s.me?.tasks ?? []);
    for (const st of this.skin.stations) {
      if (!mine.has(st.id)) continue;
      const d = dist(this.pred, st);
      if (d < bestD) {
        bestD = d;
        best = { kind: 'task', id: st.id, title: st.title, done: done.has(st.id) };
      }
    }
    if (alive && dist(this.pred, MEETING_POINT) < INTERACT_RADIUS + 50 && bestD >= INTERACT_RADIUS) {
      best = { kind: 'emergency', title: `${this.skin.emergency.vi} (họp khẩn)`, used: !!me?.emergencyUsed };
    }
    return best;
  }

  /** Is someone killable within range? (client hint only; the server decides) */
  private computeKillTarget(): boolean {
    const s = useStore.getState();
    if (s.me?.faction !== 'killer' || s.room?.phase !== 'explore') return false;
    const me = this.myView();
    if (!me?.alive) return false;
    // by session id, never by name — players may share a name with a mate
    const mates = new Set(s.me.killerIds ?? []);
    for (const [id, av] of this.avatars) {
      if (id === s.sessionId || !av.alive || mates.has(id)) continue;
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
      const next = stepMovement(this.moveGrid(), this.pred, cmd, SIM_DT);
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
    // blind sabotage: crew vision closes in fast and opens back slowly; killers keep their sight
    const st = useStore.getState();
    const blind = st.room?.sabotage === 'blind' && st.me?.faction !== 'killer';
    const goal = blind ? SABOTAGE.blindVision : 1;
    this.vis += (goal - this.vis) * Math.min(1, (dtMs / 1000) * (blind ? 10 : 1.6));
    if (Math.abs(goal - this.vis) < 0.002) this.vis = goal;
    const eye = { x: this.pred.x, y: this.pred.y - 30 };
    const canSee = (x: number, y: number) =>
      !limited || (Math.hypot(x - this.pred.x, y - this.pred.y) <= GAME.visionRadius * this.vis && hasLineOfSight(this.grid, eye, { x, y: y - 30 }));
    for (const [id, av] of this.avatars) {
      av.c.setDepth(av.c.y);
      if (id === r.sessionId) av.c.setVisible(true).setAlpha(av.alive ? 1 : 0.5);
      else if (!av.alive) av.c.setVisible(iAmGhost).setAlpha(0.45);
      else av.c.setVisible(canSee(av.c.x, av.c.y)).setAlpha(1);
    }
    for (const b of this.bodies.values()) b.setVisible(canSee(b.x, b.y));
    const now = performance.now();
    for (const [id, av] of this.avatars) {
      const mineAv = id === r.sessionId;
      const moving = mineAv ? this.myMoving : now - av.lastMoveAt < 120;
      this.updateLamp(av, mineAv ? this.myDir : av.dir, moving, !lobby, now);
    }
    this.updateFog(limited ? this.pred : null, limited);

    // UI bridge (only on change)
    const nearby = this.computeNearby();
    const nk = JSON.stringify(nearby);
    if (nk !== this.lastNearbyKey) {
      this.lastNearbyKey = nk;
      useStore.getState().set({ nearby });
      this.updateTapBadge(nearby);
    }
    if (nearby?.kind !== 'fix' && useStore.getState().fixing) fix(false);
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

  /** Play an action-sheet row on an avatar for `ms`, then hand the sprites back to the walk cycle. */
  private pose(av: Avatar, row: Pose, faceRight: boolean, ms: number) {
    av.posedUntil = performance.now() + ms;
    av.base.setTexture('player-action').setFlipX(faceRight).play(`player-action-${row}`);
    av.tint.setTexture('player-action-tint').setFlipX(faceRight).play(`player-action-tint-${row}`);
  }

  private animate(av: Avatar, dir: number, moving: boolean) {
    if (av.posedUntil) {
      if (performance.now() < av.posedUntil) return;
      av.posedUntil = 0;
      av.base.anims.stop();
      av.tint.anims.stop();
      av.base.setTexture('player', 'walk-down-0').setFlipX(false);
      av.tint.setTexture('player-tint', 'walk-down-0').setFlipX(false);
    }
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
