import { useState } from 'react';
import { createPortal } from 'react-dom';
import { leaveRoom } from '../net';
import { useStore } from '../store';
import { useLang, useT } from '../i18n';
import { LangSwitch } from './LangSwitch';
import { CloseButton, useEscape } from './common';
import { Guide, GuideButton } from './Guide';
import { getVolume, setVolume, sfx } from './minigames/common/kit';

function SettingsIcon({ kind }: { kind: 'settings' | 'sound' | 'language' | 'exit' }) {
  return (
    <svg className={`saigon-ui-icon icon-${kind}`} viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'settings' ? <g transform="translate(1 -0.5)"><path d="m9 3-.6 2.4-2.1 1.2L4 6l-2 3.5 1.7 1.8v2.4L2 15.5 4 19l2.3-.6 2.1 1.2L9 22h4l.6-2.4 2.1-1.2 2.3.6 2-3.5-1.7-1.8v-2.4L20 9l-2-3.5-2.3.6-2.1-1.2L13 3Z" /><circle cx="11" cy="12.5" r="3.2" /></g> : null}
      {kind === 'sound' ? <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></> : null}
      {kind === 'language' ? <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></> : null}
      {kind === 'exit' ? <><path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h13" /></> : null}
    </svg>
  );
}

/** Settings cog on every screen (in game: top right, next to the alive counter): volume, language, guide, leave the room.
 *  `slug` picks the guide's map when there is no room yet (home screen). */
export function GameSettings({ className = '', slug }: { className?: string; slug?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`hud-settings ${className}`} onClick={() => setOpen(true)} title={t('gameSettings')} aria-label={t('gameSettings')}>
        <SettingsIcon kind="settings" />
      </button>
      {/* portal: the home corner is scaled on phones, and a transformed ancestor would trap the fixed backdrop inside it */}
      {open && createPortal(<GameSettingsModal slug={slug} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function GameSettingsModal({ onClose, slug }: { onClose: () => void; slug?: string }) {
  const t = useT();
  const lang = useLang((s) => s.lang);
  const [vol, setVol] = useState(() => Math.round(getVolume() * 100));
  const [confirm, setConfirm] = useState(false);
  const [guide, setGuide] = useState(false);
  const inRoom = useStore((s) => !!s.room);
  useEscape(confirm ? () => setConfirm(false) : onClose);

  const apply = (v: number) => {
    setVol(v);
    setVolume(v / 100);
  };

  return (
    <>
      <div className="modal-backdrop settings-backdrop" onClick={onClose}>
        <div className="modal settings-modal game-settings saigon-settings" role="dialog" aria-modal="true" aria-label={t('gameSettings')} onClick={(e) => e.stopPropagation()}>
          <div className="settings-x">
            <CloseButton onClick={onClose} label={t('close')} />
          </div>
          <header className="saigon-settings-head">
            <span className="saigon-settings-emblem"><SettingsIcon kind="settings" /></span>
            <div><small>{lang === 'vi' ? 'HẺM 42 · CUỐC CUỐI' : 'ALLEY 42 · LAST RIDE'}</small><h3>{t('settings')}</h3><p>{lang === 'vi' ? 'Chuẩn bị cho một đêm trong hẻm.' : 'Get ready for a night in the alley.'}</p></div>
          </header>
          <div className="modal-content">
            <div className="slider-row">
              <div className="slider-head">
                <SettingsIcon kind="sound" />
                <div className="slider-text">
                  <strong>{t('volume')}</strong>
                  <small>{lang === 'vi' ? 'Âm thanh của đêm Sài Gòn' : 'Sounds of a Saigon night'}</small>
                </div>
                <b className={`slider-value ${vol ? '' : 'muted-ico'}`} key={vol}>
                  {vol ? (
                    <>
                      {vol}
                      <small>%</small>
                    </>
                  ) : (
                    <svg viewBox="0 0 24 24" width="26" height="26" aria-label={t('unmute')}>
                      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
                      <path d="M16 9l5 6M21 9l-5 6" stroke="#9b1c12" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  )}
                </b>
              </div>
              <input
                className="slider"
                type="range"
                min={0}
                max={100}
                step={5}
                value={vol}
                aria-label={t('volume')}
                style={{ '--fill': `${vol}%` } as React.CSSProperties}
                onChange={(e) => apply(Number(e.target.value))}
                onPointerUp={() => vol > 0 && sfx.ok()}
                onKeyUp={() => vol > 0 && sfx.ok()}
              />
            </div>

            <div className="slider-row">
              <div className="slider-head">
                <SettingsIcon kind="language" />
                <div className="slider-text">
                  <strong>{t('language')}</strong>
                  <small>{lang === 'vi' ? 'Chọn cách bạn theo dõi câu chuyện' : 'Choose how you follow the story'}</small>
                </div>
                <LangSwitch className="settings-lang" />
              </div>
            </div>

            <GuideButton onClick={() => setGuide(true)} />

            {!inRoom ? null : confirm ? (
              <div className="exit-confirm">
                <p className="exit-warn">{t('exitConfirm')}</p>
                <div className="exit-actions">
                  <button type="button" className="btn ghost" onClick={() => setConfirm(false)}>
                    {t('cancel')}
                  </button>
                  <button type="button" className="btn danger" onClick={leaveRoom} autoFocus>
                    {t('exitYes')}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn danger wide exit-btn" onClick={() => setConfirm(true)}>
                <SettingsIcon kind="exit" />
                {t('exitGame')}
              </button>
            )}
          </div>
        </div>
      </div>
      {/* sibling, not child: portal clicks still bubble through the React tree to the settings backdrop */}
      {guide && <Guide slug={slug} onClose={() => setGuide(false)} />}
    </>
  );
}
