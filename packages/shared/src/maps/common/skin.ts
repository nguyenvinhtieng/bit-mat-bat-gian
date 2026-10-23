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
  /** Visual scale only; collision footprint and world anchor remain unchanged. */
  scale?: number;
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

/** `tag`: one- or two-word label for the cramped phone HUD chip */
export type RoleSkin = { name: string; nameEn: string; tag: L; short: string; desc: string };

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
    /** one folder per task with all of its art: `${tasks}/<taskId>/icon.svg` (station), `card.svg` (done card), mini-game sprites */
    tasks?: string;
    /** per-task heritage card: `${cards}/<prefix>-card-<taskId>.webp` */
    cards: string;
    /** decor-atlas frame left where a player was taken out (+ `${body}-tint`, multiplied by their colour); default: the die pose */
    body?: string;
    /** walk/idle frames ride a scooter: a headlight beam (+ tail light) replaces the hand-held oil lamp */
    ride?: boolean;
  };
  /** Role names/descriptions flavoured for the map (icons stay common). */
  roles: Record<RoleId, RoleSkin>;
  /** Traitor faction name (Công An Chìm). */
  killerName: L;
  /** Crew faction name (Hội CRAB). */
  crewName: L;
  /** Emergency-meeting point label (bell, drum…). */
  emergency: L;
  /** Cuốc Cuối: where the package starts (feet position, px). The handoff point is the `handoff_package` station. */
  delivery: { packageHome: { x: number; y: number } };
  /** Map popup header + where meetings are held. */
  labels: {
    mapTitle: L;
    mapSubtitle: L;
    meetingPlace: L;
    /** when the clock runs out, lower case, as in "before {deadline}" */
    deadline: L;
  };
  story: {
    title: string;
    subtitle: string;
    intro: string;
    /** dark prelude before role reveal, one line per beat */
    prelude: string[];
    /** index of the prelude line that drops the twist: shown as a red alert bubble with its own sting */
    preludeAlert?: number;
    /** fictional clock shown with the countdown: minute-of-day at the start and at daybreak (may pass 24*60) */
    clock: { startMin: number; endMin: number };
    endings: { /** package handed off */ tasks: string; vote: string; killer: string; timeout: string };
    /** private objective line per faction */
    objective: { crew: string; killer: string };
  };
  /**
   * Optional rewording of the common game words (kill, body, ghost, vote verdicts, progress bar).
   * Maps without it keep the default wording. `{name}` is filled with the player's name.
   */
  phrases?: {
    /** kill button / action verb, e.g. "Mời lên phường" */
    kill: L;
    /** big banner when someone is taken out */
    killBanner: L;
    /** what a player becomes after being taken out */
    ghost: L;
    /** what is left on the floor */
    body: L;
    /** line shown when a body is found */
    bodyFound: L;
    meetingTitle: L;
    ejectKiller: L;
    ejectInnocent: L;
    tie: L;
    /** task progress bar label */
    progress: L;
    /** pop on each finished task */
    progressBump: L;
  };
  /** Killer's action button, reskinned (default: common btn-kill + the "kill" word). icon: asset path under /assets, no extension */
  killButton?: { label: L; icon: string };
  /** Kill restaged as an arrest: this cuffs sprite (asset path under /assets, no extension) snaps shut instead of the blade slash / ink / soul. */
  arrest?: { cuffs: string };
  /** Street writing drawn in-game over the art (painted props carry no text): hand-sprayed warnings, tin signs, ad stickers. x/y = centre in px. */
  signs?: StreetSign[];
  /** Vote-result ejection scene (default: the ejected player flies off). 'socks': a hand rolls up the trouser leg — green socks = killer, white/blue = innocent. */
  ejectScene?: 'socks';
  /** Task-card eyebrow above the task title (default: Huế's "Chuẩn bị Lễ Ban Sóc"). */
  taskEyebrow?: L;
  /** Optional map sound effects (paths under /assets, with extension). */
  sfx?: { clock?: string };
};

export type StreetSign = {
  text: string; x: number; y: number; style: 'spray' | 'board' | 'sticker'; angle?: number;
  /** Generated sign texture in this map's signs folder; dimensions are logical world pixels. */
  art?: string; width?: number; height?: number;
};
