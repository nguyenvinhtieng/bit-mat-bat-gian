/**
 * HOST-ONLY content for "Hẻm 42 — Cuốc Cuối".
 * Hands-on mini-games (drag, swipe, hold, tap timing): the server deals each round's setup and checks
 * that the play the client reports fits it. buildTask() returns the client payload + what to verify.
 */
import type { CoolerItem, LotBike, Pothole, RackBox, TaskData, TaskId } from '@hidden-truth/shared';

import { pick, rid, sample, shuffle, type Built, type Fact, type MapContent, type Pending } from '../common/util';

/** Card shown after each task: the joke from the brief + a bit of night-delivery Saigon life. */
export const TASK_FACTS: Record<TaskId, Fact> = {
  pack_cooler: {
    headline: '“Không hành, nhiều hành phi, ớt để riêng, đá để riêng.”',
    text: 'Thùng giữ nhiệt sau xe là “văn phòng” của tài xế giao đồ ăn: ly nước phải đứng thẳng, nước lèo nằm dưới đáy — đổ một bịch là cả thùng thơm mùi hủ tiếu tới sáng.',
  },
  dodge_sellers: {
    headline: '“Mua giùm cô tờ vé số đi con, đài nay trúng chắc!”',
    text: 'Ngồi quán lề đường Sài Gòn chưa tới năm phút là có người bán vé số, đánh giày, bán kẹo ghé qua. Lắc đầu cười là đủ — dân ở đây quen rồi, không ai giận ai.',
  },
  brew_coffee: {
    headline: '“Ly này của tui, làm ly khác đi.”',
    text: 'Cà phê sữa đá chuẩn quán cóc: sữa đặc dưới đáy, cà phê phin đậm rót lên, khuấy đều rồi đổ vào ly đá to. Tài xế chạy đêm sống bằng thứ này.',
  },
  wifi_hunt: {
    headline: '“Pass wifi hả? Mua nước rồi hẵng hỏi.”',
    text: 'Hỏi mật khẩu wifi là câu đầu tiên khi ngồi quán nước. Tên mạng thì muôn kiểu: “Hoi_ma_Chi_Tu”, “Ko_Cho_Xai_Ke”… và luôn có một góc quán sóng mạnh hơn hẳn.',
  },
  pump_tyre: {
    headline: '“Bơm vừa thôi! BỤP là tính thêm ruột mới nha.”',
    text: 'Lốp non thì xe nặng, lốp căng quá thì dễ trượt khi đường ướt. Tiệm sửa xe đầu hẻm bơm miễn phí — chỉ cần đừng bơm lố.',
  },
  patch_tube: {
    headline: '“Đinh ba phân. Hẻm này ai rải đinh vậy trời?”',
    text: 'Thợ vá xe nhúng ruột vào thau nước để tìm chỗ thủng: chỗ nào sủi bọt là chỗ đó lủng. Đêm khuya thủng bánh giữa đường thì chỉ có cách dắt bộ tìm tiệm.',
  },
  tape_box: {
    headline: '“Thùng 50 triệu mà tự nhiên kêu ‘tít’ một cái?”',
    text: 'Quấn băng keo vòng chéo quanh thùng giúp hàng không bung khi xe xóc. Đã dặn không mở thùng thì đừng có lắc nghe thử bên trong.',
  },
  stack_rack: {
    headline: '“Thùng trên cùng là sầu riêng. Ai đặt vậy?”',
    text: 'Chở hàng chồng cao trên baga là “kỹ năng sống” của dân giao hàng Sài Gòn: thùng to dưới, thùng nhỏ trên, cột dây thật chặt trước khi ôm cua.',
  },
  unpark_bike: {
    headline: '“Xe ai cũng khóa cổ, đẩy kiểu gì bây giờ?”',
    text: 'Bãi giữ xe Sài Gòn xếp xe sát rạt từng chiếc. Muốn lấy xe ra giờ cao điểm là phải nhờ bảo vệ dời cả hàng.',
  },
  find_ticket: {
    headline: '“Vé đâu rồi? Có vỏ kẹo, có vé số trật, có khẩu trang…”',
    text: 'Mất vé giữ xe là phải trình giấy tờ, chờ đối chiếu, có khi còn bị phạt. Vậy mà tấm vé nhỏ xíu đó lúc nào cũng lẩn dưới đáy túi.',
  },
  dodge_potholes: {
    headline: '“Bà Tư tạt nước ra hẻm đúng lúc mình chạy ngang.”',
    text: 'Sau mưa, hẻm nhỏ Sài Gòn thành đường đua vượt chướng ngại: ổ gà, vũng nước, chó nằm giữa đường, và cửa nhà ai cũng có thể mở ra bất cứ lúc nào.',
  },
  handoff_package: {
    headline: '“Có tính tiền gửi xe hông em?”',
    text: 'Cuốc cuối của đêm luôn là cuốc khó nhất: đường vắng, mắt díp, và lúc nào cũng có cảm giác ai đó đang theo sau.',
  },
};

