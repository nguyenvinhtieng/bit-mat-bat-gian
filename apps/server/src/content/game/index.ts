/**
 * HOST-ONLY content for map `sai-gon` — "Hụi Sài Gòn · Phiên Hụi Chui Hẻm 42".
 * Everyday Saigon comedy: every task is a driver's chore that tops up the hụi fund before daybreak.
 * Answers / checks never leave the server: buildTask() returns the client payload + what to verify.
 * Hụi facts checked (Oct 2026) against Nghị định 19/2019/NĐ-CP as reported by vksndtc.gov.vn and luatvietnam.vn.
 */
import { GAME_TASK_IDS, type Pt, type GameTaskId, type GameTurn, type TaskId } from '@hidden-truth/shared';

import { pick, rid, sample, shuffle, type Built, type Fact, type MapContent, type Pending } from '../common/util';

/** Card shown after each task ("Bạn có biết?") — warm, funny, everyday. */
export const TASK_FACTS: Record<GameTaskId, Fact> = {
  task_chi_duong: {
    headline: 'Hẻm trong hẻm — số nhà có “xẹt”',
    text: 'Ở Sài Gòn, địa chỉ kiểu “42/7/3” nghĩa là nhà số 3 trong hẻm 7, mà hẻm 7 lại nằm trong hẻm 42. Hẻm xương cá chia nhánh như vậy nên khách quen hay chỉ đường bằng cột điện, tiệm tạp hoá hay “chỗ bà bán chè” — tài xế mới thì cứ vừa chạy vừa hỏi.',
  },
  task_com_tam: {
    headline: 'Cơm tấm — từ hạt gạo vỡ thành đặc sản',
    text: 'Tấm là những hạt gạo bị vỡ khi xay xát, ngày xưa rẻ hơn gạo nguyên nên hay vào bữa cơm nhà nghèo. Giờ thì dĩa cơm tấm sườn nướng, bì, chả, rưới mỡ hành, thêm đồ chua và chén nước mắm đã thành món “quốc dân” của Sài Gòn, bán từ sáng sớm tới khuya.',
  },
  task_tieng_rao: {
    headline: 'Tiếng rao đêm và hủ tiếu gõ',
    text: 'Đêm Sài Gòn có cả một “dàn nhạc” tiếng rao: bánh mì nóng, bánh tiêu bánh bò, ve chai đồng nát… Hủ tiếu gõ thì không cần rao — người bán gõ hai thanh tre “lóc cóc” để báo hiệu, đi nhận order từng nhà trong hẻm rồi bưng tô hủ tiếu tới tận cửa.',
  },
  task_ca_phe_phin: {
    headline: 'Cà phê phin, cà phê cóc',
    text: 'Phin là cái lọc nhỏ đặt trên miệng ly: nước sôi rỉ qua bột cà phê từng giọt, ai vội cũng phải ngồi chờ. Cà phê sữa đá pha với sữa đặc rồi đổ lên ly đá. Ở Chợ Lớn còn có cà phê vợt, lọc qua túi vải. Còn “cà phê cóc” là quán vỉa hè ghế nhựa thấp — ngồi chồm hổm mà tám chuyện cả buổi.',
  },
  task_do_xang: {
    headline: 'Đời tài xế: đổ xăng cho chẵn',
    text: 'Dân chạy xe ôm hay đổ xăng theo số tiền chẵn — 50 nghìn, 100 nghìn — cho dễ tính sổ cuối ngày. Mấy chai xăng lẻ bày ven đường là “cứu tinh” cho ai lỡ hết xăng giữa đêm, nhưng xăng dễ cháy lắm: đổ ở cây xăng vẫn là an toàn nhất.',
  },
  task_va_vo: {
    headline: 'Tiệm vá xe đầu hẻm',
    text: 'Thợ vá xe tháo ruột ra, bơm căng rồi nhúng từng khúc vào thau nước: chỗ nào sủi bọt là chỗ thủng. Chà nhám, quét keo, dán miếng vá là xe chạy tiếp. Tiệm vá thường chỉ là một cái thau, cái bơm và vài cái lốp treo dưới gốc cây — vậy mà cứu bao nhiêu cuốc xe giữa đường.',
  },
  task_so_hui: {
    headline: 'Hụi, họ — có luật hẳn hoi',
    text: 'Hụi (miền Bắc gọi là họ) là cách góp vốn xoay vòng dân gian: mỗi kỳ cả dây cùng góp, lần lượt từng người “hốt”. Từ tháng 4/2019, Nghị định 19/2019/NĐ-CP quy định về họ, hụi, biêu, phường: phải lập thoả thuận rõ ràng, chủ hụi phải báo UBND cấp xã khi dây hụi từ 100 triệu đồng trở lên. Chơi với người quen, có sổ sách — đừng chơi hụi chui!',
  },
  task_dem_tien: {
    headline: 'Tiền polymer và xấp bó thun',
    text: 'Việt Nam bắt đầu phát hành tiền polymer từ năm 2003; nay các tờ 10 nghìn tới 500 nghìn đều là polymer, mỗi mệnh giá một màu nên đếm nhanh nhìn màu là biết. Dân buôn bán quen xếp tiền cùng mệnh giá thành xấp rồi quấn dây thun — gọi vui là “tiền bó thun”.',
  },
  task_khui_hui: {
    headline: 'Hụi bỏ thăm — ai cần tiền thì “bỏ” cao',
    text: 'Trong hụi có lãi, mỗi kỳ ai cần tiền gấp sẽ bỏ thăm số lãi mình chịu trả; thăm cao nhất được hốt kỳ đó. Nghị định 19/2019/NĐ-CP giới hạn lãi không quá 20%/năm — lãi “cắt cổ” vượt trần là trái luật, chơi hụi phải tỉnh táo!',
  },
  task_xep_xe: {
    headline: 'Bãi giữ xe chung cư cũ',
    text: 'Chung cư cũ ở Sài Gòn thường có bãi giữ xe dưới trệt: chú bảo vệ xếp xe sát rạt từng chiếc, dư một tấc là nhét thêm được một xe. Muốn lấy xe trong cùng thì… chờ chú dời giùm cả hàng.',
  },
};

