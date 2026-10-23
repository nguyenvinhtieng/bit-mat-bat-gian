import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { useStore } from '../store';
import { keyboardOpen } from '../keyboard';

/** Phones report DPR 3: rendering at 2 looks the same at arm's length and fills ~56% fewer pixels (heat/battery). */
const MAX_DENSITY = 2;
/** Full-screen overlays hide the map entirely: stop the render loop under them instead of drawing (and re-blurring) unseen frames. */
const covered = (s: ReturnType<typeof useStore.getState>) => {
  const phase = s.room?.phase;
  return phase === 'meeting' || phase === 'reveal' || phase === 'ended' || s.cinematic?.kind === 'report' || s.cinematic?.kind === 'emergency';
};

/** Mounts Phaser exactly once; React and Phaser talk through the zustand store + net module. */
export function PhaserGame() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const parent = host.current;
    const density = () => Math.min(MAX_DENSITY, Math.max(1, window.devicePixelRatio || 1));
    const size = parent.getBoundingClientRect();
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#1b120d',
      pixelArt: false,
      antialias: true,
      // Phaser 3.90 has no renderer `resolution` option. Its supported scale zoom
      // keeps a physical-pixel backing buffer at the parent's CSS size and maps input.
      scale: { mode: Phaser.Scale.NONE, width: Math.round(size.width * density()), height: Math.round(size.height * density()), zoom: 1 / density() },
      scene: [GameScene],
      fps: { target: 60 },
    });
    // dev-only handle for visual checks (tools/smoke)
    if (import.meta.env.DEV) (window as unknown as { __game?: Phaser.Game }).__game = game;
    // phones report stale sizes mid-rotation: re-measure a few times once it settles (and undo any iOS scroll drift)
    const timers: number[] = [];
    const resize = () => {
      if (!game.isBooted || !game.canvas) return;
      const bounds = parent.getBoundingClientRect();
      const ratio = density();
      game.scale.setZoom(1 / ratio);
      game.scale.resize(Math.round(bounds.width * ratio), Math.round(bounds.height * ratio));
    };
    const remeasure = () => {
      resize();
      timers.splice(0).forEach(clearTimeout);
      for (const ms of [50, 250, 600])
        timers.push(
          window.setTimeout(() => {
            // don't fight the browser panning a focused input into view above the keyboard
            if (!keyboardOpen()) window.scrollTo(0, 0);
            resize();
          }, ms),
        );
    };
    window.addEventListener('orientationchange', remeasure);
    window.addEventListener('resize', remeasure);
    window.visualViewport?.addEventListener('resize', remeasure);
    const observer = new ResizeObserver(remeasure);
    observer.observe(parent);
    const pause = (s: ReturnType<typeof useStore.getState>) => {
      if (!game.isBooted) return;
      const off = covered(s);
      if (off && game.loop.running) game.loop.sleep();
      else if (!off && !game.loop.running) game.loop.wake(true);
    };
    game.events.once(Phaser.Core.Events.READY, () => pause(useStore.getState()));
    const unsub = useStore.subscribe(pause);
    return () => {
      unsub();
      observer.disconnect();
      timers.forEach(clearTimeout);
      window.removeEventListener('orientationchange', remeasure);
      window.removeEventListener('resize', remeasure);
      window.visualViewport?.removeEventListener('resize', remeasure);
      game.destroy(true);
    };
  }, []);
  return <div ref={host} className="phaser-host" />;
}
