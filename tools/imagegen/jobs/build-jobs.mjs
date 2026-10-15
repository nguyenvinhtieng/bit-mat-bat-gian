// Builds the full asset job list (prompts follow prompts/assets.md).
// node tools/imagegen/jobs/build-jobs.mjs > tools/imagegen/jobs/all.json
const SRC = 'assets/_src';
const STYLE =
  'Flat 2D cartoon game art, soft dark outline, clean flat shading, cozy museum-interior game look (Among Us-like), top-down 3/4 view (NOT isometric). Hue (Vietnam) palette: earthy ochre yellow, jade green, dark lacquered wood, cream paper, imperial red accents.';
const KEY = 'Solid flat pure magenta #FF00FF background filling everything around the object, no ground shadow, no text, no letters, no watermark, no border.';
const NOTEXT = 'Absolutely no readable text, letters or numbers anywhere (use blurred grey lines for any writing).';

const jobs = [];
const add = (out, aspect, prompt) => jobs.push({ out: `${SRC}/${out}`, aspect, prompt });

// --- common ---
add('common/ui-sheet.png', '4:3', `${STYLE} Game UI icon sheet: exact grid of 4 columns x 3 rows, equal cells, one icon centered per cell with big empty margins. Icons: (1) glowing golden interaction ring seen from above (task marker), (2) green check mark stamp badge (task complete), (3) brass hand bell (emergency meeting), (4) folded document with magnifying glass (clue), (5) speech bubble (chat), (6) hourglass (timer), (7) round wooden meeting table seen from above, (8) red exclamation alert badge, (9) gold star badge (progress), (10) open notebook (clue notebook), (11) ballot box (vote), (12) door with arrow (leave). Bold readable silhouettes at 32px. ${KEY}`);
add('common/role-icons.png', '3:2', `${STYLE} Role icon sheet for a deduction game: exact grid of 3 columns x 2 rows, equal cells, one flat round-badge icon per cell, centered with empty margins. (1) Historian: hourglass in front of a rolled scroll, jade badge. (2) Conservator: magnifying glass over a wax-sealed box, teal badge. (3) Local guide: map pin over folded paper map with compass, ochre badge. (4) Archivist: stack of file folders with version tabs, blue badge. (5) Forger: quill pen with dripping ink and a tiny edited stamp, crimson badge. (6) Broker: two overlapping speech bubbles with a small key, purple badge. Readable at 48px. ${KEY}`);

// --- Hue tileset textures ---
const TEX = 'Seamless tileable square texture, viewed straight from above, flat cartoon game tile art with subtle detail, evenly lit, no perspective, no objects, edges tile perfectly.';
add('maps/co-do-hue/tex-floor-wood.png', '1:1', `${TEX} Dark polished lacquered wooden floorboards, warm brown, exactly 4 planks wide. Hue palace interior mood.`);
add('maps/co-do-hue/tex-floor-carpet.png', '1:1', `${TEX} Deep imperial red carpet with a faint repeating gold geometric pattern (traditional Vietnamese motif), soft fabric.`);
add('maps/co-do-hue/tex-floor-cream.png', '1:1', `${TEX} Cream ceramic floor tiles in a 4x4 grid with thin warm grout lines, clean office look.`);
add('maps/co-do-hue/tex-floor-terracotta.png', '1:1', `${TEX} Traditional Vietnamese terracotta courtyard bricks (gach bat), rust orange squares in a 4x4 grid, slightly weathered.`);
add('maps/co-do-hue/tex-floor-stone.png', '1:1', `${TEX} Cool grey stone floor slabs in a 3x3 grid, storage room, subtle cracks.`);
add('maps/co-do-hue/tex-floor-jade.png', '1:1', `${TEX} Muted jade green encaustic cement tiles with a simple cream flower pattern, 4x4 grid, Vietnamese colonial-era tile style.`);
add('maps/co-do-hue/tex-wall-face.png', '1:1', `${TEX} Front-facing interior wall seen head-on: cream plaster upper part, dark lacquered wood wainscot panel on the bottom third, thin ochre yellow trim line at the top. Horizontal seamless.`);
add('maps/co-do-hue/tex-wall-top.png', '1:1', `${TEX} Top of thick walls seen from above: dark lacquered wood with a thin gold inlay border pattern, very dark brown.`);

