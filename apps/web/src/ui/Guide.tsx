import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ROLE_IDS, ROLE_INFO, mapSkin } from '@hidden-truth/shared';
import { useLang } from '../i18n';
import { RoleBadge, asset, useEscape, useSkin } from './common';
import { mapGuide } from './guides';

const gui = (n: string) => asset(`common/ui/guide/${n}.webp`);

const TXT = {
  vi: {
    title: 'Hướng dẫn chơi',
    btn: 'Hướng dẫn chơi',
    close: 'Đóng',
    tabs: { story: 'Câu chuyện', roles: 'Vai trò' },
    rolesH: '3 vai trò',
    crew: 'Phe Người Dân',
  },
  en: {
    title: 'How to play',
    btn: 'How to play',
    close: 'Close',
    tabs: { story: 'Story', roles: 'Roles' },
    rolesH: '3 roles',
    crew: 'Villager faction',
  },
} as const;

type Tab = 'story' | 'roles';

/** `slug` picks the map when there is no room yet (home screen). */
export function Guide({ onClose, slug }: { onClose: () => void; slug?: string }) {
  useEscape(onClose);
  const lang = useLang((s) => s.lang);
  const roomSkin = useSkin();
  const skin = slug ? mapSkin(slug) : roomSkin;
  const guide = mapGuide(skin.slug);
  const tx = TXT[lang];
  const killerFaction = lang === 'vi' ? `Phe ${skin.killerName.vi}` : `${skin.killerName.en} faction`;
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
          {(['story', 'roles'] as Tab[]).map((k) => (
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

          {tab === 'roles' && (
            <>
              <h4>{tx.rolesH}</h4>
              <div className="guide-roles">
                {ROLE_IDS.map((id) => {
                  const what = guide.roles[id][lang];
                  const killer = ROLE_INFO[id].faction === 'killer';
                  return (
                    <div key={id} className={`guide-role ${killer ? 'secret' : 'invest'}`}>
                      <div className="guide-role-head">
                        <RoleBadge role={id} size={48} />
                        <div>
                          <strong>{lang === 'vi' ? skin.roles[id].name : skin.roles[id].nameEn}</strong>
                          <span className="guide-faction">{killer ? killerFaction : tx.crew}</span>
                        </div>
                      </div>
                      <p>{what}</p>
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

/** Row button inside the settings popup (same painted icon as before). */
export function GuideButton({ onClick }: { onClick: () => void }) {
  const lang = useLang((s) => s.lang);
  return (
    <button type="button" className="settings-guide" onClick={onClick}>
      <img src={gui('btn-guide')} alt="" draggable={false} />
      <strong>{TXT[lang].btn}</strong>
      <span className="settings-guide-arrow" aria-hidden>
        ›
      </span>
    </button>
  );
}
