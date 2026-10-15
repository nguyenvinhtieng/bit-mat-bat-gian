/**
 * HOST-ONLY content for map `thang-long` — "Hồ Gươm · Đêm Giao Thừa".
 * Every task is a mini-game that gets Thăng Long ready for the stroke of midnight.
 * Answers / checks never leave the server: buildTask() returns the client payload + what to verify.
 * Facts checked (Oct 2026) against ich.unesco.org, dsvh.gov.vn and the Vietnamese press — sources inline.
 */
import { TL_TASK_IDS, type Pt, type TaskId, type TlTaskId } from '@hidden-truth/shared';

import { pick, rid, sample, shuffle, type Built, type Fact, type MapContent, type Pending } from '../common/util';

/** Heritage card shown after each task. */
export const TASK_FACTS: Record<TlTaskId, Fact> = {
  task_banh_chung: {
    // Lĩnh Nam chích quái; boiling time varies by source (8–12+ h)
    headline: 'Bánh chưng — tấm lòng của Lang Liêu',
    text: 'Theo truyện cổ trong “Lĩnh Nam chích quái”, Lang Liêu — con vua Hùng thứ sáu — dâng bánh chưng vuông tượng trưng cho Đất và bánh giầy tròn tượng trưng cho Trời. Gạo nếp bọc ngoài, nhân đậu xanh và thịt lợn ở giữa, gói trong lá dong; nồi bánh thường được luộc suốt nhiều giờ liền, có nơi tới mười mấy tiếng.',
  },
  task_dong_ho: {
    // https://ich.unesco.org/en/USL/craft-of-making-ong-h-folk-woodblock-printings-01737
    headline: 'Tranh Đông Hồ — màu từ cỏ cây, sỏi đá',
    text: 'Làng Đông Hồ (Bắc Ninh) in tranh trên giấy dó quét bột vỏ sò điệp. Màu lấy từ thiên nhiên: đen từ than lá tre, vàng từ hoa hòe, đỏ từ sỏi son, xanh từ gỉ đồng hoặc lá chàm; bản nét đen được in sau cùng. Ngày 9/12/2025, UNESCO ghi danh Nghề làm tranh dân gian Đông Hồ vào Danh sách di sản văn hóa phi vật thể cần bảo vệ khẩn cấp.',
  },
  task_cho_chu: {
    headline: 'Ông đồ và tục xin chữ ngày Tết',
    text: 'Đầu năm, người ta xin ông đồ một chữ như Tâm, Phúc, Nhẫn… để treo trong nhà lấy may. Hình ảnh ông đồ già ngồi viết chữ bên phố được Vũ Đình Liên khắc họa trong bài thơ “Ông đồ” (1936): “Mỗi năm hoa đào nở / Lại thấy ông đồ già”. Ngày nay, phố ông đồ vẫn họp mỗi dịp Tết ở Hà Nội.',
  },
  task_cay_neu: {
    // plo.vn, vietnamnet.vn (thượng nêu / hạ nêu)
    headline: 'Cây nêu và vòng vôi trừ Quỷ',
    text: 'Theo tục xưa, cây nêu được dựng từ ngày 23 tháng Chạp và hạ vào mùng 7 tháng Giêng (lễ khai hạ). Ngọn nêu treo khánh đất nung, buộc lá dứa hoặc cành đa; dưới gốc rắc vôi bột vẽ hình cung tên. Tương truyền Phật đã dùng cây nêu đuổi Quỷ ra biển Đông, nên vòng vôi nhắc Quỷ không được bén mảng vào đất của người.',
  },
  task_cau_doi: {
    // vnexpress.net/cao-thu-moi-thay-loi-trong-cau-nay-4834124
    headline: 'Câu đối đỏ — đối từng chữ, đối từng ý',
    text: 'Câu đối gồm hai vế dài bằng nhau, đối nhau từng chữ cả về nghĩa lẫn thanh điệu. Câu đối Tết quen thuộc nhất có lẽ là “Thịt mỡ, dưa hành, câu đối đỏ / Cây nêu, tràng pháo, bánh chưng xanh”. Những vế chữ Hán như “Phúc như Đông Hải trường lưu thủy / Thọ tỷ Nam Sơn bất lão tùng” vẫn được ông đồ viết tặng để chúc phúc, chúc thọ.',
  },
  task_ngu_qua: {
    // mia.vn (mâm ngũ quả Bắc / Nam)
    headline: 'Mâm ngũ quả — mỗi miền một kiểu',
    text: 'Mâm ngũ quả miền Bắc thường có nải chuối xanh đỡ phía dưới, bưởi hoặc phật thủ đặt ở giữa, xung quanh là các loại quả nhiều màu theo ngũ hành. Người miền Nam lại kiêng chuối (đọc gần “chúi”) và bày “cầu sung vừa đủ xài”: mãng cầu, sung, dừa, đu đủ, xoài.',
  },
  task_ca_tru: {
    // https://ich.unesco.org/en/USL/ca-tru-singing-00309
    headline: 'Ca trù — tiếng phách, đàn đáy và trống chầu',
    text: 'Một canh hát ca trù có ba người: đào nương vừa hát vừa gõ phách, kép đàn chơi đàn đáy và quan viên cầm chầu đánh trống chầu để khen. Năm 2009, UNESCO ghi danh Ca trù vào Danh sách di sản văn hóa phi vật thể cần bảo vệ khẩn cấp.',
  },
  task_roi_nuoc: {
    // dsvh.gov.vn (bia Sùng Thiện Diên Linh, 1121); tuoitre.vn (hồ sơ UNESCO, 1/2026)
    headline: 'Múa rối nước — sân khấu trên mặt ao',
    text: 'Tấm bia Sùng Thiện Diên Linh (năm 1121, thời Lý) ở chùa Long Đọi được coi là ghi chép sớm nhất về múa rối nước. Nghệ nhân đứng sau mành tre trong thủy đình, điều khiển con rối bằng sào và dây ngầm dưới nước. Nhà hát Múa rối Thăng Long bên Hồ Gươm thành lập năm 1969; đầu năm 2026, Việt Nam lập hồ sơ đề nghị UNESCO ghi danh múa rối nước.',
  },
};

