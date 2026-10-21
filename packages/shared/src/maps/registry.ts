import type { RoleId, TaskId } from '../constants';
import { GAME_SLUG } from './catalog';
import type { MapSkin, StationDef } from './common/skin';
import { GAME_SKIN } from './game';

export const MAP_SKINS: Record<string, MapSkin> = {
  [GAME_SKIN.slug]: GAME_SKIN,
};

export const mapSkin = (_slug?: string | null): MapSkin => GAME_SKIN;

export const stationOf = (_slug: string | null | undefined, taskId: TaskId): StationDef | undefined =>
  GAME_SKIN.stations.find((s) => s.id === taskId);

export const roleInfo = (_slug: string | null | undefined, role: RoleId) => GAME_SKIN.roles[role];
