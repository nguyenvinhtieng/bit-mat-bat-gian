import { useEffect, useRef } from 'react';
import { PLAYER_COLORS, playerArt } from '@hidden-truth/shared';
import { colorHex, useStore } from '../store';
import { asset } from './common';

const ROW = { down: 0, left: 1, right: 2, up: 3 } as const;
const DURATION: Record<string, number> = { kill: 3200, shield: 2600, report: 3400, emergency: 2800, witness: 1300 };

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
    const t = tmp.getContext('2d')!;
    Promise.all([loadImg(asset(`${art.atlas}.webp`)), loadImg(asset(`${art.tint}.webp`))]).then(([base, tint]) => {
      if (dead) return;
      let f = 0;
      const draw = () => {
        const sx = f * 48, sy = ROW[dir] * 64;
        t.globalCompositeOperation = 'source-over';
        t.clearRect(0, 0, 48, 64);
        t.drawImage(tint, sx, sy, 48, 64, 0, 0, 48, 64);
        t.globalCompositeOperation = 'multiply';
        t.fillStyle = hex;
        t.fillRect(0, 0, 48, 64);
        t.globalCompositeOperation = 'destination-in';
        t.drawImage(tint, sx, sy, 48, 64, 0, 0, 48, 64);
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(base, sx, sy, 48, 64, 0, 0, cv.width, cv.height);
        ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
      };
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
  useEffect(() => {
    if (!c) return;
    const t = setTimeout(() => set({ cinematic: null }), DURATION[c.kind] ?? 3000);
    return () => clearTimeout(t);
  }, [c?.id]);
  if (!c) return null;
  const actorCol = colorHex(PLAYER_COLORS[c.actor.color] ?? 0xffffff);
  const victimCol = c.victim ? colorHex(PLAYER_COLORS[c.victim.color] ?? 0xffffff) : '';
  const nm = (n: string, col: string) => <b style={{ color: col }}>{n}</b>;

  let title = '';
  let sub: React.ReactNode = null;
  if (c.kind === 'kill') {
    title = c.youAre === 'victim' ? 'BẠN BỊ HẠ GỤC' : 'HẠ GỤC';
    sub = c.youAre === 'victim' ? <>{nm(c.actor.name, actorCol)} là Hắc Ảnh!</> : <>Bạn đã hạ gục {nm(c.victim!.name, victimCol)}</>;
  } else if (c.kind === 'shield') {
    title = 'LÁ CHẮN!';
    sub = c.youAre === 'victim' ? <>Lá chắn đã cứu bạn khỏi {nm(c.actor.name, actorCol)}</> : <>{nm(c.victim!.name, victimCol)} đã chặn đòn của bạn</>;
  } else if (c.kind === 'report') {
    title = 'BÁO CÁO THI THỂ';
    sub = <>{nm(c.actor.name, actorCol)} phát hiện thi thể của {nm(c.victim!.name, victimCol)}</>;
  } else if (c.kind === 'witness') {
    title = 'BẠN VỪA CHỨNG KIẾN!';
    sub = <>{nm(c.actor.name, actorCol)} vừa hạ gục {nm(c.victim!.name, victimCol)}</>;
  } else {
    title = 'HỌP KHẨN';
    sub = <>{nm(c.actor.name, actorCol)} đã rung chuông</>;
  }

  if (c.kind === 'witness')
    return (
      <div className="witness" key={c.id}>
        <div className="witness-vignette" />
        <Fx name="fx-kill-slash" className="witness-slash" ms={420} />
        <Fx name="fx-witness" className="witness-fx" ms={600} delay={80} />
        <div className="witness-text">
          <strong>{title}</strong>
          <span>{sub}</span>
        </div>
      </div>
    );

  return (
    <div className={`cine cine-${c.kind} ${c.youAre === 'victim' ? 'as-victim' : ''}`} key={c.id} onClick={() => set({ cinematic: null })}>
      <div className="cine-flash" />
      <div className="cine-bar top" />
      <div className="cine-bar bottom" />
      <div className="cine-stage">
        <div className="cine-ground" />
        {c.kind === 'kill' && (
          <>
            <div className="cine-actor runin"><Sprite color={c.actor.color} dir="right" walking scale={4} /></div>
            <div className="cine-victim fall"><Sprite color={c.victim!.color} dir="left" scale={4} /></div>
            <div className="cine-slash" />
            <Fx name="fx-kill-slash" className="cine-fx-slash" ms={650} delay={1050} />
            <img className="cine-skull" src={asset('common/ui/body-marker.webp')} alt="" draggable={false} />
          </>
        )}
        {c.kind === 'shield' && (
          <>
            <div className="cine-actor runin"><Sprite color={c.actor.color} dir="right" walking scale={4} /></div>
            <div className="cine-victim guard"><Sprite color={c.victim!.color} dir="left" scale={4} /></div>
            <div className="cine-slash blocked" />
            <Fx name="fx-shield-block" className="cine-fx-shield" ms={720} delay={1000} />
            <img className="cine-shield-icon" src={asset('common/ui/shield.webp')} alt="" draggable={false} />
          </>
        )}
        {c.kind === 'report' && (
          <>
            <div className="cine-victim lie"><Sprite color={c.victim!.color} dir="left" scale={4} lying /></div>
            <div className="cine-actor findin">
              <Sprite color={c.actor.color} dir="right" walking scale={4} />
              <Fx name="fx-witness" className="cine-bang-fx" ms={500} delay={1450} />
            </div>
            <Fx name="fx-report-burst" className="cine-fx-burst" ms={800} delay={1450} />
          </>
        )}
        {c.kind === 'emergency' && (
          <div className="cine-actor center">
            <Sprite color={c.actor.color} dir="down" scale={4} />
            <span className="cine-bell">🔔</span>
          </div>
        )}
      </div>
      <div className="cine-text">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
    </div>
  );
}