/** Success line shown right after a task is solved. */
export const TASK_DONE: Record<TlTaskId, string> = {
  task_banh_chung: 'Bánh chưng đã gói vuông vức, lạt buộc chặt — bắc nồi thôi!',
  task_dong_ho: 'Bảng màu Đông Hồ đã đủ — tranh Tết sẵn sàng lên giấy điệp.',
  task_cho_chu: 'Nét chữ đã khô mực — đem treo cho cả nhà lấy may.',
  task_cay_neu: 'Cây nêu đã đứng thẳng, khánh đất kêu leng keng — Quỷ chớ lại gần!',
  task_cau_doi: 'Đôi câu đối đỏ đã treo ngay ngắn hai bên cửa.',
  task_ngu_qua: 'Mâm ngũ quả đã bày xong trên ban thờ đền Ngọc Sơn.',
  task_ca_tru: 'Tiếng phách đã ăn nhịp — quan viên gõ chầu khen hay!',
  task_roi_nuoc: 'Con rối đã bơi qua thủy đình, khán giả vỗ tay rầm rộ.',
};

export const FUN_FACTS = [
  '“Giao thừa” nghĩa là năm cũ giao lại, năm mới tiếp lấy — khoảnh khắc chuyển giao lúc nửa đêm ba mươi Tết.',
  'Năm 1010, Lý Thái Tổ ban Chiếu dời đô từ Hoa Lư về thành Đại La và đổi tên thành Thăng Long.',
  'Khu trung tâm Hoàng thành Thăng Long – Hà Nội được UNESCO công nhận là Di sản Văn hoá Thế giới năm 2010.',
  'Cầu Thê Húc dẫn vào đền Ngọc Sơn và Tháp Bút bên Hồ Gươm đều được dựng năm 1865 thời Tự Đức.',
  'Tên Hồ Hoàn Kiếm (hồ Trả Gươm) gắn với truyền thuyết Lê Lợi trả gươm thần cho Rùa Vàng.',
  'Từ ngày 1/1/1995, theo Chỉ thị 406/TTg, Việt Nam cấm đốt pháo nổ; đêm giao thừa người Hà Nội ra Bờ Hồ xem pháo hoa.',
];

