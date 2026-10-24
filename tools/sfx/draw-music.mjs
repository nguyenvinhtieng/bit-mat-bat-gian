#!/usr/bin/env node
/**
 * Synthesised music stingers for "Hẻm 42 — Cuốc Cuối" (mono 16-bit, 24 kHz, deterministic).
 * Tone: a sneaky late-night caper — plucked upright bass, finger snaps, brushes, vibraphone, muted brass —
 * dressed with Sài Gòn sounds (rain just stopped, scooters, "píp píp" horns, phones buzzing).
 *   intro.wav        — timed to the 5-line prelude (one line every 1.4 s from 0.5 s, fades at 8.2 s):
 *                      bass creeps in -> the 50-million motif -> music cuts, every phone buzzes ->
 *                      tense return -> rising chase -> handcuffs "cạch cạch" -> final hit as the role appears
 *   role-crew.wav    — "you're a CRAB driver": horn píp píp + bright vibes
 *   role-cop.wav     — "you're the undercover cop": sly low "dun dun dunnn" + a wink of cuffs
 *   end-tasks.wav    — parcel delivered: swing walk, coins, horn, scooter pulls away
 *   end-vote.wav     — cop unmasked: "gotcha!" hit, everyone scatters on their bikes
 *   end-killer.wav   — last driver cuffed: cuffs, police whistle, noir descent
 *   end-timeout.wav  — dawn, parcel undelivered: birds, a rooster, a deflated "wah wah wah waaah"
 *   sock-cop.wav     — timed to the 6 s sock-check clip (scuffle -> zoom at 3.1 s -> drum roll -> flash at 4.7 s ->
 *                      reveal at 4.95 s): green socks, brass "gotcha!", cuffs and a police whistle
 *   sock-civil.wav   — same build-up; black socks: wrong driver, a deflated "wah wah waaah"
 *   node tools/sfx/draw-music.mjs
 * Writes apps/web/public/assets/maps/game/music/*.wav
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const DIR = path.join(ROOT, 'apps/web/public/assets/maps/game/music');
const SR = 24000;
const TAU = 2 * Math.PI;

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const smooth = (u) => u * u * (3 - 2 * u);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Mix `f(t)` into x from t0 for dur seconds. */
function add(x, t0, dur, f) {
  const i0 = Math.round(t0 * SR);
  for (let i = 0; i < dur * SR && i0 + i < x.length; i++) if (i0 + i >= 0) x[i0 + i] += f(i / SR);
}
/** Two-pole band-pass (state-variable) around f Hz; the returned filter can sweep with `fNow`. */
function bandpass(f, damp = 0.3) {
  let bp = 0;
  let bv = 0;
  return (v, fNow = f) => {
    const w = (TAU * fNow) / SR;
    bv += w * (v - bp - damp * bv);
    bp += w * bv;
    return bp;
  };
}
/** Struck resonances: [[freq, decay s, gain]] excited by a short noise click. */
function ring(x, t0, partials, gain = 1, click = 0.0015) {
  for (const [f, d, g] of partials) {
    let y1 = 0;
    let y2 = 0;
    const r = Math.exp(-1 / (d * SR));
    const c = 2 * r * Math.cos((TAU * f) / SR);
    add(x, t0, Math.min(1.5, d * 8), (t) => {
      const y = (t < click ? rnd() : 0) + c * y1 - r * r * y2;
      [y2, y1] = [y1, y];
      return gain * g * y * 0.05;
    });
  }
}

/**
 * Every file lands at the same loudness (RMS), with soft-clipped peaks and click-free ends.
 * `soft` masters an ending for the results screen: quieter, rolled-off highs, eased in so nothing jumps out.
 */
function write(name, x, { soft = false } = {}) {
  const n = x.length;
  for (let i = 0, px = 0, py = 0; i < n; i++) [px, py] = [x[i], (x[i] = x[i] - px + 0.995 * py)];
  if (soft) {
    const a = 1 - Math.exp((-TAU * 3000) / SR); // two gentle low-pass poles
    for (let i = 0, l1 = 0, l2 = 0; i < n; i++) (l1 += a * (x[i] - l1)), (l2 += a * (l1 - l2)), (x[i] = l2);
  }
  const fadeIn = soft ? 0.15 : 0.005;
  for (let i = 0; i < SR * fadeIn; i++) x[i] *= smooth(i / (SR * fadeIn));
  for (let i = 0; i < SR * (soft ? 0.8 : 0.3); i++) x[n - 1 - i] *= i / (SR * (soft ? 0.8 : 0.3));
  let peak = 0;
  let sum = 0;
  for (const v of x) (peak = Math.max(peak, Math.abs(v))), (sum += v * v);
  const rms = Math.sqrt(sum / n) || 1;
  const g = soft ? Math.min(0.75 / (peak || 1), 0.085 / rms) : Math.min(1.25 / (peak || 1), 0.14 / rms);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.tanh(x[i] * g) * 0.95 * 32767), i * 2);
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

