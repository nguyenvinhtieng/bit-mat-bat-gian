# Smaller cafe tiles and reference sedge mats

Built-in ChatGPT Image edit. Accepted raw output: `cafe-generated.png` (1312×1199), downsampled into the native 2874×2190 floor; no full-map upscaling. `mat-reference.png` is the user reference. `cafe-edit-input.png` is the original cafe crop.

Prompt: Preserve exact overhead framing, lighting, drain positions and mat bounds. Reduce ochre/cream/maroon Indochine floral repeat to about one third diameter. Match the reference mat: pale straw woven body, wide red border, cream inset lines, red square corner ornaments, one circular geometric red center seal and paired side motifs. No green stripes or diamond rows. Crisp fibers and outlines; no added objects or text.

Run `node compose-floor.cjs`. The compositor places the generated cafe patch and reuses its mat art for both existing mats in the lower-left room. All surrounding pixels and world geometry stay unchanged. Import with `tools/assets-pack/import-saigon-art.mjs`; retain the existing generated props and lossless signs.
