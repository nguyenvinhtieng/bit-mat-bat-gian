import type { GameTaskId } from '@giao-keo/shared';

/** One short line per task for the completion card — added only once checked against a published source. */
type Quote = { vi: string; en: string; src: string; srcEn: string };

export const QUOTES: Partial<Record<GameTaskId, Quote>> = {};