/** Success line shown right after a task is solved. */
export const TASK_DONE: Record<GameTaskId, string> = {
  task_chi_duong: 'Tới nơi! Khách khen “em chạy rành hẻm ghê” — năm sao, +50 triệu quỹ hụi!',
  task_com_tam: 'Dĩa cơm tấm đúng ý khách, không thiếu cọng mỡ hành nào.',
  task_tieng_rao: 'Canh chừng xong — hẻm vẫn yên, chỉ có xe bánh mì đi ngang.',
  task_ca_phe_phin: 'Ly cà phê sữa đá chuẩn quán cóc — cả bàn hụi gật gù.',
  task_do_xang: 'Tròn 50 nghìn, không dư một đồng!',
  task_va_vo: 'Ruột xe hết sủi bọt — vá xong, chạy tiếp cuốc khuya.',
  task_so_hui: 'Sổ hụi ghi rõ ràng từng người — khỏi cãi nhau kỳ sau.',
  task_dem_tien: 'Từng xấp bó thun gọn gàng, đếm lại vẫn khớp.',
  task_khui_hui: 'Khui đúng thăm cao nhất — cả bàn vỗ tay, người hốt cười tít mắt.',
  task_xep_xe: 'Bãi xe xếp khít rịt — chú bảo vệ phải khen.',
};

export const FUN_FACTS = [
  'Cơm tấm nấu từ tấm — những hạt gạo vỡ khi xay xát, xưa là gạo rẻ của nhà nghèo.',
  'Hủ tiếu gõ được đặt tên theo tiếng gõ hai thanh tre “lóc cóc” mà người bán dùng để báo hiệu.',
  'Chợ Lớn có cà phê vợt: cà phê lọc qua túi vải thay vì phin.',
  'Bình trà đá miễn phí đặt trước cửa nhà là nét tử tế quen thuộc của Sài Gòn — ai khát cứ rót.',
  'Địa chỉ “42/7/3” ở Sài Gòn nghĩa là hẻm trong hẻm — dấu “/” chỉ một nhánh hẻm nhỏ hơn.',
  'Xe ôm là nghề có từ lâu trước khi có app — tài xế xưa đậu xe đầu hẻm, đội nón chờ khách.',
  'Hụi, họ, biêu, phường được quy định tại Nghị định 19/2019/NĐ-CP — chơi hụi phải có thoả thuận rõ ràng và lãi không quá 20%/năm.',
];

// ------------------------------------------------------------------ data pools
const TURN_NAME: Record<GameTurn, string> = { trai: 'trái', phai: 'phải', thang: 'chạy thẳng' };
const PASSENGERS = ['Cô Ba bán vé số', 'Chú Bảy đi nhậu về', 'Chị Hai nhân viên văn phòng', 'Anh Tư mới lên Sài Gòn'];

