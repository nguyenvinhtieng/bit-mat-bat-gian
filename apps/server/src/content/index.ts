import { GAME_SLUG } from '@giao-keo/shared';
import { GAME_CONTENT } from './game';
import type { MapContent } from './common/util';

export type { MapContent, Pending } from './common/util';

const CONTENT: Record<string, MapContent> = {
  [GAME_SLUG]: GAME_CONTENT,
};

export const contentFor = (_slug: string): MapContent => GAME_CONTENT;
