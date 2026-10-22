# Quán Nước props v2

Seven transparent painted sprites generated with the built-in ImageGen tool. Style references are the existing coffee table/stools and sugarcane cart: warm ink outlines, aged materials, upper-left lighting, elevated three-quarter view. PNGs here are full-resolution originals; normalized runtime sprites live in `assets/maps/game/props/`.

The blue stool is an ImageGen recolor of the red stool. The tea cooler is the final clean-alpha variant. The hanging object is a covered bamboo birdcage on a stand.

`prompts.json` records prompts and generation provenance. Reimport without repacking unrelated atlas frames:

```sh
node tools/assets-pack/refresh-saigon-props.mjs --self-test
node tools/assets-pack/refresh-saigon-props.mjs --input assets/_src/maps/game/imagegen/cafe-v2
```

Placement: `packages/shared/src/maps/game/props.ts`. Cafe entrances, station coordinates and shared collision slots stay fixed. Props form an upper coffee station, east table under a parasol, southwest seating, and southeast self-service tea corner. Final scene and sprite checks are in `output/cafe-v2/`.
