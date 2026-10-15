import { useState } from 'react';
import { createPortal } from 'react-dom';
import { GAME, HUE_AREAS, HUE_STATIONS, ROLE_IDS, ROLE_INFO, type RoleId } from '@hidden-truth/shared';
import { useLang } from '../i18n';
import { RoleBadge, asset, useEscape } from './common';

const gui = (n: string) => asset(`common/ui/guide/${n}.webp`);

type L = { vi: string; en: string };
const l = (vi: string, en: string): L => ({ vi, en });

const ROLE_GUIDE: Record<RoleId, { name: L; what: L; todo: L[]; note: L }> = {
  villager: {
    name: l('Nghệ Nhân Cố Đô', 'Heritage Artisan'),
    what: l('Một người trong đoàn chuẩn bị Lễ Ban Sóc. Bạn không có siêu năng lực — chỉ có đôi chân, đôi mắt và lá phiếu.', 'A member of the crew preparing the Calendar Ceremony. No powers — just your legs, your eyes and your vote.'),
    todo: [
      l('Chạy tới các vòng sáng vàng, hoàn thành nhiệm vụ văn hoá Huế của bạn.', 'Run to the golden rings and finish your Huế culture tasks.'),
      l('Tránh ở một mình với người đáng ngờ. Thấy thi thể thì bấm R để báo cáo.', 'Avoid being alone with a suspect. Press R when you find a body.'),
      l('Trong họp: nói bạn đã ở đâu, thấy ai, rồi bỏ phiếu.', 'In meetings: say where you were and who you saw, then vote.'),
    ],
    note: l('Nhiệm vụ của hồn ma vẫn được tính — kể cả khi bạn đã bị hạ gục.', 'Ghost tasks still count — even after you are killed.'),
  },
  guardian: {
    name: l('Lính Ngự Lâm', 'Royal Guard'),
    what: l('Giống Nghệ Nhân nhưng có MỘT lá chắn: lần đầu Âm Binh ra tay với bạn sẽ bị chặn.', 'Like an Artisan, but with ONE shield: the first attack on you is blocked.'),
    todo: [
      l('Làm nhiệm vụ như bình thường.', 'Do tasks as usual.'),
      l('Khi lá chắn cứu bạn, Âm Binh cũng biết — hãy báo cho mọi người ngay trong cuộc họp.', 'When the shield saves you, the Shadow knows too — tell everyone at the next meeting.'),
    ],
    note: l('Lá chắn chỉ dùng được một lần, sau đó bạn là người thường.', 'The shield works once, afterwards you are a normal crew member.'),
  },
  killer: {
    name: l('Âm Binh', 'The Shadow'),
    what: l('Kẻ sát nhân trà trộn trong đoàn. Hạ gục người khác để thắng.', 'The killer hiding in the crew. Take people down to win.'),
    todo: [
      l('Lại gần một người rồi bấm K / nút Hạ gục (có thời gian hồi).', 'Get close to someone and press K / the Kill button (it has a cooldown).'),
      l('Làm nhiệm vụ để chứng minh mình trong sạch — nhiệm vụ của bạn vẫn tính vào tiến độ chung.', 'Do tasks to prove you are innocent — they still count toward the shared progress.'),
      l('Trong họp: nói dối khéo, đổ nghi ngờ sang người khác.', 'In meetings: lie smoothly and shift suspicion.'),
    ],
    note: l('Không thể hạ gục đồng bọn. Thắng khi số Âm Binh ≥ số Người Dân còn sống.', 'You cannot kill partners. Win when Shadows ≥ living villagers.'),
  },
};

