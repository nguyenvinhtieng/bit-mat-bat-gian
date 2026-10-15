import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';

/** Phones/tablets only: auto fullscreen + landscape lock on Android, "Add to Home Screen" guide on iOS. */

const SNOOZE_KEY = 'tht:installSnooze';
const SNOOZE_MS = 3 * 24 * 3600 * 1000;

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const isTouch = () => matchMedia('(pointer: coarse)').matches;
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  matchMedia('(display-mode: fullscreen)').matches ||
  matchMedia('(display-mode: standalone)').matches ||
  (navigator as { standalone?: boolean }).standalone === true;

const fsElement = () => document.fullscreenElement ?? (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement;

async function enterFullscreen() {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
    else el.webkitRequestFullscreen?.();
  } catch {
    return;
  }
  // only allowed while fullscreen; unsupported on iOS
  (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape').catch(() => {});
}

const snoozed = () => {
  try {
    return Date.now() - Number(localStorage.getItem(SNOOZE_KEY) || 0) < SNOOZE_MS;
  } catch {
    return false;
  }
};

let deferredPrompt: InstallPrompt | null = null;
if (typeof window !== 'undefined')
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPrompt;
  });

export function MobileShell() {
  const t = useT();
  const onHome = useStore((s) => s.screen === 'home');
  const [hint, setHint] = useState<'ios' | 'android' | null>(null);

  // Android & co.: every tap outside fullscreen re-enters it (browsers require a user gesture).
  useEffect(() => {
    if (!isTouch() || isStandalone() || !document.fullscreenEnabled) return;
    const onTap = () => {
      if (!fsElement()) void enterFullscreen();
    };
    document.addEventListener('pointerup', onTap, true);
    return () => document.removeEventListener('pointerup', onTap, true);
  }, []);

  useEffect(() => {
    if (!isTouch() || isStandalone() || snoozed()) return;
    if (isIos()) return setHint('ios');
    const check = () => deferredPrompt && setHint('android');
    check();
    window.addEventListener('beforeinstallprompt', check);
    return () => window.removeEventListener('beforeinstallprompt', check);
  }, []);

  if (!hint || !onHome) return null;

  const close = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    } catch {}
    setHint(null);
  };
  const install = async () => {
    const p = deferredPrompt;
    if (!p) return close();
    deferredPrompt = null;
    await p.prompt();
    await p.userChoice.catch(() => null);
    setHint(null);
  };

  return (
    <div className="install-hint" role="dialog" aria-label={t('installTitle')} onPointerUp={(e) => e.stopPropagation()}>
      <img className="install-hint-icon" src="/apple-touch-icon.png" alt="" draggable={false} />
      <div className="install-hint-body">
        <strong>{t('installTitle')}</strong>
        {hint === 'ios' ? (
          <>
            <p>{t('installIosBody')}</p>
            <ol>
              <li>
                {t('installIosStep1')} <ShareIcon />
              </li>
              <li>
                {t('installIosStep2')} <PlusIcon />
              </li>
              <li>{t('installIosStep3')}</li>
            </ol>
          </>
        ) : (
          <p>{t('installAndroidBody')}</p>
        )}
      </div>
      <div className="install-hint-actions">
        {hint === 'android' && (
          <button className="btn primary small" onClick={install}>
            {t('installBtn')}
          </button>
        )}
        <button className="btn ghost small" onClick={close}>
          {t('later')}
        </button>
      </div>
    </div>
  );
}

const ShareIcon = () => (
  <svg className="install-glyph" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
  </svg>
);
const PlusIcon = () => (
  <svg className="install-glyph" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