/** Success line shown right after a task is solved. */
export const TASK_DONE: Record<TaskId, string> = {
  pack_cooler: 'Đủ món, không đổ giọt nào. Ớt vẫn để riêng!',
  dodge_sellers: 'Thoát hết! Mất 5 nghìn tiền trà đá hôm qua.',
  brew_coffee: 'Ly cà phê sữa đá chuẩn vị quán cóc!',
  wifi_hunt: 'Full vạch! Wifi “Hoi_ma_Chi_Tu” đã kết nối.',
  pump_tyre: 'Lốp căng vừa đủ — không ai phải nghe tiếng BỤP.',
  patch_tube: 'Vá xong! Cây đinh ba phân cho vô ve chai.',
  tape_box: 'Rẹtttt! Thùng kín mít, không ai biết bên trong có gì.',
  stack_rack: 'Chồng hàng vững như kiềng — kể cả thùng sầu riêng.',
  unpark_bike: 'Xe ra khỏi bãi rồi! Bảo vệ vỗ tay.',
  find_ticket: 'Thấy vé rồi! Nằm dưới đáy, như mọi lần.',
  dodge_potholes: 'Vô tới cuối hẻm, áo vẫn khô!',
  handoff_package: 'Bàn giao xong Cuốc Cuối! Năm sao cho cả hội!',
};

export const FUN_FACTS = [
  'Địa chỉ “42/7/3” ở Sài Gòn nghĩa là hẻm trong hẻm — dấu “/” chỉ một nhánh hẻm nhỏ hơn.',
  'Bình trà đá miễn phí trước cửa nhà là nét tử tế quen thuộc của Sài Gòn — ai khát cứ rót.',
  'Hủ tiếu gõ được đặt tên theo tiếng gõ hai thanh tre “lóc cóc” mà người bán dùng để báo hiệu.',
  'Xe ôm là nghề có từ lâu trước khi có app — tài xế xưa đậu xe đầu hẻm, đội nón chờ khách.',
  'Mưa Sài Gòn tới nhanh đi nhanh, nhưng nước ngập thì ở lại lâu hơn nhiều.',
  'Dân chạy đêm hay ghé quán cà phê cóc: ghế nhựa thấp, ly đá to, tám chuyện cả buổi.',
  'Cài quai nón bảo hiểm đúng cách là chuyện nên làm — dù đêm nay nó làm bạn bị nghi.',
];

// ------------------------------------------------------------------ helpers
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
const inBand = (v: unknown, [lo, hi]: readonly [number, number]) => isNum(v) && v >= lo && v <= hi;

// ------------------------------------------------------------------ pack_cooler
const COOLER: Record<CoolerItem['need'], [string, string][]> = {
  cup: [['tra-sua', 'Trà sữa trân châu'], ['ca-phe', 'Cà phê sữa đá'], ['nuoc-mia', 'Nước mía']],
  bottom: [['nuoc-leo', 'Bịch nước lèo'], ['canh-chua', 'Bịch canh chua']],
  shelf: [['com-tam', 'Cơm tấm sườn'], ['banh-mi', 'Bánh mì'], ['goi-cuon', 'Gỏi cuốn'], ['banh-trang', 'Bánh tráng trộn']],
};
const BILL = ['Không hành, nhiều hành phi', 'Ớt để riêng', 'Đá để riêng', 'Ống hút để riêng', 'Nước lèo để dưới đáy kẻo đổ', 'Ly nước cắm vô ô giữ ly'];
function buildCooler(): Built {
  const take = (need: CoolerItem['need'], n: number) => sample(COOLER[need], n).map(([kind, name]) => ({ id: rid(), kind, name, need }));
  const items = shuffle([...take('cup', 2), ...take('bottom', 1), ...take('shelf', 2)]);
  const slots = items.map((i) => ({ id: rid(), kind: i.need }));
  return {
    data: { taskId: 'pack_cooler', prompt: 'Kéo từng món vào thùng giữ nhiệt — ly nước vào ô giữ ly, nước lèo nằm dưới đáy.', bill: BILL, items, slots: shuffle(slots) },
    expected: { items, slots },
    minMs: 2500,
  };
}
function verifyCooler(e: { items: CoolerItem[]; slots: { id: string; kind: string }[] }, a: unknown) {
  if (!isObj(a) || Object.keys(a).length !== e.items.length) return false;
  const used = new Set<string>();
  return e.items.every((it) => {
    const slot = e.slots.find((s) => s.id === a[it.id]);
    if (!slot || slot.kind !== it.need || used.has(slot.id)) return false;
    used.add(slot.id);
    return true;
  });
}