const COM_MAINS = [
  { kind: 'suon', name: 'Sườn nướng', short: 'sườn' },
  { kind: 'bi', name: 'Bì', short: 'bì' },
  { kind: 'cha', name: 'Chả trứng', short: 'chả' },
  { kind: 'trung', name: 'Trứng ốp la', short: 'trứng' },
  { kind: 'lap_xuong', name: 'Lạp xưởng', short: 'lạp xưởng' },
];
const COM_EXTRAS = [
  { kind: 'mo_hanh', name: 'Mỡ hành' },
  { kind: 'do_chua', name: 'Đồ chua' },
  { kind: 'nuoc_mam', name: 'Nước mắm' },
];
const COM_CUSTOMERS = ['Chú Sáu xe ôm', 'Cô Năm tạp hoá', 'Bé Na học thêm về', 'Anh Hai bảo vệ'];

const STREET_CALLS = [
  { kind: 'banh_mi', short: 'Bánh mì', text: 'Bánh mì nóng giòn đây!' },
  { kind: 've_chai', short: 'Ve chai', text: 'Ai ve chai, đồng nát, sắt vụn bán hông?' },
  { kind: 'hu_tieu', short: 'Hủ tiếu gõ', text: 'Lóc cóc… lóc cóc… hủ tiếu gõ đây!' },
  { kind: 'che', short: 'Chè', text: 'Chè đậu đỏ, bánh lọt, nước cốt dừa đây!' },
  { kind: 'bo_bia', short: 'Bò bía', text: 'Bò bía ngọt đây, bò bía!' },
  { kind: 'banh_tieu', short: 'Bánh tiêu', text: 'Bánh tiêu, bánh bò, bánh cam đây!' },
];

const HUI_NAMES = ['Tư Râu', 'Bảy Lùn', 'Út Mập', 'Hai Lúa', 'Năm Đen', 'Sáu Cận', 'Chín Rảnh', 'Ba Hên'];
const HUI_AMOUNTS = ['500 nghìn', '1 triệu', '1 triệu rưỡi', '2 triệu', '2 triệu rưỡi', '3 triệu'];

const NOTE_VALUES = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];

// ------------------------------------------------------------------ helpers
const isObj = (a: unknown): a is Record<string, unknown> => !!a && typeof a === 'object' && !Array.isArray(a);
const sameSet = (a: unknown, b: readonly string[]) =>
  Array.isArray(a) && a.length === b.length && new Set(a).size === a.length && a.every((k) => typeof k === 'string' && b.includes(k));

/** "650.000đ" / "650 nghìn" / "0,65 triệu" — the same money, written three ways (all in thousands). */
function moneyText(k: number, style: number): string {
  if (style === 0) return `${k.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}.000đ`;
  if (style === 1) return `${k} nghìn`;
  return `${(k / 1000).toString().replace('.', ',')} triệu`;
}

/** Random bike packing on a w×h lot: the generated layout proves the puzzle is solvable. */
function packLot(w: number, h: number, nBlocked = 2) {
  const used: boolean[] = Array(w * h).fill(false);
  const bikes: { len: number; x: number; y: number; vertical: boolean }[] = [];
  const fits = (x: number, y: number, len: number, v: boolean) => {
    for (let i = 0; i < len; i++) {
      const cx = v ? x : x + i;
      const cy = v ? y + i : y;
      if (cx >= w || cy >= h || used[cy * w + cx]) return false;
    }
    return true;
  };
  for (const c of shuffle([...Array(w * h).keys()])) {
    if (used[c]) continue;
    const x = c % w;
    const y = Math.floor(c / w);
    const len = bikes.length === 0 ? 3 : 2; // one long ba gác, the rest scooters
    for (const v of shuffle([true, false])) {
      if (!fits(x, y, len, v)) continue;
      for (let i = 0; i < len; i++) used[(v ? y + i : y) * w + (v ? x : x + i)] = true;
      bikes.push({ len, x, y, vertical: v });
      break;
    }
  }
  const free = [...Array(w * h).keys()].filter((c) => !used[c]);
  const blocked: Pt[] = free.slice(0, nBlocked).map((c) => ({ x: c % w, y: Math.floor(c / w) }));
  return { bikes, blocked };
}

