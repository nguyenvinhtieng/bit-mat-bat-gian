import { useEffect, useRef } from 'react';
import { asset } from './common';

const SHEET_URL = asset('maps/game/characters/sock-inspection-v1.png');
// Preload during the chat's 1.1s result intro, before the overlay mounts.
const sheet = typeof Image === 'undefined' ? null : new Image();
if (sheet) sheet.src = SHEET_URL;

// The generated sheet has hand-drawn row spacing; explicit crops avoid adjacent frames.
const COLS = [0, 405, 810, 1215, 1619];
const ROWS = [0, 280, 536, 752, 971];
const SHARED: readonly [number, number][] = [
  [0, 0], [280, 1], [480, 2], [650, 3], [850, 4], [1000, 5],
  [1200, 6], [1500, 7], [1850, 8], [2200, 9], [2450, 10], [2750, 11],
];
const COLOUR_AT = 3100;
const HOLD_AT = 3300;

/** Whole-scene raster frames: no composited heads, limbs, or vector characters. */
export function SockReveal({ name, wasKiller }: { name: string; wasKiller: boolean; color?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !sheet) return;
    const image = sheet;
    const started = performance.now();
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let lastFrame = -1;
    let disposed = false;
    const finalFrame = wasKiller ? 13 : 15;

    function paint(now: number) {
      if (disposed) return;
      const elapsed = now - started;
      let frame = 0;
      for (const [at, index] of SHARED) if (elapsed >= at) frame = index;
      if (elapsed >= COLOUR_AT) frame = wasKiller ? 12 : 14;
      if (elapsed >= HOLD_AT || motion.matches) frame = finalFrame;
      if (image.complete && image.naturalWidth && frame !== lastFrame) {
        const col = frame % 4;
        const row = Math.floor(frame / 4);
        const x = COLS[col]!;
        const y = ROWS[row]!;
        const width = COLS[col + 1]! - x;
        const height = ROWS[row + 1]! - y;
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        // Shared full-body poses keep a common floor; close-ups fill the camera.
        const scale = frame <= 8
          ? Math.min(canvas!.width / 405, canvas!.height / 280)
          : Math.max(canvas!.width / width, canvas!.height / height);
        const dw = width * scale;
        const dh = height * scale;
        const dy = frame <= 8 ? canvas!.height - dh - 8 : (canvas!.height - dh) / 2;
        ctx!.drawImage(image, x, y, width, height, (canvas!.width - dw) / 2, dy, dw, dh);
        canvas!.dataset.frame = String(frame);
        lastFrame = frame;
      }
      if (!motion.matches && elapsed < HOLD_AT) raf = requestAnimationFrame(paint);
    }
    const redraw = () => {
      cancelAnimationFrame(raf);
      paint(performance.now());
    };
    image.addEventListener('load', redraw);
    motion.addEventListener('change', redraw);
    paint(started);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      image.removeEventListener('load', redraw);
      motion.removeEventListener('change', redraw);
    };
  }, [name, wasKiller]);

  return <div className={`sock-stage ${wasKiller ? 'cop' : 'civil'}`}>
    <canvas ref={canvasRef} width={960} height={576} className="sock-svg" role="img" aria-label={`Kiểm tra tất của ${name}`} />
  </div>;
}
