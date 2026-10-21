/**
 * Exports the common layout (packages/shared/src/layout.ts) to Tiled-compatible files
 * (assets.md §2): layout/base.tmj, layout/spawns.json, layout/area-zones.json,
 * plus map station coordinates (hue-stations.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  AREA_ORDER,
  AREA_RECTS,
  FURNITURE_SLOTS,
  HUE_STATIONS,
  LAYOUT_H,
  LAYOUT_VERSION,
  LAYOUT_W,
  MEETING_POINT,
  SPAWNS,
  TILE,
  getGrid,
} from '@hidden-truth/shared';

const ROOT = path.resolve(import.meta.dirname, '../..');
const write = (rel: string, data: unknown) => {
  for (const base of ['assets', 'apps/web/public/assets']) {
    const p = path.join(ROOT, base, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(data, null, 1) + '\n');
  }
};

const g = getGrid();
const floorData: number[] = [];
const collisionData: number[] = [];
for (let i = 0; i < g.w * g.h; i++) {
  floorData.push(g.area[i] >= 0 ? g.area[i] + 1 : 0);
  collisionData.push(g.solid[i] ? 1 : 0);
}

let objId = 1;
const tmj = {
  type: 'map',
  version: '1.10',
  tiledversion: '1.10.2',
  orientation: 'orthogonal',
  renderorder: 'right-down',
  width: LAYOUT_W,
  height: LAYOUT_H,
  tilewidth: TILE,
  tileheight: TILE,
  infinite: false,
  properties: [{ name: 'layoutVersion', type: 'int', value: LAYOUT_VERSION }],
  tilesets: [{ firstgid: 1, name: 'base-floor-wall', tilewidth: TILE, tileheight: TILE, tilecount: 8, columns: 8, image: '../tileset/base-floor-wall.png', imagewidth: TILE * 8, imageheight: TILE }],
  layers: [
    { id: 1, name: 'floor', type: 'tilelayer', width: LAYOUT_W, height: LAYOUT_H, x: 0, y: 0, opacity: 1, visible: true, data: floorData },
    { id: 2, name: 'collision', type: 'tilelayer', width: LAYOUT_W, height: LAYOUT_H, x: 0, y: 0, opacity: 0.5, visible: false, data: collisionData },
    {
      id: 3,
      name: 'areas',
      type: 'objectgroup',
      objects: AREA_ORDER.flatMap((id) =>
        AREA_RECTS[id].map(([x, y, w, h]) => ({ id: objId++, name: id, type: 'area', x: x * TILE, y: y * TILE, width: w * TILE, height: h * TILE, visible: true })),
      ),
    },
    {
      id: 4,
      name: 'furniture',
      type: 'objectgroup',
      objects: Object.entries(FURNITURE_SLOTS).map(([id, [x, y, w, h]]) => ({ id: objId++, name: id, type: 'blocker', x: x * TILE, y: y * TILE, width: w * TILE, height: h * TILE, visible: true })),
    },
    {
      id: 5,
      name: 'spawns',
      type: 'objectgroup',
      objects: [
        ...SPAWNS.map((s, i) => ({ id: objId++, name: `spawn_${i}`, type: 'spawn', x: s.x, y: s.y, point: true })),
        { id: objId++, name: 'meeting_table', type: 'meeting', x: MEETING_POINT.x, y: MEETING_POINT.y, point: true },
      ],
    },
  ],
  nextlayerid: 6,
  nextobjectid: objId,
};

write('maps/common/layout/base.tmj', tmj);
write('maps/common/layout/spawns.json', { layoutVersion: LAYOUT_VERSION, spawns: SPAWNS, meeting: MEETING_POINT });
write('maps/common/layout/area-zones.json', {
  layoutVersion: LAYOUT_VERSION,
  tileSize: TILE,
  zones: AREA_ORDER.map((id) => ({ areaId: id, rects: AREA_RECTS[id].map(([x, y, w, h]) => ({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE })) })),
});
write('maps/co-do-hue/hue-stations.json', { mapVersion: 1, hitbox: [96, 96], stations: HUE_STATIONS });
console.log(`[layout-gen] ${LAYOUT_W}x${LAYOUT_H} tiles, ${AREA_ORDER.length} areas, ${SPAWNS.length} spawns`);