// ------------------------------------------------------------------ dodge_sellers
const SELLERS: [string, string, string][] = [
  ['ve-so', 'Cô bán vé số', 'Mua giùm cô tờ vé số đi con, đài nay trúng chắc!'],
  ['danh-giay', 'Chú đánh giày', 'Đánh giày hông con? Dép lào chú cũng đánh!'],
  ['keo', 'Bé bán kẹo', 'Anh ơi mua kẹo cao su ủng hộ em đi!'],
  ['to-roi', 'Cô phát tờ rơi', 'Khoan cắt bê tông, rút hầm cầu giá rẻ nè!'],
  ['bong-bay', 'Chú bán bong bóng', 'Bong bóng hình con cua nè, mua cho con hông?'],
  ['dau-gio', 'Ông bán dầu gió', 'Dầu gió xanh, xức cái tỉnh ngủ liền!'],
];
function buildSellers(): Built {
  const sellers = sample(SELLERS, 4).map(([kind, name, line]) => ({ id: rid(), kind, name, line }));
  return {
    data: {
      taskId: 'dodge_sellers',
      prompt: 'Ngồi chờ lấy đơn mà “tiếp thị dạo” cứ ghé. Vuốt để lắc đầu từ chối từng người.',
      sellers,
      owner: { name: 'Chủ quán', line: 'Ê, ly trà đá hôm qua chưa trả nha!', debt: 5000 },
    },
    expected: sellers.map((s) => s.id),
    minMs: sellers.length * 500 + 800,
  };
}
function verifySellers(order: string[], a: unknown) {
  if (!isObj(a) || a.paid !== true || !Array.isArray(a.swiped)) return false;
  const swiped: unknown[] = a.swiped;
  return swiped.length === order.length && order.every((id, i) => swiped[i] === id);
}

// ------------------------------------------------------------------ brew_coffee
function buildCoffee(): Built {
  const m = round(rand(0.18, 0.26), 2);
  const c = round(rand(0.62, 0.72), 2);
  const milk: [number, number] = [m, round(m + 0.09, 2)];
  const coffee: [number, number] = [c, round(c + 0.1, 2)];
  const rate = 0.28;
  return {
    data: { taskId: 'brew_coffee', prompt: 'Giữ để rót sữa đặc tới vạch, thả tay. Rồi giữ tiếp để rót cà phê tới vạch thứ hai.', milk, coffee, rate },
    expected: { milk, coffee },
    minMs: Math.floor((coffee[0] / rate) * 1000 * 0.7),
  };
}
function verifyCoffee(e: { milk: [number, number]; coffee: [number, number] }, a: unknown) {
  return isObj(a) && inBand(a.milk, e.milk) && inBand(a.coffee, e.coffee);
}

// ------------------------------------------------------------------ wifi_hunt
const NETWORKS = ['Hoi_ma_Chi_Tu', 'Ko_Cho_Xai_Ke', 'Tra_Tien_Nuoc_Di', 'Wifi_Nha_Ai_Do', 'Cam_Xai_Chua', 'Quan_Nuoc_Co_Ba'];
function buildWifi(): Built {
  const spot = { x: round(rand(0.15, 0.85)), y: round(rand(0.2, 0.85)) };
  const radius = 0.1;
  return {
    data: { taskId: 'wifi_hunt', prompt: 'Kéo điện thoại đi khắp quán, chỗ nào full vạch thì giữ yên ở đó.', networks: sample(NETWORKS, 4), spot, radius },
    expected: { spot, radius },
    minMs: 2000,
  };
}
function verifyWifi(e: { spot: { x: number; y: number }; radius: number }, a: unknown) {
  return isObj(a) && isNum(a.x) && isNum(a.y) && Math.hypot(a.x - e.spot.x, a.y - e.spot.y) <= e.radius * 1.2;
}

