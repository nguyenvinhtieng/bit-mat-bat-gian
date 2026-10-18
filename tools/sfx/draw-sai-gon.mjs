#!/usr/bin/env node
/**
 * Synthesised Sài Gòn SFX (mono 16-bit, 22.05 kHz, deterministic):
 *   coi-xe.wav     — scooter horn "píp píp": two nasal electric-horn beeps (emergency meeting / clock)
 *   to-te.wav      — short two-tone "tò te" whistle-horn, called up to the ward
 *   go-hu-tieu.wav — the hủ tiếu gõ seller's bamboo clappers "lốc cốc lốc cốc"
 *   node tools/sfx/draw-sai-gon.mjs
 * Writes apps/web/public/assets/maps/sai-gon/sfx/*.wav
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(ROOT, 'apps/web/public/assets/maps/sai-gon/sfx');
const SR = 22050;

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function write(name, x, drive = 1.3, level = 1) {
  const n = x.length;
  // DC blocker: the asymmetric horn pulse leaves an offset that would click on start/stop
  for (let i = 0, px = 0, py = 0; i < n; i++) [px, py] = [x[i], (x[i] = x[i] - px + 0.995 * py)];
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.tanh((x[i] / peak) * drive) * 0.92 * level * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  const out = path.join(DIR, name);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(out, Buffer.concat([h, pcm]));
  console.log('wrote', path.relative(ROOT, out), `${((44 + pcm.length) / 1024).toFixed(0)} KB`);
}

/** Electric horn tone: a buzzy pulse wave (vibrating diaphragm) through a crude resonant body. */
function horn(x, t0, dur, f, { pulse = 0.32, wobble = 0, body = 1700, gain = 1 } = {}) {
  const i0 = Math.floor(t0 * SR);
  let ph = 0;
  let lp = 0;
  let bp = 0;
  let bv = 0;
  const w = (2 * Math.PI * body) / SR;
  for (let i = 0; i < SR * dur && i0 + i < x.length; i++) {
    const t = i / SR;
    ph += (f * (1 + wobble * Math.sin(2 * Math.PI * 7 * t))) / SR;
    const sq = ph % 1 < pulse ? 1 : -1;
    lp += 0.45 * (sq - lp); // soften the edges
    // two-pole resonator around `body` Hz gives the nasal "honk"
    bv += w * (lp - bp - 0.18 * bv);
    bp += w * bv;
    const env = Math.min(1, t / 0.008) * Math.min(1, (dur - t) / 0.02);
    x[i0 + i] += gain * env * (0.6 * lp + 0.5 * bp);
  }
}

// ---------------------------------------------------------------- còi xe: píp píp
{
  const n = Math.floor(SR * 0.62);
  const x = new Float32Array(n);
  // cheap scooter horns are two slightly detuned discs — the beat makes them sound tinny
  for (const t0 of [0.0, 0.3]) {
    horn(x, t0, 0.2, 412, { body: 1650 });
    horn(x, t0, 0.2, 498, { body: 2100, gain: 0.7 });
  }
  write('coi-xe.wav', x, 1.8, 0.55); // sustained tones read louder than drum hits: match the other maps' clocks
}

// ---------------------------------------------------------------- tò te: falling two-tone
{
  const n = Math.floor(SR * 0.8);
  const x = new Float32Array(n);
  horn(x, 0.0, 0.32, 784, { pulse: 0.5, wobble: 0.006, body: 2400 }); // tò
  horn(x, 0.36, 0.38, 587, { pulse: 0.5, wobble: 0.006, body: 2000 }); // te
  write('to-te.wav', x, 1.4, 0.4);
}

// ---------------------------------------------------------------- gõ hủ tiếu: lốc cốc lốc cốc
{
  seed = 77;
  const n = Math.floor(SR * 1.2);
  const x = new Float32Array(n);
  // bamboo clapper: a hollow, fast-decaying knock (two body modes) + a click of noise
  const knock = (t0, f, g) => {
    const i0 = Math.floor(t0 * SR);
    for (let i = 0; i < SR * 0.12 && i0 + i < n; i++) {
      const t = i / SR;
      const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.018) + 0.45 * Math.sin(2 * Math.PI * f * 2.63 * t) * Math.exp(-t / 0.008);
      x[i0 + i] += g * (v + rnd() * 0.5 * Math.exp(-t / 0.0015));
    }
  };
  // "lốc" (lower) then "cốc" (higher), twice, with a human swing
  [[0.0, 880], [0.16, 1180], [0.46, 880], [0.6, 1180], [0.92, 900]].forEach(([t, f], k) => knock(t + rnd() * 0.008, f, k === 4 ? 0.6 : 1));
  write('go-hu-tieu.wav', x, 1.5);
}
