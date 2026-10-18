import type { RoleId, TaskId } from '../constants';
import { DEFAULT_MAP_SLUG } from './catalog';
import { HUE_SKIN } from './co-do-hue';
import type { MapSkin, StationDef } from './common/skin';
import { SG_SKIN } from './sai-gon';
import { TL_SKIN } from './thang-long';

/**
 * Playable map skins by slug. To add a map: create maps/<slug>/ exporting a MapSkin, register it here,
 * add its host content in apps/server/src/content/<slug>/ and its mini-games in apps/web/src/ui/minigames/<slug>/.
 */
export const MAP_SKINS: Record<string, MapSkin> = {
  [HUE_SKIN.slug]: HUE_SKIN,
  [TL_SKIN.slug]: TL_SKIN,
  [SG_SKIN.slug]: SG_SKIN,
};

export const mapSkin = (slug?: string | null): MapSkin => MAP_SKINS[slug ?? ''] ?? MAP_SKINS[DEFAULT_MAP_SLUG];

/** Station of a task on a map (task ids are unique across maps). */
export const stationOf = (slug: string | null | undefined, taskId: TaskId): StationDef | undefined =>
  mapSkin(slug).stations.find((s) => s.id === taskId);

export const roleInfo = (slug: string | null | undefined, role: RoleId) => mapSkin(slug).roles[role];
