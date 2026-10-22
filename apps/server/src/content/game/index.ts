/**
 * HOST-ONLY content for "Hẻm 42 — Cuốc Cuối".
 * Every task prepares the 50-million package; answers / checks never leave the server:
 * buildTask() returns the client payload + what to verify.
 */
import type { Pt, TaskData, TaskId } from '@hidden-truth/shared';

import { pick, rid, sample, shuffle, type Built, type Fact, type MapContent, type Pending, type TaskCtx } from '../common/util';

/** Card shown after each task: the joke from the brief + a bit of night-delivery Saigon life. */
export const TASK_FACTS: Record<TaskId, Fact> = {
  receive_package: {
    headline: '“50 triệu mà thùng nhẹ như hộp bánh trung thu?”',
    text: 'Tài xế giao hàng đêm quen đối chiếu mã vận đơn trước khi nhận: sai một ký tự là chạy nhầm cả cuốc. Khách giấu tên thì càng phải soi kỹ — dù trong thùng là gì, CRAB đã hứa không mở.',
  },
  check_seal: {
    headline: '“Đã dặn không mở mà ông còn hỏi bên trong có gì!”',
    text: 'Tem niêm phong dán chéo qua mép thùng: chỉ cần rách hay lệch là biết đã bị mở. Kiểm tra tem không cần mở thùng — chỉ cần nhìn kỹ và đừng tò mò.',
  },
  decode_address: {
    headline: '“Nhà có cửa xanh. Trong hẻm này mười hai nhà cửa xanh!”',
    text: 'Địa chỉ “42/7” ở Sài Gòn nghĩa là hẻm trong hẻm: nhánh 7 nằm trong hẻm 42. Khách quen chỉ đường bằng tiệm sửa xe, xe bánh mì hay bình trà đá trước cửa — tài xế mới thì vừa chạy vừa hỏi.',
  },
  plan_route: {
    headline: '“App kêu quẹo phải, bên phải là cái mương.”',
    text: 'Mưa lớn là nhiều tuyến đường Sài Gòn ngập tới bánh xe. Dân chạy đêm thuộc lòng chỗ nào ngập, hẻm nào cụt — thứ mà bản đồ trên điện thoại chưa chắc đã biết.',
  },
  prepare_bike: {
    headline: '“Chở 50 triệu mà xe còn nợ tiền thay nhớt.”',
    text: 'Lốp non thì xe nặng, lốp căng quá thì dễ trượt khi đường ướt. Dây chằng hàng siết theo thứ tự chéo nhau để thùng không xô lệch khi ôm cua.',
  },
  pack_disguise: {
    headline: '“Dán chữ HÀNG DỄ VỠ to vậy càng đáng nghi!”',
    text: 'Đóng gói đúng cách: lớp chống sốc dưới đáy, lớp đệm quanh hàng, lớp chống nước trên cùng. Thùng mì gói, thùng bánh trung thu — thùng nào cũng có thể là “thùng ngoài” quen mắt.',
  },
  confirm_recipient: {
    headline: '“Mật khẩu là ‘không biết gì hết’. Ủa sao nghe quen?”',
    text: 'Giao hàng giá trị cao thường phải đối chiếu mã nhận với người nhận trước khi trao tay. Gọi nhầm số, giao nhầm người là mất cả cuốc lẫn uy tín.',
  },
  handoff_package: {
    headline: '“Giao xong nhớ đánh giá tài xế năm sao nha anh!”',
    text: 'Cuốc cuối của đêm luôn là cuốc khó nhất: đường vắng, mắt díp, và lúc nào cũng có cảm giác ai đó đang theo sau.',
  },
};

