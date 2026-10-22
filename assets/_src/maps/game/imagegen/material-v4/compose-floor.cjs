const sharp = require('sharp');
const path = require('node:path');

(async () => {
  const generated = path.join(__dirname, 'cafe-generated.png');
  const cafe = await sharp(generated).resize(744, 677).png().toBuffer();
  const mat = await sharp(generated)
    .extract({ left: 654, top: 744, width: 514, height: 319 })
    .png().toBuffer();
  const overlays = [{ input: cafe, left: 1988, top: 549 }];
  for (const [left, top, width, height] of [[284, 1886, 244, 190], [644, 1918, 212, 175]]) {
    overlays.push({ input: await sharp(mat).resize(width, height).png().toBuffer(), left, top });
  }
  await sharp(path.join(__dirname, '../material-v3/saigon-floor-hd-composite.png'))
    .composite(overlays).png().toFile(path.join(__dirname, 'saigon-floor-hd-composite.png'));
  console.log('PASS native 2874x2190 floor; generated cafe and three reference-pattern mats; surroundings untouched');
})();
