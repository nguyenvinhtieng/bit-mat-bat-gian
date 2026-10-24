import { asset } from './common';
import { sfx } from './minigames/common/kit';

// Opaque H.264 with the stage colour baked in: Safari/iOS can't composite VP9 alpha cleanly (smeared, noisy edges).
const COP_CLIP = asset('maps/game/cinematics/sock-cop.mp4');
const CIVIL_CLIP = asset('maps/game/cinematics/sock-civil.mp4');
// Warm the cache during the chat's 1.1s result intro, before the overlay mounts.
if (typeof fetch !== 'undefined') for (const clip of [COP_CLIP, CIVIL_CLIP]) fetch(clip).catch(() => {});

/** Pre-rendered sock check: green socks for the undercover cop, black for a civilian. */
export function SockReveal({ name, wasKiller }: { name: string; wasKiller: boolean; color?: number }) {
  return <div className={`sock-stage ${wasKiller ? 'cop' : 'civil'}`}>
    {/* the clip stays muted so it can autoplay; its score runs through the game's audio bus, started with the first frame */}
    <video className="sock-svg" src={wasKiller ? COP_CLIP : CIVIL_CLIP} autoPlay muted playsInline preload="auto"
      disablePictureInPicture role="img" aria-label={`Kiểm tra tất của ${name}`} onPlaying={(e) => e.currentTarget.currentTime < 0.3 && sfx.sock(wasKiller)} />
  </div>;
}
