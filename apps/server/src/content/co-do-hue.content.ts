/**
 * HOST-ONLY content for map `co-do-hue` (never shipped to the client bundle).
 * Source of truth: prompts/map/co-do-hue.md (variants HUE-A/B/C, host truth, clue checklist).
 * The bilingual paragraph is fictional, written in the style of a documentary text (see map doc).
 */
import type { Clue, DeviationType, RoleId, TaskId } from '@hidden-truth/shared';
import mapData from './co-do-hue.map.json' with { type: 'json' };

export type VariantId = 'HUE-A' | 'HUE-B' | 'HUE-C';

export const PARAGRAPH_V2 = {
  vi: [
    'Tư liệu này mô tả trình tự một buổi lễ trong không gian cung đình.',
    'Theo ghi chép, các bước được chuẩn bị từ sáng sớm.',
    'Nhiều chi tiết về trang phục được ghi lại trong tư liệu, nhưng chưa có đủ nguồn để xác định quy mô thực tế của buổi lễ.',
  ],
  en: [
    'This document describes the sequence of a ceremony within the palace grounds.',
    'According to the records, preparations began at dawn.',
    'Many details of the costumes are recorded in the documents, but there are not enough sources to determine the actual scale of the ceremony.',
  ],
};

type VariantContent = {
  id: VariantId;
  truth: { sentence: number; type: DeviationType; responsible: string; when: string };
  fake: string;
  summary: string;
  steps: string[];
  printed: { vi: string[]; en: string[] };
  meta: { id: string; title: string; body: string };
  metaQuestion: string;
  objectives: { forger: string; broker: string; investigation: string };
  /** secret objective checks against the team conclusion */
  secretGoal: { forger: Partial<{ type: DeviationType; responsible: string }>; broker: Partial<{ type: DeviationType; responsible: string }> };
  tasks: Record<TaskId, Omit<Clue, 'id' | 'source'>>;
  roles: Record<Exclude<RoleId, 'forger' | 'broker'>, Omit<Clue, 'id' | 'source'>>;
  brokerSecret: string;
};

const EN3_PROVEN =
  'Many details of the costumes are proven by the documents, confirming the grand scale of the ceremony.';

const common = {
  scan: {
    title: 'Bản quét thiếu footnote',
    art: 'hue-ui-scan-page',
  },
};

