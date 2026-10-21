/** Dumps the shared layout + Sài Gòn placements to JSON for the sg_*.py painters. */
import fs from 'node:fs';
import path from 'node:path';
import { AREA_ORDER, AREA_RECTS, FURNITURE_SLOTS, LAYOUT_H, LAYOUT_W, MEETING_POINT, getGrid } from '../../packages/shared/src/layout';
import { TILE } from '../../packages/shared/src/constants';
import { GAME_PROPS } from '../../packages/shared/src/maps/game/props';

const g = getGrid();
fs.writeFileSync(
  path.join(import.meta.dirname, '_sg_layout.json'),
  JSON.stringify({ tile: TILE, w: LAYOUT_W, h: LAYOUT_H, areaOrder: AREA_ORDER, area: Array.from(g.area), solid: Array.from(g.solid), rects: AREA_RECTS, slots: FURNITURE_SLOTS, props: GAME_PROPS, meeting: MEETING_POINT }),
);
console.log('[paint] sai-gon layout exported');
