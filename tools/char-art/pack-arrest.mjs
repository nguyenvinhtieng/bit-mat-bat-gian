// Reproducible paired arrest atlas. AI source art remains untouched.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const source = 'assets/_src/maps/game/characters/previews/arrest-v2.png';
const propsSource = 'assets/_src/maps/game/characters/previews/arrest-v1.png';
const legacy = 'assets/maps/game/characters/';
const output = 'apps/web/public/assets/maps/game/characters/';
const fw = 576, fh = 384, width = fw * 4, height = fh * 6;
const frames = {}, baseCells = [], tintCells = [];
const frame = (x, y, w, h) => ({ frame: { x, y, w, h }, rotated: false, trimmed: false,
  spriteSourceSize: { x: 0, y: 0, w, h }, sourceSize: { w, h } });

// Select complete alpha components and retain their antialiased edges.
function components(data, w, h, minimum) {
  const labels = new Int32Array(w * h), sprites = [];
  let id = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || data[start * 4 + 3] < 100) continue;
    const queue = [start]; labels[start] = ++id;
    let left = w, right = 0, top = h, bottom = 0;
    for (let head = 0; head < queue.length; head++) {
      const p = queue[head], x = p % w, y = Math.floor(p / w);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const n of [x ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (n < 0 || labels[n] || data[n * 4 + 3] < 100) continue;
        labels[n] = id; queue.push(n);
      }
    }
    if (queue.length > minimum) sprites.push({ id, left, right, top, bottom });
  }
  return { labels, sprites };
}
function extract(data, w, h, labels, selected) {
  const ids = new Set(selected.map(s => s.id));
  const left = Math.max(0, Math.min(...selected.map(s => s.left)) - 2);
  const top = Math.max(0, Math.min(...selected.map(s => s.top)) - 2);
  const cw = Math.min(w - left, Math.max(...selected.map(s => s.right)) - left + 3);
  const ch = Math.min(h - top, Math.max(...selected.map(s => s.bottom)) - top + 3);
  const result = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = (y + top) * w + x + left;
    let keep = ids.has(labels[p]);
    if (!keep && !labels[p]) for (let dy = -2; dy <= 2 && !keep; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + left + dx, yy = y + top + dy;
      if (xx >= 0 && xx < w && yy >= 0 && yy < h && ids.has(labels[yy * w + xx])) { keep = true; break; }
    }
    if (keep) data.copy(result, (y * cw + x) * 4, p * 4, p * 4 + 4);
  }
  return { data: result, width: cw, height: ch };
}
async function raw(path) { return sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); }
async function cell(cells, data, w, h, left, top) {
  cells.push({ input: await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer(), left, top });
}
const input = await raw(source), pairs = [];
const composition = components(input.data, input.info.width, input.info.height, input.info.width * input.info.height * 0.01);
if (composition.sprites.length !== 8) throw new Error(`Expected 8 complete paired compositions, got ${composition.sprites.length}`);
composition.sprites.sort((a,b) => (a.top+a.bottom)-(b.top+b.bottom));
const ordered = [0,1].flatMap(row => composition.sprites.slice(row*4,row*4+4).sort((a,b)=>a.left-b.left));
for (const sprite of ordered) pairs.push(extract(input.data,input.info.width,input.info.height,composition.labels,[sprite]));
const scale = Math.min(...pairs.map(p => Math.min(540 / p.width, 350 / p.height)));
for (const [i, pair] of pairs.entries()) {
  const w = Math.round(pair.width * scale), h = Math.round(pair.height * scale);
  const data = await sharp(pair.data, {raw:{width:pair.width,height:pair.height,channels:4}}).resize(w,h).raw().toBuffer();
  const officer = Buffer.alloc(data.length), victim = Buffer.alloc(data.length);
  let blueCount = 0, redCount = 0;
  for (let p = 0; p < data.length; p += 4) {
    const [r,g,b,a] = data.subarray(p,p+4);
    const blue = b > 60 && b > r * 1.4 && b > g * 1.12;
    const red = r > 55 && g < r * 0.5 && b < r * 0.7;
    if (!a || !(blue || red)) continue;
    const shade = Math.min(255,Math.round(Math.max(r,g,b)*1.12)), mask = blue ? officer : victim;
    data[p] = data[p+1] = data[p+2] = shade;
    mask[p] = mask[p+1] = mask[p+2] = shade; mask[p+3] = a;
    if (blue) blueCount++; else redCount++;
  }
  if (blueCount < 100 || redCount < 100) throw new Error(`Composition ${i} needs separate blue/red helmets`);
  const x = i % 4 * fw, y = Math.floor(i / 4) * fh, inset = Math.round((fw-w)/2);
  await cell(baseCells,data,w,h,x+inset,y+372-h);
  await cell(tintCells,officer,w,h,x+inset,y+372-h);
  // Second bank uses a separate rectangle so Phaser can tint each helmet independently.
  await cell(baseCells,data,w,h,x+inset,y+fh*2+372-h);
  await cell(tintCells,victim,w,h,x+inset,y+fh*2+372-h);
  frames[`arrest-${i}`] = frame(x,y,fw,fh);
  frames[`arrest-victim-${i}`] = frame(x,y+fh*2,fw,fh);
}
const oldProps = await raw(propsSource), c = components(oldProps.data,oldProps.info.width,oldProps.info.height,oldProps.info.width*oldProps.info.height*.0005);
if (c.sprites.length !== 24) throw new Error('Expected 24 original props/source sprites');
c.sprites.sort((a,b)=>(a.top+a.bottom)-(b.top+b.bottom));
const props = c.sprites.slice(16).sort((a,b)=>a.left-b.left);
for (const col of [0,1,2,3,6,7]) {
  const p = extract(oldProps.data,oldProps.info.width,oldProps.info.height,c.labels,[props[col]]);
  const norm = await sharp(p.data,{raw:{width:p.width,height:p.height,channels:4}}).resize({width:270,height:246,fit:'inside'}).raw().toBuffer({resolveWithObject:true});
  const data=norm.data, mask=Buffer.alloc(data.length);
  for(let k=0;k<data.length;k+=4){const [r,g,b,a]=data.subarray(k,k+4);if(col<4&&a&&r>55&&g<r*.5&&b<r*.7){const s=Math.min(255,Math.round(r*1.12));data[k]=data[k+1]=data[k+2]=s;mask[k]=mask[k+1]=mask[k+2]=s;mask[k+3]=a;}}
  const index=[0,1,2,3,6,7].indexOf(col), x=index*288, y=fh*4;
  const w=norm.info.width,h=norm.info.height;
  await cell(baseCells,data,w,h,x+Math.round((288-w)/2),y+255-h);
  await cell(tintCells,mask,w,h,x+Math.round((288-w)/2),y+255-h);
  frames[col<4?`parked-${['down','left','right','up'][col]}`:col===6?'badge':'cuffs']=frame(x,y,288,264);
}
const original=await sharp(`${legacy}player-action.png`).metadata();
for(const [row,action] of ['strike','die','guard'].entries())for(let col=0;col<4;col++)frames[`${action}-${col}`]=frame(col*132,fh*5+row*88,132,88);
for(const [name,cells] of [['player-action',baseCells],['player-action-tint',tintCells]]){
  const atlas=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(cells).raw().toBuffer();
  const pixels=await sharp(`${legacy}${name}.png`).ensureAlpha().raw().toBuffer();
  for(let y=0;y<original.height;y++)pixels.copy(atlas,((fh*5+y)*width)*4,y*original.width*4,(y+1)*original.width*4);
  await sharp(atlas,{raw:{width,height,channels:4}}).webp({lossless:true}).toFile(`${output}${name}.webp`);
  await fs.writeFile(`${output}${name}.json`,JSON.stringify({frames,meta:{app:'the-hidden-truth/chatgpt-image-arrest',image:`${name}.webp`,size:{w:width,h:height},scale:'1',arrest:{displayScale:1/3,frameMs:[0,350,700,2200,2700,3200,3650,4050],cuffsAt:3200,escortAt:4050,bikeAt:4650,duration:5200}}},null,2)+'\n');
}
console.log('Packed 8 paired arrest compositions, 8 independent victim masks, 6 props, 12 legacy frames.');