/** Success line shown right after a task is solved. */
export const TASK_DONE: Record<TaskId, string> = {
  receive_package: 'Đúng thùng rồi! Nhẹ hều… nhưng đúng mã.',
  check_seal: 'Tem nguyên vẹn — không ai mở, kể cả ông hay hỏi.',
  decode_address: 'Ra địa chỉ rồi! Giờ chỉ còn mười một nhà cửa xanh để loại.',
  plan_route: 'Tuyến khô ráo, không hẻm cụt, không mương.',
  prepare_bike: 'Lốp căng, dây chằng chắc — tiền nhớt tính sau.',
  pack_disguise: 'Đóng gói đúng mẫu, nhìn y như thùng mì gói.',
  confirm_recipient: 'Đúng người nhận, đúng mật khẩu. Không biết gì hết!',
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
const key = (p: Pt) => `${p.x},${p.y}`;
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isPt = (v: unknown): v is Pt => isObj(v) && isInt(v.x) && isInt(v.y);
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const randInt = (lo: number, hi: number) => lo + Math.floor(Math.random() * (hi - lo + 1));

// ------------------------------------------------------------------ receive_package
const code3 = () => `${pick([...LETTERS])}${randInt(1, 9)}${pick([...LETTERS])}`;
/** change one character so the decoy looks almost right */
function nearMiss(c: string) {
  const i = randInt(0, 2);
  const pool = i === 1 ? '123456789' : LETTERS;
  let ch = c[i];
  while (ch === c[i]) ch = pick([...pool]);
  return c.slice(0, i) + ch + c.slice(i + 1);
}
function buildReceive(): Built {
  const slip = new Set<string>();
  while (slip.size < 3) slip.add(code3());
  const codes = [...slip];
  const right = { id: rid(), codes: shuffle(codes) };
  const decoys = [0, 1, 2].map((i) => ({ id: rid(), codes: shuffle(codes.map((c, j) => (j === i ? nearMiss(c) : c))) }));
  return {
    data: {
      taskId: 'receive_package',
      prompt: 'Đối chiếu 3 mã trên phiếu nhận với các thùng trong kho, chọn đúng thùng khớp cả ba.',
      slip: codes,
      boxes: shuffle([right, ...decoys]),
    },
    expected: right.id,
    minMs: 2500,
  };
}

// ------------------------------------------------------------------ check_seal
function buildSeal(): Built {
  const motto = 'CRAB';
  const pieces = [...motto].map((glyph) => ({ id: rid(), rot: randInt(0, 3), glyph }));
  if (pieces.every((p) => p.rot === 0)) pieces[randInt(0, 3)].rot = randInt(1, 3);
  return {
    data: { taskId: 'check_seal', prompt: 'Xoay các mảnh tem cho thẳng để đọc được dấu niêm phong — không được mở thùng!', pieces, motto },
    expected: Object.fromEntries(pieces.map((p) => [p.id, p.rot])),
    minMs: 2000,
  };
}
function verifySeal(rots: Record<string, number>, a: unknown) {
  if (!isObj(a)) return false;
  const ids = Object.keys(rots);
  if (Object.keys(a).length !== ids.length) return false;
  return ids.every((id) => isInt(a[id]) && (a[id] as number) >= 0 && ((a[id] as number) + rots[id]) % 4 === 0);
}

// ------------------------------------------------------------------ decode_address
const ADDR = {
  hem: ['42/7', '42/3', '42/9', '24/7'],
  landmark: ['tiệm sửa xe', 'xe bánh mì', 'tiệm tạp hoá', 'quán cà phê cóc'],
  door: ['cửa xanh', 'cửa đỏ', 'cửa vàng', 'cửa sắt kéo'],
  extra: ['bình trà đá', 'chậu bông giấy', 'lồng chim', 'con chó vàng'],
} as const;
type Attr = keyof typeof ADDR;
const ATTRS = Object.keys(ADDR) as Attr[];
const cardLines = (a: Record<Attr, string>) => [`Hẻm ${a.hem}`, `Gần ${a.landmark}`, `Nhà ${a.door}`, `Trước nhà có ${a.extra}`];
function buildAddress(): Built {
  const right = Object.fromEntries(ATTRS.map((k) => [k, pick(ADDR[k])])) as Record<Attr, string>;
  const decoys = sample(ATTRS, 3).map((k) => ({ ...right, [k]: pick(ADDR[k].filter((v) => v !== right[k])) }));
  const rightCard = { id: rid(), lines: cardLines(right) };
  const messages = shuffle([
    { from: 'Khách', text: `Vô hẻm ${right.hem} nha em.` },
    { from: 'Khách', text: `Chạy qua ${right.landmark} là gần tới.` },
    { from: 'Khách', text: `Nhà ${right.door} đó.` },
    { from: 'Khách', text: `Trước nhà có ${right.extra}, dễ thấy lắm.` },
  ]);
  messages.splice(randInt(1, messages.length), 0, { from: 'Chủ quán', text: 'Nhà có cửa xanh? Trong hẻm này mười hai nhà cửa xanh!' });
  return {
    data: {
      taskId: 'decode_address',
      prompt: 'Ghép các mẩu tin nhắn của khách thành địa chỉ, rồi chọn đúng thẻ địa chỉ.',
      messages,
      cards: shuffle([rightCard, ...decoys.map((d) => ({ id: rid(), lines: cardLines(d) }))]),
    },
    expected: rightCard.id,
    minMs: 3000,
  };
}

// ------------------------------------------------------------------ plan_route
const ROUTE_W = 7;
const ROUTE_H = 5;
const N4 = [
  [1, 0],
  [0, 1],
  [0, -1],
  [-1, 0],
] as const;
const inGrid = (p: Pt) => p.x >= 0 && p.y >= 0 && p.x < ROUTE_W && p.y < ROUTE_H;
const around = (p: Pt) => N4.map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy })).filter(inGrid);

