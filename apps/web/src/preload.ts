import { files, version } from 'virtual:asset-list';

/**
 * First-visit asset precache. In production every /assets file goes into a versioned
 * Cache Storage bucket that public/sw.js serves cache-first, so later visits (and every
 * Phaser/CSS/<img> load) never hit the network. Dev / insecure contexts (LAN IP, no
 * Cache API) just fetch once per tab session to warm the HTTP cache.
 */
export const ASSET_CACHE = `tht-assets-${version}`;
const PREFIX = 'tht-assets-';
const SESSION_KEY = `tht:preloaded:${version}`;
const CONCURRENCY = 6;

const useCacheStorage = () => import.meta.env.PROD && window.isSecureContext && 'caches' in window;

export type Progress = { done: number; total: number; bytes: number; totalBytes: number };
type Asset = (typeof files)[number];

/** Files not cached yet — empty means the loading screen can be skipped entirely. */
export async function missingAssets(): Promise<Asset[]> {
  try {
    if (!useCacheStorage()) return sessionStorage.getItem(SESSION_KEY) ? [] : files;
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== ASSET_CACHE) void caches.delete(k);
    const cache = await caches.open(ASSET_CACHE);
    const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
    return files.filter((f) => !have.has(f.url));
  } catch {
    return files;
  }
}

/** Downloads `todo` with a small worker pool; failures are skipped (the game falls back to the network). */
export async function preloadAssets(todo: Asset[], onProgress: (p: Progress) => void) {
  const cache = useCacheStorage() ? await caches.open(ASSET_CACHE).catch(() => null) : null;
  const p: Progress = { done: 0, total: todo.length, bytes: 0, totalBytes: todo.reduce((n, f) => n + f.size, 0) };
  onProgress({ ...p });
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const f = todo[next++];
      try {
        const res = await fetch(f.url);
        if (res.ok) {
          if (cache) await cache.put(f.url, res);
          else await res.arrayBuffer();
        }
      } catch {
        /* offline / flaky: leave it for the lazy load */
      }
      p.done++;
      p.bytes += f.size;
      onProgress({ ...p });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* storage blocked */
  }
}

export function registerAssetWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`/sw.js?v=${version}`).catch(() => {});
}