// --- Hue props (transparent via chroma key) ---
const prop = (key, aspect, desc) =>
  add(`maps/co-do-hue/props/${key}.png`, aspect, `${STYLE} Single game prop, centered, whole object visible, standing on the floor, top-down 3/4 view: ${desc}. ${NOTEXT} ${KEY}`);
prop('hue-prop-exhibition-panel-bilingual', '9:16', 'tall freestanding exhibition information panel on two wooden legs, cream board with an ochre header band, two columns of blurred grey text lines (bilingual), small photo of a Hue citadel gate');
prop('hue-prop-exhibition-photo-wall', '3:2', 'wall-mounted gallery row of 3 framed photographs of Hue imperial architecture (citadel gate, pavilion roof, lotus pond), dark wood frames');
prop('hue-prop-exhibition-spotlight', '1:1', 'small black museum track spotlight on a short stand casting a warm cone of light');
prop('hue-prop-editing-printer', '1:1', 'large office laser printer with paper tray and a jammed sheet sticking out');
prop('hue-prop-editing-scanner', '1:1', 'flatbed document scanner with the lid half open, a page inside');
prop('hue-prop-editing-desk-papers', '16:9', 'long wooden work desk covered with messy printed drafts, sticky notes, a laptop and a coffee cup');
prop('hue-prop-archive-shelf-a', '3:2', 'wide dark wooden archive shelf with labeled cardboard document boxes and binders');
prop('hue-prop-archive-box-hue04', '4:3', 'single cardboard archive document box with a blank label and string tie');
prop('hue-prop-storage-sealed-box', '4:3', 'wooden storage crate with a red wax seal and paper seal strip across the lid');
prop('hue-prop-storage-copy-stand', '1:1', 'museum pedestal display stand with a glass cover holding a replica old document scroll');
prop('hue-prop-coord-whiteboard', '4:3', 'whiteboard on a stand with a schedule grid of colored blurred marks and pinned notes');
prop('hue-prop-coord-monitor', '4:3', 'desk with a computer monitor showing a blurred group chat window, keyboard, phone');
prop('hue-prop-corridor-plant', '3:4', 'potted plant in a glazed ceramic pot (blue and white Vietnamese ceramic)');
prop('hue-prop-courtyard-banner', '2:3', 'tall vertical festival banner on a pole, crimson cloth with an ochre lotus emblem, no text');
prop('hue-prop-courtyard-bench', '21:9', 'long traditional dark wooden bench');
prop('hue-prop-courtyard-meeting-table', '3:2', 'large round wooden meeting table with a brass hand bell on top and scattered papers');

// --- task stations ---
add('maps/co-do-hue/stations/hue-stations-sheet.png', '3:2', `${STYLE} Task station icon sheet: exact grid of 3 columns x 2 rows, equal cells, one round icon per cell centered with empty margins, each on an ochre-gold round floor medallion. (1) printer with a checklist clipboard, (2) flatbed scanner with a page and a footnote asterisk, (3) floor plan blueprint with a pencil, (4) spotlight with a small label tag, (5) wooden box with red wax seal, (6) book being returned to a shelf with an arrow. ${NOTEXT} ${KEY}`);

// --- meta ---
add('maps/co-do-hue/meta/hue-map-icon.png', '1:1', `${STYLE} Round app-style icon: stylized Hue citadel gate silhouette with a lotus and a magnifying glass, ochre and jade on dark wood background. ${NOTEXT}`);

process.stdout.write(JSON.stringify(jobs, null, 2));
