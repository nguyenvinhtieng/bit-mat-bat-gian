import type { MapGuide } from './types';
import { l } from './types';

export const GAME_GUIDE: MapGuide = {
  storyH: l('Câu chuyện', 'Story'),
  story: {
    vi: [
      'Hẻm 42, Sài Gòn. Mỗi tháng hội tài xế CRAB lén khui hụi ở quán cà phê cóc đầu hẻm.',
      'Tối nay có một tài xế mới xin vào hụi — nghe đồn là công an chìm.',
      'Ai cũng áo xanh nón bảo hiểm, chẳng ai phân biệt được.',
      'Chạy cuốc góp đủ quỹ hụi trước khi trời sáng, và tìm ra công an chìm trước khi cả hội bị mời lên phường!',
    ],
    en: [
      'Alley 42, Saigon. Every month the CRAB drivers hold a secret hụi night at the sidewalk coffee stall.',
      'Tonight a new driver joins the circle — rumour says they are an undercover cop.',
      'Everyone wears the same green jacket and helmet — impossible to tell who is who.',
      'Finish errands, fill the hụi fund before daybreak, and expose the cop before the whole crew gets hauled to the ward office!',
    ],
  },
  roles: {
    villager: l(
      'Chạy cuốc, làm nhiệm vụ, góp quỹ hụi và bỏ phiếu khi họp. Để ý ai làm việc giả hoặc bỏ xe lại bất thường.',
      'Run rides, do tasks, fund the hụi, and vote in meetings. Watch for fake work or abandoned bikes.',
    ),
    guardian: l(
      'Phe tài xế — lần đầu bị công an chìm mời lên phường, bạn quẹo hẻm thoát được một lần (cả hai cùng biết).',
      'Crew faction — the first time the undercover cop invites you to the ward, you slip away once (both of you know).',
    ),
    killer: l(
      'Công an chìm: lại gần và mời từng người lên phường. Giả vờ chạy cuốc, đừng để ai thấy.',
      'Undercover cop: get close and invite players to the ward. Fake errands and stay out of sight.',
    ),
  },
};
