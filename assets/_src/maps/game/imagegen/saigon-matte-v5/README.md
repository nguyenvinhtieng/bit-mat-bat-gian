# Sài Gòn — matte prop set v5

45 independently generated transparent sprites, replacing every decoration frame in `maps/game/atlas/decor-0`; `body` and `body-tint` are retained. Raw ImageGen outputs live in `raw/`; prompts and output provenance are in `generation.json`.

Palette: faded brick red, dusty teal, worn ivory, concrete grey and brown. Ordinary stainless-steel food carts, plastic stools, coffee phins, lottery tickets, delivery bikes, rain capes and an “Ăn no rồi tính” sign supply the neighbourhood character. No bloom, golden trim or glossy neon surfaces.

Camera: elevated three-quarter view; bottom-centre anchor. The existing 3× atlas frame geometry is preserved. Individual source PNGs, runtime lossless WebP and the map preview are synchronized by the importer. Object scales/placements are in `packages/shared/src/maps/game/props.ts` (77 placements; 45 unique frames).

The large floor/background and collision layout are unchanged; their original SHA-256 hashes are recorded in `protected-baseline.json`.

## Rebuild and verify

```sh
node tools/assets-pack/prepare-saigon-matte.mjs --self-test
node tools/assets-pack/prepare-saigon-matte.mjs
node tools/assets-pack/refresh-saigon-props.mjs --self-test
node tools/assets-pack/refresh-saigon-props.mjs --input assets/_src/maps/game/imagegen/saigon-matte-v5/raw
node tools/assets-pack/check-saigon-props.mjs --baseline assets/_src/maps/game/imagegen/saigon-matte-v5/protected-baseline.json
```

Contact sheet, per-sprite alpha diagnostics and live game captures are in `output/saigon-matte-v5/`. The capture script uses local web/server dev services and Chrome; it moves the preview rider for inspection only.

Visual references: [Vietnam Tourism — HCMC street food](https://image.vietnam.travel/things-to-do/ho-chi-minh-city-cuisine-street-eats-fine-dining), [Vietnam Tourism — HCMC cafes](https://image.vietnam.travel/things-to-do/11-cool-cafes-try-hcmc).
