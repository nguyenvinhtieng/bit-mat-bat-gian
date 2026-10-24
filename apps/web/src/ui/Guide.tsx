import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ROLE_IDS, ROLE_INFO, mapSkin } from '@giao-keo/shared';
import { useLang } from '../i18n';
import { RoleBadge, useEscape, useSkin } from './common';
import { mapGuide } from './guides';

function GuideIcon({ kind }: { kind: 'story' | 'roles' | 'close' }) {
  return <svg className="saigon-ui-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'story' ? <><path d="M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H4Zm16 0h-4a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h3Z" /><path d="M7 8h3m-3 4h3m6-4h1m-1 4h1" /></> : null}
    {kind === 'roles' ? <><circle cx="9" cy="8" r="3" /><path d="M3 20v-3a6 6 0 0 1 12 0v3m2-15a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v1" /></> : null}
    {kind === 'close' ? <path d="m6 6 12 12M18 6 6 18" /> : null}
  </svg>;
}

const TXT = {
  vi: {
    title: 'Hướng dẫn chơi',
    btn: 'Hướng dẫn chơi',
    close: 'Đóng',
    tabs: { story: 'Câu chuyện', roles: 'Vai trò' },
    rolesH: '3 vai trò',
  },
  en: {
    title: 'How to play',
    btn: 'How to play',
    close: 'Close',
    tabs: { story: 'Story', roles: 'Roles' },
    rolesH: '3 roles',
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
      <div className="modal wide guide-modal saigon-guide" role="dialog" aria-modal="true" aria-label={tx.title} onClick={(e) => e.stopPropagation()}>
        <header className="guide-head">
          <div><small className="guide-kicker">{lang === 'vi' ? 'HỒ SƠ HẺM 42' : 'ALLEY 42 DOSSIER'}</small><h3 className="guide-title">{tx.title}</h3></div>
          <button className="guide-close" aria-label={tx.close} title={tx.close} onClick={onClose}>
            <GuideIcon kind="close" />
          </button>
        </header>
        <div className="guide-tabs" role="tablist">
          {(['story', 'roles'] as Tab[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} className={`guide-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
              <GuideIcon kind={k} />
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
                          <span className="guide-faction">{killer ? killerFaction : skin.crewName[lang]}</span>
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

/** Dossier entry inside the settings popup. */
export function GuideButton({ onClick }: { onClick: () => void }) {
  const lang = useLang((s) => s.lang);
  return (
    <button type="button" className="settings-guide" onClick={onClick}>
      <span className="settings-guide-icon"><GuideIcon kind="story" /></span>
      <span className="settings-guide-copy"><strong>{TXT[lang].btn}</strong><small>{lang === 'vi' ? 'Cốt truyện · Vai trò · Cách chơi' : 'Story · Roles · How to play'}</small></span>
      <span className="settings-guide-arrow" aria-hidden>
        ›
      </span>
    </button>
  );
}
