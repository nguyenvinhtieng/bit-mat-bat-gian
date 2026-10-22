import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const source = 'assets/maps/game';
const runtime = 'apps/web/public/assets/maps/game';
const keys = ['prop-archive-tu-so', 'prop-archive-ban-dem-tien', 'prop-archive-nem', 'decor-quat-may', 'decor-thung-giay'];
const atlas = JSON.parse(await fs.readFile(`${source}/atlas/decor-0.json`));
assert.deepEqual(atlas, JSON.parse(await fs.readFile('/tmp/archive-v2-before-atlas.json')));
assert.deepEqual(atlas, JSON.parse(await fs.readFile(`${runtime}/atlas/decor-0.json`)));
const raw = (p) => sharp(p).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const before = await raw('/tmp/archive-v2-before-atlas.png');
const after = await raw(`${source}/atlas/decor-0.png`);
const exported = await raw(`${runtime}/atlas/decor-0.webp`);
for(let i=0;i<after.data.length;i+=4) {
  assert.equal(after.data[i+3],exported.data[i+3], 'Runtime alpha differs');
  if(after.data[i+3]===0) continue; // WebP discards RGB beneath fully transparent pixels.
  for(let c=0;c<3;c++) assert.equal(after.data[i+c],exported.data[i+c], 'Visible runtime pixel differs');
}
assert((await raw(`${source}/meta/map-preview.png`)).data.equals((await raw(`${runtime}/meta/map-preview.webp`)).data),'Runtime preview differs');
const frames = keys.map(key => atlas.frames[key].frame);
let changed = 0;
for(let y=0; y<after.info.height; y++) for(let x=0; x<after.info.width; x++) {
  const p = (y*after.info.width+x)*4;
  if(after.data[p]===before.data[p] && after.data[p+1]===before.data[p+1] && after.data[p+2]===before.data[p+2] && after.data[p+3]===before.data[p+3]) continue;
  assert(frames.some(f => x>=f.x && x<f.x+f.w && y>=f.y && y<f.y+f.h), `Unrelated pixel changed: ${x},${y}`);
  changed++;
}
assert(changed>0);
for(const key of keys) {
  const sprite = await raw(`${source}/props/${key}.png`);
  const f = atlas.frames[key].frame;
  assert.equal(sprite.info.width,f.w); assert.equal(sprite.info.height,f.h);
  let empty=0,opaque=0;
  for(let i=3;i<sprite.data.length;i+=4) { if(sprite.data[i]===0)empty++; if(sprite.data[i]>80)opaque++; }
  assert(empty>0 && opaque>0, `${key}: alpha/visible content missing`);
}
await sharp(`${source}/meta/map-preview.png`).extract({left:170,top:1150,width:760,height:355}).resize(1520,710).png().toFile('output/archive-v2/after.png');
const result={replaced:keys,changedPixels:changed,untouchedPixelsPreserved:true,atlasMetadataPreserved:true,runtimeMatchesSource:true,alphaAndDimensions:true};
await fs.writeFile('output/archive-v2/validation.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS: 5 sprites, alpha/dimensions, unchanged metadata, exact non-target pixels, lossless runtime parity');