/** Build a fresh mini-game for this map, or null if `taskId` belongs to another map. */
function buildTask(taskId: TaskId): (Built & { fact: Fact; done: string }) | null {
  if (!(GAME_TASK_IDS as readonly TaskId[]).includes(taskId)) return null;
  const id = taskId as GameTaskId;
  return { ...build(id), fact: TASK_FACTS[id], done: TASK_DONE[id] };
}

function build(taskId: GameTaskId): Built {
  switch (taskId) {
    case 'task_chi_duong': {
      const turns: GameTurn[] = ['trai', 'phai', 'thang'];
      const steps = Array.from({ length: 3 }, () => {
        const dir = pick(turns);
        const other = pick(turns.filter((d) => d !== dir));
        const style = Math.random();
        const say =
          style < 0.35
            ? dir === 'thang'
              ? 'Cứ chạy thẳng nha em.'
              : `Tới ngã ba quẹo ${TURN_NAME[dir]}.`
            : style < 0.7 || dir === 'thang'
              ? `Quẹo ${TURN_NAME[other]}… à không, ${dir === 'thang' ? 'chạy thẳng' : TURN_NAME[dir]}!`
              : `Chạy thẳng… ủa lố rồi! Quay lại quẹo ${TURN_NAME[dir]}.`;
        return { id: rid(), say: say.replace('Quẹo chạy thẳng', 'Chạy thẳng'), dir };
      });
      return {
        data: {
          taskId,
          prompt: 'Khách chỉ đường kiểu Sài Gòn — nói xong là đổi ý. Nghe hết câu rồi chọn hướng khách thật sự muốn.',
          passenger: pick(PASSENGERS),
          steps: steps.map(({ id, say }) => ({ id, say })),
        },
        expected: steps.map((s) => s.dir),
        minMs: 2500,
      };
    }
    case 'task_com_tam': {
      const mains = sample(COM_MAINS, 1 + Math.floor(Math.random() * 2));
      const extras = COM_EXTRAS.map((e) => ({ ...e, want: Math.random() < 0.5 }));
      const memoMs = 7000;
      return {
        data: {
          taskId,
          prompt: 'Nhớ kỹ order của khách — tờ giấy sẽ bị gió thổi bay! Rồi gắp đúng những món khách muốn.',
          customer: pick(COM_CUSTOMERS),
          order: [`Một dĩa ${mains.map((m) => m.short).join(' ')}`, ...extras.map((e) => `${e.want ? 'Thêm' : 'Bỏ'} ${e.name.toLowerCase()}`)],
          memoMs,
          // how many items to pick: the plate is served as soon as it holds this many
          want: mains.length + extras.filter((e) => e.want).length,
          tray: shuffle([...COM_MAINS, ...COM_EXTRAS].map(({ kind, name }) => ({ kind, name }))),
        },
        expected: [...mains.map((m) => m.kind), ...extras.filter((e) => e.want).map((e) => e.kind)],
        minMs: memoMs + 1500,
      };
    }
    case 'task_tieng_rao': {
      const [s1, s2, x1, x2] = shuffle(STREET_CALLS);
      const means: Record<string, 'safe' | 'stranger'> = { [s1.kind]: 'safe', [s2.kind]: 'safe', [x1.kind]: 'stranger', [x2.kind]: 'stranger' };
      const seq = shuffle([s1, x1, pick([s1, s2]), pick([x1, x2]), pick([s1, s2, x1, x2])]).map((c) => ({ ...c, id: rid() }));
      const callMs = 4500;
      return {
        data: {
          taskId,
          prompt: 'Ám hiệu tối nay đã dặn kỹ. Nghe từng tiếng rao trong hẻm, báo cho cả hội: an toàn hay có người lạ.',
          legend: shuffle([s1, s2, x1, x2]).map((c) => ({ text: c.short, means: means[c.kind] })),
          calls: seq.map(({ id, text }) => ({ id, text })),
          callMs,
        },
        expected: Object.fromEntries(seq.map((c) => [c.id, means[c.kind]])),
        minMs: 2500,
      };
    }
    case 'task_ca_phe_phin': {
      const drips = 3 + Math.floor(Math.random() * 2);
      const dripMs = 600;
      const line = Math.round((0.25 + Math.random() * 0.15) * 100) / 100;
      const tolerance = 0.12;
      return {
        data: { taskId, prompt: 'Chờ phin nhỏ giọt cho hết, rồi rót sữa đặc tới đúng vạch. Rót lố là ngọt khé cổ!', drips, dripMs, line, tolerance },
        expected: { line, tolerance },
        // the phin cannot be rushed: the drip time is the minimum solve time
        minMs: drips * dripMs,
      };
    }
    case 'task_do_xang': {
      const target = 50_000;
      const pricePerLiter = 20_000 + Math.floor(Math.random() * 51) * 100;
      const litersPerSec = 0.35;
      const tolerance = 2_500;
      return {
        data: { taskId, prompt: 'Khách dặn “đổ tròn 50 nghìn nha”. Giữ cò bơm rồi thả tay đúng lúc — dư một đồng cũng bị càm ràm.', target, pricePerLiter, litersPerSec, tolerance },
        expected: { target, pricePerLiter, litersPerSec, tolerance },
        minMs: 1500,
      };
    }
    case 'task_va_vo': {
      const sectors = 12;
      const leaks = [Math.floor(Math.random() * sectors)];
      return {
        data: { taskId, prompt: 'Xe khách bị đinh. Xoay ruột xe qua thau nước, chỗ nào sủi bọt thì vá!', sectors, leaks },
        expected: leaks,
        minMs: 3000,
      };
    }
    case 'task_so_hui': {
      const names = sample(HUI_NAMES, 3);
      const amounts = sample(HUI_AMOUNTS, 3).map((label) => ({ id: rid(), label }));
      const rows = names.map((name, i) => ({ id: rid(), name, amount: amounts[i] }));
      // one driver pays on behalf of another: the sender is not the one who owes
      const proxy = Math.random() < 0.3 ? Math.floor(Math.random() * rows.length) : -1;
      const messages = rows.map((r, i) => {
        if (i === proxy) {
          const payer = rows[(i + 1) % rows.length];
          return { from: payer.name, text: `Góp giùm ${r.name} ${r.amount.label} luôn nha, mai nó trả tui.` };
        }
        return { from: r.name, text: pick([`Kỳ này tui góp ${r.amount.label} nha mấy ông.`, `${r.amount.label} nè, chuyển khoản rồi đó.`, `Góp ${r.amount.label}, đừng hối nữa 😤`]) };
      });
      return {
        data: {
          taskId,
          prompt: 'Mọi người báo góp hụi qua Zalo nhóm. Đọc tin nhắn rồi ghi đúng số tiền vào sổ cho từng người.',
          rows: rows.map(({ id, name }) => ({ id, name })),
          messages: shuffle(messages),
          amounts: shuffle(amounts),
        },
        expected: Object.fromEntries(rows.map((r) => [r.id, r.amount.id])),
        minMs: 3000,
      };
    }
    case 'task_dem_tien': {
      const values = sample(NOTE_VALUES, 2).sort((a, b) => a - b);
      const notes = shuffle(values.flatMap((v) => Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => ({ id: rid(), value: v }))));
      const total = notes.reduce((s, n) => s + n.value, 0);
      const step = values[0];
      const choices = shuffle([total, total + step, total - step].filter((v) => v > 0));
      return {
        data: {
          taskId,
          prompt: 'Tiền góp hụi đổ đống trên chiếu. Xếp mỗi mệnh giá một xấp rồi bó thun, xong báo tổng cộng bao nhiêu.',
          notes,
          values,
          choices,
        },
        expected: { stacks: Object.fromEntries(notes.map((n) => [n.id, n.value])), total },
        minMs: 400 * notes.length,
      };
    }
    case 'task_khui_hui': {
      // close bids (in thousands), written in mixed ways so comparing takes a second look
      const base = 300 + Math.floor(Math.random() * 300);
      const bids = sample([0, 50, 100, 150, 200, 250], 4).map((d) => base + d);
      const names = sample(HUI_NAMES, 4);
      const envelopes = bids.map((k, i) => ({ id: rid(), name: names[i], bid: moneyText(k, i % 3), k }));
      const best = envelopes.reduce((a, b) => (b.k > a.k ? b : a));
      const limitMs = 25_000;
      return {
        data: {
          taskId,
          prompt: 'Tới giờ khui hụi! Lật hết phong bì, chọn người bỏ thăm cao nhất trước khi cả bàn sốt ruột.',
          envelopes: shuffle(envelopes).map(({ id, name, bid }) => ({ id, name, bid })),
          limitMs,
        },
        expected: { id: best.id, limitMs },
        minMs: 1500,
      };
    }
    case 'task_xep_xe': {
      const w = 4;
      const h = 3;
      const { bikes, blocked } = packLot(w, h, 1);
      const list = bikes.map((b, i) => ({ id: rid(), len: b.len, crab: i % 3 === 0 }));
      return {
        data: {
          taskId,
          prompt: 'Bãi xe chung cư chật cứng. Xếp hết xe vào ô cho khít, né mấy cây cột — dư chỗ là chú bảo vệ khen.',
          w,
          h,
          blocked,
          bikes: list,
        },
        // `solution` = the generated packing (any valid packing is accepted)
        expected: {
          w,
          h,
          blocked,
          bikes: list.map(({ id, len }) => ({ id, len })),
          solution: Object.fromEntries(bikes.map(({ x, y, vertical }, i) => [list[i].id, { x, y, vertical }])),
        },
        minMs: 3000,
      };
    }
  }
}

