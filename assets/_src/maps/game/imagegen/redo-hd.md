# Saigon map HD redo — 2026-10-22

Generated with built-in ChatGPT Image. No quest art changed.

## Signs (separate transparent assets)

- `drain`: authentic Vietnamese illegal utility-pole advertisement photocopy. Cheap off-white torn paper, black condensed crowded bold type. Exact text: HÚT HẦM CẦU / THÔNG CỐNG NGHẸT / GIÁ BÌNH DÂN / PHỤC VỤ 24/24 / 09xx xxx xxx. No truck/icon/logo.
- `moving`: cheap yellowed photocopied moving-service flyer, dense bold Vietnamese type, ripped bottom tabs. Exact text: CHUYỂN NHÀ / TRỌN GÓI / XE BA GÁC • XE TẢI / DỌN NHÀ • CHUYỂN TRỌ / 09xx xxx xxx.
- `trash`: irregular weathered cream plaster decal with uneven hand-brushed red CẤM ĐỔ RÁC, black AI ĐỔ RÁC LÀM CHÓ. Accurate accents, dirty chipped edges, no board/border/icons.
- `dead-end`: cobalt blue Vietnamese enamel metal plaque, white condensed lettering HẺM 47 / HẺM CỤT, thin double border, chipped enamel and rusty mounting holes.

## Floor

Full-map edit requested 4032×3072 but returned 1437×1095; it is a reference, not a claimed native 4K deliverable. Split reference into four overlapping 768×597 crops at offsets (0,0), (669,0), (0,498), (669,498). Each crop was separately generated with this prompt:

“Production game map quadrant HD restoration. Repaint this EXACT image at 2048x1592 resolution, filling the canvas edge to edge with EXACT SAME crop. Preserve all geometry, every wall and pathway, position and size, roof boundaries, gate positions, colors and lighting EXACTLY; this is one quarter of a seamless assembled map so ALL FOUR outer edges must match reference exactly. Add crisp defined small material details and clean sharp chibi lineart: corrugated metal ridges, grout lines, plaster chips, sharp pavement cracks, leaves. No blur or painterly softness. Absolutely no new objects, no repositioning or layout changes, no extra margins, no border, no lettering. Orthographic top-down Saigon chibi game background. Maximal fine detail and crispness.”

Generated quadrants are preserved alongside the 2874×2190 composite. Overlaps feathered during asset assembly; logical game dimensions stay 2016×1536. This adds generated detail, rather than solely upscaling the previous full-map image.

## Runtime density

Decor atlas stores 3× logical frame dimensions with `meta.textureScale: 3`. Renderer applies reciprocal scale. Posters retain their generated resolution, packed as lossless WebP. Floor retains source resolution and explicitly displays at map logical size. Canvas backing dimensions track devicePixelRatio; camera zoom compensates to preserve world FOV and pointer mapping.

Reference types: [Vietnamese street service flyers](https://tuoitre.vn/bong-dung-ca-pho-quang-cao-hut-ham-cau-se-xu-ly-nha-mang-khong-quan-ly-duoc-sim-rac-20240615090543529.htm), [handwritten trash warnings](https://soha.vn/cam-bien-cam-do-rac-khong-tac-dung-nguoi-dan-chi-them-1-dong-chu-nay-lai-hieu-qua-den-khong-ngo-20190620074010703.htm). Generated art does not reproduce a real contact number.

Utility-pole edit: retain exact silhouette, wires, electrical boxes, lighting and chibi style; replace truck-icon ad only with black photocopy flyer text HÚT HẦM CẦU / THÔNG CỐNG / 24/24 / 09xx xxx xxx, using the new drain poster as material/typography reference. Original high-resolution edited pole is preserved as `saigon-pole-generated.png` by the importer.
