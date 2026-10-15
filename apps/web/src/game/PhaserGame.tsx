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
    return () => game.destroy(true);
  }, []);
  return <div ref={host} className="phaser-host" />;
}