// ---------------------------------------------------------------- band
/** Plucked upright bass; `fall` octaves = tape-stop droop over the note. */
function bass(x, t0, midi, { dur = 0.45, gain = 0.55, fall = 0 } = {}) {
  let ph = 0;
  add(x, t0, dur, (t) => {
    const droop = fall ? 2 ** (-fall * smooth(t / dur)) : 1;
    ph += (hz(midi) * (1 + 0.03 * Math.exp(-t * 40)) * droop) / SR;
    const s = Math.sin(TAU * ph) + 0.4 * Math.sin(2 * TAU * ph) + 0.12 * Math.sin(3 * TAU * ph);
    const env = Math.min(1, t / 0.004) * Math.exp(-t * (fall ? 1.5 : 4.5)) * Math.min(1, (dur - t) / 0.04);
    return gain * (env * s + (t < 0.005 ? rnd() * 0.3 : 0));
  });
}
/** Vibraphone: bright bar partials that die fast, a body that rings, a little motor tremolo. */
function vib(x, t0, midi, { dur = 1.2, gain = 0.3 } = {}) {
  const f = hz(midi);
  add(x, t0, dur, (t) => {
    const s = Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 4 * f * t) * Math.exp(-t * 9) + 0.08 * Math.sin(TAU * 10 * f * t) * Math.exp(-t * 25);
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 2.4) * (0.85 + 0.15 * Math.sin(TAU * 5.5 * t)) * Math.min(1, (dur - t) / 0.05);
    return gain * env * s;
  });
}
const snap = (x, t0, gain = 1) => ring(x, t0, [[2300, 0.012, 1], [1500, 0.008, 0.6], [3400, 0.006, 0.5]], gain, 0.003);
function brush(x, t0, gain = 0.12, dur = 0.12) {
  let lp = 0;
  add(x, t0, dur, (t) => {
    const n = rnd();
    lp += 0.3 * (n - lp);
    return gain * (n - lp) * Math.exp(-t * 30) * Math.min(1, t / 0.004);
  });
}
function kick(x, t0, gain = 0.7) {
  let ph = 0;
  add(x, t0, 0.4, (t) => {
    ph += (48 + 50 * Math.exp(-t * 30)) / SR;
    return gain * Math.sin(TAU * ph) * Math.exp(-t * 9) * Math.min(1, t / 0.002);
  });
}
/** Brass (saw-like): bright on the attack, darkening as it holds. `wah` opens the mute once. */
function brass(x, t0, midis, { dur = 1.4, gain = 0.18, attack = 0.012, wah = false, sag = 0, vibr = 0 } = {}) {
  for (const m of midis)
    for (const det of [-0.003, 0.003]) {
      const ph = new Float64Array(9);
      add(x, t0, dur, (t) => {
        const u = t / dur;
        const bright = wah ? 0.2 + 0.45 * Math.sin(Math.PI * clamp01(t / 0.35)) ** 2 * (1 - 0.5 * u) : 0.3 + 0.45 * Math.exp(-t * 4);
        const v = vibr * clamp01((t - 0.4) / 0.4) * Math.sin(TAU * 5 * t);
        const f = hz(m - sag * smooth(u) + v) * (1 + det);
        let s = 0;
        for (let k = 1; k <= 8; k++) (ph[k] += (f * k) / SR), (s += (Math.sin(TAU * ph[k]) * bright ** (k - 1)) / k);
        const env = Math.min(1, t / attack) * (0.55 + 0.45 * Math.exp(-t * 3)) * Math.min(1, (dur - t) / 0.12);
        return (gain / 2) * env * s;
      });
    }
}
/** Rising filtered noise into a hit. */
function riser(x, t0, dur, gain = 0.25) {
  const bp = bandpass(400, 0.5);
  add(x, t0, dur, (t) => gain * (t / dur) ** 2 * bp(rnd(), 400 + 2600 * (t / dur) ** 2));
}
/** slow-swelling chord bed */
function pad(x, t0, dur, midis, gain = 0.1) {
  for (const m of midis)
    for (const d of [-0.0015, 0, 0.0015]) {
      const f = hz(m) * (1 + d);
      add(x, t0, dur, (t) => (gain / 3) * Math.sin(Math.PI * clamp01(t / (dur * 0.35)) * 0.5) ** 2 * Math.min(1, (dur - t) / (dur * 0.4)) * (Math.sin(TAU * f * t) + 0.15 * Math.sin(2 * TAU * f * t)));
    }
}

