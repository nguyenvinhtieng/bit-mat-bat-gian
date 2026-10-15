import { useState } from 'react';
import { createPortal } from 'react-dom';
import { GAME, MEETING_POINT, ROLE_IDS, ROLE_INFO, areaAt, getGrid, mapSkin, type MapSkin } from '@hidden-truth/shared';
import { useLang } from '../i18n';
import { RoleBadge, asset, useEscape, useSkin } from './common';
import { mapGuide } from './guides';

const gui = (n: string) => asset(`common/ui/guide/${n}.webp`);

const TXT = {
  vi: {
    title: 'Hướng dẫn chơi',
    open: 'Hướng dẫn · Vai trò',
    lobbyBtn: 'Hướng dẫn chơi',
    close: 'Đóng',
    tabs: { story: 'Câu chuyện', flow: 'Cách chơi', roles: 'Vai trò' },
    flowH: 'Một ván diễn ra thế nào?',
    tasksH: 'Nhiệm vụ trong map',
    tasksNote: 'Mỗi người được giao ngẫu nhiên vài nhiệm vụ. Hồn ma vẫn làm được nhiệm vụ.',
    area: 'Khu',
    tipsH: 'Mẹo',
    rolesH: '3 vai trò',
    crew: 'Phe Người Dân',
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
    flowH: 'How does a game go?',
    tasksH: 'Tasks on the map',
    tasksNote: 'Everyone gets a few random tasks. Ghosts can still do tasks.',
    area: 'Area',
    tipsH: 'Tips',
    rolesH: '3 roles',
    crew: 'Villager faction',
    what: 'Who you are',
    todo: 'What to do',
    noteL: 'Note',
  },
} as const;

const MEETING_AREA = areaAt(getGrid(), MEETING_POINT.x, MEETING_POINT.y) ?? 'courtyard_checkin';
const plural = (w: string) => (w.endsWith('s') ? w : `${w}s`);

/** Generic copy built from the map skin (role / killer names, meeting spot, sabotages, clock). */
function skinText(skin: MapSkin, m: number) {
  const r = skin.roles;
  const k = skin.killerName;
  const ks = plural(k.en);
  const area = skin.areas[MEETING_AREA];
  const { blind, ward } = skin.sabotage;
  const seg = skin.labels.segment;
  const dl = skin.labels.deadline;
  return {
    vi: {
      steps: [
        ['1. Nhận vai', `Mỗi người nhận một vai bí mật: ${r.villager.name}, ${r.guardian.name} hoặc ${k.vi} (1–2 người tuỳ số người chơi).`],
        ['2. Chạy & làm nhiệm vụ', `Đi bằng WASD / phím mũi tên / joystick. Tới vòng sáng vàng và bấm E / Space để làm mini-game. Thanh thời gian chia 5 ${seg.vi} tự chạy (dừng khi họp); thanh xanh bên dưới là tiến độ nhiệm vụ cả đoàn — phải đầy trước ${dl.vi}. Bị hạ gục vẫn phải làm tiếp nhiệm vụ.`],
        [`3. ${k.vi} ra tay`, `${k.vi} lại gần và bấm K để hạ gục (hồi ${GAME.killCooldownSec}s). Nạn nhân thành hồn ma, để lại thi thể.`],
        ['4. Phá hoại', `${k.vi} còn có thể phá: ${blind.name.vi} (mọi người gần như mù vài giây) hoặc ${ward.name.vi} — phải có người tới đúng chỗ giữ nút ${ward.fix.vi} trước khi hết giờ, nếu không ${k.vi} thắng.`],
        ['5. Báo cáo / họp khẩn', `Thấy thi thể thì bấm R. Hoặc tới bàn họp ở ${area.name} đánh ${skin.emergency.vi} (mỗi người 1 lần).`],
        ['6. Bỏ phiếu', `Họp tối đa ~${m}s: chat và bỏ phiếu loại một người (hoặc bỏ qua). Nhiều phiếu nhất bị loại; hoà phiếu thì không ai bị loại.`],
        ['7. Kết thúc', `Người Dân thắng khi loại hết ${k.vi} hoặc xong mọi nhiệm vụ. ${k.vi} thắng khi số ${k.vi} ≥ số Người Dân còn sống.`],
      ],
      tips: [
        `Đi theo nhóm — ${k.vi} khó ra tay khi có người nhìn.`,
        'Trong họp, hãy nói rõ: “Mình ở đâu, thấy ai”. Mâu thuẫn lời khai là manh mối tốt nhất.',
        `Nếu bạn là ${k.vi}: cũng đi “làm nhiệm vụ” để không bị nghi.`,
      ],
      rolesIntro: `Người Dân (${r.villager.name}, ${r.guardian.name}) đấu với ${k.vi}.`,
      killer: `Phe ${k.vi}`,
    },
    en: {
      steps: [
        ['1. Get a role', `Everyone secretly gets a role: ${r.villager.nameEn}, ${r.guardian.nameEn} or ${k.en} (1–2 ${ks} depending on player count).`],
        ['2. Run & do tasks', `Move with WASD / arrows / joystick. Go to a golden ring and press E / Space to play a mini-game. The time bar runs through 5 ${seg.en}s (paused in meetings); the green bar below is the crew’s task progress — fill it before ${dl.en}. Ghosts keep doing tasks too.`],
        [`3. The ${k.en} strikes`, `The ${k.en} gets close and presses K to kill (${GAME.killCooldownSec}s cooldown). The victim becomes a ghost and leaves a body.`],
        ['4. Sabotage', `${ks} can also sabotage: ${blind.name.en} (everyone is nearly blind for a few seconds) or ${ward.name.en} — someone must hold ${ward.fix.en} at the right spot before time runs out, or the ${ks} win.`],
        ['5. Report / emergency', `Found a body? Press R. Or sound the ${skin.emergency.en} at the meeting table in ${area.nameEn} (once per player).`],
        ['6. Vote', `Meeting lasts up to ~${m}s: chat and vote to eject one player (or skip). Most votes is ejected; a tie ejects nobody.`],
        ['7. The end', `Villagers win by ejecting every ${k.en} or finishing all tasks. ${ks} win when ${ks} ≥ living villagers.`],
      ],
      tips: [
        `Stick together — the ${k.en} can’t strike when someone is watching.`,
        'In meetings say “where I was, who I saw”. Contradicting alibis are the best clue.',
        `If you are the ${k.en}: pretend to do tasks too.`,
      ],
      rolesIntro: `Villagers (${r.villager.nameEn}, ${r.guardian.nameEn}) vs. the ${ks}.`,
      killer: `${k.en} faction`,
    },
  };
}

