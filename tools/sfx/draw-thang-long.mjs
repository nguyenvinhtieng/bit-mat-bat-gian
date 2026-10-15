#!/usr/bin/env node
/**
 * Synthesised Thăng Long SFX (mono 16-bit, 22.05 kHz, deterministic):
 *   phao.wav            — a string of firecrackers (pháo tép): ~2 s of irregular sharp cracks
 *   trong-chau-tom.wav  — trống chầu "tom": open, resonant hit on the drumhead (praise)
 *   trong-chau-chat.wav — trống chầu "chát": dry rim/side hit (approval / mistake accent)
 *   node tools/sfx/draw-thang-long.mjs
 * Writes apps/web/public/assets/maps/thang-long/sfx/*.wav
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(ROOT, 'apps/web/public/assets/maps/thang-long/sfx');
const SR = 22050;

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

function write(name, x, drive = 1.3) {
  const n = x.length;
  const peak = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.tanh((x[i] / peak) * drive) * 0.92 * 32767), i * 2);
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

// ---------------------------------------------------------------- pháo
{
  seed = 11;
  const DUR = 2.2;
  const n = Math.floor(SR * DUR);
  const x = new Float32Array(n);
  let t = 0.01;
  while (t < DUR - 0.25) {
    const i0 = Math.floor(t * SR);
    const g = 0.4 + 0.6 * Math.abs(rnd());
    const dec = 0.004 + 0.006 * Math.abs(rnd());
    let lp = 0;
    for (let i = 0; i < SR * 0.12 && i0 + i < n; i++) {
      const tt = i / SR;
      const w = rnd();
      lp += 0.35 * (w - lp);
      // sharp broadband crack + a short low "pop" body
      x[i0 + i] += g * (w * Math.exp(-tt / dec) + 1.4 * lp * Math.exp(-tt / (dec * 3)) + 0.5 * Math.sin(2 * Math.PI * 140 * tt) * Math.exp(-tt / 0.02));
    }
    // irregular gaps, occasional doubles, slows a little toward the end
    t += (0.025 + 0.06 * Math.abs(rnd())) * (1 + (t / DUR) * 0.6);
  }
  // smoky tail: low rumble
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.01 * (rnd() - lp);
    x[i] += lp * 1.5 * Math.min(1, i / (SR * 0.3)) * Math.exp(-Math.max(0, i / SR - 1.6) / 0.25);
  }
  write('phao.wav', x, 1.6);
}

// ---------------------------------------------------------------- trống chầu
function drum(name, modes, thump, slap, dur) {
  seed = 23;
  const n = Math.floor(SR * dur);
  const x = new Float32Array(n);
  const ph = modes.map(() => 0);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    modes.forEach(([f0, f1, g, d], k) => {
      const f = f1 + (f0 - f1) * Math.exp(-t / 0.06);
      ph[k] += (2 * Math.PI * f) / SR;
      v += Math.sin(ph[k]) * g * Math.exp(-t / d);
    });
    lp += 0.12 * (rnd() - lp);
    v += lp * thump * Math.exp(-t / 0.02);
    v += rnd() * slap * Math.exp(-t / 0.005);
    v *= Math.min(1, t / 0.0015);
    x[i] = v;
  }
  write(name, x);
}

// "tom": open centre hit, ringing
drum('trong-chau-tom.wav', [[150, 112, 1.0, 0.42], [236, 200, 0.5, 0.26], [330, 300, 0.2, 0.14], [480, 450, 0.08, 0.07]], 2.0, 0.2, 1.2);
// "chát": wooden side/rim knock, dry and bright
drum('trong-chau-chat.wav', [[920, 860, 0.8, 0.035], [1480, 1400, 0.45, 0.022], [2300, 2250, 0.2, 0.012], [190, 170, 0.25, 0.05]], 0.6, 0.6, 0.35);