// ------------------------------------------------------------------ data pools
const BANH_CHUNG_TRAY = [
  { kind: 'la_dong', name: 'Lá dong' },
  { kind: 'gao', name: 'Gạo nếp' },
  { kind: 'dau_xanh', name: 'Đậu xanh' },
  { kind: 'thit', name: 'Thịt lợn' },
  { kind: 'banh_phong', name: 'Bánh phồng tôm' },
  { kind: 'mut', name: 'Mứt dừa' },
];
/** canonical stack bottom -> top: leaf, rice, filling (đậu + thịt, any order), rice */
const BANH_CHUNG_LAYERS = ['la_dong', 'gao', 'dau_xanh', 'thit', 'dau_xanh', 'gao'];
const BANH_CHUNG_TIES = 4;

const DONG_HO_COLORS = [
  { kind: 'den', name: 'Đen', hex: '#2b2522', source: 'than_la_tre' },
  { kind: 'vang', name: 'Vàng', hex: '#e2b53c', source: 'hoa_hoe' },
  { kind: 'do', name: 'Đỏ', hex: '#b5432f', source: 'soi_son' },
  { kind: 'xanh', name: 'Xanh', hex: '#3f7a6a', source: 'gi_dong' },
  { kind: 'trang', name: 'Trắng điệp', hex: '#efe7d6', source: 'vo_diep' },
];
/** each source shows a swatch of the colour it gives (visual cue) */
const DONG_HO_SOURCES: Record<string, { name: string; hex: string }> = {
  than_la_tre: { name: 'Than lá tre', hex: '#2b2522' },
  hoa_hoe: { name: 'Hoa hòe', hex: '#e2b53c' },
  soi_son: { name: 'Sỏi son', hex: '#b5432f' },
  gi_dong: { name: 'Gỉ đồng / lá chàm', hex: '#3f7a6a' },
  vo_diep: { name: 'Vỏ sò điệp', hex: '#efe7d6' },
};
const DONG_HO_PAINTINGS = ['Đám cưới chuột', 'Lợn nái', 'Gà đàn', 'Vinh hoa', 'Hái dừa', 'Chăn trâu thổi sáo'];

/** Stylised brush strokes in a 0..1 box (x right, y down), in writing order. */
const GLYPHS: { glyph: string; meaning: string; strokes: Pt[][] }[] = [
  {
    glyph: '人',
    meaning: 'Nhân — người',
    strokes: [
      [{ x: 0.52, y: 0.1 }, { x: 0.46, y: 0.45 }, { x: 0.15, y: 0.88 }],
      [{ x: 0.5, y: 0.42 }, { x: 0.7, y: 0.66 }, { x: 0.88, y: 0.88 }],
    ],
  },
  {
    glyph: '大',
    meaning: 'Đại — lớn (đại cát)',
    strokes: [
      [{ x: 0.15, y: 0.38 }, { x: 0.85, y: 0.38 }],
      [{ x: 0.5, y: 0.1 }, { x: 0.48, y: 0.45 }, { x: 0.15, y: 0.9 }],
      [{ x: 0.52, y: 0.45 }, { x: 0.7, y: 0.68 }, { x: 0.88, y: 0.9 }],
    ],
  },
  {
    glyph: '天',
    meaning: 'Thiên — trời',
    strokes: [
      [{ x: 0.25, y: 0.2 }, { x: 0.75, y: 0.2 }],
      [{ x: 0.12, y: 0.45 }, { x: 0.88, y: 0.45 }],
      [{ x: 0.5, y: 0.08 }, { x: 0.48, y: 0.5 }, { x: 0.15, y: 0.9 }],
      [{ x: 0.52, y: 0.5 }, { x: 0.7, y: 0.7 }, { x: 0.88, y: 0.9 }],
    ],
  },
  {
    glyph: '文',
    meaning: 'Văn — văn chương',
    strokes: [
      [{ x: 0.47, y: 0.08 }, { x: 0.54, y: 0.2 }],
      [{ x: 0.15, y: 0.3 }, { x: 0.85, y: 0.3 }],
      [{ x: 0.72, y: 0.36 }, { x: 0.45, y: 0.66 }, { x: 0.15, y: 0.9 }],
      [{ x: 0.3, y: 0.36 }, { x: 0.58, y: 0.66 }, { x: 0.88, y: 0.9 }],
    ],
  },
  {
    glyph: '心',
    meaning: 'Tâm — tấm lòng',
    strokes: [
      [{ x: 0.13, y: 0.5 }, { x: 0.2, y: 0.64 }],
      [{ x: 0.33, y: 0.28 }, { x: 0.35, y: 0.8 }, { x: 0.72, y: 0.84 }, { x: 0.8, y: 0.68 }],
      [{ x: 0.48, y: 0.22 }, { x: 0.56, y: 0.38 }],
      [{ x: 0.74, y: 0.34 }, { x: 0.86, y: 0.5 }],
    ],
  },
];