/**
 * A random "induced" path: no cell touches an earlier path cell except its predecessor,
 * so the corridor never offers a shortcut and has exactly one way through.
 */
function inducedPath(start: Pt, end: Pt): Pt[] | null {
  const path: Pt[] = [start];
  const on = new Set([key(start)]);
  let budget = 4000;
  const dfs = (): boolean => {
    if (--budget < 0) return false;
    const cur = path.at(-1)!;
    if (cur.x === end.x && cur.y === end.y) return path.length >= 9;
    for (const n of shuffle(around(cur))) {
      if (on.has(key(n))) continue;
      if (around(n).some((m) => on.has(key(m)) && key(m) !== key(cur))) continue;
      path.push(n);
      on.add(key(n));
      if (dfs()) return true;
      path.pop();
      on.delete(key(n));
    }
    return false;
  };
  return dfs() ? path : null;
}
function buildRoute(): Built {
  let path: Pt[] | null = null;
  let start: Pt = { x: 0, y: 0 };
  let end: Pt = { x: ROUTE_W - 1, y: 0 };
  while (!path) {
    start = { x: 0, y: randInt(0, ROUTE_H - 1) };
    end = { x: ROUTE_W - 1, y: randInt(0, ROUTE_H - 1) };
    path = inducedPath(start, end);
  }
  const inner = path.length - 2;
  const a = randInt(1, Math.floor(inner / 2));
  const b = randInt(a + 2, inner);
  const stops = [path[a], path[b]];
  const on = new Set(path.map(key));
  // a few free side pockets (lead nowhere) — each touches exactly one path cell and no other pocket
  const pockets = new Set<string>();
  for (let x = 0; x < ROUTE_W; x++)
    for (let y = 0; y < ROUTE_H; y++) {
      const c = { x, y };
      if (on.has(key(c)) || pockets.size >= 3 || Math.random() < 0.6) continue;
      const nb = around(c);
      if (nb.filter((m) => on.has(key(m))).length === 1 && !nb.some((m) => pockets.has(key(m)))) pockets.add(key(c));
    }
  const rest = shuffle(
    Array.from({ length: ROUTE_W * ROUTE_H }, (_, i) => ({ x: i % ROUTE_W, y: Math.floor(i / ROUTE_W) })).filter(
      (c) => !on.has(key(c)) && !pockets.has(key(c)),
    ),
  );
  const nFlood = Math.max(1, Math.ceil(rest.length * 0.6));
  const flooded = rest.slice(0, nFlood);
  const deadEnds = rest.slice(nFlood);
  return {
    data: {
      taskId: 'plan_route',
      prompt: 'Vẽ tuyến từ bãi xe tới hẻm cuối, đi qua các điểm bắt buộc theo thứ tự, tránh đường ngập và hẻm cụt.',
      w: ROUTE_W,
      h: ROUTE_H,
      start,
      end,
      stops,
      flooded,
      deadEnds,
    },
    expected: { start, end, stops, blocked: [...flooded, ...deadEnds].map(key) },
    minMs: 3500,
  };
}
function verifyRoute(e: { start: Pt; end: Pt; stops: Pt[]; blocked: string[] }, a: unknown) {
  if (!Array.isArray(a) || a.length < 2 || !a.every(isPt)) return false;
  const path = a as Pt[];
  if (key(path[0]) !== key(e.start) || key(path.at(-1)!) !== key(e.end)) return false;
  const blocked = new Set(e.blocked);
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (!inGrid(c) || blocked.has(key(c)) || seen.has(key(c))) return false;
    if (i > 0 && Math.abs(c.x - path[i - 1].x) + Math.abs(c.y - path[i - 1].y) !== 1) return false;
    seen.add(key(c));
  }
  let at = 0;
  for (const s of e.stops) {
    const i = path.findIndex((c, j) => j >= at && key(c) === key(s));
    if (i < 0) return false;
    at = i + 1;
  }
  return true;
}

