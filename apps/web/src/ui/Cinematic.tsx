import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PLAYER_COLORS, mapSkin, playerArt } from '@hidden-truth/shared';
import { colorHex, useStore } from '../store';
import { asset, useEscape } from './common';

const ROW = { down: 0, left: 1, right: 2, up: 3 } as const;
const DURATION: Record<string, number> = { kill: 3200, shield: 2600, report: 3600, emergency: 3300, witness: 1300 };
/** The stage is authored on a fixed SET_W x SET_H board and scaled to whatever room the bars + caption leave. */
const SET_W = 1000, SET_H = 420;
const KICKER: Record<string, string> = { kill: '✦ Án mạng ✦', shield: '✦ Hộ thân ✦', report: '✦ Phát hiện ✦', emergency: '✦ Hồi chuông ✦' };

// Pose timelines (ms). Impact lands at 900: dash 300-750 → wind-up → slash.
const ACTOR_STRIKE: PoseTrack = [[0, 'strike-1'], [750, 'strike-0'], [900, 'strike-2'], [1050, 'strike-3']];
const VICTIM_DIE: PoseTrack = [[0, 'guard-3'], [900, 'die-0'], [1100, 'die-1'], [1350, 'die-2'], [1600, 'die-3']];
const ACTOR_REPELLED: PoseTrack = [[0, 'strike-1'], [750, 'strike-0'], [900, 'strike-2'], [960, 'guard-2'], [1450, 'guard-3']];
const VICTIM_GUARD: PoseTrack = [[0, 'guard-3'], [780, 'guard-0'], [900, 'guard-1'], [1150, 'guard-2'], [1450, 'guard-3']];
const BODY: PoseTrack = [[0, 'die-3']];
const FINDER_STARTLE: PoseTrack = [[0, 'guard-0'], [1350, 'guard-1'], [1650, 'guard-2']];
const BELL_RINGER: PoseTrack = [[0, 'guard-3'], [500, 'guard-1'], [780, 'guard-2'], [1100, 'guard-1'], [1380, 'guard-2'], [1700, 'guard-1'], [1980, 'guard-2'], [2350, 'guard-3']];
const BELL_HITS = [800, 1400, 2000];
const PROPS = ['cine-bell-frame', 'cine-bell', 'cine-bell-log', 'cine-seal', 'fx-bell-wave', 'fx-stamp-burst', 'fx-shock-lines'];

const imgCache = new Map<string, Promise<HTMLImageElement>>();
function loadImg(src: string) {
  let p = imgCache.get(src);
  if (!p) {
    p = new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = src;
    });
    imgCache.set(src, p);
  }
  return p;
}

