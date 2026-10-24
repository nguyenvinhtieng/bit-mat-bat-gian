# Saigon alley signs and rubbish

Generated with the built-in ImageGen tool, 2026-10-24. The existing map preview supplied the illustration and evening lighting reference. Outputs retain transparency; signs are fitted to the wall face rather than the roof trim.

## Street references

- [Tuổi Trẻ: quảng cáo hút hầm cầu ở Phú Nhuận](https://tuoitre.vn/bong-dung-ca-pho-quang-cao-hut-ham-cau-se-xu-ly-nha-mang-khong-quan-ly-duoc-sim-rac-20240615090543529.htm): small pasted service advertisements on neighborhood walls.
- [Thanh Niên: rác trong hẻm ở Bình Tân](https://thanhnien.vn/rac-tran-lan-gan-truong-hoc-185240110212544894.htm): mixed plastic bags, foam packaging and household refuse.
- [Người Lao Động: điểm đổ rác ở TP.HCM](https://nld.com.vn/hinh-anh-rac-thai-tai-xuat-o-tphcm-cu-don-xong-lai-day-196260416165549466.htm): a plain red municipal warning above mixed discarded material.

## Final prompt specifications

All three: standalone transparent sprites, restrained hand-painted 2D material detail, muted colors, subtle warm sodium light matching `meta/map-preview.webp`; no surrounding wall or floor island, glow or decorative frame.

- **No dumping:** ordinary intact rectangular off-white enamelled tin plate, thin red border, four small rusty screw heads. Exact text: “CẤM ĐỔ RÁC” / “AI ĐỔ RÁC LÀM CHÓ”. Follow-up ImageGen edit changes the lettering to amateur hand-painted Vietnamese: larger red brush capitals above, smaller black handwriting below, uneven widths, slightly crooked baselines and inconsistent brush pressure. Humor comes from sincere awkward neighborhood signwriting; preserve legibility and correct diacritics at 112×36 game pixels. Preserve the plate, proportions, transparency and flat wall-facing view; no elegant calligraphy, polished font, illegible scribbles, dramatic drips or extra objects.
- **Septic service:** cheap black photocopied advertisement on thin faded ivory paper, slight ink dropout, folded corner and modest torn edge. Exact text: “HÚT HẦM CẦU” / “THÔNG CỐNG NGHẸT” / “GIÁ BÌNH DÂN” / “PHỤC VỤ 24/24” / “09XX XXX XXX”. Plain condensed type, header and telephone larger; flat paper stuck flush to a wall, no cast drop shadow or stone border.
- **Rubbish:** compact asymmetric pile with two thin tied black plastic bags, a translucent pale blue shopping bag, a white foam takeaway box, soggy flattened cardboard, a crushed clear plastic bottle and a few scraps. Elevated downward orthographic view, visible upper surfaces, contact shadow tight beneath objects, subdued charcoal, ivory, blue and brown. No coconut or rope-bound cardboard bundle; no floor/backdrop or text.

## Runtime assets

- `apps/web/public/assets/maps/game/signs/trash.webp`: 336×108; displayed 112×36 at world (1200, 494.4).
- `apps/web/public/assets/maps/game/signs/drain.webp`: 192×108; displayed 64×36 on plaster and shutter.
- `apps/web/public/assets/maps/game/atlas/decor-0.webp`: replacement only inside existing `decor-dong-rac` frame (390,1578,360,252), preserving atlas geometry, alpha and all visible pixels outside the frame. Runtime scale 0.8 gives a 96×67.2 canvas, anchored bottom-center at (1200,580.8).
- Placement: `packages/shared/src/maps/game/props.ts`. Top wall signs sit inside the plaster strip y≈467–522, avoiding vents; rubbish sits beneath the no-dumping sign.
