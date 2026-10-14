/**
 * HOST-ONLY content for map `co-do-hue` (answers never leave the server).
 * Every task is a short mini-game about Huế culture (cuisine, heritage, gates, lanterns, poetry).
 */
import type { TaskData, TaskId } from '@hidden-truth/shared';

const shuffle = <T>(arr: readonly T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sample = <T>(arr: readonly T[], n: number) => shuffle(arr).slice(0, n);

const HUE_DISHES = ['Bún bò Huế', 'Bánh bèo', 'Bánh nậm', 'Bánh bột lọc', 'Cơm hến', 'Chè hạt sen', 'Bánh ram ít'];
const OTHER_DISHES = ['Cao lầu (Hội An)', 'Mì Quảng (Quảng Nam)', 'Hủ tiếu Mỹ Tho', 'Bún chả (Hà Nội)', 'Bánh cuốn Thanh Trì', 'Phở cuốn (Hà Nội)'];

const GATES = ['Kỳ Đài', 'Ngọ Môn', 'Điện Thái Hòa', 'Tử Cấm Thành'];
const LANTERNS = ['Đèn sen', 'Đèn cá chép', 'Đèn rồng', 'Đèn hoa mai', 'Đèn lồng đỏ', 'Đèn ông sao'];

type Quiz = { q: string; a: string; wrong: string[]; fact: string };
const HAT_QUIZ: Quiz[] = [
  {
    q: 'Gió đưa cành trúc la đà / Tiếng chuông ___ canh gà Thọ Xương',
    a: 'Thiên Mụ',
    wrong: ['Báo Quốc', 'Từ Đàm', 'Diệu Đế'],
    fact: 'Chùa Thiên Mụ bên sông Hương là một trong những biểu tượng của Huế.',
  },
  {
    q: 'Nón bài thơ nổi tiếng là đặc sản của vùng nào?',
    a: 'Huế',
    wrong: ['Hội An', 'Cần Thơ', 'Đà Lạt'],
    fact: 'Nón bài thơ Huế mỏng, nhẹ; khi soi lên ánh sáng có thể thấy hình ảnh hoặc câu thơ giữa hai lớp lá.',
  },
  {
    q: 'Điểm đặc biệt của nón bài thơ là gì?',
    a: 'Có hình và câu thơ lồng giữa hai lớp lá',
    wrong: ['Làm bằng sắt mỏng', 'Chỉ dùng trong lễ cưới', 'Không có quai nón'],
    fact: 'Người thợ ép hình/câu thơ giữa hai lớp lá nên chỉ thấy rõ khi giơ nón lên ánh sáng.',
  },
  {
    q: 'Dòng sông thơ mộng chảy qua trung tâm thành phố Huế là sông nào?',
    a: 'Sông Hương',
    wrong: ['Sông Hồng', 'Sông Hàn', 'Sông Tiền'],
    fact: 'Sông Hương (Perfume River) gắn liền với cảnh sắc và đời sống văn hoá Huế.',
  },
];
const HERITAGE_QUIZ: Quiz[] = [
  {
    q: 'Quần thể di tích Cố đô Huế được UNESCO công nhận là Di sản Văn hoá Thế giới vào năm nào?',
    a: '1993',
    wrong: ['1975', '2003', '2010'],
    fact: 'Quần thể di tích Cố đô Huế được UNESCO ghi danh năm 1993.',
  },
  {
    q: 'Loại hình nghệ thuật cung đình nào của Huế được UNESCO ghi danh?',
    a: 'Nhã nhạc',
    wrong: ['Chèo', 'Hát xoan', 'Cải lương'],
    fact: 'Nhã nhạc cung đình Huế là âm nhạc dùng trong các nghi lễ triều Nguyễn.',
  },
  {
    q: 'Mộc bản triều Nguyễn thuộc chương trình nào của UNESCO?',
    a: 'Ký ức Thế giới',
    wrong: ['Công viên địa chất', 'Khu dự trữ sinh quyển', 'Di sản thiên nhiên'],
    fact: 'Mộc bản triều Nguyễn là tư liệu khắc trên gỗ, được UNESCO ghi vào Chương trình Ký ức Thế giới.',
  },
  {
    q: 'Triều đại phong kiến cuối cùng của Việt Nam, đóng đô ở Huế, là triều nào?',
    a: 'Nhà Nguyễn',
    wrong: ['Nhà Lý', 'Nhà Trần', 'Nhà Lê'],
    fact: 'Triều Nguyễn (1802–1945) đặt kinh đô tại Huế.',
  },
  {
    q: 'Ngọ Môn là cổng chính phía nam của công trình nào?',
    a: 'Hoàng Thành (Đại Nội) Huế',
    wrong: ['Văn Miếu', 'Chùa Một Cột', 'Thành nhà Hồ'],
    fact: 'Ngọ Môn là cổng chính của Hoàng Thành Huế, nơi diễn ra nhiều nghi lễ triều đình.',
  },
  {
    q: 'Món ăn nổi tiếng nào sau đây xuất xứ từ Huế?',
    a: 'Bún bò Huế',
    wrong: ['Cao lầu', 'Bún chả', 'Hủ tiếu Nam Vang'],
    fact: 'Bún bò Huế cay thơm, là món ăn tiêu biểu của ẩm thực xứ Huế.',
  },
];

export const FUN_FACTS = [
  'Quần thể di tích Cố đô Huế được UNESCO công nhận là Di sản Văn hoá Thế giới năm 1993.',
  'Nhã nhạc cung đình Huế là loại hình âm nhạc lễ nghi của triều Nguyễn, được UNESCO ghi danh.',
  'Nón bài thơ Huế mỏng và nhẹ; soi lên ánh sáng có thể thấy hình hoặc câu thơ giữa hai lớp lá.',
  'Mộc bản triều Nguyễn là những bản khắc gỗ lưu giữ tư liệu của triều đình, thuộc Chương trình Ký ức Thế giới của UNESCO.',
  'Ẩm thực Huế nổi tiếng với những món nhỏ, tinh tế như bánh bèo, bánh nậm, bánh bột lọc và bún bò Huế.',
];

export type Pending = { taskId: TaskId; expected: unknown; openedAt: number; reward?: string };

/** Build mini-game data + the server-side expected answer. */
export function buildTask(taskId: TaskId): { data: TaskData; expected: unknown; fact?: string } {
  switch (taskId) {
    case 'task_hue_cuisine': {
      const good = sample(HUE_DISHES, 3);
      const bad = sample(OTHER_DISHES, 3);
      const all = shuffle([...good.map((label) => ({ label, hue: true })), ...bad.map((label) => ({ label, hue: false }))]).map((x, i) => ({ id: `d${i}`, ...x }));
      return {
        data: { taskId, prompt: 'Chọn TẤT CẢ các món đặc sản xứ Huế để dọn lên mâm cỗ đêm hội.', items: all.map(({ id, label }) => ({ id, label })) },
        expected: all.filter((x) => x.hue).map((x) => x.id).sort(),
      };
    }
    case 'task_woodblock':
      return {
        data: { taskId, prompt: 'Mộc bản triều Nguyễn là tư liệu khắc trên gỗ. Giữ nút để in hết một trang mộc bản.', holdMs: 2000 },
        expected: 2000,
        fact: 'Mộc bản triều Nguyễn thuộc Chương trình Ký ức Thế giới của UNESCO.',
      };
    case 'task_citadel_gates':
      return {
        data: { taskId, prompt: 'Dẫn đoàn khách đi từ ngoài vào trong Hoàng Thành — chọn đúng thứ tự các điểm đến:', sequence: GATES, options: shuffle(GATES) },
        expected: GATES,
      };
    case 'task_lanterns': {
      const seq = sample(LANTERNS, 4);
      return { data: { taskId, prompt: 'Thắp các chiếc đèn lồng theo đúng thứ tự trên bảng:', sequence: seq, options: shuffle(seq) }, expected: seq };
    }
    case 'task_conical_hat':
    case 'task_heritage_quiz': {
      const quiz = (taskId === 'task_conical_hat' ? HAT_QUIZ : HERITAGE_QUIZ)[Math.floor(Math.random() * (taskId === 'task_conical_hat' ? HAT_QUIZ : HERITAGE_QUIZ).length)];
      return {
        data: {
          taskId,
          prompt: taskId === 'task_conical_hat' ? 'Hoàn thành câu hỏi về nón bài thơ & ca dao xứ Huế:' : 'Trả lời câu đố về di sản Cố đô:',
          question: quiz.q,
          options: shuffle([quiz.a, ...quiz.wrong]),
        },
        expected: quiz.a,
        fact: quiz.fact,
      };
    }
  }
}
