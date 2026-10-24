import { GAME_SKIN } from '@giao-keo/shared';
import { useLang } from '../../../i18n';
import { mgOf } from '../common/kit';

/** Sài Gòn mini-game art (tools/paint, phase 3). Phase 2 games draw their scenes as inline SVG. */
export const mg = mgOf(GAME_SKIN.art.minigames);

/** Inline vi / en picker for hint lines. */
export function useT() {
  const en = useLang((s) => s.lang) === 'en';
  return (vi: string, enText: string) => (en ? enText : vi);
}

/** 50000 -> "50.000đ" */
export const vnd = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
