import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_MAP_SLUG, MAP_CATALOG, mapArt, mapMeta, playableMap } from '@hidden-truth/shared';
import { cancelFind, createRoom, findRoom, joinRoom, reconnect, roomExists } from '../net';
import { useStore } from '../store';
import { asset } from './common';
import { useLang, useT } from '../i18n';
import { GameSettings } from './GameSetting';
import { randomDevName } from '../devNames';

const NAME_KEY = 'tht:name';
/** dev: every tab gets a fresh themed name so multi-tab testing needs no typing */
const DEV = import.meta.env.DEV;
const MAP_KEY = 'tht:map';
const home = (n: string) => asset(`maps/common/ui/home/${n}.webp`);

const readMap = () => {
  try {
    return playableMap(localStorage.getItem(MAP_KEY));
  } catch {
    return DEFAULT_MAP_SLUG;
  }
};

export function Home() {
  const { connecting, error } = useStore();
  // a background resume shouldn't lock the buttons — join/create take over from it
  const busy = !!connecting && connecting !== 'reconnect';
  const t = useT();
  const lang = useLang((s) => s.lang);
  const [name, setName] = useState(() => (DEV ? randomDevName(readMap()) : (localStorage.getItem(NAME_KEY) ?? '')));
  const [autoName, setAutoName] = useState(DEV);
  const joinMatch = /^\/join\/([A-Za-z0-9]{4,8})/.exec(location.pathname);
  const [invited, setInvited] = useState(!!joinMatch);
  const [code, setCode] = useState(joinMatch?.[1]?.toUpperCase() ?? '');
  const [mapSlug, setMapSlug] = useState(readMap);
  const toast = useStore((s) => s.toast);
  const pickMap = (slug: string) => {
    if (!mapMeta(slug).available) return toast({ text: t('comingSoonToast'), kind: 'info' });
    setMapSlug(slug);
    if (autoName) setName(randomDevName(slug));
    try {
      localStorage.setItem(MAP_KEY, slug);
    } catch {}
  };

  useEffect(() => {
    reconnect();
    if (!joinMatch) return;
    // invite link to a room that no longer exists -> fall back to the plain home screen
    roomExists(joinMatch[1]).then((ok) => {
      if (ok || useStore.getState().screen !== 'home') return;
      history.replaceState(null, '', '/');
      setInvited(false);
      setCode('');
      toast({ text: t('roomNotFound'), kind: 'warn' });
    });
  }, []);

  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMapOpen(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [mapOpen]);
  const chooseMap = (slug: string) => {
    pickMap(slug);
    if (mapMeta(slug).available) setMapOpen(false);
  };
  const mapGrid = (
      <div className="map-grid" role="radiogroup" aria-label={t('chooseMap')}>
        {MAP_CATALOG.map((m) => (
          <button
            key={m.slug}
            role="radio"
            aria-checked={m.slug === mapSlug}
            aria-disabled={!m.available}
            className={`map-tile ${m.slug === mapSlug ? 'active' : ''} ${m.available ? '' : 'locked'}`}
            onClick={() => chooseMap(m.slug)}
            title={m.available ? m.name[lang] : `${m.name[lang]} — ${t('comingSoon')}`}
          >
            <span className="map-thumb" style={{ backgroundImage: `url(${asset(mapArt(m.slug, 'thumb'))})` }}>
              {!m.available && <img className="map-lock" src={home('lock')} alt="" draggable={false} />}
              {!m.available && (
                <em className="map-soon">
                  <span>{t('comingSoon')}</span>
                </em>
              )}
            </span>
            <b>{m.name[lang]}</b>
          </button>
        ))}
      </div>
  );

  const saveName = () => {
    const n = name.trim().slice(0, 16);
    localStorage.setItem(NAME_KEY, n);
    return n;
  };

  return (
    <div className="home">
      {MAP_CATALOG.map((m) => (
        <div key={m.slug} className={`home-bg ${m.slug === mapSlug ? 'on' : ''}`} style={{ backgroundImage: `url(${asset(mapArt(m.slug, 'home-bg'))})` }} />
      ))}
      <div className="home-lang home-corner">
        <GameSettings className="corner-settings" slug={mapSlug} />
      </div>
      <div className="home-card">
        <div className="home-brand">
          <img className="home-crest" src={home('home-crest')} alt="" draggable={false} />
          <h1>
            <img className="home-logo" src="/brand/logo.webp" alt="Bịt Mắt Bắt Gian" width={1200} height={392} draggable={false} />
          </h1>
        </div>

        <div className="home-form">
          <div className="home-id">
          <label className="field">
            {t('displayName')}
            <span className="name-row">
              <input
                value={name}
                maxLength={16}
                placeholder={t('namePlaceholder')}
                onChange={(e) => {
                  setName(e.target.value);
                  setAutoName(false);
                }}
              />
              {DEV && (
                <button
                  type="button"
                  className="name-dice"
                  title="Dev: random name"
                  onClick={() => {
                    setName(randomDevName(mapSlug, name));
                    setAutoName(true);
                  }}
                >
                  🎲
                </button>
              )}
            </span>
          </label>

          {!invited && (
            <div className="map-picker">
              <span className="map-picker-label">{t('chooseMap')}</span>
              {/* phones: one compact button that opens the grid in a popup */}
              <button type="button" className="map-chooser" onClick={() => setMapOpen(true)} aria-haspopup="dialog">
                <span className="map-chooser-thumb" style={{ backgroundImage: `url(${asset(mapArt(mapSlug, 'thumb'))})` }} />
                <span className="map-chooser-text">
                  <small>{t('chooseMap')}</small>
                  <b>{mapMeta(mapSlug).name[lang]}</b>
                </span>
                <span className="map-chooser-go" aria-hidden>
                  {t('changeMap')} ▾
                </span>
              </button>
              {mapGrid}
            </div>
          )}
          </div>
          {mapOpen &&
            createPortal(
              <div className="map-pop" role="dialog" aria-modal="true" aria-label={t('chooseMap')} onClick={() => setMapOpen(false)}>
              <div className="map-pop-card" onClick={(e) => e.stopPropagation()}>
                <div className="map-pop-head">
                  <b>{t('chooseMap')}</b>
                  <button type="button" className="map-pop-x" onClick={() => setMapOpen(false)} aria-label={t('close')}>
                    ✕
                  </button>
                </div>
                {mapGrid}
              </div>
            </div>,
              document.body,
            )}

          <div className="home-actions">
            {invited ? (
              <>
                <div className="invite-ticket">
                  <span className="join-ticket-icon" aria-hidden>
                    <Icon d="M10.4 12.6 21 2M15.5 7.5l3 3L22 7l-3-3M12.5 15.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0z" />
                  </span>
                  <span className="invite-ticket-text">
                    <small>{t('invitedTo')}</small>
                    <b>{code}</b>
                  </span>
                </div>
                <button className={`cta cta-join ${connecting === 'join' ? 'loading' : ''}`} disabled={busy || code.length < 4} onClick={() => joinRoom(code, saveName())}>
                  <span className="cta-icon" aria-hidden>
                    <Icon d="M5 12h14M13 6l6 6-6 6" />
                  </span>
                  <span className="cta-text">
                    <b>{connecting === 'join' ? t('joiningRoom') : t('joinRoom')}</b>
                  </span>
                </button>
                <div className="or-sep">
                  <span>{t('or')}</span>
                </div>
                <button className="invite-alt" disabled={busy} onClick={() => createRoom(saveName(), mapSlug)}>
                  <Icon d="M12 5v14M5 12h14" />
                  {connecting === 'create' ? t('creatingRoom') : t('createNewRoom')}
                </button>
              </>
            ) : (
              <>
                <div className="home-cta">
                  <button className={`cta cta-create ${connecting === 'create' ? 'loading' : ''}`} disabled={busy} onClick={() => createRoom(saveName(), mapSlug)}>
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
                <div className="or-sep">
                  <span>{t('joinCodeHint')}</span>
                </div>
                <div className={`join-ticket ${code.length >= 4 ? 'ready' : ''}`}>
                  <span className="join-ticket-icon" aria-hidden>
                    <Icon d="M10.4 12.6 21 2M15.5 7.5l3 3L22 7l-3-3M12.5 15.5a5 5 0 1 1-10 0 5 5 0 0 1 10 0z" />
                  </span>
                  <input
                    className="code-input"
                    value={code}
                    maxLength={8}
                    placeholder={t('roomCodePh')}
                    aria-label={t('roomCodePh')}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && !busy && code.length >= 4 && joinRoom(code, saveName())}
                  />
                  <button className="join-go" disabled={busy || code.length < 4} onClick={() => joinRoom(code, saveName())}>
                    {connecting === 'join' ? <i className="spinner" aria-hidden /> : t('joinGo')}
                    <Icon d="M5 12h14M13 6l6 6-6 6" />
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
    </div>
  );
}

/** quick-match search screen: only shows if the lookup takes a moment, so an instant match doesn't flash it */
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
        <b className="finding-title">
          {t('findingRoom')}
        </b>
        <p className="finding-hint">{secs < 3 ? t('findingHint') : t('findingWait')}</p>
        <span className="finding-time">{secs}s</span>
        <button className="btn finding-cancel" onClick={cancelFind}>
          {t('cancelFind')}
        </button>
      </div>
    </div>
  );
}

/** tiny stroke icon for the home call-to-action buttons */
function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
