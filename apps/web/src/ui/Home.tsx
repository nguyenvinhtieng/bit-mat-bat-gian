import { useEffect, useState } from 'react';
import { DEFAULT_MAP_SLUG, MAP_CATALOG, mapArt, mapMeta, playableMap } from '@hidden-truth/shared';
import { createRoom, joinRoom, reconnect } from '../net';
import { useStore } from '../store';
import { asset } from './common';
import { useLang, useT } from '../i18n';
import { Guide, GuideButton } from './Guide';
import { LangSwitch } from './LangSwitch';
import { randomDevName } from '../devNames';

const NAME_KEY = 'tht:name';
/** dev: every tab gets a fresh themed name so multi-tab testing needs no typing */
const DEV = import.meta.env.DEV;
const MAP_KEY = 'tht:map';
const home = (n: string) => asset(`common/ui/home/${n}.webp`);

const readMap = () => {
  try {
    return playableMap(localStorage.getItem(MAP_KEY));
  } catch {
    return DEFAULT_MAP_SLUG;
  }
};

export function Home() {
  const { connecting, error } = useStore();
  const busy = !!connecting;
  const t = useT();
  const lang = useLang((s) => s.lang);
  const [showGuide, setShowGuide] = useState(false);
  const [name, setName] = useState(() => (DEV ? randomDevName(readMap()) : localStorage.getItem(NAME_KEY) ?? ''));
  const [autoName, setAutoName] = useState(DEV);
  const joinMatch = /^\/join\/([A-Za-z0-9]{4,8})/.exec(location.pathname);
  const invited = !!joinMatch;
  const [code, setCode] = useState(joinMatch?.[1]?.toUpperCase() ?? '');
  const [mapSlug, setMapSlug] = useState(readMap);
  const map = mapMeta(mapSlug);
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
  }, []);

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
      <LangSwitch className="home-lang" />
      <div className="home-card">
        <div className="home-brand">
          <img className="home-crest" src={home('home-crest')} alt="" draggable={false} />
          <h1>
            <img className="home-logo" src="/brand/logo.webp" alt="Bịt Mắt Bắt Gian" width={1200} height={392} draggable={false} />
            <small>{t('slogan')}</small>
          </h1>
          <p className="tagline">{t('tagline')}</p>
        </div>

        <div className="home-form">
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
              <div className="map-grid" role="radiogroup" aria-label={t('chooseMap')}>
                {MAP_CATALOG.map((m) => (
                  <button
                    key={m.slug}
                    role="radio"
                    aria-checked={m.slug === mapSlug}
                    aria-disabled={!m.available}
                    className={`map-tile ${m.slug === mapSlug ? 'active' : ''} ${m.available ? '' : 'locked'}`}
                    onClick={() => pickMap(m.slug)}
                    title={m.available ? m.name[lang] : `${m.name[lang]} — ${t('comingSoon')}`}
                  >
                    <span className="map-thumb" style={{ backgroundImage: `url(${asset(mapArt(m.slug, 'thumb'))})` }}>
                      {!m.available && <img className="map-lock" src={home('lock')} alt="" draggable={false} />}
                      {!m.available && <em className="map-soon"><span>{t('comingSoon')}</span></em>}
                    </span>
                    <b>{m.name[lang]}</b>
                  </button>
                ))}
              </div>
              <div className="map-desc" key={map.slug}>
                <strong>
                  {map.name[lang]} <small>· {map.subtitle[lang]}</small>
                </strong>
                <span>{map.hook[lang]}</span>
                <i>
                  {map.players} {t('playersShort')}
                </i>
              </div>
            </div>
          )}

          <div className="home-actions">
            {invited ? (
              <>
                <div className="invite-banner">
                  {lang === 'vi' ? 'Bạn được mời vào phòng' : 'You are invited to room'} <b>{code}</b>
                </div>
                <button className="btn primary big wide" disabled={busy || code.length < 4} onClick={() => joinRoom(code, saveName())}>
                  {connecting === 'join' ? t('joiningRoom') : t('joinRoom')}
                </button>
                <button className="btn-link" disabled={busy} onClick={() => createRoom(saveName(), mapSlug)}>
                  {lang === 'vi' ? 'hoặc tạo phòng mới' : 'or create a new room'}
                </button>
              </>
            ) : (
              <>
                <button className="btn primary big wide" disabled={busy} onClick={() => createRoom(saveName(), mapSlug)}>
                  {connecting === 'create' ? t('creatingRoom') : t('createRoom')}
                </button>
                <div className="or-sep">
                  <span>{lang === 'vi' ? 'hoặc nhập mã để vào phòng' : 'or join with a code'}</span>
                </div>
                <div className="join-row">
                  <input
                    className="code-input"
                    value={code}
                    maxLength={8}
                    placeholder={t('roomCodePh')}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && !connecting && code.length >= 4 && joinRoom(code, saveName())}
                  />
                  <button className="btn" disabled={busy || code.length < 4} onClick={() => joinRoom(code, saveName())}>
                    {connecting === 'join' ? t('joiningRoom') : t('joinRoom')}
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
        <div className="home-foot">
          <GuideButton onClick={() => setShowGuide(true)} />
        </div>
        {showGuide && <Guide slug={mapSlug} onClose={() => setShowGuide(false)} />}
        <p className="muted small home-controls">{t('controls')}</p>
      </div>
    </div>
  );
}