// ---------------------------------------------------------------- the street
/** Rain just stopped: water dripping off awnings + a faint wet hiss. */
function drips(x, t0, dur, { rate = 5, gain = 0.5 } = {}) {
  let lp = 0;
  add(x, t0, dur, (t) => {
    const n = rnd();
    lp += 0.4 * (n - lp);
    return gain * 0.025 * (n - lp) * Math.min(1, t / 0.6) * Math.min(1, (dur - t) / 0.6);
  });
  for (let i = 0; i < dur * rate; i++) {
    const at = t0 + ((rnd() + 1) / 2) * dur;
    const f = 900 + ((rnd() + 1) / 2) * 1300;
    let ph = 0;
    add(x, at, 0.06, (t) => ((ph += (f * (1 + 25 * t)) / SR), gain * 0.12 * Math.sin(TAU * ph) * Math.exp(-t * 70)));
  }
}
/** A phone on the table vibrating: motor buzz + plastic rattle. */
function buzz(x, t0, dur = 0.32, gain = 0.5) {
  const rattle = bandpass(1800, 0.4);
  add(x, t0, dur, (t) => {
    const m = Math.sin(TAU * 172 * t);
    const env = Math.min(1, t / 0.012) * Math.min(1, (dur - t) / 0.02);
    return gain * env * (0.24 * Math.tanh(3 * m) + 0.5 * rattle(m > 0.8 ? rnd() : 0));
  });
}
/** Handcuffs: a quick ratchet then the bright "cạch". */
function cuffs(x, t0, gain = 1) {
  for (let i = 0; i < 4; i++) ring(x, t0 + i * 0.014, [[3100, 0.006, 1], [4200, 0.004, 0.6]], gain * 0.35);
  ring(x, t0 + 0.07, [[2600, 0.05, 1], [3450, 0.035, 0.8], [4350, 0.025, 0.6], [1250, 0.06, 0.5]], gain);
}
/** Scooter electric horn: buzzy pulse through a nasal resonance (as in draw-sai-gon.mjs). */
function horn(x, t0, dur, f, { body = 1700, gain = 0.35 } = {}) {
  let ph = 0;
  let lp = 0;
  const res = bandpass(body, 0.18);
  add(x, t0, dur, (t) => {
    ph += f / SR;
    lp += 0.45 * ((ph % 1 < 0.32 ? 1 : -1) - lp);
    return gain * Math.min(1, t / 0.008) * Math.min(1, (dur - t) / 0.02) * (0.6 * lp + 0.5 * res(lp));
  });
}
const pipPip = (x, t0, gain = 0.3, k = 1) => [0, 0.22].forEach((d) => (horn(x, t0 + d, 0.16, 412 * k, { body: 1650, gain }), horn(x, t0 + d, 0.16, 498 * k, { body: 2100, gain: gain * 0.7 })));
/** A scooter pulling away: revs up, then fades into the distance. */
function scooter(x, t0, dur, { from = 70, to = 115, gain = 0.3 } = {}) {
  let ph = 0;
  let lp = 0;
  let nl = 0;
  add(x, t0, dur, (t) => {
    const u = t / dur;
    const f = from + (to - from) * smooth(Math.min(1, u * 1.6));
    ph += f / SR;
    const s = Math.sin(TAU * ph) + 0.5 * Math.sin(2 * TAU * ph) + 0.25 * Math.sin(3 * TAU * ph);
    nl += 0.08 * (rnd() - nl);
    lp += 0.15 * (s * (0.7 + 0.3 * Math.sin(TAU * f * 0.16 * t)) + nl - lp);
    return gain * Math.min(1, t / 0.15) * (1 - u) ** 1.6 * lp;
  });
}
/** Coin / cash "ting": inharmonic bell partials. */
function coin(x, t0, midi, gain = 0.18) {
  const f = hz(midi);
  const parts = [[1, 3], [2.76, 6], [5.4, 11], [8.93, 18]];
  add(x, t0, 1.2, (t) => gain * Math.min(1, t / 0.001) * parts.reduce((s, [r, d], k) => s + (Math.sin(TAU * f * r * t) * Math.exp(-t * d)) / (k + 1), 0));
}
/** Pea whistle "tuýt": a high tone fluttering as the pea spins, over breath noise. */
function whistle(x, t0, dur, gain = 0.2) {
  let ph = 0;
  const breath = bandpass(2900, 0.6);
  add(x, t0, dur, (t) => {
    const fl = Math.sin(TAU * 31 * t);
    ph += (2850 * (1 + 0.025 * fl)) / SR;
    const env = Math.min(1, t / 0.02) * Math.min(1, (dur - t) / 0.03);
    return gain * env * ((0.7 + 0.3 * fl) * Math.sin(TAU * ph) + breath(rnd()) * 0.25);
  });
}
/** Rooster "ò ó o o": a buzzy glottal source through two throat formants, along a pitch contour. */
function rooster(x, t0, gain = 0.4) {
  const pts = [[0, 470], [0.1, 640], [0.28, 700], [0.34, 580], [0.46, 760], [0.95, 730], [1.35, 560], [1.6, 470]];
  const f0 = (t) => {
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * smooth((t - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
    return 470;
  };
  const dips = [0.09, 0.33, 0.47];
  const f1 = bandpass(1150, 0.35);
  const f2 = bandpass(2500, 0.4);
  let ph = 0;
  add(x, t0, 1.6, (t) => {
    ph += (f0(t) * (1 + 0.012 * Math.sin(TAU * 38 * t))) / SR;
    let src = 0;
    for (let k = 1; k <= 10; k++) src += Math.sin(TAU * k * ph) / k;
    const gap = dips.reduce((g, d) => g * (1 - 0.75 * Math.exp(-(((t - d) / 0.025) ** 2))), 1);
    const env = Math.min(1, t / 0.03) * Math.min(1, (1.6 - t) / 0.25) * gap;
    return gain * env * (f1(src) * 0.6 + f2(src) * 0.35);
  });
}
function birds(x, t0, dur, { rate = 3, gain = 0.12 } = {}) {
  for (let i = 0; i < dur * rate; i++) {
    const at = t0 + ((rnd() + 1) / 2) * dur;
    const f = 3000 + ((rnd() + 1) / 2) * 1400;
    const n = 2 + Math.round((rnd() + 1) * 1.2);
    for (let j = 0; j < n; j++) {
      let ph = 0;
      add(x, at + j * 0.09, 0.06, (t) => ((ph += (f * (1 + 0.5 * (t / 0.06))) / SR), gain * Math.sin(TAU * ph) * Math.sin((Math.PI * t) / 0.06) ** 2));
    }
  }
}

/** Schroeder room: four damped combs into two all-passes, mixed under the dry signal. */
function reverb(x, wet = 0.22) {
  const scale = SR / 44100;
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(Math.round(d * scale)), i: 0, lp: 0 }));
  const aps = [556, 225].map((d) => ({ buf: new Float32Array(Math.round(d * scale)), i: 0 }));
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let s = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.lp = o * 0.65 + c.lp * 0.35;
      c.buf[c.i] = x[n] * 0.25 + c.lp * 0.78;
      c.i = (c.i + 1) % c.buf.length;
      s += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      a.buf[a.i] = s + o * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = o - s * 0.5;
    }
    y[n] = x[n] + wet * s;
  }
  return y;
}

