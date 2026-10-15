import { l, type MapGuide } from './types';

const GIAO_THUA = 'https://vi.wikipedia.org/wiki/Giao_th%E1%BB%ABa';

export const TL_GUIDE: MapGuide = {
  roles: {
    villager: {
      what: l('Một người Thăng Long đang sửa soạn đón giao thừa bên Hồ Gươm. Bạn không có siêu năng lực — chỉ có đôi chân, đôi mắt và lá phiếu.', 'A Thăng Long local getting ready for New Year’s Eve by Sword Lake. No powers — just your legs, your eyes and your vote.'),
      todo: [
        l('Chạy tới các vòng sáng vàng: gói bánh chưng, xin chữ, dựng cây nêu… cho kịp giao thừa.', 'Run to the golden rings: wrap bánh chưng, ask for calligraphy, raise the Tết pole… before midnight.'),
        l('Tránh ở một mình với người đáng ngờ. Thấy thi thể thì bấm R để báo cáo.', 'Avoid being alone with a suspect. Press R when you find a body.'),
        l('Khi Quỷ xoá vòng vôi, cả bọn chạy tới rắc lại ngay — chậm là thua.', 'When a Demon erases the lime ring, rush over and sprinkle it back — too slow and you lose.'),
      ],
      note: l('Nhiệm vụ của hồn ma vẫn được tính — kể cả khi bạn đã bị hạ gục.', 'Ghost tasks still count — even after you are killed.'),
    },
    guardian: {
      what: l('Thủ Từ giữ Đền Ngọc Sơn, mang MỘT lá bùa hộ mệnh: lần đầu Quỷ ra tay với bạn sẽ bị chặn.', 'Keeper of Ngọc Sơn Temple, carrying ONE protective charm: the first attack on you is blocked.'),
      todo: [
        l('Làm nhiệm vụ như bình thường, đi tuần quanh Bờ Hồ.', 'Do tasks as usual and patrol the lakeside.'),
        l('Khi lá chắn cứu bạn, Quỷ cũng biết — hãy báo cho mọi người ngay trong cuộc họp.', 'When the shield saves you, the Demon knows too — tell everyone at the next meeting.'),
      ],
      note: l('Lá bùa chỉ dùng được một lần, sau đó bạn như người thường.', 'The charm works once, afterwards you are a normal townsperson.'),
    },
    killer: {
      what: l('Quỷ lẻn vào đất Thăng Long đêm ba mươi, giả làm người đi chợ Tết. Hạ gục người khác để thắng.', 'A Demon sneaking into Thăng Long on New Year’s Eve, posing as a Tết shopper. Take people down to win.'),
      todo: [
        l('Lại gần một người rồi bấm K / nút Hạ gục (có thời gian hồi).', 'Get close to someone and press K / the Kill button (it has a cooldown).'),
        l('Đốt pháo cho mọi người loá mắt, hoặc xoá vòng vôi để kéo cả đám chạy đi — không ai rắc lại kịp là bạn thắng.', 'Set off firecrackers to dazzle everyone, or erase the lime ring to drag the crowd away — if nobody sprinkles it back in time, you win.'),
        l('Giả vờ làm nhiệm vụ để ngụy trang. Câu giờ tới giao thừa cũng là thắng.', 'Pretend to do tasks to blend in. Stalling until midnight is also a win.'),
      ],
      note: l('Không thể hạ gục đồng bọn. Thắng khi số Quỷ ≥ số người còn sống.', 'You cannot kill partners. Win when Demons ≥ living townsfolk.'),
    },
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
    vi: { term: 'Giao thừa', title: 'Xem giới thiệu về Giao thừa', url: GIAO_THUA },
    en: { term: 'New Year', title: 'About Giao thừa (Vietnamese Wikipedia)', url: GIAO_THUA },
  },
};
