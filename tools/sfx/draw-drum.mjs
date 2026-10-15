#!/usr/bin/env node
/**
 * Synthesised night-watch drum hit (trống canh) — one strike, the client schedules the pattern.
 *   node tools/sfx/draw-drum.mjs
 * Writes apps/web/public/assets/maps/co-do-hue/sfx/trong-canh.wav (mono 16-bit, 22.05 kHz).
 * Model: two damped membrane modes with a pitch drop + a felt-mallet thump + a short skin slap.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = path.join(ROOT, 'apps/web/public/assets/maps/co-do-hue/sfx/trong-canh.wav');
const SR = 22050;
const DUR = 1.6;
const n = Math.floor(SR * DUR);
const x = new Float32Array(n);

// deterministic noise so re-runs give the same file
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

const modes = [
  // [start Hz, end Hz, gain, decay s]
  [78, 56, 1.0, 0.55],
  [124, 98, 0.45, 0.32],
  [181, 150, 0.18, 0.18],
  [262, 230, 0.07, 0.09],
];
const ph = modes.map(() => 0);
let lp = 0;
for (let i = 0; i < n; i++) {
  const t = i / SR;
  let v = 0;
  modes.forEach(([f0, f1, g, d], k) => {
    const f = f1 + (f0 - f1) * Math.exp(-t / 0.08);
    ph[k] += (2 * Math.PI * f) / SR;
    v += Math.sin(ph[k]) * g * Math.exp(-t / d);
  });
  // mallet thump: low-passed noise burst
  lp += 0.08 * (rnd() - lp);
  v += lp * 3.2 * Math.exp(-t / 0.025);
  // skin slap: bright click
  v += rnd() * 0.25 * Math.exp(-t / 0.006);
  // soft attack (2 ms) so it doesn't pop
  v *= Math.min(1, t / 0.002);
  x[i] = v;
}
const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const pcm = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.tanh((x[i] / peak) * 1.3) * 0.92 * 32767), i * 2);

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
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([h, pcm]));
console.log('wrote', path.relative(ROOT, OUT), `${((44 + pcm.length) / 1024).toFixed(0)} KB`);
