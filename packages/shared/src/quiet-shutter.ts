/** Deterministic simulation shared by the interaction and server replay. */
export type QuietShutterConfig = { quietSpeed: number; noiseGain: number; cooldownRate: number; alarmMs: number };
export type QuietShutterSample = { dtMs: number; rise: number };
export type QuietShutterState = { lift: number; noise: number; alarmMs: number; alarms: number; elapsedMs: number };
export const createQuietShutter = (): QuietShutterState => ({ lift: 0, noise: 0, alarmMs: 0, alarms: 0, elapsedMs: 0 });
/** Done the moment the door reaches the top mark without waking anyone: no extra wait for the noise to settle. */
export const isQuietShutterComplete = (s: QuietShutterState) => s.lift >= 1 && s.alarmMs === 0;

export function stepQuietShutter(s: QuietShutterState, input: QuietShutterSample, config: QuietShutterConfig): QuietShutterState {
  const dt = input.dtMs / 1000;
  const elapsedMs = s.elapsedMs + input.dtMs;
  if (s.alarmMs > 0) return { ...s, elapsedMs, alarmMs: Math.max(0, s.alarmMs - input.dtMs), noise: Math.max(0, s.noise - config.cooldownRate * dt) };
  const rise = Math.max(0, Math.min(input.rise, .8 * dt, 1 - s.lift));
  const noise = Math.max(0, s.noise + Math.max(0, rise - config.quietSpeed * dt) * config.noiseGain - config.cooldownRate * dt);
  const lift = Math.min(1, s.lift + rise);
  if (noise >= 1) return { lift: Math.max(0, lift - .18), noise: .85, alarmMs: config.alarmMs, alarms: s.alarms + 1, elapsedMs };
  return { ...s, lift, noise, elapsedMs };
}

/** Reject impossible input rather than trusting client-reported progress or noise. */
export function replayQuietShutter(samples: unknown, config: QuietShutterConfig): QuietShutterState | null {
  if (!Array.isArray(samples) || samples.length === 0 || samples.length > 6000) return null;
  let state = createQuietShutter();
  for (const sample of samples) {
    if (!sample || typeof sample !== 'object') return null;
    const { dtMs, rise } = sample as QuietShutterSample;
    if (!Number.isFinite(dtMs) || dtMs < 1 || dtMs > 100 || !Number.isFinite(rise) || rise < 0 || rise > .08 || rise > .8 * dtMs / 1000 + 1e-9) return null;
    state = stepQuietShutter(state, { dtMs, rise }, config);
    if (state.elapsedMs > 300000) return null;
  }
  return state;
}
