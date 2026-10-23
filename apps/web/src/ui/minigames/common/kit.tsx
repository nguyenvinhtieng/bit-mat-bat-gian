import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { mapSkin, type TaskId } from '@hidden-truth/shared';
import { useLang } from '../../../i18n';
import { useStore } from '../../../store';
import { asset } from '../../common';
import { GUIDE } from '../registry';

/** Mini-game art resolver for one map's folder (MapSkin.art.minigames). */
export const mgOf = (dir: string) => (name: string) => asset(`${dir}/${name}.webp`);

export type Submit = (answer: unknown) => void;

/** Re-triggerable shake: returns [className, trigger]. */
export function useShake(): [string, () => void] {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!n) return;
    const t = setTimeout(() => setN(0), 420);
    return () => clearTimeout(t);
  }, [n]);
  return [n ? 'shake' : '', () => setN((x) => x + 1)];
}

export type Tone = 'info' | 'bad' | 'ok';

// ------------------------------------------------------------------ drag & drop (pointer events: mouse + touch)
type DragState<T> = { item: T; ghost: React.ReactNode; x: number; y: number; over: string | null };

/**
 * Drag a source onto any element marked `data-drop="<key>"`. A press that never moves is a tap
 * (`onTap`), so the old tap-to-select flow keeps working as a fallback.
 * Usage: `<button {...dnd.source(item, <img …/>)}>` · targets: `data-drop={key}` + `dnd.over === key`.
 */
export function useDragDrop<T>(onDrop: (item: T, target: string) => void, onTap?: (item: T) => void) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const cb = useRef({ onDrop, onTap });
  cb.current = { onDrop, onTap };

  const source = (item: T, ghost: React.ReactNode, disabled = false) => ({
    'data-drag': '',
    onPointerDown: (e: React.PointerEvent) => {
      if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const x0 = e.clientX, y0 = e.clientY;
      let moved = false;
      const targetAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset.drop ?? null;
      const move = (ev: PointerEvent) => {
        if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
        if (!moved) sfx.scrape();
        moved = true;
        ev.preventDefault();
        setDrag({ item, ghost, x: ev.clientX, y: ev.clientY, over: targetAt(ev.clientX, ev.clientY) });
      };
      const end = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        window.removeEventListener('pointercancel', end);
        setDrag(null);
        if (ev.type === 'pointercancel') return;
        if (!moved) return cb.current.onTap?.(item);
        const over = targetAt(ev.clientX, ev.clientY);
        if (over != null) cb.current.onDrop(item, over);
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', end);
      window.addEventListener('pointercancel', end);
    },
  });

  const ghost = drag
    ? createPortal(
        <div className="mg-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.ghost}
        </div>,
        document.body,
      )
    : null;
  return { source, ghost, dragging: drag?.item ?? null, over: drag?.over ?? null };
}

/**
 * Common frame for every mini-game: one short action line + a status chip, the rest is play area.
 * `bare` drops the objective header and the hint line so the board can take the whole screen; the
 * status floats as a chip and any hint pops as a short toast, so pass feedback only. `bare="head"` keeps the hint.
 * No time limits anywhere — take your time.
 */
export function MgShell({ taskId, status, children, hint, tone = 'info', vars, bare }: {
  taskId: TaskId;
  status?: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  vars?: Record<string, string>;
  bare?: boolean | 'head';
}) {
  const lang = useLang((s) => s.lang);
  const mapSlug = useStore((s) => s.room?.mapSlug);
  const station = mapSkin(mapSlug).stations.find((s) => s.id === taskId);
  const goal = GUIDE[taskId]?.[lang === 'en' ? 'en' : 'vi'].goal ?? '';
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '');
  // only mistakes are worth reading mid-task; praise and narration stay silent
  if (tone !== 'bad') hint = undefined;
  if (bare) {
    return (
      <div className="mg-col mg-bare" data-task={taskId} aria-label={lang === 'en' ? station?.titleEn : station?.title}>
        {status != null && <div className="mg-chip">{status}</div>}
        <div className="mg-play">{children}</div>
        {bare === 'head'
          ? <p className={`mg-hint ${tone}`} role="status" aria-live="polite" aria-atomic="true">{hint ?? ' '}</p>
          : <MgToast hint={hint} tone={tone} />}
      </div>
    );
  }
  return (
    <div className="mg-col" data-task={taskId}>
      {/* guide / play wrappers are display: contents, except on short landscape screens (goal bar on top) */}
      <div className="mg-guide">
        <header className="mg-head">
          <span className="mg-emblem" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none"><path d="m16 3 12 7v12l-12 7-12-7V10Z" stroke="currentColor" strokeWidth="2" /><path d="m10 16 4 4 8-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <div className="mg-objective">
            <span className="mg-station">{lang === 'en' ? station?.titleEn : station?.title}</span>
            <p className="mg-goal">{fill(goal)}</p>
          </div>
          {status && <div className="mg-status">{status}</div>}
        </header>
      </div>
      <div className="mg-play">{children}</div>
      <p className={`mg-hint ${tone}`} role="status" aria-live="polite" aria-atomic="true">
        {hint ?? ' '}
      </p>
    </div>
  );
}

