import type { TaskId } from '@hidden-truth/shared';

/** One short folk line per task, shown on the completion card instead of a long fact block. */
type Quote = { vi: string; en: string; src: string; srcEn: string };

export const QUOTES: Partial<Record<TaskId, Quote>> = {
  task_moon_phase: {
    vi: 'Trông trời, trông đất, trông mây,\nTrông mưa, trông gió, trông ngày, trông đêm.',
    en: 'Watch the sky, the earth, the clouds,\nthe rain, the wind, the day and night.',
    src: 'Ca dao',
    srcEn: 'Vietnamese folk verse',
  },
  task_woodblock_print: {
    vi: 'Tháng Chạp là tháng trồng khoai,\nTháng Giêng trồng đậu, tháng Hai trồng cà.',
    en: 'The twelfth month for sweet potatoes,\nthe first for beans, the second for eggplant.',
    src: 'Ca dao nông lịch',
    srcEn: 'Farmer’s calendar verse',
  },
  task_ngo_mon_gates: {
    vi: 'Đường vô xứ Huế quanh quanh,\nNon xanh nước biếc như tranh họa đồ.',
    en: 'The road to Huế winds and winds,\nblue hills, green water, like a painted scroll.',
    src: 'Ca dao xứ Huế',
    srcEn: 'Huế folk verse',
  },
  task_court_ranks: {
    vi: 'Tiên học lễ, hậu học văn.',
    en: 'First learn the rites, then learn letters.',
    src: 'Tục ngữ',
    srcEn: 'Vietnamese proverb',
  },
  task_nha_nhac: {
    vi: 'Gió đưa cành trúc la đà,\nTiếng chuông Thiên Mụ, canh gà Thọ Xương.',
    en: 'The wind sways the bamboo boughs —\nThiên Mụ’s bell, the cockcrow of Thọ Xương.',
    src: 'Ca dao xứ Huế',
    srcEn: 'Huế folk verse',
  },
  task_cuu_dinh: {
    vi: 'Uống nước nhớ nguồn.',
    en: 'When you drink water, remember its source.',
    src: 'Tục ngữ',
    srcEn: 'Vietnamese proverb',
  },
  task_poem_wall: {
    vi: 'Nhất tự vi sư, bán tự vi sư.',
    en: 'Who teaches you one word — even half a word — is your teacher.',
    src: 'Thành ngữ Hán Việt',
    srcEn: 'Sino-Vietnamese saying',
  },
  task_royal_seal: {
    vi: 'Quân tử nhất ngôn, tứ mã nan truy.',
    en: 'A gentleman’s word, once spoken, four horses cannot catch.',
    src: 'Thành ngữ Hán Việt',
    srcEn: 'Sino-Vietnamese saying',
  },
  task_banh_beo: {
    vi: 'Học ăn, học nói, học gói, học mở.',
    en: 'Learn to eat, to speak, to wrap, to unwrap.',
    src: 'Tục ngữ',
    srcEn: 'Vietnamese proverb',
  },
};
