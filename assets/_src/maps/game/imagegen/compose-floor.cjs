const fs=require('fs/promises');const sharp=require('sharp');
const dir=__dirname;
const base=dir+'/';
(async()=>{
const names=Object.fromEntries(['00','10','01','11'].map(k=>[k,`saigon-floor-quadrant-${k}.png`]));const W=2874,H=2190,QW=1536,QH=1194,DX=1338,DY=996;const out=Buffer.alloc(W*H*3);const sum=new Float32Array(W*H*3),weights=new Float32Array(W*H);
for(const [key,name] of Object.entries(names)){

const raw=await sharp(base+name).resize(QW,QH,{fit:'fill'}).removeAlpha().raw().toBuffer(); const qx=Number(key[0]),qy=Number(key[1]);
for(let y=0;y<QH;y++)for(let x=0;x<QW;x++){
const wx=qx?Math.min(1,(x+1)/(QW-DX)):Math.min(1,(QW-x)/(QW-DX));
const wy=qy?Math.min(1,(y+1)/(QH-DY)):Math.min(1,(QH-y)/(QH-DY));
const w=wx*wy,p=(y+qy*DY)*W+x+qx*DX,s=(y*QW+x)*3;weights[p]+=w;
for(let c=0;c<3;c++)sum[p*3+c]+=raw[s+c]*w;
}}
for(let p=0;p<W*H;p++)for(let c=0;c<3;c++)out[p*3+c]=Math.round(sum[p*3+c]/weights[p]);
await sharp(out,{raw:{width:W,height:H,channels:3}}).png().toFile(`${dir}/saigon-floor-hd-composite.png`);console.log(`PASS floor ${W}x${H}; four overlapping generated quadrants; all pixels covered`);
})();