// ------------------------------------------------------------------ prepare_bike
function buildBike(): Built {
  const perPump = randInt(6, 9);
  const max = 60;
  const lo = randInt(30, 40);
  const green: [number, number] = [lo, lo + perPump + 2];
  const straps = shuffle([1, 2, 3, 4].map((n) => ({ id: rid(), n })));
  return {
    data: { taskId: 'prepare_bike', prompt: 'Bơm lốp tới vùng xanh, rồi siết dây chằng theo đúng số thứ tự.', perPump, green, max, straps },
    expected: { perPump, green, max, order: [...straps].sort((a, b) => a.n - b.n).map((s) => s.id) },
    minMs: 3000,
  };
}
function verifyBike(e: { perPump: number; green: [number, number]; max: number; order: string[] }, a: unknown) {
  if (!isObj(a) || !isInt(a.pumps) || !Array.isArray(a.order)) return false;
  const psi = (a.pumps as number) * e.perPump;
  if (psi < e.green[0] || psi > e.green[1] || psi > e.max) return false;
  const order: unknown[] = a.order;
  return order.length === e.order.length && e.order.every((id, i) => order[i] === id);
}

// ------------------------------------------------------------------ pack_disguise
const PACK = {
  boxes: ['Thùng mì gói', 'Thùng bánh trung thu', 'Thùng sữa hộp', 'Thùng nước mắm'],
  labels: ['HÀNG DỄ VỠ', 'Quà biếu', 'Đồ khô', 'Sách cũ'],
  layers: ['Giấy báo cũ', 'Xốp hơi', 'Bìa carton', 'Áo mưa cũ', 'Mút xốp'],
};
const opts = (names: string[]) => names.map((name) => ({ id: rid(), name }));
function buildPack(): Built {
  const boxes = opts(PACK.boxes);
  const labels = opts(PACK.labels);
  const layers = opts(PACK.layers);
  const box = pick(boxes);
  const label = pick(labels);
  const stack = sample(layers, 3);
  return {
    data: {
      taskId: 'pack_disguise',
      prompt: 'Đóng gói theo đúng mẫu khách dặn: thùng ngoài, nhãn dán, và lớp chống sốc từ dưới lên.',
      note: [`Thùng ngoài: ${box.name}.`, `Dán nhãn: “${label.name}”.`, `Lót từ dưới lên: ${stack.map((l) => l.name).join(' → ')}.`, 'Đừng ghi gì thêm. Càng bình thường càng tốt.'],
      boxes: shuffle(boxes),
      labels: shuffle(labels),
      layers: shuffle(layers),
      layerCount: stack.length,
    },
    expected: { box: box.id, label: label.id, layers: stack.map((l) => l.id) },
    minMs: 3000,
  };
}
function verifyPack(e: { box: string; label: string; layers: string[] }, a: unknown) {
  if (!isObj(a) || !Array.isArray(a.layers)) return false;
  const layers: unknown[] = a.layers;
  return a.box === e.box && a.label === e.label && layers.length === e.layers.length && e.layers.every((id, i) => layers[i] === id);
}

