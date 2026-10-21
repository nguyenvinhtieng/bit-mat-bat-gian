/**
 * Single playable world (Alley 42, Saigon). Art: apps/web/public/assets/maps/game/meta/{home-bg,thumb}.webp
 */
type L = { vi: string; en: string };

export const GAME_SLUG = 'game';

/** @deprecated use GAME_SLUG — kept for room state / protocol */
export const DEFAULT_MAP_SLUG = GAME_SLUG;

export type MapMeta = {
  slug: string;
  name: L;
  subtitle: L;
  hook: L;
  players: string;
  charPrefix: string;
};

export const GAME_META: MapMeta = {
  slug: GAME_SLUG,
  name: { vi: 'Công An Chìm', en: 'The Hidden Police' },
  subtitle: { vi: 'Phiên Hụi Chui Hẻm 42', en: 'The Secret Savings Circle of Alley 42' },
  hook: {
    vi: 'Cả hội tài xế áo xanh lén khui hụi giữa đêm ở Hẻm 42. Khổ nỗi trong hội có một đứa áo xanh… là công an chìm!',
    en: 'A crew of green-jacket ride drivers holds a secret savings-circle night in Alley 42. Trouble is, one of the green jackets… is an undercover cop!',
  },
  players: '4–10',
  charPrefix: 'player',
};

/** Legacy name — only one map remains */
export const MAP_CATALOG: MapMeta[] = [GAME_META];

export const mapMeta = (_slug?: string | null): MapMeta => GAME_META;

/** Always the single world; old room slugs are normalized here. */
export const playableMap = (_slug?: string | null): string => GAME_SLUG;

export const playerArt = (_slug?: string | null) => {
  const base = `maps/${GAME_SLUG}/characters/player`;
  const chibi = `maps/${GAME_SLUG}/characters/grab-chibi`;
  return { atlas: `${chibi}-atlas`, tint: `${chibi}-tint-atlas`, action: `${base}-action`, actionTint: `${base}-action-tint` };
};

export const mapArt = (_slug: string, kind: 'home-bg' | 'thumb') => `maps/${GAME_SLUG}/meta/${kind}.webp`;