const TXT = {
  vi: {
    title: 'Hướng dẫn chơi',
    open: 'Hướng dẫn · Vai trò',
    lobbyBtn: 'Hướng dẫn chơi',
    close: 'Đóng',
    tabs: { story: 'Câu chuyện', flow: 'Cách chơi', roles: 'Vai trò' },
    storyH: 'Năm Canh Trước Bình Minh',
    story: [
      'Kinh thành Huế, đêm cuối tháng Mười Một. Rạng sáng mai, Lễ Ban Sóc — lễ ban lịch năm mới của triều Nguyễn — sẽ diễn ra trước Ngọ Môn. Đoàn chỉ còn năm canh để chuẩn bị.',
      'Nhưng trong đoàn có Âm Binh — bóng đêm muốn giữ kinh thành mãi ở đêm cuối năm. Không có lịch, cả kinh thành sẽ lạc mất thời gian. (Truyện hư cấu trong game.)',
      'Mỗi nhiệm vụ là một việc thật của buổi lễ: xem trăng định ngày Sóc, in lịch bằng mộc bản, đóng ấn, dượt Nhã nhạc, xếp bá quan theo phẩm sơn, dẫn đoàn qua 5 cửa Ngọ Môn, lau Cửu Đỉnh, phục dựng tường thơ, làm bánh bèo. Cứ mỗi 20% tiến độ, trống điểm sang canh mới — tới canh năm là bình minh!',
    ],
    flowH: 'Một ván diễn ra thế nào?',
    steps: (m: number) => [
      ['1. Nhận vai', 'Mỗi người nhận một vai bí mật: Nghệ Nhân, Lính Ngự Lâm hoặc Âm Binh (1–2 người tuỳ số người chơi).'],
      ['2. Chạy & làm nhiệm vụ', 'Đi bằng WASD / phím mũi tên / joystick. Tới vòng sáng vàng và bấm E / Space để làm mini-game. Thanh tiến độ là 5 canh trống của cả đoàn — đủ canh năm là trời sáng.'],
      ['3. Âm Binh ra tay', `Âm Binh lại gần và bấm K để hạ gục (hồi ${GAME.killCooldownSec}s). Nạn nhân thành hồn ma, để lại thi thể.`],
      ['4. Báo cáo / họp khẩn', 'Thấy thi thể thì bấm R. Hoặc ra Án Ban Lịch ở Sân Ngọ Môn đánh chuông Ngũ Phụng (mỗi người 1 lần).'],
      ['5. Bỏ phiếu', `Họp tối đa ~${m}s: chat và bỏ phiếu loại một người (hoặc bỏ qua). Nhiều phiếu nhất bị loại; hoà phiếu thì không ai bị loại.`],
      ['6. Kết thúc', 'Người Dân thắng khi loại hết Âm Binh hoặc xong mọi nhiệm vụ. Âm Binh thắng khi số Âm Binh ≥ số Người Dân còn sống.'],
    ],
    tasksH: 'Nhiệm vụ trong map',
    tasksNote: 'Mỗi người được giao ngẫu nhiên vài nhiệm vụ. Hồn ma vẫn làm được nhiệm vụ.',
    area: 'Khu',
    tipsH: 'Mẹo',
    tips: [
      'Đi theo nhóm — Âm Binh khó ra tay khi có người nhìn.',
      'Trong họp, hãy nói rõ: “Mình ở đâu, thấy ai”. Mâu thuẫn lời khai là manh mối tốt nhất.',
      'Nếu bạn là Âm Binh: cũng đi “làm nhiệm vụ” để không bị nghi.',
    ],
    rolesH: '3 vai trò',
    rolesIntro: 'Người Dân (Nghệ Nhân, Lính Ngự Lâm) đấu với Âm Binh.',
    crew: 'Phe Người Dân',
    killer: 'Phe Âm Binh',
    what: 'Bạn là ai',
    todo: 'Nên làm gì',
    noteL: 'Lưu ý',
  },
  en: {
    title: 'How to play',
    open: 'Guide · Roles',
    lobbyBtn: 'How to play',
    close: 'Close',
    tabs: { story: 'Story', flow: 'How to play', roles: 'Roles' },
    storyH: 'Five Watches Before Dawn',
    story: [
      'The Imperial City of Huế, the last night of the 11th lunar month. At dawn the Ban Sóc ceremony — when the Nguyễn court granted the new year’s calendar — will be held at the Meridian Gate. The crew has five night watches left.',
      'But the Shadow hides among them — a darkness that wants the old year’s last night to last forever. Without a calendar the whole capital would lose track of time. (Fictional story.)',
      'Every task is a real part of the ceremony: read the moon for the new-moon day, print the calendar from woodblocks, seal it, rehearse royal court music, line up the mandarins by rank, guide the procession through the 5 gates, dust the Nine Urns, restore a poem wall, make bánh bèo. Every 20% the night drum strikes the next watch — the fifth watch is dawn!',
    ],
    flowH: 'How does a game go?',
    steps: (m: number) => [
      ['1. Get a role', 'Everyone secretly gets a role: Artisan, Royal Guard or Shadow (1–2 Shadows depending on player count).'],
      ['2. Run & do tasks', 'Move with WASD / arrows / joystick. Go to a golden ring and press E / Space to play a mini-game. The progress bar is the five night watches of the whole crew — the fifth watch is dawn.'],
      ['3. The Shadow strikes', `The Shadow gets close and presses K to kill (${GAME.killCooldownSec}s cooldown). The victim becomes a ghost and leaves a body.`],
      ['4. Report / emergency', 'Found a body? Press R. Or strike the Ngũ Phụng bell at the calendar table in the Meridian Gate Courtyard (once per player).'],
      ['5. Vote', `Meeting lasts up to ~${m}s: chat and vote to eject one player (or skip). Most votes is ejected; a tie ejects nobody.`],
      ['6. The end', 'Villagers win by ejecting every Shadow or finishing all tasks. Shadows win when Shadows ≥ living villagers.'],
    ],
    tasksH: 'Tasks on the map',
    tasksNote: 'Everyone gets a few random tasks. Ghosts can still do tasks.',
    area: 'Area',
    tipsH: 'Tips',
    tips: [
      'Stick together — the Shadow can’t strike when someone is watching.',
      'In meetings say “where I was, who I saw”. Contradicting alibis are the best clue.',
      'If you are the Shadow: pretend to do tasks too.',
    ],
    rolesH: '3 roles',
    rolesIntro: 'Villagers (Artisan, Royal Guard) vs. the Shadow.',
    crew: 'Villager faction',
    killer: 'Shadow faction',
    what: 'Who you are',
    todo: 'What to do',
    noteL: 'Note',
  },
} as const;

