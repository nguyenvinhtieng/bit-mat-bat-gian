import { DEFAULT_MAP_SLUG } from '@hidden-truth/shared';
import { HUE_CONTENT } from './co-do-hue';
import { TL_CONTENT } from './thang-long';
import { SG_CONTENT } from './sai-gon';
import type { MapContent } from './common/util';

export type { MapContent, Pending } from './common/util';

/** Host-only content by map slug (see packages/shared/src/maps/registry.ts for the public skins). */
const CONTENT: Record<string, MapContent> = {
  'co-do-hue': HUE_CONTENT,
  'thang-long': TL_CONTENT,
  'sai-gon': SG_CONTENT,
};

export const contentFor = (slug: string): MapContent => CONTENT[slug] ?? CONTENT[DEFAULT_MAP_SLUG];
