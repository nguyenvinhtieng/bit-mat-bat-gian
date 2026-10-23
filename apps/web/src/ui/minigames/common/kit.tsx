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
 * No time limits anywhere — take your time.
 */
export function MgShell({ taskId, status, children, hint, tone = 'info', vars }: {
  taskId: TaskId;
  status?: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  vars?: Record<string, string>;
}) {
  const lang = useLang((s) => s.lang);
  const goal = GUIDE[taskId]?.[lang === 'en' ? 'en' : 'vi'].goal ?? '';
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '');
  return (
    <div className="mg-col" data-task={taskId}>
      {/* guide / play wrappers are display: contents, except on short landscape screens (goal bar on top) */}
      <div className="mg-guide">
        <header className="mg-head">
          <p className="mg-goal">{fill(goal)}</p>
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

// ------------------------------------------------------------------ tiny WebAudio synth (no audio files)
let ctx: AudioContext | null = null;
const ac = () => {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

/** Master volume (0..1) for every cue, set from the in-game settings and remembered per device. */
const VOL_KEY = 'ht-volume';
let volume = (() => {
  try {
    const v = Number(localStorage.getItem(VOL_KEY));
    return localStorage.getItem(VOL_KEY) == null || Number.isNaN(v) ? 1 : Math.min(1, Math.max(0, v));
  } catch {
    return 1;
  }
})();
let master: GainNode | null = null;
const out = (a: AudioContext) => {
  if (!master || master.context !== a) (master = a.createGain()).connect(a.destination);
  master.gain.value = volume;
  return master;
};
export const getVolume = () => volume;
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v));
  if (master) master.gain.value = volume;
  try {
    localStorage.setItem(VOL_KEY, String(volume));
  } catch {
    /* ignore */
  }
}
function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, bend = 1) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (bend !== 1) o.frequency.exponentialRampToValueAtTime(freq * bend, a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(out(a));
  o.start();
  o.stop(a.currentTime + dur + 0.02);
}
function noise(dur: number, vol = 0.25, hp = 2000) {
  const a = ac();
  if (!a) return;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(out(a));
  src.start();
}

/** Recorded-style drum hit (tools/sfx/draw-drum.mjs), decoded once; falls back to the synth drum. */
/** The clock cue follows the room's map (MapSkin.sfx.clock); reloaded when the map changes. */
let drumBuf: AudioBuffer | null = null;
let drumLoading: Promise<void> | null = null;
let drumSrc = '';
function loadDrum() {
  const a = ac();
  const src = mapSkin(useStore.getState().room?.mapSlug).sfx?.clock ?? '';
  if (src !== drumSrc) (drumSrc = src), (drumBuf = null), (drumLoading = null);
  if (!a || !src || drumBuf || drumLoading) return drumLoading;
  drumLoading = fetch(`/assets/${src}`)
    .then((r) => r.arrayBuffer())
    .then((b) => a.decodeAudioData(b))
    .then((b) => void (drumBuf = b))
    .catch(() => {});
  return drumLoading;
}
function drumHit(at: number, vol: number) {
  const a = ac();
  if (!a) return;
  if (!drumBuf) return void setTimeout(sfx.drum, Math.max(0, (at - a.currentTime) * 1000));
  const src = a.createBufferSource();
  src.buffer = drumBuf;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(g).connect(out(a));
  src.start(at);
}
/** Night-watch pattern: canh n = a slow roll then n strikes; n > 5 = the long dawn roll. */
async function watchDrum(n: number) {
  await loadDrum();
  const a = ac();
  if (!a) return;
  let t = a.currentTime + 0.05;
  const roll = n > 5 ? 14 : 5;
  for (let i = 0; i < roll; i++) {
    drumHit(t, 0.35 + (0.4 * i) / roll);
    t += Math.max(0.09, 0.32 - i * 0.04);
  }
  t += 0.55;
  for (let i = 0; i < Math.min(n, 5); i++) {
    drumHit(t, 1);
    t += 0.75;
  }
}

export const sfx = {
  ok: () => (tone(660, 0.12, 'triangle', 0.15), setTimeout(() => tone(990, 0.16, 'triangle', 0.12), 70)),
  bad: () => tone(180, 0.25, 'sawtooth', 0.1, 0.6),
  drum: () => (tone(110, 0.5, 'sine', 0.55, 0.45), noise(0.08, 0.15, 400)),
  senh: () => (noise(0.07, 0.35, 3500), setTimeout(() => noise(0.05, 0.25, 4500), 60)),
  nguyet: (f = 392) => (tone(f, 0.7, 'triangle', 0.22), tone(f * 2, 0.35, 'sine', 0.06)),
  sao: (f = 784) => tone(f, 0.55, 'sine', 0.18, 1.01),
  stamp: () => (tone(90, 0.18, 'sine', 0.4, 0.6), noise(0.05, 0.12, 800)),
  scrape: () => noise(0.04, 0.05, 2500),
  /** handcuffs snapping shut + a short whistle (arrest, for the people nearby) */
  cuffs: () => (noise(0.03, 0.3, 5000), setTimeout(() => noise(0.03, 0.3, 6200), 90), setTimeout(() => tone(1400, 0.3, 'square', 0.05, 0.7), 200)),
  watch: (n = 2) => void watchDrum(n),
  preloadDrum: () => void loadDrum(),
};