// ------------------------------------------------------------------ pump_tyre
function buildPump(): Built {
  const perStroke = randInt(6, 9);
  const lo = randInt(30, 40);
  const green: [number, number] = [lo, lo + perStroke + 2];
  return {
    data: { taskId: 'pump_tyre', prompt: 'Vuốt lên xuống để bơm. Kim vào vùng xanh thì dừng — lố là BỤP!', perStroke, green, max: 60 },
    expected: { perStroke, green },
    minMs: Math.ceil(lo / perStroke) * 250,
  };
}
function verifyPump(e: { perStroke: number; green: [number, number] }, a: unknown) {
  return isObj(a) && isInt(a.strokes) && inBand((a.strokes as number) * e.perStroke, e.green);
}

// ------------------------------------------------------------------ patch_tube
function buildTube(): Built {
  const sections = 8;
  const leaks = sample([1, 2, 3, 4, 5, 6], 2).sort((x, y) => x - y);
  return {
    data: { taskId: 'patch_tube', prompt: 'Kéo ruột xe qua thau nước. Chỗ nào sủi bọt thì chạm để dán miếng vá.', sections, leaks },
    expected: leaks,
    minMs: 2500,
  };
}
function verifyTube(leaks: number[], a: unknown) {
  if (!isObj(a) || !Array.isArray(a.patched)) return false;
  const got = [...new Set(a.patched as unknown[])];
  return got.length === leaks.length && leaks.every((l) => got.includes(l));
}

// ------------------------------------------------------------------ tape_box
function buildTape(): Built {
  return {
    data: { taskId: 'tape_box', prompt: 'Kéo ngón tay vòng quanh thùng theo đường chấm để quấn băng keo.', laps: 2 },
    expected: 2,
    minMs: 2500,
  };
}
const verifyTape = (laps: number, a: unknown) => isObj(a) && isInt(a.laps) && (a.laps as number) >= laps && (a.laps as number) <= laps + 3;

// ------------------------------------------------------------------ stack_rack
const RACK: [string, string][] = [
  ['mi-goi', 'Thùng mì gói'],
  ['nuoc-suoi', 'Thùng nước suối'],
  ['kien-hang', 'Kiện hàng 50 triệu'],
  ['sau-rieng', 'Thùng sầu riêng'],
];
function buildRack(): Built {
  const boxes = RACK.map(([kind, name], i) => ({ id: rid(), kind, name, w: 120 - i * 10 }));
  const base = 140;
  return {
    data: { taskId: 'stack_rack', prompt: 'Thùng đung đưa phía trên baga — chạm để thả. Chồng đủ 4 thùng mà không đổ.', boxes, base, swing: 90 },
    expected: { boxes, base },
    minMs: 2500,
  };
}
function verifyRack(e: { boxes: RackBox[]; base: number }, a: unknown) {
  if (!isObj(a) || !Array.isArray(a.offsets) || a.offsets.length !== e.boxes.length) return false;
  const offs: unknown[] = a.offsets;
  return e.boxes.every((b, i) => {
    const below = i === 0 ? e.base : e.boxes[i - 1].w;
    const o = offs[i];
    return isNum(o) && Math.abs(o) <= Math.min(below, b.w) / 2;
  });
}