type Tab = 'story' | 'flow' | 'roles';

export function Guide({ onClose }: { onClose: () => void }) {
  useEscape(onClose);
  const lang = useLang((s) => s.lang);
  const tx = TXT[lang];
  const [tab, setTab] = useState<Tab>('story');

  // portal to <body>: ancestors with `filter`/`transform` (e.g. the framed home card) would otherwise
  // become the containing block of the fixed backdrop and push the popup off-centre.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal wide guide-modal" onClick={(e) => e.stopPropagation()}>
        <header className="guide-head">
          <h3 className="guide-title">{tx.title}</h3>
          <button className="guide-close" aria-label={tx.close} title={tx.close} onClick={onClose}>
            <img src={gui('btn-close')} alt="" draggable={false} />
          </button>
        </header>
        <div className="guide-tabs" role="tablist">
          {(['story', 'flow', 'roles'] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`guide-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <img src={gui(`tab-${k}`)} alt="" draggable={false} />
              <span>{tx.tabs[k]}</span>
            </button>
          ))}
        </div>
        <div className="modal-content guide">
          {tab === 'story' && (
            <>
              <h4>{tx.storyH}</h4>
              {tx.story.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </>
          )}

          {tab === 'flow' && (
            <>
              <h4>{tx.flowH}</h4>
              <ol className="guide-steps">
                {tx.steps(GAME.meetingSec).map(([h, b], i) => (
                  <li key={h}>
                    <i className="step-no">{i + 1}</i>
                    <strong>{h}</strong>
                    <span>{b}</span>
                  </li>
                ))}
              </ol>
              <h4>{tx.tasksH}</h4>
              <p className="muted small">{tx.tasksNote}</p>
              <ul>
                {HUE_STATIONS.map((s) => (
                  <li key={s.id}>
                    <b>{lang === 'vi' ? s.title : s.titleEn}</b> — {tx.area}: {lang === 'vi' ? HUE_AREAS[s.area].name : HUE_AREAS[s.area].nameEn}
                  </li>
                ))}
              </ul>
              <h4>{tx.tipsH}</h4>
              <ul>
                {tx.tips.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}

          {tab === 'roles' && (
            <>
              <h4>{tx.rolesH}</h4>
              <p>{tx.rolesIntro}</p>
              <div className="guide-roles">
                {ROLE_IDS.map((id) => {
                  const g = ROLE_GUIDE[id];
                  const killer = ROLE_INFO[id].faction === 'killer';
                  return (
                    <div key={id} className={`guide-role ${killer ? 'secret' : 'invest'}`}>
                      <div className="guide-role-head">
                        <RoleBadge role={id} size={48} />
                        <div>
                          <strong>{g.name[lang]}</strong>
                          <span className="guide-faction">{killer ? tx.killer : tx.crew}</span>
                        </div>
                      </div>
                      <p>
                        <b>{tx.what}:</b> {g.what[lang]}
                      </p>
                      <b>{tx.todo}:</b>
                      <ul>
                        {g.todo.map((s) => (
                          <li key={s.vi}>{s[lang]}</li>
                        ))}
                      </ul>
                      <p className="muted small">⚠ {g.note[lang]}</p>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** variant "link": small text button (home) · "lobby": wide framed button with the round book icon */
export function GuideButton({ onClick, variant = 'link' }: { onClick: () => void; variant?: 'link' | 'lobby' }) {
  const lang = useLang((s) => s.lang);
  if (variant === 'lobby')
    return (
      <button className="guide-open-btn" onClick={onClick}>
        <img src={gui('btn-guide')} alt="" draggable={false} />
        <span>{TXT[lang].lobbyBtn}</span>
      </button>
    );
  return (
    <button className="btn small ghost guide-link" onClick={onClick}>
      <img src={gui('btn-guide')} alt="" draggable={false} />
      {TXT[lang].open}
    </button>
  );
}