const N = {
  A1: 33, Bb1: 34, C2: 36, D2: 38, Eb2: 39, E2: 40, F2: 41, G2: 43, Ab2: 44, A2: 45, C3: 48, D3: 50, Eb3: 51, F3: 53, Gb3: 54, G3: 55, A3: 57, Bb3: 58,
  C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, Bb4: 70, B4: 71, C5: 72, D5: 74, Eb5: 75, E5: 76, F5: 77, G5: 79, Ab5: 80, A5: 81, C6: 84,
};
const buf = (sec) => new Float32Array(Math.round(SR * sec));

// ---------------------------------------------------------------- intro (prelude lines at 0.5 / 1.9 / 3.3 / 4.7 / 6.1 s)
{
  const x = buf(9.9);
  const E = 0.35; // one eighth; a prelude line lasts four of them
  drips(x, 0, 9.6, { rate: 4 });
  // lines 1-2 "a special ride… a 50-million parcel": the bass creeps, snaps on the backbeat
  [[0.5, N.D2], [1.2, N.F2], [1.55, N.G2], [1.9, N.D2], [2.25, N.Ab2], [2.6, N.A2]].forEach(([t, m]) => bass(x, t, m));
  bass(x, 2.95, N.C3, { dur: 0.35, fall: 1 }); // tape stop: the music dies right as the tip-off line lands
  [1.2, 2.6].forEach((t) => snap(x, t));
  [0.85, 1.55, 2.25].forEach((t) => brush(x, t));
  [[1.9, N.D5, 0.34], [2.1, N.F5, 0.45], [2.6, N.E5, 0.18], [2.78, N.Eb5, 0.18], [2.95, N.D5, 0.33]].forEach(([t, m, d]) => vib(x, t, m, { dur: d }));
  // line 3 "an undercover cop is among us": silence, every phone on the table buzzes
  buzz(x, 3.38);
  buzz(x, 3.85);
  pad(x, 3.6, 1.3, [N.D2, N.A2], 0.08);
  // line 4: back in, tense — sixteenth-note bass, kick on the beat, semitone stabs
  for (let k = 0; k < 8; k++) bass(x, 4.7 + k * (E / 2), k % 4 === 3 ? N.Eb2 : N.D2, { dur: 0.16, gain: 0.45 });
  [4.7, 5.4].forEach((t) => kick(x, t, 0.5));
  for (let k = 0; k < 4; k++) brush(x, 4.7 + k * E, 0.1);
  vib(x, 5.05, N.A4, { dur: 0.3 });
  vib(x, 5.75, N.Bb4, { dur: 0.3 });
  // line 5 "…before the whole crew is cuffed": chromatic climb into the hit
  [N.D2, N.D2, N.Eb2, N.Eb2, N.E2, N.E2, N.F2, N.F2].forEach((m, k) => bass(x, 6.1 + k * (E / 2), m, { dur: 0.16, gain: 0.45 + k * 0.02 }));
  for (let k = 0; k < 8; k++) brush(x, 6.1 + k * (E / 2), 0.07 + k * 0.01, 0.08);
  [6.1, 6.8, 7.15, 7.33].forEach((t) => kick(x, t, 0.45));
  [[6.1, N.A4], [6.45, N.Bb4], [6.8, N.B4], [7.15, N.C5]].forEach(([t, m]) => vib(x, t, m, { dur: 0.3 }));
  riser(x, 6.1, 1.45);
  cuffs(x, 7.55);
  cuffs(x, 7.74, 0.8);
  // the prelude fades and the role card appears: one dark hit
  brass(x, 8.05, [N.D3, N.F3, N.A3, N.C4], { dur: 1.6, gain: 0.2 });
  bass(x, 8.05, N.D2, { dur: 1.4, gain: 0.6 });
  kick(x, 8.05, 0.8);
  snap(x, 8.05);
  write('intro.wav', reverb(x, 0.2));
}