const NEU_GOOD = [
  { kind: 'khanh', name: 'Khánh đất nung', desc: 'Kêu leng keng khi gió thổi, xua Quỷ' },
  { kind: 'la_dua', name: 'Cành lá dứa / cành đa', desc: 'Lá gai nhọn — Quỷ sợ' },
  { kind: 'voi', name: 'Vôi bột vẽ cung tên', desc: 'Rắc quanh gốc nêu' },
];
/** only obviously modern items, so the right picks stand out */
const NEU_DECOYS = [
  { kind: 'den_nhay', name: 'Dây đèn nháy', desc: 'Đồ trang trí điện thời nay' },
  { kind: 'qua_chau', name: 'Quả châu Giáng sinh', desc: 'Treo cây thông Noel' },
  { kind: 'bong_bay', name: 'Bóng bay', desc: 'Đồ chơi bơm hơi' },
];

/** [first line, second line] — wording checked against vnexpress / voh / fptshop. */
const COUPLETS: { top: string; bottom: string; hint: string }[] = [
  { top: 'Thịt mỡ, dưa hành, câu đối đỏ', bottom: 'Cây nêu, tràng pháo, bánh chưng xanh', hint: 'Đỏ ↔ Xanh' },
  { top: 'Phúc như Đông Hải trường lưu thủy', bottom: 'Thọ tỷ Nam Sơn bất lão tùng', hint: 'Phúc ↔ Thọ · Đông ↔ Nam' },
  { top: 'Thiên tăng tuế nguyệt nhân tăng thọ', bottom: 'Xuân mãn càn khôn phúc mãn đường', hint: 'Thiên ↔ Xuân · thọ ↔ đường' },
];

const FRUITS: Record<string, string> = {
  chuoi: 'Nải chuối xanh',
  buoi: 'Bưởi',
  phat_thu: 'Phật thủ',
  quat: 'Quất',
  hong: 'Hồng đỏ',
  le: 'Lê',
  tao: 'Táo',
  mang_cau: 'Mãng cầu',
  sung: 'Sung',
  dua: 'Dừa',
  du_du: 'Đu đủ',
  xoai: 'Xoài',
};
const NAM_PHRASE = ['mang_cau', 'sung', 'dua', 'du_du', 'xoai'];
const BAC_RING = ['quat', 'hong', 'le', 'tao'];

const PUPPETS = ['Chú Tễu', 'Rồng', 'Phượng', 'Ông lão câu cá'];

// ------------------------------------------------------------------ helpers
const near = (a: Pt, b: Pt, r: number) => Math.hypot(a.x - b.x, a.y - b.y) <= r;
const isPt = (q: unknown): q is Pt => !!q && typeof (q as Pt).x === 'number' && typeof (q as Pt).y === 'number' && Number.isFinite((q as Pt).x) && Number.isFinite((q as Pt).y);