// ------------------------------------------------------------------ unpark_bike
const LOT_W = 5;
const LOT_H = 5;
const LOT_EXIT_Y = 2;
type Lot = LotBike[];
const cellsOf = (b: LotBike) => Array.from({ length: b.len }, (_, i) => (b.dir === 'h' ? `${b.x + i},${b.y}` : `${b.x},${b.y + i}`));
function fits(bikes: Lot) {
  const seen = new Set<string>();
  for (const b of bikes) {
    if (b.x < 0 || b.y < 0 || (b.dir === 'h' ? b.x + b.len > LOT_W || b.y >= LOT_H : b.y + b.len > LOT_H || b.x >= LOT_W)) return false;
    for (const c of cellsOf(b)) {
      if (seen.has(c)) return false;
      seen.add(c);
    }
  }
  return true;
}
const freed = (bikes: Lot) => {
  const me = bikes.find((b) => b.mine)!;
  return me.x + me.len === LOT_W;
};
/** fewest slides (one bike, any distance) to free my bike; -1 if impossible / too deep */
function minSlides(start: Lot, cap = 10): number {
  const sig = (bs: Lot) => bs.map((b) => `${b.x},${b.y}`).join('|');
  let frontier = [start];
  const seen = new Set([sig(start)]);
  for (let depth = 0; depth <= cap; depth++) {
    const next: Lot[] = [];
    for (const s of frontier) {
      if (freed(s)) return depth;
      s.forEach((b, i) => {
        for (const d of [-1, 1]) {
          for (let k = 1; k < LOT_W; k++) {
            const moved = { ...b, x: b.dir === 'h' ? b.x + d * k : b.x, y: b.dir === 'v' ? b.y + d * k : b.y };
            const n = s.map((x, j) => (j === i ? moved : x));
            if (!fits(n)) break;
            const key = sig(n);
            if (seen.has(key)) continue;
            seen.add(key);
            next.push(n);
          }
        }
      });
    }
    frontier = next;
  }
  return -1;
}
const FALLBACK_LOT: Lot = [
  { id: 'me', x: 0, y: 2, len: 2, dir: 'h', mine: true },
  { id: 'a', x: 2, y: 1, len: 2, dir: 'v' },
  { id: 'b', x: 3, y: 2, len: 3, dir: 'v' },
  { id: 'c', x: 2, y: 0, len: 2, dir: 'h' },
  { id: 'd', x: 3, y: 0, len: 2, dir: 'h' },
];
function buildLot(): Built {
  let bikes: Lot = FALLBACK_LOT;
  for (let tries = 0; tries < 400; tries++) {
    const cand: Lot = [{ id: rid(), x: 0, y: LOT_EXIT_Y, len: 2, dir: 'h', mine: true }];
    // two blockers across the exit lane, then a few more anywhere
    for (const x of sample([2, 3, 4], 2)) {
      const len = Math.random() < 0.3 ? 3 : 2;
      cand.push({ id: rid(), x, y: randInt(Math.max(0, LOT_EXIT_Y - len + 1), Math.min(LOT_EXIT_Y, LOT_H - len)), len, dir: 'v' });
    }
    for (let n = randInt(2, 3), guard = 0; n > 0 && guard < 30; guard++) {
      const dir = Math.random() < 0.5 ? 'h' : 'v';
      const b: LotBike = { id: rid(), x: randInt(0, LOT_W - 1), y: randInt(0, LOT_H - 1), len: 2, dir };
      if (dir === 'h' && b.y === LOT_EXIT_Y) continue;
      if (fits([...cand, b])) cand.push(b), n--;
    }
    if (!fits(cand)) continue;
    const m = minSlides(cand);
    if (m >= 3 && m <= 6) {
      bikes = cand;
      break;
    }
  }
  return {
    data: { taskId: 'unpark_bike', prompt: 'Đẩy các xe dọc ngang để mở đường cho xe CRAB của bạn ra cổng bên phải.', w: LOT_W, h: LOT_H, bikes },
    expected: bikes,
    minMs: 3000,
  };
}
function verifyLot(start: Lot, a: unknown) {
  if (!isObj(a) || !Array.isArray(a.moves) || a.moves.length > 300) return false;
  let bikes = start.map((b) => ({ ...b }));
  for (const m of a.moves as unknown[]) {
    if (!isObj(m) || (m.d !== 1 && m.d !== -1)) return false;
    const i = bikes.findIndex((b) => b.id === m.id);
    if (i < 0) return false;
    const b = bikes[i];
    const n = bikes.map((x, j) => (j === i ? { ...b, x: b.dir === 'h' ? b.x + (m.d as number) : b.x, y: b.dir === 'v' ? b.y + (m.d as number) : b.y } : x));
    if (!fits(n)) return false;
    bikes = n;
  }
  return freed(bikes);
}

// ------------------------------------------------------------------ find_ticket
const JUNK: [string, string][] = [
  ['vo-keo', 'Vỏ kẹo'],
  ['tien-le', 'Tờ 2 nghìn nhàu'],
  ['ve-so', 'Vé số trật'],
  ['khau-trang', 'Khẩu trang cũ'],
  ['hoa-don', 'Hóa đơn tiền điện'],
  ['chia-khoa', 'Chìa khóa nhà ai'],
  ['bat-lua', 'Bật lửa hết gas'],
  ['day-thun', 'Dây thun'],
];
function buildTicket(): Built {
  const junk = sample(JUNK, 6).map(([kind, name]) => ({ id: rid(), kind, name }));
  const ticket = { id: rid(), kind: 've-xe', name: 'Vé giữ xe' };
  const at = randInt(3, 5);
  const items = [...junk.slice(0, at), ticket, ...junk.slice(at)];
  return {
    data: { taskId: 'find_ticket', prompt: 'Bảo vệ đòi vé xe. Kéo từng món ra khỏi túi cho tới khi thấy vé, rồi chạm vào vé.', items },
    expected: { ticket: ticket.id, above: junk.slice(0, at).map((j) => j.id) },
    minMs: 2000,
  };
}
function verifyTicket(e: { ticket: string; above: string[] }, a: unknown) {
  if (!isObj(a) || a.ticket !== e.ticket || !Array.isArray(a.removed)) return false;
  const removed: unknown[] = a.removed;
  return !removed.includes(e.ticket) && e.above.every((id) => removed.includes(id));
}