// ---------------------------------------------------------------- role reveal
{
  const x = buf(2.8);
  pipPip(x, 0);
  [N.F4, N.A4, N.C5, N.F5].forEach((m, i) => vib(x, 0.45 + i * 0.09, m, { dur: 1.8 - i * 0.09, gain: 0.26 }));
  bass(x, 0.45, N.F2, { dur: 1.2 });
  kick(x, 0.45, 0.5);
  snap(x, 0.45);
  brass(x, 0.45, [N.F3, N.A3, N.C4], { dur: 0.5, gain: 0.1 });
  write('role-crew.wav', reverb(x, 0.22));
}
{
  const x = buf(3.2);
  [0, 0.4].forEach((t) => (brass(x, t, [N.D2, N.D3], { dur: 0.3, gain: 0.22 }), bass(x, t, N.D2, { dur: 0.3 }), kick(x, t, 0.5)));
  brass(x, 0.8, [N.Eb2, N.Eb3, N.A3], { dur: 1.9, gain: 0.2 });
  bass(x, 0.8, N.Eb2, { dur: 1.6, gain: 0.6 });
  kick(x, 0.8, 0.7);
  snap(x, 1.35);
  vib(x, 1.35, N.D5, { dur: 1.2, gain: 0.2 });
  vib(x, 1.55, N.Ab5, { dur: 1.2, gain: 0.18 });
  cuffs(x, 2.25, 0.45);
  write('role-cop.wav', reverb(x, 0.25));
}