/** distance from point to segment ab */
function segDist(p: Pt, a: Pt, b: Pt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1e-9;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
const polyDist = (p: Pt, line: Pt[]) => (line.length === 1 ? Math.hypot(p.x - line[0].x, p.y - line[0].y) : Math.min(...line.slice(1).map((b, i) => segDist(p, line[i], b))));
/** resample a polyline into n evenly spaced points */
function resample(line: Pt[], n: number): Pt[] {
  const segs = line.slice(1).map((b, i) => Math.hypot(b.x - line[i].x, b.y - line[i].y));
  const total = segs.reduce((s, v) => s + v, 0) || 1e-9;
  const out: Pt[] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * k) / (n - 1);
    let i = 0;
    while (i < segs.length - 1 && d > segs[i]) d -= segs[i++];
    const f = segs[i] ? Math.min(1, d / segs[i]) : 0;
    out.push({ x: line[i].x + (line[i + 1].x - line[i].x) * f, y: line[i].y + (line[i + 1].y - line[i].y) * f });
  }
  return out;
}
/** A traced stroke matches when it starts/ends at the right ends and hugs the target both ways. */
function strokeOk(user: unknown, target: Pt[]): boolean {
  if (!Array.isArray(user) || user.length < 2 || user.length > 400 || !user.every(isPt)) return false;
  const u = user as Pt[];
  // forgiving (easy mode): a shaky finger on a phone still passes, a different glyph does not
  if (!near(u[0], target[0], 0.2) || !near(u[u.length - 1], target[target.length - 1], 0.2)) return false;
  return resample(target, 12).every((q) => polyDist(q, u) <= 0.15) && u.every((q) => polyDist(q, target) <= 0.21);
}

/** Build a fresh mini-game for this map, or null if `taskId` belongs to another map. */
function buildTask(taskId: TaskId): (Built & { fact: Fact; done: string }) | null {
  if (!(TL_TASK_IDS as readonly TaskId[]).includes(taskId)) return null;
  const id = taskId as TlTaskId;
  return { ...build(id), fact: TASK_FACTS[id], done: TASK_DONE[id] };
}