/** Feedback that pops over the board for a moment, then gets out of the way. */
function MgToast({ hint, tone }: { hint: React.ReactNode; tone: Tone }) {
  const [shown, setShown] = useState<React.ReactNode>(null);
  const key = typeof hint === 'string' ? hint : hint ? 'x' : '';
  useEffect(() => {
    if (!key) return setShown(null);
    setShown(hint);
    const t = setTimeout(() => setShown(null), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tone]);
  return (
    <p className={`mg-toast ${tone} ${shown ? 'on' : ''}`} role="status" aria-live="polite" aria-atomic="true">
      {shown}
    </p>
  );
}

// ------------------------------------------------------------------ soft WebAudio synth (no audio files)
/**
 * Every cue is built from rounded waves (sine / triangle) and band-passed noise with a short fade-in,
 * kept under ~1.3 kHz for tones, and goes through one bus: volume -> gentle low-pass -> soft
 * compressor (+ a little room reverb). Nothing should ever click, buzz or sting the ear.
 */
let ctx: AudioContext | null = null;
/** performance.now() of the last cue started — lets the generic button tap stay quiet when a screen already played its own sound */
let lastCueAt = -Infinity;
export const msSinceLastCue = () => performance.now() - lastCueAt;
/**
 * A running context keeps the audio thread (compressor + reverb) busy even in silence, which warms phones up:
 * suspend it once nothing has sounded for a while (no engine, no stinger); the next cue resumes it.
 */
const IDLE_SUSPEND_MS = 4000;
let sleepTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleSleep = () => {
  clearTimeout(sleepTimer);
  sleepTimer = setTimeout(() => {
    if (motors.size || playing) return scheduleSleep();
    if (ctx?.state === 'running') void ctx.suspend();
  }, IDLE_SUSPEND_MS);
};
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ctx?.state === 'running') void ctx.suspend();
  });
const ac = () => {
  lastCueAt = performance.now();
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    scheduleSleep();
    return ctx;
  } catch {
    return null;
  }
};
/** create / resume the context inside a user gesture (iOS unlock) without counting as a cue */
export const wakeAudio = () => {
  const at = lastCueAt;
  ac();
  lastCueAt = at;
};
/** the touch-down that already ticked a button, so the click trailing it stays quiet */
let touchTap: { el: EventTarget; at: number } | null = null;
/** Generic press tick: skipped when the press already played its own cue. */
export function uiTap(el?: EventTarget | null, touch = false) {
  if (!touch && el && touchTap?.el === el && performance.now() - touchTap.at < 3000) {
    touchTap = null;
    return;
  }
  if (touch && el) touchTap = { el, at: performance.now() };
  if (msSinceLastCue() < 120) return;
  sfx.tap();
}

/** Master volume (0..1) for every cue, set from the in-game settings and remembered per device. */
const VOL_KEY = 'ht-volume';
const DEFAULT_VOLUME = 0.7;
let volume = (() => {
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    return localStorage.getItem(VOL_KEY) == null || Number.isNaN(v) ? DEFAULT_VOLUME : Math.min(1, Math.max(0, v));
  } catch {
    return DEFAULT_VOLUME;
  }
})();

