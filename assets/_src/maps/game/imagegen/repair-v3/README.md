# Tiệm Sửa Xe — replacement art

Generated with the built-in imagegen tool. Style references:
`prop-exhibition-xe-hu-tieu.png` and `prop-coordination-quay-ca-phe.png`.

Shared prompt: transparent production sprite for the Saigon alley game;
hand-painted aged materials, dark brown ink outlines, muted ochre/terracotta/teal,
upper-left amber highlights, elevated frontal three-quarter view, readable at
small sizes. Isolated whole object, genuine alpha, no scenery, lettering or watermark.

Subjects:
- `decor-binh-xang`: squat red steel petrol can, integrated handle, brass angled
  spout, chipped enamel and rust at seams, embossed ribs.
- `decor-can-nuoc`: squat worn blue plastic water can, molded handle, cream cap,
  rounded corners, horizontal ribs and grime in creases.
- `decor-lop-treo`: three used motorcycle tires hanging from rusty hooks on a
  narrow wooden batten, visible hollow centers and painted tread grooves.
- `prop-editing-thau-va-xe`: galvanized water basin and inner tube, low red open
  toolbox with tire levers, red floor pump with black handle and rubber hose.
- `prop-editing-ke-xang`: two-tier aged steel rack, six clear amber-filled bottles
  with red caps per tier, chipped ochre paint, small funnel and oily rag on top.

Import: `node tools/assets-pack/refresh-saigon-props.mjs --input assets/_src/maps/game/imagegen/repair-v3`

Checks: importer `--self-test`, `pnpm assets:check`, compare non-target atlas
pixels against the pre-import snapshot, inspect `output/repair-v3/after.png`.
