import { l, type MapGuide } from './types';

const BAN_SOC = 'https://vi.wikipedia.org/wiki/L%E1%BB%85_Ban_S%C3%B3c';

export const HUE_GUIDE: MapGuide = {
  roles: {
    villager: l('Người trong đoàn chuẩn bị Lễ Ban Sóc. Không có năng lực đặc biệt.', 'A crew member preparing the Calendar Ceremony. No special powers.'),
    guardian: l('Lính triều đình được cử đến hộ vệ đoàn. Có MỘT lá chắn — chặn được lần ra tay đầu tiên của Âm Binh.', 'A royal guard sent to protect the crew. Has ONE shield — blocks the first Shadow attack.'),
    killer: l('Kẻ sát nhân trà trộn trong đoàn, lén tiêu diệt Người Dân. Thắng khi số Âm Binh ≥ số người còn sống.', 'The killer hiding in the crew, secretly taking out villagers. Wins when Shadows ≥ living villagers.'),
  },
  storyH: l('Năm Canh Trước Bình Minh', 'Five Watches Before Dawn'),
  story: {
    vi: [
      'Đêm cuối tháng Mười Một tại kinh thành Huế.',
      'Sáng mai, triều đình cử hành Lễ Ban Sóc trước Ngọ Môn để ban lịch năm mới cho cả nước. Bá quan sẽ xếp hàng ngoài sân, dân chúng đứng chờ từ sớm, và từng cuốn lịch phải được trao tận tay khi trời vừa hửng sáng.',
      'Thợ in, nhạc công, nghệ nhân và lính Ngự Lâm đã thức suốt mấy đêm liền. Vậy mà việc vẫn còn ngổn ngang: trăng chưa xem xong để định ngày Sóc, mộc bản chưa in, ấn chưa đóng, Nhã nhạc chưa tập lại lần cuối, Cửu Đỉnh còn phủ bụi. Đoàn chỉ còn năm canh để lo cho xong mọi việc.',
      'Nhưng Âm Binh đã trà trộn vào đoàn. Chúng đi lại, nói cười, làm việc như mọi người. Chúng muốn kinh thành mắc kẹt mãi trong đêm cuối năm. Không có lịch, sẽ không ai biết hôm nay là ngày nào, và trời sẽ không bao giờ sáng.',
      'Đêm có năm canh, mỗi canh trống lại điểm báo giờ. Hết canh năm mà việc chưa xong thì trời sáng không có lịch — Âm Binh thắng.',
      'Hãy hoàn thành nhiệm vụ, lật mặt Âm Binh và đưa kinh thành tới bình minh!',
    ],
    en: [
      'The last night of the 11th lunar month in the Imperial City of Huế.',
      'At dawn the court will hold the Ban Sóc ceremony at the Meridian Gate to grant the new year’s calendar to the whole country. The mandarins will line up in the courtyard, crowds will gather early, and every calendar must be handed out as the sky begins to brighten.',
      'Printers, musicians, artisans and Royal Guards have been awake for nights on end. Yet so much is still undone: the moon has not been read to fix the new-moon day, the woodblocks are not printed, the seals are not stamped, the court music needs one last rehearsal, and dust still covers the Nine Urns. The crew has only five night watches left to get everything ready.',
      'But Shadows have slipped in among them. They walk, laugh and work like everyone else. They want the capital stuck in the old year’s last night forever. Without a calendar no one will know what day it is, and the sun will never rise.',
      'The night has five watches and the drum strikes each one. If the work is not done when the fifth watch ends, dawn comes without a calendar — the Shadows win.',
      'Finish your tasks, unmask the Shadows and lead the capital to dawn!',
    ],
  },
  storyLink: {
    vi: {
      term: 'Lễ Ban Sóc',
      title: 'Xem giới thiệu về Lễ Ban Sóc',
      url: BAN_SOC,
    },
    en: {
      term: 'Ban Sóc ceremony',
      title: 'About the Ban Sóc ceremony (Vietnamese Wikipedia)',
      url: BAN_SOC,
    },
  },
};
