import { useState } from 'react';
import { createPortal } from 'react-dom';
import { leaveRoom } from '../net';
import { useStore } from '../store';
import { useT } from '../i18n';
import { LangSwitch } from './LangSwitch';
import { CloseButton, asset, useEscape } from './common';
import { Guide, GuideButton } from './Guide';
import { getVolume, setVolume, sfx } from './minigames/common/kit';

const mui = (n: string) => asset(`common/ui/mobile/${n}.webp`);

/** Settings cog on every screen (in game: top right, next to the alive counter): volume, language, guide, leave the room.
 *  `slug` picks the guide's map when there is no room yet (home screen). */
export function GameSettings({ className = '', slug }: { className?: string; slug?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`hud-settings ${className}`} onClick={() => setOpen(true)} title={t('gameSettings')} aria-label={t('gameSettings')}>
        <img src={mui('btn-settings')} alt="" draggable={false} />
      </button>
      {/* portal: the home corner is scaled on phones, and a transformed ancestor would trap the fixed backdrop inside it */}
      {open && createPortal(<GameSettingsModal slug={slug} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function GameSettingsModal({ onClose, slug }: { onClose: () => void; slug?: string }) {
  const t = useT();
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
        <div className="modal settings-modal game-settings" role="dialog" aria-label={t('gameSettings')} onClick={(e) => e.stopPropagation()}>
          <div className="settings-x">
            <CloseButton onClick={onClose} label={t('close')} />
          </div>
          <div className="modal-content">
            <div className="slider-row">
              <div className="slider-head">
                <img src={mui('ico-sound')} alt="" draggable={false} />
                <div className="slider-text">
                  <strong>{t('volume')}</strong>
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
                <img src={asset('common/ui/home/globe.webp')} alt="" draggable={false} />
                <div className="slider-text">
                  <strong>{t('language')}</strong>
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
                <img src={mui('ico-exit')} alt="" draggable={false} />
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