type Tab = 'story' | 'flow' | 'roles';

/** `slug` picks the map when there is no room yet (home screen). */
export function Guide({ onClose, slug }: { onClose: () => void; slug?: string }) {
  useEscape(onClose);
  const lang = useLang((s) => s.lang);
  const roomSkin = useSkin();
  const skin = slug ? mapSkin(slug) : roomSkin;
  const guide = mapGuide(skin.slug);
  const tx = { ...TXT[lang], ...skinText(skin, GAME.meetingSec)[lang] };
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
              <h4>{guide.storyH[lang]}</h4>
              {guide.story[lang].map((p, i) => {
                const link = guide.storyLink?.[lang];
                const at = link && guide.story[lang].findIndex((q) => q.includes(link.term)) === i ? p.indexOf(link.term) : -1;
                if (!link || at < 0) return <p key={p}>{p}</p>;
                const { term, title, url } = link;
                return (
                  <p key={p}>
                    {p.slice(0, at)}
                    <a className="guide-ref" href={url} title={title} target="_blank" rel="noopener noreferrer">
                      {term}
                    </a>
                    {p.slice(at + term.length)}
                  </p>
                );
              })}
            </>
          )}

          {tab === 'flow' && (
            <>
              <h4>{tx.flowH}</h4>
              <ol className="guide-steps">
                {tx.steps.map(([h, b], i) => (
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
                {skin.stations.map((s) => (
                  <li key={s.id}>
                    <b>{lang === 'vi' ? s.title : s.titleEn}</b> — {tx.area}: {lang === 'vi' ? skin.areas[s.area].name : skin.areas[s.area].nameEn}
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
                  const g = guide.roles[id];
                  const killer = ROLE_INFO[id].faction === 'killer';
                  return (
                    <div key={id} className={`guide-role ${killer ? 'secret' : 'invest'}`}>
                      <div className="guide-role-head">
                        <RoleBadge role={id} size={48} />
                        <div>
                          <strong>{lang === 'vi' ? skin.roles[id].name : skin.roles[id].nameEn}</strong>
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

/** variant "link": small text button (home) · "icon": round icon-only corner button (lobby) */
export function GuideButton({ onClick, variant = 'link' }: { onClick: () => void; variant?: 'link' | 'icon' }) {
  const lang = useLang((s) => s.lang);
  if (variant === 'icon')
    return (
      <button className="icon-tool" onClick={onClick} title={TXT[lang].lobbyBtn} aria-label={TXT[lang].lobbyBtn}>
        <img src={gui('btn-guide')} alt="" draggable={false} />
      </button>
    );
  return (
    <button className="btn small ghost guide-link" onClick={onClick}>
      <img src={gui('btn-guide')} alt="" draggable={false} />
      {TXT[lang].open}
    </button>
  );
}