type Bus = { input: GainNode; dry: GainNode; wet: GainNode };
let bus: Bus | null = null;
/** small dark room: 1.1 s of decaying stereo noise */
function roomImpulse(a: AudioContext) {
  const len = Math.floor(a.sampleRate * 1.1);
  const ir = a.createBuffer(2, len, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
  }
  return ir;
}
const out = (a: AudioContext, reverb = 0.14) => {
  if (!bus || bus.input.context !== a) {
    const input = a.createGain();
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5200;
    lp.Q.value = 0.5;
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 18;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.2;
    input.connect(lp).connect(comp).connect(a.destination);
    const dry = a.createGain();
    dry.connect(input);
    const verb = a.createConvolver();
    verb.buffer = roomImpulse(a);
    const wet = a.createGain();
    wet.connect(verb).connect(input);
    bus = { input, dry, wet };
  }
  bus.input.gain.value = volume;
  if (reverb > 0) {
    // per-cue send amount: a short-lived gain into the shared reverb
    const send = a.createGain();
    send.gain.value = reverb;
    send.connect(bus.wet);
    const split = a.createGain();
    split.connect(bus.dry);
    split.connect(send);
    return split;
  }
  return bus.dry;
};
export const getVolume = () => volume;
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (bus) bus.input.gain.value = volume;
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch {
    /* ignore */
  }
}

