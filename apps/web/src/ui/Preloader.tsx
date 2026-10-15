import { useEffect, useState, type ReactNode } from 'react';
import { missingAssets, preloadAssets, type Progress } from '../preload';
import { useT } from '../i18n';
import { LangSwitch } from './LangSwitch';

const mb = (b: number) => (b / 1048576).toFixed(1);

/** Holds the app behind a loading screen until every asset is cached; returning visitors pass straight through. */
export function AssetGate({ children }: { children: ReactNode }) {
  const t = useT();
  const [state, setState] = useState<'checking' | 'loading' | 'ready'>('checking');
  const [p, setP] = useState<Progress>({ done: 0, total: 0, bytes: 0, totalBytes: 0 });

  useEffect(() => {
    let alive = true;
    (async () => {
      const todo = await missingAssets();
      if (!alive) return;
      if (todo.length) {
        setState('loading');
        await preloadAssets(todo, (np) => alive && setP(np));
      }
      if (alive) setState('ready');
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (state === 'ready') return <>{children}</>;
  if (state === 'checking') return <div className="preloader" />;
  const pct = p.totalBytes ? Math.round((p.bytes / p.totalBytes) * 100) : 0;
  return (
    <div className="preloader" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <LangSwitch className="home-lang" />
      <div className="preloader-card">
        <img className="preloader-logo" src="/brand/logo.webp" alt="Bịt Mắt Bắt Gian" width={1200} height={392} draggable={false} />
        <p className="preloader-title">{t('loadingAssets')}</p>
        <div className="preloader-bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="preloader-meta">
          <b>{pct}%</b>
          <span>
            {mb(p.bytes)} / {mb(p.totalBytes)} MB · {p.done}/{p.total}
          </span>
        </p>
        <p className="muted small">{t('loadingHint')}</p>
      </div>
    </div>
  );
}
