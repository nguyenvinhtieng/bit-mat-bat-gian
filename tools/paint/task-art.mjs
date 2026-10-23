/** Deterministic, font-independent game sprites. Run: node tools/paint/task-art.mjs */
import { readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('apps/web/public/assets/maps/game/tasks');
const C = { ink: '#343b35', cream: '#fff2ce', jade: '#438978', red: '#bd5946', gold: '#e7b765', blue: '#7fa8ad', wood: '#bb8b5c' };
const path = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const rect = (x,y,w,h,fill,rx=5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const circle = (x,y,r,fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const ellipse = (x,y,rx,ry,fill) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const line = (x,y,xx,yy,color=C.ink) => `<path d="M${x} ${y}L${xx} ${yy}" stroke="${color}" fill="none"/>`;
const parcel = () => path('M16 29L48 14 80 29 80 69 48 85 16 69Z', C.wood) + path('M16 29L48 45 80 29M48 45V85M33 22L65 37V53L55 58V42L24 27', C.gold);
const scooter = (color=C.jade) => circle(23,72,13,C.ink)+circle(74,72,13,C.ink)+circle(23,72,6,C.cream)+circle(74,72,6,C.cream)+path('M17 63Q12 45 30 44L48 53H59L64 29H76L70 63Z',color)+rect(28,39,29,8,C.ink)+line(70,29,66,18)+line(60,18,74,18)+rect(24,23,22,16,C.gold)+circle(75,34,5,C.cream);
const ticket = (color=C.cream) => rect(18,15,60,68,color)+line(29,29,67,29)+line(29,38,57,38)+line(29,48,67,48)+line(29,68,35,68)+line(41,68,46,68)+line(53,68,58,68)+line(64,68,68,68)+circle(67,19,4,C.red);
const cup = (color, pearls=false) => path('M28 24H72L66 80Q48 88 34 80Z',C.cream)+path('M31 40H69L64 77Q48 83 36 77Z',color)+rect(26,20,48,7,C.cream)+line(58,42,68,8)+ (pearls ? [39,48,57,44,54].map((x,i)=>circle(x,70+(i%2)*7,3,C.ink)).join('') : path('M39 44L46 40 48 48 41 52ZM54 54L61 50 63 58 56 62Z',C.cream));
const bowl = (soup=false) => path('M12 43Q16 83 48 83Q80 83 84 43Z',soup?C.red:C.jade)+ellipse(48,43,36,13,C.cream)+ellipse(48,43,29,9,soup?C.gold:'#eedfbb')+path('M27 43Q40 26 51 43Q62 54 72 39M32 47Q48 34 62 48',soup?'none':'#f7ebd2')+circle(35,39,4,C.jade)+circle(62,44,4,C.red)+line(68,36,85,12)+line(73,39,90,15);
const balloon = () => ellipse(33,31,18,24,C.red)+ellipse(65,29,17,23,C.gold)+path('M33 55L48 83 65 52M48 83V90')+path('M26 16Q19 23 23 31','none','stroke="#ffe5bc"');
const bottle = (color=C.jade) => rect(36,10,24,12,C.gold)+path('M37 22H59V32L66 43V81H30V43L37 32Z',color)+rect(31,47,34,22,C.cream)+path('M41 58H55M48 51V65');
const person = () => path('M17 87V71Q19 58 34 56H62Q77 58 79 71V87Z',C.jade)+circle(48,34,22,'#d8ad7d')+path('M26 31Q22 9 48 10Q73 9 70 31L61 21Q44 32 28 27',C.ink)+circle(40,35,1,C.ink)+circle(56,35,1,C.ink)+path('M41 46Q48 51 55 46')+path('M34 60L48 73 62 60',C.cream);
const tyre = () => circle(48,48,35,C.ink)+circle(48,48,23,C.cream)+circle(48,48,13,C.blue)+path('M48 25V71M25 48H71M32 32L64 64M32 64L64 32','none','stroke="#627b78"')+circle(48,48,5,C.ink);
const phin = () => rect(27,22,42,34,'#a4b4ae')+rect(20,56,56,6,C.ink)+rect(23,17,50,7,C.cream)+rect(42,10,12,7,C.ink)+path('M33 64H64L60 86H37Z',C.cream)+path('M37 74H61V82H38Z','#68452e')+path('M69 28Q87 28 83 43Q81 48 69 46');
const door = () => rect(15,6,66,86,C.wood)+rect(22,13,52,78,C.jade)+rect(29,20,38,22,C.blue)+rect(29,49,38,34,'#367362')+circle(65,47,3,C.gold)+rect(75,34,12,18,C.cream);
const art = {
  'com-tam': () => ellipse(48,56,39,26,C.jade)+ellipse(48,52,34,22,C.cream)+path('M21 55Q20 31 42 34Q59 37 56 61Z','#f5e6bd')+path('M49 35L72 41 69 61 48 56Z',C.wood)+line(54,40,68,46)+line(53,47,67,53)+ellipse(37,44,14,10,'#fff9df')+circle(38,43,6,C.gold)+circle(69,65,6,C.red)+path('M22 61L41 66',C.jade),
  'banh-mi': () => path('M14 64Q10 48 28 30L62 17Q81 13 85 32Q86 45 69 57L33 78Q20 83 14 64Z',C.gold)+path('M18 59L76 30 79 39 23 70Z',C.jade)+path('M22 59L73 33 75 39 25 66Z',C.red)+path('M30 32L39 41M45 24L54 33M62 18L69 26','none','stroke="#fff0c2"'),
  'goi-cuon': () => ellipse(48,65,39,20,C.jade)+[0,1,2].map(i=>`<g transform="translate(${i*18-17} ${i%2*5})">${rect(33,24,25,49,'#e4e4be',12)}${path('M36 40L51 31M37 50L54 41M37 63L54 54','none','stroke="#74a070"')}${ellipse(45,34,7,4,'#d7976c')}</g>`).join(''),
  'banh-trang': () => circle(48,49,36,C.gold)+circle(48,49,30,'#ead6a2')+path('M24 34L67 65M23 55L68 37M39 21L51 77','none','stroke="#cb6c48"')+[ [30,42],[58,29],[64,52],[41,62],[34,30],[53,47]].map(([x,y])=>circle(x,y,3,C.jade)).join(''),
  'ca-phe': () => cup('#704b34'), 'nuoc-mia': () => cup('#b8c66f'), 'tra-sua': () => cup('#c69c68',true),
  'canh-chua': () => bowl(true), 'nuoc-leo': () => bowl(true),
  milk: () => rect(25,24,47,61,C.cream)+rect(25,24,47,17,C.red)+ellipse(48,24,23,7,'#bcc3b6')+path('M35 55Q48 46 61 55M35 68H61','none','stroke="#7f9a8b"'), phin,
  pump: () => rect(35,36,26,45,C.red)+rect(44,14,8,24,'#9caba4')+rect(26,9,44,10,C.ink)+rect(22,79,52,8,C.ink)+path('M61 69Q89 74 83 38L75 34'), tyre,
  pop: () => path('M48 7L55 30 76 17 66 40 90 48 67 57 77 79 54 68 48 92 39 68 16 79 28 56 5 48 28 39 17 16 40 29Z',C.gold)+path('M48 31V55M48 65V67','none','stroke="#bd5946" stroke-width="6"'),
  patch: () => ellipse(48,52,33,24,C.red)+ellipse(48,52,23,15,C.ink)+path('M33 51L44 62 64 41','none','stroke="#e7b765" stroke-width="5"'),
  bubble: () => circle(32,65,14,'#afdbd5')+circle(64,41,18,'#c8e8df')+circle(42,17,8,'#d9eee0')+path('M24 61Q24 53 32 53M54 36Q55 29 62 29','none','stroke="#fff2ce"'),
  nail: () => path('M42 20H54L51 79 46 88Z','#a4b4ae')+rect(30,14,36,8,C.ink),
  box: parcel, package: parcel, 'kien-hang': parcel,
  tape: () => ellipse(48,48,34,29,C.gold)+ellipse(48,48,16,12,C.cream)+path('M73 62L85 82H60L48 70',C.gold),
  'mi-goi': () => rect(14,23,68,51,C.red)+path('M15 31H81M15 66H81','none','stroke="#e7b765"')+ellipse(48,49,24,14,C.cream)+path('M31 49Q37 39 43 49T55 49T66 49','none','stroke="#bb8b5c"'),
  'sau-rieng': () => path('M48 10L55 20 68 16 71 28 82 33 77 45 85 56 74 64 71 77 58 76 48 87 37 77 24 79 22 65 12 57 19 45 14 33 27 28 29 17 42 21Z',C.jade)+ellipse(48,49,18,28,C.gold)+line(48,22,48,76),
  'nuoc-suoi': () => bottle(C.blue), bike: scooter, mine: () => scooter(C.jade), rider: () => scooter(C.jade),
  've-xe': () => ticket('#f1cf83'), 've-so': () => ticket(), 'hoa-don': () => ticket(), 'to-roi': () => ticket('#a6c2b2'),
  'tien-le': () => rect(10,26,76,44,'#91aa7e')+rect(16,32,64,32,'#c6cca0')+circle(48,48,12,C.jade)+circle(23,48,4,C.cream)+circle(73,48,4,C.cream),
  'vo-keo': () => path('M27 32L9 22 15 48 8 73 29 62 68 62 88 73 82 48 88 24 69 33Z',C.red)+rect(28,31,41,33,C.gold)+line(33,38,64,55),
  keo: () => circle(48,34,23,C.red)+path('M35 20Q59 14 62 34Q63 49 46 48Q33 47 35 34Q37 24 48 27')+rect(45,58,6,30,C.cream),
  'day-thun': () => ellipse(48,49,32,24,'none')+ellipse(48,49,27,19,'none')+path('M22 64L73 33','none','stroke="#bb8b5c"'),
  'bat-lua': () => rect(31,29,34,55,C.red)+rect(31,18,34,17,'#a4b4ae')+rect(38,12,13,11,C.ink)+line(38,44,57,44),
  'chia-khoa': () => circle(32,31,18,C.gold)+circle(32,31,8,C.cream)+path('M43 44L75 77 85 67 76 58 69 65 63 58 69 52 57 41Z',C.gold),
  'khau-trang': () => path('M22 34Q48 21 74 34V65Q48 80 22 65Z',C.blue)+path('M22 37Q3 23 8 53Q10 70 22 62M74 37Q93 23 88 53Q86 70 74 62M30 43H66M30 53H66M30 63H66','none','stroke="#d6e4ce"'),
  'bong-bay': balloon, 'dau-gio': () => bottle(C.jade),
  'danh-giay': () => path('M18 43L34 35 43 52 70 56Q85 60 82 74H15Z',C.wood)+path('M15 74H83V81H15Z',C.ink)+line(38,46,49,41)+line(43,53,54,48),
  owner: person, recipient: person, door,
  bell: () => path('M24 66L31 55V39Q31 20 48 20Q65 20 65 39V55L73 66Z',C.gold)+rect(20,66,56,7,C.wood)+circle(48,80,7,C.gold)+rect(43,12,10,9,C.gold),
  phone: () => rect(28,8,40,80,C.ink)+rect(33,18,30,56,'#b8caaa')+path('M38 40Q48 29 58 40M42 46Q48 39 54 46')+circle(48,51,2,C.jade)+line(44,12,52,12)+circle(48,81,2,C.cream),
  fan: () => rect(27,80,42,8,C.wood)+rect(44,56,8,25,C.jade)+circle(48,33,27,C.blue)+circle(48,33,21,C.cream)+path('M48 33Q26 6 40 15Q55 12 48 33Q76 19 67 35Q72 48 48 33Q47 63 34 50Q21 48 48 33',C.jade)+circle(48,33,5,C.gold),
  fridge: () => rect(24,8,48,80,C.cream)+line(24,37,72,37)+rect(59,21,4,10,C.jade)+rect(59,48,4,21,C.jade)+line(29,88,29,92)+line(67,88,67,92),
  table: () => path('M19 40L14 86M77 40L82 86M35 42V82M61 42V82','none','stroke="#bb8b5c" stroke-width="6"')+ellipse(48,35,40,16,C.jade),
  plant: () => path('M30 61H66L60 87H36Z',C.red)+path('M48 64V24M48 47Q16 48 20 24Q44 22 48 47M48 34Q49 8 71 9Q76 31 48 34M48 58Q53 31 79 38Q80 61 48 58',C.jade),
  'o-ga': () => ellipse(48,53,41,24,'#8c8d79')+path('M11 53L24 41 38 42 47 32 64 39 79 43 85 59 66 68 47 66 30 73 17 63Z',C.ink)+path('M27 55Q47 43 69 53','none','stroke="#667776"'),
  'vung-nuoc': () => ellipse(48,57,39,22,C.blue)+ellipse(48,57,24,12,'#a7c8c1')+path('M22 54L34 52M47 63L68 58','none','stroke="#d6e4ce"'),
  'tat-nuoc': () => path('M28 32H68L62 79H34Z',C.blue)+path('M28 35Q48 9 68 35M40 45L54 45M71 25Q85 19 82 8M77 41L90 37','none','stroke="#a7c8c1" stroke-width="5"'),
  cho: () => path('M19 47L32 33 60 36 77 52 71 72H29Z',C.wood)+path('M25 43L16 24 35 30M62 38L79 27 77 52',C.wood)+circle(39,49,2,C.ink)+circle(61,49,2,C.ink)+ellipse(50,61,12,9,C.cream)+circle(50,57,4,C.ink)+path('M47 66Q50 81 56 66',C.red),
};
const hero = { pack_cooler:'com-tam', dodge_sellers:'owner', brew_coffee:'phin', wifi_hunt:'phone', pump_tyre:'pump', patch_tube:'patch', tape_box:'box', stack_rack:'kien-hang', unpark_bike:'mine', find_ticket:'ve-xe', dodge_potholes:'rider', handoff_package:'package' };
let count = 0;
for (const task of Object.keys(hero)) {
  for (const name of await readdir(`${root}/${task}`)) {
    if (!name.endsWith('.svg')) continue;
    const key = name.replace('.svg','');
    const draw = art[key === 'card' || key === 'icon' ? hero[task] : key];
    if (!draw) throw new Error(`Missing art: ${task}/${key}`);
    const card = key === 'card';
    const backdrop = card ? rect(1,1,94,94,'#e4d6b4',12)+path('M0 72Q40 58 96 72V96H0Z','#c0c9a9') : '';
    const body = `<g stroke="${C.ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${backdrop}${ellipse(48,87,31,4,'#343b3514')}${draw()}</g>`;
    await writeFile(`${root}/${task}/${name}`, `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">${body}</svg>\n`);
    count++;
  }
}
console.log(`Painted ${count} SVG assets (no emoji or font dependencies).`);