// ---------------------------------------------------------------- endings
// The results screen stays up a while, so the endings are gentle: they ease in, sit under the UI and resolve.
/** Soft electric piano: rounded tine + bell that fades, slow-ish attack so nothing pokes out. */
function keys(x, t0, midi, { dur = 1.4, gain = 0.2 } = {}) {
  const f = hz(midi);
  add(x, t0, dur, (t) => {
    const s = Math.sin(TAU * f * t + 0.6 * Math.sin(TAU * f * t) * Math.exp(-t * 6)) + 0.12 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 3);
    const env = smooth(clamp01(t / 0.018)) * Math.exp(-t * 1.6) * (0.92 + 0.08 * Math.sin(TAU * 4.5 * t)) * Math.min(1, (dur - t) / 0.2);
    return gain * env * s;
  });
}
const arp = (x, t0, midis, step = 0.09, o = {}) => midis.forEach((m, i) => keys(x, t0 + i * step, m, { ...o, dur: (o.dur ?? 2) - i * step }));
{
  // parcel delivered: an easy swing in F, a soft "ting" of payment, a scooter purring off down the alley
  const x = buf(6.4);
  pad(x, 0, 6.2, [N.F3, N.A3, N.C4, N.E4], 0.07);
  [[0, N.F2], [0.6, N.A2], [1.2, N.C3], [1.8, N.D3], [2.4, N.C3]].forEach(([t, m]) => bass(x, t, m, { dur: 0.55, gain: 0.35 }));
  for (let k = 0; k < 10; k++) brush(x, k * 0.3 + (k % 2 ? 0.05 : 0), 0.05);
  [[0.3, N.C5], [0.6, N.D5], [0.9, N.F5], [1.2, N.A5], [1.5, N.G5], [1.8, N.F5], [2.1, N.D5]].forEach(([t, m]) => keys(x, t, m, { dur: 0.7, gain: 0.16 }));
  coin(x, 1.25, 84, 0.05);
  arp(x, 2.9, [N.F3, N.C4, N.E4, N.A4, N.C5, N.G5], 0.11, { dur: 3, gain: 0.13 });
  bass(x, 2.9, N.F2, { dur: 2, gain: 0.35 });
  scooter(x, 3.6, 2.6, { gain: 0.1 });
  write('end-tasks.wav', reverb(x, 0.3), { soft: true });
}
{
  // cop unmasked: a relieved lift — rising arpeggio, the crew laughs it off and rides away
  const x = buf(5.8);
  pad(x, 0, 5.6, [N.Bb3, N.D4, N.F4], 0.07);
  arp(x, 0.05, [N.F3, N.Bb3, N.D4, N.F4, N.A4, N.D5], 0.08, { dur: 1.6, gain: 0.14 });
  bass(x, 0.05, 34 + 12, { dur: 1.2, gain: 0.35 });
  [[1.3, N.C5], [1.6, N.D5], [1.9, N.F5], [2.35, N.Eb5], [2.65, N.D5], [2.95, N.C5]].forEach(([t, m]) => keys(x, t, m, { dur: 0.7, gain: 0.15 }));
  [[1.3, N.G2], [1.9, N.Eb2], [2.5, N.F2]].forEach(([t, m]) => bass(x, t, m, { dur: 0.55, gain: 0.32 }));
  [1.6, 2.2, 2.8].forEach((t) => snap(x, t, 0.35));
  scooter(x, 2.2, 2.6, { from: 70, to: 110, gain: 0.08 });
  arp(x, 3.25, [N.Bb3, N.D4, N.F4, N.A4, N.D5], 0.1, { dur: 2.3, gain: 0.13 });
  bass(x, 3.25, 46, { dur: 2, gain: 0.35 });
  write('end-vote.wav', reverb(x, 0.3), { soft: true });
}
{
  // last driver cuffed: a quiet click in the distance, then a slow, sad walk down in D minor
  const x = buf(6);
  pad(x, 0, 5.8, [N.D3, N.F3, N.A3], 0.07);
  cuffs(x, 0.25, 0.22);
  [[0.7, N.D2, N.A4], [1.5, N.C2, N.G4], [2.3, N.Bb1, N.F4], [3.1, N.A1, N.E4]].forEach(([t, b, v]) => (bass(x, t, b, { dur: 0.8, gain: 0.32 }), keys(x, t, v, { dur: 0.9, gain: 0.16 })));
  [1.1, 1.9, 2.7].forEach((t) => brush(x, t, 0.04, 0.2));
  brass(x, 3.9, [N.D3, N.F3, N.A3], { dur: 1.9, gain: 0.08, attack: 0.35 });
  arp(x, 3.9, [N.D4, N.F4, N.A4, N.E5], 0.14, { dur: 2, gain: 0.11 });
  bass(x, 3.9, N.D2, { dur: 1.8, gain: 0.32 });
  write('end-killer.wav', reverb(x, 0.32), { soft: true });
}
{
  // dawn, parcel still here: birds wake, a far-off rooster, and a sleepy, shrugging "wah wah wah waaah"
  const x = buf(6.6);
  birds(x, 0, 6.2, { rate: 1.5, gain: 0.05 });
  rooster(x, 0.4, 0.08);
  pad(x, 0.1, 6, [N.G3, N.D4, N.A4], 0.07);
  [[2.2, N.G3], [2.75, N.Gb3], [3.3, N.F3]].forEach(([t, m]) => brass(x, t, [m], { dur: 0.5, gain: 0.2, attack: 0.05, wah: true }));
  brass(x, 3.85, [N.F3 - 1], { dur: 2, gain: 0.2, attack: 0.08, wah: true, sag: 0.5, vibr: 0.3 });
  bass(x, 3.85, N.Eb2, { dur: 1.6, gain: 0.3 });
  write('end-timeout.wav', reverb(x, 0.28), { soft: true });
}

