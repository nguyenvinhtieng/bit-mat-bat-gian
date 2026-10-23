/**
 * HOST-ONLY content for "Hẻm 42 — Cuốc Cuối".
 * Hands-on mini-games (drag, swipe, hold, tap timing): the server deals each round's setup and checks
 * that the play the client reports fits it. buildTask() returns the client payload + what to verify.
 */
import type { CoolerItem, LotBike, Pothole, RackBox, TaskData, TaskId } from '@hidden-truth/shared';

import { pick, rid, sample, shuffle, type Built, type Fact, type MapContent, type Pending } from '../common/util';

/** Card shown after each task: the joke from the brief + a bit of night-delivery Saigon life. */
export const TASK_FACTS: Record<TaskId, Fact> = {
  connect_wires: {
    headline: '“Nối xong hộp điện, tiệm lại sáng đèn.”',
    text: 'Hộp điện trong tiệm có nhãn riêng cho từng đường dây. Ghép đúng bốn cặp để bật lại đèn và tiếp tục chuẩn bị chuyến hàng đêm.',
  },
  pack_cooler: {
    headline: '“Không hành, nhiều hành phi, ớt để riêng, đá để riêng.”',
    text: 'Thùng giữ nhiệt sau xe là “văn phòng” của tài xế giao đồ ăn: ly nước phải đứng thẳng, nước lèo nằm dưới đáy — đổ một bịch là cả thùng thơm mùi hủ tiếu tới sáng.',
  },
  untangle_charger: {
    headline: '“Còn một phần trăm pin mà dây thì thắt nút!”',
    text: 'Dây sạc trong túi tài xế hay mắc vào đủ thứ. Gỡ lần lượt từng chốt, cắm điện thoại rồi mới yên tâm nhận cuốc tiếp.',
  },
  stuck_shutter: {
    headline: '“Kéo nhẹ thôi! Cửa này có bí quyết.”',
    text: 'Cửa cuốn tiệm quen rỉ sét, cứ tới đoạn đó là chốt kẹt cứng. Nhỏ chút dầu hoặc vặn lỏng con ốc rồi kéo tiếp — buông tay là cửa tụt xuống lại.',
  },
  tune_antenna: {
    headline: '“Đứng yên đó! Đang rõ rồi!”',
    text: 'Chiếc tivi quán cóc vẫn bắt sóng bằng hai nhánh anten. Chỉnh đúng góc, giữ một nhịp: cả quán lại được xem tiếp trận bóng.',
  },
  water_pipes: {
    headline: '“Rửa tay cái đã rồi hẵng bốc bánh mì.”',
    text: 'Vòi rửa tay ở góc quán bị lỏng mấy khúc nối. Xoay cho thông đường, mở van: dòng nước mát là phần thưởng sau một cuốc chạy bụi đường.',
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
  connect_wires: 'Đủ bốn mạch! Đèn tiệm sáng trở lại.',
  pack_cooler: 'Đủ món, không đổ giọt nào. Ớt vẫn để riêng!',
  untangle_charger: 'Cắm sạc rồi! Đủ pin nhận thêm một cuốc.',
  stuck_shutter: 'Rè rè… cửa mở! Cả hẻm nghe thấy luôn.',
  tune_antenna: 'Hình nét căng! Đừng ai đụng anten nha.',
  water_pipes: 'Nước chảy rồi! Rửa tay sạch, chạy cuốc tiếp.',
  brew_coffee: 'Ly cà phê sữa đá chuẩn vị quán cóc!',
  wifi_hunt: 'Full vạch! Wifi “Hoi_ma_Chi_Tu” đã kết nối.',
  pump_tyre: 'Lốp căng vừa đủ — không ai phải nghe tiếng BỤP.',
  patch_tube: 'Vá xong! Cây đinh ba phân cho vô ve chai.',
  tape_box: 'Rẹtttt! Thùng kín mít, không ai biết bên trong có gì.',
  stack_rack: 'Chồng hàng vững như kiềng — kể cả thùng sầu riêng.',
  unpark_bike: 'Xe ra khỏi bãi rồi! Bảo vệ vỗ tay.',
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

// ------------------------------------------------------------------ everyday repairs
function buildWires(): Built {
  const left = shuffle(['red', 'blue', 'amber', 'mint']);
  let right = shuffle([...left]);
  if (right.every((color, i) => color === left[i])) right = [...right.slice(1), right[0]];
  return { data: { taskId: 'connect_wires', prompt: 'Kéo từng đầu dây vào cọc cùng màu để khôi phục bốn mạch điện.', left, right }, expected: left, minMs: 2000 };
}
function verifyWires(colors: string[], a: unknown) {
  if (!isObj(a) || !Array.isArray(a.connections) || a.connections.length !== colors.length) return false;
  const connections: unknown[] = a.connections;
  return colors.every((color) => connections.filter((c) => isObj(c) && c.from === color && c.to === color).length === 1);
}
function buildCharger(): Built {
  const pegs = [{ id: rid(), x: 0.25, y: 0.35 }, { id: rid(), x: 0.58, y: 0.25 }, { id: rid(), x: 0.72, y: 0.6 }, ...(Math.random() < 0.5 ? [{ id: rid(), x: 0.4, y: 0.7 }] : [])];
  return {
    data: { taskId: 'untangle_charger', prompt: 'Kéo đầu dây lần lượt qua từng chốt đang sáng, rồi cắm vào điện thoại.', pegs, phone: { x: 0.85, y: 0.85 } },
    expected: pegs.map((peg) => peg.id), minMs: 2500,
  };
}
function verifyCharger(pegs: string[], a: unknown) {
  if (!isObj(a) || a.plugged !== true || !Array.isArray(a.released)) return false;
  return a.released.length === pegs.length && pegs.every((id, i) => (a.released as unknown[])[i] === id);
}
function buildShutter(): Built {
  const jams = [round(rand(0.25, 0.4), 2), round(rand(0.58, 0.75), 2)];
  // each jam shows a rusty bolt somewhere on the door; it never sits under the oil can (bottom-left)
  const bolts = jams.map(() => ({ x: round(rand(0.3, 0.85), 2), y: round(rand(0.18, 0.62), 2) }));
  const turnDeg = 360;
  return {
    data: { taskId: 'stuck_shutter', prompt: 'Kéo cửa lên. Gặp chốt rỉ: nhỏ dầu hoặc vặn ốc một vòng, rồi kéo tiếp. Buông tay là cửa tụt.', jams, bolts, turnDeg },
    expected: { jams, turnDeg }, minMs: 3000,
  };
}
function verifyShutter(e: { jams: number[]; turnDeg: number }, a: unknown) {
  if (!isObj(a) || a.lift !== 1 || !Array.isArray(a.cleared) || !Array.isArray(a.freed)) return false;
  const cleared: unknown[] = a.cleared, freed: unknown[] = a.freed;
  return cleared.length === e.jams.length && freed.length === e.jams.length
    && e.jams.every((_, i) => cleared[i] === i && (freed[i] === 'oil' || (isNum(freed[i]) && (freed[i] as number) >= e.turnDeg && (freed[i] as number) <= 7200)));
}
function buildAntenna(): Built {
  const target: [number, number] = [randInt(25, 65), randInt(115, 155)];
  const tolerance = 13, holdMs = 1200; // error ≤ 13° ⇔ client signal ≥ 85%
  return {
    data: { taskId: 'tune_antenna', prompt: 'Xoay hai nhánh anten tới khi hình rõ, giữ yên một nhịp.', target, tolerance, holdMs },
    expected: { target, tolerance, holdMs }, minMs: 2500,
  };
}
function verifyAntenna(e: { target: [number, number]; tolerance: number; holdMs: number }, a: unknown) {
  if (!isObj(a) || !Array.isArray(a.angles) || a.angles.length !== 2 || !isNum(a.heldMs) || a.heldMs < e.holdMs || a.heldMs > 60000) return false;
  const angles: unknown[] = a.angles;
  return e.target.every((angle, i) => isNum(angles[i]) && Math.abs((angles[i] as number) - angle) <= e.tolerance);
}
function buildPipes(): Built {
  const solution = [2, 1, 0, 3];
  const rotations = solution.map((angle) => (angle + randInt(1, 3)) % 4);
  return {
    data: { taskId: 'water_pipes', prompt: 'Xoay bốn đoạn ống cho nối từ vòi tới bồn, rồi mở van nước.', rotations, solution },
    expected: solution, minMs: 2500,
  };
}
function verifyPipes(solution: number[], a: unknown) {
  if (!isObj(a) || a.opened !== true || !Array.isArray(a.rotations) || a.rotations.length !== solution.length) return false;
  return solution.every((angle, i) => (a.rotations as unknown[])[i] === angle);
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
  // the phone starts at the centre (0.5, 0.5): keep the hot spot well away so it can't pass on open
  let spot: { x: number; y: number };
  do spot = { x: round(rand(0.15, 0.85)), y: round(rand(0.2, 0.85)) };
  while (Math.hypot(spot.x - 0.5, spot.y - 0.5) < 0.3);
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
  const rate = randInt(7, 10); // psi per second while the button is held
  const lo = randInt(30, 40);
  const green: [number, number] = [lo, lo + randInt(7, 9)];
  // the pump overheats after ~2 s of holding, so reaching the green takes at least one cool-down
  const heatRate = 0.5, coolRate = 0.4;
  return {
    data: { taskId: 'pump_tyre', prompt: 'Giữ nút để bơm, thả cho bơm nguội trước khi quá nóng. Kim vào vùng xanh thì dừng — lố là BỤP!', green, max: 60, rate, heatRate, coolRate },
    expected: { green, rate },
    minMs: Math.ceil((lo / rate) * 1000),
  };
}
function verifyPump(e: { green: [number, number]; rate: number }, a: unknown) {
  // air only goes in while held, so the reported hold time must cover the pressure
  return isObj(a) && inBand(a.psi, e.green) && isNum(a.heldMs) && a.heldMs <= 120_000 && a.heldMs >= ((a.psi as number) / e.rate) * 1000 * 0.9;
}

// ------------------------------------------------------------------ patch_tube
function buildTube(): Built {
  const sections = 8;
  // section 1 starts in the basin, so it is never a leak (the first patch must take a pull)
  const leaks = sample([2, 3, 4, 5, 6], 2).sort((x, y) => x - y);
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
    data: { taskId: 'tape_box', prompt: 'Gấp hai nắp thùng, kéo băng keo dọc đường ráp rồi dán dải ngang.', strips: 2 },
    expected: 2,
    minMs: 2500,
  };
}
const verifyTape = (_: number, a: unknown) => isObj(a)
  && Array.isArray(a.flaps) && a.flaps.length === 2 && new Set(a.flaps).size === 2 && ['left', 'right'].every(v => (a.flaps as unknown[]).includes(v))
  && Array.isArray(a.strips) && a.strips.length === 2 && new Set(a.strips).size === 2 && ['seam', 'cross'].every(v => (a.strips as unknown[]).includes(v));

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
  connect_wires: buildWires,
  pack_cooler: buildCooler,
  untangle_charger: buildCharger,
  stuck_shutter: buildShutter,
  tune_antenna: buildAntenna,
  water_pipes: buildPipes,
  brew_coffee: buildCoffee,
  wifi_hunt: buildWifi,
  pump_tyre: buildPump,
  patch_tube: buildTube,
  tape_box: buildTape,
  stack_rack: buildRack,
  unpark_bike: buildLot,
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
      case 'connect_wires':
        return verifyWires(e, a);
      case 'untangle_charger':
        return verifyCharger(e, a);
      case 'stuck_shutter':
        return verifyShutter(e, a);
      case 'tune_antenna':
        return verifyAntenna(e, a);
      case 'water_pipes':
        return verifyPipes(e, a);
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
      case 'dodge_potholes':
        return verifyPotholes(e, a);
      case 'handoff_package':
        return verifyHandoff(e, a);
      default:
        return false;
    }
  },
};
