# Kho CRAB — replacement props

Generated with the built-in image_gen tool. Style reference: `assets/maps/game/props/prop-coordination-quay-ca-phe.png` (style only).

## Shared prompt

Transparent production sprite for the existing Hẻm 42 Vietnamese alley game. Match richly hand-painted worn materials, fine dark brown contours, upper-left amber highlights, muted teal and ochre palette, realistic detail, slightly elevated near-frontal orthographic view. Isolated complete object, transparent margins, no floor/backdrop/text/watermark or dramatic cast shadow. Readable silhouette at game scale.

## Subjects

- `prop-archive-tu-so`: tall honey-brown wooden bookkeeping cabinet; two glass doors and brass handles; faded ledgers and tied folders; vintage brown radio and red metal thermos on top. Worn lacquer and dusty corners, portrait 104:152.
- `decor-quat-may`: vintage seafoam standing fan; three blue-grey blades, wire cage, cream pole, weighted round foot, orange speed buttons, light rust. Portrait 48:88.
- `prop-archive-nem`: thin dusty-pink floral floor mattress; cream pillow left, folded indigo blanket right, small old phone near middle. Rumpled cotton and seams, visible thin side edge; no bed frame or legs. Landscape 136:72.
- `decor-thung-giay`: three worn corrugated delivery parcels, two wide boxes below a smaller upright box; faded tape, folded flaps, blank shipping labels. Square stack, no writing/logos.
- `prop-archive-ban-dem-tien`: weathered honey-brown wall shelf and two brackets; green cash tin, paper ledgers, banknotes, pencil cup, rubber-band holder; small blank tear-off calendar left with red header. Compact 136:96 silhouette; no wall, chair or table legs.

## Integration and checks

`node tools/assets-pack/refresh-saigon-props.mjs --self-test`

`node tools/assets-pack/refresh-saigon-props.mjs --input assets/_src/maps/game/imagegen/archive-v2`

Uses existing atlas frames and bottom-centre anchors. The refresh preserves all non-target frame pixels. Placement changes are limited to Kho CRAB in `packages/shared/src/maps/game/props.ts`.
