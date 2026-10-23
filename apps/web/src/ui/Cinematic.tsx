import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { PLAYER_COLORS, mapSkin, playerArt } from '@hidden-truth/shared';
import { colorHex, useStore } from '../store';
import { asset, useEscape } from './common';
import { GROUP_NAME, groupAvatar } from './Zola';
import { sfx } from './minigames/common/kit';

const ROW = { down: 0, left: 1, right: 2, up: 3 } as const;
const DURATION: Record<string, number> = { kill: 5700, report: 4800, emergency: 4200, witness: 1000 };
/** arrest kill: the full 6s clip, then the .35s cineOut fade */
const ARREST_MS = 6350;
/** The stage is authored on a fixed SET_W x SET_H board and scaled to whatever room the bars + caption leave. */
const SET_W = 1000, SET_H = 420;
const KICKER: Record<string, string> = { kill: '✦ Bắt giữ ✦', report: '✦ Xe bỏ lại ✦', emergency: '✦ Họp khẩn ✦' };

// Pose timelines (ms). Impact lands at 900: dash 300-750 → wind-up → slash.
const ACTOR_STRIKE: PoseTrack = [[0, 'strike-1'], [750, 'strike-0'], [900, 'strike-2'], [1050, 'strike-3']];
const VICTIM_DIE: PoseTrack = [[0, 'guard-3'], [900, 'die-0'], [1100, 'die-1'], [1350, 'die-2'], [1600, 'die-3']];
/** Pre-rendered arrest scene (VP9 with alpha): one smooth clip instead of stepping sprite poses. */
const ARREST_CLIP = 'maps/game/cinematics/arrest.webm';
const PROPS = ['cine-seal', 'fx-stamp-burst', 'fx-shock-lines'];

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

type Rect = { x: number; y: number; w: number; h: number };
const frameCache = new Map<string, Promise<Record<string, Rect>>>();
/** Frame rects of a texture-packer atlas JSON, so maps can ship any frame size/count. */
function loadFrames(src: string) {
  let p = frameCache.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => r.json())
      .then((j: { frames: Record<string, { frame: Rect }> }) => Object.fromEntries(Object.entries(j.frames).map(([k, v]) => [k, v.frame])))
      .catch(() => ({}));
    frameCache.set(src, p);
  }
  return p;
}

/** Canvas rendering of the player atlas (walk-<dir>-<i> frames, size read from its JSON); the tint layer is multiplied by the colour and clipped to its own alpha. */
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
    Promise.all([loadImg(asset(`${art.atlas}.webp`)), loadImg(asset(`${art.tint}.webp`)), loadFrames(asset(`${art.atlas}.json`))]).then(([base, tint, fr]) => {
      if (dead) return;
      const walk: Rect[] = [];
      for (let i = 0; fr[`walk-${dir}-${i}`]; i++) walk.push(fr[`walk-${dir}-${i}`]);
      // fallback: legacy 48x64 x4 grid
      if (!walk.length) for (let i = 0; i < 4; i++) walk.push({ x: i * 48, y: ROW[dir] * 64, w: 48, h: 64 });
      let f = 0;
      const draw = () => drawTinted(ctx, tmp, base, tint, walk[f], hex);
      draw();
      if (walking)
        timer = setInterval(() => {
          f = (f + 1) % walk.length;
          draw();
        }, (125 * 4) / walk.length);
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

/** Base frame + tint frame multiplied by `hex` (clipped to the tint's own alpha), fitted to `ctx`'s height and centred. */
function drawTinted(ctx: CanvasRenderingContext2D, tmp: HTMLCanvasElement, base: HTMLImageElement, tint: HTMLImageElement, r: Rect, hex: string, secondary?: { frame: Rect; hex: string }) {
  const { x: sx, y: sy, w, h } = r;
  if (tmp.width !== w) tmp.width = w;
  if (tmp.height !== h) tmp.height = h;
  const t = tmp.getContext('2d')!;
  t.globalCompositeOperation = 'source-over';
  t.clearRect(0, 0, w, h);
  t.drawImage(tint, sx, sy, w, h, 0, 0, w, h);
  t.globalCompositeOperation = 'multiply';
  t.fillStyle = hex;
  t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = 'destination-in';
  t.drawImage(tint, sx, sy, w, h, 0, 0, w, h);
  const cv = ctx.canvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, cv.width, cv.height);
  const dw = (w * cv.height) / h, dx = (cv.width - dw) / 2;
  ctx.drawImage(base, sx, sy, w, h, dx, 0, dw, cv.height);
  ctx.drawImage(tmp, dx, 0, dw, cv.height);
  if (secondary) {
    const f = secondary.frame;
    if (!f) return;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, w, h);
    t.drawImage(tint, f.x, f.y, f.w, f.h, 0, 0, w, h);
    t.globalCompositeOperation = 'multiply';
    t.fillStyle = secondary.hex;
    t.fillRect(0, 0, w, h);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(tint, f.x, f.y, f.w, f.h, 0, 0, w, h);
    ctx.drawImage(tmp, dx, 0, dw, cv.height);
  }
}

