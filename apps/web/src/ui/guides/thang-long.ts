import { l, type MapGuide } from './types';

const GIAO_THUA = 'https://vi.wikipedia.org/wiki/Giao_th%E1%BB%ABa';

export const TL_GUIDE: MapGuide = {
  roles: {
    villager: l('Người Thăng Long đón giao thừa bên Hồ Gươm. Không có năng lực đặc biệt.', 'A Thăng Long local by Sword Lake on New Year’s Eve. No special powers.'),
    guardian: l('Thủ Từ Đền Ngọc Sơn, có MỘT lá bùa — chặn được lần ra tay đầu tiên của Quỷ.', 'Keeper of Ngọc Sơn Temple with ONE charm — blocks the first Demon attack.'),
    killer: l('Quỷ giả làm người đi chợ Tết, lén tiêu diệt người dân. Thắng khi số Quỷ ≥ số người còn sống.', 'A Demon posing as a Tết shopper, secretly taking out townsfolk. Wins when Demons ≥ living townsfolk.'),
  },
  storyH: l('Đêm Giao Thừa Hồ Gươm', 'New Year’s Eve by Sword Lake'),
  story: {
    vi: [
      'Thăng Long, đêm ba mươi Tết. Táo Quân đã về trời từ hôm hai ba, trần gian không còn thần giữ cửa, nên Quỷ nhân dịp lẻn vào.',
      'Người Thăng Long dựng cây nêu, rắc vòng vôi, gói bánh chưng, treo câu đối, bày mâm ngũ quả để làm lễ Trừ tịch: tiễn năm cũ và đuổi Quỷ ra khỏi đất người.',
      'Nhưng Quỷ đã đội lốt người, trà trộn giữa chợ Tết. Chúng chúc Tết, cười nói như ai, rồi lén xoá vòng vôi và hạ gục từng người.',
      'Lễ phải xong trước khi giao thừa điểm. Nếu không, Quỷ sẽ ở lại trần gian suốt năm mới.',
      'Hãy hoàn thành lễ, lật mặt Quỷ và đón giao thừa bên Hồ Gươm!',
    ],
    en: [
      'Thăng Long, the last night of the lunar year. The Kitchen Gods left for Heaven a week ago, the human world has no one guarding its door, and Demons have seized the chance to slip in.',
      'The people of Thăng Long raise the Tết pole, sprinkle the lime ring, wrap bánh chưng, hang couplets and arrange the five-fruit tray for the Year-End rite: seeing off the old year and driving the Demons out of the land of the living.',
      'But the Demons have taken human form and mingle in the Tết market. They trade greetings and laugh like anyone else — then secretly erase the lime ring and take people down one by one.',
      'The rite must be finished before midnight strikes. Otherwise, the Demons stay in the human world for the whole new year.',
      'Finish the rite, unmask the Demons and welcome the New Year by Sword Lake!',
    ],
  },
  storyLink: {
    vi: {
      term: 'Giao thừa',
      title: 'Xem giới thiệu về Giao thừa',
      url: GIAO_THUA,
    },
    en: {
      term: 'New Year',
      title: 'About Giao thừa (Vietnamese Wikipedia)',
      url: GIAO_THUA,
    },
  },
};
