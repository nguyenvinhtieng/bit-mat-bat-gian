import { useEffect } from 'react';
import { mapSkin } from '@hidden-truth/shared';
import { useStore } from '../store';
import { type Ending, msSinceLastCue, preloadMusic, sfx } from './minigames/common/kit';

const TAPPABLE = 'button, [role="button"], a[href], summary, select, input[type="checkbox"], input[type="radio"], input[type="range"], label[for]';

/** Which ending stinger fits: the server sends the story line, so match it back to its kind. */
function endingOf(end: { winner: string; reason: string }, mapSlug?: string): Ending {
  const endings = mapSkin(mapSlug).story.endings as Record<Ending, string>;
  const kind = (Object.keys(endings) as Ending[]).find((k) => endings[k] === end.reason);
  return kind ?? (end.winner === 'crew' ? 'tasks' : 'killer');
}

/** Event cues that follow the shared game state: task accepted / refused, vote outcome, end of the night. */
export function useGameSounds() {
  useEffect(preloadMusic, []);
  useEffect(
    () =>
      useStore.subscribe((s, prev) => {
        if (s.introOpen && !prev.introOpen && !s.introQuick) sfx.intro();
        if (s.taskResult && s.taskResult !== prev.taskResult) sfx.done();
        if (s.taskAttempt > prev.taskAttempt) sfx.bad();
        if (s.voteResult && s.voteResult !== prev.voteResult) (s.voteResult.ejected ? sfx.eject : sfx.skip)();
        if (s.end && s.end !== prev.end) sfx.ending(endingOf(s.end, s.room?.mapSlug));
      }),
    [],
  );

  // Soft tick on every button press, so a click always feels registered. Runs after React's handlers
  // (bubble phase on window) and stays silent when the handler already played its own cue.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(TAPPABLE);
      if (!el || el.closest('[data-sfx="off"]') || (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true') return;
      if (msSinceLastCue() < 120) return;
      sfx.tap();
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);
}