/** Canvas rendering of the player atlas (48x64 frames, 4 columns); the tint layer is multiplied by the colour and clipped to its own alpha. */
export function Sprite({
  color,
  dir = 'down',
  walking = false,
  scale = 3,
  lying = false,
  className = '',
}: {
  color: number;
  dir?: keyof typeof ROW;
  walking?: boolean;
  scale?: number;
  lying?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hex = colorHex(PLAYER_COLORS[color] ?? 0xffffff);
  const art = playerArt(useStore((s) => s.room?.mapSlug));
  useEffect(() => {
    let dead = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const tmp = document.createElement('canvas');
    tmp.width = 48;
    tmp.height = 64;
    Promise.all([loadImg(asset(`${art.atlas}.webp`)), loadImg(asset(`${art.tint}.webp`))]).then(([base, tint]) => {
      if (dead) return;
      let f = 0;
      const draw = () => drawTinted(ctx, tmp, base, tint, f * 48, ROW[dir] * 64, hex);
      draw();
      if (walking)
        timer = setInterval(() => {
          f = (f + 1) % 4;
          draw();
        }, 125);
    });
    return () => {
      dead = true;
      if (timer) clearInterval(timer);
    };
  }, [hex, dir, walking, scale, art.atlas, art.tint]);
  return (
    <div className={`sprite ${lying ? 'lying' : ''} ${className}`} style={{ width: 48 * scale, height: 64 * scale }}>
      <canvas ref={ref} width={48 * scale} height={64 * scale} style={{ display: 'block' }} />
    </div>
  );
}

/** Base frame + tint frame multiplied by `hex` (clipped to the tint's own alpha), drawn scaled into `ctx`. */
function drawTinted(ctx: CanvasRenderingContext2D, tmp: HTMLCanvasElement, base: HTMLImageElement, tint: HTMLImageElement, sx: number, sy: number, hex: string) {
  const w = tmp.width, h = tmp.height, t = tmp.getContext('2d')!;
  t.globalCompositeOperation = 'source-over';
  t.clearRect(0, 0, w, h);
  t.drawImage(tint, sx, sy, w, h, 0, 0, w, h);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = hex;
  t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(tint, sx, sy, w, h, 0, 0, w, h);
  const cv = ctx.canvas;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.drawImage(base, sx, sy, w, h, 0, 0, cv.width, cv.height);
  ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
}

const ACT_W = 96, ACT_H = 64;
const ACT_ROW: Record<string, number> = { strike: 0, die: 1, guard: 2 };
/** [ms since mount, frame] — frames are `strike|die|guard-0..3` from the action sheet (figure faces left). */
export type PoseTrack = [number, string][];

/** Action-pose canvas (96x64 frames); steps through `track` on a mount-relative clock, so a slow image load skips ahead instead of lagging. */
export function PoseSprite({ color, track, scale = 4 }: { color: number; track: PoseTrack; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const hex = colorHex(PLAYER_COLORS[color] ?? 0xffffff);
  const art = playerArt(useStore((s) => s.room?.mapSlug));
  useEffect(() => {
    const t0 = performance.now();
    let dead = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const tmp = document.createElement('canvas');
    tmp.width = ACT_W;
    tmp.height = ACT_H;
    Promise.all([loadImg(asset(`${art.action}.webp`)), loadImg(asset(`${art.actionTint}.webp`))]).then(([base, tint]) => {
      if (dead) return;
      const draw = (f: string) => {
        const [row, i] = f.split('-');
        drawTinted(ctx, tmp, base, tint, Number(i) * ACT_W, (ACT_ROW[row] ?? 0) * ACT_H, hex);
      };
      const now = performance.now() - t0;
      let cur = track[0][1];
      for (const [ms, f] of track) {
        if (ms <= now) cur = f;
        else timers.push(setTimeout(() => draw(f), ms - now));
      }
      draw(cur);
    });
    return () => {
      dead = true;
      timers.forEach(clearTimeout);
    };
  }, [hex, art.action, art.actionTint]);
  return <canvas className="pose" ref={ref} width={ACT_W * scale} height={ACT_H * scale} />;
}

function Fx({ name, className = '', ms = 700, delay = 0 }: { name: string; className?: string; ms?: number; delay?: number }) {
  return (
    <div
      className={`fx ${className}`}
      style={{ backgroundImage: `url(${asset(`common/ui/fx/${name}.webp`)})`, '--ms': `${ms}ms`, '--d': `${delay}ms` } as React.CSSProperties}
    />
  );
}

export function Cinematic() {
  const c = useStore((s) => s.cinematic);
  const set = useStore((s) => s.set);
  const slug = useStore((s) => s.room?.mapSlug);
  const area = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEscape(() => set({ cinematic: null }), !!c);
  useEffect(() => {
    if (!c) return;
    const t = setTimeout(() => set({ cinematic: null }), DURATION[c.kind] ?? 3000);
    return () => clearTimeout(t);
  }, [c?.id]);
  // warm the pose sheets so the first kill does not start on a blank canvas
  useEffect(() => {
    const a = playerArt(slug);
    loadImg(asset(`${a.action}.webp`));
    loadImg(asset(`${a.actionTint}.webp`));
    for (const n of PROPS) loadImg(asset(`common/ui/fx/${n}.webp`));
  }, [slug]);
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const fit = () => setK(Math.max(0.3, Math.min(1.15, el.clientHeight / SET_H, el.clientWidth / SET_W)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [c?.id, c?.kind]);
  if (!c) return null;
  const actorCol = colorHex(PLAYER_COLORS[c.actor.color] ?? 0xffffff);
  const victimCol = c.victim ? colorHex(PLAYER_COLORS[c.victim.color] ?? 0xffffff) : '';
  const nm = (n: string, col: string) => <b style={{ color: col }}>{n}</b>;

  let title = '';
  let sub: React.ReactNode = null;
  if (c.kind === 'kill') {
    title = c.youAre === 'victim' ? 'BẠN BỊ HẠ GỤC' : 'HẠ GỤC';
    sub = c.youAre === 'victim' ? <>{nm(c.actor.name, actorCol)} là {mapSkin(useStore.getState().room?.mapSlug).killerName.vi}!</> : <>Bạn đã hạ gục {nm(c.victim!.name, victimCol)}</>;
  } else if (c.kind === 'shield') {
    title = 'LÁ CHẮN!';
    sub = c.youAre === 'victim' ? <>Lá chắn đã cứu bạn khỏi {nm(c.actor.name, actorCol)}</> : <>{nm(c.victim!.name, victimCol)} đã chặn đòn của bạn</>;
  } else if (c.kind === 'report') {
    title = 'BÁO CÁO THI THỂ';
    sub = <>{nm(c.actor.name, actorCol)} phát hiện thi thể của {nm(c.victim!.name, victimCol)}</>;
  } else {
    title = 'HỌP KHẨN';
    sub = <>{nm(c.actor.name, actorCol)} đã gọi họp khẩn ({mapSkin(useStore.getState().room?.mapSlug).emergency.vi})</>;
  }

  // witnesses get no overlay: only the in-world strike + fall, so nobody is named or flagged
  // bystanders of a blocked strike likewise get the public in-world dome/flash only
  if (c.kind === 'witness' || c.youAre === 'witness') return null;

  // attacker always enters from the left; action sheets face left, so the attacker is mirrored
  const attacker = (track: PoseTrack, cls: string) => (
    <div className={`cine-actor dash ${cls}`}>
      <div className="cine-flip">
        <Fx name="fx-dash-smear" className="cine-fx-smear" ms={460} delay={300} />
        <PoseSprite color={c.actor.color} track={track} />
      </div>
    </div>
  );

  return (
    <div className={`cine cine-${c.kind} ${c.youAre === 'victim' ? 'as-victim' : ''}`} key={c.id} onClick={() => set({ cinematic: null })}>
      <div className="cine-flash" />
      <div className="cine-bar top" />
      <div className="cine-area" ref={area}>
        <div className="cine-set" style={{ '--k': k } as React.CSSProperties}>
          <div className="cine-stage">
            <div className="cine-ground" />
            {c.kind === 'kill' && (
              <>
                <img className="cine-splat" src={asset('common/ui/fx/ink-splat.webp')} alt="" draggable={false} />
                {attacker(ACTOR_STRIKE, 'lunge')}
                <div className="cine-victim struck">
                  <PoseSprite color={c.victim!.color} track={VICTIM_DIE} />
                </div>
                <Fx name="fx-kill-slash" className="cine-fx-slash" ms={560} delay={880} />
                {Array.from({ length: 10 }, (_, i) => (
                  <i key={i} className="cine-drop" style={{ '--a': `${i * 36 + 10}deg`, '--d': `${930 + (i % 3) * 40}ms` } as React.CSSProperties} />
                ))}
                <Fx name="fx-soul-rise" className="cine-fx-soul" ms={1100} delay={1700} />
              </>
            )}
            {c.kind === 'shield' && (
              <>
                {attacker(ACTOR_REPELLED, 'repelled')}
                <div className="cine-victim brace">
                  <PoseSprite color={c.victim!.color} track={VICTIM_GUARD} />
                </div>
                <Fx name="fx-shield-dome" className="cine-fx-dome" ms={1000} delay={820} />
                <i className="cine-ring gold r1" />
                <i className="cine-ring gold r2" />
                {Array.from({ length: 12 }, (_, i) => (
                  <i key={i} className="cine-spark" style={{ '--a': `${i * 30}deg`, '--d': `${900 + (i % 4) * 30}ms` } as React.CSSProperties} />
                ))}
                <img className="cine-shield-icon" src={asset('common/ui/shield.webp')} alt="" draggable={false} />
              </>
            )}
            {c.kind === 'report' && (
              <>
                <i className="cine-spot" />
                <div className="cine-victim lie">
                  <PoseSprite color={c.victim!.color} track={BODY} />
                </div>
                <Fx name="fx-shock-lines" className="cine-fx-shock" ms={900} delay={1150} />
                <div className="cine-actor findin">
                  <div className="cine-walker">
                    <Sprite color={c.actor.color} dir="right" walking scale={4} />
                  </div>
                  <div className="cine-flip cine-startle">
                    <PoseSprite color={c.actor.color} track={FINDER_STARTLE} />
                  </div>
                  <Fx name="fx-witness" className="cine-bang-fx" ms={500} delay={1150} />
                </div>
                <i className="cine-ring red r1" />
                <i className="cine-ring red r2" />
                <i className="cine-ring red r3" />
                <img className="cine-seal" src={asset('common/ui/fx/cine-seal.webp')} alt="" draggable={false} />
                <Fx name="fx-stamp-burst" className="cine-fx-stamp" ms={700} delay={1780} />
              </>
            )}
            {c.kind === 'emergency' && (
              <>
                <div className="cine-pavilion">
                  <img className="cine-bell-frame" src={asset('common/ui/fx/cine-bell-frame.webp')} alt="" draggable={false} />
                  <img className="cine-bell" src={asset('common/ui/fx/cine-bell.webp')} alt="" draggable={false} />
                  {BELL_HITS.map((d) => (
                    <Fx key={d} name="fx-bell-wave" className="cine-fx-bellwave" ms={800} delay={d} />
                  ))}
                </div>
                <div className="cine-log">
                  <i className="rope l" />
                  <i className="rope r" />
                  <img src={asset('common/ui/fx/cine-bell-log.webp')} alt="" draggable={false} />
                </div>
                <div className="cine-actor ringer">
                  <div className="cine-flip">
                    <PoseSprite color={c.actor.color} track={BELL_RINGER} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="cine-text">
        <img className="cine-brush" src={asset('common/ui/fx/brush-stroke.webp')} alt="" draggable={false} />
        <span className="cine-kicker">{KICKER[c.kind]}</span>
        <h1 data-text={title}>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="cine-bar bottom" />
    </div>
  );
}
