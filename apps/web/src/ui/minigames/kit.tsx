import { useEffect, useState } from 'react';
import type { TaskId } from '@hidden-truth/shared';
import { useLang } from '../../i18n';
import { asset } from '../common';
import { GUIDE } from './guide';

/** Mini-game art (tools/ui-art/draw-hue-bansoc.mjs). */
export const mg = (name: string) => asset(`maps/co-do-hue/minigames/${name}.webp`);

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

/**
 * Common frame for every mini-game: story line (from the server), the goal in one sentence,
 * numbered "how to play" steps and a status chip. No time limits anywhere — take your time.
 */
export function MgShell({ taskId, lore, status, children, hint, tone = 'info', vars }: {
  taskId: TaskId;
  lore: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  vars?: Record<string, string>;
}) {
  const lang = useLang((s) => s.lang);
  const g = GUIDE[taskId][lang === 'en' ? 'en' : 'vi'];
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => vars?.[k] ?? '');
  return (
    <div className="mg-col">
      <header className="mg-head">
        <div className="mg-head-text">
          <p className="mg-lore">{lore}</p>
          <p className="mg-goal">
            <b>{lang === 'en' ? 'Goal' : 'Mục tiêu'}</b> {fill(g.goal)}
          </p>
        </div>
        {status && <div className="mg-status">{status}</div>}
      </header>
      <ol className="mg-how">
        {g.steps.map((st, i) => (
          <li key={i}>
            <i>{i + 1}</i>
            <span>{fill(st)}</span>
          </li>
        ))}
      </ol>
      {children}
      <p className={`mg-hint ${tone}`} role="status">
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
  o.connect(g).connect(a.destination);
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
  src.connect(f).connect(g).connect(a.destination);
  src.start();
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
  watch: () => {
    sfx.drum();
    setTimeout(sfx.drum, 380);
  },
};
