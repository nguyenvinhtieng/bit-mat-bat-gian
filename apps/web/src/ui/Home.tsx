import { useEffect, useState } from 'react';
import { DEFAULT_MAP_SLUG, NAME_MAX } from '@giao-keo/shared';
import { cancelFind, createRoom, findRoom, joinRoom, reconnect, roomExists } from '../net';
import { useStore } from '../store';
import { asset } from './common';
import { useT } from '../i18n';
import { GameSettings } from './GameSetting';
import { randomName } from '../randomNames';

const NAME_KEY = 'tht:name';
/** dev: every tab gets a fresh random name (ignores the saved one) so multi-tab testing needs no typing */
const DEV = import.meta.env.DEV;

export function Home() {
  const { connecting, error } = useStore();
  const busy = !!connecting && connecting !== 'reconnect';
  const t = useT();
  const [name, setName] = useState(() => (DEV ? '' : (localStorage.getItem(NAME_KEY) ?? '').trim().slice(0, NAME_MAX)) || randomName());
  const [autoName, setAutoName] = useState(DEV);
  const joinMatch = /^\/join\/([A-Za-z0-9]{4,8})/.exec(location.pathname);
  const [invited, setInvited] = useState(!!joinMatch);
  const [code, setCode] = useState(joinMatch?.[1]?.toUpperCase() ?? '');
  const [codeOpen, setCodeOpen] = useState(false);
  const toast = useStore((s) => s.toast);

  useEffect(() => {
    reconnect();
    if (!joinMatch) return;
    roomExists(joinMatch[1]).then((ok) => {
      if (ok || useStore.getState().screen !== 'home') return;
      history.replaceState(null, '', '/');
      setInvited(false);
      setCode('');
      toast({ text: t('roomNotFound'), kind: 'warn' });
    });
  }, []);

  const saveName = () => {
    const n = name.trim().slice(0, NAME_MAX);
    localStorage.setItem(NAME_KEY, n);
    return n;
  };

  const leaveInvite = () => {
    history.replaceState(null, '', '/');
    setInvited(false);
    setCode('');
  };

  const bg = asset('maps/common/ui/saigon/saigon-chibi.webp');

  return (
    <div className="home">
      <div className="home-bg on" style={{ backgroundImage: `url(${bg})` }} />
      {invited && (
        <button className="home-back" disabled={busy} onClick={leaveInvite} aria-label={t('backHome')}>
          <Icon d="M19 12H5M11 6l-6 6 6 6" />
          <span>{t('backHome')}</span>
        </button>
      )}
      <div className="home-lang home-corner">
        {!invited && (
          <button className="code-open" disabled={busy} onClick={() => setCodeOpen(true)}>
            <Icon d={HASH} />
            <span>{t('joinCodeOpen')}</span>
          </button>
        )}
        <GameSettings className="corner-settings" slug={DEFAULT_MAP_SLUG} />
      </div>
      <div className="home-card">
        {invited && (
          <div className="invite-ticket">
            <span className="join-ticket-icon" aria-hidden>
              <Icon d="M10.4 12.6 21 2M15.5 7.5l3 3L22 7l-3-3M12.5 15.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0z" />
            </span>
            <span className="invite-ticket-text">
              <small>{t('invitedTo')}</small>
              <b>{code}</b>
            </span>
          </div>
        )}
        <div className="home-brand">
          <span className="home-location">SÀI GÒN · HẺM 42</span>
          <h1>
            <img className="home-logo" src="/brand/logo.webp" alt={t('appTagline')} width={512} height={512} draggable={false} />
          </h1>
          <p className="home-tagline"><span className="home-sign-number" aria-hidden="true">?</span><span>{t('appTagline')}</span></p>
        </div>

        <div className="home-form">
          <div className="home-id">
            <label className="field">
              {t('displayName')}
              <span className="name-row has-dice">
                <input
                  value={name}
                  maxLength={NAME_MAX}
                  placeholder={t('namePlaceholder')}
                  onChange={(e) => {
                    setName(e.target.value);
                    setAutoName(false);
                  }}
                />
                <span className={name.length >= NAME_MAX ? 'name-count full' : 'name-count'} aria-live="polite">
                  {name.length}/{NAME_MAX}
                </span>
                <button
                  type="button"
                  className="name-dice"
                  title={t('randomName')}
                  aria-label={t('randomName')}
                  onClick={() => {
                    setName(randomName(name));
                    setAutoName(true);
                  }}
                >
                  🎲
                </button>
              </span>
            </label>
          </div>

          <div className="home-actions">
            {invited ? (
              <>
                <button className={`cta cta-join ${connecting === 'join' ? 'loading' : ''}`} disabled={busy || code.length < 4} onClick={() => joinRoom(code, saveName())}>
                  <span className="cta-icon" aria-hidden>
                    <Icon d="M5 12h14M13 6l6 6-6 6" />
                  </span>
                  <span className="cta-text">
                    <b>{connecting === 'join' ? t('joiningRoom') : t('joinRoom')}</b>
                  </span>
                </button>
              </>
            ) : (
              <>
                <div className="home-cta">
                  <button className={`cta cta-create ${connecting === 'create' ? 'loading' : ''}`} disabled={busy} onClick={() => createRoom(saveName())}>
                    <span className="cta-icon" aria-hidden>
                      <Icon d="M12 5v14M5 12h14" />
                    </span>
                    <span className="cta-text">
                      <b>{connecting === 'create' ? t('creatingRoom') : t('createRoom')}</b>
                    </span>
                  </button>
                  <button className={`cta cta-find ${connecting === 'find' ? 'loading' : ''}`} disabled={busy} onClick={() => findRoom(saveName())}>
                    <span className="cta-icon" aria-hidden>
                      <Icon d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20" />
                    </span>
                    <span className="cta-text">
                      <b>{connecting === 'find' ? t('findingRoom') : t('findRoom')}</b>
                      <small>{t('findRoomSub')}</small>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
          {(connecting || error) && (
            <p className={`home-status ${error && !connecting ? 'error' : 'muted'}`} role={error ? 'alert' : 'status'}>
              {connecting ? (
                <>
                  <i className="spinner" aria-hidden />
                  {connecting === 'reconnect' ? t('resuming') : t('connecting')}
                </>
              ) : (
                error
              )}
            </p>
          )}
        </div>
      </div>
      {connecting === 'find' && <FindingOverlay />}
      {codeOpen && !invited && (
        <div className="code-pop" role="dialog" aria-modal="true" aria-label={t('joinCodeTitle')} onClick={(e) => e.target === e.currentTarget && setCodeOpen(false)}>
          <div className="code-pop-card">
            <div className="code-pop-head">
              <span className="code-pop-badge" aria-hidden>
                <Icon d={HASH} />
              </span>
              <div className="code-pop-copy">
                <h3>{t('joinCodeTitle')}</h3>
                <p className="code-pop-hint">{t('joinCodeHint')}</p>
              </div>
              <button className="map-pop-x" aria-label="✕" onClick={() => setCodeOpen(false)}>
                ✕
              </button>
            </div>
            <div className="code-pop-form">
              <input
                className="code-field"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={code}
                maxLength={8}
                placeholder={t('roomCodePh')}
                aria-label={t('roomCodePh')}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setCodeOpen(false);
                  else if (e.key === 'Enter' && !busy && code.length >= 4) joinRoom(code, saveName());
                }}
              />
              <button className="code-submit" disabled={busy || code.length < 4} onClick={() => joinRoom(code, saveName())}>
                {connecting === 'join' ? <i className="spinner" aria-hidden /> : t('joinGo')}
                <Icon d="M5 12h14M13 6l6 6-6 6" />
              </button>
            </div>
            {error && !connecting && (
              <p className="home-status error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FindingOverlay() {
  const t = useT();
  const [secs, setSecs] = useState(0);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const start = Date.now();
    const show = setTimeout(() => setShown(true), 600);
    const tick = setInterval(() => setSecs(Math.floor((Date.now() - start) / 1000)), 250);
    return () => {
      clearTimeout(show);
      clearInterval(tick);
    };
  }, []);
  if (!shown) return null;
  return (
    <div className="finding" role="status" aria-live="polite">
      <div className="finding-card">
        <div className="radar" aria-hidden>
          <span className="radar-sweep" />
          <i style={{ left: '68%', top: '30%' }} />
          <i style={{ left: '28%', top: '62%', animationDelay: '1.1s' }} />
          <i style={{ left: '58%', top: '74%', animationDelay: '1.9s' }} />
          <span className="radar-core">
            <Icon d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5 20 20" />
          </span>
        </div>
        <b className="finding-title">{t('findingRoom')}</b>
        <p className="finding-hint">{secs < 3 ? t('findingHint') : t('findingWait')}</p>
        <span className="finding-time">{secs}s</span>
        <button className="btn finding-cancel" onClick={cancelFind}>
          {t('cancelFind')}
        </button>
      </div>
    </div>
  );
}

const HASH = 'M5 9h14M5 15h14M10 3 8 21M16 3l-2 18';

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
