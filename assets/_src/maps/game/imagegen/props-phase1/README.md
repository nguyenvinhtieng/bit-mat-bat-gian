# Hẻm 42 — props phase 1

Generated with the built-in ImageGen tool, genuine transparent PNGs.
Selected assets replace existing atlas frames; their original frame sizes and bottom-centre anchors are preserved.

## Prompt set

Common direction: one isolated production game sprite on genuine transparency; richly detailed hand-painted nostalgic Saigon alley style, dark brown outlines, weathered materials, warm amber light, muted jade/teal, ochre and terracotta. Elevated front orthographic camera; whole object visible with transparent margin. No scenery, people, photorealism or flat vector shapes. Match the existing detailed cơm tấm cart and alley buildings.

- `prop-exhibition-xe-hu-tieu`: dark teak pushcart, muted blue enamel lotus panel, iron spoked wheels, glass display, steaming broth pot, stacked bowls, hanging noodles, clappers and warm lamp. Fascia: “HỦ TIẾU”.
- `prop-exhibition-xe-banh-mi`: weathered turquoise cabinet, mustard canopy, glass baguette display, wicker trays, pickles and chili bottle. Fascia: “BÁNH MÌ”.
- `prop-exhibition-xe-nuoc-mia`: sage green cabinet, worn cream canopy, old roller press and handwheel, purple-green cane bundle, glass mugs and limes. Fascia: “NƯỚC MÍA”.
- `prop-courtyard-xe-crab-hang`: three tightly parked step-through scooters facing left, staggered silhouettes, muted burgundy/teal/cream, leather saddles, chrome mirrors, detailed tires, subtle rust. Wide composition.
- `decor-binh-tra-da`: blue ribbed inverted 20-litre bottle, aged cream enamel dispenser pedestal, red/blue taps, drip tray, worn floral sticker.
- `prop-exhibition-bang-hieu`: wide aged ivory enamel sign, chipped dark teal border, rusty mounting bolts, red “DÃY QUÁN ĂN”, three painted noodle/baguette/sugarcane medallions, restrained floral corners.

Chess table and umbrella studies are retained as candidates in `candidates/`; neither was placed in the food court because no corresponding prop exists there and the cart layout should stay open.

## Rebuild

```sh
node tools/assets-pack/refresh-saigon-props.mjs --self-test
node tools/assets-pack/refresh-saigon-props.mjs --input assets/_src/maps/game/imagegen/props-phase1
```

This patches only supplied frame IDs and refreshes the map preview. It leaves floor art and atlas metadata intact.
