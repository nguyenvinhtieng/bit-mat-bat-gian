/**
 * HOST-ONLY content for map `co-do-hue` — "Năm Canh Trước Bình Minh" (Đêm Ban Sóc).
 * Every task is a mini-game that prepares the Ban Sóc (calendar-granting) ceremony at Ngọ Môn.
 * Answers / checks never leave the server: buildTask() returns the client payload + what to verify.
 */
import type { GateTraveler, PoemKind, TaskData, TaskId } from '@hidden-truth/shared';

const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = <T>(arr: readonly T[], n: number) => shuffle(arr).slice(0, n);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const rid = () => Math.random().toString(36).slice(2, 8);

/** Heritage card shown after each task: a short headline + an explanation (facts checked against press / UNESCO sources). */
export const TASK_FACTS: Record<TaskId, { headline: string; text: string }> = {
  task_moon_phase: {
    headline: 'Sóc, Vọng và cuốn lịch của triều Nguyễn',
    text: '“Sóc” là ngày trăng non — mồng Một âm lịch; “Vọng” là ngày trăng tròn — ngày Rằm. Mỗi năm, Khâm Thiên Giám (cơ quan thiên văn của triều đình) tính tuần trăng và tiết khí để soạn lịch năm mới. Từ năm 1812, lịch triều Nguyễn mang tên “Hiệp Kỷ”.',
  },
  task_woodblock_print: {
    headline: 'Mộc bản — khắc ngược, in xuôi',
    text: 'Chữ trên ván gỗ phải khắc ngược như ảnh trong gương thì in lên giấy mới thành chữ xuôi. Lịch triều Nguyễn cũng được in bằng ván khắc trên giấy dó. Kho Mộc bản triều Nguyễn với hơn 34.000 tấm ván là Di sản tư liệu thế giới (UNESCO, 2009).',
  },
  task_ngo_mon_gates: {
    headline: 'Năm lối đi của Ngọ Môn',
    text: 'Ngọ Môn — cổng chính phía nam Hoàng thành Huế, xây năm 1833 thời Minh Mạng — có 5 lối đi. Cửa giữa chỉ dành cho nhà vua; Tả Giáp Môn và Hữu Giáp Môn cho quan văn, quan võ; hai cửa ngoài cùng (Tả Dịch, Hữu Dịch) cho lính hầu, voi và ngựa. Từ năm 1840, Lễ Ban Sóc được cử hành trước Ngọ Môn.',
  },
  task_court_ranks: {
    headline: 'Bia phẩm sơn trên sân chầu',
    text: 'Sân Đại Triều Nghi trước điện Thái Hòa có hai hàng bia đá nhỏ gọi là phẩm sơn, đánh dấu chỗ đứng của bá quan theo phẩm hàm. Quan văn đứng bên tả (phía đông), quan võ bên hữu (phía tây); phẩm càng cao càng đứng gần điện. Miếng thêu trước ngực áo (bổ tử) cho biết văn hay võ: văn thêu chim, võ thêu thú.',
  },
  task_nha_nhac: {
    headline: 'Nhã nhạc cung đình Huế',
    text: 'Nhã nhạc là âm nhạc trang trọng dùng trong các đại lễ của triều Nguyễn như lễ tế, lễ đăng quang hay buổi chầu. Năm 2003, UNESCO công nhận Nhã nhạc cung đình Huế là Kiệt tác truyền khẩu và phi vật thể của nhân loại — di sản phi vật thể đầu tiên của Việt Nam được ghi danh.',
  },
  task_cuu_dinh: {
    headline: 'Cửu Đỉnh — “bách khoa thư” bằng đồng',
    text: 'Cửu Đỉnh là 9 chiếc đỉnh đồng đúc từ cuối năm 1835 đến giữa năm 1837 thời Minh Mạng, đặt trước Thế Miếu. Mỗi đỉnh mang một tên riêng (Cao, Nhân, Chương…) và có 17 hình đúc nổi: núi sông, chim thú, cây cỏ, thuyền bè, vũ khí… Lớn nhất là Cao Đỉnh, nặng hơn 2 tấn. Các hình đúc này là Di sản tư liệu thế giới khu vực Châu Á – Thái Bình Dương (UNESCO, 2024).',
  },
  task_poem_wall: {
    headline: '“Nhất thi nhất họa” trên tường điện',
    text: 'Trên nhiều cung điện Huế, các ô thơ chữ Hán được đặt xen kẽ với ô tranh theo lối “nhất thi nhất họa” — một ô thơ, một ô tranh, thường cùng đề tài. Thơ văn trên kiến trúc cung đình Huế là Di sản tư liệu thế giới khu vực Châu Á – Thái Bình Dương (UNESCO, 2016).',
  },
  task_royal_seal: {
    headline: 'Ấn son và Châu bản triều Nguyễn',
    text: 'Văn bản của triều đình được đóng ấn son để xác nhận giá trị. Những văn bản hành chính có lời phê bằng mực son của nhà vua (châu phê) được gọi là Châu bản triều Nguyễn — Di sản tư liệu thế giới khu vực Châu Á – Thái Bình Dương (UNESCO, 2014).',
  },
  task_banh_beo: {
    headline: 'Bánh bèo chén xứ Huế',
    text: 'Bánh bèo chén là món bánh dân dã đặc trưng của Huế: bột gạo đổ vào chén sứ nhỏ đem hấp, rắc tôm chấy, thêm tóp mỡ, mỡ hành rồi chan nước mắm ngọt. Người Huế thường xúc ăn ngay trong chén bằng một que tre nhỏ.',
  },
};

