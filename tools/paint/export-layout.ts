/** Dumps the shared layout + game map placements to JSON for the Python painters (tools/paint/*.py). */
import fs from 'node:fs';
import path from 'node:path';
import { AREA_ORDER, AREA_RECTS, FURNITURE_SLOTS, GAME_AREAS, GAME_PROPS, GAME_STATIONS, LAYOUT_H, LAYOUT_W, MEETING_POINT, TILE, getGrid } from '@hidden-truth/shared';

const g = getGrid();
const out = {
  tile: TILE,
  w: LAYOUT_W,
  h: LAYOUT_H,
  areaOrder: AREA_ORDER,
  area: Array.from(g.area),
  solid: Array.from(g.solid),
  rects: AREA_RECTS,
  slots: FURNITURE_SLOTS,
  areas: GAME_AREAS,
  props: GAME_PROPS,
  stations: GAME_STATIONS,
  meeting: MEETING_POINT,
};
fs.writeFileSync(path.join(import.meta.dirname, '_layout.json'), JSON.stringify(out));
console.log('[paint] layout exported');
