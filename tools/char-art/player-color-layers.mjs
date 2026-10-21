/** The generated magenta helmet/scooter is a color key, independent of height. */
export function playerColorLayers(pixels) {
  const base = Buffer.from(pixels), tint = Buffer.alloc(pixels.length);
  for (let p = 0; p < pixels.length; p += 4) {
    const [r, g, b, a] = pixels.subarray(p, p + 4);
    // Include pale paint highlights, but exclude muted dark-plum eyes.
    if (!a || (r <= 160 && g >= r * 0.4) || r < g * 1.25 || b < g * 1.2 || r - g < 12 || b - g < 10) continue;
    const shade = Math.min(255, Math.round(Math.max(r, b) * 1.15));
    base[p] = base[p + 1] = base[p + 2] = shade;
    tint[p] = tint[p + 1] = tint[p + 2] = shade;
    tint[p + 3] = a;
  }
  return { base, tint };
}
