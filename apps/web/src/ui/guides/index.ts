import { HUE_GUIDE } from './co-do-hue';
import { TL_GUIDE } from './thang-long';
import type { MapGuide } from './types';

export type { MapGuide } from './types';

const GUIDES: Record<string, MapGuide> = { 'co-do-hue': HUE_GUIDE, 'thang-long': TL_GUIDE };

export const mapGuide = (slug: string): MapGuide => GUIDES[slug] ?? HUE_GUIDE;