// ---------------------------------------------------------------- sock check (timed to cinematics/sock-*.mp4)
/** Cloth scuffle: a quick band-passed noise swell (pulling, tugging at trousers). */
function rustle(x, t0, dur = 0.16, gain = 0.12) {
  const bp = bandpass(1100, 0.7);
  add(x, t0, dur, (t) => gain * Math.sin((Math.PI * t) / dur) ** 2 * bp(rnd(), 900 + 900 * (t / dur)));
}
/** 0-2.9 s the crew wrestles the trouser leg up, 3.1 s cut to the ankle, a drum roll, 4.7 s the flash. */
function sockBuildup(x) {
  const E = 0.25;
  [N.D2, N.D2, N.F2, N.D2, N.Ab2, N.G2, N.F2, N.Eb2, N.D2, N.D2, N.F2, N.D2].forEach((m, k) => bass(x, 0.05 + k * E, m, { dur: 0.22, gain: 0.45 }));
  for (let k = 0; k < 6; k++) kick(x, 0.05 + k * 2 * E, 0.45);
  for (let k = 0; k < 6; k++) snap(x, 0.3 + k * 2 * E, 0.6);
  [0.2, 0.55, 0.9, 1.15, 1.5, 1.85, 2.1, 2.4, 2.65].forEach((t, k) => rustle(x, t, 0.14 + (k % 3) * 0.04, 0.1 + (k % 2) * 0.05));
  [[0.55, N.D5], [0.8, N.F5], [1.55, N.E5], [1.8, N.Eb5], [2.3, N.D5]].forEach(([t, m]) => vib(x, t, m, { dur: 0.28, gain: 0.18 }));
  // zoom to the ankle
  riser(x, 2.55, 0.55, 0.3);
  kick(x, 3.1, 0.8);
  snap(x, 3.1);
  bass(x, 3.1, N.D2, { dur: 1.5, gain: 0.5 });
  // drum roll: hits crowd together and swell into the flash, a heartbeat underneath, a dissonant bed
  for (let t = 3.2, gap = 0.11; t < 4.62; t += gap, gap = Math.max(0.028, gap * 0.93)) brush(x, t, 0.06 + 0.14 * ((t - 3.2) / 1.42), 0.07);
  [3.45, 3.62, 4.05, 4.2].forEach((t, k) => kick(x, t, k % 2 ? 0.3 : 0.45));
  pad(x, 3.15, 1.55, [N.D3, N.Eb3, N.A3], 0.09);
  riser(x, 3.6, 1.05, 0.22);
  // flash: a bright shimmer while the screen goes white
  [96, 91, 100].forEach((m, k) => coin(x, 4.68 + k * 0.05, m, 0.06));
}
{
  const x = buf(6.8);
  sockBuildup(x);
  // green socks: GOTCHA! — big major hit, cuffs, a police whistle, sparkles
  kick(x, 4.95, 0.9);
  snap(x, 4.95);
  bass(x, 4.95, N.Bb1, { dur: 1.6, gain: 0.6 });
  brass(x, 4.95, [N.Bb3, N.D4, N.F4], { dur: 1.5, gain: 0.22 });
  cuffs(x, 5.3);
  cuffs(x, 5.45, 0.7);
  whistle(x, 5.7, 0.22, 0.14);
  whistle(x, 5.98, 0.4, 0.14);
  [[5.05, N.F5], [5.15, N.Bb4 + 12], [5.25, N.D5 + 12]].forEach(([t, m]) => vib(x, t, m, { dur: 1.2, gain: 0.14 }));
  [5.2, 5.5, 5.85].forEach((t, k) => coin(x, t, 93 + k * 2, 0.05));
  write('sock-cop.wav', reverb(x, 0.24));
}
{
  const x = buf(6.8);
  sockBuildup(x);
  // black socks: wrong driver — the hit sags, then a shrugging "wah wah waaah"
  kick(x, 4.95, 0.8);
  bass(x, 4.95, N.D2, { dur: 0.6, gain: 0.55, fall: 1 });
  [[4.95, N.G3], [5.3, N.Gb3]].forEach(([t, m]) => brass(x, t, [m], { dur: 0.32, gain: 0.22, attack: 0.04, wah: true }));
  brass(x, 5.65, [N.F3], { dur: 1.1, gain: 0.22, attack: 0.06, wah: true, sag: 0.6, vibr: 0.3 });
  bass(x, 5.65, N.Eb2, { dur: 1, gain: 0.35 });
  write('sock-civil.wav', reverb(x, 0.24));
}

