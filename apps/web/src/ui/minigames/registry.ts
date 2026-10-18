import type { TaskId } from '@hidden-truth/shared';
import { GUIDE as HUE_GUIDE } from './co-do-hue/guide';
import { QUOTES as HUE_QUOTES } from './co-do-hue/quotes';
import { GUIDE as TL_GUIDE } from './thang-long/guide';
import { QUOTES as TL_QUOTES } from './thang-long/quotes';
import { GUIDE as SG_GUIDE } from './sai-gon/guide';
import { QUOTES as SG_QUOTES } from './sai-gon/quotes';

/**
 * Per-map mini-game data merged by task id (task ids are unique across maps).
 * New map: add ui/minigames/<slug>/{index.tsx,guide.ts,quotes.ts} and register them here + in index.tsx.
 */
type G = { goal: string; steps: string[] };
type Quote = { vi: string; en: string; src: string; srcEn: string };

export const GUIDE: Partial<Record<TaskId, { vi: G; en: G }>> = { ...HUE_GUIDE, ...TL_GUIDE, ...SG_GUIDE };
export const QUOTES: Partial<Record<TaskId, Quote>> = { ...HUE_QUOTES, ...TL_QUOTES, ...SG_QUOTES };