export const VARIANTS: Record<VariantId, VariantContent> = {
  'HUE-A': {
    id: 'HUE-A',
    truth: { sentence: 3, type: 'translation', responsible: 'tuan', when: 'night_before' },
    fake: '“Cố ý bịa để thu hút khách”',
    summary:
      'Đêm trước khai mạc, Anh Tuấn (Biên Dịch Viên) vội rút gọn câu 3 bản tiếng Anh và chọn nhầm từ đồng nghĩa: “recorded in” → “proven by”, kéo theo vế “confirming the grand scale”. Không ai cố ý bịa — đây là lỗi dịch khi vội, bản v3 được export và in mà không qua duyệt lại.',
    steps: [
      'Tuần trước: bản v2 được Ông Hòa góp ý — câu 3 tiếng Anh dùng “recorded in the documents”.',
      'Hai ngày trước: Chị Minh Giám nhận góp ý “dễ bán hơn” từ truyền thông, nhưng trả lời “giữ bản đã duyệt”.',
      'Đêm trước (23:10): Anh Tuấn rút gọn câu 3 tiếng Anh, chọn nhầm “proven by”, export FINAL_v3.',
      'Đêm trước (23:48): Em Vi in thử FINAL_v3 theo lịch, không đối chiếu với v2.',
      'Sáng sớm: bảng treo khớp v3; kho vẫn lưu v2 là “đã duyệt nội bộ”.',
    ],
    printed: { vi: [...PARAGRAPH_V2.vi], en: [PARAGRAPH_V2.en[0], PARAGRAPH_V2.en[1], EN3_PROVEN] },
    meta: {
      id: 'hue-clue-meta-code',
      title: 'Hồ Sơ Bị Khuyết — mã hồ sơ trùng',
      body: 'Ghi chú tay trong hộp cũ: “HUE-04 … trùng mã với một tài liệu của chương khác — không dùng cho công khai.” Ai đã cấp hai tài liệu cùng một mã?',
    },
    metaQuestion: 'Vì sao mã hồ sơ HUE-04 lại trùng với một tài liệu ở chương khác của dự án?',
    objectives: {
      investigation: 'Chỉ ra câu lệch, loại sai lệch, người chịu trách nhiệm chính và thời điểm — với ít nhất 3 manh mối được chia sẻ.',
      forger: 'Khiến nhóm kết luận đây là hành vi “cố ý bịa để thu hút khách”.',
      broker: 'Bảo vệ uy tín Biên Dịch Viên: nhóm KHÔNG được kết luận Anh Tuấn là người chịu trách nhiệm chính.',
    },
    secretGoal: { forger: { type: 'deliberate' }, broker: { responsible: '!tuan' } },
    tasks: {
      task_print_checklist: {
        title: 'Log máy in phòng biên tập',
        body: '23:48 — In thử 1 bản A1 từ “FINAL_v3.pdf” (tài khoản: bientap-chung, người bấm in: Em Vi).\n23:10 — File FINAL_v3 được export từ máy của Anh Tuấn.\nKhông có bản in nào từ v2 sau ngày duyệt.',
        art: 'hue-ui-checklist-paper',
      },
      task_scan_footnote: {
        ...common.scan,
        body: 'Bản quét trang 3 hồ sơ nghiên cứu HUE-04: footnote ¹ “Tư liệu chỉ ghi chép trang phục; chưa đủ nguồn xác định quy mô.” Bản in treo tường KHÔNG có footnote này.',
      },
      task_update_floor_plan: {
        title: 'Sổ ca đêm (sơ đồ gian)',
        body: 'Ca đêm trước khai mạc:\n• Anh Tuấn — phòng biên tập 22:00–00:30 (ghi chú: “rút gọn bản Anh cho vừa khung”).\n• Em Vi — in thử 23:30–00:10.\n• Chị Lan — khóa phòng lưu trữ 00:30.',
        art: 'hue-ui-floor-plan',
      },
      task_check_lights_labels: {
        title: 'Ảnh chụp bảng treo — 06:12 sáng',
        body: 'Ảnh có timestamp 06:12. Câu 3 bản tiếng Anh trên bảng: “…are proven by the documents, confirming the grand scale…”. Câu 3 bản tiếng Việt vẫn còn vế “chưa có đủ nguồn”.',
        art: 'hue-ui-photo-board',
      },
      task_seal_box: {
        title: 'Niêm phong hộp tư liệu',
        body: 'Số niêm 0417-HUE khớp phiếu bàn giao. Hộp chưa bị mở từ lúc nhập kho. (Hiện vật không có vấn đề. Giấy tờ mới là bí ẩn.)',
        art: 'hue-ui-seal-record',
      },
      task_return_shelf_a: {
        title: 'Phiếu mượn hộp Huế-04',
        body: 'Người mượn: Anh Tuấn — 21:30. Trả: 00:20. Mục đích: “đối chiếu từ ngữ bản Anh”.',
        art: 'hue-ui-loan-slip',
      },
    },
    roles: {
      historian: {
        title: 'Sử Gia — đối chiếu email duyệt',
        body: 'Email duyệt cuối: v2 được Ông Hòa duyệt 5 ngày trước. KHÔNG có email duyệt nào cho v3.\n23:10 đêm qua, Anh Tuấn gửi nhóm: “Mình rút gọn câu 3 bản Anh cho gọn, sáng mai anh Hòa xem lại nhé.”\n→ Kết quả: MÂU THUẪN — bản in (v3) chưa qua duyệt.',
        art: 'hue-ui-email-thread',
      },
      conservator: {
        title: 'Người Bảo Tồn — niêm phong hộp bản sao',
        body: 'Niêm phong hộp bản sao còn nguyên, số niêm khớp. Bản sao tư liệu không bị động tới.\n→ Kết quả: KHỚP. Sai lệch nằm ở file/bản in, không ở hiện vật.',
        art: 'hue-ui-seal-record',
      },
      local_guide: {
        title: 'Hướng Dẫn Viên — tour mẫu của Anh Phú',
        body: 'Trong tour mẫu, hướng dẫn viên luôn nói “theo ghi chép trong tư liệu”, không nói “đã được chứng minh” — vì tư liệu chỉ ghi lại, chưa đủ nguồn xác định quy mô.\nAnh Phú: “Recorded và proven khác nhau nhiều lắm. Người dịch vội rất dễ nhầm sắc thái.”',
        art: 'hue-ui-tour-script',
      },
      archivist: {
        title: 'Lưu Trữ Viên — diff intro_VI_EN_v2 ↔ bản in',
        body: 'Chỉ câu 3 bản tiếng Anh khác nhau. Bản tiếng Việt giống hệt v2.\nMetadata FINAL_v3: tác giả export “tuan.dich”, 23:10.',
        art: 'hue-ui-doc-diff-bg',
        diff: [
          { lang: 'EN · câu 3', before: PARAGRAPH_V2.en[2], after: EN3_PROVEN },
        ],
      },
    },
    brokerSecret:
      'Tin bạn đang giữ: Đại diện nhà tài trợ nhắn Chị Minh Giám “có câu nào hấp dẫn hơn không?”. Chị Minh Giám trả lời: “Giữ bản đã duyệt.” (Không ai yêu cầu Tuấn đổi từ.)',
  },

  'HUE-B': {
    id: 'HUE-B',
    truth: { sentence: 3, type: 'editing', responsible: 'thao', when: 'night_before' },
    fake: '“Dịch sai hoàn toàn”',
    summary:
      'Đêm trước khai mạc, Chị Thảo (điều phối in) rút câu 3 tiếng Việt cho vừa khổ bảng A1 — bỏ vế “nhưng chưa có đủ nguồn…”. Công cụ đồng bộ song ngữ tự cập nhật câu tiếng Anh theo mẫu, sinh ra “confirming the grand scale”. Bản dịch gốc của Anh Tuấn không sai.',
    steps: [
      'Tuần trước: v2 được duyệt — cả hai ngôn ngữ đều giữ vế “chưa đủ nguồn”.',
      'Hai ngày trước: truyền thông góp ý “dễ bán hơn”; Chị Minh Giám không đổi bản duyệt.',
      'Đêm trước (22:40): Chị Thảo mở hộp lấy khổ bảng, đo — đoạn giới thiệu dài quá khung A1.',
      'Đêm trước (23:41): Chị Thảo cắt vế sau câu 3 tiếng Việt; công cụ sync tạo câu tiếng Anh mới; export FINAL_v3.',
      'Đêm trước (23:48): in thử v3; sáng sớm bảng treo khớp v3.',
    ],
    printed: {
      vi: [PARAGRAPH_V2.vi[0], PARAGRAPH_V2.vi[1], 'Nhiều chi tiết về trang phục được ghi lại trong tư liệu.'],
      en: [PARAGRAPH_V2.en[0], PARAGRAPH_V2.en[1], 'Many details of the costumes are recorded in the documents, confirming the grand scale of the ceremony.'],
    },
    meta: {
      id: 'hue-clue-meta-pages',
      title: 'Hồ Sơ Bị Khuyết — trang 12–13 thiếu',
      body: 'Ghi chú tay trong hộp cũ: “trang 12–13 thiếu — không dùng cho công khai.” Hai trang này đã đi đâu trước khi dự án bắt đầu?',
    },
    metaQuestion: 'Ai đã ghi “trang 12–13 thiếu — không dùng cho công khai”, và hai trang đó nằm ở đâu?',
    objectives: {
      investigation: 'Chỉ ra câu lệch, loại sai lệch, người chịu trách nhiệm chính và thời điểm — với ít nhất 3 manh mối được chia sẻ.',
      forger: 'Khiến nhóm kết luận lỗi là do “dịch” (đổ cho bản dịch).',
      broker: 'Giữ cho triển lãm đúng lịch: nhóm KHÔNG được kết luận Chị Thảo là người chịu trách nhiệm chính.',
    },
    secretGoal: { forger: { type: 'translation' }, broker: { responsible: '!thao' } },
    tasks: {
      task_print_checklist: {
        title: 'Log máy in phòng biên tập',
        body: '23:41 — Job “fit_kho_A1”: resize đoạn giới thiệu (gửi từ máy: thao-logistics).\n23:48 — In thử 1 bản A1 từ “FINAL_v3.pdf”.\nGhi chú máy in: “Kẹt giấy lần 2 — đã xử lý.”',
        art: 'hue-ui-checklist-paper',
      },
      task_scan_footnote: {
        ...common.scan,
        body: 'Bản quét trang 3 hồ sơ HUE-04: footnote ¹ “Tư liệu chỉ ghi chép trang phục; chưa đủ nguồn xác định quy mô.” Trên bản in, cả footnote lẫn vế “chưa có đủ nguồn” của câu tiếng Việt đều biến mất.',
      },
      task_update_floor_plan: {
        title: 'Sổ ca đêm (sơ đồ gian)',
        body: 'Ca đêm trước khai mạc:\n• Chị Thảo — in ấn 22:30–00:15 (ghi chú: “canh khổ A1”).\n• Em Vi — in thử 23:30–00:10.\n• Anh Tuấn — về lúc 21:00, ghi “bản dịch v2 đã nộp”.',
        art: 'hue-ui-floor-plan',
      },
      task_check_lights_labels: {
        title: 'Ảnh chụp bảng treo — 06:12 sáng',
        body: 'Timestamp 06:12. Câu 3 tiếng Việt trên bảng chỉ còn: “Nhiều chi tiết về trang phục được ghi lại trong tư liệu.” Câu tiếng Anh: “…recorded in the documents, confirming the grand scale…”. Khung chữ sát mép bảng.',
        art: 'hue-ui-photo-board',
      },
      task_seal_box: {
        title: 'Niêm phong hộp tư liệu',
        body: 'Số niêm 0417-HUE khớp, nhưng phiếu ghi “kiểm tra cuối: Chị Thảo 22:40 — lấy khổ ảnh”. Băng dán phụ khác màu.',
        art: 'hue-ui-seal-record',
      },
      task_return_shelf_a: {
        title: 'Phiếu mượn hộp Huế-04',
        body: 'Người mượn: Chị Thảo — 22:35 (đo khổ bảng). Trả: 23:00. Anh Tuấn không mượn hộp trong tuần này.',
        art: 'hue-ui-loan-slip',
      },
    },
    roles: {
      historian: {
        title: 'Sử Gia — đối chiếu email duyệt',
        body: 'v2 được duyệt 5 ngày trước. Không có email duyệt v3.\n23:39 Chị Thảo nhắn nhóm: “Câu 3 bản Việt dài quá khổ, mình cắt vế sau — bản Anh tự cập nhật theo template nhé.”\n→ Kết quả: MÂU THUẪN — v3 sinh ra sau giờ duyệt, ở bước dàn trang.',
        art: 'hue-ui-email-thread',
      },
      conservator: {
        title: 'Người Bảo Tồn — niêm phong hộp bản sao',
        body: 'Niêm phong bị mở lúc 22:40 và dán lại bằng băng khác màu; bên trong có thước đo khổ A1.\n→ Kết quả: ĐÃ MỞ. Dấu vết cho biết hộp bị mở để đo, không cho biết ai sửa chữ.',
        art: 'hue-ui-seal-record',
      },
      local_guide: {
        title: 'Hướng Dẫn Viên — tour mẫu của Anh Phú',
        body: 'Trong tour mẫu, hướng dẫn viên luôn nói “theo ghi chép trong tư liệu”.\nAnh Phú: “Bản Việt hiện thiếu vế ‘chưa có đủ nguồn’ — khách Việt đọc cũng sẽ hiểu sai, chứ đâu riêng bản Anh.”',
        art: 'hue-ui-tour-script',
      },
      archivist: {
        title: 'Lưu Trữ Viên — diff intro_VI_EN_v2 ↔ bản in',
        body: 'Câu 3 khác ở CẢ HAI ngôn ngữ. Bản Việt bị cắt vế sau; bản Anh được sinh lại bởi “sync-template 1.2”, không phải người dịch.',
        art: 'hue-ui-doc-diff-bg',
        diff: [
          { lang: 'VI · câu 3', before: PARAGRAPH_V2.vi[2], after: 'Nhiều chi tiết về trang phục được ghi lại trong tư liệu.' },
          {
            lang: 'EN · câu 3',
            before: PARAGRAPH_V2.en[2],
            after: 'Many details of the costumes are recorded in the documents, confirming the grand scale of the ceremony.',
          },
        ],
      },
    },
    brokerSecret:
      'Tin bạn đang giữ: Chị Thảo nhắn riêng Chị Minh Giám lúc 23:45 — “Em cắt bớt cho vừa khổ, sáng mai báo sau nhé, kịp giờ in đã.”',
  },

  'HUE-C': {
    id: 'HUE-C',
    truth: { sentence: 3, type: 'editing', responsible: 'minh-giam', when: 'two_days_before' },
    fake: '“Thực tập sinh in nhầm file cũ”',
    summary:
      'Hai ngày trước khai mạc, Chị Minh Giám yêu cầu câu 3 tiếng Anh “mạnh hơn cho báo chí”. Anh Tuấn soạn draft nhưng nhắn rõ “chưa kiểm với anh Hòa, đừng dùng vội”. Draft được đổi tên thành FINAL_v3 trong thư mục chung và Em Vi in đúng file mới nhất theo hướng dẫn — Vi không in nhầm.',
    steps: [
      'Tuần trước: v2 được Ông Hòa góp ý và duyệt.',
      'Hai ngày trước (16:20): Chị Minh Giám yêu cầu câu tiếng Anh mạnh hơn cho báo chí.',
      'Hai ngày trước (18:02): Anh Tuấn soạn draft “proven by…”, nhắn “chưa kiểm với anh Hòa, đừng dùng vội”.',
      'Đêm trước: draft được đổi tên FINAL_v3; Em Vi in “file Final mới nhất trong thư mục chung”.',
      'Sáng sớm: bảng treo khớp v3; kho vẫn lưu v2 là “đã duyệt nội bộ”.',
    ],
    printed: { vi: [...PARAGRAPH_V2.vi], en: [PARAGRAPH_V2.en[0], PARAGRAPH_V2.en[1], EN3_PROVEN] },
    meta: {
      id: 'hue-clue-meta-time',
      title: 'Hồ Sơ Bị Khuyết — mốc thời gian trùng',
      body: 'Email yêu cầu “câu mạnh hơn” có cùng mốc 16:20 với một email ở chương khác của dự án, cùng người gửi ẩn danh “truyenthong-hsvn”.',
    },
    metaQuestion: 'Ai đứng sau địa chỉ “truyenthong-hsvn” gửi cùng một yêu cầu cho nhiều chương?',
    objectives: {
      investigation: 'Chỉ ra câu lệch, loại sai lệch, người chịu trách nhiệm chính và thời điểm — với ít nhất 3 manh mối được chia sẻ.',
      forger: 'Khiến nhóm kết luận “Thực tập sinh in nhầm file cũ” (lỗi in nhầm).',
      broker: 'Bảo vệ danh tiếng dự án: nhóm KHÔNG được kết luận Chị Minh Giám là người chịu trách nhiệm chính.',
    },
    secretGoal: { forger: { type: 'misprint' }, broker: { responsible: '!minh-giam' } },
    tasks: {
      task_print_checklist: {
        title: 'Log máy in phòng biên tập',
        body: '23:48 — In thử “FINAL_v3.pdf”.\nThông tin file: tạo lúc 18:02 HAI NGÀY TRƯỚC (draft_manh_hon.docx), đổi tên thành FINAL_v3 lúc 22:15 đêm qua.',
        art: 'hue-ui-checklist-paper',
      },
      task_scan_footnote: {
        ...common.scan,
        body: 'Bản quét trang 3 hồ sơ HUE-04: footnote ¹ “Tư liệu chỉ ghi chép trang phục; chưa đủ nguồn xác định quy mô.” Bản in treo tường KHÔNG có footnote này.',
      },
      task_update_floor_plan: {
        title: 'Sổ ca đêm (sơ đồ gian)',
        body: 'Ca đêm trước khai mạc:\n• Em Vi — in thử 23:30–00:10. Ghi chú được giao: “in file Final mới nhất trong thư mục chung”.\n• Không ai khác đăng ký ca đêm.',
        art: 'hue-ui-floor-plan',
      },
      task_check_lights_labels: {
        title: 'Ảnh chụp bảng treo — 06:12 sáng',
        body: 'Timestamp 06:12. Câu 3 bản tiếng Anh trên bảng: “…are proven by the documents, confirming the grand scale…”. Bản tiếng Việt giữ nguyên v2.',
        art: 'hue-ui-photo-board',
      },
      task_seal_box: {
        title: 'Niêm phong hộp tư liệu',
        body: 'Số niêm 0417-HUE khớp, hộp chưa mở. Hộp này không liên quan việc đổi câu.',
        art: 'hue-ui-seal-record',
      },
      task_return_shelf_a: {
        title: 'Phiếu mượn hộp Huế-04',
        body: 'Người mượn: Chị Minh Giám — hai ngày trước 15:40. Chưa trả. Ghi chú: “đã đọc, cần câu mạnh hơn cho báo chí”.',
        art: 'hue-ui-loan-slip',
      },
    },
    roles: {
      historian: {
        title: 'Sử Gia — đối chiếu email duyệt',
        body: 'Hai ngày trước 16:20 — Chị Minh Giám: “Câu 3 tiếng Anh cần mạnh hơn cho báo chí.”\n18:02 — Anh Tuấn: “Em có draft nhưng chưa kiểm với anh Hòa, đừng dùng vội.”\nKhông có email duyệt cho draft.\n→ Kết quả: MÂU THUẪN — nội dung in có từ hai ngày trước, chưa duyệt.',
        art: 'hue-ui-email-thread',
      },
      conservator: {
        title: 'Người Bảo Tồn — niêm phong hộp bản sao',
        body: 'Niêm nguyên. Nhãn phụ trên hộp ghi “v2 — đã duyệt” bằng nét chữ Ông Hòa.\n→ Kết quả: KHỚP. Bản duyệt nội bộ là v2.',
        art: 'hue-ui-seal-record',
      },
      local_guide: {
        title: 'Hướng Dẫn Viên — tour mẫu của Anh Phú',
        body: 'Trong tour mẫu, hướng dẫn viên luôn nói “theo ghi chép trong tư liệu”.\nAnh Phú: “Hai hôm trước bên truyền thông có hỏi tôi có câu nào nghe hoành tráng hơn không. Tôi bảo tư liệu chỉ ghi chép thôi.”',
        art: 'hue-ui-tour-script',
      },
      archivist: {
        title: 'Lưu Trữ Viên — diff intro_VI_EN_v2 ↔ bản in',
        body: 'Chỉ câu 3 bản tiếng Anh khác. Lịch sử file: “draft_manh_hon.docx” (tuan.dich, hai ngày trước 18:02) → đổi tên “FINAL_v3” lúc 22:15 đêm qua bởi tài khoản “giamtuyen”.',
        art: 'hue-ui-doc-diff-bg',
        diff: [{ lang: 'EN · câu 3', before: PARAGRAPH_V2.en[2], after: EN3_PROVEN }],
      },
    },
    brokerSecret:
      'Tin bạn đang giữ: Người yêu cầu “câu tiếng Anh mạnh hơn” là Chị Minh Giám, chuyển tiếp từ địa chỉ “truyenthong-hsvn”.',
  },
};

