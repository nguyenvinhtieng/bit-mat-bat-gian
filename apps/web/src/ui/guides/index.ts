import { GAME_GUIDE } from './game';
import type { MapGuide } from './types';

export type { MapGuide } from './types';

export const mapGuide = (_slug: string): MapGuide => GAME_GUIDE;
