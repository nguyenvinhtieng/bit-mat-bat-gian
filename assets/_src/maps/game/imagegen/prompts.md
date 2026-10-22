# Hẻm 42 — ChatGPT Image art

Generated with the built-in ChatGPT Image tool, not the API CLI. No quest assets generated.

## Floor prompt

Use case: stylized-concept. Asset: production playable 2D game floor background, 2016x1536 landscape, 42x32 tiles. Original floor is the exact geometry reference; player-atlas is only the chibi style reference. Redraw as a polished sharp hand-painted/cartoon Saigon alley neighborhood, crisp dark outlines, chunky cute proportions, warm evening colors and cool teal shadows. Fixed orthographic top-down camera with compact north wall faces. Preserve every walkable polygon, passage and door. Seven zones: north court, western food court, eastern cafe, center repair yard, southwest lodging, southeast scooter parking, connecting lanes. Keep floors unobstructed for separate props. Include tube-house facades, accordion gates, corrugated roofs, water tanks and electrical cables over blocked roofs; red paving, patterned cement tiles, patched asphalt, gutters, manholes, puddles, potholes, oil stains and parking stripes. Wall-only drain-cleaning adverts, graffiti, blue street numbers and dead-end plaque. No people, scooters, furniture, quest objects, UI or grid lines.

## Shared sprite prompt

Use case: stylized-concept. Isolated transparent-background sprite for a 2D chibi scooter game. Polished hand-painted cartoon Saigon asset, crisp warm dark outlines, rounded chunky shapes, cel shading, sharp details readable at 48–160 pixels, cream/terracotta/teal palette. Orthographic top-down 3/4 game prop, front face visible, north at top, no isometric diamond base. Exactly one object or cohesive set, centered with full silhouette, transparent margin, feet/base bottom center. Upper-left lighting. Real alpha; no ground plane, background, checkerboard, border, UI, people or quest markers. Small tight contact shadow only.

Subjects, one generation each:

- `barrier`: low narrow weathered ochre concrete alley-divider planter, chipped Saigon plaster, leafy plant at back, rectangular one-tile base, no sideways overhang.
- `pothole`: irregular shallow muddy pothole in cracked asphalt, chipped pebbles, straight-down flat ground decal.
- `trash`: tied black and turquoise rubbish bags, flattened cardboard, coconut shell, discarded plastic cup, compact silhouette.
- `food-cart`: turquoise cơm tấm pushcart, glass rice/pork cabinet, small red roof reading “CƠM TẤM”, two wheels.
- `cafe`: small round stainless table, two phin coffee cups, tea glass, two red plastic stools tucked close.
- `plant`: vivid pink bougainvillea in chipped terracotta planter, rounded silhouette, no tall trunk.
- `scooter`: parked white/mint step-through scooter, slight overhead side view, green delivery bag, no rider.
- `pole`: concrete utility pole, ceramic insulators, short bundled black cables, pasted “HÚT HẦM CẦU” notice, cables contained in frame.

The importer retains originals here and creates source PNGs plus runtime WebP assets. Import with `node tools/assets-pack/import-saigon-art.mjs --floor FILE --props-dir DIR`; verify normalization with `--self-test`.
