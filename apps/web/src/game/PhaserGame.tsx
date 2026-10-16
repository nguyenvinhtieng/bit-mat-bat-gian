import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { GameScene } from './GameScene';

/** Mounts Phaser exactly once; React and Phaser talk through the zustand store + net module. */
export function PhaserGame() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      backgroundColor: '#1b120d',
      pixelArt: false,
      antialias: true,
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [GameScene],
      fps: { target: 60 },
    });
    // dev-only handle for visual checks (tools/smoke)
    if (import.meta.env.DEV) (window as unknown as { __game?: Phaser.Game }).__game = game;
    // phones report stale sizes mid-rotation: re-measure a few times once it settles (and undo any iOS scroll drift)
    const timers: number[] = [];
    const remeasure = () => {
      timers.splice(0).forEach(clearTimeout);
      for (const ms of [50, 250, 600])
        timers.push(
          window.setTimeout(() => {
            window.scrollTo(0, 0);
            game.scale.getParentBounds();
            game.scale.refresh();
          }, ms),
        );
    };
    window.addEventListener('orientationchange', remeasure);
    window.addEventListener('resize', remeasure);
    window.visualViewport?.addEventListener('resize', remeasure);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('orientationchange', remeasure);
      window.removeEventListener('resize', remeasure);
      window.visualViewport?.removeEventListener('resize', remeasure);
      game.destroy(true);
    };
  }, []);
  return <div ref={host} className="phaser-host" />;
}
