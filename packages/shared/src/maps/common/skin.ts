import type { AreaId, RoleId, TaskId } from '../../constants';

/**
 * Public skin of a map (safe to ship to clients — no host truth).
 * Every map reuses the common layout (layout.ts) and only reskins it: rooms, props, stations, story, art paths.
 * Host-only content (answers, facts) lives in apps/server/src/content/<slug>/.
 */

type L = { vi: string; en: string };

export type AreaSkin = { name: string; nameEn: string; floor: string; tint?: number };

export type PropPlacement = {
  key: string;
  /** bottom-centre anchor, pixels */
  x: number;
  y: number;
  /** render on the wall (behind players regardless of y) */
  wall?: boolean;
};

export type StationDef = {
  id: TaskId;
  area: AreaId;
  x: number;
  y: number;
  title: string;
  titleEn: string;
  icon: string;
};

/** Map flavour for one sabotage kind (the rules are common, see SABOTAGE). */
export type SabotageSkin = {
  name: L;
  /** banner shown to everyone while it runs; ward alerts fill `{area}` */
  alert: L;
  /** HUD icon (asset path under /assets, no extension); a common glyph when absent */
  icon?: string;
};

export type RoleSkin = { name: string; nameEn: string; short: string; desc: string };

export type MapSkin = {
  slug: string;
  version: number;
  /** asset file prefix, e.g. `hue` → hue-card-<taskId>.webp */
  prefix: string;
  areas: Record<AreaId, AreaSkin>;
  /** task ids this map plays with (subset of TASK_IDS) */
  taskIds: readonly TaskId[];
  stations: StationDef[];
  props: PropPlacement[];
  /** Asset paths under /assets, without extension. */
  art: {
    /** pre-rendered floor + walls for the whole layout */
    floorBake: string;
    /** painted props / decor (y-sorted) */
    decor: string;
    /** station icons (+ legacy props); must hold frame `task-marker` unless `marker` says otherwise */
    stations: string;
    /** atlas holding the `task-marker` ring (defaults to `stations`) */
    marker?: string;
    /** fallback tileset when no floor bake: 2x2 tiles per floor name, in `order` */
    tileset?: { file: string; order: readonly string[] };
    /** map overview for the map popup */
    preview: string;
    /** HUD night-clock icon */
    clockIcon: string;
    /** marker riding the night bar */
    nightMarker: string;
    /** wandering-soul face on the "you died" notice */
    ghostIcon: string;
    /** folder holding mini-game art: `${minigames}/<name>.webp` */
    minigames: string;
    /** per-task heritage card: `${cards}/<prefix>-card-<taskId>.webp` */
    cards: string;
  };
  /** Role names/descriptions flavoured for the map (icons stay common). */
  roles: Record<RoleId, RoleSkin>;
  /** Traitor faction name, e.g. Âm Binh / Quỷ. */
  killerName: L;
  /** Emergency-meeting point label (bell, drum…). */
  emergency: L;
  /** Killer sabotages, reskinned per map. */
  sabotage: { blind: SabotageSkin; ward: SabotageSkin & { /** fix button label */ fix: L } };
  /** Map popup header + where meetings are held. */
  labels: {
    mapTitle: L;
    mapSubtitle: L;
    meetingPlace: L;
    /** one clock segment, lower case (canh / watch, mốc / mark) */
    segment: L;
    /** when the clock runs out, lower case, as in "before {deadline}" */
    deadline: L;
  };
  story: {
    title: string;
    subtitle: string;
    intro: string;
    /** dark prelude before role reveal, one line per beat */
    prelude: string[];
    /** canh[i] is announced when segment i+1 of the clock begins (GAME.canhCount segments) */
    canh: string[];
    /** short names of the clock segments shown on the night bar */
    segments: L[];
    /** in-game clock: minute-of-day when the round starts, and minutes per segment */
    clock: { startMin: number; segmentMin: number };
    endings: { tasks: string; vote: string; killer: string; timeout: string; /** a ward ran out */ sabotage: string };
    /** private objective line per faction */
    objective: { crew: string; killer: string };
  };
  /** Optional map sound effects (paths under /assets, with extension). */
  sfx?: { clock?: string };
};