/** Server-side check of a submitted answer. */
export function verifyTask(p: Pending, answer: unknown): boolean {
  const a = answer as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const elapsed = Date.now() - p.openedAt;
  if (elapsed < (p.minMs ?? 0)) return false;
  switch (p.taskId) {
    case 'task_chi_duong': {
      const exp = p.expected as GameTurn[];
      return Array.isArray(a) && a.length === exp.length && exp.every((d, i) => a[i] === d);
    }
    case 'task_com_tam':
      return sameSet(a, p.expected as string[]);
    case 'task_tieng_rao':
    case 'task_so_hui': {
      const exp = p.expected as Record<string, string>;
      if (!isObj(a) || Object.keys(a).length !== Object.keys(exp).length) return false;
      return Object.keys(exp).every((k) => a[k] === exp[k]) && (p.taskId !== 'task_so_hui' || new Set(Object.values(a)).size === Object.keys(exp).length);
    }
    case 'task_ca_phe_phin': {
      const exp = p.expected as { line: number; tolerance: number };
      return isObj(a) && typeof a.milk === 'number' && Number.isFinite(a.milk) && Math.abs(a.milk - exp.line) <= exp.tolerance;
    }
    case 'task_do_xang': {
      const exp = p.expected as { target: number; pricePerLiter: number; litersPerSec: number; tolerance: number };
      if (!isObj(a) || typeof a.holdMs !== 'number' || !Number.isFinite(a.holdMs) || a.holdMs <= 0 || a.holdMs > elapsed) return false;
      const money = (a.holdMs / 1000) * exp.litersPerSec * exp.pricePerLiter;
      return Math.abs(money - exp.target) <= exp.tolerance;
    }
    case 'task_va_vo': {
      const exp = p.expected as number[];
      const got = isObj(a) && Array.isArray(a.patches) ? a.patches : null;
      return !!got && got.length === exp.length && [...got].map(Number).sort((x, y) => x - y).join() === exp.join();
    }
    case 'task_dem_tien': {
      const exp = p.expected as { stacks: Record<string, number>; total: number };
      if (!isObj(a) || !isObj(a.stacks) || a.total !== exp.total) return false;
      const s = a.stacks as Record<string, unknown>;
      return Object.keys(s).length === Object.keys(exp.stacks).length && Object.entries(exp.stacks).every(([k, v]) => s[k] === v);
    }
    case 'task_khui_hui': {
      const exp = p.expected as { id: string; limitMs: number };
      // a little slack for the round trip
      return a === exp.id && elapsed <= exp.limitMs + 3000;
    }
    case 'task_xep_xe': {
      const exp = p.expected as { w: number; h: number; blocked: Pt[]; bikes: { id: string; len: number }[] };
      if (!isObj(a) || Object.keys(a).length !== exp.bikes.length) return false;
      const taken = new Set(exp.blocked.map((c) => c.y * exp.w + c.x));
      for (const b of exp.bikes) {
        const q = a[b.id] as { x?: unknown; y?: unknown; vertical?: unknown } | undefined;
        if (!q || !Number.isInteger(q.x) || !Number.isInteger(q.y) || typeof q.vertical !== 'boolean') return false;
        for (let i = 0; i < b.len; i++) {
          const cx = (q.x as number) + (q.vertical ? 0 : i);
          const cy = (q.y as number) + (q.vertical ? i : 0);
          if (cx < 0 || cy < 0 || cx >= exp.w || cy >= exp.h || taken.has(cy * exp.w + cx)) return false;
          taken.add(cy * exp.w + cx);
        }
      }
      return true;
    }
    default:
      return false;
  }
}

export const GAME_CONTENT: MapContent = { funFacts: FUN_FACTS, buildTask, verifyTask };
