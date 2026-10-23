import { asset } from './common';

const COP_CLIP = asset('maps/game/cinematics/sock-cop.webm');
const CIVIL_CLIP = asset('maps/game/cinematics/sock-civil.webm');
// Warm the cache during the chat's 1.1s result intro, before the overlay mounts.
if (typeof fetch !== 'undefined') for (const clip of [COP_CLIP, CIVIL_CLIP]) fetch(clip).catch(() => {});

/** Pre-rendered sock check: green socks for the undercover cop, black for a civilian. */
export function SockReveal({ name, wasKiller }: { name: string; wasKiller: boolean; color?: number }) {
  return <div className={`sock-stage ${wasKiller ? 'cop' : 'civil'}`}>
    <video className="sock-svg" src={wasKiller ? COP_CLIP : CIVIL_CLIP} autoPlay muted playsInline preload="auto"
      disablePictureInPicture role="img" aria-label={`Kiểm tra tất của ${name}`} />
  </div>;
}
