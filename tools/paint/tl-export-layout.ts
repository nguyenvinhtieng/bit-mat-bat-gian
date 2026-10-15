/** Dumps the shared layout + Thăng Long placements to JSON for the tl_*.py painters. */
import fs from 'node:fs';
import path from 'node:path';
import { AREA_ORDER, AREA_RECTS, FURNITURE_SLOTS, LAYOUT_H, LAYOUT_W, MEETING_POINT, getGrid } from '../../packages/shared/src/layout';
import { TILE } from '../../packages/shared/src/constants';
import { TL_PROPS } from '../../packages/shared/src/maps/thang-long/props';

const g = getGrid();
fs.writeFileSync(
  path.join(import.meta.dirname, '_tl_layout.json'),
  JSON.stringify({ tile: TILE, w: LAYOUT_W, h: LAYOUT_H, areaOrder: AREA_ORDER, area: Array.from(g.area), solid: Array.from(g.solid), rects: AREA_RECTS, slots: FURNITURE_SLOTS, props: TL_PROPS, meeting: MEETING_POINT }),
);
console.log('[paint] thang-long layout exported');
