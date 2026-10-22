import type { TaskId } from '@hidden-truth/shared';
import { GUIDE as GAME_GUIDE } from './game/guide';
import { QUOTES as GAME_QUOTES } from './game/quotes';

type G = { goal: string };
type Quote = { vi: string; en: string; src: string; srcEn: string };

export const GUIDE: Partial<Record<TaskId, { vi: G; en: G }>> = { ...GAME_GUIDE };
export const QUOTES: Partial<Record<TaskId, Quote>> = { ...GAME_QUOTES };
