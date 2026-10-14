/**
 * map-compile: prompts/map/<slug>.md -> JSON (technology.md §5).
 * Extracts tables by heading: NPCs, common tasks, role tasks, variants.
 * Output is server-only (apps/server/src/content/<slug>.map.json) — it includes variant truths.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MAPS = ['co-do-hue'];

type Row = Record<string, string>;

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\*/g, '')
    .replace(/^(Chi|Anh|Em|Ong|Ba)\s+/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const clean = (s: string) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();

/** Return tables that follow a heading whose text includes `heading`. */
function tablesUnder(md: string, heading: string): Row[][] {
  const lines = md.split('\n');
  const out: Row[][] = [];
  let inSection = false;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const h = /^(#+)\s+(.*)$/.exec(lines[i]);
    if (h) {
      if (h[2].includes(heading)) {
        inSection = true;
        level = h[1].length;
        continue;
      } else if (inSection && h[1].length <= level) inSection = false;
    }
    if (!inSection || !lines[i].trim().startsWith('|')) continue;
    if (!lines[i + 1]?.includes('---')) continue;
    const header = lines[i].split('|').slice(1, -1).map(clean);
    const rows: Row[] = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith('|')) {
      const cells = lines[j].split('|').slice(1, -1).map(clean);
      rows.push(Object.fromEntries(header.map((k, idx) => [k, cells[idx] ?? ''])));
      j++;
    }
    out.push(rows);
    i = j;
  }
  return out;
}

for (const slug of MAPS) {
  const md = fs.readFileSync(path.join(ROOT, 'prompts/map', `${slug}.md`), 'utf8');
  const title = /^#\s+Map:\s*(.*)$/m.exec(md)?.[1] ?? slug;
  const oneLiner = (/## Tóm tắt một dòng\s+([\s\S]*?)\n---/.exec(md)?.[1] ?? '').trim().replace(/\*\*/g, '');

  const npcTables = tablesUnder(md, 'Nhân vật (NPC');
  const npcs = npcTables.flat().map((r) => {
    const raw = r['Nhân vật'] ?? '';
    const [namePart, rolePart] = raw.split('—').map((s) => s.trim());
    return {
      id: slugify(namePart),
      name: namePart,
      role: rolePart ?? r['Vai trò'] ?? '',
      story: r['Vai trò câu chuyện'] ?? r['Vai trò'] ?? '',
      knows: r['Thường biết gì'] ?? r['Ghi chú thiết kế'] ?? '',
      voice: r['Gợi ý giọng'] ?? '',
    };
  });

  const [commonTasks = []] = tablesUnder(md, 'Nhiệm vụ chung');
  const [roleTasks = []] = tablesUnder(md, 'Nhiệm vụ theo role');
  const [variants = []] = tablesUnder(md, 'Biến thể vụ án');
  const [areas = []] = tablesUnder(md, 'Layout màn chơi');

  const json = {
    slug,
    mapVersion: 1,
    title,
    oneLiner,
    areas: areas.map((r) => ({ name: r['Khu vực'], role: r['Vai trò trong ván'], clues: r['Manh mối thường gặp'] })),
    npcs: npcs.filter((n) => n.id && !n.id.startsWith('dai-dien')).concat(npcs.filter((n) => n.id.startsWith('dai-dien'))),
    commonTasks: commonTasks.map((r) => ({ name: r['Nhiệm vụ'], room: r['Phòng'], effect: r['Hiệu ứng gameplay (gợi ý)'] })),
    roleTasks: roleTasks.map((r) => ({ role: r['Role'], action: r['Tại map Huế'], result: r['Kết quả dạng'] })),
    variants: variants.map((r) => ({ id: r['ID'], truth: r['Sự thật rút gọn'], fake: r['“Lời giải giả” mạnh'], meta: r['Meta lộ ra'] })),
  };
  const out = path.join(ROOT, 'apps/server/src/content', `${slug}.map.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(json, null, 2) + '\n');
  console.log(`[map-compile] ${slug}: ${json.npcs.length} npcs, ${json.commonTasks.length} tasks, ${json.variants.length} variants -> ${path.relative(ROOT, out)}`);
}
