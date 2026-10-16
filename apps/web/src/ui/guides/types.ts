import type { RoleId } from '@hidden-truth/shared';

export type L = { vi: string; en: string };
export const l = (vi: string, en: string): L => ({ vi, en });

/** Map-specific Guide copy. Everything generic (role names, factions) is built from the map skin. */
export type MapGuide = {
  /** one short line per role */
  roles: Record<RoleId, L>;
  storyH: L;
  story: { vi: string[]; en: string[] };
  /** first occurrence of `term` in the story becomes a link */
  storyLink?: { vi: StoryLink; en: StoryLink };
};

type StoryLink = { term: string; title: string; url: string };
