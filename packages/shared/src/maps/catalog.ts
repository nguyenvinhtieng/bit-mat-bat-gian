/**
 * Map catalog shown on the home screen. Add a map here first (available: false = "coming soon" card),
 * then its art via tools/ui-art/draw-home.mjs: apps/web/public/assets/maps/<slug>/meta/{home-bg,thumb}.webp
 */
type L = { vi: string; en: string };

export type MapMeta = {
  slug: string;
  /** false = locked "coming soon" card, cannot be selected or created */
  available: boolean;
  name: L;
  subtitle: L;
  hook: L;
  players: string;
  /**
   * Map-specific player costume (tools/char-art/draw-characters.mjs):
   * apps/web/public/assets/maps/<slug>/characters/<charPrefix>-player{,-tint}-atlas.{webp,json}.
   * Omit to fall back to the common avatar.
   */
  charPrefix?: string;
};

export const MAP_CATALOG: MapMeta[] = [
  {
    slug: 'co-do-hue',
    available: true,
    name: { vi: 'Cố đô Huế', en: 'Imperial City of Huế' },
    subtitle: { vi: 'Năm Canh Trước Bình Minh', en: 'Five Watches Before Dawn' },
    hook: {
      vi: 'Đêm trước Lễ Ban Sóc: in lịch, dượt Nhã nhạc, xếp bá quan trước canh năm — và tìm ra Âm Binh đang muốn đêm không bao giờ tàn!',
      en: 'The night before the Calendar Ceremony: print the calendar, rehearse court music, line up the mandarins before dawn — and unmask the Shadow who wants the night to last forever!',
    },
    players: '4–10',
    charPrefix: 'hue', // áo dài + khăn đóng
  },
  {
    slug: 'hoi-an',
    available: false,
    name: { vi: 'Phố cổ Hội An', en: 'Hội An Ancient Town' },
    subtitle: { vi: 'Đêm Rằm Phố Hội', en: 'Full-Moon Lantern Night' },
    hook: {
      vi: 'Đèn lồng giăng kín phố, thuyền hoa đăng trôi trên sông Hoài — ai đã tắt ngọn đèn ở Chùa Cầu?',
      en: 'Lanterns over every street, flower boats on the Hoài river — who put out the light at the Covered Bridge?',
    },
    players: '4–10',
    charPrefix: 'hoian', // áo bà ba + nón lá
  },
  {
    slug: 'thang-long',
    available: false,
    name: { vi: 'Thăng Long – Hồ Gươm', en: 'Thăng Long – Sword Lake' },
    subtitle: { vi: 'Đêm Trăng Hồ Gươm', en: 'Moonlit Sword Lake' },
    hook: {
      vi: 'Cầu Thê Húc đỏ rực dưới trăng, Tháp Rùa lặng im giữa hồ — bí mật nghìn năm đang chờ lời giải.',
      en: 'The red Thê Húc bridge under the moon, Turtle Tower silent in the lake — a thousand-year secret awaits.',
    },
    players: '4–10',
    charPrefix: 'tl', // áo the + khăn xếp
  },
];

export const DEFAULT_MAP_SLUG = 'co-do-hue';

export const mapMeta = (slug?: string | null): MapMeta => MAP_CATALOG.find((m) => m.slug === slug) ?? MAP_CATALOG[0];

/** Playable slug for a requested one (falls back to the default when unknown or not released yet). */
export const playableMap = (slug?: string | null): string => {
  const m = MAP_CATALOG.find((x) => x.slug === slug);
  return m?.available ? m.slug : DEFAULT_MAP_SLUG;
};

/** Path under /assets for a map's art. */
/**
 * Player atlas paths (under /assets, no extension) for a map: its own costume, or the common avatar.
 * `action`/`actionTint`: strike · die · guard poses (96x64 frames `<row>-<i>`, facing left) from tools/char-art;
 * the common avatar has none, so it borrows the Huế costume's.
 */
export const playerArt = (slug?: string | null): { atlas: string; tint: string; action: string; actionTint: string } => {
  const m = MAP_CATALOG.find((x) => x.slug === slug);
  const base = m?.charPrefix ? `maps/${m.slug}/characters/${m.charPrefix}-player` : 'common/characters/player';
  const act = m?.charPrefix ? base : 'maps/co-do-hue/characters/hue-player';
  return { atlas: `${base}-atlas`, tint: `${base}-tint-atlas`, action: `${act}-action`, actionTint: `${act}-action-tint` };
};

export const mapArt = (slug: string, kind: 'home-bg' | 'thumb') => `maps/${slug}/meta/${kind}.webp`;
