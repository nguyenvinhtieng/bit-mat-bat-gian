import { TL_SKIN } from '@hidden-truth/shared';
import { useLang } from '../../../i18n';
import { mgOf } from '../common/kit';

/** Thăng Long mini-game art (tools/paint, asset session "thang-long"). */
export const mg = mgOf(TL_SKIN.art.minigames);

/** Inline vi / en picker for hint lines. */
export function useT() {
  const en = useLang((s) => s.lang) === 'en';
  return (vi: string, enText: string) => (en ? enText : vi);
}

/** Fruit art by server kind (no art for lê / táo → a drawn fallback). */
export const FRUIT_ART: Record<string, string> = {
  chuoi: 'tl-mg-qua-chuoi',
  buoi: 'tl-mg-qua-buoi',
  phat_thu: 'tl-mg-qua-phat-thu',
  quat: 'tl-mg-qua-quyt',
  hong: 'tl-mg-qua-hong',
  mang_cau: 'tl-mg-qua-mang-cau',
  sung: 'tl-mg-qua-sung',
  dua: 'tl-mg-qua-dua',
  du_du: 'tl-mg-qua-du-du',
  xoai: 'tl-mg-qua-xoai',
};
