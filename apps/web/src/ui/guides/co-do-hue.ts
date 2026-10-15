import { l, type MapGuide } from './types';

const BAN_SOC = 'https://vi.wikipedia.org/wiki/L%E1%BB%85_Ban_S%C3%B3c';

export const HUE_GUIDE: MapGuide = {
  roles: {
    villager: {
      what: l('Một người trong đoàn chuẩn bị Lễ Ban Sóc. Bạn không có siêu năng lực — chỉ có đôi chân, đôi mắt và lá phiếu.', 'A member of the crew preparing the Calendar Ceremony. No powers — just your legs, your eyes and your vote.'),
      todo: [
        l('Chạy tới các vòng sáng vàng, hoàn thành nhiệm vụ văn hoá Huế của bạn.', 'Run to the golden rings and finish your Huế culture tasks.'),
        l('Tránh ở một mình với người đáng ngờ. Thấy thi thể thì bấm nút Báo cáo.', 'Avoid being alone with a suspect. Press the Report button when you find a body.'),
        l('Trong họp: nói bạn đã ở đâu, thấy ai, rồi bỏ phiếu.', 'In meetings: say where you were and who you saw, then vote.'),
      ],
      note: l('Nhiệm vụ của hồn ma vẫn được tính — kể cả khi bạn đã bị hạ gục.', 'Ghost tasks still count — even after you are killed.'),
    },
    guardian: {
      what: l('Giống Nghệ Nhân nhưng có MỘT lá chắn: lần đầu Âm Binh ra tay với bạn sẽ bị chặn.', 'Like an Artisan, but with ONE shield: the first attack on you is blocked.'),
      todo: [
        l('Làm nhiệm vụ như bình thường.', 'Do tasks as usual.'),
        l('Khi lá chắn cứu bạn, Âm Binh cũng biết — hãy báo cho mọi người ngay trong cuộc họp.', 'When the shield saves you, the Shadow knows too — tell everyone at the next meeting.'),
      ],
      note: l('Lá chắn chỉ dùng được một lần, sau đó bạn là người thường.', 'The shield works once, afterwards you are a normal crew member.'),
    },
    killer: {
      what: l('Kẻ sát nhân trà trộn trong đoàn. Hạ gục người khác để thắng.', 'The killer hiding in the crew. Take people down to win.'),
      todo: [
        l('Lại gần một người rồi bấm nút Hạ gục (có thời gian hồi).', 'Get close to someone and press the Kill button (it has a cooldown).'),
        l('Giả vờ làm nhiệm vụ để ngụy trang — nhiệm vụ của bạn không tính vào tiến độ. Câu giờ cho tới hết canh năm cũng là thắng.', 'Pretend to do tasks to blend in — yours do not count. Stalling until the fifth watch ends is also a win.'),
        l('Trong họp: nói dối khéo, đổ nghi ngờ sang người khác.', 'In meetings: lie smoothly and shift suspicion.'),
      ],
      note: l('Không thể hạ gục đồng bọn. Thắng khi số Âm Binh ≥ số Người Dân còn sống.', 'You cannot kill partners. Win when Shadows ≥ living villagers.'),
    },
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
    vi: { term: 'Lễ Ban Sóc', title: 'Xem giới thiệu về Lễ Ban Sóc', url: BAN_SOC },
    en: { term: 'Ban Sóc ceremony', title: 'About the Ban Sóc ceremony (Vietnamese Wikipedia)', url: BAN_SOC },
  },
};