function build(taskId: TlTaskId): Built {
  switch (taskId) {
    case 'task_banh_chung':
      return {
        data: {
          taskId,
          prompt: 'Nồi bánh chưng phải bắc bếp trước nửa đêm. Xếp từng lớp vào khuôn rồi buộc lạt cho chặt.',
          tray: shuffle(BANH_CHUNG_TRAY),
          slots: BANH_CHUNG_LAYERS.length,
          ties: BANH_CHUNG_TIES,
        },
        expected: { layers: BANH_CHUNG_LAYERS, ties: BANH_CHUNG_TIES },
        minMs: 3000,
      };
    case 'task_dong_ho': {
      const colors = DONG_HO_COLORS.map((c) => ({ ...c, id: rid() }));
      const sources = shuffle(Object.entries(DONG_HO_SOURCES).map(([kind, s]) => ({ kind, ...s, id: rid() })));
      const byKind = Object.fromEntries(sources.map((s) => [s.kind, s.id]));
      return {
        data: {
          taskId,
          prompt: 'Quỷ đã đổ lẫn các chum màu ở phố Hàng Trống. Tìm lại nguồn gốc tự nhiên của từng màu tranh Đông Hồ.',
          painting: pick(DONG_HO_PAINTINGS),
          colors: shuffle(colors).map(({ id, name, hex }) => ({ id, name, hex })),
          sources: sources.map(({ id, name, hex }) => ({ id, name, hex })),
        },
        expected: Object.fromEntries(colors.map((c) => [c.id, byKind[c.source]])),
        minMs: 2500,
      };
    }
    case 'task_cho_chu': {
      const g = pick(GLYPHS);
      return {
        data: { taskId, prompt: 'Một cụ già xin chữ đầu năm. Tô theo nét bút của ông đồ, đúng thứ tự từng nét.', ...g },
        expected: g.strokes,
        minMs: 400 * g.strokes.length + 800,
      };
    }
    case 'task_cay_neu': {
      const tray = shuffle([...NEU_GOOD, ...sample(NEU_DECOYS, 2)].map((o) => ({ ...o, id: rid() })));
      const good = new Set(NEU_GOOD.map((o) => o.kind));
      const maxTilt = 12;
      return {
        data: {
          taskId,
          prompt: 'Quỷ đã quật đổ cây nêu ở Bếp Tết. Treo đúng đồ lên ngọn nêu, rắc vôi, rồi dựng cây thẳng đứng.',
          tray: tray.map(({ id, name, desc }) => ({ id, name, desc })),
          need: NEU_GOOD.length,
          maxTilt,
        },
        expected: { ids: tray.filter((o) => good.has(o.kind)).map((o) => o.id).sort(), maxTilt },
        minMs: 3000,
      };
    }
    case 'task_cau_doi': {
      const pairs = sample(COUPLETS, 2).map((c) => ({ top: { id: rid(), text: c.top, hint: c.hint }, bottom: { id: rid(), text: c.bottom } }));
      return {
        data: {
          taskId,
          prompt: 'Gió đêm ba mươi thổi tung những vế câu đối trên bàn ông đồ. Ghép mỗi vế trên với vế dưới đối với nó.',
          tops: pairs.map((p) => p.top),
          bottoms: shuffle(pairs.map((p) => p.bottom)),
        },
        expected: Object.fromEntries(pairs.map((p) => [p.top.id, p.bottom.id])),
        minMs: 2500,
      };
    }
    case 'task_ngu_qua': {
      const region: 'bac' | 'nam' = Math.random() < 0.5 ? 'bac' : 'nam';
      const kinds =
        region === 'nam'
          ? [...NAM_PHRASE, ...sample(['chuoi', 'buoi', 'quat', 'le'], 3)]
          : ['chuoi', pick(['buoi', 'phat_thu']), ...BAC_RING, ...sample(['mang_cau', 'du_du', 'xoai'], 1)];
      return {
        data: {
          taskId,
          prompt:
            region === 'nam'
              ? 'Một gia đình miền Nam ghé đền Ngọc Sơn. Bày năm thứ quả theo câu “cầu … vừa đủ xài”, từ trái sang phải.'
              : 'Bày mâm ngũ quả kiểu Hà Nội lên ban thờ: quả đỡ bên dưới, quả đặt chính giữa, ba quả xung quanh.',
          region,
          fruits: shuffle(kinds).map((k) => ({ kind: k, name: FRUITS[k] })),
          slots: 5,
        },
        expected: region === 'nam' ? { region, order: NAM_PHRASE } : { region, offered: kinds },
        minMs: 2500,
      };
    }
    case 'task_ca_tru': {
      // a short, slow phrase of phách strokes with at most one doubled (half-beat) stroke;
      // the client shows every beat as a lit dot, so it is playable with the sound off
      const beat = 700;
      const tolerance = 250;
      const doubled = Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 4) : -1;
      const beats: number[] = [];
      for (let i = 0; i < 6; i++) {
        beats.push(i * beat);
        if (i === doubled) beats.push(i * beat + beat / 2);
      }
      return {
        data: { taskId, prompt: 'Đào nương lỡ đánh rơi cỗ phách. Xem (và nghe) một lượt rồi gõ lại theo các chấm sáng để kép đàn đáy theo kịp.', beats, tolerance },
        expected: { beats, tolerance },
        minMs: beats[beats.length - 1] + 1500,
      };
    }
    case 'task_roi_nuoc': {
      const marks: Pt[] = [];
      while (marks.length < 3) {
        const m = { x: 0.15 + Math.random() * 0.7, y: 0.2 + Math.random() * 0.6 };
        if (marks.every((o) => !near(o, m, 0.25)) && !near(m, { x: 0.1, y: 0.5 }, 0.25)) marks.push(m);
      }
      return {
        data: {
          taskId,
          prompt: 'Buổi diễn đêm giao thừa sắp bắt đầu. Điều con rối lướt qua các vòng sóng theo đúng thứ tự.',
          puppet: pick(PUPPETS),
          start: { x: 0.1, y: 0.5 },
          marks,
          radius: 0.1,
          speed: 0.6,
        },
        expected: { start: { x: 0.1, y: 0.5 }, marks, radius: 0.1, speed: 0.6 },
        minMs: 2000,
      };
    }
  }
}