// ------------------------------------------------------------------ confirm_recipient
const PHRASES = ['không biết gì hết', 'trời mưa nhớ mang áo mưa', 'cà phê không đường', 'hủ tiếu gõ hai cái'];
const NAMES = ['Anh Tư', 'Chị Hai', 'Chú Sáu', 'Cô Ba', 'Anh Năm', 'Bé Út'];
const otherCode = (c: string) => {
  let o = c;
  while (o === c) o = c.slice(0, 3) + randInt(0, 9);
  return o;
};
function buildConfirm(ctx: TaskCtx): Built {
  const code = ctx.handoffCode;
  const phrase = PHRASES[0];
  const wrongPhrase = () => pick(PHRASES.slice(1));
  const names = sample(NAMES, 4);
  const right = { id: rid(), name: names[0], code4: code, phrase };
  const callers = [
    right,
    { id: rid(), name: names[1], code4: code, phrase: wrongPhrase() },
    { id: rid(), name: names[2], code4: otherCode(code), phrase },
    { id: rid(), name: names[3], code4: otherCode(code), phrase: wrongPhrase() },
  ];
  return {
    data: {
      taskId: 'confirm_recipient',
      prompt: 'Đối chiếu 4 số cuối mã nhận và câu mật khẩu trong tin nhắn khách với người gọi tới.',
      message: `Người nhận đọc đúng 4 số cuối ${code} và mật khẩu “${phrase}”. Nhớ mã này — lúc bàn giao cần nhập.`,
      callers: shuffle(callers),
    },
    expected: right.id,
    minMs: 2500,
  };
}

// ------------------------------------------------------------------ handoff_package
function buildHandoff(ctx: TaskCtx): Built {
  return {
    data: {
      taskId: 'handoff_package',
      prompt: 'Thùng đã tới điểm giao. Nhập mã nhận đã xác minh để bàn giao Cuốc Cuối.',
      message: `Tin nhắn đã ghim ở quán nước: “Mã nhận ${ctx.handoffCode}. Giao xong nhớ đánh giá năm sao nha!”`,
      digits: ctx.handoffCode.length,
    },
    expected: ctx.handoffCode,
    minMs: 1500,
  };
}

// ------------------------------------------------------------------ map content
const BUILDERS: Record<TaskId, (ctx: TaskCtx) => Built> = {
  receive_package: buildReceive,
  check_seal: buildSeal,
  decode_address: buildAddress,
  plan_route: buildRoute,
  prepare_bike: buildBike,
  pack_disguise: buildPack,
  confirm_recipient: buildConfirm,
  handoff_package: buildHandoff,
};

export const GAME_CONTENT: MapContent = {
  funFacts: FUN_FACTS,
  buildTask(taskId, ctx) {
    const build = BUILDERS[taskId as TaskId];
    if (!build) return null;
    return { ...build(ctx), fact: TASK_FACTS[taskId], done: TASK_DONE[taskId] };
  },
  verifyTask(p: Pending, a: unknown) {
    if (Date.now() - p.openedAt < (p.minMs ?? 0)) return false;
    const e = p.expected as never;
    switch (p.taskId as TaskData['taskId']) {
      case 'receive_package':
      case 'decode_address':
      case 'confirm_recipient':
        return typeof a === 'string' && a === p.expected;
      case 'check_seal':
        return verifySeal(e, a);
      case 'plan_route':
        return verifyRoute(e, a);
      case 'prepare_bike':
        return verifyBike(e, a);
      case 'pack_disguise':
        return verifyPack(e, a);
      case 'handoff_package':
        return isObj(a) && a.code === p.expected;
      default:
        return false;
    }
  },
};