const ACT_W = 96, ACT_H = 64;
const ACT_ROW: Record<string, number> = { strike: 0, die: 1, guard: 2 };
/** [ms since mount, frame] — frames are `strike|die|guard-0..3` from the action sheet (figure faces left). */
export type PoseTrack = [number, string][];

/** Action-pose canvas (96x64 box; frame rects read from the action JSON); steps through `track` on a mount-relative clock, so a slow image load skips ahead instead of lagging. */
export function PoseSprite({ color, track, scale = 4, tall = false, pairColor }: { color: number; track: PoseTrack; scale?: number; tall?: boolean; pairColor?: number }) {
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
    Promise.all([loadImg(asset(`${art.action}.webp`)), loadImg(asset(`${art.actionTint}.webp`)), loadFrames(asset(`${art.action}.json`))]).then(([base, tint, fr]) => {
      if (dead) return;
      const draw = (f: string) => {
        const [row, i] = f.split('-');
        drawTinted(ctx, tmp, base, tint, fr[f] ?? { x: Number(i) * ACT_W, y: (ACT_ROW[row] ?? 0) * ACT_H, w: ACT_W, h: ACT_H }, hex, pairColor === undefined ? undefined : { frame: fr[`arrest-victim-${i}`], hex: colorHex(PLAYER_COLORS[pairColor] ?? 0xffffff) });
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
  }, [hex, pairColor, art.action, art.actionTint]);
  return <canvas className="pose" ref={ref} width={(pairColor === undefined ? ACT_W : 192) * scale} height={(pairColor !== undefined ? 128 : tall ? 88 : ACT_H) * scale} />;
}

function Fx({ name, className = '', ms = 700, delay = 0 }: { name: string; className?: string; ms?: number; delay?: number }) {
  return (
    <div
      className={`fx ${className}`}
      style={{ backgroundImage: `url(${asset(`maps/common/ui/fx/${name}.webp`)})`, '--ms': `${ms}ms`, '--d': `${delay}ms` } as React.CSSProperties}
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
    const ms = c.kind === 'kill' && mapSkin(slug).arrest ? ARREST_MS : DURATION[c.kind] ?? 3000;
    const t = setTimeout(() => set({ cinematic: null }), ms);
    return () => clearTimeout(t);
  }, [c?.id]);
  useEffect(() => {
    if (c?.kind !== 'report' && c?.kind !== 'emergency') return;
    // Use the shared audio bus so the player's volume/mute setting is respected.
    const cues = c.kind === 'report'
      ? [setTimeout(sfx.report, 100)]
      : [setTimeout(sfx.meeting, 100)];
    return () => cues.forEach(clearTimeout);
  }, [c?.id, c?.kind]);
  // warm the pose sheets so the first kill does not start on a blank canvas
  useEffect(() => {
    loadImg(asset('maps/game/ui/abandoned-bike.png'));
    const a = playerArt(slug);
    loadImg(asset(`${a.action}.webp`));
    loadImg(asset(`${a.actionTint}.webp`));
    loadFrames(asset(`${a.action}.json`));
    loadFrames(asset(`${a.atlas}.json`));
    for (const n of PROPS) loadImg(asset(`maps/common/ui/fx/${n}.webp`));
    if (mapSkin(slug).arrest) fetch(asset(ARREST_CLIP)).catch(() => {});
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
  const skin = mapSkin(slug);
  const arrest = skin.arrest;

  let title = '';
  let sub: React.ReactNode = null;
  if (c.kind === 'kill' && arrest) {
    title = c.youAre === 'victim' ? 'Đã bị bắt' : 'Đã khống chế';
    sub = c.youAre === 'victim' ? 'Bạn có thể tiếp tục theo dõi ván chơi.' : 'Tài xế đã được còng tay và áp giải.';
  } else if (c.kind === 'kill') {
    title = c.youAre === 'victim' ? 'BẠN BỊ HẠ GỤC' : 'HẠ GỤC';
    sub = c.youAre === 'victim' ? <>{nm(c.actor.name, actorCol)} là {mapSkin(useStore.getState().room?.mapSlug).killerName.vi}!</> : <>Bạn đã hạ gục {nm(c.victim!.name, victimCol)}</>;
  } else if (c.kind === 'report') {
    title = 'CÓ XE BỊ BỎ LẠI!';
    sub = <>{nm(c.actor.name, actorCol)} vừa phát hiện xe của {nm(c.victim!.name, victimCol)}.</>;
  } else {
    title = 'HỌP KHẨN';
    sub = <>{nm(c.actor.name, actorCol)} đã gọi họp khẩn ({mapSkin(useStore.getState().room?.mapSlug).emergency.vi})</>;
  }

  // witnesses get no overlay: only the in-world strike + fall, so nobody is named or flagged
  // bystanders of a blocked strike likewise get the public in-world dome/flash only
  if (c.kind === 'witness' || c.youAre === 'witness') return arrest ? (
    <aside className="arrest-witness" key={c.id} role="status">
      <span aria-hidden="true">✦</span>
      <div><b>Vừa có người bị bắt</b></div>
    </aside>
  ) : null;

  // attacker always enters from the left; action sheets face left, so the attacker is mirrored
  const attacker = (track: PoseTrack, cls: string) => (
    <div className={`cine-actor dash ${cls}`}>
      <div className="cine-flip">
        <Fx name="fx-dash-smear" className="cine-fx-smear" ms={460} delay={300} />
        <PoseSprite color={c.actor.color} track={track} />
      </div>
    </div>
  );

  if (c.kind === 'report') return (
    <div className="bike-discovery" key={c.id} role="status" aria-live="assertive" onClick={() => set({ cinematic: null })}>
      <div className="bike-discovery-flash" aria-hidden="true" />
      <div className="bike-discovery-rays" aria-hidden="true" />
      <div className="bike-discovery-band top" aria-hidden="true"><span>! CẢNH BÁO · XE BỎ LẠI · CẢNH BÁO !</span></div>
      <div className="bike-discovery-band bottom" aria-hidden="true"><span>! CẢNH BÁO · XE BỎ LẠI · CẢNH BÁO !</span></div>
      <div className="bike-discovery-scene" aria-hidden="true">
        <div className="bike-discovery-light" />
        <div className="bike-discovery-ground" />
        <img className="bike-discovery-sprite" src={asset('maps/game/ui/abandoned-bike.png')} alt="" draggable={false} />
        <span className="bike-discovery-marker">!</span>
      </div>
      <div className="bike-discovery-caption">
        <span className="bike-discovery-kicker">BÁO ĐỘNG TOÀN NHÓM</span>
        <h1>{title}</h1>
        <p>{sub}<strong className="bike-discovery-missing">Không thấy tài xế đâu!</strong></p>
        <span className="bike-discovery-next">Có chuyện rồi! Cả nhóm vào họp ngay.</span>
      </div>
      <div className="bike-discovery-progress" aria-hidden="true" />
    </div>
  );

  if (c.kind === 'emergency') return (
    <div className="bike-discovery zola-alert" key={c.id} role="status" aria-live="assertive">
      <div className="bike-discovery-flash" aria-hidden="true" />
      <div className="bike-discovery-rays" aria-hidden="true" />
      <div className="bike-discovery-band top" aria-hidden="true"><span>! HỌP KHẨN !</span></div>
      <div className="bike-discovery-band bottom" aria-hidden="true"><span>! HỌP KHẨN !</span></div>
      <section className="zola-alert-card">
        <header><span className="zola-alert-brand">Zola</span></header>
        <div className="zola-alert-content">
          <img className="zola-alert-phone" src={asset('maps/common/ui/meeting-zola.svg')} alt="" />
          <div className="zola-alert-message">
            <div className="zola-alert-group"><img src={groupAvatar} alt="" /><span>{GROUP_NAME}</span><i>!</i></div>
            <h1>HỌP KHẨN!</h1>
            <p><b>{c.actor.name}</b> gọi họp</p>
          </div>
        </div>
        <footer><span className="zola-alert-progress" /><button type="button" onClick={() => set({ cinematic: null })}>Vào nhóm ngay <span aria-hidden="true">→</span></button></footer>
      </section>
    </div>
  );

  return (
    <div className={`cine cine-${c.kind} ${arrest && c.kind === 'kill' ? 'cine-arrest' : ''} ${c.youAre === 'victim' ? 'as-victim' : ''}`} key={c.id} onClick={() => set({ cinematic: null })}>
      <div className="cine-flash" />
      <div className="cine-bar top" />
      <div className="cine-area" ref={area}>
        <div className="cine-set" style={{ '--k': k } as React.CSSProperties}>
          <div className="cine-stage">
            <div className="cine-ground" />
            {c.kind === 'kill' && arrest && (
              <>
                <div className="arrest-badge-glow" aria-hidden="true" />
                <video className="arrest-clip" src={asset(ARREST_CLIP)} autoPlay muted playsInline preload="auto" disablePictureInPicture aria-hidden="true" />
              </>
            )}
            {c.kind === 'kill' && !arrest && (
              <>
                <img className="cine-splat" src={asset('maps/common/ui/fx/ink-splat.webp')} alt="" draggable={false} />
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


          </div>
        </div>
      </div>
      <div className="cine-text">
        <img className="cine-brush" src={asset('maps/common/ui/fx/brush-stroke.webp')} alt="" draggable={false} />
        <span className="cine-kicker">{arrest && c.kind === 'kill' ? 'CÔNG AN CHÌM' : KICKER[c.kind]}</span>
        <h1 data-text={title}>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="cine-bar bottom" />
    </div>
  );
}
