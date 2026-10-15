import type { TlTaskId } from '@hidden-truth/shared';

/** One short folk line per task, shown on the completion card (only lines checked against published sources). */
type Quote = { vi: string; en: string; src: string; srcEn: string };

export const QUOTES: Partial<Record<TlTaskId, Quote>> = {
  task_banh_chung: {
    vi: 'Thịt mỡ, dưa hành, câu đối đỏ,\nCây nêu, tràng pháo, bánh chưng xanh.',
    en: 'Fat pork, pickled onions, red couplets,\nthe Tết pole, firecrackers, green bánh chưng.',
    src: 'Câu đối Tết dân gian',
    srcEn: 'Traditional Tết couplet',
  },
  task_cau_doi: {
    vi: 'Phúc như Đông Hải,\nThọ tỷ Nam Sơn.',
    en: 'Blessings as vast as the Eastern Sea,\nlife as long as the Southern Mountain.',
    src: 'Câu đối chúc Tết (福如東海 · 壽比南山)',
    srcEn: 'New Year couplet (福如東海 · 壽比南山)',
  },
  task_cay_neu: {
    vi: 'Cu kêu ba tiếng cu kêu,\nTrông mau tới Tết dựng nêu ăn chè.',
    en: 'The dove calls three times —\nhurry, Tết, so we raise the pole and eat sweet soup.',
    src: 'Ca dao',
    srcEn: 'Vietnamese folk verse',
  },
  task_ngu_qua: {
    vi: 'Cầu sung vừa đủ xài.',
    en: 'Pray for just enough to spend.',
    src: 'Câu nói về mâm ngũ quả miền Nam',
    srcEn: 'Southern five-fruit saying',
  },
  task_cho_chu: {
    vi: 'Nét chữ nết người.',
    en: 'Handwriting shows the person.',
    src: 'Tục ngữ',
    srcEn: 'Vietnamese proverb',
  },
};