/** Forger actions — change one detail, always leaving a detectable trace. */
export const FORGER_OPTIONS = [
  {
    id: 'plant_note',
    label: 'Dán sticky note vào log máy in',
    target: 'task_print_checklist' as TaskId,
    addition: '\n📝 Sticky note: “Vi in nhầm file cũ??”',
    trace: 'Dấu vết: giấy note mới tinh, mực bút khác màu với mọi note khác trong phòng biên tập.',
  },
  {
    id: 'relabel_photo',
    label: 'Sửa giờ trên ảnh chụp bảng treo',
    target: 'task_check_lights_labels' as TaskId,
    addition: '\n(Timestamp hiển thị: 23:55 đêm qua?)',
    trace: 'Dấu vết: EXIF có trường “modified” lúc 01:12 — ảnh đã bị chỉnh sau khi chụp.',
  },
  {
    id: 'rename_loan',
    label: 'Sửa tên người mượn trên phiếu Huế-04',
    target: 'task_return_shelf_a' as TaskId,
    addition: '\n(Tên người mượn có vẻ bị viết đè.)',
    trace: 'Dấu vết: tên người mượn bị viết đè bằng bút khác; số phiếu không khớp sổ của Chị Lan.',
  },
] as const;

export const NPC_NAMES: Record<string, string> = Object.fromEntries(
  (mapData.npcs as { id: string; name: string }[]).map((n) => [n.id, n.name]),
);

export const LEARNED =
  'Một câu dịch hoặc một câu rút gọn có thể khiến khách hiểu sai di sản. “Được ghi chép trong tư liệu” khác “được chứng minh bằng tư liệu” — khi trưng bày tư liệu, nguồn, phiên bản và dấu vết chỉnh sửa đều quan trọng.';

export const MAP_DATA = mapData;