/** Success line shown right after a task is solved. */
export const TASK_DONE: Record<TaskId, string> = {
  task_moon_phase: 'Ngày Sóc đã được định — Khâm Thiên Giám có thể soạn lịch.',
  task_woodblock_print: 'Tờ lịch đầu tiên đã ra khỏi ván khắc, chữ xuôi và rõ nét.',
  task_ngo_mon_gates: 'Đoàn rước đã đi đúng năm cửa Ngọ Môn.',
  task_court_ranks: 'Bá quan đã đứng ngay hàng theo phẩm hàm.',
  task_nha_nhac: 'Dàn Nhã nhạc đã hoà tấu trọn bài nghênh giá.',
  task_cuu_dinh: 'Đỉnh đồng đã sạch tro, các hình đúc nổi hiện rõ.',
  task_poem_wall: 'Tường “nhất thi nhất họa” đã được phục dựng.',
  task_royal_seal: 'Ấn son đã đóng ngay ngắn — lịch sẵn sàng để ban.',
  task_banh_beo: 'Mâm bánh bèo nóng hổi đã sẵn sàng đãi bá quan.',
};

export const FUN_FACTS = [
  'Lễ Ban Sóc — lễ ban lịch năm mới của triều Nguyễn — đã được Trung tâm Bảo tồn Di tích Cố đô Huế tái hiện trước Ngọ Môn trong những năm gần đây.',
  'Ngày xưa đêm được chia làm 5 canh; trống canh điểm báo giờ cho cả kinh thành.',
  'Quần thể di tích Cố đô Huế được UNESCO công nhận là Di sản Văn hoá Thế giới năm 1993.',
  'Nhã nhạc cung đình Huế được UNESCO công nhận năm 2003.',
  'Cửu Đỉnh trước Thế Miếu là 9 chiếc đỉnh đồng, mỗi chiếc mang tên một vị vua triều Nguyễn.',
  'Huế có nhiều di sản tư liệu được UNESCO ghi danh: Mộc bản, Châu bản, Thơ văn trên kiến trúc cung đình và các hình đúc trên Cửu Đỉnh.',
];

// ------------------------------------------------------------------ data pools
const GLYPHS = [
  { glyph: '朔', meaning: 'Sóc — ngày mồng Một' },
  { glyph: '曆', meaning: 'Lịch' },
  { glyph: '年', meaning: 'Niên — năm' },
  { glyph: '福', meaning: 'Phúc' },
];

/** Gates on screen, left -> right, as seen by someone standing outside (south) facing Ngọ Môn. */
const GATES: { name: string; for: string }[] = [
  { name: 'Hữu Dịch Môn', for: 'Lính · voi · ngựa' },
  { name: 'Hữu Giáp Môn', for: 'Quan võ' },
  { name: 'Ngọ Môn (cửa giữa)', for: 'Nhà vua' },
  { name: 'Tả Giáp Môn', for: 'Quan văn' },
  { name: 'Tả Dịch Môn', for: 'Lính · voi · ngựa' },
];
const GATE_RULE: Record<GateTraveler, number[]> = { vua: [2], vo: [1], van: [3], linh: [0, 4], voi: [0, 4], ngua: [0, 4] };

const RANK_NAMES = ['Nhất phẩm', 'Nhị phẩm', 'Tam phẩm'];

const INSTRUMENTS = [
  { id: 'trong', name: 'Trống' },
  { id: 'senh', name: 'Sênh tiền' },
  { id: 'nguyet', name: 'Đàn nguyệt' },
  { id: 'sao', name: 'Sáo trúc' },
];

const MOTIFS: Record<string, string> = {
  'mat-troi': 'Mặt trời',
  may: 'Mây',
  nui: 'Núi',
  song: 'Sông',
  thuyen: 'Thuyền',
  voi: 'Voi',
  ho: 'Hổ',
  chim: 'Chim',
  ca: 'Cá',
  hoa: 'Hoa',
  sung: 'Súng thần công',
  cay: 'Cây',
};
const URNS = ['Cao Đỉnh', 'Nhân Đỉnh', 'Chương Đỉnh', 'Anh Đỉnh', 'Nghị Đỉnh', 'Thuần Đỉnh', 'Tuyên Đỉnh', 'Dụ Đỉnh', 'Huyền Đỉnh'];