// ---------------------------------------------------------------- arrest (timed to cinematics/arrest.*)
{
  // 0.4 s the cop flashes the badge, 1.6 s "!", 2.8 s the grab, 3.2 s the title, 4.2-5.4 s the cuffs go on
  const x = buf(6.4);
  [0.05, 0.25].forEach((t) => (kick(x, t, 0.4), bass(x, t, N.D2, { dur: 0.18, gain: 0.35 })));
  kick(x, 0.42, 0.75);
  snap(x, 0.42);
  brass(x, 0.42, [N.D3, 56], { dur: 0.5, gain: 0.16 });
  [0.5, 0.58, 0.66].forEach((t, k) => coin(x, t, 91 + k * 3, 0.05));
  pad(x, 0.5, 1.2, [N.D3, N.F3, 56], 0.07);
  // "!": a stab, then a nervous ticking heartbeat while the driver shakes
  snap(x, 1.6);
  vib(x, 1.6, 86, { dur: 0.35, gain: 0.2 });
  bass(x, 1.6, N.Eb2, { dur: 0.3, gain: 0.45 });
  for (let k = 0; k < 6; k++) kick(x, 1.85 + k * 0.17 + (k % 2) * 0.03, k % 2 ? 0.28 : 0.42);
  for (let t = 1.75; t < 2.75; t += 0.085) brush(x, t, 0.05, 0.05);
  [[1.9, 62], [2.0, 63], [2.1, 62]].forEach(([t, m]) => vib(x, t, m + 12, { dur: 0.12, gain: 0.12 }));
  riser(x, 2.2, 0.6, 0.28);
  // the grab + scuffle
  kick(x, 2.8, 0.9);
  snap(x, 2.8);
  bass(x, 2.8, N.D2, { dur: 0.9, gain: 0.55 });
  [2.9, 3.25, 3.5, 3.85, 4.05].forEach((t, k) => rustle(x, t, 0.14 + (k % 2) * 0.05, 0.12));
  // title: the brass hit
  kick(x, 3.2, 0.7);
  brass(x, 3.2, [N.D3, N.F3, N.Bb3], { dur: 1.0, gain: 0.22 });
  pipPip(x, 3.55, 0.12);
  for (let t = 3.4, gap = 0.12; t < 4.15; t += gap, gap = Math.max(0.035, gap * 0.9)) brush(x, t, 0.05 + 0.1 * ((t - 3.4) / 0.75), 0.06);
  // cuffs: two clicks, a stomp, then the resolving major hit + whistle
  cuffs(x, 4.25);
  cuffs(x, 4.6, 0.8);
  [4.25, 4.6, 4.95].forEach((t) => kick(x, t, 0.45));
  bass(x, 4.25, N.G2, { dur: 0.3, gain: 0.4 });
  bass(x, 4.6, N.A2, { dur: 0.3, gain: 0.4 });
  riser(x, 4.75, 0.45, 0.2);
  kick(x, 5.2, 0.9);
  snap(x, 5.2);
  bass(x, 5.2, N.Bb1, { dur: 1.1, gain: 0.55 });
  brass(x, 5.2, [N.Bb3, N.D4, N.F4], { dur: 1.1, gain: 0.22 });
  whistle(x, 5.35, 0.18, 0.13);
  whistle(x, 5.6, 0.4, 0.13);
  write('arrest.wav', reverb(x, 0.24));
}
