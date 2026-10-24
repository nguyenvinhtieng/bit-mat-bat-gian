Generated with the built-in imagegen tool, transparent background, 2026-10-24.

Shared direction: production sprites for a 2D Saigon alley game. Orthographic 3/4
top-down view facing the front, horizontal edges kept horizontal; muted matte
paint, clean outlines, readable at game scale. Isolated on alpha transparency.

- coffee.png: straight turquoise tiled coffee counter, stainless worktop, cloth
  coffee sock over an aluminum pot, black kettle, two phin filters, iced coffees,
  orange insulated tea cooler on a red stool. Sparse, physically coherent objects.
- tv.png: brown woodgrain CRT, convex dark screen, two knobs, speaker grille,
  rabbit-ear antenna, low wooden stand; front-facing, television off.
- router.png: cream router, exactly two black antennas, three green LEDs, coiled
  cable, narrow wooden shelf with two brackets; front-facing.
- cards.png (chibi revision): transform the four-person group into simple polished
  2D RPG chibi art. Preserve positions: north/east green jackets, west golden
  yellow, south orange seen from behind. Short black hair, no helmets or hats,
  no logos or lettering. Compact bodies, softly rounded slightly large heads,
  tiny dark eyes and relaxed cheerful expressions. Clean outlines, flat muted
  colors, two or three cel-shaded tones, minimal detail; no realism or 3D gloss.
  Cross-legged poses, cards and two iced teas. Keep the existing small placement
  on the baked mat. True alpha between people, no added mat, floor, glow or backdrop.
- bikes.png: four everyday Vietnamese underbone commuter motorbikes, straight
  front-facing row, evenly spaced with front wheels on one baseline. Camera
  looks down enough to see seats and handlebars. Exactly four bikes, two green
  delivery boxes, one orange, one yellow; no branding or text. Helmets left on
  seats, no people. Coherent wheels/mirrors, matte muted paint, true alpha, no
  environment, glow or parking lines. Render the row 160×96 game pixels.

Import with `node tools/paint/drink-stall-art.mjs`, then regenerate collision
with `node --import tsx tools/paint/sg-footprints.ts`.