// ------------------------------------------------------------------ dodge_potholes
const HAZARDS = ['o-ga', 'vung-nuoc', 'cho', 'tat-nuoc'];
const POTHOLE_MS = 9000;
function buildPotholes(): Built {
  const obstacles: Pothole[] = [];
  for (let at = 1600; at <= POTHOLE_MS - 600; at += randInt(800, 1100)) obstacles.push({ at, lane: randInt(0, 2), kind: pick(HAZARDS) });
  return {
    data: { taskId: 'dodge_potholes', prompt: 'Xe tự chạy vào hẻm. Vuốt trái / phải để né ổ gà, vũng nước và… chó.', lanes: 3, duration: POTHOLE_MS, obstacles },
    expected: obstacles,
    minMs: POTHOLE_MS - 500,
  };
}
function verifyPotholes(obstacles: Pothole[], a: unknown) {
  if (!isObj(a) || !Array.isArray(a.moves) || a.moves.length > 200) return false;
  const moves = a.moves as unknown[];
  if (!moves.every((m) => isObj(m) && isNum(m.at) && isInt(m.lane) && (m.lane as number) >= 0 && (m.lane as number) <= 2)) return false;
  const ms = (moves as { at: number; lane: number }[]).slice().sort((x, y) => x.at - y.at);
  const laneAt = (t: number) => ms.reduce((lane, m) => (m.at <= t ? m.lane : lane), 1);
  return obstacles.every((o) => laneAt(o.at) !== o.lane);
}

// ------------------------------------------------------------------ handoff_package
function buildHandoff(): Built {
  return {
    data: { taskId: 'handoff_package', prompt: 'Giữ để bấm chuông, chụp ảnh giao hàng khi thùng nằm giữa khung, rồi vuốt “Đã giao”.', ringMs: 1000, tolerance: 18 },
    expected: 18,
    minMs: 2500,
  };
}
const verifyHandoff = (tol: number, a: unknown) => isObj(a) && a.rang === true && a.slid === true && isNum(a.photo) && Math.abs(a.photo) <= tol;

// ------------------------------------------------------------------ map content
const BUILDERS: Record<TaskId, () => Built> = {
  pack_cooler: buildCooler,
  dodge_sellers: buildSellers,
  brew_coffee: buildCoffee,
  wifi_hunt: buildWifi,
  pump_tyre: buildPump,
  patch_tube: buildTube,
  tape_box: buildTape,
  stack_rack: buildRack,
  unpark_bike: buildLot,
  find_ticket: buildTicket,
  dodge_potholes: buildPotholes,
  handoff_package: buildHandoff,
};

export const GAME_CONTENT: MapContent = {
  funFacts: FUN_FACTS,
  buildTask(taskId) {
    const build = BUILDERS[taskId as TaskId];
    if (!build) return null;
    return { ...build(), fact: TASK_FACTS[taskId], done: TASK_DONE[taskId] };
  },
  verifyTask(p: Pending, a: unknown) {
    if (Date.now() - p.openedAt < (p.minMs ?? 0)) return false;
    const e = p.expected as never;
    switch (p.taskId as TaskData['taskId']) {
      case 'pack_cooler':
        return verifyCooler(e, a);
      case 'dodge_sellers':
        return verifySellers(e, a);
      case 'brew_coffee':
        return verifyCoffee(e, a);
      case 'wifi_hunt':
        return verifyWifi(e, a);
      case 'pump_tyre':
        return verifyPump(e, a);
      case 'patch_tube':
        return verifyTube(e, a);
      case 'tape_box':
        return verifyTape(e, a);
      case 'stack_rack':
        return verifyRack(e, a);
      case 'unpark_bike':
        return verifyLot(e, a);
      case 'find_ticket':
        return verifyTicket(e, a);
      case 'dodge_potholes':
        return verifyPotholes(e, a);
      case 'handoff_package':
        return verifyHandoff(e, a);
      default:
        return false;
    }
  },
};