const THEMES: Record<string, { han: string; name: string }> = {
  sen: { han: '蓮', name: 'Sen' },
  nui: { han: '山', name: 'Núi' },
  thuyen: { han: '舟', name: 'Thuyền' },
  truc: { han: '竹', name: 'Trúc' },
  mai: { han: '梅', name: 'Mai' },
  trang: { han: '月', name: 'Trăng' },
};

const BANH_BEO_STEPS = [
  { id: 'bot', name: 'Đổ bột' },
  { id: 'hap', name: 'Hấp' },
  { id: 'tom', name: 'Tôm chấy' },
  { id: 'mo', name: 'Tóp mỡ' },
  { id: 'mam', name: 'Nước mắm' },
];

// ------------------------------------------------------------------ build + verify
export type Pending = { taskId: TaskId; expected: unknown; openedAt: number; reward?: { headline: string; text: string }; done?: string; minMs?: number };

type Built = { data: TaskData; expected: unknown; minMs: number };

export function buildTask(taskId: TaskId): Built & { fact: { headline: string; text: string }; done: string } {
  return { ...build(taskId), fact: TASK_FACTS[taskId], done: TASK_DONE[taskId] };
}

function build(taskId: TaskId): Built {
  switch (taskId) {
    case 'task_moon_phase': {
      const moons = Array.from({ length: 8 }, (_, phase) => ({ id: rid(), phase }));
      return {
        data: {
          taskId,
          prompt: 'Khâm Thiên Giám phải định đúng ngày Sóc để soạn lịch năm mới, nhưng Hắc Ảnh đã xáo trộn sổ chiêm nghiệm.',
          moons: shuffle(moons),
        },
        expected: moons.map((m) => m.id),
        minMs: 2500,
      };
    }
    case 'task_woodblock_print': {
      const g = pick(GLYPHS);
      const flips = ['none', 'mirror', 'flipV', 'rot180'] as const;
      const blocks = shuffle(flips.map((flip) => ({ id: rid(), flip })));
      return {
        data: {
          taskId,
          prompt: `Bản thảo lịch đã xong. Hãy in chữ ${g.glyph} (${g.meaning}) lên giấy dó để kịp phát cho bá quan.`,
          glyph: g.glyph,
          meaning: g.meaning,
          blocks,
        },
        expected: blocks.find((b) => b.flip === 'mirror')!.id,
        minMs: 3000,
      };
    }
    case 'task_ngo_mon_gates': {
      const crowd: GateTraveler[] = ['van', 'vo', 'linh', 'voi', 'ngua', 'van', 'vo', 'linh', 'ngua', 'voi'];
      const kinds: GateTraveler[] = shuffle(['vua', ...sample(crowd, 7)]);
      const travelers = kinds.map((kind) => ({ id: rid(), kind }));
      return {
        data: {
          taskId,
          prompt: 'Sáng mai đoàn rước sẽ qua Ngọ Môn. Diễn tập trước để không ai — kể cả voi và ngựa — đi nhầm cửa!',
          travelers,
          gates: GATES,
        },
        expected: kinds,
        minMs: 3000,
      };
    }
    case 'task_court_ranks': {
      const officials = (['van', 'vo'] as const).flatMap((side) => [1, 2, 3].map((rank) => ({ id: rid(), side, rank, name: RANK_NAMES[rank - 1] })));
      return {
        data: {
          taskId,
          prompt: 'Hắc Ảnh đã làm rối hàng chầu trước điện Thái Hòa. Hãy đưa bá quan về đúng chỗ trước giờ thiết triều.',
          officials: shuffle(officials),
        },
        expected: Object.fromEntries(officials.map((o) => [`${o.side}-${o.rank}`, o.id])),
        minMs: 2500,
      };
    }
    case 'task_nha_nhac': {
      const sequence = Array.from({ length: 5 }, () => pick(INSTRUMENTS).id);
      return {
        data: {
          taskId,
          prompt: 'Bản tổng phổ bài nghênh giá bị xé lẫn. Dàn nhạc cần dượt lại trước giờ lễ.',
          instruments: INSTRUMENTS,
          sequence,
        },
        expected: sequence,
        minMs: 3500,
      };
    }
    case 'task_cuu_dinh': {
      const motifs = sample(Object.keys(MOTIFS), 9);
      const cells = motifs.map((motif) => ({ id: rid(), motif, name: MOTIFS[motif] }));
      const targets = sample(cells, 3);
      return {
        data: {
          taskId,
          prompt: 'Hắc Ảnh đã phủ tro lên Cửu Đỉnh trước Thế Miếu. Lau sạch để kiểm tra các hình đúc nổi.',
          urn: pick(URNS),
          cells,
          targets: targets.map((c) => c.motif),
        },
        expected: targets.map((c) => c.id).sort(),
        minMs: 2500,
      };
    }
    case 'task_poem_wall': {
      const themes = sample(Object.keys(THEMES), 4);
      // 2 rows x 4 columns; each row = two (poem, painting) pairs, the second row starts with a painting.
      const full: { slot: number; kind: PoemKind; theme: string }[] = [];
      themes.forEach((theme, pair) => {
        const row = pair >> 1;
        const base = row * 4 + (pair & 1) * 2;
        const kinds: PoemKind[] = row === 0 ? ['tho', 'hoa'] : ['hoa', 'tho'];
        full.push({ slot: base, kind: kinds[0], theme }, { slot: base + 1, kind: kinds[1], theme });
      });
      // one missing panel per pair
      const missing = new Set(themes.map((_, pair) => full[pair * 2 + (Math.random() < 0.5 ? 0 : 1)].slot));
      const needed = full.filter((p) => missing.has(p.slot));
      const decoyTheme = Object.keys(THEMES).find((k) => !themes.includes(k))!;
      const decoys = [
        { kind: 'hoa' as PoemKind, theme: decoyTheme },
        { kind: 'tho' as PoemKind, theme: pick(Object.keys(THEMES).filter((k) => k !== decoyTheme && !themes.includes(k))) },
      ];
      const tray = shuffle([...needed.map((p) => ({ kind: p.kind, theme: p.theme })), ...decoys]).map((x) => ({ id: rid(), ...x }));
      return {
        data: {
          taskId,
          prompt: 'Hắc Ảnh đã gỡ mất 4 ô trên tường “nhất thi nhất họa” của điện Nội Các.',
          panels: full.map((p) => (missing.has(p.slot) ? { slot: p.slot } : p)),
          tray,
          themes: THEMES,
        },
        expected: { slots: Object.fromEntries(needed.map((p) => [p.slot, `${p.kind}:${p.theme}`])), tray: Object.fromEntries(tray.map((t) => [t.id, `${t.kind}:${t.theme}`])) },
        minMs: 2500,
      };
    }
    case 'task_royal_seal': {
      const target = { x: 0.3 + Math.random() * 0.4, y: 0.35 + Math.random() * 0.35 };
      return {
        data: {
          taskId,
          prompt: 'Lịch đã in xong, nhưng phải đóng ấn son thì mới được đem ban.',
          target,
          tolerance: 0.085,
          holdMs: 900,
        },
        expected: target,
        minMs: 1500,
      };
    }
    case 'task_banh_beo': {
      return {
        data: {
          taskId,
          prompt: 'Sau lễ, bá quan được đãi cỗ. Nhà bếp cần gấp 3 chén bánh bèo.',
          cups: 3,
          steps: BANH_BEO_STEPS,
        },
        expected: 3,
        minMs: 3000,
      };
    }
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Server-side check of a submitted answer. */
export function verifyTask(p: Pending, answer: unknown): boolean {
  const a = answer as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (Date.now() - p.openedAt < (p.minMs ?? 0)) return false;
  switch (p.taskId) {
    case 'task_moon_phase':
    case 'task_nha_nhac':
      return same(a, p.expected);
    case 'task_woodblock_print':
      return a?.block === p.expected;
    case 'task_ngo_mon_gates': {
      const kinds = p.expected as GateTraveler[];
      return Array.isArray(a) && a.length === kinds.length && kinds.every((k, i) => GATE_RULE[k].includes(Number(a[i])));
    }
    case 'task_court_ranks': {
      const exp = p.expected as Record<string, string>;
      return !!a && typeof a === 'object' && Object.keys(exp).every((slot) => a[slot] === exp[slot]);
    }
    case 'task_cuu_dinh':
      return Array.isArray(a) && same([...a].map(String).sort(), p.expected);
    case 'task_poem_wall': {
      const exp = p.expected as { slots: Record<string, string>; tray: Record<string, string> };
      if (!a || typeof a !== 'object') return false;
      const used = Object.values(a as Record<string, string>);
      if (new Set(used).size !== used.length) return false;
      return Object.entries(exp.slots).every(([slot, want]) => exp.tray[a[slot]] === want);
    }
    case 'task_royal_seal': {
      const t = p.expected as { x: number; y: number };
      return typeof a?.x === 'number' && typeof a?.y === 'number' && Math.hypot(a.x - t.x, a.y - t.y) <= 0.11;
    }
    case 'task_banh_beo':
      return Number(a?.cups) >= (p.expected as number);
  }
}

export { GATE_RULE };
