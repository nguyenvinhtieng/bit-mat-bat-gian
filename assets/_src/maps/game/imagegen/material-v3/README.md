# Material pass — 2026-10-22

ChatGPT Image edits of four existing HD quadrants. Geometry/crops/lighting preserved; only materials changed:

- Corrugated roof/enclosing house colors: electric blue/red → weathered dull grey-blue, faded teal, dusty charcoal and rusty brown; approximately60% less saturation.
- Western food-stall pavement: dusty terracotta and weathered warm grey instead of bright orange/red; same paver geometry.
- Vietnamese Thái Bình sedge mats: natural straw fibers, dark-red bound edges and restrained woven red/green geometric motifs, replacing wide modern stripes.
- Dì Bảy cafe floor: attached user reference `cafe-tile-reference.png`, ochre/ivory/maroon Indochine cement tiles, circular floral medallions and scrolling flourishes, square repeating grid. No reference watermark or text.

Every prompt requires crisp chibi linework, no added props, exact wall/path boundaries, exact crop, no readable lettering. Native generated quadrants retained; run `node compose-floor.cjs` to assemble overlapping crops into2874×2190 floor. Runtime logical size stays2016×1536.

Sedge mat visual reference: https://vov2.vov.vn/van-hoa-giai-tri/than-thuong-chieu-coi-kim-son-26800.vov2 . User requested Thái Bình style; this is a material/pattern reference, not a claim of exact manufacturing provenance.

Parking-only props use placement scale0.7. Full3× textures retained; no collision/layout change.

Cafe overlap uses the top-right quadrant through its available height instead of blending independently generated floral motifs, which would ghost the pattern. Bottom-right quadrant was regenerated using the accepted top-right art as an additional material reference. Geometry and map logical dimensions remain fixed.