type ToneOpts = { type?: OscillatorType; vol?: number; bend?: number; at?: number; attack?: number; lp?: number; reverb?: number };
/** One soft note: fade in over `attack`, exponential fade out by `dur`; `at` = delay in seconds. */
function tone(freq: number, dur: number, { type = 'sine', vol = 0.1, bend = 1, at = 0, attack = 0.008, lp, reverb }: ToneOpts = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (bend !== 1) o.frequency.exponentialRampToValueAtTime(freq * bend, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = o.connect(g);
  if (lp) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    node = node.connect(f);
  }
  node.connect(out(a, reverb));
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
/** 2 s of white noise, shared by every noise cue and the engines' exhaust */
function noiseBuffer(a: AudioContext) {
  if (!noiseBuf || noiseBuf.sampleRate !== a.sampleRate) {
    noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}
type NoiseOpts = { vol?: number; freq?: number; to?: number; q?: number; type?: BiquadFilterType; at?: number; attack?: number; reverb?: number };
/** Filtered noise burst (band-pass by default): rustles, taps, air, water. `to` sweeps the filter. */
function noise(dur: number, { vol = 0.06, freq = 1200, to, q = 1, type = 'bandpass', at = 0, attack = 0.004, reverb }: NoiseOpts = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out(a, reverb));
  src.start(t, Math.random() * 1.5);
  src.stop(t + dur + 0.05);
}

/** Notes in sequence: [freq, delay s, dur s] */
const notes = (list: [number, number, number][], o: ToneOpts = {}) => list.forEach(([f, at, d]) => tone(f, d, { ...o, at: (o.at ?? 0) + at }));
const jitter = (f: number, spread = 0.06) => f * (1 + (Math.random() * 2 - 1) * spread);

// C-major pentatonic, kept in the warm middle register
const C4 = 262, D4 = 294, E4 = 330, G4 = 392, A4 = 440, C5 = 523, D5 = 587, E5 = 659, G5 = 784, A5 = 880;

// ------------------------------------------------------------------ music stingers (rendered by tools/sfx/draw-music.mjs)
export type Ending = 'tasks' | 'vote' | 'killer' | 'timeout';
const TRACKS = ['intro', 'role-crew', 'role-cop', 'end-tasks', 'end-vote', 'end-killer', 'end-timeout'] as const;
type Track = (typeof TRACKS)[number];
/** the files are already mixed loud with their own room, so they sit under the master volume at this level */
const MUSIC_GAIN = 0.32;
const files = new Map<Track, Promise<ArrayBuffer | null>>();
const decoded = new Map<Track, Promise<AudioBuffer | null>>();
let playing: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
const file = (name: Track) => {
  let p = files.get(name);
  if (!p) {
    p = fetch(`/assets/maps/game/music/${name}.wav`)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .catch(() => null)
      .then((buf) => (buf || files.delete(name), buf));
    files.set(name, p);
  }
  return p;
};
function track(a: AudioContext, name: Track) {
  let p = decoded.get(name);
  if (!p) {
    p = file(name)
      .then((buf) => (buf ? a.decodeAudioData(buf) : null))
      .catch(() => null)
      .then((b) => (b || decoded.delete(name), b));
    decoded.set(name, p);
  }
  return p;
}
/** Download the stingers early (no AudioContext needed) so the intro card does not wait on the network. */
export const preloadMusic = () => TRACKS.forEach((n) => void file(n));
/** Play one stinger, fading out whichever was still ringing. Dropped if it took too long to load. */
function music(name: Track) {
  const a = ac();
  if (!a) return;
  const asked = a.currentTime;
  void track(a, name).then((buf) => {
    if (!buf || a.currentTime - asked > 1.5) return;
    const t = a.currentTime;
    if (playing) {
      playing.gain.gain.setTargetAtTime(0, t, 0.12);
      playing.src.stop(t + 0.6);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const gain = a.createGain();
    gain.gain.value = MUSIC_GAIN;
    src.connect(gain).connect(out(a, 0));
    src.start(t);
    const me = (playing = { src, gain });
    src.onended = () => playing === me && (playing = null);
  });
}

export const sfx = {
  // ---- interface
  /** light tap on a button / selection: short soft tick, still audible on a phone speaker */
  tap: () => (tone(jitter(640, 0.03), 0.06, { type: 'triangle', vol: 0.05, bend: 0.85, attack: 0.004, reverb: 0 }), noise(0.02, { vol: 0.025, freq: 1800, q: 2, reverb: 0 })),
  /** small positive step (a correct move inside a task) */
  ok: () => notes([[D5, 0, 0.14], [A5, 0.07, 0.2]], { type: 'triangle', vol: 0.06 }),
  /** gentle "nope": two low, round bumps, never a buzz */
  bad: () => (tone(233, 0.16, { vol: 0.09, bend: 0.85 }), tone(196, 0.22, { vol: 0.08, bend: 0.85, at: 0.11 })),
  /** answer sent: soft paper thump while the server checks it */
  send: () => (tone(150, 0.12, { vol: 0.08, bend: 0.7, reverb: 0 }), noise(0.08, { vol: 0.035, freq: 900, q: 0.8 })),
  /** task accepted: rising pentatonic chime with a bit of room */
  done: () => (notes([[C5, 0, 0.3], [E5, 0.09, 0.3], [G5, 0.18, 0.5]], { type: 'triangle', vol: 0.06, reverb: 0.3 }), tone(C4, 0.6, { vol: 0.05, at: 0.18 })),

  // ---- generic task foley
  /** soft wooden thunk: something set down */
  stamp: () => (tone(130, 0.16, { vol: 0.12, bend: 0.65, reverb: 0.05 }), noise(0.06, { vol: 0.04, freq: 600, q: 1.2 })),
  /** quiet rub / slide */
  scrape: () => noise(0.06, { vol: 0.03, freq: jitter(1600, 0.15), q: 1.5 }),
  /** dial / ratchet notch */
  click: () => (noise(0.025, { vol: 0.06, freq: jitter(2000, 0.08), q: 5, reverb: 0 }), tone(jitter(700, 0.04), 0.035, { vol: 0.025, reverb: 0 })),

  // ---- per task
  /** coffee: liquid stream into a cup */
  pour: () => (noise(0.55, { vol: 0.05, freq: 500, to: 1100, q: 2.5, attack: 0.05 }), [0.12, 0.26, 0.4].forEach((at) => tone(jitter(520, 0.2), 0.06, { vol: 0.025, bend: 1.4, at }))),
  /** packing tape pulled off the roll */
  tape: () => noise(0.22, { vol: 0.045, freq: 1100, to: 2200, q: 1.8, attack: 0.02 }),
  /** hand pump stroke: air whoosh + soft piston bump */
  pump: () => (noise(0.24, { vol: 0.055, freq: 400, to: 950, q: 1.4, attack: 0.04 }), tone(95, 0.14, { vol: 0.07, bend: 0.8, at: 0.02, reverb: 0 })),
  /** rubber patch pressed on */
  patch: () => (tone(170, 0.14, { vol: 0.09, bend: 0.7 }), noise(0.1, { vol: 0.03, freq: 700, to: 400, q: 1 })),
  /** carton set on a rack */
  thunk: () => (tone(115, 0.18, { vol: 0.12, bend: 0.6 }), noise(0.07, { vol: 0.045, freq: 450, q: 1 })),
  /** connector seated: tiny click and a little rising blip */
  plug: () => (noise(0.02, { vol: 0.06, freq: 2400, q: 6, reverb: 0 }), tone(440, 0.1, { vol: 0.045, bend: 1.5, at: 0.02, type: 'triangle' })),
  /** water running out of the pipe: bubbly blips */
  water: () => (noise(0.8, { vol: 0.03, freq: 700, to: 900, q: 3, attack: 0.1 }), Array.from({ length: 7 }, (_, i) => tone(jitter(420, 0.25), 0.07, { vol: 0.03, bend: 1.6, at: 0.05 + i * 0.1 }))),
  /** shutter slat clattering up a notch (muted metal) */
  shutter: () => (noise(0.1, { vol: 0.04, freq: jitter(850, 0.1), q: 3 }), tone(jitter(190, 0.05), 0.09, { type: 'triangle', vol: 0.03 })),
  /** bike rolled one slot: soft tyre-on-concrete rumble */
  roll: () => (noise(0.12, { vol: 0.04, freq: 320, to: 220, q: 0.9, attack: 0.02, reverb: 0 }), tone(jitter(82, 0.05), 0.1, { type: 'triangle', vol: 0.035, lp: 300, reverb: 0 })),
  /** bike blocked: dull rubber bump against the next bike */
  nudge: () => (tone(120, 0.12, { vol: 0.07, bend: 0.75, reverb: 0 }), noise(0.05, { vol: 0.03, freq: 300, type: 'lowpass', reverb: 0 })),
  /** scooter starts and pulls away: a few soft putts rising in pitch */
  rev: () => [0, 0.09, 0.17, 0.24, 0.3, 0.36, 0.42].forEach((at, i) => tone(55 + i * 9, 0.11, { type: 'triangle', vol: 0.05 + i * 0.004, lp: 380, at, reverb: 0.05 })),
  /** wheel hits a pothole */
  bump: () => (tone(95, 0.2, { vol: 0.14, bend: 0.55, reverb: 0 }), noise(0.12, { vol: 0.05, freq: 260, type: 'lowpass' })),
  /** wifi probe: brighter and higher the stronger the signal (0..1) */
  ping: (strength = 0.5) => {
    const s = Math.min(1, Math.max(0, strength));
    tone(480 + s * 420, 0.18, { vol: 0.035 + s * 0.03, reverb: 0.25 });
    if (s > 0.8) tone((480 + s * 420) * 1.5, 0.22, { vol: 0.03, at: 0.08, reverb: 0.25 });
  },
  /** item dropped into the ice cooler: muffled thud and two ice clinks */
  pack: () => (tone(140, 0.14, { vol: 0.09, bend: 0.7 }), tone(jitter(1050), 0.06, { vol: 0.025, at: 0.05 }), tone(jitter(1250), 0.05, { vol: 0.02, at: 0.11 })),
  /** cable unknotted: soft rustle + low pluck */
  untangle: () => (noise(0.09, { vol: 0.03, freq: 1300, q: 1.2 }), tone(jitter(G4, 0.03), 0.18, { type: 'triangle', vol: 0.045, at: 0.03 })),
  /** cardboard flap folded over */
  fold: () => (noise(0.12, { vol: 0.04, freq: 700, to: 450, q: 1 }), tone(160, 0.1, { vol: 0.06, bend: 0.75, at: 0.06 })),
  /** doorbell "ding-dong", soft and round */
  bell: () => notes([[E5, 0, 0.6], [C5, 0.32, 0.9]], { vol: 0.06, attack: 0.01, reverb: 0.35 }),
  /** phone camera shutter */
  snap: () => (noise(0.025, { vol: 0.06, freq: 2200, q: 3, reverb: 0 }), noise(0.04, { vol: 0.045, freq: 1500, q: 3, at: 0.06, reverb: 0 })),
  /** parcel handed over: paper rustle */
  handoff: () => noise(0.16, { vol: 0.04, freq: 1500, to: 900, q: 1, attack: 0.02 }),

  // ---- events
  /** someone was cuffed nearby: two muted metal clicks */
  cuffs: () => (noise(0.03, { vol: 0.07, freq: 2600, q: 8 }), noise(0.03, { vol: 0.07, freq: 3000, q: 8, at: 0.09 }), tone(620, 0.3, { vol: 0.03, bend: 0.75, at: 0.2 })),
  /** final-30s clock: wood-block tick/tock; last 10s a touch louder with a soft echo */
  countdown: (left: number) => {
    const f = left % 2 ? 660 : 560;
    const urgent = left <= 10;
    noise(0.03, { vol: urgent ? 0.05 : 0.035, freq: f * 2.2, q: 6, reverb: 0 });
    tone(f, 0.09, { type: 'triangle', vol: urgent ? 0.06 : 0.04, reverb: 0 });
    if (urgent) tone(f * 1.25, 0.08, { type: 'triangle', vol: 0.035, at: 0.12, reverb: 0 });
  },
  /** emergency meeting: soft two-tone scooter "píp píp" */
  meeting: () => [0, 0.26].forEach((at) => (tone(A4, 0.18, { type: 'triangle', vol: 0.06, at, attack: 0.015 }), tone(D5, 0.18, { type: 'triangle', vol: 0.04, at, attack: 0.015 }))),
  /** body reported: low, hushed falling sting */
  report: () => (tone(110, 0.9, { vol: 0.12, bend: 0.6, attack: 0.02, reverb: 0.3 }), notes([[E4, 0.15, 0.5], [C4, 0.4, 0.8]], { type: 'triangle', vol: 0.05, reverb: 0.3 })),
  /** my vote cast */
  vote: () => (noise(0.07, { vol: 0.035, freq: 1400, q: 1 }), tone(C5, 0.12, { type: 'triangle', vol: 0.05, at: 0.03 })),
  /** vote result: someone leaves the table (falling) or nobody does (level, neutral) */
  eject: () => notes([[G4, 0, 0.35], [E4, 0.22, 0.35], [C4, 0.44, 0.7]], { type: 'triangle', vol: 0.06, reverb: 0.3 }),
  skip: () => notes([[D4, 0, 0.3], [D4, 0.25, 0.4]], { type: 'triangle', vol: 0.05, reverb: 0.25 }),
  /** the night begins: timed to the five prelude lines (bass creeps in, phones buzz, cuffs, brass hit) */
  intro: () => music('intro'),
  /** the "cop among us" prelude line: siren whoop over a low hit and a phone buzz */
  alert: () => (
    tone(55, 1.1, { vol: 0.2, bend: 0.5, attack: 0.005, reverb: 0.35 }),
    noise(0.25, { vol: 0.07, freq: 180, type: 'lowpass' }),
    [0, 0.42].forEach((at) => (tone(740, 0.4, { type: 'sawtooth', vol: 0.025, bend: 1.35, at, attack: 0.03, lp: 1800, reverb: 0.3 }), tone(990, 0.4, { type: 'sawtooth', vol: 0.02, bend: 0.75, at: at + 0.21, attack: 0.03, lp: 1800, reverb: 0.3 }))),
    [0.05, 0.2].forEach((at) => noise(0.11, { vol: 0.03, freq: 160, q: 6, at: at + 0.9 }))
  ),
  /** role reveal: the cop gets a "dun dun dunnn", drivers get a cheeky horn and a bright arpeggio */
  role: (faction: string) => music(faction === 'killer' ? 'role-cop' : 'role-crew'),
  /** end of the night, by how it ended: deliveries done, cop voted out, everyone cuffed, or dawn broke */
  ending: (kind: Ending) => music(`end-${kind}`),

  // ---- older names some screens still call
  drum: () => (tone(100, 0.45, { vol: 0.14, bend: 0.5, reverb: 0.2 }), noise(0.08, { vol: 0.04, freq: 300, type: 'lowpass' })),
  senh: () => (noise(0.04, { vol: 0.07, freq: 2200, q: 4 }), noise(0.035, { vol: 0.05, freq: 2600, q: 4, at: 0.06 })),
  nguyet: (f = G4) => tone(f, 0.7, { type: 'triangle', vol: 0.08 }),
  sao: (f = G5) => tone(Math.min(f, 1000), 0.6, { vol: 0.06, attack: 0.05, reverb: 0.3 }),
};

// ------------------------------------------------------------------ scooter engines (continuous, per player)
/** What one engine should sound like right now: loudness 0..1 and rpm 0 (idle) .. 1 (riding). */
export type EngineMix = { id: string; level: number; rpm: number };
type Motor = { osc: OscillatorNode; air: AudioBufferSourceNode; lfo: OscillatorNode; lfoDepth: GainNode; lp: BiquadFilterNode; gain: GainNode; base: number };
const motors = new Map<string, Motor>();
/** loudest an engine ever gets (the player's own bike at full throttle) — well under the other cues */
const ENGINE_MAX = 0.05;
/** small 4-stroke hum: a few fast-falling harmonics, so there is no sawtooth rasp to filter away */
const engineWave = new WeakMap<BaseAudioContext, PeriodicWave>();

function motor(a: AudioContext, id: string): Motor {
  let m = motors.get(id);
  if (m) return m;
  // each bike idles at its own pitch so two nearby engines do not phase into one drone
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const base = 46 + (h % 7);
  let wave = engineWave.get(a);
  if (!wave) {
    const amp = [0, 1, 0.55, 0.3, 0.16, 0.08, 0.04];
    engineWave.set(a, (wave = a.createPeriodicWave(new Float32Array(amp), new Float32Array(amp.length))));
  }
  const osc = a.createOscillator();
  osc.setPeriodicWave(wave);
  osc.frequency.value = base;
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 260;
  lp.Q.value = 0.5;
  // exhaust breath: dark rumble under the tone, so it reads as a motor rather than a synth note
  const air = a.createBufferSource();
  air.buffer = noiseBuffer(a);
  air.loop = true;
  const airLp = a.createBiquadFilter();
  airLp.type = 'lowpass';
  airLp.frequency.value = 380;
  const airGain = a.createGain();
  airGain.gain.value = 0.45;
  // the "putt-putt": a slow (sub-audio) amplitude wobble at the firing rate — audio-rate wobble is what buzzed
  const lfo = a.createOscillator();
  lfo.frequency.value = 9;
  const lfoDepth = a.createGain();
  lfoDepth.gain.value = 0;
  const gain = a.createGain();
  gain.gain.value = 0;
  lfo.connect(lfoDepth).connect(gain.gain);
  osc.connect(lp).connect(gain);
  air.connect(airLp).connect(airGain).connect(gain);
  gain.connect(out(a, 0));
  osc.start();
  air.start(0, Math.random() * 1.5);
  lfo.start();
  m = { osc, air, lfo, lfoDepth, lp, gain, base };
  motors.set(id, m);
  return m;
}

/**
 * Mix every audible scooter (call ~10×/s). Engines missing from `list` fade out and are released.
 * Waits for the first user gesture so the browser never blocks or warns about autoplay.
 */
export function setEngines(list: EngineMix[]) {
  if (!navigator.userActivation?.hasBeenActive && !ctx) return;
  // nothing audible and nothing to fade out: don't wake (or keep awake) the context just to mix silence
  if (!motors.size && list.every((e) => e.level <= 0.001)) return;
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const keep = new Set<string>();
  for (const e of list) {
    if (e.level <= 0.001 && !motors.has(e.id)) continue;
    keep.add(e.id);
    const m = motor(a, e.id);
    const rpm = Math.min(1, Math.max(0, e.rpm));
    const level = Math.min(1, Math.max(0, e.level)) * ENGINE_MAX;
    m.osc.frequency.setTargetAtTime(m.base * (1 + rpm * 0.8), t, 0.25);
    m.lfo.frequency.setTargetAtTime(9 + rpm * 11, t, 0.25);
    m.lp.frequency.setTargetAtTime(260 + rpm * 340, t, 0.25);
    m.gain.gain.setTargetAtTime(level, t, 0.15);
    m.lfoDepth.gain.setTargetAtTime(level * 0.3, t, 0.15);
  }
  for (const [id, m] of motors) {
    if (keep.has(id)) continue;
    motors.delete(id);
    m.gain.gain.setTargetAtTime(0, t, 0.15);
    m.lfoDepth.gain.setTargetAtTime(0, t, 0.15);
    m.osc.stop(t + 1);
    m.air.stop(t + 1);
    m.lfo.stop(t + 1);
  }
}