/** Server-side check of a submitted answer. */
export function verifyTask(p: Pending, answer: unknown): boolean {
  const a = answer as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (Date.now() - p.openedAt < (p.minMs ?? 0)) return false;
  switch (p.taskId) {
    case 'task_banh_chung': {
      const exp = p.expected as { layers: string[]; ties: number };
      const l = a?.layers;
      if (!Array.isArray(l) || l.length !== exp.layers.length || Number(a?.ties) !== exp.ties) return false;
      // leaf, rice, then the filling (any order of the same đậu/thịt pieces), then rice on top
      const mid = l.slice(2, -1).map(String).sort().join();
      return l[0] === 'la_dong' && l[1] === 'gao' && l[l.length - 1] === 'gao' && mid === exp.layers.slice(2, -1).sort().join();
    }
    case 'task_dong_ho':
    case 'task_cau_doi': {
      const exp = p.expected as Record<string, string>;
      if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
      const used = Object.values(a as Record<string, unknown>);
      return new Set(used).size === used.length && Object.keys(exp).every((k) => a[k] === exp[k]);
    }
    case 'task_cho_chu': {
      const exp = p.expected as Pt[][];
      return Array.isArray(a) && a.length === exp.length && exp.every((s, i) => strokeOk(a[i], s));
    }
    case 'task_cay_neu': {
      const exp = p.expected as { ids: string[]; maxTilt: number };
      const o = a?.ornaments;
      return Array.isArray(o) && [...o].map(String).sort().join() === exp.ids.join() && typeof a?.tilt === 'number' && Math.abs(a.tilt) <= exp.maxTilt;
    }
    case 'task_ngu_qua': {
      const exp = p.expected as { region: 'nam'; order: string[] } | { region: 'bac'; offered: string[] };
      if (exp.region === 'nam') return Array.isArray(a) && a.join() === exp.order.join();
      if (!a || a.base !== 'chuoi' || !['buoi', 'phat_thu'].includes(a.center) || !exp.offered.includes(a.center)) return false;
      const ring = a.ring;
      return (
        Array.isArray(ring) &&
        ring.length === 3 &&
        new Set(ring).size === 3 &&
        ring.every((k: unknown) => typeof k === 'string' && exp.offered.includes(k) && !['chuoi', 'buoi', 'phat_thu'].includes(k))
      );
    }
    case 'task_ca_tru': {
      const exp = p.expected as { beats: number[]; tolerance: number };
      if (!Array.isArray(a) || a.length !== exp.beats.length || !a.every((v) => typeof v === 'number' && Number.isFinite(v))) return false;
      // only relative timing matters: align on the first tap
      const t0 = a[0] - exp.beats[0];
      return exp.beats.every((b, i) => Math.abs(a[i] - t0 - b) <= exp.tolerance);
    }
    case 'task_roi_nuoc': {
      const exp = p.expected as { start: Pt; marks: Pt[]; radius: number; speed: number };
      if (!Array.isArray(a) || a.length < 2 || a.length > 2000) return false;
      if (!a.every((q: { t?: unknown }) => typeof q?.t === 'number' && Number.isFinite(q.t) && isPt(q))) return false;
      const path = a as (Pt & { t: number })[];
      if (!near(path[0], exp.start, exp.radius * 2)) return false;
      // no teleporting: every step within the puppet's top speed (+30% for jitter)
      for (let i = 1; i < path.length; i++) {
        const dt = (path[i].t - path[i - 1].t) / 1000;
        if (dt < 0) return false;
        const d = Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
        if (d > exp.speed * 1.3 * dt + 0.01) return false;
      }
      // marks visited in order
      let m = 0;
      for (const q of path) if (m < exp.marks.length && near(q, exp.marks[m], exp.radius)) m++;
      return m === exp.marks.length;
    }
    default:
      return false;
  }
}

export const TL_CONTENT: MapContent = { funFacts: FUN_FACTS, buildTask, verifyTask };
