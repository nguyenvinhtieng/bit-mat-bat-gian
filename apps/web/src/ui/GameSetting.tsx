import { useState } from 'react';
import { leaveRoom } from '../net';
import { useT } from '../i18n';
import { CloseButton, asset, useEscape } from './common';
import { getVolume, setVolume, sfx } from './minigames/common/kit';

const mui = (n: string) => asset(`common/ui/mobile/${n}.webp`);

/** In-game cog (top right, next to the alive counter): master volume + leave the match. */
export function GameSettings() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="hud-settings" onClick={() => setOpen(true)} title={t('gameSettings')} aria-label={t('gameSettings')}>
        <img src={mui('btn-settings')} alt="" draggable={false} />
      </button>
      {open && <GameSettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}

function GameSettingsModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [vol, setVol] = useState(() => Math.round(getVolume() * 100));
  const [lastVol, setLastVol] = useState(vol || 80);
  const [confirm, setConfirm] = useState(false);
  useEscape(confirm ? () => setConfirm(false) : onClose);

  const apply = (v: number, preview = false) => {
    setVol(v);
    setVolume(v / 100);
    if (v > 0) setLastVol(v);
    if (preview) sfx.ok();
  };

  return (
    <div className="modal-backdrop settings-backdrop" onClick={onClose}>
      <div className="modal settings-modal game-settings" role="dialog" aria-label={t('gameSettings')} onClick={(e) => e.stopPropagation()}>
        <header>
          <img className="settings-crest" src={mui('btn-settings')} alt="" draggable={false} />
          <div>
            <h3>{t('gameSettings')}</h3>
            <small>{t('gameSettingsSub')}</small>
          </div>
          <CloseButton onClick={onClose} label={t('close')} />
        </header>
        <div className="modal-content">
          <div className="slider-row">
            <div className="slider-head">
              <img src={mui('ico-sound')} alt="" draggable={false} />
              <div className="slider-text">
                <strong>{t('volume')}</strong>
                <small>{t('volumeHint')}</small>
              </div>
              <button type="button" className={`slider-badge ${vol ? 'auto' : 'reset'}`} onClick={() => apply(vol ? 0 : lastVol, !vol)}>
                {vol ? t('mute') : t('unmute')}
              </button>
              <b className="slider-value" key={vol}>
                {vol}
                <small>%</small>
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

          {confirm ? (
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
  );
}
